/**
 * The annual cycle of Torah portions (scope feature 24, spec 0006).
 *
 * The weekly page needs one portion, the week it is read in. A commentary page
 * needs the opposite: every portion, in the order the Torah is read, so that
 * a portion page is a stable address that works in any year rather than one that
 * exists only in the year it was built.
 *
 * That creates the problem this module exists to solve. A portion page has to
 * show a reading, but a reading belongs to a date, and no date belongs to a
 * portion forever. Seven pairs of portions are read together in some years and
 * apart in others, so `Matot` has no reading of its own in a year where
 * `Matot-Masei` is read. A page that borrowed this week's reading would show
 * `Matot` with the aliyot of a doubled portion, and the citation would change
 * every rebuild.
 *
 * So each portion is read from a reference year in which it is read on its own,
 * found by asking the calendar rather than by a hand kept table. That is what
 * makes the citation stable: it is the portion's own reading, and it is the same
 * reading whatever day the build runs.
 *
 * The reference year is deliberately a fixed point in the past rather than
 * "this year", so the pages do not shift under the congregation as time passes.
 */
import { getSedra, greg, parshiot } from '@hebcal/core'
import { getWeeklyPortion, type WeeklyPortion } from './torah-portion'

/**
 * The 53 weekly portions, `Bereshit` through `Ha'azinu`.
 *
 * `parshiot` holds 54 names, but the last is `Vezot Haberakhah`, which is read
 * on Simchat Torah and never as a weekly parashah. Leaving it in would publish
 * a page for a reading no member is ever told to prepare, so the list is cut at
 * the last weekly portion. The names come from the library rather than from a
 * list here, so a transliteration the library corrects is corrected here too.
 */
export const WEEKLY_PORTIONS: readonly string[] = parshiot.slice(0, 53)

/**
 * Where the search for a solo reference year starts.
 *
 * Any year works as a starting point as long as every portion is found within a
 * reasonable number of years of it, which the calendar's own cycle guarantees.
 * `Matot` and `Masei` are read apart in only some years, so they are found last
 * and set how far the search has to reach.
 */
const REFERENCE_YEAR_START = 5780

/**
 * How many years the search may walk forward before giving up.
 *
 * A guard, not a limit in practice: the search finds all 53 within sixteen
 * years of the start. It exists so that a change in the calendar library, which
 * could in principle make a portion never stand alone, fails the build with a
 * clear message instead of silently publishing a page with no reading on it.
 */
const REFERENCE_YEAR_LIMIT = 40

/**
 * One portion's permanent page: the reading, and where it sits in the cycle.
 */
export interface CyclePortion extends WeeklyPortion {
  /**
   * Where this portion sits in the annual cycle, counting from zero. Two pages
   * reading alike would be hard to tell apart without it.
   */
  index: number
  /**
   * The Hebrew year whose reading this page shows. Recorded rather than hidden,
   * because it is the honest answer to "which year is this from", and because a
   * reader comparing the page with this week's scroll should know it is not
   * this week's scroll.
   */
  referenceYear: number
}

/** One portion's neighbours, for the reading ahead links. */
export interface CycleNeighbours {
  /** The portion before this one, wrapping from `Bereshit` back to `Ha'azinu`. */
  previous: CyclePortion
  /** The portion after this one, wrapping from `Ha'azinu` back to `Bereshit`. */
  next: CyclePortion
}

/** `Bereshit` to `bereshit`, the slug a commentary file is named after. */
export function portionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Every portion slug the site publishes, in cycle order. */
export function allPortionSlugs(): string[] {
  return WEEKLY_PORTIONS.map(portionSlug)
}

/**
 * A year in which this portion is read on its own, and no other year.
 *
 * `Sedra.find` returns a date only when the portion stands alone: given `Matot`
 * in a year where `Matot-Masei` is read it returns nothing, and `findContaining`
 * is what would find the doubled week instead. That difference is the whole
 * point of this function, so the narrow call is deliberate.
 */
function soloReferenceYear(name: string): number {
  for (let offset = 0; offset < REFERENCE_YEAR_LIMIT; offset += 1) {
    const year = REFERENCE_YEAR_START + offset
    if (getSedra(year, false).find(name)) return year
  }
  throw new Error(
    `No reference year found where ${name} is read on its own, within ` +
      `${REFERENCE_YEAR_START} to ${REFERENCE_YEAR_START + REFERENCE_YEAR_LIMIT}.`
  )
}

/**
 * A Gregorian date for a Hebrew absolute day number.
 *
 * `greg.abs2greg` is the library's own converter and is used rather than a
 * hand written one on purpose. An absolute day number counts days from a fixed
 * Hebrew epoch, so multiplying it into a Unix timestamp silently produces a
 * date thousands of years away, which reads as a real reading for the wrong
 * week rather than as an error.
 */
function instantFromAbsolute(absolute: number): Date {
  return greg.abs2greg(absolute)
}

