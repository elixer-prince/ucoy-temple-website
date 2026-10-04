# 0006. Commentary for every Torah portion, on the computed reading

**Date**: 2026-10-04
**Status**: Accepted

## Summary

The temple teaches its weekly Torah portion from a printed commentary it owns
outright. This decision moves that teaching onto the website, one page per
portion, so a member can read this week's commentary on a phone with no
connection.

The reading itself, meaning the aliyot, the maftir and the Haftarah, keeps
coming from the Hebrew calendar at build time, exactly as spec 0005 recorded.
Only the temple's own prose is written by hand, one file per portion.

Two thirds of a portion's scripture references are already computed, so the hand
written work is the commentary and, optionally, a Gospel reference.

## Context

The congregation keeps Shabbat evening Torah studies that run for hours, so the
teaching behind them is substantial. It currently exists on paper, which means
it is unreachable from a phone, unavailable offline, and cannot be searched.

The engineer examined two sample commentaries and revised an earlier assumption
in doing so. The commentary was expected to be a thorough verse by verse walk
through. It is not. It is organised at section level into Torah, Prophets, and
optionally Gospel, each with an outline, a summary, a commentary, and a closing
thought. This is a fixed template repeated across portions, not free prose, and
it is the shape the temple already knows how to write.

The template has three reference lines at the top: the Torah section to be read,
the Prophets, and the Gospel. Two of those three are exactly what the Hebrew
calendar already computes, being the aliyah range and the Haftarah. Only the
Gospel reference cannot be derived. The congregation does not currently read the
Gospel, though the Rabbi has spoken about starting, so the Gospel section is
designed for but not required, per portion.

Ownership was checked before anything else and is unambiguous: this is the
temple's own writing, so there is no licensing question and no external
dependency. That removes the largest risk the feature could otherwise have
carried.

Writing all 53 commentaries before launch is not realistic. The engineer's
choice is to build the system, write a real handful now, and let the set fill in
over time with an honest notice where a portion has no commentary yet. A member
who lands on a page that silently omitted the commentary would reasonably
conclude there was nothing to say, so the notice is a correctness requirement,
not a placeholder.

Hebrew typography is deliberately not decided here. The site ships no Hebrew
face and relies on the device fallback, which is adequate for a service page but
untested against a full commentary. The engineer will revisit styling across the
style guide once the features are confirmed working.

The reading on a portion page has to belong to some date, and that turned out to
be the hardest part of the design rather than a detail. Seven pairs of portions
are read together in some years and apart in others, so `Matot` has no reading of
its own in a year when `Matot` and `Masei` are read as one. Resolving each
portion from a fixed reference year in which it stands alone makes the citation
the same on every build, so a commentary written against it does not go stale
underneath it. The reference year is a fixed point in the past rather than the
current year, so the pages do not shift under the congregation as time passes.

## Requirements

**User stories**:

- As a member arriving on Friday evening, I want this week's commentary to be one
  tap from the Torah portion page so I can study without a paper sheet.
- As a member on a phone with no connection, I want the commentary to read in
  full so the offline promise holds for the material I actually use.
- As a member who remembers a portion from years ago, I want a stable address for
  it so I can bookmark or share it.
- As the rabbi or teacher, I want the written commentary separated from the
  scripture references so the references never go stale.

**Acceptance criteria**:

- **AC-1**: Every one of the 53 weekly portions has its own page at
  `/portion/<slug>`, where the slug is the portion slug the calendar module
  produces (`bereshit`, `ha-azinu`), and the address is stable across years.
  The count is 53 rather than 54 because the library's list of 54 ends with
  `Vezot Haberakhah`, which is read on Simchat Torah and never as a weekly
  portion. A page for it would promise a reading the Congregation never asks
  anyone to prepare, so it is deliberately not published.
- **AC-2**: The weekly page at `/torah-portion` links to that week's commentary
  page on every Shabbat a weekly portion is read. A festival Shabbat displaces
  the weekly portion, so no commentary page corresponds to that week's reading
  and the weekly page shows the special reading with no commentary link, rather
  than a link to an address that does not exist.
