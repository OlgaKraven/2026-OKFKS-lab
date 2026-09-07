import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  Home as HomeIcon,
  Layers3,
  ListChecks,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { courseConfig } from './config'
import labsPayload from './data/labs.json'
import { labMethodology, type StepGuide } from './data/methodology'
import { downloadLabPackage } from './lib/labPackage'
import subjectAreasPayload from './data/subject-areas.json'
import type { DataTable, Lab, QualityProfile, SubjectArea } from './types'

const labs = (labsPayload as { labs: Lab[] }).labs
const { profiles, subjectAreas } = subjectAreasPayload as { profiles: QualityProfile[]; subjectAreas: SubjectArea[] }
const baseSystems: Partial<Record<number, string>> = {
  1: 'FS-EDU-01',
  2: 'PRINT-01',
  3: 'SCHED-01',
  4: 'PORTAL-EDU',
  6: 'JOB-01',
  7: 'CHECK-API',
  8: 'PRINT-HUB',
  9: 'STORAGE-02',
  10: 'LMS-COLLEGE',
  21: 'FS2',
  22: 'CampusBox',
}

function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

function personalizeText(value: string, labNumber: number, subjectArea: SubjectArea) {
  const baseSystem = baseSystems[labNumber]
  let result = baseSystem ? value.replaceAll(baseSystem, subjectArea.systemCode) : value
  const escapedCode = subjectArea.systemCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const systemPhrases: Array<[string, string]> = [
    [`учебному файловому серверу ${escapedCode}`, `системе «${subjectArea.title}» (${subjectArea.systemCode})`],
    [`Сервис печати ${escapedCode}`, `Система «${subjectArea.title}» (${subjectArea.systemCode})`],
    [`Для сервера электронного расписания ${escapedCode}`, `Для системы «${subjectArea.title}» (${subjectArea.systemCode})`],
    [`учебный веб-сервис ${escapedCode}`, `система «${subjectArea.title}» (${subjectArea.systemCode})`],
    [`учебного файлового сервера ${escapedCode}`, `системы «${subjectArea.title}» (${subjectArea.systemCode})`],
    [`системы ${escapedCode}`, `системы «${subjectArea.title}» (${subjectArea.systemCode})`],
  ]
  for (const [phrase, replacement] of systemPhrases) {
    result = result.replace(new RegExp(phrase, 'giu'), () => replacement)
  }
  return result
}

