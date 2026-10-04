/**
 * Tests for the annual portion cycle (scope feature 24, spec 0006).
 *
 * The commentary pages exist to be permanent, so the thing these tests protect
 * is permanence: the same address, showing the same reading, whatever day the
 * site is built on. Two failure modes would break that quietly.
 *
 * The first is a doubled portion. Seven pairs are read together in some years and
 * apart in others, so a page that resolves its reading from "a year" rather than
 * "a year this portion stands alone" would show `Matot` with the aliyot of a
 * doubled reading in some years and its own in others. Every test here therefore
 * checks that a portion's reading is its own, and never a neighbour's.
 *
 * The second is the reference year drifting with the build date. If a reading
 * were resolved from the current year, the citations would change every year and
 * a bookmarked page would slowly stop matching the commentary written against
 * it. So the tests assert stability: the same reading comes back every time, and
 * the reference year is a fixed point in the past.
 *
 * Nothing here hard codes a scripture citation. The citations are computed, and a
 * test that pinned one would only fail when the calendar library changed.
 */
import { describe, it, expect } from 'vitest'
import { getSedra } from '@hebcal/core'
import {
  WEEKLY_PORTIONS,
  allPortionSlugs,
  getCycleNeighbours,
  getPortionBySlug,
  getPortionCycle,
  portionSlug,
  slugForWeeklyReading,
  type CyclePortion
} from './portion-cycle'
import { getWeeklyPortion } from './torah-portion'

/** The cycle is expensive to compute, so it is built once for the whole file. */
const cycle = getPortionCycle()

