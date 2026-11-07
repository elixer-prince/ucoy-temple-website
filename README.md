# United Congregation of Yisra'Yah — website

The public website for the United Congregation of Yisra'Yah, a temple replacing its Google Site with a custom build. It carries complete service and Holy Day materials that members can rely on from a phone, even with no internet.

It is a **static Astro site** published on **Cloudflare Pages** (free tier). There is no server, no database, and no sign in. Content lives as plain text files in the repository, so every change is a commit. Analytics are privacy friendly via PostHog with session recording disabled. The site is installable as a PWA.

## What the site contains

| Area                      | Address                                  | What it is                                                                          |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Home                      | `/`                                      | Temple information, upcoming events from the temple calendar                        |
| Contact                   | `/contact`                               | Message form (posts to a Formspree endpoint)                                        |
| Privacy                   | `/privacy`                               | What data the site collects and how it is used                                      |
| Holy Days calendar        | `/holy-days`                             | Fixed holy days computed at build time, grouped by month                            |
| This week's Torah portion | `/torah-portion`                         | The week's reading, computed at build time from the Hebrew calendar                 |
| Portion page              | `/portion/[slug]`                        | Reading + citations for all 53 weekly portions; commentary where written            |
| Commentary index          | `/commentary`                            | List of all 53 portions with links to each commentary page                          |
| Weekly services           | `/services` and `/services/[slug]`       | Shabbat morning, Friday evening home ritual, Saturday afternoon, closing of Shabbat |
| High Shabbatot            | `/shabbatonim` and `/shabbatonim/[slug]` | Pesach, Shavuot, Sukkot, Yom Teruah, Yom Kippur, and more                           |
| Resources                 | `/resources` and `/resources/[slug]`     | Service booklets and other PDFs, each with its own page                             |
| Search                    | `/search`                                | Site-wide search via Pagefind, works offline                                        |
| Style guide               | `/style-guide`                           | Living review of the design system (`noindex`, unlinked, off the sitemap)           |
| Offline fallback          | `/offline`                               | Shown when a page is requested with no connection and was never opened online       |

## Tech stack

- **Astro 7** — static HTML output, content collections, MDX service bodies, client-side navigation via `ClientRouter`
- **TypeScript** — strict mode via `astro/tsconfigs/strict`, path aliases `@/*`, `@components/*`, `@layouts/*`, `@styles/*`
- **Fonts** — Roboto (body/sans) and Oswald (display), downloaded at build time from Fontsource and served from this site, never from a third party at runtime
- **Hebrew calendar** — `@hebcal/core` and `@hebcal/leyning`, read at build time so a reading is never a content file
- **Calendar feed** — `node-ical` reads the temple's Proton Calendar ICS feed once at build time; the home page renders plain HTML, so no visitor's browser contacts a third party
- **Search** — Pagefind indexes the site at build time; the search bundle and index are pre-cached so search works offline
- **Analytics** — PostHog with session recording disabled; events queue in localStorage while offline and deliver when the connection returns.
- **Service worker** — hand-written `public/sw.js` pre-caches the shell, pages, styles, fonts, images, and PDFs at install; video is network-first; `/offline.html` is the fallback when a page was never opened
- **PWA** — `public/manifest.json` with icons makes the site installable to a phone home screen; the service worker detects updates and shows a reload banner
- **SEO** — Open Graph and Twitter Card meta tags on every page, a static social card at `/social-card.svg`, canonical URLs, and a sitemap that excludes the style guide and offline page
- **Precache manifest** — `integrations/precache-manifest.mjs` writes `dist/sw-manifest.json` after every build so the worker knows which hashed files to pre-cache
- **Testing** — Vitest under `src/`; gate is `npm run verify` (`astro check` + `astro build`) followed by `npm run test`
- **Lint/format** — ESLint 10 flat config, Prettier 3 with `prettier-plugin-astro`, husky + lint-staged on commit, Conventional Commits enforced by commitlint

## Getting started

Requirements: **Node 22+** (see `.nvmrc`).

```bash
# Install dependencies
npm install

# Copy the environment template and fill in the temple-supplied values
cp .env.example .env

# Start the dev server
npm run dev
```

