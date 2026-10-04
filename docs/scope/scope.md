# Scope: United Congregation of Yisra'Yah website

The public website for the United Congregation of Yisra'Yah, a temple replacing its Google Site with a custom build. It carries complete service and Holy Day materials that members can rely on from a phone, even with no internet, and leaves room for the private and administrative features planned for later phases.

**Build approach:** Tracer Bullet (prove the whole thread works with one real narrow path, then thicken it one segment at a time).
**Workflow:** Beta (after `/develop`, `/check verify` on the real app, then `/test`).

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| #   | Feature                                       | Phase      | Status  |
| --- | --------------------------------------------- | ---------- | ------- |
| 1   | Stack & architecture                          | Foundation | done    |
| 2   | Coding standards & tooling                    | Foundation | done    |
| 3   | Content model                                 | Foundation | done    |
| 4   | Design system & UI foundation                 | Foundation | done    |
| 5   | Site shell, home & first service page offline | Slice 1    | done    |
| 6   | Friday service page                           | Slice 2    | done    |
| 7   | Sabbath evening & Torah portion page          | Slice 2    | planned |
| 8   | Closing of Shabbat page                       | Slice 2    | planned |
| 9   | Content sweep of the current site             | Slice 3    | planned |
| 23  | Hebrew body face                              | Slice 3    | planned |
| 10  | High Holy Days section                        | Slice 3    | planned |
| 11  | Temple information & contact                  | Slice 3    | planned |
| 21  | Exact palette from the current site           | Slice 3    | planned |
| 12  | Holy Days calendar                            | Slice 4    | planned |
| 13  | Site search                                   | Slice 4    | planned |
| 14  | Product analytics                             | Slice 4    | planned |
| 15  | SEO, metadata & performance                   | Slice 4    | planned |
| 16  | Site wide offline & install                   | Slice 4    | planned |
| 22  | Offline PDFs                                  | Slice 4    | planned |
| 17  | Private Temple Treasury                       | Deferred   | planned |
| 18  | Attendance tracking                           | Deferred   | planned |
| 19  | Admin dashboard & member accounts             | Deferred   | planned |
| 20  | Private documents & member area               | Deferred   | planned |

## Foundations

### 1. Stack & architecture · done

Decide the stack and scaffold a runnable project so every later slice builds on real structure. The decision settles the big cross cutting calls in one place: the offline strategy, content as plain files, local video hosting, Hebrew script handling, and the shape analytics will plug into.
**Done when:** the stack is recorded in a spec and the empty scaffold boots locally and passes build.

- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Build it: `/develop stack & architecture`
  - Init project: Astro 7, TypeScript, Cloudflare Pages deploy, strict lint (AC-1, AC-4, AC-5)
  - Content + Markdown + Hebrew fonts + hand-written CSS shell + home page (AC-1, AC-2, AC-5, AC-6, AC-7)
  - Service worker + offline shell (AC-5, AC-7)
  - CI: GitHub push → Cloudflare Pages build, Formspree, calendar, analytics (AC-2, AC-3, AC-4)
- [x] Verify it: `/check verify stack & architecture`
- [x] Test it: `/test stack & architecture`
      Spec [0001](../specs/0001-adopt-static-site-stack.md) · code in `./`

### 2. Coding standards & tooling · done

Capture conventions and install enforcement from the real scaffolded project, so all later code follows one standard.
**Done when:** root `AGENTS.md` reflects the real project, and lint, format, and pre commit checks run on every commit.

- [x] Capture conventions and tooling choices: `/audit`
- [x] Install the tooling: `/develop coding standards & tooling`
      Spec [0002](../specs/0002-coding-standards-and-tooling.md) · code in `./`

### 3. Content model · done

The data model of the site, stated as content: services, pages, Holy Days and their dates, media assets, and resources. Content lives as plain files a developer edits and republishes, so the schema must fit the mirror of the current Google Site and stay easy to extend. A wrong model here is the costliest thing to redo.
**Done when:** the schema is recorded in a spec, and a sample service page and a sample Holy Day page render from real content files.

