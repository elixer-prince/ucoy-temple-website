/**
 * Tests for the client side navigation theme wiring (spec 0008, AC-2, AC-3, AC-10).
 *
 * The swap rebuilds the document root, and no built page carries `data-theme`,
 * so the saved choice is written back on `astro:after-swap` and the theme button
 * is rebound on `astro:page-load`. That logic is the only part of the router a
 * mistake here would silently break (a flash of the wrong colours, or a dead
 * switch on an older phone), so it is driven through the *real* inline script
 * from `src/layouts/Layout.astro`, loaded into a VM context with stand ins for
 * `document`, `localStorage` and `window` — the same approach as
 * `src/worker-sandbox.ts`. A regression in the shipped script fails this suite;
 * nothing here re-implements the script.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

/** A stand-in for `document.documentElement` and the theme button. */
class FakeElement {
  dataset: Record<string, string> = {}
  hidden = false
  textContent = ''
  listeners: Record<string, Array<() => void>> = {}
  private attributes = new Map<string, string>()

  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name)! : null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  addEventListener(type: string, handler: () => void): void {
    ;(this.listeners[type] ??= []).push(handler)
  }

  click(): void {
    for (const handler of this.listeners.click ?? []) handler()
  }
}

/** A localStorage stand-in that can be told to throw like blocked storage. */
class FakeStorage {
  store = new Map<string, string>()
  constructor(private blocked = false) {}

  getItem(key: string): string | null {
    if (this.blocked) throw new Error('storage unavailable')
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string): void {
    if (this.blocked) throw new Error('storage unavailable')
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    if (this.blocked) throw new Error('storage unavailable')
    this.store.delete(key)
  }
}

/** The theme switch inline script, extracted from the shipped layout. */
const LAYOUT = readFileSync(join(process.cwd(), 'src', 'layouts', 'Layout.astro'), 'utf-8')
const INLINE_BLOCKS = [...LAYOUT.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1] ?? ''
)
const foundThemeScript = INLINE_BLOCKS.find((block) => block.includes('astro:after-swap'))
if (!foundThemeScript) throw new Error('theme switch inline script not found in Layout.astro')
// Pinned to a plain string so the narrowing from the guard above survives into
// the sandbox closure below (astro check treats the find() result as possibly
// undefined once it crosses into a function).
const themeScript: string = foundThemeScript

/**
 * Loads the real theme switch script into a VM context and returns a harness
 * that drives it. Nothing here reimplements the script: it is the bytes the
 * site ships, so a regression in Layout.astro fails this suite.
 */
function makeSandbox(storage: FakeStorage, savedTheme?: string) {
  if (savedTheme) storage.store.set('ucoy-theme', savedTheme)

  const html = new FakeElement()
  let button = new FakeElement()
  button.hidden = true
  button.textContent = 'Theme: System'

  const handlers: Record<string, Array<() => void>> = {}
  const document = {
    documentElement: html,
    getElementById: (id: string): FakeElement | null => (id === 'theme-button' ? button : null),
    addEventListener: (type: string, handler: () => void): void => {
      ;(handlers[type] ??= []).push(handler)
    }
  }

  const window: Record<string, unknown> = {}
  const context = vm.createContext({ document, localStorage: storage, window, console })
  const run = (): void => {
    vm.runInContext(themeScript, context)
  }
  run()

  return {
    html,
    getButton: (): FakeElement => button,
    rerun: run,
    handlerCount: (type: string): number => (handlers[type] ?? []).length,
    dispatch: (type: string): void => {
      for (const handler of handlers[type] ?? []) handler()
    },
    // A swap discards the old button and inserts a fresh one: hidden, no
    // listeners, no label — exactly what the router leaves behind.
    swapInFreshButton: (): void => {
      button = new FakeElement()
      button.hidden = true
      button.textContent = 'Theme: System'
    },
    // swapRootAttributes copies only what the incoming page carries, and no
    // built page carries data-theme, so the attribute is gone after a swap.
    clearThemeAttribute: (): void => {
      html.removeAttribute('data-theme')
    }
  }
}

describe('the theme survives a client side swap (spec 0008)', () => {
  it('applies the saved choice on first load', () => {
    const { html, getButton } = makeSandbox(new FakeStorage(), 'dark')
    expect(html.getAttribute('data-theme')).toBe('dark')
    expect(getButton().hidden).toBe(false)
    expect(getButton().textContent).toBe('Theme: Dark')
  })

  it('rewrites the saved dark choice after a swap (AC-2)', () => {
    const { html, dispatch, swapInFreshButton, clearThemeAttribute } = makeSandbox(
      new FakeStorage(),
      'dark'
    )
    clearThemeAttribute()
    swapInFreshButton()
    dispatch('astro:after-swap')
    expect(html.getAttribute('data-theme')).toBe('dark')
  })

  it('removes the attribute after a swap when the choice is system (AC-2)', () => {
    const { html, dispatch, swapInFreshButton } = makeSandbox(new FakeStorage())
    html.setAttribute('data-theme', 'light')
    swapInFreshButton()
    dispatch('astro:after-swap')
    expect(html.getAttribute('data-theme')).toBeNull()
  })

  it('rebinds a fresh swapped-in button on page-load so it cycles (AC-3)', () => {
    const { getButton, dispatch, swapInFreshButton } = makeSandbox(new FakeStorage(), 'dark')
    swapInFreshButton()
    const fresh = getButton()
    expect(fresh.hidden).toBe(true)
    expect(fresh.listeners.click).toBeUndefined()
    dispatch('astro:page-load')
    expect(fresh.hidden).toBe(false)
    expect(fresh.textContent).toBe('Theme: Dark')
    fresh.click()
    expect(fresh.textContent).toBe('Theme: System')
  })

  it('cycles System, Light, Dark and back on click (AC-3)', () => {
    const { getButton } = makeSandbox(new FakeStorage())
    const button = getButton()
    for (const label of ['Theme: Light', 'Theme: Dark', 'Theme: System']) {
      button.click()
      expect(button.textContent).toBe(label)
    }
  })

  it('still paints the mode onto the document when storage is blocked (AC-2)', () => {
    const { html, getButton } = makeSandbox(new FakeStorage(true))
    getButton().click()
    expect(html.getAttribute('data-theme')).toBe('light')
  })

  it('registers the router listeners once even when the script re-runs', () => {
    const sandbox = makeSandbox(new FakeStorage(), 'dark')
    sandbox.rerun()
    expect(sandbox.handlerCount('astro:after-swap')).toBe(1)
    expect(sandbox.handlerCount('astro:page-load')).toBe(1)
  })
})

describe('PDF links and the contact form skip the router (spec 0008, AC-6, AC-7)', () => {
  it('marks the resource page PDF link with data-astro-reload so it fetches once', () => {
    // The regression: PdfLink.astro carried the attribute but the resource
    // detail route every service body links to did not, so the router could
    // fetch the PDF as HTML and discard it before the real navigation.
    const route = readFileSync(
      join(process.cwd(), 'src', 'pages', 'resources', '[slug].astro'),
      'utf-8'
    )
    const pdfLink = route.match(/<a[^>]*href=\{resource\.data\.file\}[^>]*>/)?.[0] ?? ''
    expect(pdfLink).toContain('data-astro-reload')
  })
})
