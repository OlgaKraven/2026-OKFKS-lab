import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const payload = JSON.parse(readFileSync(resolve(root, 'src/data/labs.json'), 'utf8'))
const labs = payload.labs
const errors = []
const officialTitles = [
  'Сбор и классификация сведений об отказах заданной системы',
  'Расчёт наработки на отказ и среднего времени восстановления по журналу',
  'Расчёт коэффициента готовности и оценка соответствия требованию',
  'Выявление дестабилизирующих факторов для заданной системы',
  'Реализация контроля входных данных в заданном модуле',
  'Реализация проверки состояния и ограничения последствий отказа',
  'Применение программной избыточности и оценка её стоимости',
  'Настройка ведения журналов и счётчиков заданной системы',
  'Анализ журналов работающей системы и выявление предотказного состояния',
  'Составление реестра рисков эксплуатации с мерами реагирования',
  'Составление модели угроз для заданной компьютерной системы',
  'Обнаружение вредоносной программы и оценка последствий её работы',
  'Сравнительный анализ средств антивирусной защиты по заданным критериям',
  'Настройка средства антивирусной защиты и проверка его действия',
  'Настройка правил сетевого экрана и проверка прохождения разрешённого и запрещённого трафика',
  'Настройка парольной политики и проверка её действия',
  'Разграничение прав доступа к ресурсам системы',
  'Шифрование данных при хранении',
  'Защита передаваемых данных с применением протокола шифрования',
  'Тестирование защиты программного обеспечения по заданному набору проверок',
  'Проверка защищённости системы по регламенту и оформление заключения',
  'Разработка предложений по устранению выявленных недостатков защиты',
]
const requiredArrays = ['competencies', 'outcomes', 'tools', 'theoryCards', 'task', 'stages', 'deliverables', 'evidence', 'selfCheck', 'wordRequirements', 'lmsSteps']
const requiredStrings = ['slug', 'title', 'blockTitle', 'topicCode', 'topicTitle', 'practicalResult', 'situation', 'goal', 'professionalChoice', 'reportFile', 'recommendedFileName']
const forbiddenPatterns = [
  /\bминут/iu,
  /академическ\w*\s+час/iu,
  /перв(?:ый|ого)\s+час/iu,
  /втор(?:ая|ую)\s+половин\w*\s+занят/iu,
  /расписани\w*\s+выполнени/iu,
  /таймер/iu,
  /сгенериру\w*\s+(?:ответ|текст).*\b(?:ии|нейросет)/iu,
  /реальн\w*\s+(?:вредонос|атак)/iu,
  /эталонн\w*\s+ответ/iu,
]

if (!Array.isArray(labs)) errors.push('Поле labs должно быть массивом.')
if (labs.length !== 22) errors.push(`Ожидалось 22 работы, найдено ${labs.length}.`)

const seenNumbers = new Set()
const seenSlugs = new Set()
for (const lab of labs) {
  const prefix = `ЛР ${lab.number ?? '?'}`
  if (!Number.isInteger(lab.number) || lab.number < 1 || lab.number > 22) errors.push(`${prefix}: неверный номер.`)
  if (seenNumbers.has(lab.number)) errors.push(`${prefix}: повтор номера.`)
  seenNumbers.add(lab.number)
  if (seenSlugs.has(lab.slug)) errors.push(`${prefix}: повтор slug ${lab.slug}.`)
  seenSlugs.add(lab.slug)
  const expectedSlug = String(lab.number).padStart(2, '0')
  if (lab.slug !== expectedSlug) errors.push(`${prefix}: slug должен быть ${expectedSlug}.`)
  if (lab.title !== officialTitles[lab.number - 1]) errors.push(`${prefix}: официальное название изменено.`)
  const expectedSemester = lab.number <= 10 ? 7 : 8
  const expectedBlock = lab.number <= 10 ? 1 : 2
  const expectedPoints = lab.number <= 10 ? 5 : lab.number <= 21 ? 4 : 6
  if (lab.semester !== expectedSemester) errors.push(`${prefix}: неверный семестр.`)
  if (lab.block !== expectedBlock) errors.push(`${prefix}: неверный блок.`)
  if (lab.points !== expectedPoints) errors.push(`${prefix}: ожидалось ${expectedPoints} баллов.`)
  if (JSON.stringify(lab.competencies) !== JSON.stringify(['ОК 01', 'ПК 4.3', 'ПК 4.4'])) errors.push(`${prefix}: компетенции должны быть ОК 01, ПК 4.3, ПК 4.4.`)
  for (const key of requiredStrings) if (typeof lab[key] !== 'string' || !lab[key].trim()) errors.push(`${prefix}: пустое поле ${key}.`)
  for (const key of requiredArrays) if (!Array.isArray(lab[key]) || !lab[key].length) errors.push(`${prefix}: пустой массив ${key}.`)
  if (!lab.sourceData?.intro?.trim() || !Array.isArray(lab.sourceData.sections) || !lab.sourceData.sections.length) errors.push(`${prefix}: недостаточно исходных данных.`)
  if (lab.theoryCards?.length < 3 || lab.theoryCards?.length > 7) errors.push(`${prefix}: должно быть 3–7 карточек теории.`)
  if (lab.stages?.length !== 6) errors.push(`${prefix}: должно быть ровно 6 логических этапов.`)
  if (lab.lmsSteps?.length !== 6) errors.push(`${prefix}: должно быть 6 шагов сдачи в LMS.`)
  const expectedReport = `LR${expectedSlug}_template.docx`
  if (lab.reportFile !== expectedReport) errors.push(`${prefix}: имя шаблона должно быть ${expectedReport}.`)
  if (lab.recommendedFileName !== `Фамилия_Группа_МДК0402_ЛР${expectedSlug}.docx`) errors.push(`${prefix}: неверное рекомендуемое имя файла.`)
  const reportPath = resolve(root, 'public/reports', expectedReport)
  if (!existsSync(reportPath)) errors.push(`${prefix}: отсутствует ${expectedReport}.`)
  else if (statSync(reportPath).size < 20_000) errors.push(`${prefix}: ${expectedReport} подозрительно мал.`)
  const serialized = JSON.stringify(lab)
  for (const pattern of forbiddenPatterns) if (pattern.test(serialized)) errors.push(`${prefix}: запрещённая формулировка ${pattern}.`)
  if ('course' in lab) errors.push(`${prefix}: запрещено выдуманное поле course.`)
  if ('rubric' in lab) errors.push(`${prefix}: критерии оценивания должны быть удалены.`)
  if (/moodle/iu.test(serialized)) errors.push(`${prefix}: обозначение Moodle должно быть заменено на LMS.`)
}

const totalPoints = labs.reduce((sum, lab) => sum + Number(lab.points || 0), 0)
if (totalPoints !== 100) errors.push(`Сумма баллов ${totalPoints}, ожидалось 100.`)
if (labs.filter((lab) => lab.semester === 7).length !== 10) errors.push('В 7 семестре должно быть 10 работ.')
if (labs.filter((lab) => lab.semester === 8).length !== 12) errors.push('В 8 семестре должно быть 12 работ.')

if (errors.length) {
  console.error(errors.map((message) => `- ${message}`).join('\n'))
  process.exit(1)
}
console.log(`OK: ${labs.length} работ, ${totalPoints} баллов, 22 DOCX-шаблона.`)
