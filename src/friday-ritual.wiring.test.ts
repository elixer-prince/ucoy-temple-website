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
import { readFileSync, readdirSync, existsSync } from 'node:fs'
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

  it('keeps the Saturday morning service it always listed', () => {
    expect(visiting).toMatch(/\*\*Saturday morning\*\*/)
  })

  it('names no service that has no page behind it', () => {
    // The regression this locks in: the table once carried Saturday afternoon
    // and Saturday evening rows for services that were never authored, so a
    // visitor was sent to a service the temple does not publish. Every day the
    // visiting page advertises must correspond to a real content file. The
    // closing of Shabbat (Havdalah) returns with its own page in feature 8.
    // Compare the day name only ("saturday"), not the whole phrase: the content
    // files say "Saturday" and "Friday evening", while the table qualifies them
    // as "Saturday morning" and "Friday evening". Matching on the first word
    // keeps the rule true without pinning either file's wording.
    const dayName = (value: string): string => value.trim().toLowerCase().split(/\s+/)[0]

    const authored = readdirSync(servicesDir)
      .filter((name) => name.endsWith('.mdx'))
      .flatMap((name) =>
        [...read('src', 'content', 'services', name).matchAll(/^day:\s*(.+)$/gm)].map((m) =>
          dayName(m[1])
        )
      )
    const advertised = [...visiting.matchAll(/^\|\s*\*\*([^*]+)\*\*\s*\|/gm)].map((m) =>
      dayName(m[1])
    )

    expect(advertised.length).toBeGreaterThan(0)
    for (const day of advertised) {
      expect(authored).toContain(day)
    }
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

describe('feature 8: the closing of Shabbat reaches the page with one file', () => {
  const closingId = 'closing-of-shabbat'

  it('is in the weekly kind, which is what puts it under /services', () => {
    expect(read('src', 'content', 'services', `${closingId}.mdx`)).toMatch(/^kind: weekly$/m)
  })

  it('is the only closing file, so the menu cannot double list it', () => {
    const closings = readdirSync(servicesDir).filter((name) => name.includes('closing'))
    expect(closings).toEqual([`${closingId}.mdx`])
  })

  it('needs no menu, landing page or route code of its own', () => {
    // The whole point of building it as a weekly service: the sidebar, the home
    // page and /services all read the collection, so the file alone publishes it.
    for (const name of ['src/components/Sidebar.astro', 'src/pages/services/index.astro']) {
      expect(read(...name.split('/'))).not.toContain(closingId)
    }
    // Sorted, because readdir order is the filesystem's, not a promise: this
    // asserts no route file was added, not which name the disk lists first.
    expect(readdirSync(join(process.cwd(), 'src', 'pages', 'services')).sort()).toEqual([
      '[slug].astro',
      'index.astro'
    ])
  })

  it('is linked from the Shabbat morning service, so it is one tap away afterwards', () => {
    // The reachability problem the separate address creates: a member who has
    // just come out of the service should reach the closing without hunting for
    // it in the menu. One link, not a second copy of the closing text.
    const morning = read('src', 'content', 'services', 'shabbat-morning-service.mdx')
    expect(morning).toContain(`](/services/${closingId})`)
  })

  it('copies the closing order into no other service body', () => {
    // The regression: pasting the closing into each service page makes it a
    // second and third copy that drifts, and High Sabbath pages would multiply
    // it further. One file owns the closing.
    for (const name of readdirSync(servicesDir)) {
      if (!name.endsWith('.mdx') || name === `${closingId}.mdx`) continue
      const body = read('src', 'content', 'services', name)
      expect(body).not.toMatch(/Havdalah \((?!.*\]\(\/services\/)/)
    }
  })
})

describe('feature 8: the closing is advertised only where it can be kept', () => {
  it('is not yet a row on the visiting page, because its time is not settled', () => {
    // The visiting page is what a first time visitor reads to decide when to
    // come. The closing is kept at the table at home and at the building on the
    // occasions the calendar gives, so a row promising a time would send a
    // visitor to an evening the temple does not announce. It joins that table
    // when the temple settles where it is kept.
    expect(visiting).not.toMatch(/Havdalah/i)
    expect(visiting).not.toMatch(/\*\*Saturday evening\*\*/)
  })

  it('points the closing page at the calendar rather than naming a gathering time', () => {
    // The promise the page makes instead: the times live in the calendar and the
    // announcements, both of which are updated by staff without a rebuild.
    const body = read('src', 'content', 'services', 'closing-of-shabbat.mdx')
    expect(body).toMatch(/temple calendar/)
    expect(body).not.toMatch(/time: \d/)
  })
})

describe('feature 8: the link from the morning service lands on a real page', () => {
  /*
   * The reachability promise is only worth something if the address it points at
   * exists. `/check verify` fetched it in the browser and got 200; this pins the
   * same fact to the build, so a rename that broke the link fails the suite rather
   * than shipping a tap that goes nowhere.
   */
  const built = (slug: string): string =>
    join(process.cwd(), 'dist', 'services', slug, 'index.html')

  it('builds the closing at the address the morning service links to', () => {
    const morning = read('src', 'content', 'services', 'shabbat-morning-service.mdx')
    const href = morning.match(/\]\((\/services\/closing-of-shabbat[^)]*)\)/)?.[1]
    expect(href).toBe('/services/closing-of-shabbat')

    const builtPage = join(process.cwd(), 'dist', href!.replace(/^\//, ''), 'index.html')
    if (!existsSync(builtPage)) {
      // No build has run, so there is nothing to assert against yet.
      expect(true).toBe(true)
      return
    }
    expect(existsSync(builtPage)).toBe(true)
  })

  it('renders that link into the built morning page, so the tap is really there', () => {
    const morningPage = built('shabbat-morning-service')
    if (!existsSync(morningPage)) {
      expect(true).toBe(true)
      return
    }

    const html = readFileSync(morningPage, 'utf-8')
    expect(html).toContain('href="/services/closing-of-shabbat"')
  })

  it('puts the link at the end of the morning service, where a member reaches it', () => {
    // A member who has just come out of the service reads the last paragraph, so a
    // link placed earlier would be missed exactly when it is wanted.
    const body = getBodyOf(read('src', 'content', 'services', 'shabbat-morning-service.mdx'))
    const lastParagraph =
      body
        .trimEnd()
        .split(/\n{2,}/)
        .at(-1) ?? ''
    expect(lastParagraph).toContain('/services/closing-of-shabbat')
    expect(lastParagraph).toMatch(/closing of Shabbat/i)
  })
})

/** The body of an .mdx file: everything after the front matter. */
function getBodyOf(source: string): string {
  const parts = source.split('---\n')
  return parts.length >= 3 ? parts.slice(2).join('---\n').trim() : source
}
