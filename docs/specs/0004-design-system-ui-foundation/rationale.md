# 0004. Design system and UI foundation for the temple website

**Date**: 2026-09-20
**Status**: In Progress

_Decision record: the context, the options considered, the rationale, and the references. The build spec lives in index.md._

## Context

> ⚠️ Premise note: the theme switch you asked for is the one thing here that adds JavaScript to a shell that otherwise needs none, and it stores a value on the member's device. That is a fair trade for a member who disagrees with their phone's setting, but it softens the plain "no cookies, nothing stored" line the site likes to make, so the privacy notice gains a sentence and the switch must vanish cleanly when JavaScript is off. If you would rather keep the shell free of scripts, say so and the switch drops out without touching anything else.

The scaffold shipped a placeholder look: two type faces, eight spacing steps, eight colour values, a flat five link menu, one button style, and two content widths. Six pages use it today, and every page in slices 1 to 4 is built on top of it, which makes its shape load bearing for the rest of the project.

The audience sets the bar. Members read on a phone, often older, sometimes with no connection and in bright daylight. Spec 0001 already promised legible body text, AA contrast, and no sideways scrolling at 320 pixels, and the scope repeats AA in both modes with correct Hebrew for this feature. A palette of one shade per colour cannot meet that promise: every hover, border, quiet tint and dark mode variant needs a place to live, and today a page either reuses the single shade or invents its own literal. That is how a site drifts into looking like several sites.

The temple's real navigation is two levels deep. The current site groups Weekly Shabbat Services (Friday Evening Home Ritual, Saturday Morning Service, Saturday Afternoon Service, Closing of the Shabbat) and High Shabbatot (Yom Kippur, Yom Teruah, Shavuot), with This Week's Torah Portion and Important Dates beside them. The scaffold's flat five link menu cannot show that tree, and members already know the tree. On top of this, the heaviest Hebrew pages of the whole project are still ahead (the Sabbath evening and Torah portion pages), so direction support added later would touch every page.

The design source is the temple's current Google Site, which members recognise. Two facts about it shape this decision. Its theme cannot be read from outside, because the page is drawn by JavaScript, so reading it from the web returns the wording and the structure but no colour or font values. And its colours are one shade each, which is what makes it look flat. You therefore asked for the temple's own colours and wording kept, with the craft improved, and you already turn a single brand colour into a numbered scale with an online generator before writing it out as variables.

The consequence of leaving this undecided is drift. Each slice would pick its own shades, spacing and building blocks, dark mode would need a second hand written palette per page, Hebrew direction would be patched page by page, and the palette already duplicated in `public/offline.html` would fall out of step with the rest of the site unnoticed.

## Options considered

### Option 1: Keep the placeholder palette and extend it as it stands

Leave the eight colour values as they are and add a new named value whenever a page needs a hover, a border or a tint.

**Pros**:

- Nothing new to learn, and the smallest possible change to the six existing stylesheets.

**Cons**:

- Every new state needs a new hand written name, so dark mode becomes a second list kept in step by hand.
- The temple's colours cannot be adjusted without hunting through the stylesheets, and the flatness that prompted this feature stays.

### Option 2: Two layer tokens in hand written CSS, with the shell and the blocks built on them

Write one token file holding the raw ladders and the named roles, in both modes, then rebuild the shell and the small building blocks on those role names only.

**Pros**:

- Fits the hand written CSS the stack already chose, adds no build dependency, and keeps the payload small for a static site served to phones on slow connections.
- Dark mode becomes a remapping of ten role names, and the temple's colours live in one block that a future change edits once.

**Cons**:

- The ladder values are generated outside the repository once and committed, so a re brand means generating them again by hand.
- An author has to learn the two layer rule, and the rule needs a check to stay true.

### Option 3: Adopt Tailwind CSS

Use Tailwind's theme configuration for the ladders and its utility classes in the pages.

**Pros**:

- The numbered scales and the utilities come ready made, with a large community and current documentation.

**Cons**:

- A new build dependency and toolchain to keep for a static site whose stylesheets are already written by hand.
- Utility classes sit awkwardly beside Astro's scoped styles, and `public/offline.html` still cannot import the framework, so the duplicated palette gets worse rather than better.

### Option 4: Adopt a ready made component library

Take a complete set of components and a look from an existing library.

**Pros**:

- Components arrive finished, with accessibility work already done by someone else.

**Cons**:

- The look belongs to the library rather than to the temple, and bending it to a Hebrew service page and a two level sidebar costs more than writing the few blocks this site needs.
- A dependency is added for pages that are mostly long text.

## Rationale

The deciding force is the audience on a slow phone. Every option here costs bytes and build work, and the site already has to keep a hand written service worker in step, so a framework would add a second thing to maintain for pages that are mostly text (basis: spec 0001's offline promise and the payload constraint behind it). Hand written CSS with custom properties is what the scaffold already ships, so this thickens an existing thread rather than starting a new one (basis: spec 0001, the hand written CSS decision, and the installed `astro-framework` skill's guidance on global stylesheets and CSS variables).

