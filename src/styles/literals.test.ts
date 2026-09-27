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
          // The colour function is matched with the optional alpha suffix, so
          // rgba( and hsla( are caught too. A bare rgb( match misses them,
          // which let a real literal through this scan once already.
          if (/\brgba?\(|\bhsla?\(/.test(clean)) failures.push(`${file}: ${line}`)
          if (/#[0-9a-fA-F]{3,8}\b/.test(clean)) failures.push(`${file}: ${line}`)
          if (/(?<!-)\b\d+(\.\d+)?(px|rem)\b/.test(clean)) failures.push(`${file}: ${line}`)
        }
      }
    }
    expect(failures.join('\n')).toBe('')
  })

  // The scan above reads real files, so a hole in it stays invisible until a
  // real literal walks through. These cases pin the patterns to the shapes they
  // are meant to catch, including the alpha forms the first version missed.
  const colourFunctions = /\brgba?\(|\bhsla?\(/
  it('the colour function pattern catches every alpha form', () => {
    for (const css of [
      'color: rgba(0, 0, 0, 0.5);',
      'color: rgba(0 0 0 / 50%);',
      'background: rgb(255 255 255);',
      'color: hsla(0, 0%, 0%, 0.5);',
      'color: hsl(0 0% 0%);'
    ]) {
      expect(colourFunctions.test(css)).toBe(true)
    }
  })

  it('the colour function pattern leaves token values alone', () => {
    for (const css of [
      'background: var(--scrim);',
      'background: var(--color-canvas);',
      'color: currentColor;',
      'background: var(--color-sidebar-bg);'
    ]) {
      expect(colourFunctions.test(css)).toBe(false)
    }
  })
})
