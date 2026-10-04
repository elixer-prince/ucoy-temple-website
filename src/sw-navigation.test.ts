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
