/**
 * Content collection schemas (spec 0001, AC-1 / AC-6; spec 0003).
 *
 * Five collections:
 *  - pages:        static content pages (about, history, visiting) rendered
 *                  through the [...slug].astro dynamic route.
 *  - announcements: time-stamped bulletins listed newest-first on the
 *                  home page.
 *  - services:     the order of a service, weekly services and Shabbatonim
 *                  together, separated by the `kind` field. Body authored as
 *                  MDX so a <Video> can sit inline where the service needs it.
 *  - resources:    the temple's PDFs, each with its own page and a listing.
 *  - portionNotes: the temple's commentary for a Torah portion, keyed by the
 *                  portion slug. The reading itself is computed at build time,
 *                  so only the authored prose lives here (scope feature 24).
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

/**
 * The temple's commentary on a Torah portion (scope feature 24, spec 0006).
 *
 * The reading itself is computed from the Hebrew calendar at build time, so it
 * never needs a file. What does need the temple's hand is the teaching that goes
 * with it, which is one piece of authored prose per portion. The file id is the
 * portion slug the calendar produces (`bereshit`, `matot`), so the page pairs a
 * commentary to a portion with no mapping table to keep in step.
 *
 * A portion with no file is normal, not broken: the page shows the reading and
 * says no commentary has been written yet. That is why `title` is the only
 * required field, and why nothing here is a date.
 *
 * The schema cannot express the paper's shape on its own, because a commentary
 * is a fixed sequence of sections rather than a bag of fields. The headings live
 * in the body and are checked by a test instead, so an authoring slip fails the
 * build rather than shipping a page that reads oddly.
 */
const portionNotes = defineCollection({
  loader: glob({
    base: './src/content/portion-notes',
    pattern: '**/*.{md,mdx}'
  }),
  schema: z
    .object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().max(160).optional(),
      order: z.number().int().nonnegative().default(0),
      /**
       * Gospel reference, such as `John 1:1-14`. Absent means the Gospel
       * section is not rendered at all, which is the normal case: the
       * congregation does not currently read the Gospel.
       */
      gospel: z.string().min(1).optional(),
      /** Heading for the Gospel passage, such as `Gospel` or `John 1`. */
      gospelTitle: z.string().min(1).optional()
    })
    .refine((data) => !data.gospel || Boolean(data.gospelTitle), {
      message:
        'gospelTitle is required when gospel is set, so the section never renders with an empty heading',
      path: ['gospelTitle']
    })
})

export const collections = { pages, announcements, services, resources, portionNotes }
