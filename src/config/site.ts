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
  CALENDAR_ID,
  CALENDAR_TIMEZONE,
  CF_ANALYTICS_TOKEN,
} from 'astro:env/client';

export const SITE_CONFIG = {
  // Identity
  title: "United Congregation of Yisra'Yah",
  description:
    "Public website for the United Congregation of Yisra'Yah. " +
    "Service times, directions, and Holy Day materials — works offline.",
  author: "United Congregation of Yisra'Yah",

  // Contact (spec 0001, AC-2 / AC-3)
  /** Public email shown on the contact page and in the privacy notice. */
  contactEmail: CONTACT_EMAIL ?? 'contact@ucoy.org',
  /** Formspree endpoint the contact form posts to. */
  formEndpoint: FORM_ENDPOINT ?? 'https://formspree.io/f/placeholder',

  // Calendar (spec 0001, AC-2)
  /** Google Calendar embed ID. */
  calendarId: CALENDAR_ID ?? 'ucoy.placeholder@group.calendar.google.com',
  /** Timezone string used by the calendar embed. */
  calendarTimezone: CALENDAR_TIMEZONE ?? 'America/New_York',

  // Analytics (spec 0001, AC-3)
  /** Cloudflare Web Analytics beacon token (empty = analytics disabled). */
  cfAnalyticsToken: CF_ANALYTICS_TOKEN ?? '',

  // Service schedule (for the home page; full times live on each service page)
  services: {
    fridayMorning: 'Friday morning service — see schedule',
    shabbatMorning: 'Shabbat morning service — see schedule',
    shabbatEvening: 'Friday evening service — see schedule',
    havdalah: 'Saturday evening — see schedule',
  },

  // Meeting location
  location: {
    name: "United Congregation of Yisra'Yah",
    address: 'Address to be provided by the temple',
    city: '',
    googleMapsEmbed: '',
  },
};

export default SITE_CONFIG;
