# 0010. Adopt PostHog for privacy friendly product analytics

**Date**: 2026-11-01
**Status**: Accepted

## Summary

The temple needs to see which service pages, resources, and Holy Days members use, and where they struggle. We will use PostHog Cloud to track page views, video plays, PDF downloads, contact form submissions, and search queries. Events collected while the site is offline are queued in the browser and sent when the connection returns. PostHog replaces the current Cloudflare Web Analytics so one tool handles everything, from basic page counts to custom events.

## Context

The site currently uses cookieless Cloudflare Web Analytics, which provides basic page view counts with zero configuration but cannot track custom events, funnels, or user journeys. The temple wants to understand which materials members actually use, how they navigate between pages, and where they drop off, so the congregation can prioritize content and improve the member experience.

The site has strict privacy constraints: no accounts, no sign in, no cookies (only localStorage for the theme choice), and a core promise that it works offline. Any analytics solution must respect these constraints. It must queue events while offline and deliver them when the connection returns, without losing data. It must not collect personal data by default, though it should leave room for optional identification when the temple adds member accounts in a future phase.

The site runs on Cloudflare Pages as a static Astro 7 build, with a hand written service worker for offline caching. The analytics SDK must work with this stack without requiring server side rendering or a build step change.

## Requirements

**User stories**:

- As a temple leader, I want to see which service pages and resources are viewed most, so I know what material matters to the congregation.
- As a temple leader, I want to see how visitors navigate from the home page to specific content, so I can improve the site structure.
- As a temple leader, I want to track video plays, PDF downloads, contact form submissions, and search queries, so I understand how members use the site beyond page views.
- As a temple leader, I want analytics to work even when members open the site offline, so I do not lose data from offline sessions.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Page views are recorded automatically for every page load, with the page path and referrer captured.
- **AC-2**: Video plays are recorded as a custom event when a member starts or completes a service video.
- **AC-3**: PDF downloads are recorded as a custom event when a member opens a resource PDF.
- **AC-4**: Contact form submissions are recorded as a custom event when a member sends a message through the contact form.
- **AC-5**: Search queries are recorded as a custom event, including whether the search returned zero results.
- **AC-6**: Events collected while the browser has no internet connection are queued in IndexedDB by the PostHog SDK and delivered when the connection returns, with no data loss.
- **AC-7**: No IP address is collected, and no session replay is enabled, so the analytics remain privacy friendly.
- **AC-8**: The analytics SDK loads only on production builds, not during local development.
- **AC-9**: A dedicated /privacy page explains what data PostHog collects, how long it is retained, and how members can opt out.

## Options considered

### Option 1: PostHog Cloud

PostHog is an open source analytics platform available as a hosted service or self hosted. It provides page views, custom events, funnels, heatmaps, and session replay. The SDK supports offline queuing via IndexedDB. The free tier includes 1 million events per month. IP collection and session replay can be disabled for maximum privacy.

**Pros**:

- Rich dashboard with funnels, heatmaps, and AI powered insights out of the box.
- Offline queuing built into the SDK with no manual work.
- Free tier covers the temple traffic comfortably.
- Opt in identification supports the future member account system without a migration.

**Cons**:

- PostHog stores the data on their servers, though IP collection can be disabled.
- The SDK is larger than a minimal analytics script (around 30 kilobytes minified).

### Option 2: Plausible Analytics

Plausible is a lightweight, GDPR friendly analytics alternative. It provides page views, referrers, and custom events with a very small script (around 9 kilobytes). No cookies are used by default.

**Pros**:

- Very small script footprint, minimal performance impact.
- Simple dashboard focused on essentials.
- Strong privacy story with no cookies and no IP storage.

**Cons**:

- Fewer features: no funnels, no heatmaps, no session replay, no AI insights.
- No free cloud tier; self host or pay from 9 dollars per month.
- Offline queuing is not as mature as PostHog.

### Option 3: Keep Cloudflare Web Analytics Only

Cloudflare Web Analytics is already enabled on the site. It is cookieless, requires no configuration, and provides basic page view counts.

**Pros**:

- Zero configuration and zero additional dependencies.
- No third party script to load.

**Cons**:

- Cannot track custom events, funnels, or user journeys.
- Cannot queue events offline.
- Does not meet any requirement beyond basic page views.

## Decision

**Chosen option**: Option 1: PostHog Cloud

Adopt PostHog Cloud as the site analytics platform, replacing Cloudflare Web Analytics, with IP collection disabled and session replay disabled.

**Implementation skills**: `astro-framework` (`.agents/skills/astro-framework/`)

## Rationale

PostHog meets every requirement: custom events for all five tracked actions, offline queuing via IndexedDB, opt in identification for the future account system, and a free tier that covers the temple traffic. Plausible is simpler but lacks funnels and the AI insights the temple wants, and its offline support is less mature. Cloudflare Analytics alone cannot track custom events at all, so it cannot satisfy the core requirements.

The engineer expressed a preference for PostHog based on its user friendly dashboard and AI capabilities. This aligns with the requirements: the temple wants both content popularity and navigation flow tracking, which PostHog handles natively with funnels and event sequences.

The main tradeoff is data residency: PostHog Cloud stores events on their servers. Mitigating this, IP collection is disabled entirely, and session replay is disabled, so no personal data is collected. The free tier retains data for one year, which matches the default retention choice.

## Feature design

**Data model sketch**:

No local data model. PostHog stores all events on their servers. The site sends events via the PostHog JavaScript SDK and relies on the SDK to handle queuing, batching, and delivery. The only local state is the IndexedDB queue maintained by the SDK itself.

**State transitions** (if applicable):

Not applicable. No state machine.

**API surface**:

Not applicable in the traditional sense. The PostHog SDK provides a client side API:

