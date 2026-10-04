/**
 * Behavioural test for the service worker's media handling.
 *
 * The worker itself is loaded by src/worker-sandbox.ts, which runs the real
 * public/sw.js in a sandbox and drives real requests through it. Nothing here
 * re-implements the worker, so a regression in the shipped file fails this test.
 *
 * The regression this locks in (spec 0001, AC-7): a media element never asks for
 * a plain URL, it sends a `Range` header, and the server answers 206 Partial
 * Content. The Cache API refuses to store a 206, and an older `if (response.ok)`
 * guard let that store through, because a 206 counts as ok. The rejection then
 * landed in the same try as the fetch, so a download that had worked perfectly
 * looked like a dead network: the request was answered with an empty 503, the
 * media cache stayed empty, and the player reported `MEDIA_ELEMENT_ERROR: code 4`
 * for a file that was never at fault.
 *
 * The sandbox cache refuses a 206 exactly as the real Cache API does, which is
 * what makes these tests able to catch that regression.
 */
import { describe, it, expect } from 'vitest'
import { FakeCache, FakeResponse, createWorker, requestThrough } from './worker-sandbox'
import type { SandboxOptions } from './worker-sandbox'

const VIDEO = 'https://ucoy.example/videos/shabbat-opening.mp4'

/** Runs one media request through a fresh worker, with the range a player sends. */
function play(options: SandboxOptions, range?: string): Promise<FakeResponse> {
  const headers = new Headers()
  if (range) headers.set('Range', range)

  return requestThrough(createWorker(options), {
    url: VIDEO,
    method: 'GET',
    mode: 'no-cors',
    headers
  })
}

/** A server answer for a whole file, which is how `Range: bytes=0-` comes back. */
function wholeFile(): FakeResponse {
  return new FakeResponse('the whole video', {
    status: 206,
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-389653/389654' }
  })
}

/** A server answer for one slice of the file. */
function partialFile(): FakeResponse {
  return new FakeResponse('slice', {
    status: 206,
    headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 0-1023/389654' }
  })
}

describe('AC-7: a video the network answered is never turned into a 503', () => {
  it('passes a whole file range answer straight through', async () => {
    const response = await play({ fetch: async () => wholeFile() }, 'bytes=0-')

    expect(response.status).toBe(206)
    expect(response.body).toBe('the whole video')
  })

  it('passes a narrow range answer straight through', async () => {
    const response = await play({ fetch: async () => partialFile() }, 'bytes=0-1023')

    expect(response.status).toBe(206)
    expect(response.body).toBe('slice')
  })

  it('passes a plain 200 download straight through', async () => {
    const response = await play({ fetch: async () => new FakeResponse('whole', { status: 200 }) })

    expect(response.status).toBe(200)
    expect(response.body).toBe('whole')
  })

  it('keeps the download even when the cache refuses to store it', async () => {
    const media = new FakeCache({}, { refuseEverything: true })
    const response = await play({ media, fetch: async () => wholeFile() }, 'bytes=0-')

    expect(response.status).toBe(206)
    expect(response.body).toBe('the whole video')
  })
})

describe('AC-7: a whole download is kept so the next visit plays locally', () => {
  it('stores a whole file range answer as a plain 200 under the bare URL', async () => {
    const media = new FakeCache()
    await play({ media, fetch: async () => wholeFile() }, 'bytes=0-')

    expect(media.puts).toEqual([{ key: VIDEO, status: 200 }])
    expect(media.entries.get(VIDEO)?.status).toBe(200)
    expect(media.entries.get(VIDEO)?.headers.get('Content-Range')).toBe(null)
    expect(media.entries.get(VIDEO)?.headers.get('Content-Type')).toBe('video/mp4')
  })

  it('stores a plain 200 download too', async () => {
    const media = new FakeCache()
    await play({ media, fetch: async () => new FakeResponse('whole', { status: 200 }) })

    expect(media.puts).toEqual([{ key: VIDEO, status: 200 }])
  })

  it('stores nothing for a narrow range', async () => {
    const media = new FakeCache()
    await play({ media, fetch: async () => partialFile() }, 'bytes=0-1023')

    expect(media.puts).toEqual([])
  })

  it('stores nothing when a 206 carries no Content-Range to judge it by', async () => {
    const media = new FakeCache()
    const response = await play({
      media,
      fetch: async () => new FakeResponse('unclear', { status: 206 })
    })

    expect(media.puts).toEqual([])
    expect(response.status).toBe(206)
  })
})

describe('AC-7: video plays without a connection once it has been watched', () => {
  /** No connection: every fetch the worker makes fails. */
  async function networkGone(): Promise<FakeResponse> {
    throw new Error('network unavailable')
  }

  it('serves the stored copy for a later range request', async () => {
    const media = new FakeCache({ [VIDEO]: new FakeResponse('stored video') })
    const response = await play({ media, fetch: networkGone }, 'bytes=0-')

    expect(response.status).toBe(200)
    expect(response.body).toBe('stored video')
  })

  it('answers 503 only when there is no copy and no network', async () => {
    const response = await play({ media: new FakeCache(), fetch: networkGone }, 'bytes=0-')

    expect(response.status).toBe(503)
    expect(response.body).toBe('')
  })
})
