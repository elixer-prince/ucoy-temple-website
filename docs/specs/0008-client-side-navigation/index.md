# 0008. Client side navigation through the whole site

**Date**: 2026-10-12
**Status**: Accepted

## Summary

Right now every link on the site causes a full page load, which on a slow phone
means a blank flash and a moment of nothing. Astro ships a feature called the
ClientRouter that fetches the next page quietly and swaps in only the part that
changed, so the black sidebar and header never move and the reading column
simply changes. This spec turns that on for every page, with no animation at
all, and fixes the two things it would otherwise break: the theme choice a
member saved, and the theme button itself. Nothing about the offline promise
changes, because every page is already held in the service worker's cache.

## Requirements

**User stories**:

- As a member reading a service on a phone, I want tapping a link to change only the reading column so that I am not left looking at a blank screen between sections.
- As a member who chose dark mode, I want that choice to survive moving between pages so that the site does not flash light at me after every tap.
- As a member with no connection, I want navigation to keep working exactly as it does now so that the offline promise is not weakened.
- As a member on a metered connection, I want the site not to fetch pages I have not asked for so that my data is not spent without my choosing.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Tapping an internal link changes the reading column and the address bar without a full page load. The sidebar, the header, and both stylesheets stay in place, and the document is never replaced.
- **AC-2**: After any navigation, `html` still carries the theme the member chose. A member on dark who navigates three pages is still on dark, with no flash of the light palette.
- **AC-3**: The theme switch still cycles System, Light, Dark after any navigation, its label still names the current state, and the choice still survives a reload. It does not need a reload to start working again.
- **AC-4**: No animation of any kind plays during navigation, on any page, in any motion setting. A member whose device asks for reduced motion sees exactly what everyone else sees.
- **AC-5**: With no connection, a member can still move between any page they have already visited, and the page they land on is correct and complete. A page they have never opened still shows the offline notice.
- **AC-6**: Tapping a link to one of the temple's PDFs opens the PDF in one request. The router does not fetch it first and throw the response away.
- **AC-7**: Submitting the contact form still sends the message and still shows the confirmation, exactly as it does today.
- **AC-8**: A video that was playing is stopped by navigating away, and no audio continues behind the new page. Returning to the service page starts the video from the beginning.
- **AC-9**: With JavaScript off, every link on every page still works, the menu still works, the theme still follows the device setting, and nothing is worse than it is today.
- **AC-10**: A unit test drives the real theme reapply logic through a fake document and fails if the theme is not restored, so the fix cannot silently regress.
- **AC-11**: Pressing back and forward restores the reading position the member left, the same as a full page load does today.
- **AC-12**: A screen reader announces the new page title after each navigation, so a member who cannot see the change knows the page moved.

## Decision

**Chosen option**: Option 1: Astro's ClientRouter, no animation

Turn on Astro's built in ClientRouter for every page, with all animation
suppressed so navigation is a single silent step, and add the two small pieces
that keep the theme and its switch alive across a swap.

**Implementation skills**: `astro-framework` (tool agnostic identity for the Astro conventions skill, `.agents/skills/astro-framework/`)

## Feature design

**What the router does, in order.** A member taps a link. The router checks the
link is internal, on this origin, and not marked to skip. It fires
`astro:before-preparation`, then fetches the next page with `fetch()`. Because
that is a fetch and not a browser navigation, the service worker answers it from
its cache first asset path, where every page already sits. The router parses the
response, fires `astro:before-swap`, replaces the `<head>` and `<body>`, updates
the address and history, restores focus, restores scroll, and fires
`astro:after-swap` and then `astro:page-load`.

**Value sourcing**:

| Value the feature needs                 | Where it comes from                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The theme the member chose              | `localStorage`, under the key `ucoy-theme`, read by the existing script and re read after each swap |
| Whether the member wants reduced motion | The device setting, honoured by the router's own built in media query. Nothing is written for this. |
| Which page to load                      | The `href` of the link the member tapped                                                            |
| Whether a page is available offline     | The service worker's shell cache, populated at install by `integrations/precache-manifest.mjs`      |
| The new page title for the announcement | The incoming page's `<title>`, read by the router                                                   |
| Whether a link should skip the router   | A `data-astro-reload` attribute written on the link in markup                                       |
| The theme button to rebind              | `document.getElementById('theme-button')` in the newly swapped body                                 |