- [x] Decide the content model (spec): `/architect content model`
- [x] Build it: `/develop content model`
  - [x] Collections and schemas in `src/content.config.ts`, leaving `pages` and `announcements` untouched (AC-1)
  - [x] MDX wired up with the inline `<Video>` component (AC-4)
  - [x] Service area: `/services/` landing page and `/services/[slug]`, headings and two videos in order (AC-2, AC-3, AC-4)
  - [x] Shabbaton at `/shabbatonim/[slug]` from the same collection, with its area landing page (AC-2, AC-5)
  - [x] PDF resources at `/resources/` and `/resources/[slug]`, linked from the service page (AC-6)
- [x] Verify it: `/check verify content model`
- [x] Test it: `/test content model`
      Spec [0003](../specs/0003-content-model.md) · code in `src/content.config.ts`, `src/components/Video.astro`, `src/content/{services,resources}/`, `src/pages/{services,shabbatonim,resources}/`

### 4. Design system & UI foundation · done

The base look and building blocks every page stands on: typography that renders Hebrew script correctly, color tokens, light and dark mode, the responsive shell and navigation, and accessible base components at WCAG 2.1 AA.
**Done when:** tokens, base components, shell, and navigation exist; light and dark modes both pass WCAG 2.1 AA; Hebrew script renders correctly in both.

- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: `/develop design system & UI foundation`
  - [x] Tokens, theme engine and switch over both modes (AC-1, AC-2, AC-3, AC-4)
  - [x] Building blocks and content styles (AC-2, AC-6, AC-7, AC-8, AC-11)
  - [x] Shell, navigation and style guide (AC-5, AC-7, AC-9, AC-11)
  - [x] Guards, accessibility and performance passes; one built stylesheet at 16.1 kB of the 30 kB budget, no new dependencies (AC-1, AC-3, AC-5, AC-7, AC-10, AC-11)
  - [x] Strict square corners: the four radius steps collapse to one `--radius` shape token set to `0`, so every control, block and image is squared, offline page included (AC-1, AC-7)
  - [x] Header brand shows the initials UCOY on phones 375 pixels and down, so the menu button keeps its room, with the full temple name kept in the link's accessible name (AC-5, AC-11)
  - [x] Sidebar slides in and out over 0.2s with the dim layer fading on the same beat, still with no JavaScript, snapping for readers who ask for less motion; one `--motion-duration` token now drives every transition on the site (AC-1, AC-5, AC-11)
  - [x] Banner photo paints as a fixed attachment CSS background on the band itself instead of an absolutely positioned `img`, so the picture holds still while the page scrolls past it like the temple's current site; the band scrolls the photo normally for reduced motion, drops it in print, and its height and title shadow moved to tokens so the literal scan passes (AC-1, AC-7, AC-11)
  - [x] The menu dim layer reads a `--scrim` token instead of a raw `rgba(0, 0, 0, 0.5)`, closing the AC-1 break `/check verify` found, and the literal scan now matches `rgba(` and `hsla(` with two cases pinning the pattern so the hole cannot reopen (AC-1)
- [x] Verify it: `/check verify design system & UI foundation` (nine of ten steps confirmed in a real Chrome on 2026-09-26; the tenth, reduced motion and Windows High Contrast, was accepted by the engineer on the strength of the shipped rules rather than run, because the tooling cannot force those two media features)
- [x] Test it: `/test design system & UI foundation`
      Spec [0004](../specs/0004-design-system-ui-foundation/index.md) · code in `src/styles/`, `src/components/`, `src/layouts/`, `src/config/nav.ts`, `src/pages/`

## Slice 1: the first working thread

### 5. Site shell, home & first service page offline · done

The thinnest real path through the whole loop, content files to built page to phone, with no connection, working. The home page is real but simple (welcome, service times, navigation), and one regular service page is complete with real content and its videos playing from local hosting. The chosen page is the Sabbath morning service: its file `src/content/services/shabbat-morning-service.mdx` already carries two `Video` calls in a full body, so it is the shortest honest proof of the pattern every later page repeats.
**Done when:** on a phone in airplane mode, a member opens the site, reaches the Sabbath morning service page, reads every text including Hebrew, and plays its videos from local hosting.

