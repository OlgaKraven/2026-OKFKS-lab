import { describe, expect, it } from 'vitest'
import payload from '../src/data/labs.json'

describe('карта лабораторных работ', () => {
  it('содержит 22 уникальные работы и 100 баллов', () => {
    expect(payload.labs).toHaveLength(22)
    expect(new Set(payload.labs.map((lab) => lab.number)).size).toBe(22)
    expect(payload.labs.reduce((sum, lab) => sum + lab.points, 0)).toBe(100)
  })

  it('сохраняет структуру семестров', () => {
    expect(payload.labs.filter((lab) => lab.semester === 7)).toHaveLength(10)
    expect(payload.labs.filter((lab) => lab.semester === 8)).toHaveLength(12)
  })
})