- **AC-3**: A portion with no commentary file renders a clear notice saying the
  commentary has not been written yet, and does not render an empty or partial
  commentary.
- **AC-4**: The Torah section and the Prophets reference on a portion page come
  from the calendar module at build time, not from hand typed text in the
  commentary file, so they cannot drift from the real reading.
- **AC-5**: Each portion page carries the portion name in Hebrew and English, the
  whole portion citation, the seven aliyot and the maftir, and the Haftarah.
- **AC-6**: A commentary body presents the temple's sections in a consistent
  order: Portion Outline, Portion Summary, Commentary for Torah, Commentary for
  Prophets, Thought for the week, Commentary Summary.
- **AC-7**: The Gospel section is optional. A portion with a Gospel reference
  shows it; a portion without shows nothing in its place, with no error and no
  empty heading.
- **AC-8**: The two summaries are presented under names that distinguish them on
  screen, being Portion Summary and Commentary Summary, so a member scrolled to
  the bottom can tell which one they are reading.
- **AC-9**: Hebrew in the outline and commentary is authored using the existing
  `lang="he" dir="rtl"` block for a passage and `dir="auto"` on a span for a
  phrase inside English, and no page carries a direction rule of its own.
- **AC-10**: Every commentary page is reachable offline, and is in the service
  worker precache like other content pages.
- **AC-11**: Every portion page links to the previous and next portion in the
  annual cycle, so a member reading ahead can continue.
- **AC-12**: The temple can add a commentary for a new portion by adding one
  file, with no code change and no edit to any index.

## Options considered

### Option 1: One commentary page per portion, paired to the calendar

Each portion gets its own page, paired to the calendar. The page renders the
computed reading, being the aliyot, the maftir and the Haftarah, and when a
commentary file exists, the temple's prose beneath it. The file's id is the
portion slug, so the pairing needs no table. The weekly page links to the current
portion's page.

**Pros**:

- Stable per portion address, so it can be bookmarked, shared, and indexed later
- Scripture references are computed and cannot go stale
- Adding a portion is adding a file, with no code change
- Each page is small, so the precache cost per page is low
- Matches the paper's section structure, so members recognise it

**Cons**:

- 53 pages eventually, each needing an index or sidebar treatment to stay
  findable
- A member wanting to read the commentary must leave the weekly page
- The temple must keep coming back to add files

### Option 2: The commentary lives on the weekly page

The weekly page renders this week's commentary directly beneath the aliyot.

**Pros**:

- One page to read, nothing to navigate
- No index or finding problem at all
- Simplest possible structure

**Cons**:

- No stable address for a portion, so nothing can be bookmarked or shared, and
  search indexing has nothing to point at
- The commentary only ever exists for the current week, so reading ahead is
  impossible
- The page becomes very long on a phone, mixing computed data and long prose
- Changing one commentary changes the only page, with no independent history

### Option 3: A single long commentary page covering the whole year

One page holding all 53 weekly portions, anchored per portion.

**Pros**:

- One page to build and to precache
- Easy to browse

**Cons**:

- A page large enough to hurt on a phone and in the precache budget
- No stable address per portion
- Every edit rebuilds and re precaches the whole year
- Hard to search later, since search needs discrete targets

## Decision

**Chosen option**: Option 1: One commentary page per portion, paired to the
calendar.

A portion's commentary is a content file at `src/content/portion-notes/<slug>.md`,
whose id is the portion slug. The page at `/portion/<slug>` renders the computed
reading from `src/lib/torah-portion.ts` and then the temple's commentary, and the
weekly page links to it.

The `portionNotes` collection built under spec 0005 is promoted to be the
commentary collection rather than replaced. Its schema is enough, and reusing it
avoids two overlapping systems for the same content.

**Implementation skills**: `astro-framework` (`<owner>/<repo>`, `.agents/skills/astro-framework/`) · `web-perf` (`<owner>/<repo>`, `.agents/skills/web-perf/`)

