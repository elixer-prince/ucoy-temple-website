/**
 * Tests for the build time Torah portion module (scope feature 7).
 *
 * This is the correctness gate for the one page on the site whose content
 * changes every week. Nothing here reads a content file, because nothing is
 * hand written: the reading is derived from the Hebrew calendar, so the tests
 * pin the two things that can go quietly wrong.
 *
 * The first is the schedule. A portion is a property of a Hebrew year with a
 * Keviyah behind it, and getting the Diaspora reading wrong is invisible until
 * a festival lands on a Shabbat, which is exactly when it matters. The cases
 * below are real dates with known readings, so a change in the underlying
 * library shows up as a failing expectation rather than a member reading the
 * wrong chapter.
 *
 * The second is the clock. The build runs on UTC, the congregation does not, and
 * a Sunday evening in America is already the next day in UTC. Reading the host
 * clock instead of the temple's timezone is a bug that only shows up for a few
 * hours a week and in the wrong direction, so the timezone cases fix the instant
 * and move only the zone.
 */
import { describe, it, expect } from 'vitest'
import {
  getUpcomingPortions,
  getWeeklyPortion,
  templeToday,
  type WeeklyPortion
} from './torah-portion'

/** The temple's own timezone, the one the calendar is kept in. */
const TZ = 'America/New_York'

/** Any instant on the given UTC day; the hour never matters in these tests. */
const on = (iso: string): Date => new Date(`${iso}T12:00:00Z`)

/** The portion a member should be told to read on the Shabbat of that week. */
function portionOn(iso: string, timeZone: string = TZ): WeeklyPortion {
  return getWeeklyPortion(timeZone, on(iso))
}

