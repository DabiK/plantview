import { describe, expect, it } from 'vitest'
import { diagramExamples } from './examples'
import { decodeDiagram, encodeDiagram } from './plantuml-encoding'

describe('diagramExamples', () => {
  it('exposes four unique, complete examples', () => {
    expect(diagramExamples).toHaveLength(4)
    expect(new Set(diagramExamples.map((example) => example.id)).size).toBe(4)

    for (const example of diagramExamples) {
      expect(example.title.trim()).not.toBe('')
      expect(example.description.trim()).not.toBe('')
      expect(example.source).toContain('@startuml')
      expect(example.source).toContain('@enduml')
    }
  })

  it('round-trips every example through the URL codec', () => {
    for (const example of diagramExamples) {
      expect(decodeDiagram(encodeDiagram(example.source))).toBe(example.source)
    }
  })
})