**The two things that must be fixed.**

The first is the theme attribute. Because `swapRootAttributes` copies only the
attributes the incoming page carries, and no built page carries `data-theme`, the
attribute is lost on every navigation. The fix is a second small script that
listens for `astro:after-swap` and writes the saved choice back onto `html` from
`localStorage`, using the same try and catch shape as the existing pre-paint
script so a member with storage blocked is not broken by it. The existing
before paint script stays exactly as it is, because it is still what stops a
flash of the wrong colours on a genuine page load.

The second is the theme button. Its click listener belongs to the element, and
the swap throws that element away. The fix is to move the binding out of the
inline script that runs once and into an initialisation function that runs on
`astro:page-load`, which Astro fires both on the first load and after every
swap. The button is found fresh each time, so it always has a working listener.
The button stays `hidden` in the markup and is revealed by that same function,
so nothing renders when JavaScript is off, which spec 0004 AC-4 requires.

**What is marked to skip the router.**

Links to the temple's PDFs carry `data-astro-reload`. Without it the router
would fetch the PDF, see a content type that is not HTML, discard the response,
and then perform a full load anyway, which asks for the file twice. The contact
form carries it too, so a submit always performs a real navigation and the
existing confirmation script keeps working untouched. Links to other origins and
`mailto` links are already skipped by the router without any markup.

Links whose target changes between rebuilds carry it as well: the Home link
(the upcoming events list is computed from the calendar feed at build time,
spec 0007) and the "This Week's Torah Portion" link (the reading is computed
from the Hebrew calendar at build time). Without it the router would serve the
worker's cached copy of an older build until the worker version changes, so a
member clicking the link could be shown last week's events or portion.

**Videos.** No video is marked persistent. A playing video is stopped by
navigating away and starts again from the beginning on return, which matches how
a service order is read and stops audio continuing behind a page the member has
left.

**The animation trap the build must not fall into.**

There are two different ways to reach "no animation", and only one of them is
safe. The safe one is `transition:animate="none"` on the elements that make up
the shell, which is a per element directive and leaves the router fully wired.

The unsafe one is `handleFallback="none"` on `<ClientRouter />`. Reading
`node_modules/astro/dist/transitions/router.js` shows why: at line 411 the router
registers its `load` and `popstate` listeners only when
`supportsViewTransitions || getFallback() !== "none"`. On a browser without the
View Transitions API, a fallback of `none` means the router registers nothing at
all, so `astro:page-load` never fires, so the theme button is never bound and
the switch is dead on exactly the older phones this site cares about most. The
build must not use `handleFallback`, and this note exists so a later change does
not add it for tidiness.

Order of events, confirmed in the same file: the swap happens inside
`astro:before-swap` handlers, then `astro:after-swap` fires at line 208, and
`astro:page-load` fires afterwards at line 352 once scripts have run. So the
theme restore listens on `astro:after-swap` and the button binds on
`astro:page-load`, and both run in the order this spec assumes.

**Prefetching.** None. Not on hover, not on viewport, not on load. Every page is
already in the service worker's cache, so the router's fetch costs no network,
and prefetching would only spend a member's data on pages they never opened.

**Critical test scenarios** (each maps to an acceptance criterion):

- Choose dark, then navigate three pages. The `data-theme` attribute is still `dark` throughout and the canvas never flashes light → AC-2
- Navigate, then press the theme switch twice. It cycles, the label names the new state, and a reload keeps the choice → AC-3
- Turn on the device reduced motion setting and navigate. Nothing animates and nothing changes → AC-4
- Build, serve `dist` over a plain static server, let the worker install, then enable airplane mode and walk between several pages. Each one arrives complete and correct → AC-5
- While offline, tap a page never opened before. The offline notice appears rather than a broken page → AC-5
- Tap a resource link to a PDF and count the requests. The PDF arrives in one request → AC-6
- Drive the theme reapply script through a fake document with a saved choice and assert the attribute is rewritten; then with no saved choice and assert it is removed → AC-10
- Submit the contact form and confirm the message sends and the confirmation shows → AC-7
- Disable JavaScript and walk the shell. Every link works, the menu works, the theme follows the device → AC-9
- Scroll down a long service page, tap a link, then press back. The reading position is where it was left → AC-11

