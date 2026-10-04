/**
 * The Torah portion of the week, computed at build time (scope feature 7,
 * spec 0005).
 *
 * The page is the one page whose content changes every week, so it cannot be a
 * hand written file the way a service body is. This module derives the reading
 * from the Hebrew calendar instead, through @hebcal/core and @hebcal/leyning, so
 * the page is correct for whatever week the build runs in and never goes stale
 * between rebuilds.
 *
 * Two things this module owns on purpose:
 *
 * - The temple's timezone. `SITE_CONFIG.calendarTimezone` decides which day it
 *   is for the congregation. A build machine on UTC would otherwise read the
 *   wrong Shabbat on a Sunday evening, so "today" is resolved through
 *   `Intl.DateTimeFormat` with that zone rather than the host clock.
 * - The Diaspora schedule (`il = false`). The congregation keeps the Diaspora
 *   reading, which differs from Israel's in the years a festival falls on
 *   Shabbat.
 *
 * Hebrew comes out of the library already vocalised and correct, which matters:
 * this is the heaviest Hebrew on the site, and hand typed vowel points drift.
 *
 * The page renders the teaching from the `portion-notes` collection, which the
 * temple authors per portion. A portion with no note still renders: the
 * computed reading is always there, the note is the part that fills in over
 * time.
 */
import { HDate, HebrewDateEvent, getSedra, greg } from '@hebcal/core'
import { getLeyningOnDate, type Aliyah, type Leyning, type LeyningWeekday } from '@hebcal/leyning'

/** One aliyah of the Torah reading, or the maftir that closes it. */
export interface PortionAliyah {
  /** `'1'` to `'7'`, or `'M'` for the maftir. */
  key: string
  /** `Aliyah 1` … `Aliyah 7`, or `Maftir`. */
  label: string
  /** Book of the Tanakh, e.g. `Genesis`. */
  book: string
  /** Opening reference, e.g. `1:1`. */
  begin: string
  /** Closing reference, e.g. `2:3`. */
  end: string
  /** Verse count, when the library computed one. */
  verses?: number
  /** Why this passage differs, when it does. */
  reason?: string
}

/** The Haftarah, the reading from the Prophets that follows the Torah portion. */
export interface PortionHaftarah {
  /** Formatted citation, e.g. `I Samuel 20:18-42`. */
  summary: string
  /** Book of the Prophets. */
  book: string
  /** Opening reference. */
  begin: string
  /** Closing reference. */
  end: string
  /** Why this Haftarah, when the week calls for a special one. */
  reason?: string
}

/** Everything the page needs about one week's reading. */
export interface WeeklyPortion {
  /**
   * Stable key for the portion, e.g. `bereshit` or `matot-masei`. Lower case and
   * hyphenated, so a portion note file can be named after it.
   */
  slug: string
  /** Transliterated name, e.g. `Bereshit`. */
  nameEn: string
  /** Hebrew name with vowel points, e.g. `בְּרֵאשִׁית`. */
  nameHe: string
  /** Formatted citation for the whole portion, e.g. `Genesis 1:1-6:8`. */
  summary: string
  /** The date of the Shabbat, for the page's byline. */
  shabbatDate: Date
  /** Hebrew date of the Shabbat in English, e.g. `29th of Tishrei, 5787`. */
  hebrewDate: string
  /** The same date in Hebrew, e.g. `כ״ט תִּשְׁרֵי תשפ״ז`. */
  hebrewDateHe: string
  /**
   * True when this Shabbat displaces the regular weekly reading, such as
   * Shabbat Chol ha-Moed or a festival Shabbat. The page says so plainly rather
   * than printing a weekly portion where none is read.
   */
  isSpecial: boolean
  /** The seven aliyot plus the maftir, in the order they are called. */
  aliyot: PortionAliyah[]
  /** The Haftarah. Absent only when the library returned no reading at all. */
  haftarah?: PortionHaftarah
  /** Why this week reads what it reads, when the library explains it. */
  reason?: string
}

/**
 * Today's date in the temple's timezone, as plain year, month and day numbers.
 *
 * `Intl.DateTimeFormat` with `en-CA` writes the date as `YYYY-MM-DD`, which
 * keeps this independent of the host clock. Reading the host clock instead is
 * how a build in UTC lands on the wrong Shabbat for an American congregation
 * on a Sunday evening.
 */
export function templeToday(
  timeZone: string,
  now: Date = new Date()
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)

  const [year, month, day] = parts.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error(`Could not read today's date in ${timeZone}: ${parts}`)
  }
  return { year, month, day }
}

/**
 * Absolute day number for a Gregorian date, which is how the Hebrew calendar
 * counts. Noon UTC stands in for the day so the conversion cannot slip across a
 * boundary on a machine whose clock is not on UTC.
 */
