/**
 * Tests for the PostHog analytics client (spec 0010).
 *
 * Covers the public API of src/lib/posthog.ts: initialization, idempotency,
 * disabled states, event capture, and page views. The posthog-js package is
 * mocked at the module boundary so no network requests are made.
 *
 * Acceptance criteria covered:
 * - AC-1: page views recorded automatically (init config + page() function)
 * - AC-7: session replay disabled, privacy-friendly config
 * - AC-8: analytics disabled when no API key configured
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track calls to posthog.init and posthog.capture at the module boundary.
const mockInit = vi.fn()
const mockCapture = vi.fn()
const mockPosthog = {
  init: mockInit,
  capture: mockCapture
}

vi.mock('posthog-js', () => ({
  default: mockPosthog
}))

// The module under test imports posthog-js; after the mock is in place,
// import it fresh so the mocked version is used.
async function getModule() {
  // Clear any cached instance between tests.
  const mod = await import('./posthog')
  return mod
}

describe('initPostHog (AC-7, AC-8)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockInit.mockClear()
    mockCapture.mockClear()
  })

  it('initializes the SDK with the provided API key and host', async () => {
    const { initPostHog } = await getModule()

    const client = initPostHog('test-key-123', 'https://us.i.posthog.com')

    expect(client).not.toBeNull()
    expect(mockInit).toHaveBeenCalledWith('test-key-123', {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: true,
      persistence: 'localStorage',
      persistence_name: 'posthog',
      disable_session_recording: true
    })
  })

  it('returns null when no API key is provided (AC-8)', async () => {
    const { initPostHog } = await getModule()

    const client = initPostHog('', 'https://us.i.posthog.com')

    expect(client).toBeNull()
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('returns null for an empty string API key', async () => {
    const { initPostHog } = await getModule()

    const client = initPostHog('', 'https://example.com')

    expect(client).toBeNull()
  })

  it('disables session recording by default (AC-7)', async () => {
    const { initPostHog } = await getModule()

    initPostHog('test-key', 'https://us.i.posthog.com')

    expect(mockInit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ disable_session_recording: true })
    )
  })

  it('enables automatic page view capture (AC-1)', async () => {
    const { initPostHog } = await getModule()

    initPostHog('test-key', 'https://us.i.posthog.com')

    expect(mockInit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ capture_pageview: true })
    )
  })

  it('uses localStorage for offline persistence (AC-6)', async () => {
    const { initPostHog } = await getModule()

    initPostHog('test-key', 'https://us.i.posthog.com')

    expect(mockInit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        persistence: 'localStorage',
        persistence_name: 'posthog'
      })
    )
  })

  it('is idempotent — second call returns the existing client without reinit', async () => {
    const { initPostHog } = await getModule()

    const first = initPostHog('key-one', 'https://first.com')
    const second = initPostHog('key-two', 'https://second.com')

    expect(first).toBe(second)
    expect(mockInit).toHaveBeenCalledTimes(1)
  })
})

describe('getPostHog (AC-8)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockInit.mockClear()
    mockCapture.mockClear()
  })

  it('returns null before initialization', async () => {
    const { getPostHog } = await getModule()

    const client = getPostHog()

    expect(client).toBeNull()
  })

  it('returns the client after successful initialization', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    const client = mod.getPostHog()

    expect(client).not.toBeNull()
  })

  it('returns null when initialization was skipped due to missing key', async () => {
    const mod = await getModule()

    mod.initPostHog('', 'https://us.i.posthog.com')
    const client = mod.getPostHog()

    expect(client).toBeNull()
  })
})

describe('capture (AC-2, AC-3, AC-4, AC-5)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockInit.mockClear()
    mockCapture.mockClear()
  })

  it('sends an event when the client is initialized', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('Video Played', { video: '/videos/shabbat.mp4', event: 'start' })

    expect(mockCapture).toHaveBeenCalledWith('Video Played', {
      video: '/videos/shabbat.mp4',
      event: 'start'
    })
  })

  it('sends a PDF download event with the slug', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('PDF Downloaded', { pdf: 'order-of-service' })

    expect(mockCapture).toHaveBeenCalledWith('PDF Downloaded', { pdf: 'order-of-service' })
  })

  it('sends a contact form event with the result', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('Contact Form Submitted', { result: 'success' })

    expect(mockCapture).toHaveBeenCalledWith('Contact Form Submitted', { result: 'success' })
  })

  it('sends a search event with query and result count', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('Search Performed', { query: 'shabbat', results: 3, zeroResults: false })

    expect(mockCapture).toHaveBeenCalledWith('Search Performed', {
      query: 'shabbat',
      results: 3,
      zeroResults: false
    })
  })

  it('sends a search event marking zero results', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('Search Performed', { query: 'nonexistent', results: 0, zeroResults: true })

    expect(mockCapture).toHaveBeenCalledWith('Search Performed', {
      query: 'nonexistent',
      results: 0,
      zeroResults: true
    })
  })

  it('does nothing when analytics are disabled (no client)', async () => {
    const { capture } = await getModule()

    // No init call — client is null
    capture('Video Played', { video: '/videos/test.mp4' })

    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('accepts arbitrary properties', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('Custom Event', { foo: 'bar', count: 42, flag: true })

    expect(mockCapture).toHaveBeenCalledWith('Custom Event', {
      foo: 'bar',
      count: 42,
      flag: true
    })
  })

  it('accepts an event with no properties', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.capture('Simple Event')

    expect(mockCapture).toHaveBeenCalledWith('Simple Event', undefined)
  })
})

describe('page', () => {
  beforeEach(() => {
    vi.resetModules()
    mockInit.mockClear()
    mockCapture.mockClear()
  })

  it('records a page view with no custom name', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.page()

    expect(mockCapture).toHaveBeenCalledWith('$pageview', undefined)
  })

  it('records a page view with a custom name', async () => {
    const mod = await getModule()

    mod.initPostHog('test-key', 'https://us.i.posthog.com')
    mod.page('Services / Shabbat Morning')

    expect(mockCapture).toHaveBeenCalledWith('$pageview', {
      title: 'Services / Shabbat Morning'
    })
  })

  it('does nothing when analytics are disabled', async () => {
    const { page } = await getModule()

    page('Test Page')

    expect(mockCapture).not.toHaveBeenCalled()
  })
})
