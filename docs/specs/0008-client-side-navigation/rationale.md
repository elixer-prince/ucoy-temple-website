# 0008. Client side navigation through the whole site

**Date**: 2026-10-12
**Status**: In Progress

_Decision record: the context, the options considered, the rationale, and the references. The build spec lives in index.md._

## Context

A member reading a service on a phone currently waits for a full page load
every time they tap the next link. On the connections this audience actually
has, that wait is the most noticeable slowness on the site. The site is
otherwise fast because it is a set of plain prebuilt HTML files with no server
and no database, so the wait is not a slow server, it is the browser throwing
away and rebuilding a page that is mostly identical to the one it just
discarded. The sidebar, the header, the fonts, and the stylesheets are all
unchanged between pages, and all of them get rebuilt on every tap.

Astro 7 already carries the fix. The `astro:transitions` integration exports a
component called `ClientRouter` that intercepts internal link clicks, fetches
the next page as HTML, and replaces the `<head>` and `<body>` in place. The
pages stay plain HTML, so search engines, anyone with JavaScript off, and anyone
on a browser without the underlying View Transitions API all still get a normal
full page load. Support for the animated form of this is now around 93% of
visitors worldwide, and the fast swap itself works in every browser Astro
targets.

The reason this needs a decision recorded rather than a quick patch is that the
router does not merely swap the content. It also rebuilds the document root,
which is where this site keeps its theme choice. Reading Astro's own swap code
in `node_modules/astro/dist/transitions/swap-functions.js` shows why: the
function `swapRootAttributes` removes every attribute currently on `<html>` and
then copies in only the attributes the incoming page carries. This site applies
its theme as `data-theme` on `<html>` at runtime, from a value in
`localStorage`, so no built page ever carries that attribute. Left alone, a
member who chose dark would silently fall back to their device setting the
first time they clicked a link. The same swap replaces the whole `<body>`, so
the theme button that arrives is a fresh element with no click listener, and the
theme switch would stop responding after the first navigation until a reload.

The offline promise is the constraint that makes some of the usual advice wrong
here. The normal recommendation is to prefetch links so a click is instant.
That would spend a member's data on pages they may never open, on the very
connections that matter most. But this site does not need it: the service worker
already precaches every page at install, so the router's fetch is answered from
cache and costs no network at all.

## Options considered

### Option 1: Astro's ClientRouter, no animation

Turn on the built in `ClientRouter` in the layout, with every animation
explicitly turned off. The sidebar and header are never touched, only the
reading column changes. Two small scripts handle the theme.

**Pros**:

- No new dependency, no new framework, and no JavaScript of our own doing the routing. It is one component from the version of Astro already installed.
- Every page stays plain HTML, so search engines, JavaScript off, and old browsers are all unaffected.
- The fix is local: one layout file plus two small scripts.

**Cons**:

- The swap is not free. It is about 15 kilobytes of script that has to load before the first navigation works.
- Two existing scripts have to be understood and rewired, and a third person touching the theme has to know the swap is happening.

### Option 2: Prefetch links, keep full page loads

Leave navigation alone and instead warm the browser's cache for each link before
it is tapped, so the eventual full load is faster.

**Pros**:

- Nothing about the document root, the theme, or any existing script changes. There is nothing to break.
- Simpler to reason about, and no client side routing at all.

**Cons**:

- A full page load still blanks the screen and rebuilds the sidebar, the header, and the fonts every time. It is a smaller wait, not a different experience.
- It spends a member's data on pages they may never open, on the connections that matter most here. That is the opposite of what this audience needs.

### Option 3: A hand written router

Write our own click interception and DOM replacement, tailored to this shell.

**Pros**:

- Complete control over exactly what is swapped, and no dependency on framework behaviour we did not write.

**Cons**:

- We would be reimplementing the history stack, scroll restoration, focus handling, and screen reader announcement by hand. Every one of those is a place to be quietly wrong.
- Astro already ships this. Writing it again is cost with no benefit, and it is exactly the kind of code that rots.

### Option 4: Rebuild the shell as a single page application

Move the whole site to a client side framework so the shell is never rebuilt.

**Pros**:

- The most app like result, and the shell genuinely never rebuilds.

**Cons**:

- It throws away the reason this site is fast, offline capable, and simple: the pages are plain HTML files with no server and no database.
- It works against spec 0001, which chose static output precisely so the site works on a phone with no internet.

## Rationale

The problem is a full page load rebuilding identical chrome on every tap, and
Astro's own router is the fix for exactly that, in the version already
installed (basis: `astro: ^7.3.3` in `package.json`, and the `astro-framework`
skill's view transitions reference). Option 2 treats the symptom with a cost
this audience should not pay, spending their data on pages they may never open,
and it still blanks the screen. Option 3 spends our effort reimplementing
history, scroll, focus, and announcement to gain nothing over a component that
is already here. Option 4 inverts the stack decision in spec 0001 (basis: your
AGENTS.md, offline is a core promise) and would cost the offline promise that is
the site's whole reason for existing.

The reason no animation is chosen is not timidity. The one thing that makes this
change risky is that the router rebuilds the document root, and animation would
make that visible as a flicker of the wrong colours. Turning animation off
removes the symptom, leaves the swap instant, and satisfies the reduced motion
preference for every member without any special casing (basis: the ClientRouter
ships its own `prefers-reduced-motion` media query that suppresses animation
including the fallback animation, documented at
https://docs.astro.build/en/guides/view-transitions/). The theme still needs its
own fix, which the animation choice does not remove, and that fix is the real
content of the build plan.

## References

**Project sources**:

- `src/layouts/Layout.astro`: the shell that gains the router, and the two inline theme scripts this spec rewires
- `src/pages/contact.astro`: the form and its confirmation script
- `public/sw.js`: the hand written worker whose cache first asset path answers the router's fetch
- `integrations/precache-manifest.mjs`: what puts every page into that cache at install
- `src/worker-sandbox.ts`: the `node:vm` pattern the new test follows
- `docs/specs/0001-adopt-static-site-stack.md`: the static output decision this spec does not disturb
- `docs/specs/0004-design-system-ui-foundation/index.md`: spec 0004 AC-4, the no JavaScript theme requirement
- `node_modules/astro/dist/transitions/swap-functions.js`: `swapRootAttributes`, read directly to confirm the attribute loss
- `node_modules/astro/dist/transitions/router.js`: `fetchHTML`, `getFallback`, and the `astro:page-load` event

**Practices & standards**:

- Progressive enhancement: the page works without the script, and the script only improves it
- Design for failure: every script tolerates storage being blocked, and a failed fetch falls back to a full load

**Links**:

- https://docs.astro.build/en/guides/view-transitions/ (the `astro:after-swap` and `astro:page-load` events, the route announcer, and the reduced motion behaviour)
- https://docs.astro.build/en/reference/modules/astro-transitions/ (the `ClientRouter` API and the `viewTransition` shim for browsers without the API)
- https://caniuse.com/view-transitions (browser support for the animated form, around 93% of visitors)
