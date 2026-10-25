/**
 * Fixed holy days for the current Hebrew year, computed at build time
 * (spec 0008).
 *
 * The library returns every observance — Rosh Chodesh, minor fasts,
 * intermediate days — and this module keeps only the days the printed
 * machzor treats as yom tov. The English and Hebrew names, plus any
 * material link, come from the temple's printed year book, carried here as
 * data rather than fetched from a third party.
 *
 * Nothing in this module touches the network. The caller supplies the
 * Hebrew year; `holyDaysForYear` is pure and fully testable.
 */
import { calendar } from '@hebcal/core'

/**
 * One holy day, ready for the page to render.
 */
export interface HolyDay {
  /** Gregorian date of the holy day, at midnight UTC. */
  date: Date
  /** English name as written in the temple's machzor. */
  english: string
  /** Hebrew name from the machzor, absent when the temple writes none. */
  hebrew?: string
  /** Link to a service page or printed PDF the temple points at. */
  material?: string
}

/**
 * One entry from the printed machzor: the library's simplified name maps to
 * the temple's own English name, Hebrew name, and material link. The basename
 * is what `HolidayEvent.basename()` returns, stripping qualifiers like ` II`
 * or `(observed)`.
 */
const MACHZOR: readonly {
  /** The library's basename for the holiday, e.g. `Rosh Hashana`. */
  basename: string
  /** The English name the temple uses. */
  english: string
  /** Hebrew name from the machzor, when the temple writes one. */
  hebrew?: string
  /** Link to the service page or PDF for this day. */
  material?: string
}[] = [
  {
    basename: 'Rosh Hashana',
    english: 'Rosh Hashanah',
    hebrew: 'ראש השנה',
    material: '/services/rosh-hashanah'
  },
  {
    basename: 'Yom Kippur',
    english: 'Yom Kippur',
    hebrew: 'יום כיפור',
    material: '/services/yom-kippur'
  },
  { basename: 'Sukkot', english: 'Sukkot', hebrew: 'סוכות', material: '/services/sukkot' },
  { basename: 'Shmini Atzeret', english: 'Shemini Atzeret', hebrew: 'שמיני עצרת' },
  { basename: 'Simchat Torah', english: 'Simchat Torah', hebrew: 'שמחת תורה' },
  { basename: 'Pesach', english: 'Passover', hebrew: 'פסח', material: '/services/pesach' },
  { basename: 'Shavuot', english: 'Shavuot', hebrew: 'שבועות' }
]

/**
 * The fixed holy days for one Hebrew year, computed from the calendar and
 * mapped through the temple's printed machzor. Entries are keyed by their
 * Gregorian date so two distinct days sharing a name (the two days of Rosh
 * Hashanah, or the first and last days of Pesach) each keep their own row.
 * Dates come out at midnight UTC; format them on the page with `timeZone: 'UTC'`
 * so no timezone shift moves a date to the wrong day.
 */
export function holyDaysForYear(hebrewYear: number): HolyDay[] {
  const events = calendar({ year: hebrewYear, isHebrewYear: true, il: false })
  const byDate = new Map<string, HolyDay>()

  for (const event of events) {
    const basename = event.basename()
    const rendered = event.render()
    const name = rendered || basename
    if (!name) continue

    // 1. Exact match on basename, then on render() — handles cases where the
    //    library returns a clean name like `Shemini Atzeret` or `Simchat Torah`
    //    for each distinct day.
    let entry = MACHZOR.find((item) => item.basename.toLowerCase() === basename.toLowerCase())
    if (!entry) {
      entry = MACHZOR.find((item) => item.basename.toLowerCase() === rendered.toLowerCase())
    }

    // 2. Substring match on basename, then on render() — handles qualifiers
    //    like ` II` or `(observed)` that basename() strips.
    if (!entry) {
      entry = MACHZOR.find((item) => basename.toLowerCase().includes(item.basename.toLowerCase()))
    }
    if (!entry) {
      entry = MACHZOR.find((item) => rendered.toLowerCase().includes(item.basename.toLowerCase()))
    }

    if (!entry) continue

    const gregDate = event.getDate().greg()
    const key = gregDate.toISOString().slice(0, 10)

    if (!byDate.has(key)) {
      byDate.set(key, {
        date: gregDate,
        english: entry.english,
        ...(entry.hebrew ? { hebrew: entry.hebrew } : {}),
        ...(entry.material ? { material: entry.material } : {})
      })
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}
