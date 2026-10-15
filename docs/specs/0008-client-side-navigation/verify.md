# Verify: client side navigation · spec 0008 · updated 2026-10-12

_Steps derived from spec 0008 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Click an internal link → the reading column and address change, sidebar and header stay in place, no full reload → AC-1
- [x] Save dark, then navigate three pages → `html` still carries `data-theme="dark"` with no light flash → AC-2
- [x] After a navigation press the theme switch twice → System, Light, Dark cycle with the right labels; reload → the choice is kept → AC-3
- [x] Navigate with default motion, then with reduced motion emulated → zero running animations sampled across both swaps → AC-4
- [x] Serve `dist` over a plain static server, let the worker install, then stop the server (airplane mode) → walked pages arrive complete and correct → AC-5
- [ ] While offline, tap a page the install does not hold → the offline notice appears → AC-5
- [x] Tap a resource link to a PDF and count requests → exactly one request, type Document → AC-6
- [ ] Submit the contact form → the message sends as a real navigation and the confirmation shows → AC-7
- [x] Play a service video, navigate away → no media element remains; go back → the video starts from the beginning → AC-8
- [ ] Disable JavaScript and walk the shell → every link navigates, the menu opens at 390 pixels, the theme follows the device → AC-9
- [x] Scroll down a long service page, tap a link, press back → the reading position is where it was left → AC-11
- [x] After each navigation read the title; with a screen reader confirm the new page title is announced → AC-12

## Commands

- [x] `npm run verify` → check passes with no errors and the build completes → the gate for every task
- [x] `npx vitest run src/navigation.test.ts` → 8 pass → AC-10
- [x] `npx vitest run src/styles/literals.test.ts` → pass → the base.css navigation rules carry no raw literals

## Acceptance-criteria coverage

- AC-1 step 1 · AC-2 step 2 · AC-3 step 3 · AC-4 step 4 · AC-5 steps 5 and 6 · AC-6 step 7 · AC-7 step 8 · AC-8 step 9 · AC-9 step 10 · AC-10 step 14 · AC-11 step 11 · AC-12 step 12
