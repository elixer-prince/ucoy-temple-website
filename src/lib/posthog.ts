/**
 * PostHog analytics client (spec 0010, AC-7, AC-8).
 *
 * Initializes the PostHog SDK with session replay disabled so the analytics
 * remain privacy friendly. GeoIP enrichment is disabled via the PostHog project
 * setting "Discard IP data" rather than SDK code, since the browser SDK no
 * longer provides a client side option for it. Only loads in production builds:
 * a missing API key or a dev server skips initialization entirely.
 *
 * The SDK handles offline queuing via localStorage (AC-6): events collected
 * while the browser has no internet connection are stored locally and delivered
 * when the connection returns, with no data loss.
 */
import posthog from 'posthog-js'

// Declare window.posthog so inline scripts can access the client.
declare global {
  interface Window {
    posthog?: typeof posthog
  }
}

let client: typeof posthog | null = null

/**
 * Initialize the PostHog client once. Returns the client instance or null
 * when analytics should not load (development mode or no API key configured).
 *
 * Call this from a client-side script in the layout shell. The function is
 * idempotent: calling it again returns the existing client without reinit.
 */
export function initPostHog(apiKey: string, host: string) {
  if (client) return client
  if (!apiKey) return null

  posthog.init(apiKey, {
    api_host: host,
    // Capture page views automatically (AC-1).
    capture_pageview: true,
    // Persist events in localStorage so they survive offline periods (AC-6).
    persistence: 'localStorage',
    persistence_name: 'posthog',
    // Disable session recording so no replay data is collected (AC-7).
    disable_session_recording: true
  })

  client = posthog
  return client
}

/**
 * Get the PostHog client if it has been initialized. Returns null during
 * development or when no API key is configured.
 */
export function getPostHog() {
  return client
}

/**
 * Capture a custom event. Safe to call before init: the event is queued by
 * the PostHog SDK and sent once the client is ready. Does nothing when
 * analytics are disabled (no API key or development mode).
 *
 * @param eventName - The event name, e.g. "Video Played"
 * @param properties - Optional event properties
 */
export function capture(eventName: string, properties?: Record<string, unknown>) {
  if (!client) return
  client.capture(eventName, properties)
}

/**
 * Record a page view. Safe to call before init. Does nothing when analytics
 * are disabled.
 *
 * @param name - Optional custom page name; defaults to the current path
 */
export function page(name?: string) {
  if (!client) return
  client.capture('$pageview', name ? { title: name } : undefined)
}