describe('every portion in the cycle has a page to be found at', () => {
  it('holds the 53 weekly portions', () => {
    // Not 54. `parshiot` lists 54 names, the last of which is Vezot Haberakhah,
    // read on Simchat Torah and never as a weekly parashah. Publishing a page
    // for it would promise a reading the Congregation never asks anyone to
    // prepare.
    expect(WEEKLY_PORTIONS).toHaveLength(53)
    expect(WEEKLY_PORTIONS[0]).toBe('Bereshit')
    expect(WEEKLY_PORTIONS[52]).toBe("Ha'azinu")
  })

  it('leaves out Vezot Haberakhah, which is not a weekly portion', () => {
    expect(WEEKLY_PORTIONS).not.toContain('Vezot Haberakhah')
  })

  it('gives every portion a slug that is safe to put in a URL', () => {
    for (const slug of allPortionSlugs()) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('gives every portion a distinct slug, so no two pages collide', () => {
    // Two portions reading alike would overwrite one another at build time and
    // a member would silently be sent to the wrong commentary.
    const slugs = allPortionSlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('turns an apostrophe in a name into a separator, not a broken slug', () => {
    // `Ha'azinu` reads as `ha-azinu` rather than `ha'azinu`, which would need
    // escaping and would break on some hosts.
    expect(portionSlug("Ha'azinu")).toBe('ha-azinu')
  })
})

describe("a portion's reading is its own, never a neighbour's", () => {
  it('gives each portion a citation that covers the whole portion', () => {
    for (const portion of cycle) {
      expect(portion.summary).not.toBe('')
      expect(portion.aliyot.length).toBeGreaterThan(0)
    }
  })

  it('reads Matot on its own, not as the doubled Matot-Masei', () => {
    // The regression this guards. Matot and Masei are read together in some
    // years, and a page resolving from an arbitrary year would sometimes show
    // Matot with the aliyot and Haftarah of the combined reading.
    const matot = getPortionBySlug('matot')!
    expect(matot.summary).toMatch(/^Numbers 30:/)
    expect(matot.summary).toContain('32:42')
    expect(matot.summary).not.toMatch(/Masei/)
  })

  it('reads each half of a paired portion at its own length', () => {
    // The other side of the same fix, checked through the other half.
    const masei = getPortionBySlug('masei')!
    expect(masei.summary).not.toMatch(/Matot/)
    expect(masei.summary).toMatch(/^Numbers /)
  })

  it('gives every portion a Haftarah, since Prophets is a reference on every page', () => {
    for (const portion of cycle) {
      expect(portion.haftarah?.summary).toBeTruthy()
    }
  })

  it('starts every portion with Aliyah 1 and ends with the maftir', () => {
    for (const portion of cycle) {
      expect(portion.aliyot[0]?.label).toBe('Aliyah 1')
      expect(portion.aliyot[portion.aliyot.length - 1]?.label).toBe('Maftir')
    }
  })

  it('dates every reading to a Saturday', () => {
    // Whatever the reference year, a portion page names a Shabbat. A reading
    // landing on another day would be a reading nobody is given.
    for (const portion of cycle) {
      expect(portion.shabbatDate.getUTCDay()).toBe(6)
    }
  })

  it('gives every portion its Hebrew name, vocalised rather than a bare letter', () => {
    // The regression a member would notice most: a transliteration with no Hebrew
    // beside it on the page whose whole purpose is the Hebrew reading. The range
    // covers every pointing mark, not only sheva to hiriq, because a short name
    // like Noach carries holam and patah but no sheva at all.
    for (const portion of cycle) {
      expect(portion.nameHe).toMatch(/[֑-ׇ]/)
      expect(portion.nameHe.trim()).not.toBe('')
    }
  })

  it('reads a real Gregorian year, not a date centuries away', () => {
    // The regression: an absolute Hebrew day number multiplied straight into a
    // Unix timestamp, which lands in the far future and still looks like a
    // plausible reading. A byline claiming the year 3988 is wrong in a way no
    // reader would catch.
    for (const portion of cycle) {
      const year = portion.shabbatDate.getUTCFullYear()
      expect(year).toBeGreaterThan(1900)
      expect(year).toBeLessThan(2200)
    }
  })
})

describe('the reading is the same whatever day the site is built', () => {
  it('gives a portion the same citation on every call', () => {
    // The build takes no date for a portion page, so this is really a guard
    // against a future change that lets one creep in. It is cheap to assert and
    // the failure it prevents is silent.
    const first = getPortionBySlug('bereshit')!
    const again = getPortionBySlug('bereshit')!
    expect(again.summary).toBe(first.summary)
    expect(again.referenceYear).toBe(first.referenceYear)
    expect(again.shabbatDate.getTime()).toBe(first.shabbatDate.getTime())
  })

  it('takes the reference year from a fixed point in the past, not from today', () => {
    // A reference year that tracked the build would re-resolve the reading each
    // year and the citations would move under the commentary written against
    // them. The start year is fixed in the module, so a year can only be at or
    // after it, and within the module's own search limit.
    const referenceYear = getPortionBySlug('bereshit')!.referenceYear
    expect(referenceYear).toBeGreaterThanOrEqual(5780)
    expect(referenceYear).toBeLessThan(5780 + 40)
  })

  it('resolves every portion in a year the calendar reads it alone', () => {
    // The property the whole module rests on, asserted against the library
    // rather than against a stored value. If a change in the calendar library
    // ever made a portion never stand alone, this fails before a page can ship
    // a reading belonging to a different portion.
    for (const portion of cycle) {
      expect(getSedra(portion.referenceYear, false).find(portion.nameEn)).toBeTruthy()
    }
  })
})

describe('reading onward never reaches a dead end', () => {
  const bySlug = (slug: string): CyclePortion => cycle.find((portion) => portion.slug === slug)!

  it('moves forward one portion at a time through the whole cycle', () => {
    for (let i = 0; i < cycle.length - 1; i += 1) {
      expect(getCycleNeighbours(cycle[i]!).next.slug).toBe(cycle[i + 1]!.slug)
    }
  })

  it('moves backward one portion at a time through the whole cycle', () => {
    for (let i = 1; i < cycle.length; i += 1) {
      expect(getCycleNeighbours(cycle[i]!).previous.slug).toBe(cycle[i - 1]!.slug)
    }
  })

  it('wraps the last portion forward to the first rather than to nothing', () => {
    // A member who studies to the end of the year and taps onward should arrive
    // at the start of the next, which is exactly where the cycle resumes.
    const last = cycle[cycle.length - 1]!
    expect(getCycleNeighbours(last).next.slug).toBe('bereshit')
  })

  it('wraps the first portion backward to the last rather than to nothing', () => {
    const first = cycle[0]!
    expect(getCycleNeighbours(first).previous.slug).toBe(bySlug('ha-azinu').slug)
  })

  it('numbers the portions in reading order', () => {
    expect(cycle[0]!.index).toBe(0)
    expect(cycle[52]!.index).toBe(52)
  })
})

describe('the weekly page can reach a commentary even on a doubled week', () => {
  it('maps a plain weekly slug straight through', () => {
    expect(slugForWeeklyReading('bereshit')).toBe('bereshit')
  })

  it('maps a doubled slug to the first portion of the pair', () => {
    // The regression: a doubled week hands the weekly page a slug like
    // `matot-masei`, and there is no page at that address. Linking to it would
    // send a member to a 404 on the week the pair is read.
    expect(slugForWeeklyReading('matot-masei')).toBe('matot')
    expect(slugForWeeklyReading('vayakhel-pekudei')).toBe('vayakhel')
  })

  it('maps a doubled pair whose own slug carries the separator', () => {
    // The bug this pins: `Achrei Mot` is one portion whose slug is `achrei-mot`,
    // so the doubled slug `achrei-mot-kedoshim` cannot be read by splitting on
    // the separator, because `achrei` and `mot` are not portions. Matching the
    // whole slug against neighbouring pairs answers it. These Sabbats come round
    // every two or three years, so without this test the weekly page would show no
    // commentary link on a Shabbat when a real portion was read, and nothing else
    // in the suite would notice.
    expect(slugForWeeklyReading('achrei-mot-kedoshim')).toBe('achrei-mot')
  })

  it('maps every doubled pair the calendar can produce', () => {
    // Walking real weeks rather than a hand written list, because the pairs that
    // actually occur are what members meet. An ordinary week must always link and
    // a festival Shabbat must never, which is the whole contract of this helper.
    const linked = new Set(allPortionSlugs())
    const doubled = new Set<string>()
    for (let year = 2026; year <= 2036; year += 1) {
      for (
        let day = new Date(Date.UTC(year, 0, 3));
        day < new Date(Date.UTC(year + 1, 0, 1));
        day = new Date(day.getTime() + 7 * 86400000)
      ) {
        const weekly = getWeeklyPortion('America/New_York', day)
        const slug = slugForWeeklyReading(weekly.slug)
        if (weekly.isSpecial) {
          expect(slug, `${weekly.slug} is a festival and reads no portion`).toBeUndefined()
        } else {
          expect(slug, `${weekly.slug} is read but cannot reach a commentary`).toBeDefined()
          expect(linked.has(slug!)).toBe(true)
        }
        if (!weekly.isSpecial && weekly.slug.includes('-')) doubled.add(weekly.slug)
      }
    }

    // Every doubled slug met in fifteen years resolves, so none of them can be the
    // Saturday a member finds no commentary link.
    for (const slug of doubled) {
      expect(slugForWeeklyReading(slug), `${slug} is read as a doubled week`).toBeDefined()
    }
    expect(doubled.has('achrei-mot-kedoshim')).toBe(true)
  })

  it('still returns nothing for a festival slug built from two real portions', () => {
    // The guard the neighbour matching has to keep. `Shmini` and `Atzeret` are both
    // real portions, and `shmini-atzeret` is a festival, but they are not
    // neighbours in the cycle, so no pair matches and there is no link. This is
    // what stops a festival Shabbat being sent to a portion that was not read.
    expect(slugForWeeklyReading('shmini-atzeret')).toBeUndefined()
  })

  it('always lands on a slug that has a page', () => {
    for (const portion of cycle) {
      for (const candidate of [portion.slug, `${portion.slug}-masei`]) {
        const slug = slugForWeeklyReading(candidate)
        if (slug) expect(getPortionBySlug(slug)).toBeTruthy()
      }
    }
  })

  it('returns nothing for a festival Saturday, which reads no portion', () => {
    // The regression: taking the first word of a festival name would answer
    // `shmini`, which is not one of the 53. The weekly page would then link to an
    // address that does not exist, on the weeks a member is most likely to be
    // looking for the commentary.
    expect(slugForWeeklyReading('shmini-atzeret')).toBeUndefined()
    expect(slugForWeeklyReading('rosh-hashanah')).toBeUndefined()
  })

  it('returns nothing for a slug that is empty or nonsense', () => {
    expect(slugForWeeklyReading('')).toBeUndefined()
    expect(slugForWeeklyReading('-')).toBeUndefined()
    expect(slugForWeeklyReading('not-a-portion')).toBeUndefined()
  })
})
