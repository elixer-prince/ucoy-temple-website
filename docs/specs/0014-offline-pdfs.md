# 0014. Precache service booklets for offline access

**Date**: 2026-11-01
**Status**: Accepted

## Summary

The temple's service booklets are PDF files that members open during worship. Currently they are excluded from the offline precache, so a member needs internet to open any booklet for the first time. This spec adds all eight service booklets to the precache so they work offline immediately, with a background update strategy that quietly replaces stale copies when the member returns online. At 1.39 megabytes total, the addition is modest and fits comfortably on any phone.

## Context

The site's offline promise covers every page, style sheet, script, font, and image through the service worker precache. But PDFs were deliberately left out when the precache was designed, because they are large files that could bloat the install payload. The result is a gap: a member can read every service page offline, but when the service page links to a booklet, the browser asks for a connection.

The temple now has eight service booklets covering Shabbat and the major Holy Days. They total 1.39 megabytes, which is small enough to precache without hurting the initial load on a modern phone. The member who installs the site on Friday wants every booklet available for Shabbat, not just the ones they happened to open while online.

## Requirements

**User stories**:

- As a member attending service offline, I want every service booklet available without internet so that I can follow along even when my phone has no signal.
- As a member who installed the site before a booklet was updated, I want the newer version without having to do anything so that I always have the current text.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: All eight PDF booklets are included in the precache manifest after build, so a fresh install caches them at once and they open offline immediately.
- **AC-2**: The precache installs successfully even on a slow connection; the worker does not fail if one PDF is slow to download.
- **AC-3**: When a booklet is revised and the site is redeployed, the service worker detects the new version and updates the cached copy in the background on the next online visit, without blocking the current page.
- **AC-4**: Adding a new PDF to the resources collection automatically includes it in the precache on the next build, with no code change required.
- **AC-5**: The PDF cache strategy remains separate from the shell cache so a PDF revision does not force the entire shell to reinstall.

## Options considered

### Option 1: Precache all PDFs in the shell cache

Add `.pdf` to the `PRECACHE_EXTENSIONS` set in `integrations/precache-manifest.mjs`, so every PDF becomes part of the shell cache list. The worker precaches them at install alongside HTML, CSS, and fonts.

**Pros**:

- Simplest change: one line in the precache integration.
- PDFs are available offline immediately after install.

**Cons**:

- PDFs share the shell cache name, so any PDF change forces the entire shell to reinstall. A revised booklet would trigger a full reinstall of every page, style sheet, and font.
- No separation of concerns between the shell and the booklets.

### Option 2: Precache PDFs in a dedicated cache, with background update

Extend the precache manifest to list PDF URLs separately, and add a dedicated PDF cache in the service worker. The worker precaches PDFs at install in their own cache, then checks for newer versions in the background on each fetch. This is the recommended approach.

**Pros**:

- PDF revisions only update the PDF cache, leaving the shell untouched. A booklet change does not force every page to reinstall.
- Background update keeps the member's copy current without blocking the page they are reading.
- Clear separation: shell cache for the site, PDF cache for booklets, media cache for video.

**Cons**:

- More service worker code than Option 1: a new cache name, a precache function for PDFs, and a background update path in the fetch handler.

### Option 3: Runtime cache only (cache on first open)

Keep PDFs out of the precache entirely. Cache each PDF in the runtime cache when the member first opens it, so it works offline on the second visit.

**Pros**:

- Smallest initial install: no PDF bytes at install time.
- Only the booklets the member actually opens consume storage.

**Cons**:

- First offline attempt fails for any booklet the member has not opened while online. This breaks the offline promise for the core use case: a member who installs on Friday and needs all booklets for Shabbat.

## Decision

**Chosen option**: Option 2: Precache PDFs in a dedicated cache, with background update

Add a dedicated PDF cache to the service worker, extend the precache manifest to list PDF URLs, and precache them at install alongside the shell. On each PDF fetch, check the network for a newer version and update the cache in the background.

**Implementation skills**: `web-perf` (`.agents/skills/web-perf/`)

## Rationale

Option 2 gives the best offline experience without the shell reinstall penalty of Option 1. The temple's booklets change rarely, but when they do, only the PDF cache should update. Option 3 leaves a gap in the offline promise that defeats the core goal: a member who installs before Shabbat should have every booklet, not just the ones they opened while online.

