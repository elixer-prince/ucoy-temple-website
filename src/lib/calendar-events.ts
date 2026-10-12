/**
 * Read the temple's upcoming events from a Proton Calendar feed (spec 0007).
 *
 * Proton can share a calendar as a link that returns an iCalendar (ICS) feed,
 * readable by anyone who holds the link, with no sign in. This module reads
 * that feed while the site builds and turns it into plain data the home page
 * renders as HTML. No visitor's browser contacts a third party to see the
 * list, which is what the offline promise and the privacy wording both want.
 *
 * The parsing half is pure and takes the ICS text, so it is testable with no
 * network. The fetching half is separate and only runs at build time.
 */
import { parseICS, expandRecurringEvent } from 'node-ical'

/**
 * One event, ready for the page to render. Every field is already resolved to
 * a plain JavaScript value: text is text, dates are Date objects, and absent
 * optional fields are null rather than missing, so the page never has to know
 * about iCalendar's shapes.
 */
export interface CalendarEvent {
  title: string
  start: Date
  end: Date | null
  /** True when the event is a date with no times, such as a Holy Day. */
  allDay: boolean
  location: string | null
  description: string | null
  /** Link to the event in Proton, when the feed carries one. */
  url: string | null
}

/**
 * Resolve a property that node-ical returns either as a plain string or as an
 * object of `{ val, params }` when the source carried a parameter such as
 * `LANGUAGE`. Returns null when there is nothing usable, so callers get one
 * steady shape instead of a union.
 */
function readText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : value
  }
  if (value !== null && typeof value === 'object' && 'val' in value) {
    const inner: unknown = (value as { val: unknown }).val
    if (typeof inner === 'string') {
      const trimmed = inner.trim()
      return trimmed === '' ? null : inner
    }
  }
  return null
}

/**
 * Resolve a date property. node-ical returns real Date objects, but a value can
 * still be absent or malformed in a hand written feed, so anything that is not
 * a usable Date becomes null.
 */
function readDate(value: unknown): Date | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null
}

/** Does this parsed component repeat? Only the presence of the rule matters. */
function repeats(event: RawVEvent): boolean {
  return event.rrule !== undefined && event.rrule !== null
}

/**
 * Is this an all day event? A date-only start is the reliable marker, and the
 * `datetype` property says the same thing in different words. Either is enough.
 */
function isAllDay(event: RawVEvent): boolean {
  const start = event.start
  if (start instanceof Date && 'dateOnly' in start && start.dateOnly === true) {
    return true
  }
  return event.datetype === 'date'
}

/**
 * Has this event been cancelled? Proton keeps a cancelled entry in the feed
 * instead of deleting it, so a cancelled service would otherwise still be
 * listed. The status can sit on the event itself or on a single cancelled
 * occurrence of a repeating event.
 */
function isCancelled(event: { status?: unknown } | null | undefined): boolean {
  return readText(event?.status)?.toUpperCase() === 'CANCELLED'
}

/** One day in milliseconds, the span node-ical gives a one day all day event. */
const ONE_DAY_MS = 86_400_000
/** The hour a DST transition can lend to or take from a local midnight. */
const DST_HOUR_MS = 3_600_000

/**
 * The end, kept only when it says more than the start already does.
 *
 * node-ical never leaves an end missing. With no DTEND or DURATION it repeats
 * the start for a timed event, and for an all day event it moves one day on,
 * which is the duration RFC 5545 gives a one day event anyway. Neither was
 * written by the temple, so neither is passed on: a page printing
 * "10:00 AM – 10:00 AM", or a span the feed never held, would be an invented
 * fact. A timed end is kept only when it falls later than the start. An all
 * day end is kept only when it reaches past the next local day — one day is
 * 23 to 25 hours across a DST transition, and two or more is at least 47.
 */
function realEnd(end: Date | null, start: Date, allDay: boolean): Date | null {
  if (!end) {
    return null
  }
  const span = end.getTime() - start.getTime()
  if (allDay) {
    return span > ONE_DAY_MS + DST_HOUR_MS ? end : null
  }
  return span > 0 ? end : null
}

