import { execFileSync, spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = join(root, 'output', 'pdf')
const stagingRoot = join(outputRoot, 'LR01_all_variants')
const archivePath = join(outputRoot, 'LR01_all_variants.zip')
const baseUrl = 'http://127.0.0.1:4181/2026-OKFKS-lab/'
const subjectAreas = JSON.parse(readFileSync(join(root, 'src', 'data', 'subject-areas.json'), 'utf8')).subjectAreas

if (!existsSync(join(root, 'dist', 'index.html'))) {
  throw new Error('Сначала выполните production-сборку: pnpm run build')
}

rmSync(stagingRoot, { recursive: true, force: true })
rmSync(archivePath, { force: true })
mkdirSync(stagingRoot, { recursive: true })
copyFileSync(join(root, 'public', 'reports', 'LR01_template.docx'), join(stagingRoot, 'LR01_template.docx'))

for (const area of subjectAreas) {
  const variantDir = join(stagingRoot, area.code)
  const packPath = join(root, 'public', 'inputs', 'subject-areas', 'packs', `${area.code}.zip`)
  mkdirSync(variantDir, { recursive: true })

  const members = [
    [`${area.code}/system-passport.csv`, 'system-passport.csv'],
    [`${area.code}/quality-characteristics.csv`, 'quality-characteristics.csv'],
    [`${area.code}/labs/LR01.md`, 'LR01_data.md'],
  ]

  for (const [member, outputName] of members) {
    const content = execFileSync('tar', ['-xOf', packPath, member], { cwd: root, maxBuffer: 8 * 1024 * 1024 })
    writeFileSync(join(variantDir, outputName), content)
  }
}

const preview = spawn(
  process.execPath,
  [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4181', '--strictPort'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
)

let previewLog = ''
preview.stdout.on('data', (chunk) => { previewLog += chunk.toString() })
preview.stderr.on('data', (chunk) => { previewLog += chunk.toString() })

async function waitForPreview() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview завершился досрочно.\n${previewLog}`)
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // Сервер ещё запускается.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
  }
  throw new Error(`Vite preview не запустился за 30 секунд.\n${previewLog}`)
}

const browser = await chromium.launch({ headless: true })
try {
  await waitForPreview()

  for (const area of subjectAreas) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    await page.goto(`${baseUrl}#/lab/01`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((id) => window.localStorage.setItem('okfks-subject-area', String(id)), area.id)
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('.variant-picker.compact h2').filter({ hasText: area.code }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate((title) => { document.title = title }, `ЛР 01 · ${area.code} · ${area.title}`)
    await page.addStyleTag({ content: `
      @media print {
        .variant-picker.compact {
          display: grid !important;
          margin: 0 0 5mm !important;
          padding: 6mm !important;
          border: 1px solid #aaa !important;
          border-top: 3px solid #ed131c !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: #fff !important;
          break-inside: avoid;
        }
        .variant-picker.compact .variant-select,
        .variant-picker.compact .variant-download,
        .variant-picker.compact .variant-picker-copy > p:last-child { display: none !important; }
        .variant-picker.compact .variant-facts {
          display: grid !important;
          grid-template-columns: 0.7fr 1fr 1.3fr !important;
        }
      }
    ` })
    await page.pdf({
      path: join(stagingRoot, area.code, `LR01_assignment_${area.code}.pdf`),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="box-sizing:border-box;width:100%;padding:0 12mm 5mm 18mm;color:#666;font:8px Arial,sans-serif;display:flex;justify-content:space-between"><span>ЛР 01 · ${area.code}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: '0', right: '0', bottom: '9mm', left: '0' },
    })
    await page.close()
    process.stdout.write(`PDF ${area.code} создан.\n`)
  }
} finally {
  await browser.close()
  preview.kill()
}

const archiveEntries = ['LR01_template.docx', ...subjectAreas.map((area) => area.code)]
execFileSync('tar', ['-a', '-cf', archivePath, '-C', stagingRoot, ...archiveEntries], { cwd: root, stdio: 'inherit' })
process.stdout.write(`Архив создан: ${archivePath}\n`)