function useRoute() {
  const readHash = () => window.location.hash || '#/'
  const [hash, setHash] = useState(readHash)

  useEffect(() => {
    const onHashChange = () => setHash(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const match = hash.match(/^#\/lab\/(\d{2})/)
  return match ? { kind: 'lab' as const, slug: match[1] } : { kind: 'home' as const }
}

export function App() {
  const route = useRoute()
  const lab = route.kind === 'lab' ? labs.find((item) => item.slug === route.slug) : undefined
  const [subjectAreaId, setSubjectAreaId] = useState(() => {
    const saved = Number(window.localStorage.getItem('okfks-subject-area'))
    return saved >= 1 && saved <= 30 ? saved : 1
  })
  const subjectArea = subjectAreas.find((item) => item.id === subjectAreaId) ?? subjectAreas[0]
  const profile = profiles.find((item) => item.id === subjectArea.profileId) ?? profiles[0]

  const selectSubjectArea = (id: number) => {
    setSubjectAreaId(id)
    window.localStorage.setItem('okfks-subject-area', String(id))
  }

  useEffect(() => {
    const skipLink = document.querySelector<HTMLAnchorElement>('.skip-link')
    const handleSkip = (event: Event) => {
      event.preventDefault()
      const main = document.getElementById('main-content')
      window.setTimeout(() => {
        main?.focus({ preventScroll: true })
        main?.scrollIntoView({ block: 'start' })
      }, 0)
    }
    skipLink?.addEventListener('click', handleSkip)
    return () => skipLink?.removeEventListener('click', handleSkip)
  }, [])

  useEffect(() => {
    document.title = lab
      ? `ЛР ${lab.slug}. ${lab.title} — МДК.04.02`
      : 'Лабораторные работы — МДК.04.02'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [lab, route.kind])

  if (route.kind === 'lab' && lab) return <LabPage lab={lab} subjectArea={subjectArea} profile={profile} onSubjectAreaChange={selectSubjectArea} />
  if (route.kind === 'lab') return <NotFound />
  return <Home subjectArea={subjectArea} profile={profile} onSubjectAreaChange={selectSubjectArea} />
}

function Brand() {
  return (
    <a className="brand" href="#/" aria-label="На главную страницу курса">
      <img src={`${import.meta.env.BASE_URL}brand/synergy-logo.png`} alt="Университет Синергия" />
      <span>
        <strong>МДК.04.02</strong>
        <small>Лабораторный практикум</small>
      </span>
    </a>
  )
}

function Home({ subjectArea, profile, onSubjectAreaChange }: { subjectArea: SubjectArea; profile: QualityProfile; onSubjectAreaChange: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const [semester, setSemester] = useState<'all' | '7' | '8'>('all')
  const [topic, setTopic] = useState('all')
  const topics = useMemo(
    () => Array.from(new Map(labs.map((lab) => [lab.topicCode, `${lab.topicCode}. ${lab.topicTitle}`]))),
    [],
  )
  const visibleLabs = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return labs.filter((lab) => {
      const matchesSemester = semester === 'all' || lab.semester === Number(semester)
      const matchesTopic = topic === 'all' || lab.topicCode === topic
      const haystack = `${lab.number} ${lab.title} ${lab.topicCode} ${lab.topicTitle} ${lab.practicalResult}`.toLocaleLowerCase('ru-RU')
      return matchesSemester && matchesTopic && (!normalized || haystack.includes(normalized))
    })
  }, [query, semester, topic])

  return (
    <div className="site-shell">
      <header className="site-header">
        <Brand />
        <nav aria-label="Разделы главной страницы">
          <a href="#blocks">Блоки</a>
          <a href="#variants">Вариант</a>
          <a href="#labs">Работы</a>
          <a href="#lms">LMS</a>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero" aria-labelledby="course-title">
          <div className="hero-copy">
            <p className="eyebrow">7–8 семестры · 22 лабораторные · 100 баллов</p>
            <h1 id="course-title">Качество системы видно <span>по доказательствам</span></h1>
            <p className="hero-lead">
              Практикум по надёжности, наблюдаемости и защите компьютерных систем. В каждой работе — рабочая ситуация,
              полный набор исходных данных и один проверяемый результат для сдачи в LMS.
            </p>
            <a className="button primary" href="#labs">Выбрать работу <ArrowRight aria-hidden="true" size={18} /></a>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-chevron" />
            <img src={`${import.meta.env.BASE_URL}brand/okfks-rhino.webp`} alt="" />
          </div>
        </section>

        <section className="block-section" id="blocks" aria-labelledby="blocks-title">
          <div className="section-heading">
            <p className="eyebrow">Структура курса</p>
            <h2 id="blocks-title">Два профессиональных контура</h2>
            <p>Сначала — качество эксплуатации, затем — защита компьютерных систем.</p>
          </div>
          <div className="block-grid">
            <BlockCard block={1} title="Надёжность и качество в эксплуатации" semester={7} count={10} points={50} icon={<Database aria-hidden="true" />} />
            <BlockCard block={2} title="Защита компьютерных систем" semester={8} count={12} points={50} icon={<ShieldCheck aria-hidden="true" />} />
          </div>
        </section>

        <SubjectAreaPicker value={subjectArea} profile={profile} onChange={onSubjectAreaChange} />

        <section className="catalog-section" id="labs" aria-labelledby="labs-title">
          <div className="section-heading catalog-heading">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2 id="labs-title">Лабораторные работы</h2>
            </div>
            <p className="result-count" aria-live="polite">Показано: {visibleLabs.length} из {labs.length}</p>
          </div>

          <div className="filters" role="search">
            <label className="search-box">
              <Search aria-hidden="true" size={19} />
              <span className="sr-only">Поиск по лабораторным работам</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Номер, тема или практический результат" />
            </label>
            <fieldset className="semester-filter">
              <legend className="sr-only">Фильтр по семестру</legend>
              {(['all', '7', '8'] as const).map((value) => (
                <button key={value} type="button" className={semester === value ? 'active' : ''} onClick={() => setSemester(value)} aria-pressed={semester === value}>
                  {value === 'all' ? 'Все' : `${value} семестр`}
                </button>
              ))}
            </fieldset>
            <label className="select-field">
              <span>Тема</span>
              <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                <option value="all">Все темы</option>
                {topics.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
          </div>

          {visibleLabs.length ? (
            <div className="lab-grid">
              {visibleLabs.map((lab) => <LabCard key={lab.number} lab={lab} />)}
            </div>
          ) : (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <h3>Ничего не найдено</h3>
              <p>Измените поисковый запрос или сбросьте фильтры.</p>
              <button type="button" className="button secondary" onClick={() => { setQuery(''); setSemester('all'); setTopic('all') }}>Сбросить фильтры</button>
            </div>
          )}
        </section>

        <LmsRules />
      </main>

    </div>
  )
}

function BlockCard({ block, title, semester, count, points, icon }: { block: number; title: string; semester: number; count: number; points: number; icon: React.ReactNode }) {
  return (
    <article className={`block-card block-${block}`}>
      <div className="block-icon">{icon}</div>
      <p className="eyebrow">Блок {block} · {semester} семестр</p>
      <h3>{title}</h3>
      <div className="block-stats">
        <span><strong>{count}</strong> работ</span>
        <span><strong>{points}</strong> баллов</span>
      </div>
      <button type="button" className="text-link" onClick={() => {
        const control = document.querySelector<HTMLButtonElement>(`.semester-filter button:nth-of-type(${semester === 7 ? 2 : 3})`)
        control?.click()
        document.getElementById('labs')?.scrollIntoView({ behavior: 'smooth' })
      }}>Показать работы <ChevronRight aria-hidden="true" size={17} /></button>
    </article>
  )
}

function LabCard({ lab }: { lab: Lab }) {
  const reportUrl = assetUrl(`reports/${lab.reportFile}`)
  return (
    <article className="lab-card">
      <div className="lab-card-top">
        <span className="lab-number">{courseConfig.code}-ЛР{lab.slug}</span>
        <span className="lab-meta">{lab.semester} семестр · {lab.points} {pluralizePoints(lab.points)}</span>
      </div>
      <p className="topic-line">Тема {lab.topicCode} · {lab.topicTitle}</p>
      <h3>{lab.title}</h3>
      <div className="result-preview">
        <p><strong>Результат</strong>{lab.practicalResult}</p>
      </div>
      <div className="lab-card-actions">
        <a className="button primary" href={`#/lab/${lab.slug}`}>Открыть работу <ArrowRight aria-hidden="true" size={17} /></a>
        <a className="card-download" href={reportUrl} download aria-label={`Скачать шаблон ЛР ${lab.slug}`} title="Скачать шаблон DOCX">
          <Download aria-hidden="true" size={19} />
        </a>
      </div>
    </article>
  )
}

function LmsRules() {
  const steps = [
    'Скачайте шаблон Word со страницы нужной лабораторной работы.',
    'Выполните задание по выданным исходным данным.',
    'Заполните отчёт и удалите все серые подсказки.',
    'Сохраните результат одним файлом .docx с рекомендуемым именем.',
    'Откройте соответствующее задание лабораторной работы в LMS.',
    'Прикрепите подготовленный файл к заданию в LMS.',
    'Откройте отправку и убедитесь, что файл действительно прикреплён.',
  ]
  return (
    <section className="lms-section" id="lms" aria-labelledby="lms-title">
      <div>
        <p className="eyebrow">Единственное место сдачи</p>
        <h2 id="lms-title">Один отчёт — одна отправка в LMS</h2>
        <p>Сайт не принимает файлы и не проверяет ответы. Итоговый материал каждой работы — один документ Word.</p>
        <a className="button primary" href={courseConfig.lmsUrl} target="_blank" rel="noreferrer">
          Открыть LMS <ExternalLink aria-hidden="true" size={17} />
        </a>
      </div>
      <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    </section>
  )
}

function LabPage({ lab, subjectArea, profile, onSubjectAreaChange }: { lab: Lab; subjectArea: SubjectArea; profile: QualityProfile; onSubjectAreaChange: (id: number) => void }) {
  const [packageStatus, setPackageStatus] = useState<'idle' | 'preparing' | 'error'>('idle')
  const previous = labs.find((item) => item.number === lab.number - 1)
  const next = labs.find((item) => item.number === lab.number + 1)
  const reportUrl = `${import.meta.env.BASE_URL}reports/${lab.reportFile}`
  const packUrl = assetUrl(subjectArea.pack)
  const labText = (value: string) => personalizeText(value, lab.number, subjectArea)
  const methodology = labMethodology[lab.number]
  const preparePackage = async () => {
    setPackageStatus('preparing')
    try {
      await downloadLabPackage({
        labSlug: lab.slug,
        subjectCode: subjectArea.code,
        title: `ЛР ${lab.slug}. ${lab.title} · ${subjectArea.code}`,
        reportUrl,
        subjectPackUrl: packUrl,
      })
      setPackageStatus('idle')
    } catch {
      setPackageStatus('error')
    }
  }

  return (
    <div className="lab-shell">
      <main id="main-content" tabIndex={-1}>
        <section className="lab-hero" aria-labelledby="lab-title">
          <div className="lab-hero-inner">
            <nav className="lab-breadcrumb" aria-label="Навигация по курсу">
              <a href="#/"><ArrowLeft aria-hidden="true" size={17} /> Каталог</a>
              <span aria-hidden="true">/</span>
              <span>МДК0402_ЛР{lab.slug}</span>
            </nav>
            <div className="lab-hero-grid">
              <div className="lab-hero-copy">
                <p className="eyebrow">{lab.semester} семестр · лабораторная работа {lab.slug}</p>
                <h1 id="lab-title">{lab.title}</h1>
                <div className="lab-result-line">
                  <span>Результат работы</span>
                  <p>{lab.practicalResult}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="lab-page-grid">
          <article className="lab-content">
            <SubjectAreaPicker value={subjectArea} profile={profile} onChange={onSubjectAreaChange} compact />

            <ContentSection id="situation" number="01" label="Контекст" title="Рабочая ситуация" icon={<Database aria-hidden="true" />}>
              <div className="lead-card"><p>{subjectArea.code} · {subjectArea.title}. {labText(lab.situation)}</p></div>
              <div className="choice-callout"><strong>Профессиональный выбор</strong><p>{labText(lab.professionalChoice)}</p></div>
            </ContentSection>

            <ContentSection id="goal" number="02" label="Результат обучения" title="Цель и формируемые умения" icon={<Target aria-hidden="true" />}>
              <p><strong>Цель.</strong> {labText(lab.goal)}</p>
              <h3>После выполнения вы сможете</h3>
              <Checklist items={lab.outcomes.map(labText)} />
            </ContentSection>

            <ContentSection id="sequence" number="03" label="Связь работ" title="Место работы в последовательности" icon={<ArrowRight aria-hidden="true" />}>
              <div className="sequence-grid">
                <article><span>Используется на входе</span><p>{methodology.sequence.previous}</p></article>
                <article><span>Передаётся дальше</span><p>{methodology.sequence.next}</p></article>
              </div>
              <h3>Материалы текущей работы</h3>
              <Checklist items={[
                `ZIP-набор ${subjectArea.code} с паспортом системы, пятью характеристиками профиля и исходными файлами ЛР ${lab.slug}`,
                `таблицы, правила, ограничения и идентификаторы из раздела «Исходные данные»`,
                `редактируемый шаблон ${lab.reportFile}`,
              ]} />
            </ContentSection>

            <ContentSection id="inputs" number="04" label="Стартовый пакет" title="Исходные данные" icon={<Layers3 aria-hidden="true" />}>
              <div className="variant-source-note"><strong>Набор {subjectArea.code}</strong><p>На странице и в ZIP-пакете показаны данные только для «{subjectArea.title}». Системный код: <code>{subjectArea.systemCode}</code>.</p><a className="button secondary" href={packUrl} download><Download aria-hidden="true" size={18} /> Скачать исходный набор</a></div>
              <p>{labText(lab.sourceData.intro)}</p>
              {lab.sourceData.sections.map((section) => (
                <div className="data-section" key={section.title}>
                  <h3>{labText(section.title)}</h3>
                  {section.content?.map((item, index) => item.includes('\n')
                    ? <pre className="source-block" key={`${section.title}-${index}`}><code>{labText(item)}</code></pre>
                    : <p key={`${section.title}-${index}`}>{labText(item)}</p>)}
                  {section.table && <ResponsiveTable data={{
                    ...section.table,
                    title: section.table.title ? labText(section.table.title) : undefined,
                    columns: section.table.columns.map(labText),
                    rows: section.table.rows.map((row) => row.map((cell) => typeof cell === 'string' ? labText(cell) : cell)),
                  }} />}
                </div>
              ))}
              <h3>Инструменты и допустимая среда</h3><Checklist items={lab.tools.map(labText)} compact />
            </ContentSection>

            <ContentSection id="theory" number="05" label="Теория" title="Краткая опора" icon={<BookOpen aria-hidden="true" />}>
              <div className="theory-grid">{lab.theoryCards.map((card) => (
                <article className="theory-card" key={`${card.label}-${card.title}`}>
                  <span>{labText(card.label)}</span><h3>{labText(card.title)}</h3><p>{labText(card.text)}</p>
                </article>
              ))}</div>
            </ContentSection>

            <ContentSection id="example" number="06" label="Разобранный пример" title={methodology.example.title} icon={<BookOpen aria-hidden="true" />}>
              <div className="worked-example">
                <p><strong>Условие.</strong> {methodology.example.source}</p>
                <h3>Ход решения</h3>
                <Checklist items={methodology.example.method} numbered />
                <p><strong>Проверяемый результат.</strong> {methodology.example.result}</p>
                <p className="example-boundary"><strong>Граница примера.</strong> {methodology.example.boundary}</p>
              </div>
            </ContentSection>

            <ContentSection id="profile" number="07" label="Параметры варианта" title="Пять характеристик варианта" icon={<ShieldCheck aria-hidden="true" />}>
              <p className="profile-intro">Варианты {profile.variantRange} используют один профиль «{profile.title}». Значения общие для пятёрки, а примеры ниже относятся только к {subjectArea.code}.</p>
              <div className="characteristic-grid">{profile.characteristics.map((item) => (
                <article className="characteristic-card" key={item.code}>
                  <span>{item.code}</span><h3>{item.name}</h3><strong>{item.value}</strong><p>{item.example.replaceAll('{system}', subjectArea.title)}</p>
                </article>
              ))}</div>
            </ContentSection>

            <ContentSection id="task" number="08" label="Задание" title="Последовательность действий" icon={<ListChecks aria-hidden="true" />}>
              <p className="task-scope"><strong>Все действия обязательны.</strong> Дополнительные задания в этой работе не предусмотрены.</p>
              <TaskProtocol actions={lab.task.map(labText)} guides={methodology.steps} subjectArea={subjectArea} />
            </ContentSection>

            <ContentSection id="result" number="09" label="Результат" title="Что должно быть получено" icon={<FileCheck2 aria-hidden="true" />}>
              <Checklist items={lab.deliverables.map(labText)} />
            </ContentSection>

            <ContentSection id="self-check" number="10" label="Перед отправкой" title="Самопроверка" icon={<ClipboardCheck aria-hidden="true" />}>
              <Checklist items={lab.selfCheck.map(labText)} checkboxes />
              <h3>Требования к Word-файлу</h3><Checklist items={lab.wordRequirements.map(labText)} />
            </ContentSection>

            <ContentSection id="lms-submit" number="11" label="Отчёт и LMS" title="Требования к отчёту и сдаче" icon={<GraduationCap aria-hidden="true" />}>
              <p><strong>Один заполненный редактируемый DOCX-файл.</strong></p>
              <p className="filename"><strong>Рекомендуемое имя:</strong> <code>{lab.recommendedFileName}</code></p>
              <ol className="lms-steps">{lab.lmsSteps.map((step) => <li key={step}>{step}</li>)}</ol>
              <div className="submission-actions">
                <a className="button primary" href={reportUrl} download><Download aria-hidden="true" size={18} /> Скачать редактируемый DOCX</a>
                <a className="button secondary" href={courseConfig.lmsUrl} target="_blank" rel="noreferrer">Перейти в LMS <ExternalLink aria-hidden="true" size={17} /></a>
              </div>
            </ContentSection>

            <nav className="lab-pager" aria-label="Соседние лабораторные работы">
              {previous ? <a href={`#/lab/${previous.slug}`}><ArrowLeft aria-hidden="true" /> <span><small>Предыдущая</small>ЛР {previous.slug}</span></a> : <span />}
              {next ? <a href={`#/lab/${next.slug}`}><span><small>Следующая</small>ЛР {next.slug}</span> <ArrowRight aria-hidden="true" /></a> : <span />}
            </nav>
          </article>

          <aside className="lab-summary" aria-label="Краткая карточка работы">
            <p className="eyebrow">Карточка работы</p>
            <dl>
              <div><dt>ID</dt><dd>{courseConfig.code}-ЛР{lab.slug}</dd></div>
              <div><dt>Результат</dt><dd>{lab.practicalResult}</dd></div>
              <div><dt>Учебный блок</dt><dd>{lab.blockTitle}</dd></div>
            </dl>
            <div className="summary-actions" aria-label="Шаблон работы">
              <button className="button primary" type="button" disabled={packageStatus === 'preparing'} onClick={preparePackage}>
                <Download aria-hidden="true" size={18} /> {packageStatus === 'preparing' ? 'Подготовка…' : packageStatus === 'error' ? 'Повторить скачивание' : 'Скачать шаблон'}
              </button>
            </div>
            {packageStatus === 'error' && <p className="package-error" role="status">Не удалось подготовить комплект. Проверьте соединение и повторите скачивание.</p>}
            <a className="summary-link" href="#/"><HomeIcon aria-hidden="true" size={15} /> Ко всем работам</a>
          </aside>
        </div>
      </main>
    </div>
  )
}

function TaskProtocol({ actions, guides, subjectArea }: { actions: string[]; guides: StepGuide[]; subjectArea: SubjectArea }) {
  return (
    <ol className="task-protocol">
      {actions.map((action, index) => {
        const guide = guides[index]
        return (
          <li key={action}>
            <h3>{action}</h3>
            <dl>
              <div><dt>Исходные данные</dt><dd>Набор {subjectArea.code}. {guide.data}</dd></div>
              <div><dt>Результат шага</dt><dd>{guide.result}</dd></div>
              <div><dt>Проверка</dt><dd>{guide.check}</dd></div>
            </dl>
          </li>
        )
      })}
    </ol>
  )
}

function SubjectAreaPicker({ value, profile, onChange, compact = false }: { value: SubjectArea; profile: QualityProfile; onChange: (id: number) => void; compact?: boolean }) {
  const titleId = compact ? 'variant-title-lab' : 'variant-title'
  return (
    <section className={`variant-picker${compact ? ' compact' : ''}`} id={compact ? undefined : 'variants'} aria-labelledby={titleId}>
      <div className="variant-picker-copy">
        <p className="eyebrow">Сквозной вариант · 01–30</p>
        <h2 id={titleId}>{value.code} · {value.title}</h2>
        <p>Одна предметная область используется во всех 22 работах. Номер области совпадает с номером варианта.</p>
      </div>
      <label className="variant-select"><span>Предметная область</span><select value={value.id} onChange={(event) => onChange(Number(event.target.value))}>{subjectAreas.map((area) => <option key={area.code} value={area.id}>{area.code} · {area.title}</option>)}</select></label>
      <dl className="variant-facts">
        <div><dt>Система</dt><dd><code>{value.systemCode}</code></dd></div>
        <div><dt>Группа</dt><dd>{profile.variantRange} · {profile.title}</dd></div>
        <div><dt>Критичная функция</dt><dd>{value.criticalFunction}</dd></div>
      </dl>
      <a className="button primary variant-download" href={assetUrl(value.pack)} download><Download aria-hidden="true" size={18} /> Скачать ZIP {value.code}</a>
    </section>
  )
}

function ContentSection({ id, number, label, title, icon, children }: { id: string; number: string; label: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const titleClassName = title.length > 24 ? 'content-section-title is-long' : 'content-section-title'
  return <section className="content-section" id={id}><header className="content-section-heading"><span className="section-icon">{icon}</span><div><p className="eyebrow">{number} · {label}</p><h2 className={titleClassName}>{title}</h2></div></header><div className="content-section-body">{children}</div></section>
}

function Checklist({ items, compact = false, numbered = false, checkboxes = false }: { items: string[]; compact?: boolean; numbered?: boolean; checkboxes?: boolean }) {
  const Tag = numbered ? 'ol' : 'ul'
  return <Tag className={`checklist ${compact ? 'compact' : ''} ${checkboxes ? 'with-boxes' : ''}`}>{items.map((item) => <li key={item}>{!numbered && !checkboxes && <CheckCircle2 aria-hidden="true" size={18} />}{item}</li>)}</Tag>
}

function ResponsiveTable({ data }: { data: DataTable }) {
  return <figure className="data-table"><div className="table-scroll"><table><thead><tr>{data.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join('-')}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div>{data.title && <figcaption>{data.title}</figcaption>}</figure>
}

function NotFound() {
  return <main id="main-content" className="not-found" tabIndex={-1}><FileText aria-hidden="true" size={48} /><h1>Работа не найдена</h1><p>Проверьте номер в ссылке или вернитесь в каталог.</p><a className="button primary" href="#/">Открыть каталог</a></main>
}

function pluralizePoints(points: number) {
  if (points === 1) return 'балл'
  if (points >= 2 && points <= 4) return 'балла'
  return 'баллов'
}
