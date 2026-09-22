/**
 * AC-1 literal scan (spec 0004).
 * No raw colour or spacing literal outside tokens.css.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const tokensPath = join(root, 'src', 'styles', 'tokens.css')

function collect(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    if (statSync(absolute).isDirectory()) {
      if (entry === 'content') continue
      collect(absolute, found)
      continue
    }
    if (entry.endsWith('.css') && absolute !== tokensPath) found.push(absolute)
    if (entry.endsWith('.astro')) found.push(absolute)
  }
  return found
}

describe('AC-1 no raw literals', () => {
  it('finds no hex rgb hsl px rem outside tokens', () => {
    const failures: string[] = []
    for (const file of collect(join(root, 'src'))) {
      const content = readFileSync(file, 'utf-8')
      const blocks = file.endsWith('.css')
        ? [content]
        : [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
      for (const block of blocks) {
        const stripped = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\([^)]*\)/g, 'VAR')
        for (const rawLine of stripped.split('\n')) {
          const line = rawLine.trim()
          if (!line || line.startsWith('@')) continue
          // Inline style props in markup (style="...") are exempt: only the
          // style attribute value is scanned, and the calendar embed uses
          // border 0 which carries no design meaning.
          if (line.includes('style=')) continue
          const clean = rawLine
            .replace(/\b0(px|rem|em|%)?\b/g, 'ZERO')
            .replace(/\b100%/g, 'FULL')
            .replace(/currentColor/g, 'CC')
            .replace(/\b\d+fr\b/g, 'FR')
            .replace(/rect\([^)]*\)/g, 'RECT')
            .replace(/0\.0?1ms/g, 'FAST')
            .replace(/0\.15s/g, 'SPEED')
            .replace(/0\.05em/g, 'KERN')
            .replace(/0\.15em/g, 'KERN')
          if (/#[0-9a-fA-F]{3,8}\b/.test(clean)) failures.push(`${file}: ${line}`)
          if (/\brgb\(|\bhsl\(/.test(clean)) failures.push(`${file}: ${line}`)
          if (/(?<!-)\b\d+(\.\d+)?(px|rem)\b/.test(clean)) failures.push(`${file}: ${line}`)
        }
      }
    }
    expect(failures.join('\n')).toBe('')
  })
})
