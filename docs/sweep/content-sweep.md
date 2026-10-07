# Content sweep of the current site (scope feature 9)

A page by page pass over the temple's previous Google Site, so nothing the
temple published is lost. This records what was on each page, where it now
lives, and what was intentionally left out with the reason.

The old site was `sites.google.com/view/ucoy`, ten pages in two groups. Every
page is accounted for below.

## What each old page now is

| Old page                   | Old address                                           | Where it is now                                                |
| -------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Home                       | `/home`                                               | `/` — the temple's own "who we are" and "come find us" wording |
| Friday Evening Home Ritual | `/weekly-shabbat-services/friday-evening-home-ritual` | `/services/friday-evening-home-ritual`                         |
| Saturday Morning Service   | `/weekly-shabbat-services/saturday-morning-service`   | `/services/shabbat-morning-service`                            |
| Saturday Afternoon Service | `/weekly-shabbat-services/saturday-afternoon-service` | `/services/saturday-afternoon-service` (**new page**)          |
| Closing of the Shabbat     | `/weekly-shabbat-services/closing-of-the-shabbat`     | `/services/closing-of-shabbat`                                 |
| Yom Teruah                 | `/high-shabbatot/yom-teruah`                          | `/shabbatonim/shabbaton-yom-teruah`                            |
| Yom Kippur                 | `/high-shabbatot/yom-kippur`                          | nothing to carry (see below)                                   |
| Shavuot                    | `/high-shabbatot/shavuot`                             | nothing to carry (see below)                                   |
| This Week's Torah Portion  | `/this-weeks-torah-portion`                           | `/torah-portion`, built better (scope feature 7)               |
| Important Dates            | `/important-dates`                                    | nothing to carry (see below)                                   |

`public/_redirects` sends each old address to its new one, so a member who kept
the old link or a search result still holding it lands on the right page.

## The Saturday afternoon service is new here

The old site listed a Saturday afternoon service under Weekly Shabbat Services,
and the new site had no page for it at all. That gap is the one piece of real
content this sweep found that the new build was missing, and
`src/content/services/saturday-afternoon-service.mdx` now publishes it. Because
the sidebar, the home page and `/services` all build from the `services`
collection, the file alone put it in the menu, with no code change.

It sorts at `order: 2`, between the Shabbat morning service (`order: 1`) and the
closing of Shabbat (now `order: 3`), because that is the order a Shabbat runs in.

## What was intentionally left out, and why

### Yom Kippur and Shavuot pages

Both pages existed on the old site but carried **no content**: a heading and
nothing else, no text and no media. Scope feature 10 has now written both from
the temple's own booklets, supplied as `docs/UCOY Service Booklets.txt`:
`src/content/services/shabbaton-yom-kippur.mdx` carries the Yom Kippur morning
service, and `src/content/services/shabbaton-shavuot.mdx` carries Shavuot and
Confirmation. Their old addresses now redirect in `public/_redirects`.

### Important Dates

The same: the old page was a heading with nothing on it. Scope feature 12 owns
it, and it reads from the temple's Google Calendar rather than from content.

### This Week's Torah Portion

The old page was an embed of an outside service, not the temple's own material.
The new site computes the reading from the Hebrew calendar at build time (scope
feature 7) and gives every one of the 53 portions a page (scope feature 24), so
the old embed is replaced rather than carried.

### The five YouTube embeds

The old service pages embedded five YouTube videos: the two national anthems
(Jamaica and Israel) and the two theme songs (Shabbat Shalom and Hinei Ma Tov)
on the Shabbat morning and Yom Teruah pages, and one video on the Friday evening
home ritual page under Shabbat Rest.

**These were not carried as embeds.** The project's rules are that video is
served from this site and never from a third party, and that the site works on a
phone with no internet. An iframe of YouTube breaks both: it needs a connection
and it hands the viewer's data to a third party.

**What is outstanding, for the temple to supply.** Each of the five needs its
recording placed under `public/videos/` as an `.mp4`, and each service body then
gets a `<Video>` call where the old embed stood. The headings for all five are
already in the bodies, in the order the service runs in, so only the files are
missing. Until the files arrive, no body names a `src` with nothing behind it,
which is the offline promise the test suite already guards.

### Yom Teruah is a second copy of the Shabbat morning order

On the old site the Yom Teruah page was the Shabbat morning order with a Teruah
opening in front of it, and the sweep carried it across that way, because that is
what the temple published. That leaves the same order in two content files, which
is the kind of duplication this project normally avoids.

It is guarded rather than removed, because removing it would drop text the temple
published: `content.files.test.ts` asserts that the two files carry identical
section headings and identical readings, so an edit to one that does not reach the
other fails the suite. **If the temple ever gives Yom Teruah an order of its own,
that is the moment to break the link** and write the page as its own file.

### The prayer booklet PDF

`public/pdfs/prayer-booklet.pdf` is still the sample file that proves the
thread. The temple's real booklet replaces it. The service pages now link it
through its resource page, `/resources/prayer-booklet`, never by its file path,
so swapping the file changes no address.

## What the sweep did not settle

- **The street address.** The old site gave only "the parish of St. Andrew,
  Jamaica" and "the humble community of Waterhouse", with no street address. The
  parish and community are carried into `SITE_CONFIG.location`, the home page,
  the about page and `visiting.md`; the street address is still marked as to be
  provided by the temple rather than guessed. Scope feature 11 (temple
  information and contact) is where it settles.
- **The contact email.** Still the placeholder `contact@ucoy.org` in
  `SITE_CONFIG`. The old site published no address, so there was nothing to
  carry. Feature 11 owns it.
- **Service times.** The old pages published no times at all, only a day for
  each. The Saturday morning 9:30 AM and the Friday evening "before sunset" on
  the new site come from the temple's announcements, not from the old site. The
  Saturday afternoon service has no time, because the old site published none,
  so its row points at "after the morning service" instead of printing a clock
  time that would go stale.
- **The High Shabbatot pages that were empty** are scope feature 10, as above.

## Follow ups for the temple

1. Supply the five recordings (two national anthems, two theme songs, and the
   Shabbat Rest video) as files under `public/videos/`.
2. Supply the real prayer booklet PDF.
3. Supply the street address, so `SITE_CONFIG.location.address` and `visiting.md`
   can carry it.
4. Supply the contact email.