The dedicated cache follows the existing pattern in the service worker: three named caches (shell, runtime, media) with clear ownership. Adding a fourth for PDFs extends that pattern without changing the existing ones.

## Feature design

### Service worker changes

The service worker gains one new constant and one new cache:

- `PDF_CACHE = 'pdfs-${VERSION}'` — a named cache for precached PDFs.
- `KEEP` set expands to include `PDF_CACHE`.
- `precachePdfs()` — called during install alongside `precacheShell()`, reads the manifest for PDF URLs and caches them in `PDF_CACHE`.
- `precacheShell()` must skip `.pdf` URLs when iterating the manifest, so PDFs never enter the shell cache.
- The fetch handler routes `.pdf` requests to `respondToPdf()` before the asset fallback, similar to how `isMedia()` checks before `respondToAsset()`. This handler serves from `PDF_CACHE` and checks the network for a newer version in the background.

### Precache manifest changes

The precache manifest integration gains one change:

- `.pdf` added to `PRECACHE_EXTENSIONS`, so PDF files in the build output are collected into the manifest URL list. The manifest already distinguishes URLs by path, so the worker can separate PDFs from shell files.

### Build plan

Ordered tasks following the Tracer Bullet approach: prove one PDF works end to end, then thicken to all eight.

1. **Add `.pdf` to precache extensions** — Update `integrations/precache-manifest.mjs` to include `.pdf` in `PRECACHE_EXTENSIONS`, so the manifest lists PDF URLs after build. (AC-1, AC-4)

2. **Add the PDF cache to the service worker** — Introduce `PDF_CACHE`, extend `KEEP`, and write `precachePdfs()` that reads the manifest and caches PDF URLs in `PDF_CACHE`. Call it from the install event alongside `precacheShell()`. Update `precacheShell()` to skip `.pdf` URLs so they never enter the shell cache. (AC-1, AC-5)

3. **Route PDF fetches through the new handler** — Add `respondToPdf()` that serves from `PDF_CACHE` and checks the network in the background for a newer version. Add an `isPdf()` check in the fetch event before the asset fallback, so `.pdf` requests reach the PDF handler instead of `respondToAsset()`. (AC-1, AC-3)

4. **Verify all eight booklets precache** — Build the site, confirm the manifest lists all eight PDF URLs, and verify the worker precaches them at install. Test offline access in a real browser. (AC-1, AC-2)

5. **Verify background update on PDF revision** — Simulate a PDF revision (replace one PDF, rebuild), then load the site online and confirm the worker updates only the PDF cache without reinstalling the shell. (AC-3, AC-5)

### Critical test scenarios

- **Fresh install offline**: Install the worker, go offline, open every booklet page. All eight PDFs load without network. (Maps to AC-1)
- **Slow install**: Throttle the network to 2G during install. The worker completes and all PDFs are cached. (Maps to AC-2)
- **PDF revision**: Replace one PDF, rebuild, load the site online. The next PDF fetch serves the new version; the shell cache name is unchanged. (Maps to AC-3, AC-5)
- **New PDF added**: Add a ninth PDF to resources, rebuild. The manifest includes it, and the worker precaches it on the next install. (Maps to AC-4)

## Consequences

- The initial precache grows by approximately 1.39 megabytes. On a fast connection this adds less than a second; on a slow 3G connection it adds roughly 10 seconds to install.
- The service worker now manages four caches instead of three. The activation cleanup already iterates `KEEP`, so no change is needed there.
- PDFs are content-addressed by their filename in `public/pdfs/`. If the temple renames a PDF without updating the resource content file, the old name stays in the precache until the next build. This is the same behavior as any other precached asset.

## Follow-up

- Monitor the precache size as new booklets are added. If the total exceeds 5 megabytes, reconsider whether all booklets should remain in the precache or whether an opt-in flag is warranted.

## References

- Service worker precache integration: `integrations/precache-manifest.mjs`
- Hand-written service worker: `public/sw.js`
- Resource collection schema: `src/content.config.ts` (resources entry)
- Content model spec: [0003](0003-content-model.md)
- Site-wide offline spec: [0016 scope row](../scope/scope.md) (feature 16 in scope)
