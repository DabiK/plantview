#!/usr/bin/env node
/**
 * Copies the PlantUML browser engine (`@plantuml/core`) and its optional
 * resources into `public/plantuml/`.
 *
 * These files must never go through Vite: `plantuml.js` is ~4 MB and is
 * loaded at runtime from the static assets. `public/plantuml/` is gitignored,
 * this script runs automatically on `postinstall`.
 */
import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = path.join(ROOT_DIR, 'node_modules', '@plantuml', 'core')
const TARGET_DIR = path.join(ROOT_DIR, 'public', 'plantuml')
const FILES = [
  'plantuml.js',
  'viz-global.js',
  'emoji.js',
  'openiconic.js',
  'themes.js',
]

async function main() {
  try {
    await stat(SOURCE_DIR)
  } catch {
    console.error(
      `[sync-plantuml-assets] ${SOURCE_DIR} not found. Run pnpm install first.`,
    )
    process.exitCode = 1
    return
  }

  await mkdir(TARGET_DIR, { recursive: true })
  for (const file of FILES) {
    await copyFile(path.join(SOURCE_DIR, file), path.join(TARGET_DIR, file))
  }

  console.log(
    `[sync-plantuml-assets] Copied ${FILES.length} files to public/plantuml/`,
  )
}

await main()
