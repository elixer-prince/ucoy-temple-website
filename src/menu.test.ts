/**
 * Tests for the sidebar menu toggle (spec 0004, AC-5).
 *
 * A full reload restores form control state in some browsers, so a menu left
 * open comes back open. The toggle carries `autocomplete="off"` and the menu
 * script forces the checkbox closed on every load, so full refreshes always
 * start closed. The menu works with JavaScript off, so the markup carries the
 * burden and the script only reinforces it.
 *
 * Nothing here reimplements the menu toggle: the real inline script from
 * `src/layouts/Layout.astro` is loaded into a VM context with stand ins for
 * `document` and `window`, so a regression in the shipped markup or script
 * fails this suite.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

type MenuEvent = { preventDefault(): void }

class FakeElement {
  dataset: Record<string, string> = {}
  private attributes = new Map<string, string>()
  listeners: Record<string, Array<(event: MenuEvent) => void>> = {}

  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name)! : null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  toggleAttribute(name: string, force?: boolean): void {
    if (force === undefined) {
      if (this.attributes.has(name)) {
        this.attributes.delete(name)
      } else {
        this.attributes.set(name, '')
      }
    } else if (force) {
      this.attributes.set(name, '')
    } else {
      this.attributes.delete(name)
    }
  }

  addEventListener(type: string, handler: (event: MenuEvent) => void): void {
    ;(this.listeners[type] ??= []).push(handler)
  }

  click(): void {
    const event: MenuEvent = { preventDefault: () => {} }
    for (const handler of this.listeners.click ?? []) handler(event)
  }
}

class FakeCheckbox extends FakeElement {
  checked = false
}

const LAYOUT = readFileSync(join(process.cwd(), 'src', 'layouts', 'Layout.astro'), 'utf-8')
const INLINE_BLOCKS = [...LAYOUT.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1] ?? ''
)
const menuScript = INLINE_BLOCKS.find((block) => block.includes('sidebar-toggle'))
if (!menuScript) throw new Error('menu toggle inline script not found in Layout.astro')
// Pinned to a plain string so the narrowing from the guard above survives into
// the sandbox closure below (astro check treats the find() result as possibly
// undefined once it crosses into a function).
const MENU_SCRIPT: string = menuScript

function makeSandbox(initialChecked = false) {
  const checkbox = new FakeCheckbox()
  checkbox.checked = initialChecked
  const label = new FakeElement()
  const html = new FakeElement()
  const pageLoadHandlers: Array<(event: MenuEvent) => void> = []
  const loadHandlers: Array<(event: MenuEvent) => void> = []
  const document = {
    querySelectorAll: (): FakeElement[] => [label],
    getElementById: (id: string): FakeCheckbox | null =>
      id === 'sidebar-toggle' ? checkbox : null,
    documentElement: html,
    addEventListener: (type: string, handler: (event: MenuEvent) => void): void => {
      if (type === 'astro:page-load') pageLoadHandlers.push(handler)
    }
  }
  const window = {
    addEventListener: (type: string, handler: (event: MenuEvent) => void): void => {
      if (type === 'load') loadHandlers.push(handler)
    }
  }
  const context = vm.createContext({ document, window, console })
  vm.runInContext(MENU_SCRIPT, context)
  const fire = (handlers: Array<(event: MenuEvent) => void>): void => {
    const event: MenuEvent = { preventDefault: () => {} }
    for (const handler of handlers) handler(event)
  }
  return {
    checkbox,
    label,
    html,
    dispatchPageLoad: (): void => fire(pageLoadHandlers),
    dispatchLoad: (): void => fire(loadHandlers)
  }
}

describe('the sidebar menu starts closed on every load (spec 0004, AC-5)', () => {
  it('forces a restored open menu closed on first load', () => {
    const { checkbox, html } = makeSandbox(true)
    expect(checkbox.checked).toBe(false)
    expect(html.getAttribute('data-menu-open')).toBeNull()
  })

  it('starts closed when nothing was restored', () => {
    const { checkbox } = makeSandbox(false)
    expect(checkbox.checked).toBe(false)
  })

  it('opens and closes on label clicks', () => {
    const { checkbox, html, label } = makeSandbox(false)
    label.click()
    expect(checkbox.checked).toBe(true)
    expect(html.getAttribute('data-menu-open')).toBe('')
    label.click()
    expect(checkbox.checked).toBe(false)
    expect(html.getAttribute('data-menu-open')).toBeNull()
  })

  it('binds each label once, even after a client side swap', () => {
    const { checkbox, label, dispatchPageLoad } = makeSandbox(false)
    dispatchPageLoad()
    label.click()
    expect(checkbox.checked).toBe(true)
    expect(label.listeners.click ?? []).toHaveLength(1)
  })

  it('re-asserts closed once the page settles', () => {
    const { checkbox, dispatchLoad } = makeSandbox(true)
    dispatchLoad()
    expect(checkbox.checked).toBe(false)
  })
})

describe('the toggle markup', () => {
  it('carries autocomplete=off so browsers do not restore its state', () => {
    // Prettier wraps the input across several lines (print width 100), so
    // normalise whitespace before matching the markup.
    const normalized = LAYOUT.replace(/\s+/g, ' ')
    expect(normalized).toContain(
      '<input class="sidebar-toggle" type="checkbox" id="sidebar-toggle" autocomplete="off" aria-label="Show menu" />'
    )
  })
})
