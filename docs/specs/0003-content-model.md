# 0003. Content model for services, Shabbatonim, and resources

**Date**: 2026-09-19
**Status**: Accepted

## Summary

This decision settles how the temple's material lives in the repository. A service page is one text file that shows the order of service, with its own web address, written in ordinary markdown so a heading typed as `##` becomes a heading on the page. Videos sit inside that page at the exact point the service needs them, so one page can hold several videos, mixed with text or with no text at all. The High Sabbaths (Shabbatonim) are the same kind of page, kept in their own area of the site. The only thing kept in a separate list is the temple's PDFs, because a PDF can be linked from a service page and also found on a resources page.

## Context

The site carries the temple's service and Holy Day material in a form a member can rely on from a phone with no connection, and it replaces a Google Site whose pages were built one at a time with no shared shape. That old site is the mirror this model has to fit, but the model must also stay easy to extend, because more pages will be added for years after launch.

The people who edit the site read code and work in git, so a content file is a normal commit and every change is reviewable and reversible. That is what makes a file based model possible at all: page content, service order, and PDF listings all live as text files, with no database and no content editor.

The material itself is not uniform, and that is the force that shapes the model. A service page shows the order of a service, so its content is a sequence: a heading, some Hebrew or English text, a video, more text, another video. One page may be mostly video, another may be a psalm written out with no video at all, and another may hold three videos in a row with a line of text between them. The order of the service is the order of the page, and the model has to let an author write it that way without turning the page into a rigid form.

Weekly services and the Shabbatonim (the High Sabbaths the congregation keeps) are the same sort of page with the same shape; what separates them is which area of the site they belong to, not how they are built. The only material with a second life is the temple's PDFs: a prayer booklet or a teaching can be linked from more than one service page and also needs a page of its own where a member can find it without knowing which service mentions it. Songs and prayers do not need that treatment, because they live inside the service that uses them.

Getting this model wrong is the costliest mistake available at this stage, since every later page and feature is built on top of it, and a schema change after content exists means touching every file. Leaving it undecided would mean each service page invents its own front matter, and the site would drift apart page by page.

## Requirements

**User stories**:

- As a temple volunteer who edits the repository, I want to add a service page as one text file so that the order of service is written in the order it happens.
- As a temple volunteer, I want to place a video anywhere inside a service page, more than once, so that the page follows the real order of the service.
- As a temple volunteer, I want a Shabbaton page to be the same kind of file as a weekly service so that I learn one way of writing pages, not two.
- As a visitor, I want each service and each Shabbaton to have its own web address so that I can send someone straight to it.
- As a visitor, I want to read the service in order, text and video together, on a phone with no connection.
- As a temple volunteer, I want the temple's PDFs listed in one place so that a resource can be found without knowing which service mentions it.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Every content type the site needs (static page, announcement, service, Shabbaton, resource PDF) is named in this spec with its fields and whether each field is required or optional, and no field is left for the build to invent.
- **AC-2**: A sample weekly service and a sample Shabbaton each exist as one text file under `src/content/services/`, and the build produces one page per file at its own address.
- **AC-3**: A body heading typed as `#`, `##`, or `###` renders as `h1`, `h2`, or `h3` respectively in the built page, so a heading's level is set only by the number of `#` characters.
- **AC-4**: A service page holds more than one video, in the order written, with text before, between, or after them, and every video renders at the position the author placed it.
- **AC-5**: Weekly services and Shabbatonim come from one collection and are told apart by a field; the build puts each weekly service at `/services/<slug>` and each Shabbaton at `/shabbatonim/<slug>`, and each area has a landing page that lists its own kind.
- **AC-6**: PDFs live in a `resources` collection; a service page links to a PDF through that PDF's resource page, which carries the download link, and the resources list shows the same PDF.
- **AC-7**: `npm run check` and `npm run build` pass with the new collections and the sample files in place, and the sample pages carry no client side framework.

## Options considered

### Option 1: One `services` collection, videos inline in the body, PDFs in a `resources` collection

A single `services` collection holds weekly services and Shabbatonim, told apart by a `kind` field. The markdown body is the order of service, and a video is dropped in wherever it belongs. Plain PDFs get their own small `resources` collection with its own listing page.

