/**
 * Tests for the TypeScript path configuration (regression for the TS 6 deprecation).
 *
 * `baseUrl` is deprecated in TypeScript 6 and stops working in 7. With it gone,
 * `paths` entries must be written relative to this file, so a leading `./` is
 * what keeps `@/`, `@components/`, `@layouts/`, and `@styles/` resolving. Adding
 * `baseUrl` back, or dropping the `./`, fails `npx tsc --noEmit` rather than
 * failing the build, which is easy to miss.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8')) as {
  compilerOptions?: {
    baseUrl?: string
    ignoreDeprecations?: string
    paths?: Record<string, string[]>
  }
}

describe('tsconfig paths resolve without a baseUrl', () => {
  it('sets no baseUrl, so TypeScript 6 stays quiet and 7 keeps working', () => {
    expect(tsconfig.compilerOptions?.baseUrl).toBeUndefined()
    expect(tsconfig.compilerOptions?.ignoreDeprecations).toBeUndefined()
  })

  it('writes every paths entry relative to this file', () => {
    const paths = tsconfig.compilerOptions?.paths ?? {}
    expect(Object.keys(paths).length).toBeGreaterThan(0)
    for (const targets of Object.values(paths)) {
      for (const target of targets) {
        expect(target.startsWith('./')).toBe(true)
      }
    }
  })

  it('keeps all four aliases pointing into src/', () => {
    const paths = tsconfig.compilerOptions?.paths ?? {}
    expect(paths['@/*']).toEqual(['./src/*'])
    expect(paths['@components/*']).toEqual(['./src/components/*'])
    expect(paths['@layouts/*']).toEqual(['./src/layouts/*'])
    expect(paths['@styles/*']).toEqual(['./src/styles/*'])
  })
})
