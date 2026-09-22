# 0004. Design system and UI foundation for the temple website

**Date**: 2026-09-20
**Status**: In Progress

## Summary

This decision gives the temple's new site one shared visual language, instead of each page choosing its own colours and spacing. Every colour is written once as a numbered ladder, then given a small set of job names such as page background, text, and link, so light mode, dark mode and any future change to the temple's colours all happen in one place. The same pass replaces the flat top menu with a sidebar that shows the temple's whole two level tree, adds a small set of reusable building blocks, and adds a style guide page so the result can be reviewed by eye. The look keeps the temple's own colours and wording from the current Google Site, and improves how they are used rather than copying it.

## Requirements

**User stories**:

- As a member reading on a phone, I want every page to use the same colours, type and spacing so that I can follow a service without re learning the page each time.
- As a member whose phone is set to dark, I want the site to match my phone without asking, and to have a switch when I disagree with it.
- As a member reading Hebrew, I want Hebrew words inside a sentence and long Hebrew passages to read in the right direction so that the material is usable.
- As a member looking for something, I want one menu that shows the temple's whole tree, both Shabbat service groups included, so that I reach any page in a tap or two.
- As a temple volunteer adding a service, I want the menu to show it without anyone editing code so that the site stays current.
- As the person who looks after the site, I want the colours, type and spacing written once so that a change is one edit and nothing drifts.
- As a feature author later, I want a set of building blocks and a page showing them so that I reuse what exists instead of inventing a new look.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Every colour, type, spacing, radius and border value the site's stylesheets use is a token defined in `src/styles/tokens.css`. No other file under `src/` contains a raw colour or spacing literal, and a repository check fails when one appears. That check reads hex, `rgb`, `hsl` and `px` or `rem` literals inside stylesheets and style blocks, and exempts `0`, `100%`, `currentColor`, `1fr`, media query conditions, and any value built only from tokens.
- **AC-2**: The palette has two layers. The lower layer is a numbered ladder per colour, named `--color-<hue>-<step>` with steps from 50 to 950, plus a plain `--color-black` and `--color-white`. The upper layer is a small set of named roles (page background, panel, border, text, muted text, accent, accent hover, text on accent, focus ring, quiet tint). Roles point at ladder steps, and no component or page stylesheet uses a ladder step directly.
- **AC-3**: Light and dark mode both meet WCAG 2.1 AA contrast for every role pairing the site actually renders, and an automated test over those pairings enforces it. The pairings are enumerated in the Feature design section, so the test cannot be narrowed silently. With no stored choice, the browser's own colour scheme setting selects the mode.
- **AC-4**: A theme switch sits in the sidebar. It sets an explicit light or dark choice, or returns to following the phone, and it remembers the choice on that device under one named `localStorage` key. The chosen theme is applied before the first paint, so no page flashes the wrong colours. The switch is absent, not merely inert, when JavaScript is off, `color-scheme` follows the effective theme, and no cookie is set anywhere.
- **AC-5**: A sidebar shows the whole site: two groups built from the service files by `kind`, plus a fixed set of entries from one config file. Only routes that exist in the build are listed. The entry for the current page is marked for assistive technology. On a wide screen the sidebar stays visible and each group opens in place, and on a narrow screen the same list opens from one button. The whole menu works with JavaScript off, every control is at least 44 by 44 pixels with a visible focus indicator, a skip link reaches the main content, and a printed service page drops the menu and the footer while keeping the order of service.
- **AC-6**: Hebrew renders correctly in both modes. A Hebrew phrase inside an English sentence keeps its own direction and punctuation, and a block marked as a Hebrew passage lays out right to left, including alignment, list markers and quotation marks, without disturbing the surrounding page.
- **AC-7**: The building blocks named in the Feature design section exist with the props listed there, are used by the pages already built, and are shown on the style guide page.
- **AC-8**: A style guide page at `/style-guide` shows every ladder and every role name, every building block, and a Hebrew sample in both modes. It is marked to be ignored by search engines, carries its own heading, and is not linked from the site menu.
- **AC-9**: The role values repeated in `public/offline.html` cannot drift silently. A test fails when that file's palette no longer matches the roles in `tokens.css`, and the offline page honours a saved theme choice where it can.
- **AC-10**: No CSS framework and no new build dependency is added, the stylesheets a page loads total under 30 kB uncompressed, measured from the build output, and the shell works with JavaScript off.
- **AC-11**: Every interactive control is reachable and operable by keyboard with a visible focus indicator, transitions and animation yield to the reduced motion setting, no meaning depends on colour alone, and the pages stay readable in Windows High Contrast mode.