**Pros**:

- One schema to learn for every service, weekly or Shabbaton, so the author writes pages one way
- The page order is the written order, which matches how a service actually runs
- Adding a page is adding a file, with no schema change
- PDFs have one home, one address, and can be linked from any page

**Cons**:

- The video insertion depends on a small piece of tooling being wired up, so the first page costs more than a plain markdown page
- A video path can be typed wrong, and only a build check or a careful eye catches it
- Two areas share one collection, so the area is carried in front matter rather than in the folder

### Option 2: Separate `services` and `shabbatonim` collections

Two collections with the same shape, one for weekly services and one for the Shabbatonim, each with its own route and its own folder.

**Pros**:

- Each area is a folder and a route on its own, so nothing carries an area field
- A Shabbaton can later gain a field of its own without touching weekly services

**Cons**:

- The same schema is written twice, and every later field change is made in two places
- Finding every service means querying two collections
- The two areas are the same in shape today, so the split buys separation the content does not need yet

### Option 3: A `videos` collection referenced from service pages

Videos become their own collection with their own fields, and a service page lists which videos it uses in front matter.

**Pros**:

- Video details (length, poster image, caption) are stored once and can be reused
- Every video can be listed and searched as a set

**Cons**:

- A list in front matter cannot interleave with the text the way the service actually runs, so the order requirement is lost or needs a second mechanism
- A video that belongs to one service gains nothing from being in a catalog, and the author pays the indirection cost on every page
- Most videos would have exactly one parent, making the collection a list of one to one links

### Option 4: One `pages` collection holding everything

Fold services, Shabbatonim, and resources into the existing `pages` collection behind a page type field.

**Pros**:

- One collection for all pages, so one query and one route shape

**Cons**:

- The schema fills with fields that apply to some pages and not others, and the type safety of front matter is lost
- Static pages, service pages, and PDF listings render differently, so the shared route would branch on type anyway
- The existing `pages` collection is already correct for about, history, and visiting, and folding it in would muddy a working part

## Decision

**Chosen option**: Option 1: One `services` collection, videos inline in the body, PDFs in a `resources` collection

Adopt one `services` collection for both weekly services and Shabbatonim, told apart by a `kind` field; write the order of service in the markdown body and place each video inline where it belongs; and keep the temple's PDFs in a separate `resources` collection with its own listing.

**Implementation skills**: `astro-framework` (`delineas/astro-framework-agents`, `.agents/skills/astro-framework/`)

## Rationale

The deciding force is that the order of a service is a sequence, not a set. Because a page can hold several videos in any order with text before, between, or after them, the model has to let the author write the page down the way the service runs, and a front matter list of videos cannot do that without a second ordering mechanism. Putting the video inside the body makes the written order the rendered order, and it makes a page that is all text and a page that is all video the same kind of file (basis: the Astro content collections convention for body content in the installed `astro-framework` skill).

One collection rather than two follows from the observation that a Shabbaton is the same sort of page as a weekly service; only its area differs. Splitting them would duplicate the schema and put every later field change in two places, for separation the content does not need. The `kind` field costs one line in front matter and gives the route and the navigation what they need (basis: this project's own scoped statement that a wrong model here is the costliest thing to redo).

PDFs are the one exception, and they earn it. A PDF has a life of its own: it can be linked from a service page and also listed for a member who does not know which service mentions it. That is exactly the reuse case that justifies a collection, and it is the only case the material presents, since songs and prayers belong to the service that uses them. Videos do not clear that bar: nearly every video has one parent, so a video collection would be a list of one to one links with the order requirement lost.

The video insertion does add a small cost, and it is worth stating plainly. Plain markdown cannot carry a live component, so the service bodies are authored as MDX and the project gains the `@astrojs/mdx` integration. Headings and prose stay ordinary markdown, and `#` still means a first level heading; a service body simply starts at `##`, because the page title is the page's `h1` (see the body rules below). The alternative, allowing a raw HTML `<video>` tag in the body, needs no new tooling but leaves every player unstyled and every load uncontrolled, which the design system will not accept (basis: Astro's documented MDX integration for JSX inside Markdown content).