function absoluteDay(year: number, month: number, day: number): number {
  return greg.greg2abs(new Date(Date.UTC(year, month - 1, day, 12)))
}

/** `Bereshit` or `Matot-Masei` to `bereshit` or `matot-masei`. */
function toSlug(parsha: string[]): string {
  return parsha
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Turns a library passage into the page's shape. */
function toAliyah(key: string, aliyah: Aliyah): PortionAliyah {
  return {
    key,
    label: key === 'M' ? 'Maftir' : `Aliyah ${Number(key)}`,
    book: aliyah.k,
    begin: aliyah.b,
    end: aliyah.e,
    verses: aliyah.v,
    reason: aliyah.reason
  }
}

/**
 * The seven aliyot then the maftir, in the order they are called.
 *
 * The weekday branch of the library's union carries no full kriyah, only the
 * Monday and Thursday aliyot, so a reading without one yields an empty list
 * and the page simply shows no table rather than a partial one.
 */
function toAliyot(leyning: Leyning | LeyningWeekday | undefined): PortionAliyah[] {
  if (!leyning || !('fullkriyah' in leyning)) return []
  return ['1', '2', '3', '4', '5', '6', '7', 'M']
    .filter((key) => leyning.fullkriyah[key])
    .map((key) => toAliyah(key, leyning.fullkriyah[key]))
}

/**
 * The Haftarah, first passage when the reading spans two.
 *
 * The library's return type is a union that includes a weekday reading with no
 * Haftarah. That branch cannot be reached here: `Sedra.lookup` always hands
 * back a Shabbat, and a Shabbat reading always carries both a full kriyah and a
 * Haftarah. The check below makes that explicit rather than casting it away, so
 * a caller who ever passes a Monday gets no Haftarah instead of a crash.
 */
function toHaftarah(leyning: Leyning | LeyningWeekday | undefined): PortionHaftarah | undefined {
  if (!leyning || !('haft' in leyning)) return undefined
  const first = Array.isArray(leyning.haft) ? leyning.haft[0] : leyning.haft
  if (!first) return undefined
  return {
    summary: leyning.haftara,
    book: first.k,
    begin: first.b,
    end: first.e,
    reason: first.reason ?? leyning.reason?.haftara
  }
}

/**
 * Reads the portion for the Shabbat on or after an absolute day number.
 *
 * Both public entry points go through here, so this week's reading and the
 * coming weeks cannot be built by two different rules.
 *
 * `Sedra.lookup` already answers what the page is asking: given any day of the
 * week it returns the reading for the Shabbat coming, and given a Shabbat it
 * returns that day's reading. So there is no "which Saturday is this"
 * arithmetic here to get wrong.
 */
function readPortion(absolute: number): WeeklyPortion {
  const hdate = new HDate(absolute)
  const sedra = getSedra(hdate.getFullYear(), false).lookup(absolute)
  const leyning = getLeyningOnDate(sedra.hdate, false, false, 'en')
  const shabbatAbsolute = sedra.hdate.rd ?? absolute
  const hebrewDateEvent = new HebrewDateEvent(sedra.hdate)

  return {
    slug: toSlug(sedra.parsha),
    nameEn: leyning?.name.en ?? sedra.parsha.join('-'),
    nameHe: leyning?.name.he ?? '',
    summary: leyning?.summary ?? '',
    shabbatDate: new Date(greg.abs2greg(shabbatAbsolute)),
    hebrewDate: hebrewDateEvent.render('en'),
    hebrewDateHe: hebrewDateEvent.render('he'),
    isSpecial: sedra.chag,
    aliyot: toAliyot(leyning),
    haftarah: toHaftarah(leyning),
    reason: sedra.chag ? 'A special reading for this Shabbat' : undefined
  }
}

/**
 * The Torah portion read on the Shabbat of the week that `now` falls in.
 *
 * The shape is always filled in: on a festival Shabbat the reading is that
 * festival's, flagged `isSpecial`, rather than a weekly portion that is not
 * read that week.
 */
export function getWeeklyPortion(timeZone: string, now: Date = new Date()): WeeklyPortion {
  const { year, month, day } = templeToday(timeZone, now)
  return readPortion(absoluteDay(year, month, day))
}

/**
 * The next `count` portions after this week's, so a member can see what is
 * coming without leaving the page.
 */
export function getUpcomingPortions(
  timeZone: string,
  count: number,
  now: Date = new Date()
): WeeklyPortion[] {
  const { year, month, day } = templeToday(timeZone, now)
  // Start seven days out, so this week's own portion is not repeated.
  const first = absoluteDay(year, month, day) + 7

  return Array.from({ length: count }, (_unused, week) => readPortion(first + week * 7))
}
