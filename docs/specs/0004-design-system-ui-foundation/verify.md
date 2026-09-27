# Verify: design system & UI foundation · spec 0004 · updated 2026-09-25

_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

Driven in a real Chrome on 2026-09-26. Seven steps were walked over the filesystem
first, then the whole set was rerun against the built site served over
`http://localhost:4322`, which is where the storage and print steps closed. Reduced
motion and High Contrast are the only two still open: the tooling cannot force either
media feature, and faking it in page script would not convince anyone.

- [x] Open the home page, a weekly service page, and `/style-guide` with no stored theme choice, then switch the OS setting between light and dark: each page follows the setting with no flash of the wrong colours → AC-3, AC-4
      (System with OS light: canvas `#fbfaf7`, text `#191a20`. System with OS dark: canvas `#14151b`, text `#f3f2ed`. The pre paint script runs before the stylesheet paints, and `color-scheme` is `light dark`.)
- [x] Press the sidebar switch on any page: it cycles System, Light, Dark, the label names the setting the site is in now, a reload keeps the choice, and `localStorage` holds only the key `ucoy-theme` with the value `light` or `dark` → AC-4
      (One click from System with the OS on dark gives Light, stored as `ucoy-theme: light` and nothing else. After a reload the choice is still there. The full cycle was then walked: Dark, then System drops both the attribute and the key and returns to following the dark OS, then Light again.)
- [x] Save a light choice, set the OS to dark, and open `public/offline.html` directly: the light palette and `color-scheme: light` win, so the offline page honours the saved choice where it can → AC-9
      (Saved light, forced the OS to dark, reloaded: `data-theme="light"`, canvas `#fbfaf7`, computed `color-scheme: light`. The offline page opened on the same origin reads the same key and paints the light palette the same way.)
- [x] Disable JavaScript and walk the shell: the menu, both service groups, and both modes still work, and no theme switch renders anywhere → AC-4, AC-5, AC-10
      (The built HTML ships the theme button with `hidden` plus a `noscript` note, both service groups are native `<details>`, and the narrow menu is a checkbox and a label, so none of it needs script. The only module script registers the service worker.)
- [x] At 320 pixels wide: no sideways scrolling, the menu opens from the one header button, and every control stays at least 44 by 44 pixels → AC-5
      (`scrollWidth` equals `clientWidth` at 320, overflow 0. The header shows the UCOY initials and one Menu control. All 13 menu controls measure 44 or more in both directions. Four inline text links inside prose and the footer are smaller, and are links in a sentence rather than controls.)
- [x] Keyboard only: the skip link, both menu groups, the current page marker, and the theme switch each take focus with a visible ring, and the skip link reaches the main content → AC-11
      (Real Tab presses. The skip link is the first stop, becomes visible on focus, and Enter moves to `<main id="main-content">`. Home carries `aria-current="page"` and takes focus. Both group summaries and the theme button take focus, each with a 3px ring.)
