// Astro configuration for the United Congregation of Yisra'Yah website.
// The stack this file configures is recorded in docs/specs/0001-adopt-static-site-stack.md.
import { defineConfig, fontProviders, envField } from 'astro/config'
import mdx from '@astrojs/mdx'
import { precacheManifest } from './integrations/precache-manifest.mjs'

export default defineConfig({
  // Static output: every page is prebuilt as HTML and served from Cloudflare
  // Pages. There is no server, no database and no sign in.
  output: 'static',

  // Absolute URLs are needed for canonical links, and later for the sitemap.
  // Set SITE_URL in the Cloudflare Pages build settings once the domain is
  // known, and update the fallback here at the same time (spec 0001 Follow-up).
  site: process.env.SITE_URL ?? 'https://ucoy-temple-website.pages.dev',

  // Type-safe environment variables (spec 0001, AC-2, AC-3, AC-4).
  // The temple supplies the real values in the Cloudflare Pages dashboard.
  // See .env.example for the template.
  env: {
    schema: {
      // Temple email for display on the contact page and in the privacy notice.
      CONTACT_EMAIL: envField.string({
        context: 'client',
        access: 'public',
        optional: true
      }),
      // Formspree form action URL — the contact form posts here.
      FORM_ENDPOINT: envField.string({
        context: 'client',
        access: 'public',
        optional: true
      }),
      // Google Calendar embed ID for the upcoming-events agenda view.
      CALENDAR_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true
      }),
      // Temple local timezone for the calendar embed.
      CALENDAR_TIMEZONE: envField.string({
        context: 'client',
        access: 'public',
        default: 'America/New_York'
      }),
      // Cloudflare Web Analytics token (cookieless, spec 0001 AC-3).
      CF_ANALYTICS_TOKEN: envField.string({
        context: 'client',
        access: 'public',
        optional: true
      })
    }
  },

  // Fonts are downloaded at build time and served from this site, never from a
  // third party at runtime, so they keep working offline once the service
  // worker has cached them (spec 0001, AC-7). Roboto carries body text and
  // Oswald carries the display face. Latin subsets only: the Hebrew subset
  // claim could not be confirmed, so Hebrew falls back to the device Hebrew
  // face rather than risking a failed build (spec 0004 Follow-up).
  fonts: [
    {
      name: 'Roboto',
      cssVariable: '--font-sans',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif']
    },
    {
      // Display face. Latin only; Hebrew falls back to the device face.
      name: 'Oswald',
      cssVariable: '--font-serif',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Arial Narrow', 'sans-serif']
    }
  ],

  // Writes dist/sw-manifest.json after each build so the hand written service
  // worker knows which files this build produced and can pre-cache them.
  //
  // MDX carries service bodies, so a <Video> call can sit inline in the order
  // of service (spec 0003, AC-4). Service files are the only MDX authored by
  // hand; page and announcement content stays plain markdown.
  integrations: [precacheManifest(), mdx()]
})
