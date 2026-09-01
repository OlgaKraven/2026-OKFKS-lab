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
  Printer,
  Route,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { courseConfig } from './config'
import labsPayload from './data/labs.json'
import type { DataTable, Lab } from './types'

const labs = (labsPayload as { labs: Lab[] }).labs

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

  if (route.kind === 'lab' && lab) return <LabPage lab={lab} />
  if (route.kind === 'lab') return <NotFound />
  return <Home />
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

function Home() {
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

      <footer className="site-footer">
        <span>МДК.04.02 · ОК 01 · ПК 4.3 · ПК 4.4</span>
        <a href={courseConfig.repositoryUrl}>Исходный код <ExternalLink aria-hidden="true" size={15} /></a>
      </footer>
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
  return (
    <article className="lab-card">
      <div className="lab-card-top">
        <span className="lab-number">ЛР {lab.slug}</span>
        <span className="points-badge">{lab.points} {pluralizePoints(lab.points)}</span>
      </div>
      <p className="topic-line">Тема {lab.topicCode} · {lab.semester} семестр</p>
      <h3>{lab.title}</h3>
      <div className="result-preview">
        <FileText aria-hidden="true" size={19} />
        <p><strong>Практический результат</strong>{lab.practicalResult}</p>
      </div>
      <a className="button secondary" href={`#/lab/${lab.slug}`}>Открыть работу <ArrowRight aria-hidden="true" size={17} /></a>
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

function LabPage({ lab }: { lab: Lab }) {
  const previous = labs.find((item) => item.number === lab.number - 1)
  const next = labs.find((item) => item.number === lab.number + 1)
  const reportUrl = `${import.meta.env.BASE_URL}reports/${lab.reportFile}`
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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
              <div className="lab-action-stack" aria-label="Материалы работы">
                <a className="button primary" href={reportUrl} download><Download aria-hidden="true" size={18} /> Скачать DOCX</a>
                <button className="button hero-secondary" type="button" onClick={() => scrollTo('inputs')}><Layers3 aria-hidden="true" size={19} /> Исходные данные <ChevronRight aria-hidden="true" size={17} /></button>
                <a className="button hero-secondary" href={courseConfig.lmsUrl} target="_blank" rel="noreferrer"><GraduationCap aria-hidden="true" size={20} /> Открыть LMS <ExternalLink aria-hidden="true" size={17} /></a>
                <button className="button hero-secondary" type="button" onClick={() => window.print()}><Printer aria-hidden="true" size={18} /> Печать страницы</button>
              </div>
            </div>
          </div>
        </section>

        <div className="lab-page-grid">
          <article className="lab-content">
            <ContentSection id="situation" number="01" label="Контекст" title="Рабочая ситуация" icon={<Database aria-hidden="true" />}>
              <div className="lead-card"><p>{lab.situation}</p></div>
              <div className="competencies" aria-label="Формируемые компетенции">{lab.competencies.map((item) => <span key={item}>{item}</span>)}</div>
              <div className="choice-callout"><strong>Профессиональный выбор</strong><p>{lab.professionalChoice}</p></div>
            </ContentSection>

            <ContentSection id="goal" number="02" label="Результат обучения" title="Цель и формируемые умения" icon={<Target aria-hidden="true" />}>
              <p><strong>Цель.</strong> {lab.goal}</p>
              <h3>После выполнения вы сможете</h3>
              <Checklist items={lab.outcomes} />
            </ContentSection>

            <ContentSection id="inputs" number="03" label="Стартовый пакет" title="Исходные данные" icon={<Layers3 aria-hidden="true" />}>
              <p>{lab.sourceData.intro}</p>
              {lab.sourceData.sections.map((section) => (
                <div className="data-section" key={section.title}>
                  <h3>{section.title}</h3>
                  {section.content?.map((item, index) => item.includes('\n')
                    ? <pre className="source-block" key={`${section.title}-${index}`}><code>{item}</code></pre>
                    : <p key={`${section.title}-${index}`}>{item}</p>)}
                  {section.table && <ResponsiveTable data={section.table} />}
                </div>
              ))}
              <h3>Инструменты и допустимая среда</h3><Checklist items={lab.tools} compact />
            </ContentSection>

            <ContentSection id="theory" number="04" label="Теория" title="Краткая опора" icon={<BookOpen aria-hidden="true" />}>
              <div className="theory-grid">{lab.theoryCards.map((card) => (
                <article className="theory-card" key={`${card.label}-${card.title}`}>
                  <span>{card.label}</span><h3>{card.title}</h3><p>{card.text}</p>
                </article>
              ))}</div>
            </ContentSection>

            <ContentSection id="task" number="05" label="Задание" title="Что нужно сделать" icon={<ListChecks aria-hidden="true" />}>
              <Checklist items={lab.task} numbered />
            </ContentSection>

            <ContentSection id="route" number="06" label="Действия" title="Маршрут выполнения" icon={<Route aria-hidden="true" />}>
              <Workflow stages={lab.stages} />
            </ContentSection>

            <ContentSection id="result" number="07" label="Доказательства" title="Что подтвердить" icon={<FileCheck2 aria-hidden="true" />}>
              <div className="result-banner"><FileText aria-hidden="true" /><div><strong>Практический результат</strong><p>{lab.practicalResult}</p></div></div>
              <div className="two-column">
                <div><h3>Что должно быть получено</h3><Checklist items={lab.deliverables} /></div>
                <div><h3>Какие доказательства приложить</h3><Checklist items={lab.evidence} /></div>
              </div>
            </ContentSection>

            <ContentSection id="self-check" number="08" label="Перед отправкой" title="Самопроверка" icon={<ClipboardCheck aria-hidden="true" />}>
              <Checklist items={lab.selfCheck} checkboxes />
              <h3>Требования к Word-файлу</h3><Checklist items={lab.wordRequirements} />
            </ContentSection>

            <ContentSection id="lms-submit" number="09" label="Отчёт и LMS" title="Что сдаётся" icon={<GraduationCap aria-hidden="true" />}>
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
              <div><dt>ID</dt><dd>МДК0402_ЛР{lab.slug}</dd></div>
              <div><dt>Семестр</dt><dd>{lab.semester}</dd></div>
              <div><dt>Тема</dt><dd>{lab.topicCode}. {lab.topicTitle}</dd></div>
              <div><dt>Учебный блок</dt><dd>{lab.blockTitle}</dd></div>
              <div><dt>Результат</dt><dd>{lab.practicalResult}</dd></div>
            </dl>
            <a className="button primary" href={reportUrl} download><Download aria-hidden="true" size={18} /> Скачать DOCX</a>
            <a className="summary-link" href={courseConfig.lmsUrl} target="_blank" rel="noreferrer">Открыть LMS <ExternalLink aria-hidden="true" size={15} /></a>
            <a className="summary-link" href="#/"><HomeIcon aria-hidden="true" size={15} /> Ко всем работам</a>
          </aside>
        </div>
      </main>
    </div>
  )
}

function ContentSection({ id, number, label, title, icon, children }: { id: string; number: string; label: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="content-section" id={id}><header className="content-section-heading"><span className="section-icon">{icon}</span><div><p className="eyebrow">{number} · {label}</p><h2>{title}</h2></div></header><div className="content-section-body">{children}</div></section>
}

function Checklist({ items, compact = false, numbered = false, checkboxes = false }: { items: string[]; compact?: boolean; numbered?: boolean; checkboxes?: boolean }) {
  const Tag = numbered ? 'ol' : 'ul'
  return <Tag className={`checklist ${compact ? 'compact' : ''} ${checkboxes ? 'with-boxes' : ''}`}>{items.map((item) => <li key={item}>{!numbered && !checkboxes && <CheckCircle2 aria-hidden="true" size={18} />}{item}</li>)}</Tag>
}

function Workflow({ stages }: { stages: string[] }) {
  return <ol className="workflow">{stages.map((stage, index) => <li key={stage}><span>{index + 1}</span><p>{stage}</p></li>)}</ol>
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
