/**
 * Tests for the home page's service times (scope feature 5).
 *
 * The home page reads its service times from the `services` collection rather
 * than repeating them in markup. That matters because the temple's times live
 * in the content files: a hardcoded table silently drifts, and the one this
 * replaced listed three services that were never built as pages, so it
 * advertised addresses that returned the 404 page.
 *
 * These read the real source file, the same way the content and worker suites
 * read real files. An Astro component cannot be rendered without booting the
 * whole content layer, and the rendered result is what `/check verify` drives
 * in a real browser, so the source is what this suite can guard here.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const home = readFileSync(join(process.cwd(), 'src', 'pages', 'index.astro'), 'utf-8')

describe('feature 5: the home page reads service times from content', () => {
  it('reads the services collection, filtered to the weekly kind', () => {
    expect(home).toContain("getCollection('services'")
    expect(home).toContain("data.kind === 'weekly'")
  })

  it('links each service to the page address the build produces for it', () => {
    expect(home).toContain('href={`/services/${service.id}`}')
  })

  it('shows the day and the time beside the title', () => {
    expect(home).toContain('service.data.day')
    expect(home).toContain('service.data.time')
  })

  it('sorts by order then title, so the listing matches the sidebar', () => {
    expect(home).toContain('a.data.order - b.data.order')
    expect(home).toContain('a.data.title.localeCompare(b.data.title)')
  })

  it('renders a list, so a service reads as a link and not a table row', () => {
    expect(home).toContain('class="service-list"')
    expect(home).toContain('class="service-row"')
    expect(home).not.toContain('<table>')
  })

  it('offers a quiet message when no service is published, rather than an empty panel', () => {
    expect(home).toContain('weeklyServices.length > 0')
    expect(home).toContain('Service times are being updated')
  })
})

describe('feature 5: the home page hardcodes no service times', () => {
  // The regression this locks in: a time written into the page drifts from the
  // content file that owns it, and the temple cannot edit it without a rebuild.
  const times = ['9:00 AM', '9:30 AM', 'At sunset', 'After dark']

  for (const time of times) {
    it(`writes no literal "${time}"`, () => {
      expect(home).not.toContain(time)
    })
  }

  it('names no service as a literal label instead of linking its page', () => {
    expect(home).not.toMatch(/Kabbalat Shabbat/)
    expect(home).not.toMatch(/Havdalah \(Closing of Shabbat\)/)
    expect(home).not.toMatch(/Shabbat morning \(Shacharit\)/)
  })
})

describe('feature 5: the home page names only token values', () => {
  // The literal scan in src/styles/literals.test.ts reads style blocks, so this
  // asserts the same rule for the page's own class names: nothing here may name
  // a ladder step directly, only roles.
  const block = home.slice(home.indexOf('<style>'))

  it('uses no raw colour function in its style block', () => {
    expect(block).not.toMatch(/\brgba?\(|\bhsla?\(/)
  })

  it('uses no raw hex colour in its style block', () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('names no ladder step directly', () => {
    const ladders = block.match(/--color-(grey|royal-gold|hebrew-red|kosher-blue)-\d+/g)
    expect(ladders).toBeNull()
  })
})
