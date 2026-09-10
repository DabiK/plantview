import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parsePlantUmlError,
  PlantUmlRenderError,
  renderPlantUml,
} from './render-plantuml'

describe('parsePlantUmlError', () => {
  it('extracts the line number and the first meaningful message line', () => {
    const raw =
      'Error line 3 in file: /tmp/diagram.puml\nSyntax Error?\nSome extra detail'

    expect(parsePlantUmlError(raw)).toEqual({
      line: 3,
      message: 'Syntax Error?',
    })
  })

  it('supports messages without a line number', () => {
    expect(parsePlantUmlError('Syntax Error?')).toEqual({
      line: null,
      message: 'Syntax Error?',
    })
  })

  it('keeps the error-line text when it is the only content', () => {
    expect(parsePlantUmlError('Error line 12 in file: stdin')).toEqual({
      line: 12,
      message: 'Error line 12 in file: stdin',
    })
  })

  it('falls back to a default message for empty input', () => {
    expect(parsePlantUmlError('   \n  ')).toEqual({
      line: null,
      message: 'Unknown PlantUML error.',
    })
  })
})

/**
 * Builds a minimal fake `<script>` element whose `error` event can be
 * triggered manually, plus a stub `document` that fires that error as soon as
 * the script is appended.
 */
function stubDocumentWithScriptLoadFailure() {
  const createdScripts: Array<{ trigger: (type: string) => void }> = []

  const stub = {
    querySelector: () => null,
    createElement: () => {
      const listeners = new Map<string, () => void>()
      const script = {
        dataset: {} as Record<string, string>,
        src: '',
        async: false,
        remove: vi.fn(),
        addEventListener: (type: string, listener: () => void) => {
          listeners.set(type, listener)
        },
      }
      createdScripts.push({
        trigger: (type) => listeners.get(type)?.(),
      })
      return script
    },
    head: {
      appendChild: () => {
        const script = createdScripts[createdScripts.length - 1]
        queueMicrotask(() => script.trigger('error'))
      },
    },
  }

  vi.stubGlobal('document', stub)
  vi.stubGlobal('window', {})

  return { createdScripts }
}

describe('renderPlantUml engine loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects cleanly when there is no DOM (node environment)', async () => {
    const promise = renderPlantUml('@startuml\nA -> B\n@enduml')

    await expect(promise).rejects.toBeInstanceOf(PlantUmlRenderError)
    await expect(promise).rejects.toMatchObject({ superseded: false })
  })

  it('rejects with a clear error when viz-global.js fails to load, then retries', async () => {
    const { createdScripts } = stubDocumentWithScriptLoadFailure()

    const first = renderPlantUml('@startuml\nA -> B\n@enduml')
    await expect(first).rejects.toThrow(/viz-global\.js/)
    expect(createdScripts).toHaveLength(1)

    // A failed load must not poison the singleton: the next render retries.
    const second = renderPlantUml('@startuml\nA -> B\n@enduml')
    await expect(second).rejects.toThrow(/viz-global\.js/)
    expect(createdScripts).toHaveLength(2)
  })
})
