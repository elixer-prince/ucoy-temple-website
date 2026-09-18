/*
 * Service worker for the United Congregation of Yisra'Yah website.
 *
 * Hand written on purpose (spec 0001, Proposed stack): the Astro PWA wrappers
 * stop below Astro 7, so a small worker of our own keeps the framework current
 * with no unsupported dependency.
 *
 * Behaviour, following the spec's offline cache strategy:
 *   pages, styles, fonts  pre-cached at install, then kept fresh in the background
 *   video                 network first, cached only when it arrives whole
 *   every other origin    left alone (the calendar embed and analytics beacon)
 *
 * The list of files to pre-cache is written after each build by
 * integrations/precache-manifest.mjs, because a hashed filename cannot be known
 * in advance.
 */

const VERSION = 'v1';

/*
 * Bumping VERSION is what replaces the pre-cache after a deploy, which is the
 * mechanism spec 0001 commits to here. Scope feature 16 owns the finished
 * update experience (telling a visitor a new version is ready, and applying it
 * at a moment of their choosing); this worker only guarantees that a fresh
 * install always starts from a clean cache.
 */
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const MEDIA_CACHE = `media-${VERSION}`;

const KEEP = new Set([SHELL_CACHE, RUNTIME_CACHE, MEDIA_CACHE]);

const OFFLINE_URL = '/offline.html';
const MANIFEST_URL = '/sw-manifest.json';

const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.m4v', '.mov'];

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !KEEP.has(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Other origins are none of this worker's business: the calendar embed, the
  // analytics beacon, and anything else stay exactly as they are.
  if (url.origin !== self.location.origin) return;
  if (url.pathname === MANIFEST_URL) return;

  if (request.mode === 'navigate') {
    event.respondWith(respondToNavigation(request, url));
    return;
  }

  if (isMedia(url.pathname)) {
    event.respondWith(respondToMedia(request));
    return;
  }

  event.respondWith(respondToAsset(request));
});

/** Lets the page tell a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
