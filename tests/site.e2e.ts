import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { strFromU8, unzipSync } from 'fflate'

test('главная страница показывает структуру курса и 22 карточки', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Качество системы')
  await expect(page.getByRole('heading', { name: 'Два профессиональных контура' })).toBeVisible()
  await expect(page.locator('.hero')).toContainText('100 баллов')
  await expect(page.locator('.block-card')).toHaveCount(2)
  await expect(page.locator('.block-card').nth(0)).toContainText('50 баллов')
  await expect(page.locator('.block-card').nth(1)).toContainText('50 баллов')
  await expect(page.locator('.lab-card')).toHaveCount(22)
  await expect(page.locator('.variant-picker')).toContainText('SA01 · Электронное расписание')
  const structureTop = await page.locator('#blocks').evaluate((element) => element.getBoundingClientRect().top)
  const variantTop = await page.locator('#variants').evaluate((element) => element.getBoundingClientRect().top)
  expect(structureTop).toBeLessThan(variantTop)
  const firstCard = page.locator('.lab-card').first()
  await expect(firstCard).toContainText('МДК04.02-ЛР01')
  await expect(firstCard.getByRole('link', { name: 'Открыть работу' })).toHaveClass(/primary/)
  await expect(firstCard.getByRole('link', { name: 'Скачать шаблон ЛР 01' })).toHaveAttribute('href', /reports\/LR01_template\.docx$/)
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
})

test('поиск и фильтры работают', async ({ page }) => {
  await page.goto('./')
  await page.getByPlaceholder('Номер, тема или практический результат').fill('коэффициента готовности')
  await expect(page.locator('.lab-card')).toHaveCount(1)
  await expect(page.locator('.lab-card')).toContainText('Расчёт коэффициента готовности')
  await page.getByRole('button', { name: '8 семестр' }).click()
  await expect(page.locator('.lab-card')).toHaveCount(0)
  await page.getByPlaceholder('Номер, тема или практический результат').fill('')
  await expect(page.locator('.lab-card')).toHaveCount(12)
})

test('все 22 прямые ссылки и DOCX доступны', async ({ page, request }) => {
  for (let number = 1; number <= 22; number += 1) {
    const slug = String(number).padStart(2, '0')
    await page.goto(`./#/lab/${slug}`)
    await expect(page.locator('.lab-hero')).toContainText(`лабораторная работа ${slug}`)
    await expect(page.locator('.lab-summary').getByRole('button', { name: 'Скачать шаблон', exact: true })).toBeVisible()
    const overlappingHeadings = await page.locator('.content-section').evaluateAll((sections) => sections.filter((section) => {
      const heading = section.querySelector('.content-section-heading')
      const body = section.querySelector('.content-section-body')
      if (!heading || !body) return false
      const headingRect = heading.getBoundingClientRect()
      const bodyRect = body.getBoundingClientRect()
      return headingRect.left < bodyRect.right
        && headingRect.right > bodyRect.left
        && headingRect.top < bodyRect.bottom
        && headingRect.bottom > bodyRect.top
    }).length)
    expect(overlappingHeadings).toBe(0)
    const response = await request.get(`./reports/LR${slug}_template.docx`)
    expect(response.ok()).toBeTruthy()
  }
})

test('изображения загружены и страница не выходит за ширину экрана', async ({ page }) => {
  await page.goto('./')
  await expect.poll(() => page.evaluate(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0))).toBeTruthy()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('клавиатурный переход и ссылка LMS доступны, критериев оценивания нет', async ({ page }) => {
  await page.goto('./#/lab/01')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.locator('.skip-link').press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('#main-content')).toBeInViewport()
  await expect(page.locator('.lab-action-stack')).toHaveCount(0)
  const lmsLink = page.locator('#lms-submit').getByRole('link', { name: 'Перейти в LMS' })
  await expect(lmsLink).toHaveAttribute('href', 'https://lms.synergy.ru/')
  await expect(page.locator('#lms-submit')).toContainText('Один заполненный редактируемый DOCX-файл')
  await expect(page.getByRole('heading', { name: 'Пять характеристик варианта' })).toBeVisible()
  await expect(page.locator('.characteristic-card')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: 'Место работы в последовательности' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Классификация одного события вне варианта' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Что должно быть получено' })).toBeVisible()
  await expect(page.locator('#result')).not.toContainText(/Доказательства|Что подтвердить|Какие доказательства приложить/i)
  await expect(page.locator('#task .task-protocol > li')).toHaveCount(5)
  await expect(page.locator('#task .task-protocol > li').first()).toContainText('Исходные данные')
  await expect(page.locator('#task .task-protocol > li').first()).toContainText('Результат шага')
  await expect(page.locator('#task .task-protocol > li').first()).toContainText('Проверка')
  await expect(page.locator('#self-check')).not.toContainText('?')
  await expect(page.getByRole('heading', { name: 'Маршрут выполнения' })).toHaveCount(0)
  await expect(page.locator('#result .result-banner')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Критерии оценивания' })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/Moodle/i)
  await expect(page.locator('body')).not.toContainText(/(?:ОК|ПК)\s*\d/i)
})

test('кнопка шаблона формирует персонализированный ZIP-комплект', async ({ page }) => {
  await page.goto('./')
  await page.locator('.variant-picker:not(.compact) select').selectOption('6')
  await page.goto('./#/lab/01')
  const downloadPromise = page.waitForEvent('download')
  await page.locator('.lab-summary').getByRole('button', { name: 'Скачать шаблон', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('SA06_ЛР01_комплект.zip')
  const archivePath = await download.path()
  expect(archivePath).not.toBeNull()
  const entries = unzipSync(new Uint8Array(await readFile(archivePath!)))
  expect(Object.keys(entries)).toEqual(expect.arrayContaining([
    'ЛР01_SA06.html',
    'LR01_template.docx',
    'Исходные_данные/system-passport.csv',
    'Исходные_данные/quality-characteristics.csv',
    'Исходные_данные/LR01.md',
  ]))
  const exportedPage = strFromU8(entries['ЛР01_SA06.html'])
  expect(exportedPage).toContain('SA06')
  expect(exportedPage).toContain('<style>')
  expect(exportedPage).not.toContain('FS-EDU-01')
  expect(exportedPage).not.toContain('class="lab-hero"')
})

test('выбранная предметная область сохраняется, а её ZIP-пакет доступен', async ({ page, request }) => {
  await page.goto('./')
  await page.locator('.variant-picker:not(.compact) select').selectOption('6')
  await page.goto('./#/lab/01')
  await expect(page.locator('.variant-picker.compact select')).toHaveValue('6')
  await expect(page.locator('.variant-source-note')).toContainText('SA06')
  await expect(page.locator('body')).not.toContainText('FS-EDU-01')
  const packLink = page.locator('.variant-source-note').getByRole('link', { name: 'Скачать исходный набор' })
  await expect(packLink).toHaveAttribute('href', /inputs\/subject-areas\/packs\/SA06\.zip$/)
  expect((await request.get('./inputs/subject-areas/packs/SA06.zip')).ok()).toBeTruthy()
})
