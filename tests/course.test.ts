import { describe, expect, it } from 'vitest'
import payload from '../src/data/labs.json'
import { labMethodology } from '../src/data/methodology'
import subjectPayload from '../src/data/subject-areas.json'
import baseline from '../authoring/labs-baseline.json'
import lectureReference from '../authoring/lecture-reference.json'
import { personalizeText } from '../src/lib/personalize'

describe('карта лабораторных работ', () => {
  it('сохраняет каждую исходную тему, номер, балл, семестр и числовые данные', () => {
    for(const [i,lab] of payload.labs.entries()) {
      const old=baseline.labs[i]
      for(const field of ['number','slug','title','points','semester','topicCode'] as const) expect(lab[field]).toEqual(old[field])
      expect(lab.sourceData.sections.filter(s=>'table' in s).map(s=>s.table?.rows)).toEqual(old.sourceData.sections.filter(s=>'table' in s).map(s=>s.table?.rows))
      expect(lab.rubric.reduce((sum,x)=>sum+x.points,0)).toBe(lab.points)
    }
  })
  it('ссылается на существующие разделы лекций того же семестра', () => {
    const examples=new Set<string>()
    for(const lab of payload.labs){
      const m=labMethodology[lab.number]
      examples.add(m.example.source)
      for(const link of m.lecture.links){
        const lecture=lectureReference.lectures.find(l=>l.slides.some(s=>s.id===link.slideId))
        expect(lecture?.semester).toBe(lab.semester)
        expect(lecture?.slides.find(s=>s.id===link.slideId)?.kind).toBe('section')
        expect(new URL(link.url).searchParams.get('slide')).toBe(link.slideId)
      }
    }
    expect(examples.size).toBe(22)
  })
  it('подставляет функцию и активы каждого из 30 вариантов без остаточных маркеров', () => {
    for(const area of subjectPayload.subjectAreas){
      const result=personalizeText('{system} {systemCode} {criticalFunction} {assets}',1,area)
      expect(result).toContain(area.criticalFunction)
      expect(result).toContain(area.assets[0])
      expect(result).not.toMatch(/[{}]/)
    }
  })
  it('содержит 22 уникальные работы на 100 баллов', () => {
    expect(payload.labs).toHaveLength(22)
    expect(new Set(payload.labs.map((lab) => lab.number)).size).toBe(22)
    expect(payload.labs.reduce((sum, lab) => sum + lab.points, 0)).toBe(100)
  })

  it('сохраняет по 50 баллов в каждом семестре', () => {
    const semester7 = payload.labs.filter((lab) => lab.semester === 7)
    const semester8 = payload.labs.filter((lab) => lab.semester === 8)
    expect(semester7).toHaveLength(10)
    expect(semester8).toHaveLength(12)
    expect(semester7.reduce((sum, lab) => sum + lab.points, 0)).toBe(50)
    expect(semester8.reduce((sum, lab) => sum + lab.points, 0)).toBe(50)
  })

  it('содержит 30 областей и шесть групп по пять вариантов', () => {
    expect(subjectPayload.subjectAreas).toHaveLength(30)
    expect(subjectPayload.profiles).toHaveLength(6)
    for (const profile of subjectPayload.profiles) {
      expect(profile.characteristics).toHaveLength(5)
      expect(subjectPayload.subjectAreas.filter((area) => area.profileId === profile.id)).toHaveLength(5)
    }
  })

  it('содержит методическую связку, разобранный пример и критерии каждого шага', () => {
    for (const lab of payload.labs) {
      const methodology = labMethodology[lab.number]
      expect(methodology).toBeDefined()
      expect(methodology.sequence.previous).toBeTruthy()
      expect(methodology.sequence.next).toBeTruthy()
      expect(methodology.example.method.length).toBeGreaterThanOrEqual(3)
      expect(methodology.example.boundary).toBeTruthy()
      expect(methodology.steps).toHaveLength(lab.task.length)
      for (const step of methodology.steps) {
        expect(step.data).toBeTruthy()
        expect(step.result).toBeTruthy()
        expect(step.check).toBeTruthy()
      }
      expect(lab.selfCheck.every((item) => !item.includes('?'))).toBe(true)
    }
  })
})