## Rationale

The forces that decided this were the paper's own shape, the ownership of the
content, and the offline promise, in that order.

The paper's shape pushed hardest. Once the engineer showed that the commentary
is a fixed template repeated across portions rather than free prose, the obvious
design was to encode the template once and let each portion fill it in. Any
design that invented a new structure would mean the temple relearns its own
material in order to publish it.

Ownership removed the risk that would otherwise have dominated. Had this been a
published commentary, the decision would have been about rights and linking, and
the honest answer might have been to link out, which would have broken the
offline promise. Because the temple owns it, the only question left is how to
present it well.

The offline promise is why scripture references are computed rather than typed.
A commentary is long lived and gets revised, and a hand typed citation inside a
long document is exactly the thing that silently goes stale. Deriving the aliyah
range and the Haftarah means the part most likely to rot is the part the build
owns. The Gospel reference has no such source, which is precisely why it is
authored, and precisely why it is optional.

Permanent addresses were chosen over a single rolling page because a member who
remembers a portion from years ago has no other way to find it again. That
advantage is invisible until someone needs it, and then it is the whole
feature.

## Feature design

### Data model

One collection, `portionNotes`, extended from spec 0005:

| Field         | Type                 | Required | Meaning                                                                                  |
| ------------- | -------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `title`       | string               | yes      | The portion's title, used as the page heading                                            |
| `description` | string, max 160      | no       | One line summary, used for the page meta description                                     |
| `order`       | non negative integer | no       | Listing order where several exist; defaults to 0                                         |
| `gospel`      | string               | no       | Gospel reference, such as `John 1:1-14`. Absent means the Gospel section is not rendered |
| `gospelTitle` | string               | no       | Heading for the Gospel passage, such as `Gospel` or `John 1`                             |

File identity is the load bearing part: the file id **is** the portion slug.
`bereshit.md` serves `Bereshit`, and `matot.md` serves `Matot`. No mapping table
exists, so there is nothing to keep in step and no way for a renamed file to
break the link. A doubled week has no file of its own, because it has no page
either: the weekly page links to the first portion of the pair.

`gospel` and `gospelTitle` are the only new fields. Everything else about a
portion, being the Hebrew name, the English name, the whole portion citation, the
aliyot, the maftir, the Haftarah and the Hebrew date, is computed, so it cannot
be stored and cannot be wrong.

A commentary body is markdown with the temple's sections as `##` headings:

```markdown
## Portion Outline

## Portion Summary

## Commentary: Torah

## Commentary: Prophets

## Commentary: Gospel

## Thought for the week

## Commentary Summary
```

Headings are enforced by a test, not by the schema, so an authoring slip fails
the build instead of shipping a page that reads oddly. The Gospel heading is
required if and only if `gospel` is present.

### Value sourcing

Every value a page displays, and where it comes from:

| Value                                            | Source                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| The 53 weekly portions and their slugs           | `parshiot` cut at the last weekly portion, in `portion-cycle.ts`                                            |
| Position in the annual cycle                     | Index in that list, counting from zero                                                                      |
| Portion name, English                            | `Sedra` via `getWeeklyPortion`                                                                              |
| Portion name, Hebrew with vowel points           | `getLeyningOnDate` name, never hand typed                                                                   |
| Whole portion citation                           | `getLeyningOnDate` summary                                                                                  |
| Aliyot 1 to 7 and the maftir                     | `getLeyningOnDate` fullkriyah                                                                               |
| Haftarah citation and reference                  | `getLeyningOnDate` haft and haftara                                                                         |
| Reason a passage differs, such as Machar Chodesh | `getLeyningOnDate` reason                                                                                   |
| Hebrew date of the Shabbat, both scripts         | `HebrewDateEvent`                                                                                           |
| Which week it is                                 | `SITE_CONFIG.calendarTimezone`, temple local date                                                           |
| Reading schedule, Diaspora                       | `il = false` in `getSedra`                                                                                  |
| The date a portion page shows, and its year      | A fixed reference year in which that portion stands alone, found by searching forward from Hebrew year 5780 |
| Gospel reference                                 | `portionNotes` front matter `gospel`, authored, optional                                                    |
| Commentary prose                                 | `portionNotes` file body, authored                                                                          |
| Page description                                 | `description` front matter, falling back to the computed citation                                           |
| Previous and next portion                        | Slug order in the annual cycle, resolved through `Sedra`                                                    |

