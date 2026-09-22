# Verify: design system & UI foundation · spec 0004 · updated 2026-09-21

_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Open the home page, a weekly service page, and `/style-guide` with no stored theme choice, then switch the OS setting between light and dark: each page follows the setting with no flash of the wrong colours → AC-3, AC-4
- [ ] Press the sidebar switch on any page: it cycles System, Light, Dark, the label names the setting the site is in now, a reload keeps the choice, and `localStorage` holds only the key `ucoy-theme` with the value `light` or `dark` → AC-4
- [ ] Save a light choice, set the OS to dark, and open `public/offline.html` directly: the light palette and `color-scheme: light` win, so the offline page honours the saved choice where it can → AC-9
- [ ] Disable JavaScript and walk the shell: the menu, both service groups, and both modes still work, and no theme switch renders anywhere → AC-4, AC-5, AC-10
- [ ] At 320 pixels wide: no sideways scrolling, the menu opens from the one header button, and every control stays at least 44 by 44 pixels → AC-5
- [ ] Keyboard only: the skip link, both menu groups, the current page marker, and the theme switch each take focus with a visible ring, and the skip link reaches the main content → AC-11
- [ ] Reduced motion enabled and Windows High Contrast emulated: nothing animates, controls stay visible, and no meaning rests on colour alone → AC-11
- [ ] On the style guide page, a Hebrew phrase inside an English sentence keeps its own direction, and the marked right to left passage aligns, marks its lists, and quotes right to left, in both modes → AC-6
- [ ] Print a service page: the sidebar, the menu button, the footer, and the skip link drop, and the order of service stays in order → AC-5
- [ ] Visit `/style-guide`: every ladder, every role, every building block, and the Hebrew samples are shown, the page is not linked from the menu, and it carries `noindex` → AC-7, AC-8

## Commands

- [ ] `npm run verify` → astro check reports 0 errors and the build completes with 13 pages → AC-1, AC-10
- [ ] `npm run test` → 60 tests pass: the literal scan (AC-1), AA contrast for every pairing in both modes (AC-3), the dark media block and the dark attribute block agree (AC-2, AC-3), no stylesheet names a ladder step and every role used is a contract role (AC-2), and `public/offline.html` matches the roles in both modes (AC-9)
- [ ] Add a hex colour literal to any component style block → `npm run test` fails in the literal scan; remove it and the scan passes → AC-1
- [ ] Drop a new `.mdx` file into `src/content/services/` with a `kind` → it appears in the right sidebar group with no code change → AC-5
- [ ] Edit one role pairing in the test's ladder table below AA → the contrast test fails; restore it → AC-3

## Acceptance-criteria coverage

- AC-1 literal scan step + failure case + verify · AC-2 role coverage and parity tests · AC-3 contrast tests and the OS switch steps · AC-4 the switch, reload, storage, and no JavaScript steps · AC-5 the 320 pixel, keyboard, print, and new service steps · AC-6 the Hebrew steps · AC-7 the blocks on the style guide and content pages · AC-8 the style guide steps · AC-9 the drift test and the offline saved choice step · AC-10 the verify and measurement steps (16.1 kB of 30 kB, no new dependencies) · AC-11 the keyboard, reduced motion, and High Contrast steps
