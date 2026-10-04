/**
 * Tests for the wiring around the Torah portion page (scope feature 7).
 *
 * The reading itself is computed and is guarded in `src/lib/torah-portion.test.ts`.
 * This suite covers what had to hold true around it: the page reads its reading
 * from the calendar instead of a content file, the sidebar entry stopped
 * reading as planned, and the page owns no direction rule of its own.
 *
 * These read real source files, the same way the other suites here do. An Astro
 * component cannot be rendered without booting the whole content layer, and the
 * rendered result is what `/check verify` drives in a real browser, so the source
 * is what this suite can guard here.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const read = (...parts: string[]): string => readFileSync(join(process.cwd(), ...parts), 'utf-8')

const page = read('src', 'pages', 'torah-portion.astro')
const nav = read('src', 'config', 'nav.ts')
const config = read('src', 'content.config.ts')

/**
 * The commentary page, which is where the temple's prose now lives.
 *
 * Scope feature 24 moved the commentary off the weekly page and onto a
 * permanent page per portion. The guarantees below are unchanged; only the file
 * that has to carry them moved.
 */
const portionPage = read('src', 'pages', 'portion', '[slug].astro')

const notesDir = join(process.cwd(), 'src', 'content', 'portion-notes')

/** Every source file under src/, so a stray reference can be found anywhere. */
const sourceFiles = (): string[] =>
  readdirSync(join(process.cwd(), 'src'), { recursive: true, encoding: 'utf-8' }).filter(
    (name) => /\.(astro|ts|md|mdx)$/.test(name) && !/\.(test|spec)\.ts$/.test(name)
  )

describe('feature 7: the page computes its reading instead of storing it', () => {
  it('reads the portion from the calendar module', () => {
    // The regression this locks in: a hand written page that names the portion
    // in its markup. That page is right for exactly one week and silently wrong
    // for every other, and nothing on the site would show the drift.
    expect(page).toContain("from '@/lib/torah-portion'")
    expect(page).toContain('getWeeklyPortion(timeZone)')
  })

  it('takes the temple timezone from the site config, not a hard coded zone', () => {
    expect(page).toContain('SITE_CONFIG.calendarTimezone')
    expect(page).not.toMatch(/America\/New_York/)
  })

  it('names no portion in any other source file', () => {
    for (const name of sourceFiles()) {
      if (name.endsWith('torah-portion.astro')) continue
      const source = read('src', ...name.split(/[\\/]/))
      expect(source).not.toMatch(/Parashat\s+[A-Z]/)
    }
  })

  it('does not treat the page as a service file, so it stays out of /services', () => {
    expect(config).toContain('portionNotes')
    expect(page).not.toContain("getCollection('services')")
  })

  it('requires a heading alongside every Gospel reference', () => {
    // The schema rule behind AC-7: a Gospel reference with no heading would
    // render a section titled by nothing, which reads as a mistake to a member
    // even though the passage itself is correct.
    expect(config).toContain('gospelTitle')
    expect(config).toContain('is required when gospel is set')
  })
})

describe('feature 7: the sidebar entry stops reading as planned', () => {
  it('is now a static link rather than planned text', () => {
    expect(nav).toMatch(
      /label: "This Week's Torah Portion", href: '\/torah-portion', kind: 'static'/
    )
  })

  it('keeps Important Dates as planned, because that feature has not landed', () => {
    // The guard on the case above: flipping every entry at once would advertise
    // a route that does not exist yet and send members to the 404 page.
    expect(nav).toMatch(/label: 'Important Dates', href: '\/dates', kind: 'planned'/)
  })

  it('names its own address only in the nav config, so there is one source', () => {
    for (const name of sourceFiles()) {
      const source = read('src', ...name.split(/[\\/]/))
      if (/config[\\/]nav\.ts$/.test(name)) continue
      // Each page may name its own route, but nothing else may: a second
      // hardcoded address is a second place to update if the page ever moves.
      if (/pages[\\/]torah-portion\.astro$/.test(name)) continue
      // The commentary page links here on purpose, and so does the module that
      // the weekly page uses to work out which portion a doubled week is.
      if (/pages[\\/]portion[\\/]\[slug\]\.astro$/.test(name)) continue
      if (/lib[\\/]portion-cycle\.ts$/.test(name)) continue
      expect(source).not.toContain('/torah-portion')
    }
  })
})

describe('feature 7 and 24: the temple teaches the portion, the calendar does not', () => {
  it('pairs the commentary to the portion by slug, with no mapping table', () => {
    // The id of a commentary file IS the portion slug, so a new commentary needs
    // no code change and no index to keep in step. The lookup now lives on the
    // portion page, since that is where the commentary is rendered.
    expect(portionPage).toContain('notes.find((entry) => entry.id === portion.slug)')
  })

  it('renders a full reading when no commentary exists for the portion', () => {
    // The regression: requiring a commentary would blank the page for the 50 or
    // so portions the temple has not written about yet.
    expect(portionPage).toContain('No commentary written yet')
    expect(portionPage).toContain('portion.aliyot.map')
  })

  it('gives every portion a page whether or not a commentary exists', () => {
    // AC-1 against the regression that would break it: if the paths came from
    // the collection, a portion with no file would have no page to put the
    // notice on, and the address a member bookmarked would vanish.
    expect(portionPage).toContain('allPortionSlugs().map')
    expect(portionPage).not.toContain("getCollection('portionNotes')\n  ).map")
  })

  it('does not print the commentary on the weekly page any more', () => {
    // The weekly page changes every week; a commentary is written once and
    // revised over years. Printing it there would put a long document on the one
    // page that cannot keep a stable address.
    expect(page).not.toContain("getCollection('portionNotes')")
    expect(page).toContain('/portion/')
  })

  it('names the commentary file after the slug the module produces', () => {
    expect(readdirSync(notesDir)).toContain('bereshit.md')
  })

  it('writes no date or portion name in a commentary front matter', () => {
    // The regression: a date in a commentary would tie it to one week, so it
    // would stop appearing the week after it was written. The reference year is
    // computed for exactly this reason.
    for (const name of readdirSync(notesDir)) {
      const source = readFileSync(join(notesDir, name), 'utf-8')
      const frontMatter = source.slice(0, source.indexOf('---', 3))
      expect(frontMatter).not.toMatch(/^(date|week|parsha|portion):/m)
    }
  })
})

