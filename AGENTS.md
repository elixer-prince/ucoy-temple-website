# Ucoy Temple Website - Agent Context

This is the public website for the United Congregation of Yisra'Yah, a temple replacing its Google Site with a custom build. It carries complete service and Holy Day materials that members can rely on from a phone, even with no internet.

## Project identity

- **Stack**: Astro 7, TypeScript, static output on Cloudflare Pages free tier
- **Node**: 22 minimum (see `.nvmrc`)
- **Workflow**: Beta tier (verify with `npm run check && npm run build` before test)
- **Approach**: Tracer Bullet (prove the whole thread with one real narrow path, then thicken one segment at a time)
- **TypeScript**: strict mode via `astro/tsconfigs/strict`, path aliases `@/*`, `@components/*`, `@layouts/*`, `@styles/*` all point into `src/`

## What exists now

This project is in foundation phase. The stack spec is written, the Astro scaffold and trail map are in place, but the `src/` source tree has not been built yet.

- `astro.config.mjs` configures static output, the two font families (Inter for sans, Frank Ruhl Libre for Hebrew and display), and the `precacheManifest` integration
- `integrations/precache-manifest.mjs` writes `dist/sw-manifest.json` after each build so the hand written service worker can pre-cache shell HTML, stylesheets, scripts, fonts, and media
- `docs/scope/scope.md` is the feature trail map with 20 features across foundation, four slices, and a deferred list
- `docs/specs/0001-adopt-static-site-stack.md` records the stack decision and acceptance criteria
- `public/` holds `favicon.svg`, `offline.html`, and `sw.js` (the hand written service worker)
- Skills are installed and pinned in `skills-lock.json`: architect, astro-framework, audit, check, debug, develop, document, scope, sync, test, web-perf, wrangler

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

## Where to read next

- Scope and trail map: `docs/scope/scope.md`
- Stack spec: `docs/specs/0001-adopt-static-site-stack.md`
- Astro config (fonts, output, integration): `astro.config.mjs`
- Service worker + precache integration: `integrations/precache-manifest.mjs` and `public/sw.js`
