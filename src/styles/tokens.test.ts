/**
 * Design token tests (spec 0004, AC-1, AC-2, AC-3, AC-9).
 * Guards the two layer contract: ladders hold raw values, roles point at
 * ladders, nothing outside tokens.css carries a raw literal, both modes
 * meet AA contrast on every rendered pairing, and offline.html repeats
 * the same role values.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const tokensPath = join(root, 'src', 'styles', 'tokens.css')
const tokens = readFileSync(tokensPath, 'utf-8')
const offline = readFileSync(join(root, 'public', 'offline.html'), 'utf-8')

const ROLES = [
  'canvas',
  'surface',
  'border',
  'text',
  'text-muted',
  'accent',
  'accent-hover',
  'on-accent',
  'focus',
  'tint'
] as const

type Role = (typeof ROLES)[number]

/** The six extra contract names that live only inside the black sidebar. */
const SIDEBAR_ROLES = [
  'sidebar-bg',
  'sidebar-text',
  'sidebar-muted',
  'sidebar-hover',
  'sidebar-marker',
  'sidebar-scroll'
] as const

type SidebarRole = (typeof SIDEBAR_ROLES)[number]

const LADDERS: Record<string, Record<string, string>> = {
  grey: {
    '50': '#ffffff',
    '100': '#fbfaf7',
    '200': '#f3f2ed',
    '300': '#d8d6d0',
    '400': '#a7a7ad',
    '500': '#8e8d98',
    '600': '#6f6c62',
    '700': '#5c5e69',
    '800': '#383a44',
    '900': '#191a20',
    '950': '#14151b'
  },
  gold: {
    '50': '#fdf9ec',
    '100': '#faf0d0',
    '200': '#f4e0a0',
    '300': '#eccc6e',
    '400': '#ddb53e',
    '500': '#c9970d',
    '600': '#a67a0b',
    '700': '#856009',
    '800': '#5e4408',
    '900': '#3a2a06',
    '950': '#221806'
  },
  red: {
    '50': '#fdeeed',
    '100': '#fbd9d6',
    '200': '#f5ada8',
    '300': '#ec7b74',
    '400': '#e24e45',
    '500': '#d6261c',
    '600': '#ac1f17',
    '700': '#891913',
    '800': '#61120e',
    '900': '#3c0b08',
    '950': '#230605'
  },
  blue: {
    '50': '#edf4fb',
    '100': '#d6e6f5',
    '200': '#a9cbe9',
    '300': '#7aabdb',
    '400': '#4f8fc9',
    '500': '#2b7bbb',
    '600': '#236397',
    '700': '#1c4f79',
    '800': '#143856',
    '900': '#0d2335',
    '950': '#07141f'
  }
}

const LIGHT_ROLES: Record<Role, string> = {
  canvas: 'grey-100',
  surface: 'grey-50',
  border: 'grey-600',
  text: 'grey-900',
  'text-muted': 'grey-700',
  accent: 'blue-700',
  'accent-hover': 'blue-800',
  'on-accent': 'grey-50',
  focus: 'blue-700',
  tint: 'gold-100'
}

const DARK_ROLES: Record<Role, string> = {
  canvas: 'grey-950',
  surface: 'grey-900',
  border: 'grey-500',
  text: 'grey-200',
  'text-muted': 'grey-400',
  accent: 'blue-300',
  'accent-hover': 'blue-200',
  'on-accent': 'grey-950',
  focus: 'blue-300',
  tint: 'gold-900'
}

const SIDEBAR_POINTS: Record<SidebarRole, string> = {
  'sidebar-bg': 'black',
  'sidebar-text': 'white',
  'sidebar-muted': 'grey-300',
  'sidebar-hover': 'grey-800',
  'sidebar-marker': 'gold-400',
  'sidebar-scroll': 'grey-700'
}

const TEXT_PAIRS: Array<[Role, Role]> = [
  ['text', 'canvas'],
  ['text', 'surface'],
  ['text-muted', 'canvas'],
  ['text-muted', 'surface'],
  ['accent', 'canvas'],
  ['accent', 'surface'],
  ['on-accent', 'accent']
]

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const nums = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  return [nums[0], nums[1], nums[2]]
}

function luminance(hex: string): number {
  const parts = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]
}

function contrast(a: string, b: string): number {
  const lums = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (lums[0] + 0.05) / (lums[1] + 0.05)
}

function roleValue(hueStep: string): string {
  // Sidebar extremes (black, white) live beside the ladders in tokens.css.
  if (hueStep === 'black') return '#000000'
  if (hueStep === 'white') return '#ffffff'
  const dash = hueStep.indexOf('-')
  const hue = hueStep.slice(0, dash)
  const step = hueStep.slice(dash + 1)
  const value = LADDERS[hue]?.[step]
  if (!value) throw new Error(`unknown ladder step ${hueStep}`)
  return value
}

function ladderValue(hueStep: string): string {
  return roleValue(hueStep)
}

function collectStyleFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    if (statSync(absolute).isDirectory()) {
      if (entry === 'content') continue
      collectStyleFiles(absolute, found)
      continue
    }
    if (entry.endsWith('.css') && absolute !== tokensPath) found.push(absolute)
    if (entry.endsWith('.astro')) found.push(absolute)
  }
  return found
}

