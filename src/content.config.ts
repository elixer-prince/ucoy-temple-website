/**
 * Content collection schemas (spec 0001, AC-1 / AC-6; spec 0003).
 *
 * Four collections:
 *  - pages:        static content pages (about, history, visiting) rendered
 *                  through the [...slug].astro dynamic route.
 *  - announcements: time-stamped bulletins listed newest-first on the
 *                  home page.
 *  - services:     the order of a service, weekly services and Shabbatonim
 *                  together, separated by the `kind` field. Body authored as
 *                  MDX so a <Video> can sit inline where the service needs it.
 *  - resources:    the temple's PDFs, each with its own page and a listing.
 *
 * Uses Astro 7 Content Layer API (glob loaders) and astro/zod for
 * type-safe schemas.
 */
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const pages = defineCollection({
  loader: glob({
    base: './src/content/pages',
    pattern: '**/*.{md,mdx}'
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().max(160).optional(),
      // Used for navigation ordering; defaults to 0 (alphabetical fallback).
      order: z.number().int().nonnegative().default(0),
      // Optional hero image for the page.
      image: image().optional(),
      // Optional alt text for the hero image.
      imageAlt: z.string().optional()
    })
})

const announcements = defineCollection({
  loader: glob({
    base: './src/content/announcements',
    pattern: '**/*.{md,mdx}'
  }),
  schema: z.object({
    title: z.string().min(1, 'Title is required'),
    date: z.coerce.date(),
    summary: z.string().max(200).optional(),
    // Hidden from the public announcement list until the date arrives.
    draft: z.boolean().default(false)
  })
})

/**
 * Services and Shabbatonim (spec 0003).
 *
 * One collection for both areas: `kind` decides the area, the route, and the
 * navigation. The loader accepts `.mdx` only. A `.md` service file is valid
 * markdown and valid Astro, so a `<Video>` call inside one would render as an
 * inert unknown element and silently show no player; requiring the extension
 * makes the file type itself the guarantee (spec 0003, Implementation rules).
 */
const services = defineCollection({
  loader: glob({
    base: './src/content/services',
    pattern: '**/*.mdx'
  }),
  schema: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().max(160).optional(),
    // The site area: `weekly` -> /services/<slug>, `shabbaton` -> /shabbatonim/<slug>.
    kind: z.enum(['weekly', 'shabbaton']),
    // Plain short strings for listings, not dates: the Holy Days calendar
    // (scope feature 12) owns real date handling (spec 0003).
    day: z.string().optional(),
    time: z.string().optional(),
    // Listing order within an area; lowest first, then title.
    order: z.number().int().nonnegative().default(0)
  })
})

/**
 * The temple's PDFs (spec 0003).
 *
 * A PDF earns its own collection because it outlives one page: it can be
 * linked from a service page and also found in the resources listing. `file`
 * holds the site path a reader downloads, so the linkable address stays the
 * resource page (`/resources/<slug>`) even if the file's own path changes.
 */
const resources = defineCollection({
  loader: glob({
    base: './src/content/resources',
    pattern: '**/*.{md,mdx}'
  }),
  schema: z.object({
    title: z.string().min(1, 'Title is required'),
    // A path under public/, such as /pdfs/prayer-booklet.pdf.
    file: z.string().min(1, 'A file path under public/ is required'),
    category: z.string().optional(),
    description: z.string().max(160).optional(),
    order: z.number().int().nonnegative().default(0)
  })
})

export const collections = { pages, announcements, services, resources }