| Function                                  | Key inputs                               | Key outputs | Auth                    | Key errors                       |
| ----------------------------------------- | ---------------------------------------- | ----------- | ----------------------- | -------------------------------- |
| `posthog.capture(event_name, properties)` | event name (string), properties (object) | void        | PostHog project API key | Network error (queued for retry) |
| `posthog.page()`                          | optional page name (string)              | void        | PostHog project API key | Network error (queued for retry) |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action              | Value produced / displayed                 | Source                                                               |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| Page view           | page path, referrer                        | Browser location and document referrer, captured by `posthog.page()` |
| Video play          | video path, event type (start or complete) | Video component props and the HTML5 video play and ended events      |
| PDF download        | PDF slug                                   | Resource page link click handler                                     |
| Contact form submit | form action result (success or error)      | Contact form submission callback                                     |
| Search query        | query text, result count                   | Search component state after search completes                        |
| All events          | anonymous distinct ID                      | PostHog SDK generated random UUID, stored in localStorage            |

**Key invariants**:

- The PostHog API key is never committed to the repository; it is loaded from an environment variable at build time.
- The SDK loads only in production builds, guarded by `import.meta.env.PROD`.
- The service worker does not intercept PostHog API requests, so events reach PostHog directly when online.
- No session replay is active (disabled via SDK configuration).
- No IP address is collected (disabled via the PostHog project setting "Discard IP data"; the browser SDK no longer provides a client-side option for this).

**Security model**:

The PostHog project API key is public (it lives in the browser) but read only: it can send events but cannot read or modify the PostHog project configuration. No personal data is collected. The analytics are fully anonymous by default, with opt in identification available when the temple adds member accounts.

**Configuration required**:

- `POSTHOG_API_KEY`: the PostHog project API key, used to identify the site to PostHog
- `POSTHOG_HOST`: the PostHog instance URL (for example `https://us.i.posthog.com` for the US cloud region)

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a member visits the home page, opens a service page, plays a video, and downloads a PDF; all four events appear in the PostHog dashboard, verifies **AC-1**, **AC-2**, **AC-3**
- Offline queuing: a member opens the site in airplane mode, views pages and plays a video, then restores the connection; queued events are delivered and appear in the dashboard, verifies **AC-6**
- Privacy: the PostHog dashboard shows no IP address data and no session recordings, verifies **AC-7**
- Dev mode: running `npm run dev` loads the site without the PostHog SDK, and no network requests reach PostHog, verifies **AC-8**

## Build plan

1. Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` with placeholder values, and update `.gitignore` to exclude the real `.env` values, satisfies **AC-7**, **AC-8**
2. Install the `posthog-js` package and create `src/lib/posthog.ts` with the SDK initialization, IP disabled, session replay disabled, and a production only guard, satisfies **AC-7**, **AC-8**
3. Add automatic page view tracking to `src/layouts/Layout.astro` so every page load calls `posthog.page()`, satisfies **AC-1**
4. Add video play tracking to `src/components/Video.astro` so the video play and ended events fire a `posthog.capture` call with the video path, satisfies **AC-2**
5. Add PDF download tracking to the resource links so clicking a PDF resource fires a `posthog.capture` call with the PDF slug, satisfies **AC-3**
6. Add contact form submission tracking to `src/pages/contact.astro` so a successful form submit fires a `posthog.capture` call, satisfies **AC-4**
7. Add search query tracking to `src/pages/search.astro` so each search fires a `posthog.capture` call with the query text and result count, satisfies **AC-5**
8. Create `src/content/pages/privacy.mdx` as a new content page explaining what PostHog collects, data retention, and opt out instructions, satisfies **AC-9**
9. Update `src/config/nav.ts` to add the privacy page to the sidebar footer, satisfies **AC-9**
10. Disable Cloudflare Web Analytics in the Cloudflare dashboard and remove any Cloudflare Analytics references from the privacy wording, satisfies **AC-9**

## Consequences

**Positive**:

- The temple can see which content members use most and how they navigate the site.
- Offline events are preserved, so the analytics reflect actual usage even when members open the site without internet.
- One tool handles everything, replacing Cloudflare Web Analytics and simplifying the dependency list.
- Opt in identification is ready for the future member account system.

**Negative / tradeoffs**:

- PostHog stores data on their servers. Even with IP disabled, event data leaves the site.
- The SDK adds around 30 kilobytes to the initial page load, though it loads after the critical rendering path.
- The PostHog API key is visible in the browser, though it is read only.

**Neutral**:

- The privacy page needs to be maintained if PostHog changes its data practices or retention policy.
- The free tier limits events to 1 million per month; if the site grows beyond this, the temple will need to upgrade or self host.

## Follow-up

- [x] Disable Cloudflare Web Analytics in the Cloudflare dashboard after PostHog is verified working — done 2026-11-01, dead code removed from `astro.config.mjs`, `src/config/site.ts`, and `.env.example`
- [ ] Review the PostHog free tier limits after the site launches publicly and adjust if traffic approaches 1 million events per month

## References

**Project sources** (verifiable, in this repo):

- `AGENTS.md`: the site convention of no cookies, no tracking beyond cookieless Cloudflare Web Analytics, and offline as a core promise
- `src/layouts/Layout.astro`: the shell where page view tracking is added
- `src/components/Video.astro`: the video component where play tracking is added
- `src/pages/contact.astro`: the contact form where submission tracking is added
- `src/pages/search.astro`: the search page where query tracking is added
- `src/config/nav.ts`: the sidebar navigation where the privacy page link is added

**Practices & standards**:

- Privacy by design: disable IP collection and session replay by default, collect only what is needed
- Offline first: queue events in IndexedDB and deliver when the connection returns, matching the site core offline promise
