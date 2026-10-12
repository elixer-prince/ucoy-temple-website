/**
 * Site-wide configuration sourced from environment variables.
 *
 * The temple supplies the real values (email, calendar, form endpoint,
 * analytics token) via the Cloudflare Pages dashboard.  Defaults below
 * keep the site buildable before those values are set, so the scaffold
 * boots and deploys with no configuration required.
 *
 * @see astro.config.mjs — the env schema that backs these imports
 */
import {
  CONTACT_EMAIL,
  FORM_ENDPOINT,
  CALENDAR_URL,
  CALENDAR_TIMEZONE,
  CF_ANALYTICS_TOKEN
} from 'astro:env/client'

export const SITE_CONFIG = {
  // Identity
  title: "United Congregation of Yisra'Yah",
  /**
   * The temple's initials. The header shows this wordmark on the narrowest
   * phones, where the full name would leave the menu button no room.
   * Change this one value to change how the short name reads everywhere
   * it appears.
   */
  shortTitle: 'UCOY',
  description:
    "Public website for the United Congregation of Yisra'Yah. " +
    'Service times, directions, and Holy Day materials — works offline.',
  author: "United Congregation of Yisra'Yah",

  // Contact (spec 0001, AC-2 / AC-3)
  /** Public email shown on the contact page and in the privacy notice. */
  contactEmail: CONTACT_EMAIL ?? 'contact@ucoy.org',
  /** Formspree endpoint the contact form posts to. */
  formEndpoint: FORM_ENDPOINT ?? 'https://formspree.io/f/placeholder',

  // Calendar (spec 0007, assumed)
  /**
   * Proton Calendar share link that returns an iCalendar (ICS) feed. Read once
   * at build time and written into the home page as plain HTML, so no visitor's
   * browser contacts a third party to see the list. Empty means no feed is
   * configured yet: the home page then shows a quiet notice and the build still
   * succeeds.
   */
  calendarUrl: CALENDAR_URL ?? '',
  /** Timezone the event list is rendered in, the temple's own. */
  calendarTimezone: CALENDAR_TIMEZONE ?? 'America/New_York',

  // Analytics (spec 0001, AC-3)
  /** Cloudflare Web Analytics beacon token (empty = analytics disabled). */
  cfAnalyticsToken: CF_ANALYTICS_TOKEN ?? '',

  // Meeting location
  // The parish and community are the temple's own words from its current site
  // (scope feature 9). The street address is still to be supplied by the temple,
  // so it is not guessed here.
  location: {
    name: "United Congregation of Yisra'Yah",
    address: '24 Gandhi, Kingston 11, St. Andrew',
    parish: 'St. Andrew',
    community: 'Waterhouse',
    country: 'Jamaica',
    googleMapsEmbed: ''
  }
}

export default SITE_CONFIG
