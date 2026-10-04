# 0005 · Build time Torah portion for the weekly reading page

**Status**: Superseded by [0006](0006-commentary-for-every-portion.md)
**Date**: 2026-10-04
**Authorized by**: engineer, during /develop

## Owed decision

How the weekly Torah portion page sources its content, given that the reading
changes every week while the site is static and its content lives as files.

## Assumption built on

The reading is derived from the Hebrew calendar at build time through
`@hebcal/core` and `@hebcal/leyning`, rather than being hand written per week or
fetched at runtime. The temple timezone from `SITE_CONFIG.calendarTimezone`
decides which week it is and the Diaspora schedule decides the reading, so the
page is correct for whatever week the build runs in and never goes stale between
rebuilds. Only the temple's own teaching is hand written, one file per portion
in `src/content/portion-notes/`, paired by the portion slug.

## Code area

- `src/lib/torah-portion.ts` and `src/lib/torah-portion.test.ts`
- `src/pages/torah-portion.astro` and `src/torah-portion.wiring.test.ts`
- `src/content/portion-notes/` and the `portionNotes` collection in
  `src/content.config.ts`
- The `This Week's Torah Portion` entry in `src/config/nav.ts`

## Requirements

- The page names the portion, its Hebrew name, the seven aliyot, the maftir, and
  the Haftarah, all for the Shabbat of the temple's current week
- A festival Shabbat is marked as a special reading rather than shown as a
  weekly portion that is not read that day
- A portion with no authored note still renders the full reading
- Hebrew direction is styled only by `src/styles/prose.css`
- The page is reachable from the sidebar and works offline

## Ratify

This decision was recorded by /develop, not deliberated. Run
`/architect sabbath evening & Torah portion page` to deliberate and ratify it.
Until then it stays flagged as an owed decision; it does not block marking the
feature `done`.

**Outcome**: `/architect` deliberated this and confirmed the assumption holds.
The build time computation is correct and the code needs no rework. Spec 0006
carries the full decision record and extends it to the commentary pages, which
did not exist when this spec was written.

Two things this spec leaves open, both belonging to later features rather than
to this build:

- The reading is correct for the week of the build. A rebuild is what carries
  the page forward, so the deployment cadence is a real question, and it belongs
  with the Holy Days calendar (scope feature 12).
- The page cites the reading rather than reproducing the verse text. Adding
  verse text means choosing a text source and its licensing, which is its own
  decision.
