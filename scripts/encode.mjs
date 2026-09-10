#!/usr/bin/env node
/**
 * Encodes a PlantUML source into a PlantView viewer URL using the standard
 * PlantUML codec (deflate + custom base64 alphabet).
 *
 * Agents must never craft the encoded code by hand: use this script.
 *
 * Usage:
 *   printf '@startuml\nBob -> Alice: Hello!\n@enduml\n' | pnpm encode
 *   node scripts/encode.mjs --text '@startuml\nA -> B\n@enduml' --code-only
 *   node scripts/encode.mjs --file diagram.puml --base https://plantview.example.com
 */
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import plantumlEncoder from 'plantuml-encoder'

const DEFAULT_BASE_URL = 'http://localhost:5173'

const HELP = `PlantView — encode a PlantUML diagram into a viewer link.

Usage:
  pnpm encode [options]

Input (pick one):
  --text <source>   Encode the given PlantUML source
  --file <path>     Encode the PlantUML source read from a file
  stdin             Pipe the source: printf '…' | pnpm encode

Options:
  --base <url>      Viewer base URL (default: ${DEFAULT_BASE_URL})
                    Environment variable: PLANTVIEW_BASE_URL
  --code-only       Print the encoded code only (no URL)
  -h, --help        Show this help.

Examples:
  printf '@startuml\\nBob -> Alice: Hello!\\n@enduml\\n' | pnpm encode
  pnpm encode --file diagram.puml --code-only`

/** Prints a clear error on stderr and marks the process as failed. */
function fail(message) {
  console.error(`[plantview-encode] ${message}`)
  console.error("Run 'pnpm encode --help' for usage.")
  process.exitCode = 1
}

/** Reads the whole stdin stream as UTF-8 text. */
async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Resolves the PlantUML source from --text, --file or stdin. */
async function resolveSource(values) {
  if (values.text !== undefined && values.file !== undefined) {
    throw new Error('Use only one of --text and --file.')
  }

  if (values.text !== undefined) {
    return values.text
  }

  if (values.file !== undefined) {
    try {
      return await readFile(values.file, 'utf8')
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause)
      throw new Error(`Unable to read --file: ${reason}`)
    }
  }

  if (process.stdin.isTTY) {
    throw new Error(
      'No input provided. Pass --text, --file or pipe a PlantUML source on stdin.',
    )
  }

  return readStdin()
}

/** Normalizes the viewer base URL (no trailing slash, non-empty). */
function resolveBaseUrl(value) {
  const envValue = process.env.PLANTVIEW_BASE_URL?.trim()
  const raw = value ?? (envValue || DEFAULT_BASE_URL)
  const base = raw.trim().replace(/\/+$/, '')
  if (!base) {
    throw new Error('The viewer base URL is empty.')
  }
  return base
}

async function main() {
  let parsed
  try {
    parsed = parseArgs({
      options: {
        text: { type: 'string' },
        file: { type: 'string' },
        base: { type: 'string' },
        'code-only': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    })
  } catch (cause) {
    fail(cause instanceof Error ? cause.message : String(cause))
    return
  }

  const { values } = parsed
  if (values.help) {
    console.log(HELP)
    return
  }

  try {
    const source = await resolveSource(values)
    if (!source.trim()) {
      throw new Error('The PlantUML source is empty.')
    }

    const code = plantumlEncoder.encode(source)
    const output = values['code-only']
      ? code
      : `${resolveBaseUrl(values.base)}/view/${code}`
    console.log(output)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

await main()
