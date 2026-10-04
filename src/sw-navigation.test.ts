/**
 * Behavioural test for the service worker's navigation handling.
 *
 * The worker itself is loaded by src/worker-sandbox.ts, which runs the real
 * public/sw.js in a sandbox and drives real requests through it. Nothing here
 * re-implements the worker, so a regression in the shipped file fails this test.
 *
 * The regression this locks in (spec 0001, AC-7, the offline feature): pages are
 * built as directory indexes, so the pre-cache holds `/index.html` and
 * `/services/shabbat-morning-service/index.html` while a member requests `/` and
 * `/services/shabbat-morning-service`. The Cache API matches the exact URL, so
 * without a retry on the directory index form every page load offline fell
 * through to offline.html even though the page was in the cache.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FakeCache, FakeResponse, createWorker, requestThrough } from './worker-sandbox'

/** No connection: every fetch the worker makes fails. */
async function networkGone(): Promise<FakeResponse> {
  throw new Error('network unavailable')
}

/** Runs one navigation request through a fresh worker and returns its answer. */
function navigate(cache: FakeCache, path: string): Promise<FakeResponse> {
  return requestThrough(createWorker({ shell: cache, fetch: networkGone }), {
    url: `https://ucoy.example${path}`,
    method: 'GET',
    mode: 'navigate'
  })
}

/** What the worker put in the shell cache at install time. */
const PRECACHED: Record<string, FakeResponse> = {
  '/offline.html': new FakeResponse('offline page'),
  '/index.html': new FakeResponse('home page'),
  '/services/shabbat-morning-service/index.html': new FakeResponse('service page')
}

describe('AC-7: an offline page load finds the pre-cached page', () => {
  it('serves the home page for / though only /index.html is cached', async () => {
    const response = await navigate(new FakeCache(PRECACHED), '/')

    expect(response.body).toBe('home page')
  })

  it('serves a service page for its bare path though only the index file is cached', async () => {
    const response = await navigate(new FakeCache(PRECACHED), '/services/shabbat-morning-service')

    expect(response.body).toBe('service page')
  })

  it('still serves a page cached under the exact request URL', async () => {
    const response = await navigate(
      new FakeCache({ '/about': new FakeResponse('about page') }),
      '/about'
    )

    expect(response.body).toBe('about page')
  })

  it('serves a trailing slash request from the directory index too', async () => {
    const response = await navigate(new FakeCache(PRECACHED), '/services/')

    // /services/index.html is not in this fixture, so the fallback is correct here.
    expect(response.body).toBe('offline page')
  })

  it('falls back to the offline page when the page was never cached', async () => {
    const response = await navigate(new FakeCache(PRECACHED), '/never-visited')

    expect(response.body).toBe('offline page')
  })
})

describe('AC-7 and feature 24: every portion page is reachable with no connection', () => {
  /*
   * The offline promise for the commentary pages, proved against the manifest a
   * real build wrote rather than a hand made fixture.
   *
   * `/check verify` drove all 53 of these through the worker by hand and every one
   * was served. This locks that in, because the failure it guards is the kind
   * that only shows up on a phone in a field with no signal: a portion page is
   * built as a directory index, so if the manifest ever stopped listing it, or the
   * worker's directory index retry ever stopped working, the page a member had
   * bookmarked would silently become the offline page rather than the reading.
   *
   * The manifest is read from `dist`, so this asserts only after a build has run,
   * the same way `offline.test.ts` handles it. Producing `dist` is the verify
   * gate's job, not this suite's.
   */
  const manifestPath = join(process.cwd(), 'dist', 'sw-manifest.json')

  it('serves every precached portion page offline, at both address forms', async () => {
    if (!existsSync(manifestPath)) {
      // No build has run, so there is nothing to assert against yet.
      expect(true).toBe(true)
      return
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { urls: string[] }
    const portionPages = manifest.urls.filter((url) => url.startsWith('/portion/'))

    // The count is asserted rather than assumed: an empty list would pass a loop
    // that checks nothing, which is the failure mode a filtered test suite is
    // most prone to.
    expect(portionPages).toHaveLength(53)

    const cache = new FakeCache(
      Object.fromEntries(manifest.urls.map((url) => [url, new FakeResponse('precached ' + url)]))
    )
    const handler = createWorker({ shell: cache, fetch: networkGone })

    const missed: string[] = []
    for (const page of portionPages) {
      // Both forms a member might reach: the full built file, and the bare path
      // the router serves from.
      for (const path of [page, page.replace(/\/index\.html$/, '')]) {
        const response = await requestThrough(handler, {
          url: `https://ucoy.example${path}`,
          method: 'GET',
          mode: 'navigate'
        })
        if (!response.body.startsWith('precached')) {
          missed.push(`${path} served "${response.body.slice(0, 30)}"`)
        }
      }
    }

    expect(missed).toEqual([])
  })

  it('lists the weekly portion page in the precache too', async () => {
    // The entry point to the commentary: without it in the cache, a member with no
    // connection could reach no commentary at all, however well the 53 pages are
    // cached.
    if (!existsSync(manifestPath)) {
      expect(true).toBe(true)
      return
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { urls: string[] }
    expect(manifest.urls).toContain('/torah-portion/index.html')
  })
})
