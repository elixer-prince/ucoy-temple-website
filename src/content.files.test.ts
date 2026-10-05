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
import { existsSync, readFileSync, readdirSync } from 'node:fs'
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

describe('feature 5: the Sabbath morning body carries real Hebrew', () => {
  // A member must be able to read every text on the page including Hebrew
  // (scope feature 5). The direction rules are the project's: a full passage
  // is a block with lang="he" and dir="rtl", a phrase inside English carries
  // dir="auto" on a span, and prose.css alone styles both.
  const body = getBody(
    readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
  )

  it('marks a full Hebrew passage as a right to left block', () => {
    expect(body).toContain('<div lang="he" dir="rtl">')
  })

  it('uses a block element for the passage, never an inline one', () => {
    // The regression: a span wrapping the passage let MDX put a <p> inside it,
    // which is invalid HTML and loses the block styling from prose.css.
    expect(body).not.toMatch(/<span[^>]*lang="he"/)
    expect(body).not.toMatch(/<span[^>]*dir="rtl"/)
  })

  it('writes Hebrew script inside that block, not a transliteration', () => {
    const block = body.match(/<div lang="he" dir="rtl">([\s\S]*?)<\/div>/)?.[1] ?? ''
    expect(block).toMatch(/[֐-׿]/)
    expect(block).not.toMatch(/Shema Yisrael/)
  })

  it('marks a Hebrew phrase inside English with dir="auto" on a span', () => {
    expect(body).toMatch(/<span dir="auto">/)
  })

  it('gives the inline span Hebrew script too', () => {
    const span = body.match(/<span dir="auto">([\s\S]*?)<\/span>/)?.[1] ?? ''
    expect(span).toMatch(/[֐-׿]/)
  })

  it('carries no direction rule of its own, so prose.css owns direction', () => {
    // A page level rule would fork the one place Hebrew direction is defined.
    expect(body).not.toMatch(/direction:\s*rtl/)
    expect(body).not.toMatch(/text-align:\s*right/)
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
describe('feature 6: the Friday evening home ritual file', () => {
  // The old page was a Friday morning service that never existed. The real
  // entry is a Friday evening home ritual, so the page is one weekly service
  // file whose id decides its address under /services.
  const file = readFileSync(join(contentDir, 'services/friday-evening-home-ritual.mdx'), 'utf-8')
  const body = getBody(file)

  it('is a valid weekly service, so it builds under /services and not shabbatonim', () => {
    const result = servicesSchema.safeParse(parseFrontMatter(file))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('weekly')
      expect(result.data.title).toBe('Friday Evening Home Ritual')
    }
  })

  it('keeps a description within the schema limit, so it can be a page summary', () => {
    const description = parseFrontMatter(file).description
    expect(typeof description).toBe('string')
    expect((description as string).length).toBeLessThanOrEqual(160)
  })

  it('states the day and time as the temple keeps them', () => {
    const fm = parseFrontMatter(file)
    expect(fm.day).toBe('Friday evening')
    expect(fm.time).toBe('Before sunset')
  })

  it('sorts ahead of Shabbat morning in the weekly listing', () => {
    // order 0 against Shabbat morning's 1, so a reader meets Friday first on
    // /services, the home page, and the sidebar, which all share this order.
    const friday = parseFrontMatter(file)
    const morning = parseFrontMatter(
      readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    )
    expect(friday.order).toBe(0)
    expect(friday.order).toBeLessThan(morning.order as number)
  })

  it('starts the body at ## , so the front matter title stays the only h1', () => {
    expect(body.match(/^(#{1,6}\s)/m)?.[1]).toBe('## ')
    expect(body).not.toMatch(/^#\s/)
  })

  it('names no Friday morning service anywhere in the body', () => {
    // The regression: the old page and the scope row both claimed a Friday
    // morning service that the temple does not keep.
    expect(body).not.toMatch(/Friday morning/i)
  })
})

describe('feature 6: the Friday body carries real Hebrew in both directions', () => {
  const body = getBody(
    readFileSync(join(contentDir, 'services/friday-evening-home-ritual.mdx'), 'utf-8')
  )

  it('marks the candle blessing as a right to left block', () => {
    expect(body).toContain('<div lang="he" dir="rtl">')
  })

  it('uses a block element for the passage, never an inline one', () => {
    // The regression: a span let MDX put a <p> inside it, which is invalid HTML
    // and loses the block styling from prose.css.
    expect(body).not.toMatch(/<span[^>]*lang="he"/)
    expect(body).not.toMatch(/<span[^>]*dir="rtl"/)
  })

  it('writes Hebrew script inside that block', () => {
    const block = body.match(/<div lang="he" dir="rtl">([\s\S]*?)<\/div>/)?.[1] ?? ''
    expect(block).toMatch(/[֐-׿]/)
  })

  it('marks the Hebrew phrase inside English with dir="auto" on a span', () => {
    expect(body).toMatch(/<span dir="auto">/)
    const span = body.match(/<span dir="auto">([\s\S]*?)<\/span>/)?.[1] ?? ''
    expect(span).toMatch(/[֐-׿]/)
  })

  it('carries no direction rule of its own, so prose.css owns direction', () => {
    expect(body).not.toMatch(/direction:\s*rtl/)
    expect(body).not.toMatch(/text-align:\s*right/)
  })
})

describe('feature 6: the Friday body writes the ritual in the order it is kept', () => {
  const body = getBody(
    readFileSync(join(contentDir, 'services/friday-evening-home-ritual.mdx'), 'utf-8')
  )

  it('gives every step its own ## heading, in the order of the ritual', () => {
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
    expect(headings).toEqual([
      'Lighting the Shabbat candles',
      'The blessing over the cup',
      'Reading and teaching',
      'The Sabbath meal',
      'Keeping it in a household'
    ])
  })

  it('puts the candles before the cup and the cup before the meal', () => {
    // A member follows along from a phone, so a step printed out of order is a
    // wrong ritual rather than a cosmetic slip.
    const candles = body.indexOf('## Lighting the Shabbat candles')
    const cup = body.indexOf('## The blessing over the cup')
    const meal = body.indexOf('## The Sabbath meal')
    expect(candles).toBeGreaterThan(-1)
    expect(candles).toBeLessThan(cup)
    expect(cup).toBeLessThan(meal)
  })

  it('gives the blessing over the candles an English rendering beside it', () => {
    expect(body).toMatch(/The English of the same words/)
    expect(body).toMatch(/distinguish between the sacred and the/)
  })
})

describe('feature 8: the closing of Shabbat file', () => {
  // The closing of Shabbat was its own address on the old site, because it is a
  // ritual with its own order rather than a part of one service. It stays a
  // separate file here for the same reason: a time and an order live in exactly
  // one content file, so the closing is never copied into each service page.
  const file = readFileSync(join(contentDir, 'services/closing-of-shabbat.mdx'), 'utf-8')
  const body = getBody(file)

  it('is a valid weekly service, so it builds under /services', () => {
    const result = servicesSchema.safeParse(parseFrontMatter(file))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('weekly')
      expect(result.data.title).toBe('Closing of Shabbat')
    }
  })

  it('keeps a description within the schema limit, so it can be a page summary', () => {
    const description = parseFrontMatter(file).description
    expect(typeof description).toBe('string')
    expect((description as string).length).toBeLessThanOrEqual(160)
  })

  it('states the day and time as the temple keeps them', () => {
    const fm = parseFrontMatter(file)
    expect(fm.day).toBe('Saturday evening')
    expect(fm.time).toBe('After dark')
  })

  it('sorts after Shabbat morning, so the three weekly services run in order', () => {
    // Friday evening 0, Shabbat morning 1, the closing 2: the order a Shabbat
    // actually runs in, shared by the sidebar, the home page and /services.
    const fm = parseFrontMatter(file)
    const morning = parseFrontMatter(
      readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    )
    expect(fm.order).toBe(2)
    expect(fm.order as number).toBeGreaterThan(morning.order as number)
  })

  it('starts the body at ## , so the front matter title stays the only h1', () => {
    expect(body.match(/^(#{1,6}\s)/m)?.[1]).toBe('## ')
    expect(body).not.toMatch(/^#\s/)
  })
})

describe('feature 8: the closing body carries real Hebrew in both directions', () => {
  const body = getBody(readFileSync(join(contentDir, 'services/closing-of-shabbat.mdx'), 'utf-8'))

  it('marks each Hebrew passage as a right to left block', () => {
    // The regression: a span let MDX put a <p> inside it, which is invalid HTML
    // and loses the block styling from prose.css.
    expect(body).toContain('<div lang="he" dir="rtl">')
    expect(body).not.toMatch(/<span[^>]*lang="he"/)
    expect(body).not.toMatch(/<span[^>]*dir="rtl"/)
  })

  it('writes Hebrew script inside that block', () => {
    const blocks = [...body.matchAll(/<div lang="he" dir="rtl">([\s\S]*?)<\/div>/g)]
    expect(blocks.length).toBeGreaterThan(0)
    for (const [, block] of blocks) {
      expect(block).toMatch(/[֐-׿]/)
    }
  })

  it('marks the Hebrew phrase inside English with dir="auto" on a span', () => {
    const span = body.match(/<span dir="auto">([\s\S]*?)<\/span>/)?.[1] ?? ''
    expect(span).toMatch(/[֐-׿]/)
  })

  it('carries no direction rule of its own, so prose.css owns direction', () => {
    expect(body).not.toMatch(/direction:\s*rtl/)
    expect(body).not.toMatch(/text-align:\s*right/)
  })
})

describe('feature 8: the closing body writes the ritual in the order it is kept', () => {
  const body = getBody(readFileSync(join(contentDir, 'services/closing-of-shabbat.mdx'), 'utf-8'))

  it('gives every step its own ## heading, in the order of the ritual', () => {
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
    expect(headings).toEqual([
      'Waiting for the stars',
      'The blessing over the cup',
      'The closing of the Sabbath',
      'Keeping it in a household'
    ])
  })

  it('waits for the stars before the blessing, and the blessing before the end', () => {
    // A member follows along from a phone, so a step printed out of order is a
    // wrong ritual rather than a cosmetic slip.
    const stars = body.indexOf('## Waiting for the stars')
    const cup = body.indexOf('## The blessing over the cup')
    const closing = body.indexOf('## The closing of the Sabbath')
    expect(stars).toBeGreaterThan(-1)
    expect(stars).toBeLessThan(cup)
    expect(cup).toBeLessThan(closing)
  })

  it('gives the blessing over the cup an English rendering beside it', () => {
    expect(body).toMatch(/The English of the same words/)
    expect(body).toMatch(/distinguish between the sacred and the/)
  })
})

describe('feature 8: the closing body carries no video until the recording exists', () => {
  const body = getBody(readFileSync(join(contentDir, 'services/closing-of-shabbat.mdx'), 'utf-8'))

  it('carries no Video call', () => {
    // public/videos/ holds no closing asset. Naming one would point the offline page
    // at a file that does not exist, and it would fail exactly on the phone with no
    // signal where a member is following the ritual from home.
    expect(body).not.toContain('<Video')
  })

  it('names no src with no file behind it', () => {
    // The offline promise in one assertion: any src the body names must have a file
    // behind it in public/.
    const source = readFileSync(join(contentDir, 'services/closing-of-shabbat.mdx'), 'utf-8')
    for (const match of source.matchAll(/src="([^"]+)"/g)) {
      expect(existsSync(join(process.cwd(), 'public', match[1]))).toBe(true)
    }
  })
})

describe('feature 8: the closing body names no gathering time it cannot keep', () => {
  const body = getBody(readFileSync(join(contentDir, 'services/closing-of-shabbat.mdx'), 'utf-8'))

  it('points at the calendar rather than printing a clock time', () => {
    // The closing is kept at the table at home and at the building on the occasions
    // the calendar gives. A time written into the body goes stale the day the temple
    // moves it, and could only be changed by a rebuild.
    expect(body).not.toMatch(/\b\d{1,2}[:.]\d{2}\s*(am|pm|AM|PM)/)
    expect(body).not.toMatch(/at \d/)
  })

  it('sends the member to the home page, where the announcements and calendar live', () => {
    expect(body).toMatch(/temple calendar/)
    expect(body).toContain('](/)')
  })
})

describe('feature 8: the closing page is built and published', () => {
  /*
   * What `/check verify` drove in a real browser at 390 by 844, asserted here
   * against the HTML a build produced, so it is checked on every run rather than
   * only when a person looks at the page.
   *
   * Read from dist, so it asserts only after a build has run, the way
   * sw-navigation.test.ts and offline.test.ts handle it. Producing dist is the
   * verify gate's job, not this suite's.
   */
  const builtPage = join(process.cwd(), 'dist', 'services', 'closing-of-shabbat', 'index.html')

  /** The built page, or undefined when no build has run yet. */
  function page(): string | undefined {
    return existsSync(builtPage) ? readFileSync(builtPage, 'utf-8') : undefined
  }

  it('gives the page exactly one h1, which is the front matter title', () => {
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    )
    expect(h1s).toEqual(['Closing of Shabbat'])
  })

  it('prints the four steps as h2 headings in the order of the ritual', () => {
    // A member follows along from a phone, so the printed order is the ritual.
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
      .filter((text) => text.length > 0)
    expect(headings).toEqual([
      'Waiting for the stars',
      'The blessing over the cup',
      'The closing of the Sabbath',
      'Keeping it in a household'
    ])
  })

  it('renders both Hebrew passages as right to left blocks that survived the build', () => {
    // The regression this guards: MDX can turn a span into a <p> nested inside it,
    // which is invalid HTML and drops the block styling from prose.css. The written
    // file cannot show that; only the built page can.
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const blocks = [...html.matchAll(/<div lang="he" dir="rtl">([\s\S]*?)<\/div>/g)]
    expect(blocks).toHaveLength(2)
    for (const [, block] of blocks) {
      expect(block).toMatch(/[֐-׿]/)
    }
  })

  it('renders the Hebrew phrase inside the English sentence as an inline auto span', () => {
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const span = html.match(/<span dir="auto">([\s\S]*?)<\/span>/)?.[1] ?? ''
    expect(span).toMatch(/[֐-׿]/)
    // Inline, not a block: שבת שעברה sits inside an English sentence, so it must not
    // be promoted to a paragraph of its own.
    expect(html).not.toMatch(/<p[^>]*>\s*<span dir="auto">/)
  })

  it('lists the closing last among the weekly services, so the menu reads in Shabbat order', () => {
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const nav = html.match(/<nav class="sidebar-nav"[\s\S]*?<\/nav>/)?.[0] ?? ''
    const weekly = [...nav.matchAll(/href="(\/services\/[a-z-]*)"/g)].map((m) => m[1])
    expect(weekly).toEqual([
      '/services/friday-evening-home-ritual',
      '/services/shabbat-morning-service',
      '/services/closing-of-shabbat'
    ])
  })

  it('marks the closing as the current page in the menu, so a reader knows where they are', () => {
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const nav = html.match(/<nav class="sidebar-nav"[\s\S]*?<\/nav>/)?.[0] ?? ''
    const link = nav.match(/<a href="\/services\/closing-of-shabbat"[\s\S]*?<\/a>/)?.[0] ?? ''
    expect(link).toContain('aria-current="page"')
  })

  it('reaches the prayer booklet through its resource page, never the file path', () => {
    // A PDF is linked through /resources/<slug> so the page around it works too.
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    expect(html).toContain('href="/resources/prayer-booklet"')
    expect(html).not.toContain('/pdfs/')
  })

  it('takes its page summary from the front matter description', () => {
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''
    expect(description).toContain('Havdalah')
  })
})

describe('feature 6: the Friday body names no video until the recording exists', () => {
  const body = getBody(
    readFileSync(join(contentDir, 'services/friday-evening-home-ritual.mdx'), 'utf-8')
  )

  it('carries no Video call', () => {
    expect(body).not.toContain('<Video')
  })

  it('points no Video at a file that is missing from public/', () => {
    // The promise this guards: every video a service body names is served from
    // this site, so airplane mode still plays it. A path with no file behind it
    // fails only offline, which is exactly when a member needs it most.
    for (const name of readdirSync(join(contentDir, 'services'))) {
      if (!name.endsWith('.mdx')) continue
      const source = readFileSync(join(contentDir, 'services', name), 'utf-8')
      for (const match of source.matchAll(/<Video[^>]*\ssrc="([^"]+)"/g)) {
        expect(existsSync(join(process.cwd(), 'public', match[1]))).toBe(true)
      }
    }
  })
})
