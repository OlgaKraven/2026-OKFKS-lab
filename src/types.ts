export interface TheoryCard {
  label: string
  title: string
  text: string
}

export interface DataTable {
  title?: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export interface DataSection {
  title: string
  content?: string[]
  table?: DataTable
}

export interface SourceData {
  intro: string
  sections: DataSection[]
}

export interface RubricItem {
  criterion: string
  points: number
  description: string
}

export interface Lab {
  number: number
  slug: string
  title: string
  block: number
  blockTitle: string
  semester: 7 | 8
  topicCode: string
  topicTitle: string
  competencies: string[]
  points: number
  practicalResult: string
  situation: string
  goal: string
  outcomes: string[]
  sourceData: SourceData
  tools: string[]
  theoryCards: TheoryCard[]
  task: string[]
  stages: string[]
  deliverables: string[]
  evidence: string[]
  selfCheck: string[]
  wordRequirements: string[]
  rubric: RubricItem[]
  professionalChoice: string
  moodleSteps: string[]
  reportFile: string
  recommendedFileName: string
}
