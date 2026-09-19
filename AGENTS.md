# Ucoy Temple Website - Agent Context

This is the public website for the United Congregation of Yisra'Yah, a temple replacing its Google Site with a custom build. It carries complete service and Holy Day materials that members can rely on from a phone, even with no internet.

## Project identity

- **Stack**: Astro 7, TypeScript, static output on Cloudflare Pages free tier
- **Node**: 22 minimum (see `.nvmrc`)
- **Workflow**: Beta tier (verify with `npm run check && npm run build` before test)
- **Approach**: Tracer Bullet (prove the whole thread with one real narrow path, then thicken one segment at a time)
- **TypeScript**: strict mode via `astro/tsconfigs/strict`, path aliases `@/*`, `@components/*`, `@layouts/*`, `@styles/*` all point into `src/`

## What exists now

- `astro.config.mjs` configures static output, the two font families (Inter for sans, Frank Ruhl Libre for Hebrew and display), and the `precacheManifest` integration
- `integrations/precache-manifest.mjs` writes `dist/sw-manifest.json` after each build so the hand written service worker can pre-cache shell HTML, stylesheets, scripts, fonts, and media
- `docs/scope/scope.md` is the feature trail map with 20 features across foundation, four slices, and a deferred list
- `docs/specs/0001-adopt-static-site-stack.md` records the stack decision and acceptance criteria
- `docs/specs/0002-coding-standards-and-tooling.md` records the coding standards and tooling decisions
- `public/` holds `favicon.svg`, `_headers`, `offline.html`, and `sw.js` (the hand written service worker)
- Skills are installed and pinned in `skills-lock.json`: architect, astro-framework, audit, check, debug, develop, document, scope, sync, test, web-perf, wrangler
- Tooling installed: ESLint 10, TypeScript ESLint, eslint-plugin-astro, Prettier 3 with prettier-plugin-astro, husky, lint-staged, editorconfig

## Key conventions

- Content lives as text files in the repository, every change is a commit, no database or content API
- Upcoming events come from the temple's Google Calendar, not from the repository
- No accounts, no sign in, no cookies, no tracking beyond cookieless Cloudflare Web Analytics
- The contact form sends to one site config value that holds the temple's email address
- Fonts are downloaded at build time and served from this site, never from a third party at runtime
- Offline is a core promise: the site works on a phone with no internet

## Build commands

- `npm run dev` — start the Astro dev server
- `npm run build` — build the static site
- `npm run preview` — preview the built site locally
- `npm run check` — run Astro check (TypeScript)
- `npm run verify` — check and build together (the Beta gate before test)
- `npm run lint` — run ESLint across the project
- `npm run format` — format everything with Prettier
- `npm run format:check` — check formatting without writing

## Linting and formatting

ESLint 10 flat config plus Prettier 3 with the Astro plugin.

- `.eslint.config.js` — flat config: JavaScript recommended, TypeScript ESLint recommended, Astro plugin recommended, Prettier absorbs all formatting rules
- `.prettierrc` — no semicolons, single quotes, no trailing commas, print width 100, LF line endings, 2-space indent
- `.editorconfig` — 2-space indent, LF, UTF-8, trim trailing whitespace, final newline on text files (root = true)
- `.lintstagedrc.json` — Prettier on `{ts,tsx,mjs,cjs,js,json,md}`, Prettier + ESLint fix on `*.astro`

Pre-commit: husky runs lint-staged on every commit. The hook runs `npx lint-staged`.

Type strictness: strict, no `any`, exhaustive types. The tsconfig extends `astro/tsconfigs/strict`.

Testing gate: no test runner installed yet. The project gates on `astro check` plus `npm run build` via `npm run verify`. Tests come later via `/test` when a feature needs them.

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

Two MCP servers are referenced by the stack spec and should be connected in your MCP settings when their time comes:

- **Astro documentation server** at `https://mcp.docs.astro.build/mcp` — connect now. It lets the agent search the live Astro documentation, which matters because content collections, actions, and sessions have all changed across recent major versions.
- **Cloudflare server** at `https://mcp.cloudflare.com/mcp` — connect when the site is ready to deploy, so the agent can work with the custom domain, DNS records, and analytics. It can change your Cloudflare account, so grant access only at that point.

## Where to read next

- Scope and trail map: `docs/scope/scope.md`
- Stack spec: `docs/specs/0001-adopt-static-site-stack.md`
- Astro config (fonts, output, integration): `astro.config.mjs`
- Service worker + precache integration: `integrations/precache-manifest.mjs` and `public/sw.js`
- Environment variable template: `.env.example`
- TypeScript config and path aliases: `tsconfig.json`