## Build plan

Each task names the acceptance criteria it satisfies. This is one small,
revertible change, so there is no migration plan: if any part of it is wrong,
reverting the single commit restores the previous behaviour exactly.

1. **Turn the router on with no animation.** Import `ClientRouter` from
   `astro:transitions` and place it in the `<head>` of `src/layouts/Layout.astro`.
   Set `transition:animate="none"` on the elements that make up the shell so
   nothing fades or slides. Do not pass `handleFallback` to `<ClientRouter />`:
   a fallback of `none` stops the router registering its listeners on browsers
   without the View Transitions API, which leaves `astro:page-load` unfired and
   the theme switch dead. See "The animation trap" above. → AC-1, AC-4
2. **Restore the theme after each swap.** Add a small script in the layout that
   listens for `astro:after-swap` and writes the saved choice from `localStorage`
   back onto `html`, or removes the attribute when the choice is system. Match
   the existing script's try and catch shape. → AC-2
3. **Rebind the theme button on every page load.** Move the button's binding into
   an initialisation function that runs on `astro:page-load`, so it fires on the
   first load and again after every swap. The button stays `hidden` in markup and
   is revealed by that function. → AC-3, AC-4
4. **Mark the links that must skip the router.** Add `data-astro-reload` to the
   resource links that point at PDFs and to the contact form. → AC-6, AC-7
5. **Leave the videos and the prefetching alone.** No `transition:persist`
   anywhere, and no `prefetch` key in `astro.config.mjs`. Record why in a comment
   so a later change does not add it by accident. → AC-8
6. **Write the test.** Add `src/navigation.test.ts` driving the real theme
   reapply logic through a fake document, following the shape of
   `src/worker-sandbox.ts`, so a regression in the layout's script fails the
   suite. Cover a saved choice, a system choice, and storage being blocked.
   → AC-10, AC-2
7. **Prove it on a real browser.** Build, serve `dist` over a plain static
   server so the worker registers, then walk the shell in airplane mode and
   confirm the theme, the switch, the announcement, and back and forward.
   `npm run preview` cannot prove this, because preview answers
   `/sw-manifest.json` with the 404 page and the worker installs holding only
   the offline page. → AC-5, AC-11, AC-12
8. **Confirm nothing regressed with JavaScript off.** Walk the shell with
   JavaScript disabled and check every link, the menu, both groups, and both
   modes. → AC-9

## Consequences

What this makes better, and what it makes harder.

- Navigation stops blanking the screen, and the sidebar and header stop being rebuilt on every tap. This is the entire point.
- The offline promise is unchanged, and the router's fetch is served from the cache the worker already holds. No new request is made and no member's data is spent.
- Every page stays plain HTML, so search engines, JavaScript off, and old browsers are all unaffected. This is not a JavaScript only site.
- Two existing inline scripts now have to be understood together, because the swap is a third thing that touches the theme. Anyone changing the theme has to know that `astro:after-swap` exists. This is the main cost of the change.
- The `Layout.astro` head grows one component and one script, so the shell is slightly less plain to read than it was.
- A member who taps a PDF now gets a full page load rather than a swap. That is correct, and it is also a visible inconsistency if the temple later expects every link to behave the same way.
- The router is roughly 15 kilobytes of script that must load before the first swap works. On a first visit over a slow connection the very first tap may still do a full load.
- `npm run preview` cannot be used to verify the offline behaviour, because the worker does not register behind preview. Verification needs a plain static server over `dist`.

## Follow-up

- If the temple later wants a visible transition, the animation choice can be revisited. It should be revisited together with the theme fix rather than separately, because the flicker risk lives in the same place.
- Any future feature that adds a client side script to a page must bind it on `astro:page-load`, not on `load`, or it will break the same way the theme button would have. This belongs in the project conventions when the next such feature lands.