Then open `http://localhost:4322` (Astro's default). The style guide is at `/style-guide`.

### Scripts

| Script                 | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start the Astro dev server                                  |
| `npm run build`        | Build the static site to `dist/`                            |
| `npm run preview`      | Preview the built site locally                              |
| `npm run check`        | Run Astro check (TypeScript)                                |
| `npm run verify`       | Check and build together (the Beta gate before test)        |
| `npm run test`         | Run the Vitest suite                                        |
| `npm run lint`         | Run ESLint across the project                               |
| `npm run format`       | Format everything with Prettier                             |
| `npm run format:check` | Check formatting without writing                            |
| `npm run setup:mcp`    | Write this project's MCP servers to Cline's global settings |

The pre-commit hook (husky + lint-staged) runs Prettier and ESLint fix on staged files, so `npm run format` and `npm run lint` stay clean on every commit.

## Environment variables

Copy `.env.example` to `.env` locally, and set the real values in the Cloudflare Pages dashboard under Settings → Environment Variables → Production. These are public client-side variables and must not contain secrets.

| Variable            | Purpose                                                              | Required                                    |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| `CONTACT_EMAIL`     | Temple email shown on the contact page and in the privacy notice     | No (falls back to `contact@ucoy.org`)       |
| `FORM_ENDPOINT`     | Formspree form action URL the contact form posts to                  | No (falls back to a placeholder)            |
| `CALENDAR_URL`      | Proton Calendar share link returning an ICS feed for upcoming events | No (empty = quiet notice on the home page)  |
| `CALENDAR_TIMEZONE` | Timezone the event list is rendered in                               | No (defaults to `America/New_York`)         |
| `POSTHOG_API_KEY`   | PostHog project API key for privacy-friendly analytics               | No (empty = analytics disabled)             |
| `POSTHOG_HOST`      | PostHog instance URL (us or eu cloud)                                | No (defaults to `https://us.i.posthog.com`) |
| `SITE_URL`          | Absolute site URL for canonical links and the sitemap                | No (falls back to the pages.dev URL)        |

Content is authored in `src/content/` across five collections:

- **`pages`** — static pages (`about`, `history`, `visiting`, `privacy`), rendered through the `[...slug]` route
- **`announcements`** — time-stamped bulletins listed newest-first on the home page
- **`services`** — weekly services and High Shabbatot, authored as `.mdx`; `kind` (`weekly` \| `shabbaton`) decides the area and route
- **`resources`** — the temple's PDFs, each with its own page and a listing
- **`portionNotes`** — the temple's commentary for a Torah portion, keyed by portion slug

Any page that lists services reads the `services` collection, so a day or a time lives in exactly one content file; no page hardcodes a service time or names a service as plain text instead of linking its page.

### Adding a service

Create `src/content/services/<slug>.mdx` (the extension must be `.mdx`):

```mdx
---
title: Shabbat Morning Service
description: The order of our Shabbat Shacharit service.
kind: weekly
day: Saturday
time: 9:30 AM
order: 1
---

Shabbat Shalom!

## The Shabbat Morning Abodah

It is said in Bereshith: {Genesis 2:1-3}

...

<Video src="/videos/jamaica-anthem.mp4" caption="The National Anthem of Jamaica" />
```

Conventions:

- The front-matter title is the page's only `h1`; the body starts at `##`.
- `<Video src="/videos/…" />` goes inline in the body with **no import line**; `caption` and `poster` are optional.
- A video file lives under `public/videos/` and is never pre-cached by the service worker.
- Hebrew inside an English sentence: `<span dir="auto">יהוה</span>`. A full Hebrew passage: `<div lang="he" dir="rtl">…</div>`.
- Inline Hebrew spans must stay on the same line as the surrounding English text, with no blank line before them (Prettier treats a tag that starts a line as an HTML block and strands the phrase).
- Content files use **LF** line endings. CRLF makes the front-matter parser read a file as one long line.

### Adding a PDF

1. Place the file under `public/pdfs/`.
2. Add a resource entry in `src/content/resources/<slug>.md`:

   ```md
   ---
   title: Shabbat Service Booklet
   file: /pdfs/shabbat-service-booklet.pdf
   category: Service booklets
   description: The full order of the Shabbat morning service.
   order: 1
   ---
   ```

3. Link to it as `/resources/<slug>` — never by its `public/` path. The resource page is the stable address even if the file's own path changes.

### Adding a portion commentary

Create `src/content/portion-notes/<slug>.md` where `<slug>` is the portion slug the Hebrew calendar produces (e.g. `bereshit`, `matot`). The reading itself is computed at build time, so only the authored teaching lives here. A portion with no file is normal — its page shows the reading and says no commentary has been written yet.

```md
---
title: Portion Name
description: >-
  Description goes here...

order: 999
---

## Portion Outline

### TORAH

. . .

### PROPHETS

. . .

## Portion Summary

. . .

## Portion Commentary

. . .
                                                                                                   
### Thought for the week

. . .                           

### Torah Commentary

. . .

## Prophets Commentary

. . .

## Commentary Summary

. . .
```

## Conventions & rules

- Every colour, type, spacing, and radius value a stylesheet uses is a token from `src/styles/tokens.css`; a raw hex, `rgb`, `rgba`, `hsl`, `hsla`, `px`, or `rem` literal anywhere under `src/` fails the literal scan in `npm run test`.
- Styles name token roles only, never a ladder step like `--color-royal-gold-600`. Restyling the palette means editing ladder steps in `tokens.css` and nothing else.
- The theme choice lives on the member's device under the `localStorage` key `ucoy-theme`, applied as `data-theme` on `html` before the first paint. The site sets no cookies.
- PostHog analytics uses `localStorage` for offline event queuing. Session recording is disabled, and no personal data is collected.
- PDF links and the contact form carry `data-astro-reload` so they skip Astro's client-side router.
- A missing or unreadable `CALENDAR_URL` never fails the build — the home page shows a quiet notice instead.
- The style guide (`/style-guide`) carries `noindex`, is unlinked from the menu, and must stay out of the sitemap and the search index.

## Project structure

```
astro.config.mjs          # Astro config: static output, fonts, mdx, pagefind, precache, sitemap, env schema
src/
  components/             # Reusable blocks: Banner, Callout, Figure, Panel, PdfLink, SearchBox,
                          # Sidebar, SkipLink, Tag, plus Video and Icon
  content/                # Content collections: pages, announcements, services, resources, portionNotes
  config/                 # site.ts (env-backed configuration), nav.ts (sidebar menu source)
  lib/                    # torah-portion.ts, portion-cycle.ts, calendar-events.ts, holy-days.ts, posthog.ts
  layouts/                # Layout.astro — shell, sidebar, theme switch, ClientRouter, PostHog init
  pages/                  # Routes: index, contact, holy-days, torah-portion, portion/[slug],
                          # commentary, services, shabbatonim, resources, search, style-guide, offline
  styles/                 # tokens.css (design tokens), prose.css (content + Hebrew direction), tests
public/
  favicon.png, sw.js, manifest.json, social-card.svg, _headers, _redirects
  pwa-192.png, pwa-512.png                          # PWA icons
  pdfs/                   # Temple PDFs (pre-cached by service worker)
  videos/                 # Local service videos (not pre-cached)
docs/
  scope/scope.md          # Feature trail map (27 features)
  specs/                  # Recorded decisions and acceptance criteria
  sweep/                  # Content sweep notes from the current Google Site
integrations/
  precache-manifest.mjs   # Writes dist/sw-manifest.json after each build
scripts/
  setup-mcp.mjs           # Writes Cline's MCP server settings
```

## Deployment

The site builds to `dist/` and deploys to Cloudflare Pages on the free tier. Push to `main`; Cloudflare Pages runs the build. Set the environment variables above in the dashboard.

The Holy Days calendar is computed at build time, so the site needs to rebuild when the Hebrew year changes. Schedule a rebuild around Rosh Hashanah (usually September or October) to keep the calendar current for the new year.

To verify the offline promise locally, serve `dist/` over a plain static server (for example `npx http-server dist -p 5077`) — `npm run preview` cannot verify it because the worker registers behind `import.meta.env.PROD`, which preview sets false.

## Documentation

- `docs/scope/scope.md` — feature trail map with 27 features across foundation, four slices, rework, and a deferred list
- `docs/specs/0001-adopt-static-site-stack.md` — stack decision and acceptance criteria
- `docs/specs/0002-coding-standards-and-tooling.md` — coding standards and tooling
- `docs/specs/0003-content-model.md` — content model
- `docs/specs/0004-design-system-ui-foundation/` — design system decision, rationale, and verify checklist
- `docs/specs/0006-commentary-for-every-portion.md` — commentary model and the 53 portion routes
- `docs/specs/0007-upcoming-events-proton-calendar.md` — build-time Proton Calendar feed
- `docs/specs/0008-client-side-navigation/` — client-side navigation decision
- `docs/specs/0009-holy-days-calendar.md` — Holy Days calendar computed at build time
- `docs/specs/0010-product-analytics.md` — PostHog analytics with privacy settings
- `docs/specs/0013-site-search.md` — site-wide search via Pagefind
- `docs/specs/0014-offline-pdfs.md` — offline PDF precaching

Service and portion page wording in the repository is placeholder prose standing in for the temple's own words (scope feature 9, the content sweep, replaces it from the current site).

## License

ISC
