# Ucoy Temple Website - Agent Context

This is the public website for the United Congregation of Yisra'Yah, a temple replacing its Google Site with a custom build. It carries complete service and Holy Day materials that members can rely on from a phone, even with no internet.

## Project identity

- **Stack**: Astro 7, TypeScript, static output on Cloudflare Pages free tier
- **Node**: 22 minimum (see `.nvmrc`)
- **Workflow**: Beta tier (verify with `npm run check && npm run build` before test)
- **Approach**: Tracer Bullet (prove the whole thread with one real narrow path, then thicken one segment at a time)
- **TypeScript**: strict mode via `astro/tsconfigs/strict`, path aliases `@/*`, `@components/*`, `@layouts/*`, `@styles/*` all point into `src/`

## What exists now

- `astro.config.mjs` configures static output, the two font families (Roboto for sans and body, Oswald for display), the `mdx` integration for service bodies, and the `precacheManifest` integration
- `src/content.config.ts` defines the four content collections: `pages` and `announcements` (unchanged), plus `services` (weekly services and Shabbatonim, told apart by `kind`, authored as `.mdx`) and `resources` (the temple's PDFs)
- `src/components/Video.astro` is the site's own player, called inline as `<Video src="…" />` inside a service body with no import of its own; the service routes pass it into the rendered content
- `src/pages/services/` and `src/pages/shabbatonim/` hold a landing page plus a `[slug]` route for each area; `src/pages/resources/` does the same for the PDFs
- `src/styles/tokens.css` is the single value source: a numbered ladder per hue (`grey`, `royal-gold`, `hebrew-red`, `kosher-blue`, steps 50 to 950, plus black and white) feeding a small set of named roles that every stylesheet consumes; `src/styles/tokens.test.ts` and `src/styles/literals.test.ts` lock the AA contrast of both modes, the role coverage, and the ban on raw values
- The reusable blocks (`Banner`, `Callout`, `Figure`, `Panel`, `PdfLink`, `Sidebar`, `SkipLink`, `Tag`) live in `src/components/` alongside `Video` and `Icon`; content styling lives in `src/styles/prose.css`
- `src/config/nav.ts` is the single source of the sidebar menu; the two service groups build themselves from the service files by `kind`, so a new `.mdx` appears in the menu with no code change
- Two weekly services are built so far: `shabbat-morning-service.mdx` and `friday-evening-home-ritual.mdx`. The temple keeps no Friday morning service, so the Friday page is the evening home ritual, and `src/config/site.ts` holds no schedule of its own
- `/style-guide` (`src/pages/style-guide.astro`) shows the whole system for eye review; it carries `noindex`, is unlinked from the menu, and must stay out of the sitemap and the search index
- `integrations/precache-manifest.mjs` writes `dist/sw-manifest.json` after each build so the hand written service worker can pre-cache shell HTML, stylesheets, scripts, fonts, and images. Video (`.mp4`) and PDFs are deliberately left out of the pre-cache
- `docs/scope/scope.md` is the feature trail map with 23 features across foundation, four slices, and a deferred list
- `docs/specs/0001-adopt-static-site-stack.md` records the stack decision and acceptance criteria
- `docs/specs/0002-coding-standards-and-tooling.md` records the coding standards and tooling decisions
- `docs/specs/0003-content-model.md` records the content model: one `services` collection with videos inline in an MDX body, and a `resources` collection for PDFs
- `docs/specs/0004-design-system-ui-foundation/` records the design system decision (index, rationale, and a `verify.md` acceptance checklist): the two token layers, both modes, the sidebar shell, the blocks, and the style guide
- `src/components/Icon.astro` is the site's only icon source: sharp outline SVGs at a fixed stroke width, drawn in `currentColor`, with no icon package and no icon font
- `src/worker-sandbox.ts` loads the real `public/sw.js` into a `node:vm` context with stand ins for the Cache API, so `sw-navigation.test.ts` and `sw-media.test.ts` drive real requests through the shipped worker rather than reimplementing it, and a regression in the worker file fails those tests. `content.files.test.ts` guards the content files' front matter and body shape, `content.schema.test.ts` the collection schemas, `home.service-times.test.ts` the home page reading its times from content, and `friday-ritual.wiring.test.ts` the service menu building from content by `kind` with no hand written schedule anywhere in `src/config/site.ts`
- `src/layouts/Layout.astro` holds the shell: the fixed, self-scrolling black sidebar, the content column, and the theme switch that cycles System, Light, Dark
- `public/` holds `favicon.png`, `_headers`, `offline.html`, and `sw.js` (the hand written service worker), plus `videos/` and `pdfs/` for the local media
- Skills are installed and pinned in `skills-lock.json`: architect, astro-framework, audit, check, debug, develop, document, scope, sync, test, web-perf, wrangler
- Tooling installed: ESLint 10, TypeScript ESLint, eslint-plugin-astro, Prettier 3 with prettier-plugin-astro, husky, lint-staged, editorconfig, Vitest, @types/node

## Key conventions

- Content lives as text files in the repository, every change is a commit, no database or content API
- Upcoming events come from the temple's Google Calendar, not from the repository
- A service (weekly or Shabbaton) is one `.mdx` file under `src/content/services/`; `kind` decides the area and route, and the written order of the body is the order the service runs in
- Any page that lists services reads the `services` collection, so a day or a time lives in exactly one content file; no page hardcodes a service time or names a service as plain text instead of linking its page
- A video goes inline in a service body as `<Video src="/videos/…" />` with no import line; `caption` and `poster` are optional
- Service bodies start at `##`, because the front-matter title is the page's only `h1`
- A PDF lives under `public/pdfs/` and is linked through its resource page (`/resources/<slug>`), never by its `public/` path
- No accounts, no sign in, no cookies, no tracking beyond cookieless Cloudflare Web Analytics
- The contact form sends to one site config value that holds the temple's email address
- Fonts are downloaded at build time and served from this site, never from a third party at runtime
- Every colour, type, spacing, and radius value a stylesheet or style block uses is a token from `src/styles/tokens.css`; a raw hex, `rgb`, `rgba`, `hsl`, `hsla`, `px`, or `rem` literal anywhere else under `src/` fails the literal scan in `npm run test`
- Styles name token roles only, never a ladder step like `--color-royal-gold-600`; restyling the temple's palette means editing ladder steps in `tokens.css` and nothing else
- A value that needs alpha is a token, not a role, because a ladder step carries no alpha; `--scrim` (the dim layer behind the narrow screen menu) is the current one, and a style block never writes an `rgb()` of its own
- The theme choice lives on the member's device under the `localStorage` key `ucoy-theme`, applied as `data-theme` on `html` before the first paint; the site still sets no cookies
- Hebrew direction is handled in `src/styles/prose.css` alone: a phrase inside an English sentence carries `dir="auto"` on a span, a full passage is a block with `lang="he"` and `dir="rtl"`; pages carry no direction rules of their own
- Offline is a core promise: the site works on a phone with no internet

## Build commands

- `npm run dev` — start the Astro dev server
- `npm run build` — build the static site
- `npm run preview` — preview the built site locally. It cannot verify the offline promise: the worker registers behind `import.meta.env.PROD`, which preview sets false, and preview answers `/sw-manifest.json` with the 404 page, so the worker installs holding only `/offline.html`. Serve `dist/` over a plain static server (for example `npx http-server dist -p 5077`) to exercise the service worker and airplane mode
- `npm run check` — run Astro check (TypeScript)
- `npm run verify` — check and build together (the Beta gate before test)
- `npm run lint` — run ESLint across the project
- `npm run format` — format everything with Prettier
- `npm run format:check` — check formatting without writing
- `npm run setup:mcp` — write this project's MCP servers to Cline's global settings file (see MCP servers below)

## Linting and formatting

ESLint 10 flat config plus Prettier 3 with the Astro plugin.

- `eslint.config.js` — flat config: JavaScript recommended, TypeScript ESLint recommended, Astro plugin recommended, Prettier absorbs all formatting rules. ESLint covers `.js`, `.mjs`, `.ts`, and `.astro`; `.mdx` is formatted but not linted. Node globals are scoped to `astro.config.mjs` and to `scripts/**/*.mjs`, and service worker globals to `public/sw.js`
- `.prettierrc` — no semicolons, single quotes, no trailing commas, print width 100, LF line endings, 2-space indent
- `.editorconfig` — 2-space indent, LF, UTF-8, trim trailing whitespace, final newline on text files (root = true)
- `.lintstagedrc.json` — Prettier on `{ts,tsx,mjs,cjs,js,json,md,mdx}`, Prettier + ESLint fix on `*.astro`
- `.prettierignore` — Prettier reads `.gitignore` by default, so build output is already skipped; this file adds what `.gitignore` cannot cover, namely the vendored skills in `.agents/`, the `.continue`, `.windsurf` and `.cline` config dirs, husky's generated `.husky/_/` shims, `.tmp-*` scratch files, `package-lock.json`, and `wrangler.toml` (no TOML parser is installed). Keep `.agents/` out of every check: it is 99 pinned files that no one edits by hand

Pre-commit: husky runs lint-staged on every commit. The hook runs `npx lint-staged`.

Type strictness: strict, no `any`, exhaustive types. The tsconfig extends `astro/tsconfigs/strict`.

Testing gate: Vitest is installed and `npm run test` runs the suite (`.test.ts` files under `src/`; framework and location saved in `test-preferences.json`). The primary gate stays `npm run verify` (`astro check` plus `astro build`); at the Beta tier `/test` follows a feature's Verify step and ticks the feature's `Test it` box in the scope.

## Available skills

Skills are installed and pinned in `skills-lock.json`. Use the one that matches the task; each skill knows its own conventions.

- **architect** — Decide a feature before building it. Run when a feature says "needs a decision" or you are unsure how to shape it.
- **astro-framework** — Astro 7 conventions: content collections, routing, images, SSR, TypeScript, and the patterns this project follows.
- **audit** — Bootstrap or gap-fill the AGENTS.md files so every tool reads the same project context.
- **check** — Run Astro check and the verify gate (`npm run check && npm run build`) before handing off or testing.
- **debug** — Walk a failing build, runtime error, or unexpected output without guessing at the cause.
- **develop** — Build one feature end to end against the spec and the existing conventions.
- **document** — Write or update specs and other project docs when the code or decisions change.
- **scope** — Read or extend the feature trail map in `docs/scope/scope.md`.
- **sync** — Keep docs in sync with code after a change; the owner of post-change documentation.
- **test** — Add and run tests for a feature once it builds.
- **web-perf** — Web performance guidance for the static site and its offline caching.
- **wrangler** — Cloudflare Pages, Workers, and related platform tasks when the site is ready to deploy.

Skills declined or left uninstalled are recorded in the spec's Follow-up section.

## MCP servers

MCP server definitions are global to Cline, read from one file in the home folder rather than from this repository, so there is no project scoped server list to commit. `npm run setup:mcp` writes the entries below to that file, merging rather than overwriting, so a fresh clone on a new machine is one command. Add `-- --dry-run` to see the result first. Cline reads the file when the extension host starts, so reload the VS Code window afterwards, or restart the one server from the MCP Servers tab.

Three servers are wanted:

- **Chrome DevTools** at `npx -y chrome-devtools-mcp@latest` — installed by the setup script. It drives a real Chrome, which is how the keyboard, narrow screen, reduced motion, Windows High Contrast, and both colour mode steps in a feature's verify checklist get exercised. Without it those steps stay blocked and a check cannot pass them.
- **Astro documentation server** at `https://mcp.docs.astro.build/mcp` — connect now. It lets the agent search the live Astro documentation, which matters because content collections, actions, and sessions have all changed across recent major versions.
- **Cloudflare server** at `https://mcp.cloudflare.com/mcp` — connect when the site is ready to deploy, so the agent can work with the custom domain, DNS records, and analytics. It can change your Cloudflare account, so grant access only at that point.

## Where to read next

- Scope and trail map: `docs/scope/scope.md`
- Stack spec: `docs/specs/0001-adopt-static-site-stack.md`
- Content model spec: `docs/specs/0003-content-model.md`
- Design system spec, rationale, and verify checklist: `docs/specs/0004-design-system-ui-foundation/`
- Content collections and their schemas: `src/content.config.ts`
- Sample service, Shabbaton, and resource: `src/content/services/` and `src/content/resources/`
- Astro config (fonts, output, integrations): `astro.config.mjs`
- Service worker + precache integration: `integrations/precache-manifest.mjs` and `public/sw.js`
- Environment variable template: `.env.example`
- TypeScript config and path aliases: `tsconfig.json`
- Design tokens and roles: `src/styles/tokens.css`
- Living style guide for eye review: `/style-guide` in a running dev server
- Tooling script that writes Cline's MCP settings: `scripts/setup-mcp.mjs`
