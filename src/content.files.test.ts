/**
 * Tests for the actual content files against their schemas (spec 0003,
 * AC-2, AC-3, AC-4, AC-6).
 *
 * Reads the real .mdx and .md files from src/content/ and validates their
 * front matter and body structure against the zod schemas defined in
 * src/content.config.ts.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'astro/zod'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const servicesSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(160).optional(),
  kind: z.enum(['weekly', 'shabbaton']),
  day: z.string().optional(),
  time: z.string().optional(),
  order: z.number().int().nonnegative().default(0)
})

const resourcesSchema = z.object({
  title: z.string().min(1),
  file: z.string().min(1),
  category: z.string().optional(),
  description: z.string().max(160).optional(),
  order: z.number().int().nonnegative().default(0)
})

/** Turns one front matter scalar into the value its text stands for. */
function coerceScalar(raw: string): string | number | boolean {
  let value = raw
  // Strip matching single or double quotes.
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1)
  }
  if (/^\d+$/.test(value)) return parseInt(value, 10)
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value)
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}

/** Parse front matter from an .mdx/.md file (simple YAML subset). */
function parseFrontMatter(fileContent: string): Record<string, unknown> {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const lines = match[1].split('\n')
  const data: Record<string, unknown> = {}
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    data[key] = coerceScalar(line.slice(colonIdx + 1).trim())
  }
  return data
}

/** Extract the body of an .mdx file (everything after the front matter). */
function getBody(fileContent: string): string {
  const parts = fileContent.split('---\n')
  if (parts.length >= 3) {
    return parts.slice(2).join('---\n').trim()
  }
  return fileContent
}

const contentDir = join(process.cwd(), 'src/content')

describe('AC-2: Sample service files exist and validate against schema', () => {
  it('shabbat-morning-service.mdx is a valid weekly service', () => {
    const file = readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    const fm = parseFrontMatter(file)
    const result = servicesSchema.safeParse(fm)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('weekly')
      expect(result.data.title).toBe('Shabbat Morning Service')
    }
  })

  it('shabbaton-yom-teruah.mdx is a valid shabbaton', () => {
    const file = readFileSync(join(contentDir, 'services/shabbaton-yom-teruah.mdx'), 'utf-8')
    const fm = parseFrontMatter(file)
    const result = servicesSchema.safeParse(fm)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('shabbaton')
    }
  })
})

describe('AC-4: Videos appear in body in written order with text around them', () => {
  it('shabbat-morning-service.mdx has two Video calls with text before, between, and after', () => {
    const file = readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    const videoTagCount = (file.match(/<Video/g) || []).length
    expect(videoTagCount).toBe(2)
  })

  it('shabbaton-yom-teruah.mdx has one Video call', () => {
    const file = readFileSync(join(contentDir, 'services/shabbaton-yom-teruah.mdx'), 'utf-8')
    const videoTagCount = (file.match(/<Video/g) || []).length
    expect(videoTagCount).toBe(1)
  })

  it('the second Video in shabbat-morning-service.mdx has caption only, no poster', () => {
    const file = readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    const secondVideoBlock = file.split('<Video')[2]
    expect(secondVideoBlock).toContain('caption=')
    expect(secondVideoBlock).not.toContain('poster')
  })
})

describe('AC-3: Body headings start at ## level (front matter title is the only h1)', () => {
  it('shabbat-morning-service.mdx body starts with ## not #', () => {
    const file = readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    const body = getBody(file)
    const firstHeading = body.match(/^(#{1,6}\s)/m)?.[1]
    expect(firstHeading).toBe('## ')
  })

  it('shabbaton-yom-teruah.mdx body starts with ## not #', () => {
    const file = readFileSync(join(contentDir, 'services/shabbaton-yom-teruah.mdx'), 'utf-8')
    const body = getBody(file)
    const firstHeading = body.match(/^(#{1,6}\s)/m)?.[1]
    expect(firstHeading).toBe('## ')
  })
})

describe('AC-6: Resource links go through resource pages', () => {
  it('prayer-booklet.md validates against resources schema', () => {
    const file = readFileSync(join(contentDir, 'resources/prayer-booklet.md'), 'utf-8')
    const fm = parseFrontMatter(file)
    const result = resourcesSchema.safeParse(fm)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.file).toBe('/pdfs/prayer-booklet.pdf')
      expect(result.data.category).toBe('Prayer booklets')
    }
  })

  it('shabbat-morning-service.mdx links to the resource page, not the PDF path', () => {
    const file = readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    expect(file).toContain('](/resources/prayer-booklet)')
    expect(file).not.toContain('/pdfs/prayer-booklet.pdf')
  })
})