## Feature design

**Data model sketch**:

Two existing collections stay exactly as they are, and two new ones are added. All four use plain files under `src/content/` and glob loaders, per spec 0001.

| Collection      | Status              | Folder                       | Fields                                                                                                                                                                                              |
| --------------- | ------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`         | existing, unchanged | `src/content/pages/`         | `title` (string, required), `description` (string, max 160, optional), `order` (number, default 0), `image` (image, optional), `imageAlt` (string, optional)                                        |
| `announcements` | existing, unchanged | `src/content/announcements/` | `title` (string, required), `date` (date, required), `summary` (string, max 200, optional), `draft` (boolean, default false)                                                                        |
| `services`      | new                 | `src/content/services/`      | `title` (string, required), `description` (string, max 160, optional), `kind` (`weekly` or `shabbaton`, required), `day` (string, optional), `time` (string, optional), `order` (number, default 0) |
| `resources`     | new                 | `src/content/resources/`     | `title` (string, required), `file` (string, required, a path under `public/`), `category` (string, optional), `description` (string, max 160, optional), `order` (number, default 0)                |

Field notes:

- `kind` is the only field that decides where a page lives. A value of `weekly` makes the page `/services/<slug>` and puts it in the regular service navigation; a value of `shabbaton` makes it `/shabbatonim/<slug>` and puts it in the Shabbatonim navigation. Any other value fails the schema check rather than building a stray page.
- `day` and `time` are plain short strings for a listing ("Friday", "9:00 AM"). They are deliberately not date objects: the Holy Days calendar (scope feature 12) owns any real date handling, and this spec does not pre-empt it.
- `order` matches the existing `pages` collection so listings sort the same way everywhere (lowest first, then title).
- `resources.file` holds a site path such as `/pdfs/prayer-booklet.pdf`, not a repository path, because that is the address a reader downloads the file from and the address the offline cache holds. The address an author links is the resource page, `/resources/<slug>`, so a PDF has one linkable address even if the file's own path changes.
- The `services` loader accepts `**/*.mdx` only, not `.md`. A `.md` service file is valid markdown and valid Astro, so a `<Video>` call inside one would render as an inert unknown element, pass both `astro check` and the build, and silently show no player; requiring the extension makes the file type itself the guarantee. The `resources` loader accepts `**/*.{md,mdx}`, so a resource file may stay plain markdown.
- A `resources` file may carry a short body of notes, which the resource page renders under the details. The body is optional, so a file with only front matter is valid.
- `category` is an optional label shown on each row of the resources listing and on the resource page, omitted when it is not set.

**Sample files**: the two samples this spec builds are one weekly service and one Shabbaton. The Shabbaton sample is the sample Holy Day page the scope's done condition asks for, because a Shabbaton is a High Sabbath; no separate Holy Day page is built here, since real Holy Day dates belong to the calendar decision (scope feature 12). Each sample commits the media it names, so the sample video, the still image its `poster` names, and the sample PDF all exist rather than dangling.

**Page body (the service order and the videos)**:

A service file has no body field in the schema, because in the Content Layer the body is the markdown itself. The body is written in the order the service runs:

```markdown
---
title: Shabbat Morning Service
kind: weekly
day: Saturday
time: 9:30 AM
order: 2
---

## Opening prayers

Text of the opening prayer, Hebrew and English.

<Video src="/videos/shabbat-opening.mp4" caption="Opening prayers" poster="/videos/shabbat-opening.jpg" />

## Torah reading

<Video src="/videos/shabbat-torah.mp4" caption="Torah reading" />

## Closing psalm

