/**
 * Tests for the build time events module (spec 0007).
 *
 * The parsing half is pure, so these run with no network and a pinned window.
 * Three things can go quietly wrong, and each has a case below. First, the
 * window: an event outside it must be dropped, or the home page grows a list of
 * last month's gatherings. Second, a repeating rule: it must expand into one
 * row per week inside the window, not one row carrying a rule the page cannot
 * read. Third, the field shapes: node-ical hands back a property as either a
 * string or an object with parameters, and the page must get one steady shape
 * either way. Fourth, Proton keeps a cancelled event in the feed instead of
 * deleting it, so a cancelled gathering must never reach the list.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { parseCalendarEvents, fetchCalendarEvents, type CalendarWindow } from './calendar-events'

/** A pinned window: the second half of October 2026, both ends inclusive. */
const OCTOBER: CalendarWindow = {
  from: new Date('2026-10-10T00:00:00Z'),
  to: new Date('2026-10-31T23:59:59Z')
}

/**
 * A feed written the way Proton writes one: CRLF endings, one VEVENT per
 * gathering, and each case the module has to handle sitting in the same file.
 */
const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//UCOY//Temple Calendar//EN',
  // One off, timed, with every optional field filled in.
  'BEGIN:VEVENT',
  'UID:board@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20261015T190000Z',
  'DTEND:20261015T210000Z',
  'SUMMARY:Board meeting',
  'LOCATION:Temple office',
  'DESCRIPTION:Monthly board gathering',
  'URL:https://ucoy.example/events/board',
  'END:VEVENT',
  // One off, all day, like a Holy Day: a date with no times.
  'BEGIN:VEVENT',
  'UID:holyday@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART;VALUE=DATE:20261018',
  'SUMMARY:Season of Dedication',
  'END:VEVENT',
  // One off, all day, spanning two days, whose end was written by the temple
  // and must survive.
  'BEGIN:VEVENT',
  'UID:season@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART;VALUE=DATE:20261023',
  'DTEND;VALUE=DATE:20261025',
  'SUMMARY:Season gathering',
  'END:VEVENT',
  // One off, from before the window, which must be dropped.
  'BEGIN:VEVENT',
  'UID:past@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20260901T190000Z',
  'SUMMARY:A gathering in September',
  'END:VEVENT',
  // One off, carrying a language parameter, which arrives as an object.
  'BEGIN:VEVENT',
  'UID:language@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20261020T170000Z',
  'SUMMARY;LANGUAGE=en:Study circle',
  'END:VEVENT',
  // One off, with no title at all, which needs the fallback.
  'BEGIN:VEVENT',
  'UID:notitle@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20261022T170000Z',
  'END:VEVENT',
  // Repeating weekly, from the Saturday before the window opens.
  'BEGIN:VEVENT',
  'UID:weekly@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20261003T180000Z',
  'DTEND:20261003T200000Z',
  'SUMMARY:Shabbat morning',
  'RRULE:FREQ=WEEKLY;BYDAY=SA',
  'END:VEVENT',
  // One off that was cancelled: Proton keeps it in the feed instead of
  // deleting it, so the reader has to drop it by its status.
  'BEGIN:VEVENT',
  'UID:cancelled@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20261026T170000Z',
  'SUMMARY:Cancelled study circle',
  'STATUS:CANCELLED',
  'END:VEVENT',
  // Repeating weekly on Tuesdays, with one occurrence cancelled. The
  // cancelled week reaches the reader as an override carrying its own status,
  // while the other weeks of the same series must survive.
  'BEGIN:VEVENT',
  'UID:tuesday@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'DTSTART:20261006T200000Z',
  'DTEND:20261006T210000Z',
  'SUMMARY:Weeknight study',
  'RRULE:FREQ=WEEKLY;BYDAY=TU',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:tuesday@ucoy.example',
  'DTSTAMP:20260101T000000Z',
  'RECURRENCE-ID:20261013T200000Z',
  'DTSTART:20261013T200000Z',
  'DTEND:20261013T210000Z',
  'SUMMARY:Weeknight study',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n')

/** Every event the feed yields inside the window, soonest first. */
const events = parseCalendarEvents(ICS, OCTOBER)

/** Just the events carrying the given title. */
function titled(title: string) {
  return events.filter((event) => event.title === title)
}

describe('the window decides what reaches the list', () => {
  it('keeps an event that starts inside the window', () => {
    expect(titled('Board meeting')).toHaveLength(1)
  })

  it('drops an event from before the window', () => {
    expect(titled('A gathering in September')).toHaveLength(0)
  })

  it('sorts every row soonest first', () => {
    const starts = events.map((event) => event.start.getTime())
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })
})