describe('feature 7: the page owns no direction rule of its own', () => {
  it('marks the Hebrew name as a right to left block, not an inline span', () => {
    // The regression: a span lets MDX put a paragraph inside it, which is
    // invalid HTML and loses the block styling from prose.css.
    expect(page).toContain('lang="he" dir="rtl"')
    expect(page).not.toMatch(/<span[^>]*lang="he"/)
  })

  it('carries no direction rule, so prose.css keeps owning direction', () => {
    expect(page).not.toMatch(/direction:\s*rtl/)
    expect(page).not.toMatch(/text-align:\s*right/)
  })

  it('marks the Hebrew date inside English as a dir auto span', () => {
    expect(page).toContain('<span dir="auto">{portion.hebrewDateHe}</span>')
  })

  it('names no token value as a raw literal in its style block', () => {
    const block = page.slice(page.indexOf('<style>'))
    expect(block).not.toMatch(/\brgba?\(|\bhsla?\(/)
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(block).not.toMatch(/(?<!-)\b\d+(\.\d+)?(px|rem)\b/)
    // Roles only: a page that names a ladder step bypasses the token contract
    // and the contrast tests that guard it.
    expect(block).not.toMatch(/--color-(grey|royal-gold|hebrew-red|kosher-blue)-\d+/)
  })
})

describe('feature 24: the portion page keeps the same ground rules', () => {
  // The same guarantees the weekly page holds, checked on the commentary page,
  // because a second page is exactly where a convention gets quietly dropped.

  it('marks the Hebrew name as a right to left block, not an inline span', () => {
    expect(portionPage).toContain('lang="he" dir="rtl"')
    expect(portionPage).not.toMatch(/<span[^>]*lang="he"/)
  })

  it('marks the Hebrew dates inside English as dir auto spans', () => {
    expect(portionPage).toContain('<span dir="auto">{referenceDate}</span>')
    expect(portionPage).toContain('<span dir="auto">{portion.hebrewDateHe}</span>')
  })

  it('carries no direction rule, so prose.css keeps owning direction', () => {
    expect(portionPage).not.toMatch(/direction:\s*rtl/)
    expect(portionPage).not.toMatch(/text-align:\s*right/)
  })

  it('names no token value as a raw literal in its style block', () => {
    const block = portionPage.slice(portionPage.indexOf('<style>'))
    expect(block).not.toMatch(/\brgba?\(|\bhsla?\(/)
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(block).not.toMatch(/(?<!-)\b\d+(\.\d+)?(px|rem)\b/)
    expect(block).not.toMatch(/--color-(grey|royal-gold|hebrew-red|kosher-blue)-\d+/)
  })

  it('takes the cycle count from the module rather than typing 53 into the page', () => {
    // The regression: the page prints "Portion 3 of 53", so a hard typed 53 in the
    // markup would keep claiming 53 after the cycle ever changed. The count the
    // member reads has to come from the same list the routes come from.
    expect(portionPage).not.toContain('of 53 in the annual cycle')
    expect(portionPage).toContain('allPortionSlugs().length')
  })

  it('states the reference year, so the reading is not mistaken for this week', () => {
    // A member comparing this page with the scroll in front of them needs to know
    // it is not this week's scroll. Dropping the year silently turns a stable
    // address into a wrong citation.
    expect(portionPage).toContain('{portion.referenceYear}')
  })

  it('gives the aliyah table a header row and row headers', () => {
    // A screen reader announcing eight identical rows with no column names is the
    // accessibility failure a data table has by default.
    expect(portionPage).toContain('<th scope="col">')
    expect(portionPage).toContain('<th scope="row">')
  })

  it('labels the cycle navigation, so the links are not read as loose text', () => {
    expect(portionPage).toContain('aria-label="Portions either side of this one"')
  })

  it('links the previous and next portions by slug, not by hard typed address', () => {
    expect(portionPage).toContain('href={`/portion/${previous.slug}`}')
    expect(portionPage).toContain('href={`/portion/${next.slug}`}')
  })

  it('gives the unwritten notice somewhere to go, rather than leaving a dead page', () => {
    // A member who lands here with no commentary must still be able to find what
    // is being read now, which is the one thing the page can always offer.
    expect(portionPage).toContain('No commentary written yet')
    expect(portionPage).toContain('<a href="/torah-portion">')
  })

  it('shows the Gospel outline row only when the file supplies a Gospel', () => {
    // The regression: rendering the row unconditionally leaves a term with an
    // empty value on every one of the 52 or so portions that have no Gospel, which
    // reads as a mistake rather than as an absence.
    expect(portionPage).toContain('note?.data.gospel &&')
    expect(portionPage).not.toMatch(/<dt>Gospel<\/dt>/)
  })
})