Psalm text written out, with no video on this part.
```

Rules the author follows:

- Heading level is set by the number of `#` characters and renders as the matching HTML heading (AC-3). The front-matter title is rendered as the page's only `h1`, the way the existing page route does it, so a service body starts at `##`; a body that opened with `#` would ship a second `h1` and break the heading order the design system has to keep (scope feature 4).
- A video is written as a `<Video>` call inline in the body, with `src` required (a path under `public/videos/`), `caption` optional, and `poster` optional (a still image under `public/videos/`, shown before the video loads so a slow phone does not stare at a black rectangle). The `<Video>` component is supplied by the rendering layer and resolves to the site's own player, so the video file is local and needs no third party (spec 0001, AC-7).
- The author writes no import line for `<Video>`. Each service route passes the component into the rendered content, so every service body uses one player and no file repeats an import.
- Any number of videos may appear, in any order, with text before, between, or after them (AC-4). A page with no video is simply a body with no `<Video>` call.
- A PDF is linked with an ordinary markdown link to the resource page's address, for example `[Prayer Booklet (PDF)](/resources/prayer-booklet)`; the reader downloads the file itself from that page, so a service body never hard codes a `public/` path.
- The body carries no HTML layout and no styling; look and typography belong to the design system (scope feature 4).

**State transitions**:

None. A content file has one state, committed and published. The `draft` flag on `announcements` already exists and is unchanged by this spec; it hides an announcement from the home page list until its date arrives.

**API surface**:

There is no HTTP API and no server; every surface below is a build time route that reads a collection and renders HTML (spec 0001, AC-1 and AC-4). Read access is public in every row, and no row has a write surface, since a change is a commit. Each area has a landing page that lists its own kind, sorted by `order`, so navigation has somewhere to point.

| Route                 | Reads                                                     | Key inputs              | Key outputs                                                                                | Access | Key errors                                               |
| --------------------- | --------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------- |
| `/services/`          | `services` where `kind` is `weekly`, sorted by `order`    | none                    | a listing of every weekly service, each row showing its title, day, and time               | public | an empty collection renders an empty state, not an error |
| `/shabbatonim/`       | `services` where `kind` is `shabbaton`, sorted by `order` | none                    | a listing of every Shabbaton, each row showing its title, day, and time                    | public | an empty collection renders an empty state, not an error |
| `/services/[slug]`    | `services` where `kind` is `weekly`                       | slug from the file name | one HTML page, its title, its body in order                                                | public | an unknown slug is not built at all, so no page exists   |
| `/shabbatonim/[slug]` | `services` where `kind` is `shabbaton`                    | slug from the file name | one HTML page, its title, its body in order                                                | public | an unknown slug is not built at all                      |
| `/resources/`         | all of `resources`, sorted by `order`                     | none                    | a listing of every PDF, each row showing its title and its category label where one is set | public | an empty collection renders an empty state, not an error |
| `/resources/[slug]`   | one `resources` entry                                     | slug from the file name | one HTML page with the PDF details and download link                                       | public | an unknown slug is not built at all                      |

**Value sourcing** (every value an acceptance criterion needs, and where it comes from):

| Action                    | Value produced or displayed                  | Source                                                                             |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Render a service page     | page title                                   | `services.title` front matter                                                      |
| Render a service page     | the page's web address                       | the file name under `src/content/services/`, turned into a slug by the glob loader |
| Choose the area and route | `/services` or `/shabbatonim` prefix         | `services.kind` front matter                                                       |
| Render the body           | heading levels and text                      | the author's markdown body, rendered by Astro's markdown pipeline                  |
| Render a video            | the player and its place in the page         | the inline `<Video>` call, at the position it is written                           |
| Render a video            | the video file itself                        | `src` on the `<Video>` call, a path under `public/videos/`                         |
| Render a video            | the caption under the player                 | `caption` on the `<Video>` call, optional and omitted when absent                  |
| Render a video            | the still image shown before the video loads | `poster` on the `<Video>` call, optional and omitted when absent                   |
| List services in an area  | listing order                                | `services.order`, then `title`                                                     |
| List services in an area  | the day and time shown beside a service      | `services.day` and `services.time`, optional and omitted when absent               |
| Render a resource page    | the PDF download address                     | `resources.file` front matter                                                      |
| Render a resource page    | the resource's web address                   | the file name under `src/content/resources/`, slugified                            |
| Link a PDF from a service | the destination of the link                  | the author's markdown link to `/resources/<slug>`                                  |
| List every PDF            | the resources listing contents               | the whole `resources` collection, sorted by `order`                                |
| List every PDF            | the category label shown on a row            | `resources.category` front matter, optional and omitted when absent                |

