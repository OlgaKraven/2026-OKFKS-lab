import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { strFromU8, unzipSync } from 'fflate'

// Existing browser coverage adapted to the new template's actual controls.
test('каталог сохраняет 22 работы, семестры, баллы и поиск', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.hero')).toContainText('2 семестра · 22 лабораторные работы · 100 баллов')
  await expect(page.locator('.lab-card')).toHaveCount(22)
  await expect(page.locator('.block-card')).toHaveCount(2)
  for (const card of await page.locator('.block-card').all()) await expect(card).toContainText('50')
  await page.getByPlaceholder('Номер, тема или практический результат').fill('коэффициента готовности')
  await expect(page.locator('.lab-card')).toHaveCount(1)
  await page.getByPlaceholder('Номер, тема или практический результат').fill('')
  await page.getByRole('group', {name:'Фильтр по семестру'}).getByRole('button',{name:'8 семестр'}).click()
  await expect(page.locator('.lab-card')).toHaveCount(12)
})

test('все работы содержат контекст, ссылки на лекции и формы', async ({ page, request }) => {
  for (let n=1;n<=22;n++) {
    const slug=String(n).padStart(2,'0')
    await page.goto(`./#/lab/${slug}`)
    await expect(page.locator('.lab-hero')).toContainText(`Лабораторная работа ${slug}`)
    await expect(page.locator('#sequence')).toContainText('Связь с лекцией')
    expect(await page.locator('.lecture-links a').count()).toBeGreaterThan(0)
    await expect(page.locator('#sequence')).toContainText('Данные для следующей работы')
    await expect(page.locator('#task')).toContainText('Проверка')
    await expect(page.locator('.course-controls')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('{criticalFunction}')
    const response=await request.get(`./reports/LR${slug}_template.docx`)
    expect(response.ok()).toBeTruthy()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1)
  }
})

test('вариант сохраняется после обновления, ZIP согласован с HTML и DOCX', async ({ page }) => {
  await page.goto('./')
  await page.locator('.variant-picker select').selectOption('30')
  await page.reload()
  await expect(page.locator('.variant-picker select')).toHaveValue('30')
  await page.goto('./#/lab/01')
  await expect(page.locator('#inputs')).toContainText('Хранилище результатов аттестации')
  const waiting=page.waitForEvent('download')
  await page.locator('#inputs').getByRole('button',{name:'Скачать лабораторную работу',exact:true}).click()
  const download=await waiting
  const entries=unzipSync(new Uint8Array(await readFile((await download.path())!)))
  const paths=Object.keys(entries)
  expect(paths.filter(p=>p.endsWith('Задание.html'))).toHaveLength(1)
  expect(paths.some(p=>/^SA(?!30)/.test(p))).toBe(false)
  const html=strFromU8(entries['SA30/LR01/Задание.html'])
  expect(html).toContain('Хранилище результатов аттестации')
  expect(html).toContain('лекцией')
  expect(html).not.toContain('{assets}')
  const docx=unzipSync(entries['SA30/LR01/Шаблон_для_заполнения.docx'])
  const xml=strFromU8(docx['word/document.xml'])
  expect(xml).toContain('SA30')
  expect(xml).toContain('Хранилище результатов аттестации')
  expect(xml).not.toContain('{{VARIANT}}')
  for(const p of paths.filter(p=>p.endsWith('.csv')))expect(Array.from(entries[p].slice(0,3))).toEqual([239,187,191])
})

test('настройки, темы, помощь и самопроверка доступны', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button',{name:'Включить тёмную тему'}).click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark')
  await expect(page.getByRole('link',{name:'Как пользоваться сайтом'})).toHaveAttribute('href',/guide.html$/)
  await page.getByRole('button',{name:'Настройка перед занятием'}).click()
  await page.getByLabel('ФИО преподавателя').fill('Проверка настроек')
  await page.getByRole('button',{name:'Сохранить',exact:true}).click()
  await page.reload()
  await expect(page.locator('.course-controls')).toContainText('Проверка настроек')
  await page.goto('./#/lab/01')
  await page.locator('#self-check input[type=checkbox]').first().check()
  await expect(page.locator('#self-check input[type=checkbox]').first()).toBeChecked()
  await expect(page.locator('#lms-submit').getByRole('link',{name:'Перейти в LMS'})).toHaveAttribute('href','https://lms.synergy.ru/')
})
