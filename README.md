# United Congregation of Yisra'Yah — website

The public website for the United Congregation of Yisra'Yah, a temple replacing its Google Site with a custom build. It carries complete service and Holy Day materials that members can rely on from a phone, even with no internet.

It is a **static Astro site** published on **Cloudflare Pages** (free tier). There is no server, no database, no sign in, no cookies, and no third-party tracking beyond cookieless Cloudflare Web Analytics. Content lives as plain text files in the repository, so every change is a commit.

## What the site contains

| Area                      | Address                                  | What it is                                                                          |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Home                      | `/`                                      | Temple information, upcoming events from the temple calendar                        |
| Contact                   | `/contact`                               | Message form (posts to a Formspree endpoint)                                        |
| This week's Torah portion | `/torah-portion`                         | The week's reading, computed at build time from the Hebrew calendar                 |
| Portion page              | `/portion/[slug]`                        | Reading + citations for all 53 weekly portions; commentary where written            |
| Weekly services           | `/services` and `/services/[slug]`       | Shabbat morning, Friday evening home ritual, Saturday afternoon, closing of Shabbat |
| High Shabbatot            | `/shabbatonim` and `/shabbatonim/[slug]` | Pesach, Shavuot, Sukkot, Yom Teruah, Yom Kippur, and more                           |
| Resources                 | `/resources` and `/resources/[slug]`     | Service booklets and other PDFs, each with its own page                             |
| Style guide               | `/style-guide`                           | Living review of the design system (`noindex`, unlinked, off the sitemap)           |

## Tech stack

- **Astro 7** — static HTML output, content collections, MDX service bodies, client-side navigation via `ClientRouter`
- **TypeScript** — strict mode via `astro/tsconfigs/strict`, path aliases `@/*`, `@components/*`, `@layouts/*`, `@styles/*`
- **Fonts** — Roboto (body/sans) and Oswald (display), downloaded at build time from Fontsource and served from this site, never from a third party at runtime
- **Hebrew calendar** — `@hebcal/core` and `@hebcal/leyning`, read at build time so a reading is never a content file
- **Calendar feed** — `node-ical` reads the temple's Proton Calendar ICS feed once at build time; the home page renders plain HTML, so no visitor's browser contacts a third party
- **Service worker** — hand-written `public/sw.js` pre-caches the shell, pages, styles, fonts, and images at install; video is network-first; `/offline.html` is the fallback when a page was never opened
- **Precache manifest** — `integrations/precache-manifest.mjs` writes `dist/sw-manifest.json` after every build so the worker knows which hashed files to pre-cache
- **Testing** — Vitest under `src/`; gate is `npm run verify` (`astro check` + `astro build`) followed by `npm run test`
- **Lint/format** — ESLint 10 flat config, Prettier 3 with `prettier-plugin-astro`, husky + lint-staged on commit

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

| Variable             | Purpose                                                              | Required                                   |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `CONTACT_EMAIL`      | Temple email shown on the contact page and in the privacy notice     | No (falls back to `contact@ucoy.org`)      |
| `FORM_ENDPOINT`      | Formspree form action URL the contact form posts to                  | No (falls back to a placeholder)           |
| `CALENDAR_URL`       | Proton Calendar share link returning an ICS feed for upcoming events | No (empty = quiet notice on the home page) |
| `CALENDAR_TIMEZONE`  | Timezone the event list is rendered in                               | No (defaults to `America/New_York`)        |
| `CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics beacon token                                | No (empty = analytics disabled)            |
| `SITE_URL`           | Absolute site URL for canonical links and the sitemap                | No (falls back to the pages.dev URL)       |

Content is authored in `src/content/` across five collections:

- **`pages`** — static pages (`about`, `history`, `visiting`), rendered through the `[...slug]` route
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

<div lang="he" dir="rtl">

בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ

</div>

The English of the same words:

> In the beginning God created the heaven and the earth.

## Portion Summary

Portion summary goes here...

## Commentary: Torah

Torah commentary goes here...

## Commentary: Prophets

The commentary for the prophets wring goes here...

## Thought for the week

> This is an example of a thought for the week that goes
> in two or more lines like this...

And this is some additional details or it can be used alone if no quote is needed...

## Commentary Summary

This is the summary of the commentary...
```