**Key invariants**:

- One service file produces exactly one page at exactly one address, and never a page in both areas.
- `kind` is always one of the two allowed values; anything else fails `astro check`.
- A `weekly` file never renders under `/shabbatonim/`, and a `shabbaton` file never renders under `/services/`.
- Every service file has a slug unique within its area.
- No service file is named `index`, since that name is reserved for its area's landing page.
- Every `resources.file` points at a PDF that exists under `public/pdfs/`, every `<Video src>` points at a video that exists under `public/videos/`, and every `poster` points at an image that exists. Nothing at build time can prove a URL is right, so this is a rule the sample media demonstrates rather than a check the build performs: the sample service commits a real video and the still image its `poster` names, and the sample resource commits a real PDF.
- Every resource has a slug unique in the collection.
- Video files live under `public/videos/` and are deliberately not precached, so the offline promise covers the page and its text while a video streams when a connection is present (spec 0001, AC-7).
- A PDF is not precached at install either. It is cached the first time a reader opens it online, because following a link is a navigation the service worker caches, so a booklet opened once works offline and one never opened does not. That is the accepted behaviour for this feature; precaching the PDFs at install is a change to weigh once their real sizes are known.

**Security model**:

Everything here is public. There is no sign in, no account, and no private material in these collections, so there is no read or write restriction to enforce and no role to check. No field holds personal data, and no field is derived from a visitor. The contact form and its single contact address are unchanged by this spec and remain owned by the temple information and contact decision (scope feature 11). The only non-public state is the existing `announcements.draft` flag, which is resolved at build time.

**Configuration required**: none. Video and PDF files live under `public/`, which is a directory in the repository, not an environment variable. The only new dependency is the `@astrojs/mdx` integration needed for the inline video component; it is a package, not a secret.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a weekly service file with a heading, some text, and two `<Video>` calls in a chosen order builds and renders in that order at `/services/<slug>`, verifies **AC-2**, **AC-3**, **AC-4**
- Happy path: a Shabbaton file builds at `/shabbatonim/<slug>` and appears only in the Shabbatonim area, verifies **AC-5**
- Failure case: a service file with `kind` missing or misspelled fails `astro check` with a schema error instead of building a page at the wrong address, verifies **AC-1**, **AC-7**
- Failure case: a service body that is all text with no `<Video>` call builds and renders with no player and no error, verifies **AC-4**
- Happy path: a resource file builds its own page and appears in the resources listing, and a service body linking to it resolves, verifies **AC-6**
- Happy path: the media the sample names exists, so the still image behind the player loads, the sample video plays from `public/videos/`, and the sample PDF downloads from `public/pdfs/`, verifies **AC-2**, **AC-4**, **AC-6**
- Offline case: a resource PDF opens with no connection once it has been opened online, and is not claimed to do so before that, verifies **AC-6**
- Failure case: a service saved as `.md` is not collected at all, so the author sees a missing page rather than a page whose video element silently does nothing, verifies **AC-2**, **AC-4**
- Permission: not applicable, since every page is public and there is no sign in; recorded here so a reviewer sees it was considered rather than missed, verifies **AC-1**

## Build plan

The project builds Tracer Bullet: prove one thin path through the whole loop, then thicken it. For a content model the thinnest real path is one service file that renders at its own address with a heading and a video, so the plan proves that single thread first and then repeats it for the Shabbatonim and the PDFs.