- [x] Build it: `/develop site shell, home & first service page offline`
  - [x] Home service times read from the `services` collection instead of a hardcoded table, so a day or a time lives in one file
  - [x] Sabbath morning body carries real Hebrew: a full passage as a `lang="he" dir="rtl"` block and a phrase inside English as `dir="auto"` on a span
  - [x] Member walks the whole path on a phone in airplane mode: home, the service page, every text including Hebrew, both videos playing (confirmed 2026-10-03 in Chrome at 390 pixels wide, network cut, served from `dist` over a static server; the worker precached 33 shell files and both videos played from the media cache)
- [x] Verify it: `/check verify site shell, home & first service page offline` (seven behaviors met; the literal scan and the full suite pass, which the earlier session could not run)
- [x] Test it: `/test site shell, home & first service page offline` (20 new tests across `src/home.service-times.test.ts` and `src/content.files.test.ts`; 99 tests pass in all, build green)
      Code in `src/pages/index.astro`, `src/content/services/shabbat-morning-service.mdx`
      Tests in `src/home.service-times.test.ts`, `src/content.files.test.ts`

## Slice 2: the regular service pages

### 6. Friday service page · done

Mirror the old page completely, fill its gaps, and put it on the proven pattern. The current site's Friday entry is a Friday evening home ritual and no Friday morning service, so settle which service this page mirrors before writing it.
**Done when:** every part of the old page is present and complete, and the page works offline on a phone.

- [x] Build it: `/develop friday morning service page`
  - Settled the open question: the page mirrors the Friday evening home ritual, the temple's actual Friday entry, not a Friday morning service. The scope row and the `fridayMorning` slot in `src/config/site.ts` were the only places still claiming a Friday morning service
  - Body written as one `.mdx` service file in the order the ritual is kept, with the candle blessing as a `lang="he"` `dir="rtl"` block and `שבת קודש` as a `dir="auto"` span, so it follows the same Hebrew rules as the Shabbat morning body
  - No `<Video>` on this page yet: `public/videos/` holds no Friday evening asset, and pointing at a missing file would break the offline promise. The temple's recording drops in as one added line
  - `visiting.md` no longer advertises a Friday morning service at 9:00 AM, which contradicted the built page, and points at `/services` instead
  - Built at `/services/friday-evening-home-ritual/`; page listed in `sw-manifest.json` for offline (counts and gate results for this step are under `Verify it` and `Test it` below)
    Code in `src/content/services/friday-evening-home-ritual.mdx`, `src/content/pages/visiting.md`
- [x] Verify it: `/check verify friday service page` (eight behaviors met, evidence in the run: served from `dist` over a static server, read in Chrome at 320 and 390 pixels wide)
  - Page renders the full ritual: one `h1`, five `h2` sections, 12 paragraphs, zero console errors (`.tmp-friday.png`)
  - Hebrew handled both ways: the candle blessing computes `direction: rtl` as a `lang="he"` block, and `שבת קודש` stays inside its English sentence as a `dir="auto"` span
  - Offline promise proven for real, not by a flag: the worker reached `activated` and took control, the page sat in the `shell-v2` cache, the server process was then killed on port 5077 and confirmed dead, and the reload still rendered the whole page served by the service worker (`.tmp-offline-real.png`, `.tmp-offline-real.json`)
  - Phone widths clean: `scrollWidth` equals `innerWidth` at 320 and 390, so nothing scrolls sideways (`.tmp-320.png`)
  - Both colour modes render: dark on `rgb(20,21,27)` with `rgb(243,242,237)` text, light on `rgb(251,250,247)` with `rgb(25,26,32)`, and the Hebrew block stays `rtl` in dark mode (`.tmp-dark.png`)
  - Reachable everywhere it belongs: linked from the services index, the home page, the sidebar, and `visiting.md`, and it sorts first in the sidebar weekly group ahead of Shabbat morning
  - First Tab stop is the skip link to `#main-content`
  - No dead links: no `/dates` or `/torah-portion` on the page, and `visiting.md` no longer says "Friday morning"
  - Gate after the run: `astro check` 0 errors, 0 warnings, build complete, 99 tests pass across 8 files. The `MODULE_LEVEL_DIRECTIVE` build warning appears on all three service files, so it is pre-existing and not from this page
  - Left open: no Friday recording, so no `<Video>` on the page yet