/**
 * The reading for one portion, taken from a year it is read alone.
 *
 * The date the library hands back is converted to an instant and handed to
 * `getWeeklyPortion`, the same function the weekly page uses. Going through one
 * code path matters: two implementations of "what is the reading" would be free
 * to disagree, and a disagreement here would show a member a Haftarah that the
 * weekly page contradicts.
 *
 * The timezone is UTC on purpose. The weekly page passes the temple's timezone
 * because it has to know which day it is for the congregation; a permanent page
 * has no "this week" to resolve, so it uses the day number the calendar gave it
 * directly and lets nothing shift it.
 */
function cyclePortion(name: string, index: number): CyclePortion {
  const referenceYear = soloReferenceYear(name)
  const hdate = getSedra(referenceYear, false).find(name)

  // `find` answered a moment ago in `soloReferenceYear`, so a null here would
  // mean the calendar changed mid build. Failing loudly is right: a page with a
  // silently empty reading is the one thing this module exists to prevent.
  if (!hdate) {
    throw new Error(`${name} stopped resolving in Hebrew year ${referenceYear}.`)
  }

  const weekly = getWeeklyPortion('UTC', instantFromAbsolute(hdate.abs()))

  return { ...weekly, index, referenceYear }
}

/**
 * Every portion in the annual cycle, in the order the Torah is read.
 *
 * `Bereshit` first and `Ha'azinu` last, with the pairs that are sometimes read
 * together each appearing as its own portion rather than as a combined reading.
 * That is what makes a slug stable: the same address serves a portion whether or
 * not the year happens to double it.
 *
 * The result is built once and kept. Two callers need the whole cycle, the
 * route and the neighbours on every page, and rebuilding it each time would
 * resolve all 53 readings again for every page of the build. The readings are
 * fixed, so one build is enough.
 */
let cachedCycle: CyclePortion[] | undefined

export function getPortionCycle(): CyclePortion[] {
  cachedCycle ??= WEEKLY_PORTIONS.map((name, index) => cyclePortion(name, index))
  return cachedCycle
}

/**
 * The portion before and after this one, wrapping at both ends.
 *
 * The wrap is the point. `Ha'azinu` is the last portion of the year and the next
 * one read is `Bereshit`, so a member who reaches the end of the cycle and taps
 * onward should land on the beginning, not on a dead end.
 */
export function getCycleNeighbours(portion: CyclePortion): CycleNeighbours {
  const cycle = getPortionCycle()
  const size = cycle.length
  return {
    previous: cycle[(portion.index - 1 + size) % size]!,
    next: cycle[(portion.index + 1) % size]!
  }
}

/**
 * One portion by slug, or `undefined` when the slug is not a portion.
 *
 * The route uses the `undefined` to answer honestly: a slug that is not one of
 * the 53 is a bad address, not a portion whose commentary is unwritten, and the
 * two must not read the same to a member.
 */
export function getPortionBySlug(slug: string): CyclePortion | undefined {
  return getPortionCycle().find((portion) => portion.slug === slug)
}

/**
 * The portion page a weekly reading should link to, if there is one.
 *
 * Two cases reach this. On an ordinary week the slug is a plain portion name and
 * comes straight back. On a doubled week the calendar hands back a combined slug
 * such as `matot-masei`, and there is no page at that address because the pages
 * are one per portion, so the first portion of the pair answers for both.
 *
 * A festival Saturday is the third case and the reason this returns `undefined`
 * rather than always answering. The calendar names those by their own reading,
 * `shmini-atzeret` for instance, and no portion is called that. Taking the first
 * word of such a name would invent a page: `shmini` is not one of the 53, so the
 * link would point at an address that does not exist, on exactly the weeks a
 * member is most likely to be looking for it.
 *
 * The match is therefore against the whole slug first, and only then against the
 * first portion of a pair.
 */
export function slugForWeeklyReading(weeklySlug: string): string | undefined {
  const names = WEEKLY_PORTIONS.map(portionSlug)
  if (names.includes(weeklySlug)) return weeklySlug

  /*
   * A doubled week, matched against the pairs the cycle can actually produce.
   *
   * Two portions are read together only when they are neighbours in the annual
   * cycle, so the doubled slugs are the pairs of neighbours, worked out from the
   * same list the pages come from. Deriving them beats splitting the slug on the
   * separator, because a portion's own slug may contain a separator: `Achrei Mot`
   * is one portion whose slug is `achrei-mot`, so `achrei-mot-kedoshim` breaks
   * into `achrei` and `mot`, which are not portions at all, and the weekly page
   * would show no commentary link on a Shabbat when a real portion was read.
   *
   * Matching the whole slug against the pairs also keeps the festival case safe
   * without a special case of its own. `Shmini` is followed by `Tazria`, never by
   * `Atzeret`, so `shmini-atzeret` matches no pair and correctly has no page.
   */
  for (let index = 0; index < names.length - 1; index += 1) {
    if (`${names[index]}-${names[index + 1]}` === weeklySlug) return names[index]
  }

  return undefined
}