1. Add the `services` and `resources` collections to `src/content.config.ts` with the schemas and loader patterns above, leaving `pages` and `announcements` untouched, satisfies **AC-1**
2. Install `@astrojs/mdx`, register it in `astro.config.mjs`, and supply the `<Video>` component so an inline call renders a local player that is kept out of the precache, satisfies **AC-4**
3. Author one weekly service file (`.mdx`) with headings, prose, and two `<Video>` calls in a chosen order, and commit a sample video plus the still image its `poster` names under `public/videos/`, so the player has a real file to play and no image dangles, satisfies **AC-2**, **AC-3**, **AC-4**
4. Add the `/services/` landing page and the `/services/[slug]` route so that file builds to its own address, which proves the whole thread from file to page, satisfies **AC-2**, **AC-5**
5. Author one Shabbaton file and add the `/shabbatonim/` landing page and the `/shabbatonim/[slug]` route, reusing the same page shape, satisfies **AC-2**, **AC-5**
6. Author one PDF resource with a sample PDF under `public/pdfs/`, add `/resources/` and `/resources/[slug]`, and link the PDF from the sample service body through its resource page, satisfies **AC-6**
7. Run `npm run check` and `npm run build`, and confirm each sample page exists at its address with no client side framework, satisfies **AC-7**

## Consequences

**Positive**:

- Every service, weekly or Shabbaton, is written one way, so an author learns the pattern once.
- The order of the service is written once and rendered in that order, with no separate ordering list to keep in step.
- Adding a page is adding a file, so the site grows without a schema change for every new service.
- PDFs have one home and one address, and can be linked from anywhere.
- The model stays within spec 0001: plain files, no database, no server, static HTML, offline first.

**Negative / tradeoffs**:

- Service bodies are authored as MDX rather than plain markdown, a small step above what the author already knows, in exchange for the inline video.
- A wrong video path is only caught by a build check or a careful eye, since nothing verifies the file at authoring time.
- Video files are large and live in the repository, and they are deliberately kept out of the offline precache, so a video needs a connection the first time it plays (spec 0001, AC-7).
- If a video is later wanted on more than one page, this model repeats the path rather than sharing one entry. Accepted until that need is real.

**Neutral**:

- Two new collections and six new route files join the collections and routes that exist today: a landing page and a detail route for the service area, the same pair for the Shabbatonim, and a pair for the resources.
- The `kind` field carries the area, so the folder structure does not show it at a glance.
- The look of the player, the headings, and the prose is not settled here; the design system (scope feature 4) owns it, and this spec fixes only the content shape.
- Shabbaton dates are absent on purpose; the Holy Days calendar (scope feature 12) will decide how they are computed or curated.

## Follow-up

- [x] Install `@astrojs/mdx` and register it in `astro.config.mjs` before authoring service pages, since the inline video component needs it.
- [x] Settle the folder names for the binary files before the first page is authored: videos under `public/videos/` and PDFs under `public/pdfs/`.
- [ ] The Holy Days calendar (scope feature 12) decides how Shabbatonim dates are computed or curated; this spec leaves dates out of the service schema on purpose.
- [ ] The design system (scope feature 4) decides how the video player, headings, and prose look; this spec owns only the content shape.
- [ ] If a video ever needs to appear on more than one page, revisit whether a `videos` collection has earned its place.
- [ ] Renaming or moving a content file changes its address and breaks any link to it. The content sweep (scope feature 9) should add a `public/_redirects` map for the addresses carried over from the old Google Site, since Cloudflare Pages serves that file.
- [ ] Revisit precaching the PDFs: add `.pdf` to the service worker's precache list once their real sizes are known, so a booklet a member has never opened also works offline.
- [ ] The sample video and the sample PDF are placeholders that prove the thread end to end. The content sweep (scope feature 9) replaces them with the temple's real material and settles the final file sizes. The three sample videos, the two posters, and the sample PDF are committed; only the real material is outstanding.

## References

_Project sources_

- `docs/specs/0001-adopt-static-site-stack.md`: static output, content as plain files, the Content Layer, local hosting of media, and the boundary of the offline precache
- `docs/specs/0002-coding-standards-and-tooling.md`: strict types, the verify gate, and the lint and format conventions the new schema follows
- `src/content.config.ts`: the existing `pages` and `announcements` collections this model extends
- `docs/scope/scope.md`: the content model feature and its done condition, plus the calendar, design system, and temple contact features this spec hands off to
- The installed `astro-framework` skill: the Astro 7 Content Layer conventions, glob loaders, and the body content pattern

_Practices & standards_

- Model content the way it is authored, so written order is rendered order
- Give a collection only to material with a life of its own, such as a PDF reachable from more than one page
- Carry the site area in data rather than duplicating one schema across folders