- [x] Test it: `/test friday service page` (31 new tests, 132 pass in all across 9 files; `astro check` 0 errors and 0 warnings, ESLint and build green)
  - `src/content.files.test.ts` guards the content itself: schema and `kind`, day and time, the description limit, order below Shabbat morning, the body starting at `##`, both Hebrew directions with real Hebrew script, the five headings in the order the ritual is kept, and no `<Video>`
  - A new case walks every service file and fails if any `<Video>` names a file that is not in `public/`. That is the offline promise in one assertion, and it is the check a missing Friday recording will trip when one is added
  - `src/friday-ritual.wiring.test.ts` guards the wiring: the sidebar builds its groups from the collection by `kind` and sorts by order, no page or component names the Friday slug literally, and `visiting.md` promises no Friday morning service
    Tests in `src/content.files.test.ts`, `src/friday-ritual.wiring.test.ts`
- [x] Follow up: the dead `SITE_CONFIG.services` block is gone. It held three schedule strings that no page rendered, a second copy of the schedule the temple could not edit without a rebuild. `friday-ritual.wiring.test.ts` now fails if the block returns or if any page reads it

### 7. Sabbath evening & Torah portion page · planned

Same pattern; this page carries the heaviest Hebrew text of the regular services.
**Done when:** every part of the old page is present and complete with its Hebrew text correct, the page works offline on a phone, and the sidebar entry for it stops reading as planned.

- [ ] Build it: `/develop sabbath evening & Torah portion page`

### 8. Closing of Shabbat page · planned

Same pattern; the last of the regular weekly services.
**Done when:** every part of the old page is present and complete, and the page works offline on a phone.

- [ ] Build it: `/develop closing of Shabbat page`

## Slice 3: full completeness

### 23. Hebrew body face · planned · needs a decision

The design system ships with no Hebrew typeface, so Hebrew falls back to whichever face the phone supplies, while the temple's material is largely Hebrew. Judge that fallback against the Sabbath evening and Torah portion passages, then either keep it or choose, license and subset a Hebrew body face, so the passages read as well as the English around them.
**Done when:** the Hebrew in the service and Holy Day pages reads as well as the surrounding text, and the face, its licence, and its weight in the stylesheet budget are recorded.

- [ ] Decide the Hebrew face (spec): `/architect hebrew body face`

### 9. Content sweep of the current site · planned

Walk the current Google Site page by page and mirror anything not yet carried over, so nothing the temple published is lost, and carry the old page addresses across so links keep working. Anything sizable found here becomes its own row.
**Done when:** a page by page pass over the current site finds nothing the new site lacks, or a written list of what was intentionally left out, and old addresses redirect to the new pages.

- [ ] Build it: `/develop content sweep of the current site`

### 10. High Holy Days section · planned

Complete the pages the old site created but never finished: one real page per High Sabbath and Holy Day the congregation observes, on the service page pattern. Content gaps get filled with your input, so expect to supply material here.
**Done when:** every High Sabbath and Holy Day the congregation keeps has a complete, offline capable page, reachable from the navigation.

- [ ] Build it: `/develop high holy days section`

### 11. Temple information & contact · planned · needs a decision

Who the temple is, where and when it meets, and how to reach it, plus a simple message form and the privacy wording that names the host's request logs, the two outside services, and the theme choice kept on the device. The form needs a way to deliver messages, which is a real choice to settle in a spec.
**Done when:** a first time visitor learns what the congregation is, where it meets, and when services happen, and a message sent from the contact page reaches the temple.