A portion page's reading has to come from some date, and no date belongs to a
portion forever. Seven pairs of portions are read together in some years and
apart in others, so `Matot` has no reading of its own in a year when `Matot` and
`Masei` are read together. Resolving each portion from a fixed reference year in
which it stands alone, rather than from an arbitrary or current year, is what
makes the citation the same on every build and stops the citation drifting under
a commentary that was written against it.

No displayed value has an unnamed source. The only authored reference is the
Gospel, and it is optional and labelled as the temple's own choice.

### Routes

- `/portion/[slug]`: one page per weekly portion, generated from the calendar
  cycle rather than from the collection, so all 53 addresses exist from the first
  build and a new commentary file fills one in with no code change and no edit to
  any index.
- `/torah-portion`: unchanged in role. It gains a link to this week's commentary
  page and keeps the computed reading it already shows. On a festival Shabbat no
  portion is read, so there is no commentary page to link to and the link is
  omitted rather than pointed at an address that would 404.

### Page design

Sections, in order, for `/portion/<slug>`:

1. Title: the portion name in Hebrew and English, with the whole portion citation
2. Byline: where this portion sits in the annual cycle, and the date whose reading
   the page shows, with its Hebrew date and the reference year stated plainly, so a
   member comparing the page with the scroll in front of them knows it is not this
   week's scroll
3. **The reading**, computed: the aliyah table, the maftir, the Haftarah, and any
   differing passage reasons. It is not titled "this week's reading" because it is
   not this week's: each page shows its portion's own reading as it was set in a
   fixed reference year, so naming it so would invite a member to compare it with
   the scroll in front of them and find a difference.
4. **The outline**, the three reference lines: Torah and Prophets filled from the
   computed values, never from the file, and the whole Gospel line absent when the
   file carries no `gospel`
5. **Commentary**, authored: the temple's sections in the paper's order
6. **Thought for the week**, authored: called out so it reads as the takeaway
7. **Commentary Summary**, authored: the closing summary, visually distinguished
   from the Portion Summary so a scrolled reader is not confused
8. Previous and next portion links

When no commentary file exists, sections 1 to 3 render in full, followed by a
notice that the commentary for this portion has not been written yet. The notice
names the portion, so the page is still useful as a reading reference.

Direction stays where spec 0004 put it: `src/styles/prose.css` owns it, and no
page or style block carries a direction rule. Every colour, type and space value
is a token role from `src/styles/tokens.css`, and the literal scan in
`npm run test` guards this.

### Data integrity

- A commentary file whose id is not a real portion slug fails a test. A typo
  would otherwise publish prose that no page ever renders, silently invisible.
- A commentary file missing a required heading fails a test.
- A file with `gospel` but no `gospelTitle` fails a test, so the section never
  renders with an empty heading.
- No test hard codes a portion's scripture citation, because those are computed.
  Tests assert the wiring and the computed shape, never a value the build
  derives.

### Critical test scenarios

- **AC-1, AC-12**: add `noach.md` to the collection, rebuild, and
  `/portion/noach` fills in with that commentary, with no code change. Removing
  the file leaves the page standing with the unwritten notice, because the
  address comes from the calendar cycle and not from the collection. That is
  deliberate and required by AC-3: an address a member bookmarked must not
  disappear when a file is renamed, and the notice needs a page to sit on.
- **AC-3**: request a portion with no file; a notice naming the portion renders,
  and no commentary section renders.
- **AC-4**: a commentary file containing a wrong aliyah citation renders the
  computed citation anyway, because the file cannot supply one.
