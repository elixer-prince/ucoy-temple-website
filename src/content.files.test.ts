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

  it('shabbaton-yom-teruah.mdx carries the same two Video calls as the morning service', () => {
    // The old site's Yom Teruah page was the Shabbat morning order with a Teruah
    // opening in front of it, and the sweep carried the order across as it stood.
    // The count therefore matches the morning service rather than being one.
    const file = readFileSync(join(contentDir, 'services/shabbaton-yom-teruah.mdx'), 'utf-8')
    const videoTagCount = (file.match(/<Video/g) || []).length
    expect(videoTagCount).toBe(2)
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
    // The headings are the temple's own order, carried across in the content
    // sweep (scope feature 9). The page has to print the ritual in the order it
    // is kept, so a member can follow along from a phone.
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
    expect(headings).toEqual([
      'Lighting the Shabbat candles',
      'The Shema',
      'Shabbat Rest',
      'Song',
      'Berakah Tehillim (Blessing Psalm)',
      'The Reading of Tehillim (Psalm 119:145-176)',
      'The Berakah (Blessing)',
      'Kiddush',
      'Song',
      'Grace After Meal',
      'Reading and study of the Torah',
      'Yahweh’s Berakah',
      'Keeping it in a household'
    ])
  })

  it('puts the candles before the Shema, and the Kiddush before the grace', () => {
    // A member follows along from a phone, so a step printed out of order is a
    // wrong ritual rather than a cosmetic slip.
    const candles = body.indexOf('## Lighting the Shabbat candles')
    const shema = body.indexOf('## The Shema')
    const kiddush = body.indexOf('## Kiddush')
    const grace = body.indexOf('## Grace After Meal')
    expect(candles).toBeGreaterThan(-1)
    expect(candles).toBeLessThan(shema)
    expect(shema).toBeLessThan(kiddush)
    expect(kiddush).toBeLessThan(grace)
  })

  it('carries the whole of Psalm 119:145-176, which the old page printed in full', () => {
    // The sweep decision for this feature: carry the text verbatim, so nothing
    // the temple published is lost. Psalm 119 was the longest passage on the old
    // Friday page, so its two ends guard the middle.
    expect(body).toMatch(/^145\./m)
    expect(body).toMatch(/^176\./m)
  })

  it('gives the blessing over the candles an English rendering beside it', () => {
    expect(body).toMatch(/The English of the same words/)
    expect(body).toMatch(/distinguish between the sacred and the/)
  })

  it('names the temple external Torah reading link the old page carried', () => {
    // The old page pointed readers at chabad.org for the weekly portion. The new
    // site computes the portion itself (scope feature 7), but the link is kept
    // so nothing published is lost.
    expect(body).toMatch(/chabad\.org/)
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

  it('sorts after Shabbat morning and Shabbat afternoon, so the weekly services run in order', () => {
    // Friday evening 0, Shabbat morning 1, Shabbat afternoon 2, the closing 3: the
    // order a Shabbat actually runs in, shared by the sidebar, the home page and
    // /services. The Saturday afternoon service is scope feature 9.
    const fm = parseFrontMatter(file)
    const morning = parseFrontMatter(
      readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
    )
    const afternoon = parseFrontMatter(
      readFileSync(join(contentDir, 'services/saturday-afternoon-service.mdx'), 'utf-8')
    )
    expect(fm.order).toBe(3)
    expect(fm.order as number).toBeGreaterThan(morning.order as number)
    expect(fm.order as number).toBeGreaterThan(afternoon.order as number)
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
    // The temple's own order, carried across in the content sweep (scope
    // feature 9). A member follows along from a phone, so the printed order is
    // the ritual.
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
    expect(headings).toEqual([
      'The Shema',
      'Closing Prayer',
      'Tehillim (Psalm: 121)',
      'Havdalah Ritual',
      'Yahweh’s Berakah',
      'Keeping it in a household'
    ])
  })

  it('waits for the stars in the Havdalah, after the psalm and before the blessing', () => {
    // The regression this guards: a step printed out of order is a wrong ritual
    // rather than a cosmetic slip. The stars paragraph sits inside the Havdalah
    // section, which is where the old page kept it.
    const psalm = body.indexOf('## Tehillim (Psalm: 121)')
    const havdalah = body.indexOf('## Havdalah Ritual')
    const stars = body.indexOf('once three stars can')
    const closing = body.indexOf('## Yahweh’s Berakah')
    expect(psalm).toBeGreaterThan(-1)
    expect(psalm).toBeLessThan(havdalah)
    expect(havdalah).toBeLessThan(stars)
    expect(stars).toBeLessThan(closing)
  })

  it('carries Psalm 121 in full, which the old page printed in full', () => {
    // The old page printed Psalm 121 as a list of verses, so the file keeps that
    // shape, now numbered rather than bulleted: a psalm is verses, and a member
    // following along needs to find the one they are on.
    expect(body).toContain('## Tehillim (Psalm: 121)')
    expect(body).toMatch(/^1\. I lift my eyes to the hills;/m)
    expect(body).toContain('guards my going out and my coming in now and forever')
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

  it('prints the steps as h2 headings in the order of the ritual', () => {
    // A member follows along from a phone, so the printed order is the ritual.
    // The headings are the temple's own, carried across in the content sweep
    // (scope feature 9).
    const html = page()
    if (!html) {
      expect(true).toBe(true)
      return
    }

    const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
      .filter((text) => text.length > 0)
    expect(headings).toEqual([
      'The Shema',
      'Closing Prayer',
      'Tehillim (Psalm: 121)',
      'Havdalah Ritual',
      'Yahweh’s Berakah',
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
      '/services/saturday-afternoon-service',
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

describe('feature 9: the Saturday afternoon service the old site published', () => {
  // The sweep's one real gap: the old site listed a Saturday afternoon service and
  // the new build had no page for it. One content file publishes it, because the
  // sidebar, the home page and /services all build from the collection.
  const file = readFileSync(join(contentDir, 'services/saturday-afternoon-service.mdx'), 'utf-8')
  const body = getBody(file)

  it('is a valid weekly service, so it builds under /services', () => {
    const result = servicesSchema.safeParse(parseFrontMatter(file))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('weekly')
      expect(result.data.title).toBe('Saturday Afternoon Service')
    }
  })

  it('keeps a description within the schema limit, so it can be a page summary', () => {
    const description = parseFrontMatter(file).description
    expect(typeof description).toBe('string')
    expect((description as string).length).toBeLessThanOrEqual(160)
  })

  it('sorts between the morning service and the closing, as a Shabbat runs', () => {
    const orderOf = (slug: string): number =>
      parseFrontMatter(readFileSync(join(contentDir, `services/${slug}.mdx`), 'utf-8'))
        .order as number
    expect(orderOf('saturday-afternoon-service')).toBeGreaterThan(
      orderOf('shabbat-morning-service')
    )
    expect(orderOf('saturday-afternoon-service')).toBeLessThan(orderOf('closing-of-shabbat'))
  })

  it('starts the body at ## , so the front matter title stays the only h1', () => {
    expect(body.match(/^(#{1,6}\s)/m)?.[1]).toBe('## ')
    expect(body).not.toMatch(/^#\s/)
  })

  it('carries the old page order in full, from the Torah reading to the Haftarah', () => {
    // The old Saturday afternoon page was short but real: a Torah reading with its
    // blessings, then the Haftarah with the blessings around it.
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
    expect(headings).toEqual([
      'Reading and Study of the Torah',
      'Torah Berakah (Before)',
      'Torah Berakah (After)',
      'Haftarah Berakah (Before)',
      'Haftarah Berakah (After)',
      'The Shabbat Afternoon Abodah'
    ])
  })

  it('carries no Video call, because no recording of it exists yet', () => {
    expect(body).not.toContain('<Video')
  })

  it('reaches the prayer booklet through its resource page, never the file path', () => {
    expect(file).toContain('](/resources/prayer-booklet)')
    expect(file).not.toContain('/pdfs/prayer-booklet.pdf')
  })
})

describe('feature 9: the sweep carried the old site text into the service bodies', () => {
  // The sweep's decision for this feature: carry the text verbatim, so nothing the
  // temple published is lost. These pin the passages that were the longest on the
  // old pages, so a later edit that quietly trims them fails the suite.
  const morning = getBody(
    readFileSync(join(contentDir, 'services/shabbat-morning-service.mdx'), 'utf-8')
  )

  it('carries all seven of the old page Tehillim, 90 through 96', () => {
    for (let psalm = 90; psalm <= 96; psalm++) {
      expect(morning).toContain(`### Tehillim ${psalm}`)
    }
  })

  it('carries the Ten Words, the longest reading on the old morning page', () => {
    expect(morning).toContain('## The Ten Words')
    expect(morning).toContain('You do not covet your neighbour’s house')
  })

  it('carries the old Table of Contents as a list a member can read at a glance', () => {
    // The old pages opened each order with a table of contents. Keeping it means a
    // member can see the shape of the service before scrolling. The heading above
    // the list is deliberately plain: an earlier version said "as it was kept
    // before", which is a note about the migration from the old site, not something
    // the temple would say to a member reading its own service order.
    expect(morning).toContain('In this order:')
    expect(morning).not.toMatch(/as it was kept before/i)
    // The entry is a link now, so the list item carries the old text inside an anchor.
    expect(morning).toMatch(
      /^- \[The National Anthem Of Yah'maica \(Jamaica\)\]\(#the-national-anthem-of-yahmaica\)$/m
    )
  })

  it('numbers the scripture verses, and leaves song lyrics as bullets', () => {
    // A psalm is a numbered list of verses, so a member can find the one they are
    // on. A song is a list of lines to sing in order, where a number would be
    // meaningless, so those stay bullets.
    expect(morning).toMatch(/^1\. Yahweh You are my shepherd; I shall not want\.$/m)
    expect(morning).toMatch(/^1\. <span dir="auto">יהוה<\/span>, You have been our refuge/m)
    expect(morning).toMatch(/^\d+\. “You do not murder\.”$/m)
    // Song lyrics keep their bullets.
    expect(morning).toMatch(/^- Shabbat Shalom\.$/m)
    expect(morning).toMatch(/^- Maker of Heaven and Earth, O\. \(Three Times\)$/m)
  })

  it('links every table of contents entry to its own section on the page', () => {
    // An entry that does not link is just a list of words. Each entry must point at
    // an anchor the page really has, checked against the built HTML, because the
    // anchor only exists after the build slugifies the heading.
    const dirs = [
      'services/shabbat-morning-service',
      'shabbatonim/shabbaton-yom-teruah',
      'services/closing-of-shabbat',
      'services/friday-evening-home-ritual',
      'services/saturday-afternoon-service'
    ]

    let checked = 0
    for (const dir of dirs) {
      const built = join(process.cwd(), 'dist', dir, 'index.html')
      if (!existsSync(built)) continue
      const html = readFileSync(built, 'utf-8')
      const anchors = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))
      const links = [...html.matchAll(/<li><a href="#([^"]+)">/g)].map((m) => m[1])
      expect(links.length).toBeGreaterThan(0)
      for (const href of links) {
        expect(anchors.has(href)).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('reads as the temple speaking, with no migration or placeholder wording', () => {
    // The scaffolding sentences the sweep carried in ("so you can follow along from
    // a phone", "as it was kept before") were notes about moving the text across,
    // not the temple's own words. A member should not read them.
    for (const name of readdirSync(join(contentDir, 'services'))) {
      if (!name.endsWith('.mdx')) continue
      const body = getBody(readFileSync(join(contentDir, 'services', name), 'utf-8'))
      expect(body).not.toMatch(/follow along from a phone/i)
      expect(body).not.toMatch(/as it was kept before/i)
      expect(body).not.toMatch(/the order below is the order it is kept in/i)
      expect(body).not.toMatch(/placeholder|lorem ipsum/i)
    }
  })

  it('embeds no third party video anywhere, so the offline promise holds', () => {
    // The five YouTube embeds on the old site were deliberately not carried: media
    // is served from this site and never from a third party. A stray embed would
    // need a connection, which is exactly when the page must not.
    for (const name of readdirSync(join(contentDir, 'services'))) {
      if (!name.endsWith('.mdx')) continue
      const source = readFileSync(join(contentDir, 'services', name), 'utf-8')
      expect(source).not.toMatch(/youtube\.com|youtu\.be|<iframe/i)
    }
  })

  it('keeps the Teruah order in step with the morning order it was carried from', () => {
    // The old site's Yom Teruah page was the Shabbat morning order with a Teruah
    // opening in front of it, so the sweep carried the same text into both files.
    // That is two copies, which is the thing this project warns against, so it
    // needs a guard: an edit to one order that does not reach the other would show
    // a member a different service depending on which day they opened.
    const teruah = getBody(
      readFileSync(join(contentDir, 'services/shabbaton-yom-teruah.mdx'), 'utf-8')
    )

    // Both files run the same order, so their section headings must match exactly.
    const headingsOf = (body: string): string[] =>
      [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].trim())
    expect(headingsOf(teruah)).toEqual(headingsOf(morning))

    // And the long readings behind those headings must match, verse for verse.
    const tehillim90 = (body: string): string =>
      body.slice(body.indexOf('### Tehillim 90'), body.indexOf('## Tehillim Berakah'))
    expect(tehillim90(teruah)).toBe(tehillim90(morning))
  })
})

describe('feature 9: the old site addresses redirect to the pages that replaced them', () => {
  // A member who kept the old link, or a search result still holding it, must land
  // on the page that now carries the material. Cloudflare Pages serves
  // public/_redirects, so the map lives in the file it serves from.
  const redirects = readFileSync(join(process.cwd(), 'public', '_redirects'), 'utf-8')

  /** Every redirect rule, as [old address, new address, status]. */
  const rules = redirects
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))

  it('parses every line as old address, new address, and a status', () => {
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule).toHaveLength(3)
      expect(rule[0]).toMatch(/^\//)
      expect(rule[1]).toMatch(/^\//)
      expect(rule[2]).toMatch(/^30[12]$/)
    }
  })

  it('sends every old address the sweep found to its new page', () => {
    // The ten pages of the old site, minus the three that carry no content and so
    // have nothing to redirect to yet. Yom Kippur, Shavuot and Important Dates join
    // this file when their features land, and never before: a redirect to a page
    // that does not exist would turn a working old link into a 404.
    const pairs = new Map(rules.map((rule) => [rule[0], rule[1]]))
    expect(pairs.get('/home')).toBe('/')
    expect(pairs.get('/weekly-shabbat-services/friday-evening-home-ritual')).toBe(
      '/services/friday-evening-home-ritual'
    )
    expect(pairs.get('/weekly-shabbat-services/saturday-morning-service')).toBe(
      '/services/shabbat-morning-service'
    )
    expect(pairs.get('/weekly-shabbat-services/saturday-afternoon-service')).toBe(
      '/services/saturday-afternoon-service'
    )
    expect(pairs.get('/weekly-shabbat-services/closing-of-the-shabbat')).toBe(
      '/services/closing-of-shabbat'
    )
    expect(pairs.get('/high-shabbatot/yom-teruah')).toBe('/shabbatonim/shabbaton-yom-teruah')
    expect(pairs.get('/this-weeks-torah-portion')).toBe('/torah-portion')
  })

  it('redirects to no address that has no page behind it', () => {
    // The promise the map makes: an old link still works. A rule pointing at a page
    // that was never built replaces a working address with a 404, which is worse
    // than leaving the old address alone.
    const known = [
      '/',
      '/torah-portion',
      '/contact',
      ...readdirSync(join(contentDir, 'pages')).map((name) => `/${name.replace(/\.mdx?$/, '')}`),
      ...readdirSync(join(contentDir, 'services')).map((name) =>
        name.startsWith('shabbaton-')
          ? `/shabbatonim/${name.replace(/\.mdx$/, '')}`
          : `/services/${name.replace(/\.mdx$/, '')}`
      ),
      ...readdirSync(join(contentDir, 'resources')).map(
        (name) => `/resources/${name.replace(/\.mdx?$/, '')}`
      )
    ]

    for (const rule of rules) {
      expect(known).toContain(rule[1])
    }
  })

  it('names no old address twice, because the first one silently wins', () => {
    const sources = rules.map((rule) => rule[0])
    expect(new Set(sources).size).toBe(sources.length)
  })
})
