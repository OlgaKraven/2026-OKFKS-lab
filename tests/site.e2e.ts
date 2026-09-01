import { expect, test } from '@playwright/test'

test('главная страница показывает структуру курса и 22 карточки', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Качество системы')
  await expect(page.getByRole('heading', { name: 'Два профессиональных контура' })).toBeVisible()
  await expect(page.locator('.lab-card')).toHaveCount(22)
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
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
    await expect(page.getByText(`Лабораторная работа № ${number}`, { exact: true })).toBeVisible()
    const download = page.getByRole('link', { name: /Скачать шаблон отчёта/ })
    await expect(download).toHaveAttribute('href', new RegExp(`reports/LR${slug}_template\\.docx$`))
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

test('клавиатурный переход и Moodle-инструкция доступны', async ({ page }) => {
  await page.goto('./#/lab/01')
  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await page.locator('.skip-link').press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.locator('#main-content')).toBeInViewport()
  await page.getByRole('button', { name: /Сдать работу в Moodle/ }).click()
  await expect(page.locator('#moodle-submit')).toBeInViewport()
  await expect(page.locator('#moodle-submit')).toContainText('один файл .docx')
})
