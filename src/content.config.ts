/**
 * Content collection schemas (spec 0001, AC-1 / AC-6).
 *
 * Two collections:
 *  - pages:        static content pages (about, history, visiting) rendered
 *                  through the [...slug].astro dynamic route.
 *  - announcements: time-stamped bulletins listed newest-first on the
 *                  home page.
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

export const collections = { pages, announcements }