- [ ] Decide the form approach (spec): `/architect temple information & contact`

### 21. Exact palette from the current site · planned

The ladder values were sampled from screenshots of the current Google Site, close but not exact. Pick the real colours from that site's theme settings, swap them into the tokens, and have the temple choose the final accent, so the palette can be called final with exactness and intent.
**Done when:** every ladder value matches the current site's theme, the contrast tests pass in both modes, and the temple has chosen the final accent colour.

- [ ] Build it: `/develop exact palette from the current site`

## Slice 4: platform features

### 12. Holy Days calendar · planned · needs a decision

Upcoming services and High Sabbaths shown with their dates on the Hebrew calendar, the custom feature Google Sites could not do well. Whether dates are computed or curated is the decision to settle.
**Done when:** the calendar lists upcoming dates correctly, marks High Sabbaths, links each date to its page, and the sidebar entry for Important Dates stops reading as planned.

- [ ] Decide the date approach (spec): `/architect holy days calendar`

### 13. Site search · planned

Find any service, Holy Day, or resource from any page.
**Done when:** search from any page returns matching pages quickly and keeps working offline, with the style guide kept out of the index.

- [ ] Build it: `/develop site search`

### 14. Product analytics · planned · needs a decision

Privacy friendly product analytics so the temple can see which materials people use and where they struggle. You already have tools in mind; the spec records the pick and how events queue while offline.
**Done when:** page views and key events are recorded, events queue offline and arrive once the connection returns, and no personal data is collected.

- [ ] Decide the analytics approach (spec): `/architect product analytics`

### 15. SEO, metadata & performance · planned

The public pages deserve to be found and to load fast on a phone.
**Done when:** every public page carries title and description metadata, a sitemap and social cards exist, the style guide stays out of the sitemap, and pages load quickly on a phone.

- [ ] Build it: `/develop seo metadata & performance`

### 16. Site wide offline & install · planned

Complete the offline promise across the whole site: every page available with no connection, installable to a phone home screen, with clean updates when a connection returns, and the palette repeated in `public/offline.html` revisited so the offline page stops being a second copy of the tokens.
**Done when:** the whole site works in airplane mode, installs to a phone home screen, picks up updates cleanly when back online, and the offline page's repeated palette is settled one way or the other.

- [ ] Build it: `/develop site wide offline & install`

### 22. Offline PDFs · planned · needs a decision

The temple's booklets are deliberately kept out of the precache, so a booklet a member has never opened asks for a connection the first time. Settle the size budget and which booklets earn a place in the precache, so the offline promise covers the material members actually open.
**Done when:** a booklet a member has never opened opens with no connection, and the precache stays inside a size budget recorded in the spec.

- [ ] Decide the PDF precache (spec): `/architect offline pdfs`

## Deferred

### 17. Private Temple Treasury · planned

Authorized users only. Parked until a future phase; plan it with `/scope private temple treasury` when the time comes.

### 18. Attendance tracking · planned

Recording who attended services and events. Parked until a future phase; plan it with `/scope attendance tracking` when the time comes.

### 19. Admin dashboard & member accounts · planned

Sign in, roles, member management, and the content editing screen for non technical editors. Parked until a future phase; plan it with `/scope admin dashboard & member accounts` when the time comes.

### 20. Private documents & member area · planned

Members only documents and resources. Parked until a future phase; plan it with `/scope private documents & member area` when the time comes.

## Legend

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; the tag drops once the spec is captured.
- Atomic build tasks live in the spec's `## Build plan`, never here; the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (kept for history).
- **Approach tag** beside a heading (for example `· Facade`) would override the project default; no tag = inherits Tracer Bullet.
- **Workflow tier tag** beside a heading (for example `· GA`) would set that feature's rigor; no tag = inherits the project default, Beta.
- **Pointer line** (`spec <n> · code in <path>`) appears once `/architect` and `/develop` create them.