describe('AC-2 ladders', () => {
  it('grey gold red blue each hold eleven steps', () => {
    for (const hue of ['grey', 'gold', 'red', 'blue']) {
      for (const step of Object.keys(LADDERS[hue])) {
        expect(tokens).toContain('--color-' + hue + '-' + step + ': ' + LADDERS[hue][step])
      }
    }
  })

  it('keeps black and white', () => {
    expect(tokens).toContain('--color-black: #000000')
    expect(tokens).toContain('--color-white: #ffffff')
  })
})

describe('AC-2 roles', () => {
  it('light roles point at ladder steps', () => {
    for (const role of ROLES) {
      expect(tokens).toContain('--color-' + role + ': var(--color-' + LIGHT_ROLES[role] + ')')
    }
  })

  it('dark roles point at ladder steps', () => {
    const dark = tokens.slice(tokens.indexOf('prefers-color-scheme: dark'))
    for (const role of ROLES) {
      expect(dark).toContain('--color-' + role + ': var(--color-' + DARK_ROLES[role] + ')')
    }
  })

  it('sidebar roles point at ladders or extremes', () => {
    for (const role of SIDEBAR_ROLES) {
      expect(tokens).toContain('--color-' + role + ': var(--color-' + SIDEBAR_POINTS[role] + ')')
    }
  })

  it('dark media block and explicit dark attribute agree', () => {
    const mediaStart = tokens.indexOf('prefers-color-scheme: dark')
    const mediaEnd = tokens.indexOf(":root[data-theme='light']")
    const media = tokens.slice(mediaStart, mediaEnd)
    const darkAttrStart = tokens.indexOf(":root[data-theme='dark']")
    const darkAttr = tokens.slice(darkAttrStart, tokens.indexOf('html {'))
    for (const role of ROLES) {
      const pattern = new RegExp('--color-' + role + ': ([^;]+);')
      const inMedia = media.match(pattern)?.[1].trim()
      const inAttr = darkAttr.match(pattern)?.[1].trim()
      expect(role + ': ' + inMedia).toBe(role + ': ' + inAttr)
    }
  })

  it('explicit theme attributes exist', () => {
    expect(tokens).toContain(":root[data-theme='light']")
    expect(tokens).toContain(":root[data-theme='dark']")
  })

  it('no page stylesheet names a ladder step', () => {
    const files = collectStyleFiles(join(root, 'src'))
    const ladderUse = /--color-(grey|gold|red|blue)-\d{2,3}/
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const blocks = file.endsWith('.css')
        ? [content]
        : [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
      for (const block of blocks) {
        const found = block.match(ladderUse)?.[0] ?? ''
        expect(file + ' uses ' + found).not.toMatch(ladderUse)
      }
    }
  })

  it('every color role used in a stylesheet is one of the contract roles', () => {
    const files = collectStyleFiles(join(root, 'src'))
    const roleUse = /var\(--color-([a-z-]+)\)/g
    const isLadder = /^(grey|gold|red|blue)(-|$)/
    const allowed = new Set<string>([...ROLES, ...SIDEBAR_ROLES, 'black', 'white'])
    const unknown: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const blocks = file.endsWith('.css')
        ? [content]
        : [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
      for (const block of blocks) {
        for (const m of block.matchAll(roleUse)) {
          const name = m[1]
          if (isLadder.test(name)) continue
          if (!allowed.has(name)) unknown.push(file + ' uses --color-' + name)
        }
      }
    }
    expect(unknown.join('\n')).toBe('')
  })
})

const SIDEBAR_PAIRS: Array<[SidebarRole, SidebarRole]> = [
  ['sidebar-text', 'sidebar-bg'],
  ['sidebar-muted', 'sidebar-bg'],
  ['sidebar-text', 'sidebar-hover']
]

describe('AC-3 contrast', () => {
  it('light pairs pass AA', () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrast(roleValue(LIGHT_ROLES[fg]), roleValue(LIGHT_ROLES[bg]))
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('dark pairs pass AA', () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrast(roleValue(DARK_ROLES[fg]), roleValue(DARK_ROLES[bg]))
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('sidebar pairs pass AA in both modes', () => {
    for (const [fg, bg] of SIDEBAR_PAIRS) {
      const ratio = contrast(roleValue(SIDEBAR_POINTS[fg]), roleValue(SIDEBAR_POINTS[bg]))
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('AC-9 offline drift', () => {
  it('light roles match offline html', () => {
    for (const role of ROLES) {
      expect(offline).toContain('--color-' + role + ': ' + ladderValue(LIGHT_ROLES[role]))
    }
  })

  it('dark roles match offline html', () => {
    const dark = offline.slice(offline.indexOf('prefers-color-scheme: dark'))
    for (const role of ROLES) {
      expect(dark).toContain('--color-' + role + ': ' + ladderValue(DARK_ROLES[role]))
    }
  })

  it('offline honours saved choice', () => {
    expect(offline).toContain('ucoy-theme')
    expect(offline).toContain('data-theme')
  })
})
