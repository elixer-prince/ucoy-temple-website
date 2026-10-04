/**
 * Tests for the wiring around the Friday evening home ritual page (scope
 * feature 6).
 *
 * The ritual body itself is guarded in `content.files.test.ts`. This suite
 * covers everything that had to hold true around it: the sidebar builds its
 * weekly group from content by `kind`, so a new file appears in the menu with
 * no code change, and `visiting.md` no longer advertises a Friday morning
 * service the temple does not keep.
 *
 * These read real source files, the same way the other suites here do. An Astro
 * component cannot be rendered without booting the whole content layer, and the
 * rendered result is what `/check verify` drives in a real browser, so the
 * source is what this suite can guard here.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const read = (...parts: string[]): string => readFileSync(join(process.cwd(), ...parts), 'utf-8')

const sidebar = read('src', 'components', 'Sidebar.astro')
const visiting = read('src', 'content', 'pages', 'visiting.md')
const siteConfig = read('src', 'config', 'site.ts')

const servicesDir = join(process.cwd(), 'src', 'content', 'services')
const fridayId = 'friday-evening-home-ritual'

/**
 * Every non test source file under src/, so a stray reference can be found
 * anywhere. Test files are skipped: this suite names the slug it is looking
 * for, so it would always match itself.
 */
const sourceFiles = (): string[] =>
  readdirSync(join(process.cwd(), 'src'), { recursive: true, encoding: 'utf-8' }).filter(
    (name) => /\.(astro|ts|md|mdx)$/.test(name) && !/\.(test|spec)\.ts$/.test(name)
  )

describe('feature 6: the Friday page reaches the menu through the collection', () => {
  it('builds the sidebar groups from the services collection', () => {
    // The regression this locks in: a hand added Friday entry in the menu is
    // one more place to forget when a service is renamed or retired, and it
    // would not reach the home page or the services landing.
    expect(sidebar).toContain("getCollection('services')")
  })

  it('filters each group by that group own kind', () => {
    expect(sidebar).toContain('service.data.kind === group.kind')
  })

  it('orders a group by order then title, so Friday leads the weekly group', () => {
    expect(sidebar).toContain('a.data.order - b.data.order')
    expect(sidebar).toContain('a.data.title.localeCompare(b.data.title)')
  })

  it('builds each entry address from the group landing and the file id', () => {
    expect(sidebar).toContain('${group.href}/${entry.id}')
  })

  it('writes no literal Friday address or title into the sidebar', () => {
    expect(sidebar).not.toContain(fridayId)
    expect(sidebar).not.toContain('Friday Evening Home Ritual')
  })
})

describe('feature 6: the Friday file alone is enough to publish the page', () => {
  it('is the only Friday service file, so the menu cannot double list it', () => {
    const fridays = readdirSync(servicesDir).filter((name) => name.includes('friday'))
    expect(fridays).toEqual([`${fridayId}.mdx`])
  })

  it('is in the weekly kind, which is what puts it under /services', () => {
    expect(read('src', 'content', 'services', `${fridayId}.mdx`)).toMatch(/^kind: weekly$/m)
  })

  it('carries an order below Shabbat morning, so it leads every listing', () => {
    const orderOf = (slug: string): number =>
      Number(read('src', 'content', 'services', `${slug}.mdx`).match(/^order:\s*(\d+)$/m)?.[1])
    expect(orderOf(fridayId)).toBe(0)
    expect(orderOf(fridayId)).toBeLessThan(orderOf('shabbat-morning-service'))
  })

  it('names no address for itself anywhere else in src/', () => {
    // A hard coded href anywhere else is a second place to update, and it is
    // how a retired service leaves a link pointing at the 404 page.
    for (const name of sourceFiles()) {
      if (name.endsWith(fridayId + '.mdx')) continue
      expect(read('src', ...name.split(/[\\/]/))).not.toContain(fridayId)
    }
  })
})

describe('feature 6: visiting.md advertises the service the temple keeps', () => {
  it('no longer promises a Friday morning service', () => {
    // The regression: visiting.md said "Friday morning, 9:00 AM" while the
    // temple keeps a Friday evening home ritual, so a visitor arrived at a
    // service that has never existed.
    expect(visiting).not.toMatch(/Friday morning/i)
    expect(visiting).not.toMatch(/9:00\s*AM/)
  })

  it('names the Friday evening home ritual in its table', () => {
    expect(visiting).toMatch(/\*\*Friday evening\*\*/)
    expect(visiting).toMatch(/home ritual/i)
    expect(visiting).toMatch(/Before sunset/)
  })

  it('points readers at the services area rather than one hard coded page', () => {
    expect(visiting).toContain('](/services)')
    expect(visiting).not.toContain(fridayId)
  })

  it('keeps the Saturday services it always listed', () => {
    expect(visiting).toMatch(/\*\*Saturday morning\*\*/)
    expect(visiting).toMatch(/\*\*Saturday evening\*\*/)
  })
})

describe('feature 6: the schedule has one source, the content collection', () => {
  it('keeps no schedule block in SITE_CONFIG', () => {
    // The regression this locks in: a services block here is a second, hand
    // written copy of the schedule. It drifts from the content files that own
    // it, and the temple cannot edit it without a rebuild. Everything that
    // lists a service reads the collection instead.
    expect(siteConfig).not.toMatch(/services:\s*\{/)
  })

  it('names no service label in the config', () => {
    expect(siteConfig).not.toMatch(/shabbatMorning|shabbatEvening|havdalah|fridayMorning/)
    expect(siteConfig).not.toMatch(/see schedule/)
  })

  it('is read from SITE_CONFIG.services by no page or component', () => {
    for (const name of sourceFiles()) {
      if (name.endsWith('config/site.ts')) continue
      expect(read('src', ...name.split(/[\\/]/))).not.toMatch(/SITE_CONFIG\.services/)
    }
  })

  it('keeps the environment backed config the site still uses', () => {
    expect(siteConfig).toContain('contactEmail')
    expect(siteConfig).toContain('formEndpoint')
    expect(siteConfig).toContain('calendarId')
    expect(siteConfig).toContain('location')
  })
})