describe('a repeating rule becomes one row per week', () => {
  it('expands the weekly entry across the window', () => {
    // Four Saturdays fall inside the window: the 10th, 17th, 24th, and 31st.
    // Left unexpanded it would be one row reading "every Saturday" to a member,
    // which is not a date anyone can act on.
    expect(titled('Shabbat morning')).toHaveLength(4)
  })

  it('spaces the rows seven days apart, all inside the window', () => {
    const starts = titled('Shabbat morning').map((event) => event.start.getTime())
    const week = 7 * 24 * 60 * 60 * 1000
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i] - starts[i - 1]).toBe(week)
    }
    for (const start of starts) {
      expect(start).toBeGreaterThanOrEqual(OCTOBER.from.getTime())
      expect(start).toBeLessThanOrEqual(OCTOBER.to.getTime())
    }
  })
})

describe('a cancelled event never reaches the list', () => {
  it('drops a cancelled event that stays in the feed', () => {
    // Proton keeps a cancelled entry in the feed instead of deleting it, so
    // the home page would otherwise list a gathering that is not happening.
    expect(titled('Cancelled study circle')).toHaveLength(0)
  })

  it('drops a cancelled week while the rest of the series survives', () => {
    // Tuesdays in the window are the 13th, 20th and 27th. The 13th arrives as
    // a cancelled override, so two rows must remain, on the 20th and 27th.
    const studyNights = titled('Weeknight study')
    expect(studyNights).toHaveLength(2)
    const days = studyNights.map((event) => event.start.getUTCDate())
    expect(days).toEqual([20, 27])
  })
})

describe('every field reaches the page as one steady shape', () => {
  it('reads an all day event as a date with no invented time', () => {
    // The page must never print a clock time beside a Holy Day.
    expect(titled('Season of Dedication')[0].allDay).toBe(true)
    expect(titled('Board meeting')[0].allDay).toBe(false)
  })

  it('resolves location, description, url and end to plain values', () => {
    const [board] = titled('Board meeting')
    expect(board.location).toBe('Temple office')
    expect(board.description).toBe('Monthly board gathering')
    expect(board.url).toBe('https://ucoy.example/events/board')
    expect(board.end).toBeInstanceOf(Date)
  })

  it('resolves a property carrying a language parameter to its plain text', () => {
    // SUMMARY;LANGUAGE=en arrives as { val, params } in some releases and as a
    // bare string in others. The page must see the text either way.
    expect(titled('Study circle')).toHaveLength(1)
  })

  it('falls back to a steady title when the feed carries none', () => {
    expect(titled('Untitled event')).toHaveLength(1)
  })

  it('fills an absent optional field with null, not undefined', () => {
    const [holyDay] = titled('Season of Dedication')
    expect(holyDay.location).toBeNull()
    expect(holyDay.description).toBeNull()
    expect(holyDay.url).toBeNull()
    // The parser gives a one day all day event an end one day on, which is
    // the RFC's own default rather than anything the feed carried, so the
    // reader drops it.
    expect(holyDay.end).toBeNull()
    // A timed event with no end arrives the same way: the parser repeats the
    // start, and a repeat is the same absence in another shape.
    expect(titled('Untitled event')[0].end).toBeNull()
    // An end the temple did write survives: the season gathering runs the
    // two days from the 23rd to the 25th.
    const [season] = titled('Season gathering')
    expect(season.allDay).toBe(true)
    expect(season.end!.getTime() - season.start.getTime()).toBe(2 * 86_400_000)
  })
})

describe('a feed that carries nothing usable is not an error', () => {
  it('returns an empty list for empty text', () => {
    expect(parseCalendarEvents('', OCTOBER)).toEqual([])
  })

  it('returns an empty list for a calendar holding no events', () => {
    const empty = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'END:VCALENDAR'].join('\r\n')
    expect(parseCalendarEvents(empty, OCTOBER)).toEqual([])
  })
})

describe('the fetch half fails loudly so the page can fall back quietly', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses the body when the feed answers ok', async () => {
    vi.stubGlobal('fetch', async () => new Response(ICS, { status: 200 }))
    const rows = await fetchCalendarEvents('https://example.test/feed', OCTOBER)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('throws when the feed answers with an error status', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404, statusText: 'Not Found' }))
    await expect(fetchCalendarEvents('https://example.test/feed', OCTOBER)).rejects.toThrow(/404/)
  })
})
