# 0013. Site search

**Date**: 2026-10-28
**Status**: In Progress

## Summary

Site search lets a member find any service, Holy Day, or resource from any page. A search box sits in the header on narrow screens and at the top of the sidebar on wider screens, and results live on a dedicated /search page. Pagefind builds the index at build time and runs in the browser, so search keeps working offline once the service worker has cached the bundle.

## Context

The site is fully static on Cloudflare Pages with no server, so search cannot call an API. Members often look for a specific service, booklet, or portion by topic, and the sidebar menu only lists pages by section. Search must work on a phone with no connection, and the style guide must never appear in the index.

## Requirements

**User stories**:

- As a member, I want to search from any page so I can find a service, Holy Day, or resource without browsing the menu.
- As a member, I want search to work offline so I can find material with no connection.

**Acceptance criteria**:

- **AC-1**: A search box is available on every page, in the header on narrow screens and at the top of the sidebar on wider screens.
- **AC-2**: Submitting a query opens /search and shows matching pages with title, section, and a short excerpt.
- **AC-3**: An empty query and a no-results query each show a clear message.
- **AC-4**: The style guide and the 404 page are not in the index.
- **AC-5**: The Pagefind bundle and index are pre-cached, so search works on the first offline use.
- **AC-6**: A keyboard shortcut focuses the search box.
- **AC-7**: The index covers the home page, services, resources, portion pages, Holy Days, and static pages.

## Options considered

### Option 1: Pagefind

Build-time indexing with a small browser runtime and chunked index files.

**Pros**:

- Designed for static sites and runs entirely in the browser.
- Handles ranking, excerpts, and highlighting.
- Offline friendly once the bundle is cached.

**Cons**:

- Adds a build step and a new dependency.
- Index files add weight to the precache.

### Option 2: Fuse.js over a hand-built JSON index

A client-side fuzzy search over one JSON file generated at build time.

**Pros**:

- One index file to cache.
- Small and familiar.

**Cons**:

- Ranking and excerpts must be built by hand.
- The index grows with every page and loads all at once.

### Option 3: Hand-rolled substring search

No dependency, search a JSON array in the browser.

**Pros**:

- No new dependency.

**Cons**:

- Poor ranking and no highlighting.
- More code to maintain.

## Decision

**Chosen option**: Option 1: Pagefind.

Pagefind gives good ranking, excerpts, and highlighting with no server, and its bundle caches cleanly for offline use. The build step runs through the astro-pagefind integration, and the precache manifest now includes every Pagefind file.

**Implementation skills**: `astro-framework` (`.agents/skills/astro-framework/`).

## Rationale

A static site needs client-side search, and Pagefind is purpose-built for that. Fuse.js and hand-rolled search would both require maintaining ranking and excerpt logic that Pagefind already provides. The precache cost is acceptable for the offline promise.

## Feature design

- `src/components/SearchBox.astro` renders a GET form that posts to /search, so it works without JavaScript.
- `src/pages/search.astro` reads the `q` query parameter, loads Pagefind from `/pagefind/pagefind.js`, searches, and renders up to twenty results with title, section, and excerpt.
- `src/layouts/Layout.astro` adds `data-pagefind-body` to the main content area by default and `data-pagefind-ignore="all"` when `searchable` is false.
- The style guide and 404 page pass `searchable={false}`.
- `astro.config.mjs` registers the astro-pagefind integration.
- `integrations/precache-manifest.mjs` now precaches the Pagefind file extensions, including wasm and the chunked index files.

## Build plan

1. Install and register astro-pagefind. Satisfies AC-7.
2. Add the search box to the header and sidebar. Satisfies AC-1.
3. Add the /search page with Pagefind loading and result rendering. Satisfies AC-2, AC-3, AC-6 is covered by the layout script.
4. Exclude the style guide and 404 from the index via the searchable prop. Satisfies AC-4.
5. Extend the precache manifest for Pagefind files. Satisfies AC-5.
6. Add the keyboard shortcut in the layout. Satisfies AC-6.

## Consequences

- Search requires JavaScript; with JavaScript off the box submits a query but no results render.
- The precache grows by the Pagefind bundle and index, which is the cost of offline search.
- Pagefind runs after the build, so the precache manifest integration must run after it.

## Follow-up

- Add search to the navigation if members find the box hard to spot.
- Revisit the precache size budget once offline PDFs are settled.

## References

- Project sources: `AGENTS.md`, `docs/scope/scope.md`, spec 0004, spec 0001.
- Practices: Pagefind static search, Astro integrations.
