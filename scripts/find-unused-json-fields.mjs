#!/usr/bin/env node
/**
 * Finds JSON keys in public/data/*.json that are not referenced anywhere
 * in src/ source files (types, components, hooks, admin config, etc.).
 *
 * Skips structural / auto-generated keys (uuid, id) and generic primitives
 * inside arrays of strings (e.g. bildUrls values, ausschuesse values).
 *
 * Exit code 1 when unused fields are found (CI-friendly).
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { basename, join } from 'path'

const ROOT = new URL('..', import.meta.url).pathname

// ── helpers ────────────────────────────────────────────────────────────────

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...walk(full))
    else results.push(full)
  }
  return results
}

function readText(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

// Keys that are auto-generated / structural and should never be flagged
const IGNORED_KEYS = new Set(['id', 'uuid'])

// ── 1. Collect all unique keys from each JSON data file ────────────────────

/**
 * Recursively extracts all object keys from a JSON value.
 * Returns Set<string> of dot-free key names.
 * Arrays of primitives (strings, numbers) are skipped — only object keys matter.
 */
function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys)
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k)
      collectKeys(v, keys)
    }
  }
  return keys
}

const dataDir = join(ROOT, 'public/data')
const dataFiles = walk(dataDir).filter(f => f.endsWith('.json'))

/** Map<filename, { allKeys: Set<string>, path: string }> */
const fileKeys = new Map()

for (const filePath of dataFiles) {
  const text = readText(filePath)
  if (!text) continue
  try {
    const json = JSON.parse(text)
    const keys = collectKeys(json)
    // Remove ignored keys
    for (const k of IGNORED_KEYS) keys.delete(k)
    if (keys.size > 0) {
      fileKeys.set(basename(filePath), { allKeys: keys, path: filePath })
    }
  } catch {
    // skip malformed JSON
  }
}

// ── 2. Build a searchable corpus from all src/ files ───────────────────────

const srcDir = join(ROOT, 'src')
const srcExts = ['.ts', '.tsx', '.js', '.jsx', '.css']
const srcFiles = walk(srcDir).filter(f => srcExts.some(e => f.endsWith(e)))

const corpus = srcFiles.map(f => readText(f)).join('\n')

// ── 3. For each JSON file, check which keys appear nowhere in src/ ─────────

let totalUnused = 0
const report = []

for (const [filename, { allKeys }] of fileKeys) {
  const unused = []
  for (const key of allKeys) {
    // A key is considered "used" if it appears as an identifier-like token in
    // the source corpus. We use a word-boundary regex so that e.g. "bio" does
    // not match "biography" but does match property access, destructuring,
    // string literals, and FieldConfig `key` values.
    const pattern = new RegExp(`(?<=[^a-zA-Z0-9_])${escapeRegex(key)}(?=[^a-zA-Z0-9_])`)
    if (!pattern.test(corpus)) {
      unused.push(key)
    }
  }
  if (unused.length > 0) {
    unused.sort()
    report.push({ filename, unused })
    totalUnused += unused.length
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── 4. Output ──────────────────────────────────────────────────────────────

const totalKeys = [...fileKeys.values()].reduce((n, { allKeys }) => n + allKeys.size, 0)

console.log(`\nJSON data files:     ${fileKeys.size}`)
console.log(`Total keys:          ${totalKeys}`)
console.log(`Unused keys:         ${totalUnused}\n`)

if (totalUnused === 0) {
  console.log('No unused JSON fields found.')
} else {
  for (const { filename, unused } of report) {
    console.log(`--- ${filename} ---`)
    for (const key of unused) {
      console.log(`  ${key}`)
    }
    console.log()
  }
  process.exit(1)
}