## Conventions & rules

- Every colour, type, spacing, and radius value a stylesheet uses is a token from `src/styles/tokens.css`; a raw hex, `rgb`, `rgba`, `hsl`, `hsla`, `px`, or `rem` literal anywhere under `src/` fails the literal scan in `npm run test`.
- Styles name token roles only, never a ladder step like `--color-royal-gold-600`. Restyling the palette means editing ladder steps in `tokens.css` and nothing else.
- The theme choice lives on the member's device under the `localStorage` key `ucoy-theme`, applied as `data-theme` on `html` before the first paint. The site sets no cookies.
- PDF links and the contact form carry `data-astro-reload` so they skip Astro's client-side router.
- A missing or unreadable `CALENDAR_URL` never fails the build — the home page shows a quiet notice instead.
- The style guide (`/style-guide`) carries `noindex`, is unlinked from the menu, and must stay out of the sitemap and the search index.

## Project structure

```
astro.config.mjs          # Astro config: static output, fonts, mdx + precache integrations, env schema
src/
  components/             # Reusable blocks: Banner, Callout, Figure, Panel, PdfLink, Sidebar,
                          # SkipLink, Tag, plus Video and Icon
  content/                # Content collections: pages, announcements, services, resources, portionNotes
  config/                 # site.ts (env-backed configuration), nav.ts (sidebar menu source)
  lib/                    # torah-portion.ts, portion-cycle.ts, calendar-events.ts
  layouts/                # Layout.astro — shell, sidebar, theme switch, ClientRouter
  pages/                  # Routes: index, contact, torah-portion, portion/[slug], services, shabbatonim, resources, style-guide
  styles/                 # tokens.css (design tokens), prose.css (content + Hebrew direction), tests
public/
  favicon.png, offline.html, sw.js, _headers, _redirects
  pdfs/                   # Temple PDFs
  videos/                 # Local service videos (not pre-cached)
docs/
  scope/scope.md          # Feature trail map (24 features)
  specs/                  # Recorded decisions and acceptance criteria
  sweep/                  # Content sweep notes from the current Google Site
integrations/
  precache-manifest.mjs   # Writes dist/sw-manifest.json after each build
scripts/
  setup-mcp.mjs           # Writes Cline's MCP server settings
```

## Deployment

The site builds to `dist/` and deploys to Cloudflare Pages on the free tier. Push to `main`; Cloudflare Pages runs the build. Set the environment variables above in the dashboard. To verify the offline promise locally, serve `dist/` over a plain static server (for example `npx http-server dist -p 5077`) — `npm run preview` cannot verify it because the worker registers behind `import.meta.env.PROD`, which preview sets false.

## Documentation

- `docs/scope/scope.md` — feature trail map with 24 features across foundation, four slices, and a deferred list
- `docs/specs/0001-adopt-static-site-stack.md` — stack decision and acceptance criteria
- `docs/specs/0002-coding-standards-and-tooling.md` — coding standards and tooling
- `docs/specs/0003-content-model.md` — content model
- `docs/specs/0004-design-system-ui-foundation/` — design system decision, rationale, and verify checklist
- `docs/specs/0006-commentary-for-every-portion.md` — commentary model and the 53 portion routes
- `docs/specs/0007-upcoming-events-proton-calendar.md` — build-time Proton Calendar feed
- `docs/specs/0008-client-side-navigation/` — client-side navigation decision

Service and portion page wording in the repository is placeholder prose standing in for the temple's own words (scope feature 9, the content sweep, replaces it from the current site).

## License

ISC
