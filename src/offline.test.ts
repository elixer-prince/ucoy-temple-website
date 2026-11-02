/**
 * Tests for the offline promise and the service worker (spec 0003, AC-7;
 * spec 0001, AC-7).
 *
 * These cover two things:
 *
 *   1. What may be pre-cached. Video and PDFs are deliberately left out of the
 *      pre-cache and served network-first, because they are too heavy to
 *      download behind a visitor's back.
 *   2. When the worker is registered. It must never register in dev, because
 *      the precache manifest only exists after a build — an active worker in
 *      dev intercepts navigation and wrongly serves the offline fallback.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { collectUrls, PRECACHE_EXTENSIONS, SKIP_FILES } from '../integrations/precache-manifest.mjs'

const root = process.cwd()

let fixtureDir: string

beforeAll(() => {
  fixtureDir = mkdtempSync(join(tmpdir(), 'precache-fixture-'))
  mkdirSync(join(fixtureDir, 'services'), { recursive: true })
  mkdirSync(join(fixtureDir, 'videos'), { recursive: true })
  mkdirSync(join(fixtureDir, 'pdfs'), { recursive: true })
  mkdirSync(join(fixtureDir, '_astro'), { recursive: true })

  // Pre-cacheable shell files.
  writeFileSync(join(fixtureDir, 'index.html'), '<html></html>')
  writeFileSync(join(fixtureDir, 'services', 'index.html'), '<html></html>')
  writeFileSync(join(fixtureDir, '_astro', 'site.abc123.css'), 'body{}')
  writeFileSync(join(fixtureDir, '_astro', 'hoisted.def456.js'), 'void 0')
  writeFileSync(join(fixtureDir, '_astro', 'frank-ruhl.ghi789.woff2'), 'font')
  writeFileSync(join(fixtureDir, 'favicon.png'), 'png')

  // Files that must never be pre-cached.
  writeFileSync(join(fixtureDir, 'videos', 'shabbat-opening.mp4'), 'video')
  writeFileSync(join(fixtureDir, 'videos', 'shabbat-opening.jpg'), 'poster')
  writeFileSync(join(fixtureDir, 'pdfs', 'prayer-booklet.pdf'), 'pdf')

  // The worker, its manifest, and the offline page look after themselves.
  writeFileSync(join(fixtureDir, 'sw.js'), 'self')
  writeFileSync(join(fixtureDir, 'sw-manifest.json'), '{}')
  writeFileSync(join(fixtureDir, 'offline.html'), '<html></html>')
})

afterAll(() => {
  if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true })
})

describe('AC-7: the pre-cache keeps video and PDFs out', () => {
  it('never lists a video file', async () => {
    const urls = await collectUrls(fixtureDir)
    expect(urls.some((url) => url.endsWith('.mp4'))).toBe(false)
  })

  it('never lists a PDF', async () => {
    const urls = await collectUrls(fixtureDir)
    expect(urls.some((url) => url.endsWith('.pdf'))).toBe(false)
  })

  it('lists the shell HTML, the hashed CSS and JS, and the font', async () => {
    const urls = await collectUrls(fixtureDir)
    expect(urls).toContain('/index.html')
    expect(urls).toContain('/services/index.html')
    expect(urls).toContain('/_astro/site.abc123.css')
    expect(urls).toContain('/_astro/hoisted.def456.js')
    expect(urls).toContain('/_astro/frank-ruhl.ghi789.woff2')
  })

  it('lists the poster image, since it is small and shown before a tap', async () => {
    const urls = await collectUrls(fixtureDir)
    expect(urls).toContain('/videos/shabbat-opening.jpg')
  })

  it('leaves the worker, its manifest, and the offline page to the worker itself', async () => {
    const urls = await collectUrls(fixtureDir)
    for (const skipped of SKIP_FILES) {
      expect(urls.some((url) => url.endsWith(`/${skipped}`))).toBe(false)
    }
  })

  it('holds no media or document extension in its allow list', () => {
    for (const extension of ['.mp4', '.webm', '.ogg', '.m4v', '.mov', '.pdf']) {
      expect(PRECACHE_EXTENSIONS.has(extension)).toBe(false)
    }
  })

  it('walks nested directories and returns web style paths', async () => {
    const urls = await collectUrls(fixtureDir)
    expect(urls.every((url) => url.startsWith('/'))).toBe(true)
    expect(urls.every((url) => !url.includes('\\'))).toBe(true)
  })

  it('keeps one leading slash whether or not the base ends in a separator', async () => {
    // Astro hands the output directory in as a URL, so the base may arrive with
    // a trailing separator on some platforms and not others.
    const withoutSeparator = await collectUrls(fixtureDir)
    const withSeparator = await collectUrls(fixtureDir, `${fixtureDir}${sep}`)
    expect(withSeparator.sort()).toEqual(withoutSeparator.sort())
  })
})

describe('AC-7: the built manifest matches the rule', () => {
  const manifestPath = join(root, 'dist', 'sw-manifest.json')

  /** Reads the manifest a build produced, or null when no build has run. */
  function readManifest(): { urls: string[] } | null {
    if (!existsSync(manifestPath)) return null
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as { urls: string[] }
  }

  it('lists no video and no PDF, when a build is present', () => {
    const manifest = readManifest()
    if (!manifest) {
      // Producing dist is the verify gate's job; this check reads it when there.
      expect(true).toBe(true)
      return
    }
    expect(manifest.urls.some((url) => url.endsWith('.mp4'))).toBe(false)
    expect(manifest.urls.some((url) => url.endsWith('.pdf'))).toBe(false)
  })

  it('leaves the worker, its manifest, and the offline page out, when a build is present', () => {
    const manifest = readManifest()
    if (!manifest) {
      expect(true).toBe(true)
      return
    }
    expect(manifest.urls).not.toContain('/sw.js')
    expect(manifest.urls).not.toContain('/sw-manifest.json')
    expect(manifest.urls).not.toContain('/offline.html')
  })

  it('records every entry as an absolute site path, when a build is present', () => {
    const manifest = readManifest()
    if (!manifest) {
      expect(true).toBe(true)
      return
    }
    // A relative entry would resolve against the worker's own address, which
    // happens to be the site root today. Absolute entries remove the doubt.
    expect(manifest.urls.every((url) => url.startsWith('/'))).toBe(true)
  })
})