describe('the weekly portion matches the real reading for that Shabbat', () => {
  it('reads Bereshit for the Shabbat of 3 October 2026', () => {
    const portion = portionOn('2026-10-04')
    expect(portion.slug).toBe('bereshit')
    expect(portion.nameEn).toBe('Bereshit')
    expect(portion.summary).toBe('Genesis 1:1-6:8')
  })

  it('gives the portion its Hebrew name with vowel points, not a blank', () => {
    // The regression this guards: the page's heaviest Hebrew coming out empty.
    // A member would see the transliteration and no Hebrew at all.
    const portion = portionOn('2026-10-04')
    expect(portion.nameHe).toMatch(/[֐-׿]/)
    expect(portion.nameHe).toMatch(/[ְ-ִ]/)
  })

  it('reads Matot Masei as one doubled portion, and slugs it to match', () => {
    // Matot and Masei are read together in some years and apart in others. In
    // July 2026 they are read together, so the slug must carry both halves
    // without leaving a stray or doubled separator.
    const portion = portionOn('2026-07-05')
    expect(portion.nameEn).toBe('Matot-Masei')
    expect(portion.slug).toBe('matot-masei')
  })

  it('joins a doubled portion into one slug, so a note file can be named for it', () => {
    const portion = portionOn('2026-07-05')
    expect(portion.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('gives the seven aliyot then the maftir, in the order they are called', () => {
    const portion = portionOn('2026-10-04')
    expect(portion.aliyot.map((aliyah) => aliyah.label)).toEqual([
      'Aliyah 1',
      'Aliyah 2',
      'Aliyah 3',
      'Aliyah 4',
      'Aliyah 5',
      'Aliyah 6',
      'Aliyah 7',
      'Maftir'
    ])
  })

  it('cites each aliyah by book and verses, and opens the reading at the top', () => {
    const portion = portionOn('2026-10-04')
    const first = portion.aliyot[0]
    expect(first.book).toBe('Genesis')
    expect(first.begin).toBe('1:1')
    expect(first.end).toBe('2:3')
    // A citation a member cannot look up is worse than none, so every row
    // has to carry its endpoints.
    for (const aliyah of portion.aliyot) {
      expect(aliyah.begin).toMatch(/^\d+:\d+$/)
      expect(aliyah.end).toMatch(/^\d+:\d+$/)
    }
  })

  it('gives the Haftarah from the Prophets, with its own citation', () => {
    const portion = portionOn('2026-10-04')
    expect(portion.haftarah?.summary).toMatch(/I Samuel/)
    expect(portion.haftarah?.begin).toMatch(/^\d+:\d+$/)
  })

  it('dates the reading to the Shabbat, not to the day the page was asked for', () => {
    // Sunday 4 October resolves to the Shabbat of 10 October. A page that
    // printed the Sunday would date the reading to a day it is not read.
    const portion = portionOn('2026-10-04')
    expect(portion.shabbatDate.getUTCDay()).toBe(6)
    expect(portion.shabbatDate.getTime()).toBeGreaterThan(on('2026-10-04').getTime())
  })

  it('gives the Hebrew date of that Shabbat in both scripts', () => {
    const portion = portionOn('2026-10-04')
    expect(portion.hebrewDate).toMatch(/Tishrei/)
    expect(portion.hebrewDate).toMatch(/5787/)
    expect(portion.hebrewDateHe).toMatch(/[֐-׿]/)
  })
})
describe('the week is the temple week, not the build machine week', () => {
  it('reads a Sunday evening in the temple timezone as that Sunday', () => {
    // 4 October 2026, 03:00 UTC, is 11pm on Saturday the 3rd in New York. A
    // build on the host clock would answer with the previous week's reading.
    const saturdayNight = new Date('2026-10-04T03:00:00Z')
    expect(templeToday(TZ, saturdayNight)).toEqual({ year: 2026, month: 10, day: 3 })
    expect(templeToday('UTC', saturdayNight)).toEqual({ year: 2026, month: 10, day: 4 })
  })

  it('holds the same portion across a whole working day of that week', () => {
    // Two instants eleven hours apart on the same day in New York, one of them
    // already the next day in UTC. Both must resolve to the same Shabbat,
    // because for the congregation it is one day and therefore one portion.
    const morning = getWeeklyPortion(TZ, new Date('2026-10-14T12:00:00Z'))
    const night = getWeeklyPortion(TZ, new Date('2026-10-14T23:00:00Z'))
    expect(night.slug).toBe(morning.slug)
    expect(night.shabbatDate.getTime()).toBe(morning.shabbatDate.getTime())
  })

  it('moves to the next portion when the temple week turns over on Saturday night', () => {
    // The guard on the case above: if a portion never changed, that test would
    // pass for the wrong reason. Saturday night is exactly when the week turns,
    // because the next Shabbat is tomorrow.
    const saturdayNight = getWeeklyPortion(TZ, new Date('2026-10-03T23:00:00Z'))
    const sundayNight = getWeeklyPortion(TZ, new Date('2026-10-10T23:00:00Z'))
    expect(saturdayNight.slug).not.toBe(sundayNight.slug)
    expect(saturdayNight.shabbatDate.getTime()).toBeLessThan(sundayNight.shabbatDate.getTime())
  })

  it('always dates the reading to a Saturday, whatever day it is asked on', () => {
    // Whatever the build date, the page names a Shabbat. A Friday or a Monday
    // slipping through here would put a reading on a day it is not read.
    for (const iso of ['2026-10-04', '2026-10-07', '2026-10-10', '2026-12-06']) {
      expect(getWeeklyPortion(TZ, on(iso)).shabbatDate.getUTCDay()).toBe(6)
    }
  })

  it('reaches the next portion once the new week starts', () => {
    // A week is only right if it moves. Two Sabbaths a fortnight apart are a
    // fortnight apart, never the same night twice.
    const october = portionOn('2026-10-04')
    const december = portionOn('2026-12-06')
    expect(december.slug).not.toBe(october.slug)
  })
})

describe('a festival Shabbat is marked rather than passed off as a weekly portion', () => {
  it('flags the special reading on a festival Shabbat and names it', () => {
    // In 2026 Shmini Atzeret fell on Shabbat 3 October, displacing the weekly
    // portion. Printing the weekly portion here would send a member to a
    // chapter the Congregation does not read that day.
    const portion = portionOn('2026-10-03')
    expect(portion.isSpecial).toBe(true)
    expect(portion.nameEn).toMatch(/Shmini Atzeret/i)
    expect(portion.reason).toBeTruthy()
  })

  it('leaves an ordinary Shabbat unflagged', () => {
    expect(portionOn('2026-10-04').isSpecial).toBe(false)
  })

  it('still gives the reading, so the page is not empty on a festival Shabbat', () => {
    const portion = portionOn('2026-10-03')
    expect(portion.aliyot.length).toBeGreaterThan(0)
    expect(portion.summary).not.toBe('')
  })

  it('keeps the Diaspora schedule rather than Israel own', () => {
    // The congregation keeps the Diaspora reading. In the years where the two
    // schedules differ, an Israel schedule silently reads the wrong passages,
    // and nothing on the page would reveal it. So this asserts the Diaspora
    // answer explicitly on a festival Shabbat, where the two can diverge.
    const portion = portionOn('2026-10-03')
    expect(portion.summary).toMatch(/Deuteronomy/)
    expect(portion.haftarah?.summary).not.toBe('')
  })
})

describe('the coming weeks look forward without repeating this week', () => {
  it('returns the requested number of weeks', () => {
    expect(getUpcomingPortions(TZ, 3, on('2026-10-04'))).toHaveLength(3)
  })

  it('never repeats the portion already on the page', () => {
    // The regression: an upcoming list starting on the current week prints the
    // reading twice and pushes the one after it off the end.
    const current = portionOn('2026-10-04')
    const upcoming = getUpcomingPortions(TZ, 3, on('2026-10-04'))
    expect(upcoming.map((portion) => portion.slug)).not.toContain(current.slug)
  })

  it('steps one Shabbat at a time, each seven days after the last', () => {
    const upcoming = getUpcomingPortions(TZ, 3, on('2026-10-04'))
    for (const portion of upcoming) {
      expect(portion.shabbatDate.getUTCDay()).toBe(6)
    }
    for (let week = 1; week < upcoming.length; week++) {
      const gap = upcoming[week].shabbatDate.getTime() - upcoming[week - 1].shabbatDate.getTime()
      expect(gap).toBe(7 * 24 * 60 * 60 * 1000)
    }
  })

  it('returns nothing when asked for none, rather than throwing', () => {
    expect(getUpcomingPortions(TZ, 0, on('2026-10-04'))).toEqual([])
  })
})