/** Turn one resolved event into the plain shape the page renders. */
function toCalendarEvent(
  title: string,
  start: Date,
  end: Date | null,
  allDay: boolean,
  event: RawVEvent
): CalendarEvent {
  return {
    title,
    start,
    end: realEnd(end, start, allDay),
    allDay,
    location: readText(event.location),
    description: readText(event.description),
    url: readText(event.url)
  }
}

/**
 * The slice of time to look inside. Both ends are inclusive, compared in
 * absolute time, so the caller picks the instants and this module interprets
 * no timezone of its own.
 */
export interface CalendarWindow {
  from: Date
  to: Date
}

/**
 * Parse ICS text into upcoming events, soonest first.
 *
 * This is the pure half: no network, no clock of its own, and the window is
 * given in, so a test can pin every date. A recurring event is expanded across
 * the window, so a weekly Shabbat entry becomes one row per week rather than
 * one row carrying a rule nobody can read.
 */
export function parseCalendarEvents(ics: string, window: CalendarWindow): CalendarEvent[] {
  const parsed = parseICS(ics)
  const events: CalendarEvent[] = []

  for (const entry of Object.values(parsed)) {
    if (entry === null || entry === undefined || typeof entry !== 'object') {
      continue
    }
    if (!('type' in entry) || entry.type !== 'VEVENT') {
      continue
    }
    const event = entry as unknown as RawVEvent
    // A cancelled event stays in a Proton feed rather than being removed, so
    // it is dropped here, before any of its fields are read.
    if (isCancelled(event)) {
      continue
    }
    const title = readText(event.summary) ?? 'Untitled event'

    if (repeats(event)) {
      // A repeating event carries one start plus a rule. Expanding the rule
      // turns each occurrence into its own row inside the window.
      const instances = expandRecurringEvent(event as ExpandableEvent, {
        from: window.from,
        to: window.to,
        includeOverrides: true,
        excludeExdates: true
      })
      for (const instance of instances) {
        // A single cancelled week arrives as an override carrying its own
        // status, so the instance is checked as well as the base event.
        if (isCancelled(instance.event)) {
          continue
        }
        const start = readDate(instance.start)
        if (!start) {
          continue
        }
        const instanceTitle = readText(instance.summary) ?? title
        events.push(
          toCalendarEvent(instanceTitle, start, readDate(instance.end), instance.isFullDay, event)
        )
      }
      continue
    }

    // A one off event: take it only when its start falls inside the window.
    const start = readDate(event.start)
    if (!start || start < window.from || start > window.to) {
      continue
    }
    events.push(toCalendarEvent(title, start, readDate(event.end), isAllDay(event), event))
  }

  events.sort((a, b) => a.start.getTime() - b.start.getTime())
  return events
}

/**
 * Fetch a feed and parse it, returning upcoming events.
 *
 * This runs only while the site builds, never in a visitor's browser. It throws
 * when the feed cannot be read, so the caller decides whether that should fail
 * the build or fall back to a quiet notice.
 */
export async function fetchCalendarEvents(
  url: string,
  window: CalendarWindow
): Promise<CalendarEvent[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Calendar feed responded ${response.status} ${response.statusText}`)
  }
  return parseCalendarEvents(await response.text(), window)
}

/**
 * The parts of a parsed VEVENT this reader reads.
 *
 * node-ical types its parsed components as a wide union whose members share a
 * `type` tag. Rather than bind this module to the exact shape of that union,
 * which is large and has shifted between releases, this names only the fields
 * the reader actually uses. `readText` and `readDate` resolve node-ical's
 * "plain value or value with parameters" ambiguity in one place.
 */
interface RawVEvent {
  type: string
  summary?: unknown
  start?: unknown
  end?: unknown
  datetype?: unknown
  location?: unknown
  description?: unknown
  url?: unknown
  /** `CANCELLED` entries stay in a Proton feed and must never be listed. */
  status?: unknown
  /** Present when the event repeats. Its presence, not its shape, matters here. */
  rrule?: unknown
}

/**
 * The type `expandRecurringEvent` expects for its first argument, derived from
 * the function so this module does not have to name node-ical's VEvent type
 * directly.
 */
type ExpandableEvent = Parameters<typeof expandRecurringEvent>[0]
