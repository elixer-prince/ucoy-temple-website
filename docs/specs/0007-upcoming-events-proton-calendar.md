# 0007. Upcoming events from a Proton Calendar feed, read at build time

**Status**: Assumed
**Date**: 2026-10-12
**Authorized by**: the engineer, during /develop

## Owed decision

Spec 0001, AC-2, says the upcoming events on the home page come from the temple's Google Calendar, shown in an agenda view, and that staff add or change an event only in Google Calendar with no redeploy and no repository change. That is not what the temple uses any more. The temple runs on Proton, so the real choice of calendar provider, and how the events reach the page, has not been settled in a spec that was deliberated. This build assumes an answer and goes on.

## Assumption built on

The temple keeps its events in Proton Calendar. Proton can share a calendar as a link that returns an iCalendar feed, and that link can be read by anyone who has it, with no sign in. The site reads that feed while it builds, once per deploy, and writes the events into the home page as plain HTML.

That changes two things from spec 0001, AC-2, and this is the assumption the build is standing on:

- The provider is Proton Calendar, not Google Calendar.
- The events are read at build time, not by the visitor's browser at view time. Staff still edit only in Proton Calendar and touch no repository file, but a change reaches the site at the next deploy rather than at the next visit.

The gain is that no third party is contacted when a member opens the home page, which is what the offline promise and the privacy wording both want. The cost is that an event added minutes before a service shows up on the site only after the next deploy.

The feed is read without any secret. A Proton share link is a public address, so the value can live in the same public configuration the site already uses, and it is not a token that needs guarding.

Sharing a calendar as a link is a paid-plan feature in Proton. The temple is on the free plan for now, so `CALENDAR_URL` stays empty and the home page shows the quiet notice described under Requirements. This is a supported state, not a broken build: the rest of the site depends on nothing in the feed. Turning the list on later is a change in Proton's settings plus the deploy configuration, with no code change.

## Code area

- `src/config/site.ts`, where the calendar is configured
- `astro.config.mjs` and `.env.example`, where the public values are declared
- `src/lib/calendar-events.ts`, the new reader for the feed
- `src/pages/index.astro`, the home page that lists the events
- `src/pages/contact.astro`, the privacy wording that currently names Google Calendar
- `wrangler.toml`, which documents the values the temple sets in the dashboard

## Requirements

Seeds carried from the scope, not yet agreed with the temple:

- The home page lists upcoming events, read from the temple's calendar, in the temple's local timezone.
- Staff add, change, or cancel an event only in Proton Calendar, with no repository change. A deploy publishes the change.
- A visitor's browser contacts no third party to see the list, so the page works offline once the service worker has cached it.
- The page states plainly how fresh the list can be, so no one is misled about an event added today.
- With no feed configured, the build still succeeds and the page shows a quiet notice rather than an empty panel or a broken embed.

## Ratify

This decision was recorded by /develop, not deliberated. Run `/architect upcoming events calendar` to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature done.
