# 0009. Holy days calendar, computed from the Hebrew calendar

**Date**: 2026-10-23
**Status**: Proposed

## Summary

The temple's holy days are the fixed festival dates of the Hebrew calendar — Rosh Hashanah, Yom Kippur, Sukkot, Passover, Shavuot, and the concluding days. They are the same for every Jew and every observant house of worship, so they do not belong in a content file: they are a function of the calendar, not a record of temple activity. This spec decides how the site computes them at build time, how it displays them, and how the site is kept current without redeploy.

The calendar is the single source of truth for the fixed holy days. The upcoming events list on the home page stays with the Proton Calendar feed (spec 0007) — that is for meetings, gatherings, and seasonal events. The holy days calendar is its own page, computed from the Hebrew calendar, and it also owns the rebuild cadence that carries the Torah portion page forward (the open item in spec 0006).

## Context

The congregation teaches from a printed yearly machzor. Its holy days are known in advance and are the same every year, computed by the Hebrew calendar. The website must present them in the temple's local time, with links to the service pages and any printed material the temple points at.

The site is static output on Cloudflare Pages free tier. Nothing is fetched by the visitor's browser at view time. The holy days are computed once, at build time, with `@hebcal/core` — the same library the Torah portion module already uses. A rebuild is what carries the calendar forward, so rebuild cadence is not a detail but the whole reason the calendar stays current.

The Sunday before Rosh Hashanah, for example, is the last day of the Hebrew month of Elul. Computing it requires the day-of-week conventions of the Hebrew calendar, which `@hebcal/core` already resolves. No hand written list of dates can stay in step with the leap-year cycle.

## Requirements

**User stories**:

- As a member planning a visit, I want the holy days for the current year listed with their dates in the temple's local time so I know when to come and what to read.
- As a member arriving at the building, I want each holy day to link to the service page and any printed material it is observed with.
- As a volunteer, I want the site to stay current without me editing content files or redeploying.
- As a member reading the Torah portion page, I want the site to rebuild on a schedule so the week's reading never goes stale.

**Done when**:

- A page at `/holy-days` lists the fixed holy days for the current year, one entry per date, in local time, grouped under month headings.
- Each holy day entry shows the date, the English name, and the Hebrew name where the temple writes one, and links to the service page and any material the temple points at.
- The holy days are computed at build time from the Hebrew calendar, not typed by hand into a content file, so a new leap year or a moved date cannot go unnoticed.
- The home page links to the holy days calendar, and the calendar is in the offline precache.
- No visitor's browser contacts a third party to see the holy days.
- The site rebuilds on a schedule long enough that the week's Torah reading has time to appear after the calendar moves. The cadence belongs with this feature, because the page content changes with it.

## Decision

**Approach**: Tracer Bullet. One real page at `/holy-days` that lists the fixed holy days for the current year, computed at build time. The home page links to it. The site rebuilds monthly to keep the calendar current.

### Design

**Data model sketch**:

The holy days are a computed value, not a stored entity. There is no database row and no content file for a holy day. The module `src/lib/holy-days.ts` imports `@hebcal/core`, resolves each fixed holy day from the calendar for the current year in the temple's local timezone, and returns a list of plain objects:

- `date`: a `Date` in the temple's local timezone (the date the day begins, as the temple counts it)
- `english`: the English name, such as `Rosh Hashanah` or `Sukkot`
- `hebrew`: the Hebrew name where the temple writes one, absent when it does not
- `material`: an optional link to a service page or printed PDF the temple points at

The list is sorted by date. The page renders it grouped by month.

**Value sourcing**:

| Value displayed                            | Source                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| The list of holy days for the current year | Computed in `src/lib/holy-days.ts` from `@hebcal/core`, for the current year in the temple's local timezone |
| The date shown to the visitor              | The date resolved in the temple's local timezone, formatted with `toLocaleDateString`                       |
| The Hebrew name                            | The name written in the temple's printed machzor, carried in the holy days module                           |
| The service page link                      | The link the temple points at in the machzor, carried in the holy days module                               |
| The material link                          | The link to the PDF or booklet the temple points at, carried in the holy days module                        |
| The upcoming events                        | Proton Calendar feed, read at build time (spec 0007), listed on the home page and the holy days page        |

**Key invariants**:

- No holy day is ever typed by hand into a content file. Each is a computed value from the Hebrew calendar.
- The temple's local timezone is the only timezone that matters. A holy day that begins in the evening in America/Jamaica is the same holy day regardless of what the feed says.
- The holy days calendar and the upcoming events list do not collide. One is the fixed festivals, the other is the living calendar of meetings and gatherings.
- The site rebuilds on a schedule, and every build is recorded in the deploy log.

**Security model**: public site, no sign in, no sensitive data. The holy days are public. The scheduler needs no secrets.

**Configuration required**:

- No new environment variables. The temple's local timezone is taken from the site config's existing `calendarTimezone` value (default `America/New_York`).
- No third party credentials. The Hebrew calendar is an open source library.

**State transitions**: none. Holy days are computed, displayed, and replaced at the next build. There is no editing state.

**API surface**: none. This is a static site. The only surface is the page at `/holy-days` and the computed list the page consumes.

## Follow-up

- The scheduler needs a home. Cloudflare Pages schedules, GitHub Actions, or a small worker are all viable; the choice belongs with the team that runs the deploys, not with this spec.
- The printed machzor is the source of the holy day names and links. The temple takes the names and links from its printed year book, not from a third party, so the module carries them as data rather than fetching them.
- The Hebrew body face (scope feature 23) is the evidence scope that tells us whether the Hebrew names are legible. The holy days page is the best first test, because it shows the full Hebrew names for the whole year.
- The rebuild cadence for the Torah portion page — the open item in spec 0006 — is decided and scheduled here.