## Decision

**Chosen option**: Option 2: Two layer tokens in hand written CSS, with the shell and the blocks built on them

The site gets one token file with a numbered ladder per colour and a small named role layer over it, a sidebar built from the content, a theme switch, nine small building blocks, and a style guide page, all in hand written CSS with no new dependency (basis: spec 0001 already chose hand written CSS over a framework, and this feature keeps that promise).

**Implementation skills**: `astro-framework` (`delineas/astro-framework-agents`, `.agents/skills/astro-framework/`) · `web-perf` (`cloudflare/skills`, `.agents/skills/web-perf/`)

## Feature design

**Data model sketch**:

The design system's data is its token contract. It lives in one file, `src/styles/tokens.css`, in two clearly headed layers, and the file holds both modes.

Layer 1, the ladders (raw values, no meaning attached, generated once from the temple's colours):

| Token family                     | Steps                                                | Count | Value source                         |
| -------------------------------- | ---------------------------------------------------- | ----- | ------------------------------------ |
| `--color-grey-<step>`            | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | 11    | The temple's neutral, generated once |
| `--color-<hue-a>-<step>`         | the same eleven steps                                | 11    | The temple's first colour            |
| `--color-<hue-b>-<step>`         | the same eleven steps                                | 11    | The temple's second colour           |
| `--color-<hue-c>-<step>`         | the same eleven steps                                | 11    | The temple's third colour            |
| `--color-black`, `--color-white` | two plain extremes                                   | 2     | Reached for at the very ends         |

The three hues are named in the temple's own vocabulary: `Royal Gold` is `--color-royal-gold-<step>`, `Hebrew Red` is `--color-hebrew-red-<step>`, and `Kosher Blue` is `--color-kosher-blue-<step>`. The values were sampled from the current Google Site, so every ladder has the right shape and a real hue; an exact colour pick from the site's theme settings still replaces the raw values (Follow-up), and that swap touches no role and no component.

Layer 2, the roles (what every stylesheet uses, and the only names a component may name):

| Role                   | What it is for                                  | Light points at   | Dark points at    |
| ---------------------- | ----------------------------------------------- | ----------------- | ----------------- |
| `--color-canvas`       | the page background                             | `grey-100`        | `grey-950`        |
| `--color-surface`      | panels, cards, header, footer, sidebar          | `grey-50`         | `grey-900`        |
| `--color-border`       | dividers, table lines, panel edges              | `grey-600`        | `grey-500`        |
| `--color-text`         | body text and headings                          | `grey-900`        | `grey-200`        |
| `--color-text-muted`   | dates, captions, small print                    | `grey-700`        | `grey-400`        |
| `--color-accent`       | links, buttons, the current page marker         | `kosher-blue-700` | `kosher-blue-300` |
| `--color-accent-hover` | hover and pressed states                        | `kosher-blue-800` | `kosher-blue-200` |
| `--color-on-accent`    | text and icons on an accent surface             | `grey-50`         | `grey-950`        |
| `--color-focus`        | the focus ring                                  | `kosher-blue-700` | `kosher-blue-300` |
| `--color-tint`         | quiet tint for callouts and the open menu group | `royal-gold-100`  | `royal-gold-900`  |

A second role family is fixed in both modes, because the sidebar is black on purpose in either one, and it is the only place black and white are reached for as roles:

| Role                     | What it is for                             | Both modes point at |
| ------------------------ | ------------------------------------------ | ------------------- |
| `--color-sidebar-bg`     | the sidebar and the open menu panel        | `black`             |
| `--color-sidebar-text`   | every sidebar label                        | `white`             |
| `--color-sidebar-muted`  | the quiet note beside a planned entry      | `grey-300`          |
| `--color-sidebar-hover`  | hover wash, the current entry, the divider | `grey-800`          |
| `--color-sidebar-marker` | the marker bar and the ring on black       | `royal-gold-400`    |
| `--color-sidebar-scroll` | the slim scrollbar thumb                   | `grey-700`          |

`kosher blue` holds the accent role. `royal gold` fails AA as link or body text on the light canvas, so it works as the tint and as the marker on black instead, and `hebrew red` is a complete ladder that no role points at yet. The temple decides the final accent later; that change is one line per mode, and the follow-up records it.

The step each role points at is settled by the contrast test (AC-3), and by nothing else. A role whose pairing cannot be made to pass is changed, never shipped with a note. Swapping the raw ladder values later re-runs that test, so a role can move a step or two without this table being re-read.

The same file carries the other token families, unchanged except for the additions:

- `--font-sans` and `--font-serif`, set by the Astro font integration in `astro.config.mjs`
- Text roles: `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body`, `--text-small`, `--text-caption`
- Line lengths and leading: `--body-line-height`, `--heading-line-height`, `--measure` (about 68 characters)
- Spacing: `--space-3xs` through `--space-2xl`, the eight steps that already exist
- Shape: `--radius`, `--radius-small`, `--border-width`, `--focus-width`, `--focus-offset`
- Breakpoints: narrow below `48em` and wide from `48em`. These are the one value that cannot be a custom property, because a media query condition cannot read one, so they are written as plain values and exempted from the token rule by AC-1

Dark mode is written twice on purpose: once inside `@media (prefers-color-scheme: dark)` with `:root:not([data-theme='light'])`, and once under `:root[data-theme='dark']`. That is the boring approach that works on every browser the members might carry. The `light-dark()` CSS function would remove the duplication in one line, but it is too new to trust for an audience with older phones, and if it is used and unsupported the declarations are dropped and the page loses its colours (runner up: `light-dark()`, revisit when the audience's browsers support it). The parity test below keeps the two blocks identical.

**Contrast pairings** (the pairings AC-3's test checks, in both modes):

- Body text on the page background, and on the panel surface
- Muted text on the page background, and on the panel surface
- A link or accent colour on the page background, and on the panel surface
- Text on an accent surface, which is how a button reads
- The border against the page background, and against the panel surface
- The focus ring against the page background, and against the panel surface
- Body text on the quiet tint, and muted text on the quiet tint

Each pairing is measured at the ratio its size demands, which is 4.5 to 1 for body text and 3 to 1 for large text and for a boundary that carries meaning. A pairing that fails is fixed by moving a role to another ladder step, never by loosening the test.

**State transitions**:

The theme has three states, and one control moves between them:

- `system`: no `data-theme` attribute on `html` and no stored key. The phone's own colour scheme setting decides, through the media query.
- `light`: `html[data-theme='light']` and `localStorage['ucoy-theme']` is `light`.
- `dark`: `html[data-theme='dark']` and `localStorage['ucoy-theme']` is `dark`.

The switch cycles `system` to `light` to `dark` and back to `system`, and its label always states the state the site is in now ("Theme: System", "Theme: Light", "Theme: Dark"), so a member can see what a press will move away from. A press writes both the attribute and the key, or clears both.

- On load, a small inline script in the head reads the key. `light` or `dark` sets the attribute; anything else, including no key at all, removes the attribute. It runs before the first paint, so no page flashes the wrong colours. If reading or writing storage throws, which happens when a browser has storage disabled, the script treats it as the system setting and the page carries on, because a theme preference must never be able to break a page.
- With JavaScript off, no attribute is ever set and no switch is rendered. The page sits in `system` by the other route, which is exactly the behaviour AC-4 asks for.
- `color-scheme` follows the effective state: `light dark` on `:root`, narrowed to one value by the attribute, so scroll bars and any native control match the page.

**API surface**:

The surface of a design system is its building blocks and the props they accept. Nine blocks are added or reworked, plus one styling class for long form content.

| Block          | File                                               | Renders                                                                                                             | Props (name: type, optional unless stated)                                            |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Sidebar        | `@components/Sidebar.astro`                        | `nav` labelled "Site", one group per service kind, then the fixed entries                                           | `currentPath?: string` (defaults to `Astro.url.pathname`)                             |
| Header         | `@components/Header.astro`                         | the temple brand link, and the menu button on a narrow screen                                                       | `label?: string` (defaults to "Menu")                                                 |
| Footer         | `@components/Footer.astro`                         | temple name, contact address, copyright, the analytics line, and the line about the theme choice kept on the device | `compact?: boolean`                                                                   |
| Skip link      | `@components/SkipLink.astro`                       | a link to the main content that appears when focused                                                                | none                                                                                  |
| Panel          | `@components/Panel.astro`                          | a bordered surface block, optionally titled                                                                         | `title?: string`, `tone?: 'plain' \| 'tint'`, `as?: 'section' \| 'article' \| 'div'`  |
| Callout        | `@components/Callout.astro`                        | a quiet tinted note for an aside or a warning                                                                       | `title?: string`                                                                      |
| Tag            | `@components/Tag.astro`                            | a small label for a category or a day                                                                               | `label: string`                                                                       |
| Figure         | `@components/Figure.astro`                         | an image with a caption                                                                                             | `src: string`, `alt: string`, `caption?: string`, `width?: number`, `height?: number` |
| Video          | `@components/Video.astro`                          | the existing player, restyled to share the caption styling                                                          | `src: string`, `caption?: string`, `poster?: string`                                  |
| PDF link       | `@components/PdfLink.astro`                        | the download button with the file's title, category and description                                                 | `title: string`, `file: string`, `category?: string`, `description?: string`          |
| Long form body | `src/styles/prose.css` applied by a `.prose` class | headings, paragraphs, lists, tables, blockquotes and figures inside a content body                                  | not a component; a class each page applies around rendered content                    |

Sidebar entries come from one config file, `src/config/nav.ts`, which holds an ordered list where each entry says where its address comes from:

- `kind: 'static'` for a route that always exists, such as Home, the two group landings `/services` and `/shabbatonim`, and `/resources`
- `kind: 'page'` for a route built from the `pages` collection, which is where About, History, Visiting and Contact live; the renderer resolves it against the collection and skips it when no file exists
- `kind: 'planned'` for a page whose feature has not landed yet, such as This Week's Torah Portion and Important Dates; the renderer skips it until that feature flips the entry
- The two groups (Weekly Shabbat Services, High Shabbatot) are declared with the service `kind` they list and the landing address they link to, and their entries are read from the services collection, ordered by `order` then title.

The order of the fixed entries is settled here, top to bottom: Home, the two groups with their entries, This Week's Torah Portion, Important Dates, Resources, then the pages collection entries by their `order` value, then Contact.

**Shell structure**: the two service groups are `details` elements at every width, because the reader opens and closes those by choice, and the group holding the current page starts open. The whole menu, which only collapses on a narrow screen, is toggled by a visually hidden checkbox and its label rather than by a `details` element. A `details` that has to be forced open by CSS at wide widths is not dependable, and the current `Header.astro` already sits on that trap with `display: contents`. A checkbox and a label need no JavaScript at all, and the wide screen rule becomes a plain display override that cannot fail.

**Theme switch placement**: the layout renders the switch inside the sidebar region, after the navigation, so `Sidebar.astro` stays a plain navigation landmark and nothing else has to know about the theme.

**Layout additions**: `Layout.astro` gains an optional `robots` prop, which is how the style guide asks to be ignored by search engines without a second layout. Its other arguments stay as they are.

**Hebrew mechanism**: a phrase inside an English sentence is marked `dir="auto"` on a `span`, and a passage is a block marked `lang="he"` with `dir="rtl"`. Both are styled from `prose.css` through `[lang='he']` and `[dir='rtl']`, so no page carries direction rules of its own. A right to left block sets its own alignment, list marker side and quotation mark side.

That shape is what makes the invariant below true: the sidebar can never point at an address that the build did not produce.

**Value sourcing** (every value a page shows traces to one of these, so the build never has to invent one):

| Value produced                                              | Source                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The colour ladder values                                    | Generated once from the temple's colours and committed as literals in `tokens.css`; the base colours come from your inspection of the Google Site theme (Follow-up) |
| The role values in each mode                                | Named steps of the ladders, settled by the contrast test                                                                                                            |
| The colours a page renders                                  | The role tokens only                                                                                                                                                |
| Group labels "Weekly Shabbat Services" and "High Shabbatot" | The temple's own wording on the current site, recorded in this spec                                                                                                 |
| The entries inside each group                               | The `services` collection filtered by `kind`, ordered by `order` then title                                                                                         |
| The fixed menu entries                                      | `src/config/nav.ts`                                                                                                                                                 |
| The page entries (About, History, Visiting, Contact)        | The `pages` collection                                                                                                                                              |
| The marker on the current page                              | `Astro.url.pathname`, with any trailing slash stripped first, compared with each entry's address                                                                    |
| The theme setting                                           | `localStorage['ucoy-theme']`; no key means follow the phone                                                                                                         |
| The theme actually shown                                    | The `data-theme` attribute when present, otherwise the `prefers-color-scheme` media query                                                                           |
| The focus ring colour                                       | The `--color-focus` role                                                                                                                                            |
| The measured stylesheet size                                | The build output, measured with the rest of the bundle                                                                                                              |
| Contrast ratios                                             | Computed in the test from the committed role values                                                                                                                 |
| The Hebrew sample on the style guide page                   | The Hebrew already on the home page, plus one passage the temple supplies before that page is finished                                                              |
| The look of a service body                                  | The `.prose` class plus `prose.css`                                                                                                                                 |
| The style guide address                                     | Decided in this spec: `/style-guide`                                                                                                                                |

**Key invariants**:

- No raw colour, type size, spacing, radius or border literal outside `tokens.css`. The palette repeated in `public/offline.html` is the one allowed exception, and a test guards it.
- Every role name exists in both modes, and every component styles itself from role names only.
- Every role pairing the pages actually render meets AA, enumerated by the contrast test.
- The two dark blocks (media query and explicit attribute) carry identical values.
- The `data-theme` attribute and the stored key always agree, and the stored value is only ever `light` or `dark`.
- The current page marker strips any trailing slash before comparing, so an address the build writes with one still marks itself.
- With JavaScript off, no attribute is set and no switch is rendered.
- The sidebar lists only addresses the build produced.
- One `h1` per page and headings descend in order, with service bodies still starting at `##`.
- Every interactive control is at least 44 by 44 pixels, keyboard operable, and has a visible focus ring.
- The roles in `public/offline.html` match `tokens.css`.

**Security model**:

Every page stays public, with no accounts, no sign in and no personal data, exactly as spec 0001 decided. This feature adds one thing that lives on a member's device: the theme choice, stored under `ucoy-theme` in `localStorage`. It is not personal data, it is never sent anywhere, and it is not a cookie, so the site still sets no cookies at all. Nothing else is stored. The style guide page is public but marked `noindex`, unlinked from the menu, and carries nothing sensitive.

**Configuration required**: none. This feature adds no environment variable, no secret and no third party service. The two names it introduces are the storage key `ucoy-theme` and the route `/style-guide`.

**Critical test scenarios** (each maps to an acceptance criterion in Requirements):

- Happy path: the token layer renders the home page, a weekly service page and the style guide page in both modes, with no raw literal left outside `tokens.css`, verifies **AC-1**, **AC-2**, **AC-7**, **AC-8**
- Failure case: a colour literal typed into a component stylesheet fails the scan test, verifies **AC-1**
- Failure case: a ladder step edited so one role pairing drops below AA fails the contrast test, verifies **AC-3**
- Failure case: the two dark blocks drifting apart fails the mode parity test, verifies **AC-2**, **AC-3**
- Failure case: the palette in `public/offline.html` edited without `tokens.css` fails the drift test, verifies **AC-9**
- Failure case: a role added to a component but missing from one mode fails the role coverage test, verifies **AC-2**
- Edge case: JavaScript disabled. The shell, the menu and both modes still work, and no theme switch appears anywhere, verifies **AC-4**, **AC-5**, **AC-10**
- Edge case: a phone 320 pixels wide. No sideways scrolling, the menu opens from one button, and every control stays at least 44 by 44 pixels, verifies **AC-5**
- Edge case: Hebrew inside an English sentence and a marked right to left passage, each in both modes, verifies **AC-6**
- Edge case: keyboard only. The skip link, both menu groups, the current page marker and the theme switch are each reachable with a visible focus ring, verifies **AC-11**
- Edge case: reduced motion enabled and Windows High Contrast emulated, with no meaning carried by colour alone, verifies **AC-11**
- Edge case: a new service file dropped into `src/content/services/` appears in the right menu group with no code change, verifies **AC-5**
- Edge case: a printed service page keeps the order of service and drops the menu, the footer and the skip link, verifies **AC-5**

## Build plan

The project builds Tracer Bullet: prove one thin path through the whole loop, then thicken it. There is no database here, so the token contract is the model, and it is delivered whole in the first task because every later task reads it. The tests come second, before any page moves, so the rules are enforced while the palette is still placeholder and cheap to change. The thin path is then tokens, plus the home page and one service page inside the new shell; everything after that widens the same thread.

1. Rewrite `src/styles/tokens.css` as the two layer file: the grey ladder and three placeholder hues, each with all eleven steps, the ten roles in light, the same ten in dark through both the media query and the attribute, and the text, spacing and shape families. No page changes yet, satisfies **AC-1**, **AC-2**
2. Add the token tests next to the stylesheet: the literal scan, the contrast pairs, the mode parity, the role coverage, and the offline drift check, and run them against the placeholder palette, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-9**
3. Move the element, form and utility styles in `base.css` onto the role names, add `prose.css` for long form bodies, restyle the player in `Video.astro`, remove the repeated stylesheet imports from every page so the layout is the only importer, and drop the two third party font preconnect links from the layout since spec 0001 serves fonts from this site, satisfies **AC-1**, **AC-2**, **AC-7**, **AC-10**
4. Add the theme mechanism: the small inline script in the head, the `data-theme` attribute, `color-scheme`, and one button cycling System, Light and Dark whose label states the current setting, satisfied with nothing rendered when JavaScript is off, satisfies **AC-4**, **AC-11**
5. Build the shell on the role names: `SkipLink.astro`, `Sidebar.astro` reading `src/config/nav.ts` and the services collection, the reworked `Header.astro` and `Footer.astro`, and the layout that arranges them, including the checkbox toggle for the narrow screen menu, the wide and narrow behaviour, the print rules, and a `theme-color` that follows the canvas role in both modes, satisfies **AC-5**, **AC-7**, **AC-11**
6. Restyle the pages that already exist on the new layer: the home page, the services, Shabbatonim and resources landings, the three detail routes and the `pages` route, each applying `.prose` around rendered content, satisfies **AC-2**, **AC-7**, **AC-10**
7. Build the remaining blocks, each used at least once on a page that already exists: `Panel.astro`, `Callout.astro`, `Tag.astro`, `Figure.astro`, `PdfLink.astro`, satisfies **AC-7**
8. Add Hebrew support: the rule for a Hebrew phrase inside an English sentence, and the right to left block for a passage, covering direction, alignment, list markers and punctuation, satisfies **AC-6**
9. Build `/style-guide` showing every ladder, every role, both modes, every block and the Hebrew samples, marked `noindex` and deliberately absent from `src/config/nav.ts`, satisfies **AC-8**
10. Run the accessibility passes and fix what they find: keyboard only through the shell and every page, reduced motion, Windows High Contrast, and a check that no meaning rests on colour alone, satisfies **AC-11**, **AC-5**
11. Swap the placeholder hues for the temple's real colour values, fix the three hue names in the tokens, and re-run the contrast and parity tests until they pass, satisfies **AC-1**, **AC-3**
12. Measure the built stylesheet and check `package.json` for new dependencies, record the numbers, and confirm the budget in AC-10, satisfies **AC-10**

## Consequences

**Positive**:

- One place holds the whole look, so a colour, a size or a spacing change is one edit and every page follows.
- Dark mode becomes ten role names pointed at different ladder steps, instead of a second hand written palette per page.
- The menu follows the content, so a volunteer adding a service file updates the temple's tree with no code change and nothing forgotten.
- Later features reuse the blocks rather than inventing a look, and the style guide page gives them something to copy from.
- The temple's own colours can later be adjusted, or a re brand carried out, by editing one ladder block.
- The accessibility promise is enforced by a test rather than argued about, so the bar survives busy weeks.

**Negative / tradeoffs**:

- The token names change from the short scaffold names such as `--canvas` and `--ink` to prefixed role names, which touches every existing stylesheet. It is small today and grows with every page built, so it is worth doing now and painful later.
- The ladder values are generated outside the repository once and committed as literals. A re brand means opening a generator again by hand and checking contrast again.
- AA constrains the palette. The very light and very dark ends of each ladder are unusable as text on some surfaces, so the contrast test will reject some appealing combinations rather than record them as acceptable.
- The theme switch adds a small inline script that runs before the first paint and one value stored on the member's device, so the privacy wording gains a sentence and the shell is no longer completely free of scripts.
- A persistent sidebar takes horizontal room from the prose, so the measure is capped and the content column is narrower than a full width layout would allow.
- The two `details` menu groups cannot remember which one was open, because that needs JavaScript. The group holding the current page opens by default and the rest open on demand.
- The palette still lives in two files, the built stylesheet and `public/offline.html`. The test makes drift loud rather than impossible, and scope feature 16 is where the duplication is revisited.
- A public style guide route exists on the built site, small but visible to anyone who guesses the address. It carries nothing sensitive and is marked to be ignored by search engines.
- Two labels in the menu name pages that do not exist yet, so the menu stays a little shorter than the temple's real tree until features 7 and 12 land.

**Neutral**:

- Four ladders arrive, one grey and three temple hues, each with eleven steps, plus black and white: forty six raw values and sixteen role names.
- `Roboto` carries body text and `Oswald` carries display text, configured in `astro.config.mjs` for latin and latin-ext only. Neither face ships a Hebrew subset, so Hebrew falls back to the device's own Hebrew type rather than risk a failed build; a real Hebrew face later changes one font entry and nothing else.
- The icon set is hand built in `src/components/Icon.astro`: sharp outline, fixed stroke width, square caps and joins, `currentColor`, no fill. Nine names ship for the sidebar groups and the narrow screen toggle. No icon package and no icon font, so it clears AC-10 and works offline.
- A menu group's open and close is animated in CSS alone, with no JavaScript. Chrome and Edge glide in both directions; Firefox and Safari cannot interpolate a closing height, so there the group glides open and closes instantly, and reduced motion snaps everywhere. The behaviour is chosen by `@supports`, so an engine that gains the feature later needs no edit.
- The block count settles at ten files in `src/components/` plus one content stylesheet, and form controls still wait for the contact feature that owns them.
- Print, reduced motion and High Contrast carry only the small rules this site needs, inside the same stylesheets.
- Video and PDFs stay out of the offline precache, unchanged from spec 0001.

## Follow-up

- [ ] The ladder values were sampled from screenshots of the current Google Site, so they are close but not exact. An exact colour pick from that site's theme settings should replace them before the palette is called final; the hue names, the ladder shapes and every role stay as they are when it does.
- [x] The three hue names are fixed, in the temple's own vocabulary: `gold` (royal gold), `red` (hebrew red), `blue` (kosher blue). No `--color-<hue>-<step>` ships with a placeholder name.
- [ ] The temple should choose the final accent. `kosher blue` holds it today, because `royal gold` fails AA as link or body text on the light canvas and `hebrew red` is the same risk. Swapping is one line per mode plus a re-run of the contrast test.
- [ ] Hebrew text falls back to the device's Hebrew face, because neither `Roboto` nor `Oswald` ships a Hebrew subset. If the Sabbath evening and Torah portion passages read poorly, add a Hebrew body face; nothing else in the system changes.
- [ ] The menu labels for This Week's Torah Portion (scope feature 7) and Important Dates (scope feature 12) stay marked as planned until those routes exist, then become ordinary entries in `src/config/nav.ts`.
- [ ] Scope slice 2 lists a "Friday morning service page", while the temple's current site lists a Friday evening home ritual and no Friday morning service. The content sweep (scope feature 9) should settle the real list of services; the menu follows the content files, so it needs no change either way.
- [ ] The privacy notice and footer wording need one sentence about the theme choice kept on the device; the temple information feature (scope feature 11) owns that copy.
- [ ] The style guide page must be left out of the sitemap and the search index when those features land (scope features 13 and 15), even though it is built and pre-cached.
- [ ] Revisit the palette duplicated in `public/offline.html` in scope feature 16; today the drift test is the only guard.
- [ ] Root `AGENTS.md` should gain the design system conventions once this feature is built: the two token layers, where the blocks live, the ban on raw values outside `tokens.css`, and the rule that only role names are named by components. These apply to every stylesheet, so the root file is their home.
- [ ] Consider installing a community skill for browser based accessibility testing, an axe or Playwright based one, before the keyboard and contrast passes are repeated on later features; none is installed today.
