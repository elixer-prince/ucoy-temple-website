// ESLint flat config for the Ucoy Temple website.
// Astro 7 + TypeScript strict. Rule rationale lives in AGENTS.md.
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintPluginAstro from 'eslint-plugin-astro'
import eslintConfigPrettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    }
  },
  // Service worker: self, caches, fetch, Request, Response, console.
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker
      }
    }
  },
  // Astro config runs in Node during build: process.env is legitimate.
  {
    files: ['astro.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  // Declarations and type-only files are internal to the toolchain.
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.astro/',
      '.agents/',
      'docs/.agent-cache/',
      '**/*.d.ts',
      '**/dist/**'
    ]
  },
  // Prettier takes every formatting opinion; ESLint stays on logic only.
  eslintConfigPrettier
]
