import { describe, it, expect } from 'vitest'
import { holyDaysForYear } from './holy-days'

const timeZone = 'America/New_York'

function dayOf(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const expected5787: [string, string][] = [
  ['2026-09-12', 'Rosh Hashanah'],
  ['2026-09-13', 'Rosh Hashanah'],
  ['2026-09-21', 'Yom Kippur'],
  ['2026-09-26', 'Sukkot'],
  ['2026-09-27', 'Sukkot'],
  ['2026-10-03', 'Shemini Atzeret'],
  ['2026-10-04', 'Simchat Torah'],
  ['2027-04-22', 'Passover'],
  ['2027-04-23', 'Passover'],
  ['2027-04-28', 'Passover'],
  ['2027-04-29', 'Passover'],
  ['2027-06-11', 'Shavuot'],
  ['2027-06-12', 'Shavuot']
]

describe('holyDaysForYear (spec 0009)', () => {
  const days = holyDaysForYear(5787, timeZone)

  it('computes the fixed holy days of 5787, one entry per date, in order', () => {
    const actual = days.map((d) => [dayOf(d.date), d.english] as [string, string])
    expect(actual).toEqual(expected5787)
    expect(new Set(actual.map(([date]) => date)).size).toBe(actual.length)
  })

  it('carries the Hebrew name from the machzor where the temple writes one', () => {
    for (const day of days) {
      expect(day.hebrew).toMatch(/^[\u0591-\u05f4\s]+$/)
    }
  })

  it('links shabbatonim to their pages under /shabbatonim/ and leaves other days unlinked', () => {
    const byName = new Map(days.map((d) => [d.english, d.material]))
    expect(byName.get('Yom Kippur')).toBe('/shabbatonim/yom-kippur')
    expect(byName.get('Sukkot')).toBe('/shabbatonim/sukkot')
    expect(byName.get('Passover')).toBe('/shabbatonim/pesach')
    expect(byName.get('Rosh Hashanah')).toBeUndefined()
    expect(byName.get('Shemini Atzeret')).toBeUndefined()
    expect(byName.get('Simchat Torah')).toBeUndefined()
    expect(byName.get('Shavuot')).toBeUndefined()
  })

  it('keeps Erev and Chol HaMoed intermediate days out of the list', () => {
    const dates = days.map((d) => dayOf(d.date))
    expect(dates).not.toContain('2026-09-11') // Erev Rosh Hashanah
    expect(dates).not.toContain('2026-09-20') // Erev Yom Kippur
    expect(dates).not.toContain('2026-09-25') // Erev Sukkot
    expect(dates).not.toContain('2026-09-28') // Sukkot Chol HaMoed
    expect(dates).not.toContain('2027-04-24') // Pesach Chol HaMoed
  })

  it('is pure: the default timezone is the temple zone and the list does not change with the build clock', () => {
    expect(holyDaysForYear(5787)).toEqual(holyDaysForYear(5787, timeZone))
    const again = holyDaysForYear(5787, timeZone)
    expect(again).toEqual(days)
  })
})
