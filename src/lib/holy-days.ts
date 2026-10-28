/**
 * Fixed holy days for the current Hebrew year, computed at build time
 * (spec 0009).
 *
 * The library returns every observance — Rosh Chodesh, minor fasts,
 * intermediate days — and this module keeps only the days the printed
 * machzor treats as yom tov. The English and Hebrew names, plus any
 * material link, come from the temple's printed year book, carried here as
 * data rather than fetched from a third party.
 *
 * Nothing in this module touches the network. The caller supplies the
 * Hebrew year and the temple's timezone, so `holyDaysForYear` is pure and
 * fully testable.
 */
import { calendar } from '@hebcal/core'

/**
 * One holy day, ready for the page to render.
 */
export interface HolyDay {
  /** Gregorian date of the holy day, at the start of the day in the temple's timezone. */
  date: Date
  /** English name as written in the temple's machzor. */
  english: string
  /** Hebrew name from the machzor, absent when the temple writes none. */
  hebrew?: string
  /** Link to a service page or printed PDF the temple points at. */
  material?: string
}

/**
 * One entry from the printed machzor: the library's name maps to the temple's
 * own English name, Hebrew name, and material link. Shabbatonim link to their
 * pages under /shabbatonim/ (spec 0003), not /services/.
 */
const MACHZOR: readonly {
  /** The library's basename for the holiday, e.g. `Rosh Hashana`. */
  basename: string
  /** The English name the temple uses. */
  english: string
  /** Hebrew name from the machzor, when the temple writes one. */
  hebrew?: string
  /** Link to the service page or PDF for this day, when the temple points at one. */
  material?: string
}[] = [
  {
    basename: 'Rosh Hashana',
    english: 'Rosh Hashanah',
    hebrew: 'ראש השנה'
  },
  {
    basename: 'Yom Kippur',
    english: 'Yom Kippur',
    hebrew: 'יום כיפור',
    material: '/shabbatonim/yom-kippur'
  },
  { basename: 'Sukkot', english: 'Sukkot', hebrew: 'סוכות', material: '/shabbatonim/sukkot' },
  { basename: 'Shmini Atzeret', english: 'Shemini Atzeret', hebrew: 'שמיני עצרת' },
  { basename: 'Simchat Torah', english: 'Simchat Torah', hebrew: 'שמחת תורה' },
  { basename: 'Pesach', english: 'Passover', hebrew: 'פסח', material: '/shabbatonim/pesach' },
  { basename: 'Shavuot', english: 'Shavuot', hebrew: 'שבועות' }
]

const ROMAN_DAY = '(I|II|III|IV|V|VI|VII|VIII)'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The Gregorian civil date of a holiday, as UTC year/month/day numbers. */
function gregParts(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  }
}

/** Start of the given civil day in the given IANA timezone, as a Date. */
function startOfDayInZone(year: number, month: number, day: number, timeZone: string): Date {
  const target = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const base = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  const zoneDate = (ms: number): string =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(ms))
  // Step hour by hour across a 32 hour window around midnight UTC. Every civil
  // day appears in that window for every IANA zone, so the temple's zone is
  // always found without guessing an offset.
  for (let offset = -16; offset <= 16; offset += 1) {
    const candidate = base + offset * 3_600_000
    if (zoneDate(candidate) !== target) continue
    // Snap back to the first hour that still renders as the target day: that
    // is the start of the day in the temple's timezone.
    let start = candidate
    while (zoneDate(start - 3_600_000) === target) {
      start -= 3_600_000
    }
    return new Date(start)
  }
  return new Date(base)
}

/**
 * The fixed holy days for one Hebrew year, computed from the calendar and
 * mapped through the temple's printed machzor. Entries are keyed by their
 * Gregorian date so two distinct days sharing a name (the two days of Rosh
 * Hashanah, or the first and last days of Pesach) each keep their own row.
 * Erev entries and Chol HaMoed intermediate days are observances, not the
 * yom tov days the machzor lists, so they are not listed.
 */
export function holyDaysForYear(
  hebrewYear: number,
  timeZone: string = 'America/New_York'
): HolyDay[] {
  const events = calendar({ year: hebrewYear, isHebrewYear: true, il: false })
  const byDate = new Map<string, HolyDay>()

  for (const event of events) {
    const rendered = event.render()
    if (!rendered) continue

    // Erev entries and Chol HaMoed intermediate days are not yom tov.
    if (rendered.startsWith('Erev ')) continue
    if (rendered.includes('(CH') || rendered.includes('Chol HaMoed')) continue

    let entry: (typeof MACHZOR)[number] | undefined
    for (const candidate of MACHZOR) {
      const b = candidate.basename
      if (rendered === b) {
        entry = candidate
        break
      }
      // The library appends the Hebrew year to the first day label, e.g.
      // `Rosh Hashana 5787`.
      if (rendered === `${b} ${hebrewYear}`) {
        entry = candidate
        break
      }
      // Numbered days, e.g. `Sukkot I` or `Pesach VIII`.
      const dayRegex = new RegExp(`^${escapeRegExp(b)} (${ROMAN_DAY})$`)
      if (dayRegex.test(rendered)) {
        entry = candidate
        break
      }
    }
    if (!entry) continue

    const { year, month, day } = gregParts(event.getDate().greg())
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (byDate.has(key)) continue

    byDate.set(key, {
      date: startOfDayInZone(year, month, day, timeZone),
      english: entry.english,
      ...(entry.hebrew ? { hebrew: entry.hebrew } : {}),
      ...(entry.material ? { material: entry.material } : {})
    })
  }

  return [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}