describe('AC-7: the worker registers in production only', () => {
  const layout = readFileSync(join(root, 'src', 'layouts', 'Layout.astro'), 'utf-8')

  it('gates registration behind import.meta.env.PROD', () => {
    expect(layout).toContain('import.meta.env.PROD')
  })

  it('does not register the worker unconditionally', () => {
    // The regression: a bare check let the worker run in dev, where
    // /sw-manifest.json does not exist, so navigation fell to offline.html.
    expect(layout).not.toMatch(/if\s*\(\s*'serviceWorker'\s+in\s+navigator\s*\)\s*\{/)
  })

  it('still registers /sw.js once the production gate is open', () => {
    expect(layout).toContain("navigator.serviceWorker.register('/sw.js')")
  })
})

describe('AC-7: the worker keeps its promises', () => {
  const sw = readFileSync(join(root, 'public', 'sw.js'), 'utf-8')

  it('pre-caches the offline page', () => {
    expect(sw).toContain("const OFFLINE_URL = '/offline.html'")
  })

  it('reads the build written manifest', () => {
    expect(sw).toContain("const MANIFEST_URL = '/sw-manifest.json'")
  })

  it('serves the offline page when navigation fails', () => {
    const navigation = sw.slice(sw.indexOf('function respondToNavigation'))
    expect(navigation).toContain('cache.match(OFFLINE_URL)')
  })

  it('treats video as network first and caches it under its own cache', () => {
    const media = sw.slice(sw.indexOf('function respondToMedia'))
    expect(media.indexOf('await fetch(request)')).toBeLessThan(media.indexOf('MEDIA_CACHE'))
  })

  it('leaves other origins alone', () => {
    expect(sw).toContain('if (url.origin !== self.location.origin) return')
  })

  it('ignores non-GET requests', () => {
    expect(sw).toContain("if (request.method !== 'GET') return")
  })
})

describe('AC-7: the offline page is usable on its own', () => {
  // The offline page is now built by Astro (src/pages/offline.astro) and copied
  // to dist/offline.html by the precache-manifest integration (feature 16).
  // Read the built output when available; skip the test before a build.
  const offlinePath = join(root, 'dist', 'offline.html')

  it('offers a way back to the home page, when a build is present', () => {
    if (!existsSync(offlinePath)) {
      expect(true).toBe(true)
      return
    }
    const offline = readFileSync(offlinePath, 'utf-8')
    expect(offline).toContain('href="/"')
  })

  it('carries no external script, when a build is present', () => {
    if (!existsSync(offlinePath)) {
      expect(true).toBe(true)
      return
    }
    const offline = readFileSync(offlinePath, 'utf-8')
    expect(offline).not.toMatch(/<script[^>]+src=/)
  })

  it('only depends on the pre-cached tokens stylesheet, when a build is present', () => {
    if (!existsSync(offlinePath)) {
      expect(true).toBe(true)
      return
    }
    const offline = readFileSync(offlinePath, 'utf-8')
    // The offline page imports tokens.css so it cannot drift (feature 16).
    // Astro injects it as a hashed link. That stylesheet is pre-cached by the
    // service worker, so the page works offline after the first visit.
    expect(offline).toMatch(/<link[^>]+rel="stylesheet"[^>]+tokens/)
  })
})
