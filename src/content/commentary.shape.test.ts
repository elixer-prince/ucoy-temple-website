/**
 * Tests for the shape of a commentary file (scope feature 24, spec 0006).
 *
 * The Congregation writes these from the paper, and the paper is a fixed
 * template: an outline, a summary, then the commentary on Torah, on Prophets and
 * on the Gospel where there is one, a closing thought, and a summary of the
 * whole. That template is the reason a member can open a portion from years ago
 * and know where to look, so a commentary that quietly drops or reorders a
 * heading is a regression rather than a matter of taste.
 *
 * The schema cannot hold this. A commentary is prose under a sequence of
 * headings, not a set of fields, so the sequence has to be checked here or
 * nowhere. These tests read the files as text for the same reason the other
 * content suites do: rendering them needs the whole content layer, which is the
 * job of the build rather than of a unit test.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { allPortionSlugs } from '../lib/portion-cycle'

const notesDir = join(process.cwd(), 'src', 'content', 'portion-notes')

/**
 * The paper's sections, in the order the paper keeps them.
 *
 * The Gospel section is deliberately absent from this list. The congregation does
 * not currently read the Gospel, so requiring the heading would put an empty
 * section on most pages. A commentary that does include it is checked separately,
 * because then it has to appear in the right place.
 */
const REQUIRED_SECTIONS = [
  'Portion Outline',
  'Portion Summary',
  'Commentary: Torah',
  'Commentary: Prophets',
  'Thought for the week',
  'Commentary Summary'
]

/** The heading a commentary adds when it does carry a Gospel passage. */
const GOSPEL_HEADING = 'Commentary: Gospel'

const files = readdirSync(notesDir).filter((name) => /\.mdx?$/.test(name))

/** The `##` headings of a commentary, in the order they appear. */
function headingsIn(name: string): string[] {
  const source = readFileSync(join(notesDir, name), 'utf-8')
  return source
    .split('\n')
    .map((line) => /^##\s+(.+?)\s*$/.exec(line)?.[1])
    .filter((heading): heading is string => Boolean(heading))
}

/** Whether the front matter names a Gospel passage. */
function hasGospel(name: string): boolean {
  const source = readFileSync(join(notesDir, name), 'utf-8')
  const frontMatter = source.slice(0, source.indexOf('---', 3))
  return /^gospel:\s*\S/m.test(frontMatter)
}

/** The file's id, which for this collection is its name without the extension. */
function fileId(name: string): string {
  return name.replace(/\.mdx?$/, '')
}

describe('a commentary is named after a portion that exists', () => {
  it.each(files)('%s sits at an address the site actually publishes', (name) => {
    // The failure this stops is silent, which is why it is worth a test. A
    // commentary file is paired to its page by the file id being the portion
    // slug, so a typo such as `noah.md` for `noach` builds cleanly, renders
    // nowhere, and leaves an unwritten notice on a portion the Congregation has
    // in fact written about. Nothing else in the suite would notice: the build
    // succeeds, the page for the intended portion still exists, and the file is
    // valid content by every other measure.
    expect(allPortionSlugs(), `${name} is named after no published portion`).toContain(fileId(name))
  })

  it('would catch the typo it is guarding, so the guard still bites', () => {
    // A guard that cannot fail is not a guard. This asserts against the slug list
    // directly, so if the matching ever loosened by accident, this fails first
    // and says why.
    const published = new Set(allPortionSlugs())
    expect(published.has('noah')).toBe(false)
    expect(published.has('noach')).toBe(true)
    expect(published.has('matot-masei')).toBe(false)
    expect(published.has('matot')).toBe(true)
  })

  it('covers every commentary the Congregation has written', () => {
    // So that a new file cannot slip in under a different describe block, and so
    // that the guard above is never vacuous: there is at least one file for it to
    // be checking, and there are far more published portions than files written.
    expect(files.length).toBeGreaterThan(0)
    expect(allPortionSlugs().length).toBeGreaterThan(files.length)
  })
})

describe('a commentary keeps the template the paper uses', () => {
  it('finds at least one commentary to check', () => {
    // Without this the rest of the suite would pass on an empty directory, which
    // is the failure mode a content test suite is most prone to.
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s carries every required section', (name) => {
    for (const section of REQUIRED_SECTIONS) {
      expect(headingsIn(name), `${name} is missing "${section}"`).toContain(section)
    }
  })

  it.each(files)('%s keeps the sections in the order the paper keeps them', (name) => {
    const headings = headingsIn(name)
    const positions = REQUIRED_SECTIONS.map((section) => headings.indexOf(section))
    expect(positions).not.toContain(-1)
    // Sorting the positions must leave them untouched, which is the claim that
    // the paper's order survives an edit.
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it.each(files)('%s has no heading the template does not define', (name) => {
    // A stray heading would render as a section the Congregation does not know
    // to expect, sitting between two it does.
    const allowed = new Set([...REQUIRED_SECTIONS, GOSPEL_HEADING])
    for (const heading of headingsIn(name)) {
      expect(allowed, `${name} has an unexpected heading "${heading}"`).toContain(heading)
    }
  })

  it.each(files)('%s shows the Gospel section only when it supplies a Gospel', (name) => {
    const gospel = hasGospel(name)
    expect(headingsIn(name).includes(GOSPEL_HEADING)).toBe(gospel)
  })

  it.each(files)('%s puts the Gospel section where the paper puts it', (name) => {
    if (!headingsIn(name).includes(GOSPEL_HEADING)) return
    const headings = headingsIn(name)
    expect(headings.indexOf(GOSPEL_HEADING)).toBeGreaterThan(
      headings.indexOf('Commentary: Prophets')
    )
    expect(headings.indexOf(GOSPEL_HEADING)).toBeLessThan(headings.indexOf('Thought for the week'))
  })
})

describe('a commentary is not tied to one week', () => {
  it.each(files)('%s starts its body at a section heading', (name) => {
    // The front matter title is the page's only `h1`, so a body that opened with
    // prose would leave the page with a heading order that skips a level.
    const source = readFileSync(join(notesDir, name), 'utf-8')
    const body = source.slice(source.indexOf('---', 3) + 3)
    expect(body.trimStart().startsWith('##')).toBe(true)
  })

  it.each(files)('%s names no scripture citation in its front matter', (name) => {
    // The reading is computed, so a citation here could only ever be a hand
    // copied one, and hand copied citations are what go stale.
    const source = readFileSync(join(notesDir, name), 'utf-8')
    const frontMatter = source.slice(0, source.indexOf('---', 3))
    expect(frontMatter).not.toMatch(/\d+:\d+/)
  })

  it.each(files)('%s marks its Hebrew as a right to left block or an inline span', (name) => {
    // Direction is owned by prose.css, so an author only marks the script. Both
    // forms are allowed because a full passage is a block and a phrase inside an
    // English sentence is a span; what is not allowed is unmarked Hebrew.
    const source = readFileSync(join(notesDir, name), 'utf-8')
    const hebrew = source.match(/[\u0590-\u05FF]/g)
    if (!hebrew) return
    expect(source).toMatch(/dir="(rtl|auto)"/)
  })
})