- [x] Reduced motion enabled and Windows High Contrast emulated: nothing animates, controls stay visible, and no meaning rests on colour alone → AC-11
      (Accepted on the engineer's call, not run: the DevTools tooling cannot force `prefers-reduced-motion` or `forced-colors`, and faking `matchMedia` in page script would not change how the CSS engine evaluates a media query. The rules for both ship in the built stylesheet. See Accepted without a run below.)
- [x] On the style guide page, a Hebrew phrase inside an English sentence keeps its own direction, and the marked right to left passage aligns, marks its lists, and quotes right to left, in both modes → AC-6
      (Light and dark both confirmed. The phrase inside the English sentence computes `direction: rtl` with `unicode-bidi: plaintext`; the marked passage computes `direction: rtl`, `text-align: start`, and Hebrew quotation marks `״`.)
- [x] Print a service page: the sidebar, the menu button, the footer, and the skip link drop, and the order of service stays in order → AC-5
      (Over the real origin the linked stylesheet's rules became readable, so the print block was read rather than guessed at. Every element the print block sets to `display: none` was matched against the page: skip link, menu button, sidebar toggle, backdrop, sidebar and footer. The order of service is unchanged: Opening prayers, Torah reading, Teaching and closing.)
- [x] Visit `/style-guide`: every ladder, every role, every building block, and the Hebrew samples are shown, the page is not linked from the menu, and it carries `noindex` → AC-7, AC-8
      (Sections render for the ladders, roles, typography, blocks and Hebrew. Carries `noindex, nofollow` and its own `h1`. The only link to it is its own sample button, not the menu.)

## Commands

- [x] `npm run verify` → astro check reports 0 errors and the build completes with 13 pages → AC-1, AC-10
- [x] `npm run test` → 62 tests pass: the literal scan (AC-1), AA contrast for every pairing in both modes (AC-3), the dark media block and the dark attribute block agree (AC-2, AC-3), no stylesheet names a ladder step and every role used is a contract role (AC-2), and `public/offline.html` matches the roles in both modes (AC-9)
- [x] Add a hex colour literal to any component style block → `npm run test` fails in the literal scan; remove it and the scan passes → AC-1
- [x] Drop a new `.mdx` file into `src/content/services/` with a `kind` → it appears in the right sidebar group with no code change → AC-5
- [x] Edit one role pairing in the test's ladder table below AA → the contrast test fails; restore it → AC-3

## Accepted without a run

One step was closed on the engineer's call rather than on evidence, and that is recorded here so nobody later reads it as a measured pass:

- **Reduced motion and Windows High Contrast** (AC-11). The DevTools MCP exposes colour
  scheme, viewport, network, CPU, user agent and geolocation, but cannot force
  `prefers-reduced-motion` or `forced-colors`. Overriding `matchMedia` from page script does
  not change how the CSS engine evaluates a media query, so it cannot stand in for the real
  thing. The engineer accepted the step on 2026-09-26 on the strength of the rules that ship in
  the built stylesheet: a `prefers-reduced-motion: reduce` block that drops the menu panel and
  group transitions, and a `forced-colors: active` block that puts a `ButtonText` border on
  buttons and a `Highlight` outline on every focusable control. The check itself is still
  worth running once, on a real Windows machine: Settings, Accessibility, Visual effects, then
  Animation effects off and High contrast on, and reload any page. If anything looks wrong,
  untick the AC-11 step above and reopen this note.

The theme persistence, offline page and print steps that were open in the first run are closed
with evidence; they needed a real origin rather than the filesystem.

## Gaps found while verifying, now closed

- [x] `src/layouts/Layout.astro` carried a raw `rgba(0, 0, 0, 0.5)` for the menu dim layer, and the literal scan passed it anyway: the scan stripped bare `0` values and matched `rgb(` with a word boundary, and neither reached inside an `rgba(...)` call. Fixed on 2026-09-26. The dim layer now reads `var(--scrim)`, a token in `tokens.css` (a ladder carries no alpha, so a translucent wash cannot be a role). The scan matches `rgba?(` and `hsla?(` now, and two new cases in `literals.test.ts` pin the pattern to the alpha forms so the hole cannot reopen. Confirmed by putting the `rgba(` back: the scan failed naming the file and the line, and passed again on removal. → AC-1

## Acceptance-criteria coverage

- AC-1 literal scan step + failure case + verify · AC-2 role coverage and parity tests · AC-3 contrast tests and the OS switch steps · AC-4 the switch, reload, storage, and no JavaScript steps · AC-5 the 320 pixel, keyboard, print, and new service steps · AC-6 the Hebrew steps · AC-7 the blocks on the style guide and content pages · AC-8 the style guide steps · AC-9 the drift test and the offline saved choice step · AC-10 the verify and measurement steps (16.1 kB of 30 kB, no new dependencies) · AC-11 the keyboard, reduced motion, and High Contrast steps
