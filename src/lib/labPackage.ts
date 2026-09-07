import { strToU8, unzipSync, zipSync } from 'fflate'

const fetchBytes = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Не удалось загрузить файл комплекта: ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

const standalonePage = async (title: string) => {
  const shell = document.querySelector<HTMLElement>('.lab-shell')?.cloneNode(true) as HTMLElement | undefined
  if (!shell) throw new Error('Страница лабораторной работы не найдена')

  shell.querySelector('.lab-hero')?.remove()
  shell.querySelectorAll('button, .summary-actions, .summary-link').forEach((element) => element.remove())
  shell.querySelectorAll('select').forEach((select) => {
    const current = select as HTMLSelectElement
    const value = document.createElement('strong')
    value.textContent = current.selectedOptions[0]?.textContent || current.value
    current.replaceWith(value)
  })

  const cssLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
  const css = (await Promise.all(cssLinks.map(async (link) => {
    const response = await fetch(link.href)
    return response.ok ? response.text() : ''
  }))).join('\n')

  return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}\nbody{background:#fff}.lab-page-grid{grid-template-columns:1fr;padding-top:2rem}.lab-summary{display:none}.variant-picker.compact{position:static}</style></head><body>${shell.outerHTML}</body></html>`
}

export async function downloadLabPackage({
  labSlug,
  subjectCode,
  title,
  reportUrl,
  subjectPackUrl,
}: {
  labSlug: string
  subjectCode: string
  title: string
  reportUrl: string
  subjectPackUrl: string
}) {
  const [report, subjectPack, page] = await Promise.all([
    fetchBytes(reportUrl),
    fetchBytes(subjectPackUrl),
    standalonePage(title),
  ])
  const subjectEntries = unzipSync(subjectPack)
  const requiredSuffixes = ['system-passport.csv', 'quality-characteristics.csv', `labs/LR${labSlug}.md`]
  const packageEntries: Record<string, Uint8Array> = {
    [`ЛР${labSlug}_${subjectCode}.html`]: strToU8(page),
    [`LR${labSlug}_template.docx`]: report,
  }

  Object.entries(subjectEntries).forEach(([name, bytes]) => {
    if (!requiredSuffixes.some((suffix) => name.endsWith(suffix))) return
    packageEntries[`Исходные_данные/${name.split('/').pop()}`] = bytes
  })

  const archive = zipSync(packageEntries, { level: 6 })
  const href = URL.createObjectURL(new Blob([archive], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = href
  link.download = `${subjectCode}_ЛР${labSlug}_комплект.zip`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}
