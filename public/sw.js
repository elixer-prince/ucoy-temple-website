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

const VERSION = 'v2'

/*
 * Bumping VERSION is what replaces the pre-cache after a deploy, which is the
 * mechanism spec 0001 commits to here. Scope feature 16 owns the finished
 * update experience (telling a visitor a new version is ready, and applying it
 * at a moment of their choosing); this worker only guarantees that a fresh
 * install always starts from a clean cache.
 */
const SHELL_CACHE = `shell-${VERSION}`
const RUNTIME_CACHE = `runtime-${VERSION}`
const MEDIA_CACHE = `media-${VERSION}`

const KEEP = new Set([SHELL_CACHE, RUNTIME_CACHE, MEDIA_CACHE])

const OFFLINE_URL = '/offline.html'
const MANIFEST_URL = '/sw-manifest.json'

const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.m4v', '.mov']

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => !KEEP.has(name)).map((name) => caches.delete(name)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Other origins are none of this worker's business: the calendar embed, the
  // analytics beacon, and anything else stay exactly as they are.
  if (url.origin !== self.location.origin) return
  if (url.pathname === MANIFEST_URL) return

  if (request.mode === 'navigate') {
    event.respondWith(respondToNavigation(request))
    return
  }

  if (isMedia(url.pathname)) {
    event.respondWith(respondToMedia(request))
    return
  }

  event.respondWith(respondToAsset(request))
})

/** Lets the page tell a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/**
 * Returns true when the URL path points to a media file (video/audio)
 * that should use the network-first strategy.
 */
function isMedia(pathname) {
  return MEDIA_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext))
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
  const cache = await caches.open(SHELL_CACHE)

  // Always cache the offline fallback first.
  try {
    const offlineResponse = await fetch(OFFLINE_URL, {
      cache: 'reload'
    })
    if (offlineResponse.ok) {
      await cache.put(OFFLINE_URL, offlineResponse)
    }
  } catch (err) {
    console.warn('SW: could not cache offline page', err)
  }

  // Fetch and cache every file listed in the build manifest.
  try {
    const manifestResponse = await fetch(MANIFEST_URL, {
      cache: 'reload'
    })
    if (!manifestResponse.ok) return

    const manifest = await manifestResponse.json()
    const requests = manifest.urls.map((url) => new Request(url, { cache: 'reload' }))
    await cache.addAll(requests)
  } catch (err) {
    console.warn('SW: could not pre-cache manifest URLs', err)
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
 *
 * A page is built as a directory index: the file for /services is
 * /services/index.html. The Cache API matches on the exact URL, so a request for
 * /services does not match the cached /services/index.html and a member offline
 * would land on the fallback page even though the page is in the cache. So a
 * miss retries the directory index form before giving up.
 */
async function respondToNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)

  // 1. Cache-first: serve the precached page immediately.
  const cached = await matchPage(cache, request)
  if (cached) return cached

  // 2. Cache miss — try the network.
  try {
    const response = await fetch(request)
    if (response.ok) {
      // Cache for future offline visits.
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    // 3. Network failed — fall back to the offline page.
    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline

    // Offline page itself wasn't cached — last resort.
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

/**
 * Finds a cached page for a navigation request, trying the directory index form
 * as well. `/` resolves to `/index.html`, and `/services/shabbat-morning-service`
 * to `/services/shabbat-morning-service/index.html`.
 */
async function matchPage(cache, request) {
  const direct = await cache.match(request)
  if (direct) return direct

  const url = new URL(request.url)
  const indexPath = `${url.pathname.replace(/\/$/, '')}/index.html`
  return cache.match(indexPath)
}

/**
 * Handle media requests (video/audio).
 *
 * Strategy: network-first, keep a copy only when the download arrives whole.
 *   1. Fetch from the network and hand that answer back untouched.
 *   2. When it holds the whole file, cache a copy so the video plays from
 *      local hosting on subsequent visits (spec 0001, AC-7).
 *   3. If the network fails, fall back to the cache.
 *
 * Video is NOT precached at install time — it is left to the network
 * first path, as the spec requires.
 *
 * A media element does not ask for a plain URL: it sends a `Range` header, so
 * the server answers 206 Partial Content. The Cache API refuses to store a 206,
 * so the old `if (response.ok)` guard let the store attempt through — 206 counts
 * as ok — and the rejection then landed in the same try as the fetch. That made
 * a working download look like a dead network, and every video request was
 * answered with an empty 503: the player reported
 * `MEDIA_ELEMENT_ERROR: code 4` for a file that was never at fault.
 *
 * Two rules keep that from coming back. A copy is only attempted for a whole
 * file, and a copy that fails is never allowed to replace the answer.
 */
async function respondToMedia(request) {
  try {
    const response = await fetch(request)

    if (isWholeFile(response)) {
      try {
        await storeMedia(request, response)
      } catch (error) {
        // A copy we could not keep is no reason to withhold the download.
        console.warn('Service worker could not cache media', request.url, error)
      }
    }

    return response
  } catch {
    // Network failed — try the cache.
    const cache = await caches.open(MEDIA_CACHE)
    const cached = await cache.match(mediaKey(request))
    if (cached) return cached

    // No cached copy and no network.
    return new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}

/**
 * Returns true when a response holds the entire file.
 *
 * A plain 200 is whole by definition. A 206 is whole when its `Content-Range`
 * spans the entity, which is how a server answers Chromium's `Range: bytes=0-`:
 * a complete download wearing a partial status. A narrower range is left alone,
 * because a member scrolling a long video asks for many of them.
 */
function isWholeFile(response) {
  if (response.status === 200) return true
  if (response.status !== 206) return false

  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') ?? '')
  if (!match) return false

  const start = Number(match[1])
  const end = Number(match[2])
  const total = Number(match[3])

  return start === 0 && end === total - 1
}

/**
 * The cache key for a media file: the plain URL, with whatever `Range` header
 * the request carried dropped, so one stored download answers every ask.
 */
function mediaKey(request) {
  return new URL(request.url).href
}

/**
 * Stores a whole download under the plain URL for the next visit.
 *
 * A 206 cannot go into the cache as it stands, so the body is rewrapped as a
 * plain 200 and the range specific header is dropped with it.
 */
async function storeMedia(request, response) {
  const headers = new Headers(response.headers)
  headers.delete('Content-Range')

  const cache = await caches.open(MEDIA_CACHE)
  await cache.put(
    mediaKey(request),
    new Response(response.clone().body, { status: 200, statusText: 'OK', headers })
  )
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
  const shellCache = await caches.open(SHELL_CACHE)
  const cached = await shellCache.match(request)
  if (cached) return cached

  // 2. Runtime cache.
  const runtimeCache = await caches.open(RUNTIME_CACHE)
  const runtimeCached = await runtimeCache.match(request)
  if (runtimeCached) return runtimeCached

  // 3. Network fallback.
  try {
    const response = await fetch(request)
    if (response.ok) {
      await runtimeCache.put(request, response.clone())
    }
    return response
  } catch {
    // 4. Everything failed.
    return new Response('', { status: 503, statusText: 'Service Unavailable' })
  }
}
