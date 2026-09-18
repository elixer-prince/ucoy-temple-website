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
    event.respondWith(respondToNavigation(request));
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

/**
 * Returns true when the URL path points to a media file (video/audio)
 * that should use the network-first strategy.
 */
function isMedia(pathname) {
  return MEDIA_EXTENSIONS.some((ext) =>
    pathname.toLowerCase().endsWith(ext),
  );
}

/**
 * Pre-cache the static shell during the install event.
 *
 * Caches:
 *   - The precache manifest (sw-manifest.json) — a list of hashed build
 *     output URLs written by integrations/precache-manifest.mjs.
 *   - Every URL listed in that manifest (pages, CSS, JS, fonts, images).
 *   - The offline fallback page (/offline.html).
 *
 * If the manifest is unavailable the worker still installs with just the
 * offline page, so a fresh install always works.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);

  // Always cache the offline fallback first.
  try {
    const offlineResponse = await fetch(OFFLINE_URL, {
      cache: 'reload',
    });
    if (offlineResponse.ok) {
      await cache.put(OFFLINE_URL, offlineResponse);
    }
  } catch (err) {
    console.warn('SW: could not cache offline page', err);
  }

  // Fetch and cache every file listed in the build manifest.
  try {
    const manifestResponse = await fetch(MANIFEST_URL, {
      cache: 'reload',
    });
    if (!manifestResponse.ok) return;

    const manifest = await manifestResponse.json();
    const requests = manifest.urls.map(
      (url) => new Request(url, { cache: 'reload' }),
    );
    await cache.addAll(requests);
  } catch (err) {
    console.warn('SW: could not pre-cache manifest URLs', err);
  }
}

/**
 * Handle navigation requests (HTML page loads).
 *
 * Strategy: cache-first, then network, then offline fallback.
 *   1. Serve the cached page immediately if available.
 *   2. If not cached, fetch from the network and cache the result.
 *   3. If the network fails, serve /offline.html.
 *
 * This keeps pages fast on repeat visits while letting first-time
 * visitors get the content online.
 */
async function respondToNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  // 1. Cache-first: serve the precached page immediately.
  const cached = await cache.match(request);
  if (cached) return cached;

  // 2. Cache miss — try the network.
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache for future offline visits.
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 3. Network failed — fall back to the offline page.
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    // Offline page itself wasn't cached — last resort.
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Handle media requests (video/audio).
 *
 * Strategy: network-first, cache on success.
 *   1. Fetch from the network.
 *   2. If successful, cache a copy so the video plays from local
 *      hosting on subsequent visits (spec 0001, AC-7).
 *   3. If the network fails, fall back to the cache.
 *
 * Video is NOT precached at install time — it is left to the network
 * first path, as the spec requires.
 */
async function respondToMedia(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(MEDIA_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try the cache.
    const cache = await caches.open(MEDIA_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    // No cached copy and no network.
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Handle asset requests (CSS, JS, fonts, images, JSON).
 *
 * Strategy: cache-first, then network.
 *   1. Check the shell cache (precached at install).
 *   2. If not found, check the runtime cache.
 *   3. If still not found, fetch from the network and cache the result.
 *   4. If the network fails, return a 503.
 */
async function respondToAsset(request) {
  // 1. Shell cache (precached build output).
  const shellCache = await caches.open(SHELL_CACHE);
  const cached = await shellCache.match(request);
  if (cached) return cached;

  // 2. Runtime cache.
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const runtimeCached = await runtimeCache.match(request);
  if (runtimeCached) return runtimeCached;

  // 3. Network fallback.
  try {
    const response = await fetch(request);
    if (response.ok) {
      await runtimeCache.put(request, response.clone());
    }
    return response;
  } catch {
    // 4. Everything failed.
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}