The two layer palette answers the flatness directly. A ladder gives every state a shade to reach for, and the role layer means light and dark are the same ten names pointed at different steps, so no page needs a second palette (basis: Refactoring UI's method of building a ramp per hue and then naming roles over it, which is also how Tailwind's scales are organised). Your existing habit of generating a ladder and writing it out as `--color-<hue>-<step>` values is kept exactly, including the 50 to 950 steps, so the tokens look like the ones you already write (basis: the naming in your answer and the generator you use).

The sidebar is content driven because the content model already carries the answer: the two groups members know are exactly the two `kind` values in the services collection, so the menu can be generated from the files rather than hand maintained (basis: spec 0003, the `kind` field and its route rule). That keeps the volunteer's promise from the user stories, since adding a service file puts it in the menu.

The role names take a `--color-` prefix, replacing the short scaffold names such as `--canvas` and `--ink` (runner up: keeping the short names). Consistency with `--color-<hue>-<step>` is worth the one off edit, because only the six stylesheets listed in the project sources use the old names today, and the cost of renaming rises with every page built on them.

The rest of the internal calls, each with the runner up I passed over:

- Type keeps `Inter` and `Frank Ruhl Libre` exactly as configured, with a named text scale and a line length limit added (runner up: adding David Libre for long Hebrew passages). Frank Ruhl Libre already carries Hebrew and Latin and is downloaded at build time, so a second Hebrew face would cost bytes before there is evidence it reads better; the Sabbath evening page is where that evidence will appear.
- Spacing keeps the eight existing steps (runner up: a new scale), so this change settles colours, type roles and components rather than restating values that already work.
- The theme switch is one button that cycles System, Light and Dark and always states the current setting (runner up: two separate buttons), because one control is the smallest surface that satisfies the answer you gave, and a label naming the present state is honest about what a press will do.
- The button stays a class in `base.css` rather than becoming a component (runner up: a `Button.astro`), because `public/offline.html` repeats that class and cannot import a component, so the class is what keeps the offline page looking like the rest of the site.
- Long form content styling is a class plus a stylesheet, not a component (runner up: a `Prose` component), because MDX and markdown bodies arrive as plain elements and no wrapper component can reach inside them without a global style anyway.
- The offline guard is a test rather than a build step that rewrites `public/offline.html` (runner up: generating that file at build time), because a test adds no build magic and the duplication is already scheduled for revisiting in scope feature 16.
- The accessibility bar is proven by a computed contrast test over the role pairings, plus a keyboard pass and a forced colours check, rather than by a manual checklist alone (runner up: manual review only), because contrast ratios are arithmetic and a test does not get tired.
- The style guide page is built, marked `noindex`, kept out of the menu, and left inside the offline precache because it is small (runner up: keeping it out of the pre cache), so it can still be reviewed from a phone with no connection.

One preference is worth recording plainly. You first asked to match the current Google Site closely. An exact copy is both undesirable and partly impossible: its theme cannot be read from outside the page, and its single shade per colour is the very thing that makes it look flat. This decision therefore keeps the temple's colour identity, its wording, and the tree the members already know, and rebuilds everything around them.

## References

_Project sources_

- `docs/specs/0001-adopt-static-site-stack.md`: static output, hand written CSS, the accessibility criteria, and the offline promise this feature must not break
- `docs/specs/0003-content-model.md`: the `kind` field and the route rule that let the menu be built from content
- `docs/specs/0002-coding-standards-and-tooling.md`: strict types, the verify gate, and the test suite the new tests join
- `src/styles/tokens.css`, `src/styles/base.css`, `src/layouts/Layout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/Video.astro`: the placeholder layer this decision replaces and reworks
- `public/offline.html`: the repeated palette that the drift test guards
- `astro.config.mjs`: the two font families this decision keeps
- `docs/scope/scope.md`: the done condition for this feature and the features it hands off to
- The temple's current site, read during discovery for its wording and its two level tree
- The installed `astro-framework` skill: global stylesheets, scoped styles and CSS variables in Astro
- The installed `web-perf` skill: payload and offline caching constraints

_Practices & standards_

- WCAG 2.1 level AA for contrast, focus visibility, target size and reduced motion, the bar spec 0001 already promised
- Refactoring UI's method: build a ramp per hue, then name a small set of roles over it
- Named colour ladders numbered 50 to 950, the convention the temple already generates with an online tool
- CSS custom properties with a semantic layer over raw values, so a theme is a remapping
- Progressive enhancement: the shell and the whole menu work with JavaScript off
- `prefers-color-scheme`, `prefers-reduced-motion` and `forced-colors` as operating system hints a page must honour
- Printing: keep the order of service and drop the navigation