- **AC-7**: a portion with `gospel` set shows the Gospel section; a portion
  without it shows no Gospel heading and no empty gap.
- **AC-8**: the two summaries render under distinguishable headings.
- **AC-2, AC-9**: build on an ordinary Shabbat; the weekly page shows a
  commentary link that lands on a page that exists, and the Hebrew on the
  portion page is right to left with no page level direction rule. Build on a
  festival Shabbat; the weekly page shows the special reading and no commentary
  link, because no portion is read that day.
- **AC-10**: the built `sw-manifest.json` lists each portion page.
- **AC-11**: the last portion in the cycle wraps to the first rather than
  rendering a dead end.

## Build plan

Ordered so each step is verifiable, following the project's Tracer Bullet
approach: prove the whole path with one real portion, then thicken.

1. Promote `portionNotes` to the commentary collection: add `gospel` and
   `gospelTitle` to the schema, and move the existing sample note onto the
   section template. (AC-6, AC-7)
2. Build `/portion/[slug]` for every weekly portion, generating the paths from the
   calendar cycle rather than from the collection, rendering the computed reading
   (AC-1, AC-5) and the commentary body in the temple's section order (AC-6).
3. Add the outline section, sourcing Torah and Prophets from the computed values
   and Gospel from front matter, absent when absent (AC-4, AC-7).
4. Render the unwritten notice when no file exists for a portion (AC-3).
5. Link this week's commentary page from `/torah-portion` on every Shabbat a
   weekly portion is read, omitted on a festival Shabbat where no portion is read
   (AC-2).
6. Add previous and next portion links, wrapping at the ends of the cycle (AC-11).
7. Distinguish the two summaries on screen and call out the Thought for the week
   (AC-8).
8. Tests: slug validity, required headings, Gospel pairing, the notice, the
   weekly link, precache listing, and Hebrew direction owned by prose.css
   (AC-1 through AC-12).
9. Write a real handful of commentaries to prove the template on content the
   temple actually uses, starting with portions read in the coming weeks (AC-6).

## Consequences

- The temple gains a permanent, shareable, offline address for every portion it
  writes about. Search indexing can point at those addresses later.
- The scripture references can never be wrong. That is the main reliability gain.
- 53 commentary files exist eventually, paired one to one with the 53 pages. The
  collection, not a hand maintained list, is what keeps them findable.
- A portion with no commentary is visible as unfinished, by design. That is
  honest, and it doubles as the temple's own work list.
- The Gospel section stays empty until the Rabbi supplies references. The schema
  is ready for it, so adopting it later is adding front matter, not new code.
- Hebrew rendering is unchanged and still undecided. The commentary pages are the
  evidence scope feature 23 needs, and this spec records that so the decision is
  not lost. Typography is deliberately out of scope here at the engineer's
  direction.
- The weekly page is correct for the week of the build. Rebuild cadence remains
  open and belongs with the Holy Days calendar, which is scope feature 12.

## Follow-up

- The Gospel section needs the Rabbi's references before it will render. Until
  then the front matter is ready and unused. Not a separate feature.
- A commentary index page listing all 53, useful once more than a handful exist.
  Deliberately not built now: with a few portions written, the sidebar and the
  previous and next links are enough, and an index of mostly empty pages would be
  worse than none.
- Site search, which is scope feature 13, becomes far more valuable once 53
  commentary pages exist, since that is the point at which finding a passage by
  topic becomes possible.
- Hebrew body face, which is scope feature 23, is now clearly answerable, because
  real commentary in Hebrew exists to judge it against.
- Rebuild cadence, which carries the weekly page forward. Belongs with scope
  feature 12.

## References

- Spec 0005, build time Torah portion for the weekly reading page, which this
  spec supersedes
- Spec 0003, content model, which owns the collection conventions used here
- Spec 0004, design system, which owns the token roles and Hebrew direction
- Scope feature 23, Hebrew body face, the styling decision deliberately deferred
