// Writes dist/sw-manifest.json after every build.
//
// public/sw.js is copied to the site root unchanged, so it cannot know the
// names of the files a given build produced (every stylesheet and script is
// content hashed). This integration walks the build output and records them,
// so the service worker can pre-cache the shell, the pages, the stylesheets, the
// web fonts and the favicon at install time (spec 0001, AC-7).
//
// Only files that are safe to pre-cache are listed: video and other heavy media
// are left to the network first path in the worker, as the spec's offline cache
// strategy requires.
import { readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, posix } from 'node:path'

export const PRECACHE_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.svg',
  '.woff2',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp'
])

// The worker itself, its manifest, and the offline fallback are handled
// separately in the worker, so they are left out of the list.
export const SKIP_FILES = new Set(['sw.js', 'sw-manifest.json', 'offline.html'])

/** Collects the URL of every pre-cacheable file in the build output. */
export async function collectUrls(directory, base = directory, found = []) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const absolute = join(directory, entry.name)

    if (entry.isDirectory()) {
      await collectUrls(absolute, base, found)
      continue
    }

    if (SKIP_FILES.has(entry.name)) continue
    if (!PRECACHE_EXTENSIONS.has(posix.extname(entry.name).toLowerCase())) continue

    const relative = absolute.slice(base.length).split('\\').join('/')
    // Always record an absolute site path. Astro hands `dir` in as a URL that
    // may or may not carry a trailing separator, so the slice above can leave a
    // leading slash in place or drop it. Pinning it here keeps every entry
    // unambiguous for the worker's cache.addAll call.
    found.push(relative.startsWith('/') ? relative : `/${relative}`)
  }

  return found
}

export function precacheManifest() {
  return {
    name: 'precache-manifest',

    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outputDirectory = fileURLToPath(dir)
        const urls = (await collectUrls(outputDirectory)).sort()
        const manifest = {
          generatedAt: new Date().toISOString(),
          urls
        }

        await writeFile(
          join(outputDirectory, 'sw-manifest.json'),
          `${JSON.stringify(manifest, null, 2)}\n`,
          'utf8'
        )

        logger.info(`precache manifest: ${urls.length} files listed in sw-manifest.json`)
      }
    }
  }
}
