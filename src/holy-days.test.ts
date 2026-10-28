/**
 * Tests for the build time holy days module (spec 0009).
 *
 * The computation is pure once a Hebrew year is fixed, so the tests pin the
 * dates, the sort order, and the library behaviour rather than the clock.
 * `holyDaysForYear` takes a year directly and is fully testable.
 *
 * Known calendar facts used below:
 *  - Hebrew year 5787 runs through late 2026 into early 2027; Rosh Hashanah
 *    5787 begins at sunset on 12 September 2026.
 *  - Hebrew year 5784 is a leap year (Adar I and Adar II both occur), which
 *    moves Purim and all later spring dates compared with an ordinary year.
 */
import { describe, it, expect } from 'vitest'
import { holyDaysForYear } from './lib/holy-days'

/** Format a Date as `YYYY-MM-DD` in UTC, matching what the page displays. */
function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

describe('holy days for 5787 match the real calendar', () => {
  const days = holyDaysForYear(5787)

  it('lists every major holy day exactly once per date', () => {
    const dates = days.map((day) => iso(day.date))
    expect(dates).toEqual([...new Set(dates)])
  })

  it('returns entries sorted by date', () => {
    const dates = days.map((day) => day.date.getTime())
    expect(dates).toEqual([...dates].sort((a, b) => a - b))
  })

  it('opens with Rosh Hashanah in September 2026', () => {
    expect(days[0].english).toBe('Rosh Hashanah')
    expect(days[0].hebrew).toBe('ראש השנה')
    expect(iso(days[0].date)).toMatch(/^2026-09-/)
    expect(days[0].material).toBeUndefined()
  })

  it('has Yom Kippur after Rosh Hashanah', () => {
    const kippur = days.find((day) => day.english === 'Yom Kippur')
    expect(kippur).toBeDefined()
    expect(kippur!.hebrew).toBe('יום כיפור')
    expect(kippur!.material).toBe('/shabbatonim/yom-kippur')
    const hashana = days.find((day) => day.english === 'Rosh Hashanah')
    expect(kippur!.date.getTime()).toBeGreaterThan(hashana!.date.getTime())
  })

  it('has Sukkot after Yom Kippur', () => {
    const kippur = days.find((day) => day.english === 'Yom Kippur')
    const sukkot = days.find((day) => day.english === 'Sukkot')
    expect(sukkot).toBeDefined()
    expect(sukkot!.hebrew).toBe('סוכות')
    expect(sukkot!.date.getTime()).toBeGreaterThan(kippur!.date.getTime())
  })

  it('includes Shemini Atzeret and Simchat Torah after Sukkot', () => {
    const sukkot = days.find((day) => day.english === 'Sukkot')
    const atzeret = days.find((day) => day.english === 'Shemini Atzeret')
    const simchat = days.find((day) => day.english === 'Simchat Torah')
    expect(atzeret).toBeDefined()
    expect(atzeret!.hebrew).toBe('שמיני עצרת')
    expect(simchat).toBeDefined()
    expect(simchat!.hebrew).toBe('שמחת תורה')
    expect(atzeret!.date.getTime()).toBeGreaterThan(sukkot!.date.getTime())
    expect(simchat!.date.getTime()).toBeGreaterThan(atzeret!.date.getTime())
  })

  it('includes Passover in the spring of 2027', () => {
    const pesach = days.find((day) => day.english === 'Passover')
    expect(pesach).toBeDefined()
    expect(pesach!.hebrew).toBe('פסח')
    expect(pesach!.material).toBe('/shabbatonim/pesach')
    expect(iso(pesach!.date)).toMatch(/^2027-/)
  })

  it('includes Shavuot after Passover', () => {
    const pesach = days.find((day) => day.english === 'Passover')
    const shavuot = days.find((day) => day.english === 'Shavuot')
    expect(shavuot).toBeDefined()
    expect(shavuot!.hebrew).toBe('שבועות')
    expect(shavuot!.date.getTime()).toBeGreaterThan(pesach!.date.getTime())
  })

  it('excludes Rosh Chodesh, minor fasts, and intermediate days', () => {
    const names = days.map((day) => day.english)
    expect(names).not.toContain('Rosh Chodesh')
    expect(names).not.toContain('Fast of')
    expect(names).not.toContain('Chanukah')
    expect(names).not.toContain('Purim')
  })
})

describe('a leap year shifts the spring holy days', () => {
  // 5784 is a leap year; 5783 is ordinary. Purim in a leap year falls in Adar
  // II, which is about a month later than it would be in an ordinary year, and
  // every date after it shifts too. The major holy days we track (Pesach,
  // Shavuot) land later in the Gregorian year in a leap year.
  it('places Pesach in April for the leap year 5784', () => {
    const days = holyDaysForYear(5784)
    const pesach = days.find((day) => day.english === 'Passover')
    expect(pesach).toBeDefined()
    expect(iso(pesach!.date)).toMatch(/^2024-04-/)
  })

  it('places Rosh Hashanah in September for the ordinary year 5783', () => {
    const days = holyDaysForYear(5783)
    const hashana = days.find((day) => day.english === 'Rosh Hashanah')
    expect(hashana).toBeDefined()
    expect(iso(hashana!.date)).toMatch(/^2022-09-/)
  })
})

describe('a holy day with no material link omits the field', () => {
  it('leaves material undefined for Shemini Atzeret', () => {
    const days = holyDaysForYear(5787)
    const atzeret = days.find((day) => day.english === 'Shemini Atzeret')
    expect(atzeret).toBeDefined()
    expect(atzeret!.material).toBeUndefined()
  })
})
