# 0002 · Coding standards and tooling

**Status**: Accepted
**Date**: 2026-09-18
**Authorized by**: engineering, during /develop coding standards & tooling

## Decision

Install lint, format, and pre-commit enforcement on the scaffolded Astro 7 + TypeScript project so every later commit follows one standard. Capture the choices the same way the stack spec captured the stack.

### Linting and formatting

- **Linter**: ESLint 10 with a flat config (`eslint.config.js`).
- **Lint stack**: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-astro` flat/recommended, `eslint-config-prettier` to hand formatting off to Prettier.
- **Formatter**: Prettier 3 with `prettier-plugin-astro`.
- **Prettier config**: no semicolons, single quotes, no trailing commas, print width 100, 2-space indent, LF line endings.
- **Editor consistency**: `.editorconfig` at the repo root (2-space indent, LF, UTF-8, trim trailing whitespace, final newline on text files).

### Pre-commit

- Husky + lint-staged run on every commit.
- `*.{ts,tsx,mjs,cjs,js,json,md}` → Prettier write.
- `*.astro` → Prettier write then ESLint fix.

### Type strictness

Strict. `tsconfig.json` already extends `astro/tsconfigs/strict`; no `any`, exhaustive types.

### Testing gate

No test runner yet. The project gates on `astro check` plus `npm run build` via `npm run verify`. Tests come later via `/test` when a feature needs them.

### Scripts added

- `npm run lint` — ESLint across the project.
- `npm run format` — Prettier write across the project.
- `npm run format:check` — Prettier check without writing.
- `prepare` — husky (installs git hooks on `npm install`).

### Globals

- `public/sw.js` uses the service worker globals (`self`, `caches`, `fetch`, `Request`, `Response`, `console`).
- `astro.config.mjs` runs in Node during the build, so `process.env` is legitimate there.

## Consequences

- Every commit now runs lint-staged first; a commit that fails lint or formatting is blocked at the hook.
- The verify gate (`npm run check && npm run build`) already includes the typecheck; lint and format are now enforced at commit time and can be run manually any time.
- The skill docs and MCP notes still referenced in the original AGENTS.md are kept; this spec only records the tooling, not the skill inventory.

## Acceptance criteria

- AC-1 — ESLint runs clean on the scaffolded project.
- AC-2 — Prettier runs clean on the scaffolded project.
- AC-3 — A commit runs husky + lint-staged and blocks when staged files fail lint or formatting.
- AC-4 — `npm run verify` still passes after the tooling is installed.
- AC-5 — Root `AGENTS.md` reflects the real stack and the installed tooling.
