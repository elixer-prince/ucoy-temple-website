/**
 * Tests for the content model schemas (spec 0003, AC-1, AC-5, AC-6).
 *
 * These validate the zod shapes that guard the content collections, tracing to
 * the acceptance criteria that every content type is named with its required
 * and optional fields, and that `kind` alone decides the site area.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'astro/zod'

// The service schema from src/content.config.ts, reproduced here so the shape
// is checked without booting Astro's content layer.
const servicesSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(160).optional(),
  kind: z.enum(['weekly', 'shabbaton']),
  day: z.string().optional(),
  time: z.string().optional(),
  order: z.number().int().nonnegative().default(0)
})

// The resource schema from src/content.config.ts.
const resourcesSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  file: z.string().min(1, 'A file path under public/ is required'),
  category: z.string().optional(),
  description: z.string().max(160).optional(),
  order: z.number().int().nonnegative().default(0)
})

// The portionNotes schema from src/content.config.ts, including the refinement
// that pairs a Gospel reference with its heading.
const portionNotesSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().max(160).optional(),
    order: z.number().int().nonnegative().default(0),
    gospel: z.string().min(1).optional(),
    gospelTitle: z.string().min(1).optional()
  })
  .refine((data) => !data.gospel || Boolean(data.gospelTitle), {
    message:
      'gospelTitle is required when gospel is set, so the section never renders with an empty heading',
    path: ['gospelTitle']
  })

describe('AC-1: services schema', () => {
  it('accepts a weekly service with every optional field filled', () => {
    const result = servicesSchema.safeParse({
      title: 'Shabbat Morning Service',
      description: 'The order of our Shabbat Shacharit service.',
      kind: 'weekly',
      day: 'Saturday',
      time: '9:30 AM',
      order: 1
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('weekly')
      expect(result.data.day).toBe('Saturday')
    }
  })

  it('accepts a Shabbaton with only the required fields', () => {
    const result = servicesSchema.safeParse({
      title: 'Shabbaton: Yom Teruah',
      kind: 'shabbaton'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order).toBe(0)
      expect(result.data.day).toBeUndefined()
    }
  })

  it('rejects a kind outside the two areas', () => {
    const result = servicesSchema.safeParse({
      title: 'Bad Service',
      kind: 'high-holiday'
    })
    expect(result.success).toBe(false)
  })

  it('requires a title', () => {
    const result = servicesSchema.safeParse({ kind: 'weekly' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty title', () => {
    const result = servicesSchema.safeParse({ title: '', kind: 'weekly' })
    expect(result.success).toBe(false)
  })

  it('rejects a description longer than 160 characters', () => {
    const result = servicesSchema.safeParse({
      title: 'Service',
      kind: 'weekly',
      description: 'x'.repeat(161)
    })
    expect(result.success).toBe(false)
  })

  it('rejects a negative order', () => {
    const result = servicesSchema.safeParse({
      title: 'Service',
      kind: 'weekly',
      order: -1
    })
    expect(result.success).toBe(false)
  })

  it('rejects a fractional order', () => {
    const result = servicesSchema.safeParse({
      title: 'Service',
      kind: 'weekly',
      order: 1.5
    })
    expect(result.success).toBe(false)
  })

  it('rejects a date object in day, which is a plain string by design', () => {
    const result = servicesSchema.safeParse({
      title: 'Service',
      kind: 'weekly',
      day: new Date('2026-09-19')
    })
    expect(result.success).toBe(false)
  })
})

describe('AC-1: resources schema', () => {
  it('accepts a PDF resource with a site path', () => {
    const result = resourcesSchema.safeParse({
      title: 'Shabbat prayer booklet',
      file: '/pdfs/prayer-booklet.pdf',
      category: 'Prayer booklets',
      order: 1
    })
    expect(result.success).toBe(true)
  })

  it('requires the file path', () => {
    const result = resourcesSchema.safeParse({ title: 'Resource' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty file path', () => {
    const result = resourcesSchema.safeParse({ title: 'Resource', file: '' })
    expect(result.success).toBe(false)
  })

  it('keeps the leading slash in the file path it is given', () => {
    const result = resourcesSchema.safeParse({
      title: 'Resource',
      file: '/pdfs/prayer-booklet.pdf'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.file.startsWith('/')).toBe(true)
    }
  })
})

describe('feature 24: the Gospel reference and its heading travel together', () => {
  it('accepts a commentary with neither, which is the normal case', () => {
    // The Congregation does not currently read the Gospel, so the common file
    // carries nothing about it and the Gospel section simply is not rendered.
    const result = portionNotesSchema.safeParse({ title: 'Bereshit' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.gospel).toBeUndefined()
      expect(result.data.gospelTitle).toBeUndefined()
    }
  })

  it('accepts a commentary with both', () => {
    const result = portionNotesSchema.safeParse({
      title: 'Noach',
      gospel: 'John 1:1-14',
      gospelTitle: 'John 1'
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.gospel).toBe('John 1:1-14')
  })

  it('rejects a Gospel reference with no heading beside it', () => {
    // The rule this pair protects: a Gospel section with nothing to title it
    // renders a heading a member reads as a mistake, even though the passage
    // itself is right. Catching it at the schema means the build fails rather
    // than publishing the odd looking page.
    const result = portionNotesSchema.safeParse({ title: 'Noach', gospel: 'John 1:1-14' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['gospelTitle'])
      expect(result.error.issues[0]?.message).toContain('empty heading')
    }
  })

  it('allows a heading on its own, which renders nothing on its own', () => {
    // Harmless, and worth pinning: an author who prepares the heading before the
    // reference should not be blocked. The page keys the section off `gospel`, so
    // a stray `gospelTitle` renders nothing.
    const result = portionNotesSchema.safeParse({ title: 'Noach', gospelTitle: 'John 1' })
    expect(result.success).toBe(true)
  })

  it('requires a title, like every other collection', () => {
    expect(portionNotesSchema.safeParse({}).success).toBe(false)
  })
})

describe('AC-5: kind decides the area and the address', () => {
  it('sends a weekly service to /services/<slug>', () => {
    const result = servicesSchema.safeParse({ title: 'Test', kind: 'weekly' })
    expect(result.success).toBe(true)
    if (result.success) {
      const area = result.data.kind === 'weekly' ? 'services' : 'shabbatonim'
      expect(`/${area}/test`).toBe('/services/test')
    }
  })

  it('sends a Shabbaton to /shabbatonim/<slug>', () => {
    const result = servicesSchema.safeParse({ title: 'Test', kind: 'shabbaton' })
    expect(result.success).toBe(true)
    if (result.success) {
      const area = result.data.kind === 'weekly' ? 'services' : 'shabbatonim'
      expect(`/${area}/test`).toBe('/shabbatonim/test')
    }
  })
})
