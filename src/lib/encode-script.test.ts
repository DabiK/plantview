import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { decodeDiagram, extractDiagramCode } from './plantuml-encoding'

const SCRIPT_PATH = fileURLToPath(
  new URL('../../scripts/encode.mjs', import.meta.url),
)
const DEFAULT_BASE = 'http://localhost:5173'
const REFERENCE_SOURCE = '@startuml\nBob -> Alice: Hello!\n@enduml\n'

interface RunOptions {
  input?: string
  env?: Record<string, string>
}

interface RunResult {
  status: number | null
  stdout: string
  stderr: string
}

/** Runs `node scripts/encode.mjs …` exactly like an agent would. */
function runEncode(args: string[], options: RunOptions = {}): RunResult {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    input: options.input,
    encoding: 'utf8',
    env: {
      ...process.env,
      PLANTVIEW_BASE_URL: '',
      ...options.env,
    },
  })

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

/** Extracts the code from a script output and decodes it back to source. */
function decodedSourceFrom(stdout: string): string {
  const code = extractDiagramCode(stdout.trim())
  expect(code).not.toBe('')
  return decodeDiagram(code)
}

const tempDir = mkdtempSync(path.join(tmpdir(), 'plantview-encode-'))

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('scripts/encode.mjs', () => {
  it('encodes --text into a full viewer URL whose code decodes back', () => {
    const result = runEncode(['--text', REFERENCE_SOURCE])

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toMatch(
      new RegExp(`^${DEFAULT_BASE}/view/[0-9A-Za-z_-]+$`),
    )
    expect(decodedSourceFrom(result.stdout)).toBe(REFERENCE_SOURCE)
  })

  it('matches the acceptance pipeline: printf … | pnpm encode', () => {
    const result = runEncode([], { input: REFERENCE_SOURCE })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('/view/')
    expect(decodedSourceFrom(result.stdout)).toBe(REFERENCE_SOURCE)
  })

  it('prints only the code with --code-only', () => {
    const result = runEncode(['--text', REFERENCE_SOURCE, '--code-only'])

    expect(result.status).toBe(0)
    const code = result.stdout.trim()
    expect(code).toMatch(/^[0-9A-Za-z_-]+$/)
    expect(decodeDiagram(code)).toBe(REFERENCE_SOURCE)
  })

  it('reads the source from --file', () => {
    const filePath = path.join(tempDir, 'diagram.puml')
    writeFileSync(filePath, REFERENCE_SOURCE, 'utf8')

    const result = runEncode(['--file', filePath])

    expect(result.status).toBe(0)
    expect(decodedSourceFrom(result.stdout)).toBe(REFERENCE_SOURCE)
  })

  it('honors --base and strips trailing slashes', () => {
    const result = runEncode([
      '--text',
      REFERENCE_SOURCE,
      '--base',
      'https://plantview.example.com///',
    ])

    expect(result.stdout.trim()).toMatch(
      /^https:\/\/plantview\.example\.com\/view\/[0-9A-Za-z_-]+$/,
    )
  })

  it('uses PLANTVIEW_BASE_URL and lets --base override it', () => {
    const envResult = runEncode(['--text', REFERENCE_SOURCE], {
      env: { PLANTVIEW_BASE_URL: 'https://plantview.example.com/' },
    })
    expect(envResult.stdout.trim()).toMatch(
      /^https:\/\/plantview\.example\.com\/view\//,
    )

    const flagResult = runEncode(
      ['--text', REFERENCE_SOURCE, '--base', 'https://flag.example.com'],
      { env: { PLANTVIEW_BASE_URL: 'https://plantview.example.com' } },
    )
    expect(flagResult.stdout.trim()).toMatch(/^https:\/\/flag\.example\.com\/view\//)
  })

  it('fails on empty input', () => {
    const result = runEncode([])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('empty')
  })

  it('rejects --text combined with --file', () => {
    const result = runEncode(['--text', REFERENCE_SOURCE, '--file', 'diagram.puml'])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('only one of')
  })

  it('rejects unknown options', () => {
    const result = runEncode(['--nope'])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unknown option')
  })

  it('reports an unreadable --file', () => {
    const result = runEncode([
      '--file',
      path.join(tempDir, 'does-not-exist.puml'),
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unable to read --file')
  })

  it('prints usage with --help and exits 0', () => {
    const result = runEncode(['--help'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Usage:')
    expect(result.stdout).toContain('--code-only')
  })
})
