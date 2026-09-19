# 0001. Adopt a static site stack for the temple website

**Date**: 2026-09-17
**Status**: Accepted

## Summary

This decision sets the technology for the temple website. Pages are written with Astro, kept as text files in the project, and published free of charge on Cloudflare Pages. Upcoming events come from the Google Calendar that staff already keep current, and the contact form sends messages straight to the temple email address. There is no database, no sign in, and no server to keep patched.

## Context

The temple is a small family organization that wants a public presence online and expects to grow over time. The people who will maintain the site are comfortable with git and with reading code, so page content can live in the repository where every change is reviewable and reversible. That one fact removes the need for a database, an admin panel, and user accounts, along with the security work that comes with all three.

Money and upkeep are real constraints. There is no budget for hosting and no one on hand to act as a systems administrator, so the running cost must stay at or near zero and the site must not need regular patching. Free tiers therefore have to be genuinely free for a modest public site, and their commercial use rules matter, because a temple may invite donations and should not depend on a plan reserved for personal projects.

Some content changes far more often than the rest. Events and announcements turn over month by month, and the person who knows about a change is not always the person who edits the repository. If every event required a commit, the events list would drift out of date. Announcements and pages are a good fit for git, but the events list needs a route that someone can update without touching the repository at all.

The audience shapes the quality bar. Visitors include older members of the community reading on a phone, often on a slow connection, looking for service times, directions, and how to make contact. Pages must therefore be small, legible, and usable without JavaScript. Leaving this undecided would mean the build starts without an agreed platform, and each piece of work would pick its own tools.

## Requirements

**User stories**:

- As a temple volunteer who edits the repository, I want to add or correct page content with an ordinary commit so that changes are reviewable and reversible.
- As a visitor, I want to see current upcoming events and announcements so that I know when to visit.
- As a visitor on a phone, I want pages to load quickly and read clearly so that I can find service times and directions.
- As the temple contact, I want messages from the contact form to reach our email so that we can reply.
- As the person who looks after the site, I want no servers, databases, or updates to manage so that upkeep stays close to zero.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: All page content (about, history, visiting, contact) exists as text files inside the repository, so every content change is a commit, and no database or content API is present.
- **AC-2**: The upcoming events shown on the site come from the temple's Google Calendar, read in the temple's local timezone in an agenda view, and staff add, change, or cancel an event only in Google Calendar, with no redeploy and no repository change.
- **AC-3**: The site has no accounts, no sign in, no cookies, and no tracking or analytics beyond the cookieless Cloudflare Web Analytics named in this spec; the only personal data the site collects is what a visitor types into the contact form, which is delivered to the contact address held in one site config value that the temple supplies, and the host's short lived request logs are the only other record that a visit happened.
- **AC-4**: A commit to the main branch of the project repository on GitHub builds and publishes the site automatically through Cloudflare Pages, with no manual upload step.
- **AC-5**: Pages are served as static HTML that stays readable with JavaScript switched off, apart from the calendar embed and the contact form, and each page stays legible on a small screen, meaning AA contrast, body text of at least 16 pixels, and no sideways scrolling from 320 pixels wide.
- **AC-7**: A page a visitor has opened once is reachable with no connection: it and its Hebrew text and local video load and play in airplane mode, with a service worker precaching the static shell and pages while video plays from local hosting without being precached.
- **AC-6**: Announcements exist as files in the repository beside the pages, and the home page lists them newest first.

## Options considered

### Option 1: Astro on Cloudflare Pages

Astro builds a static site from files in the repository, so pages come out as plain HTML with no client side framework by default. Events come from an embedded Google Calendar, the contact form posts to Formspree, styling is hand written CSS, and Cloudflare Pages serves the result free of charge.

**Pros**:

- No database, no server, and no sign in, so there is nothing to patch and no running cost
- Pages ship almost no JavaScript, which keeps them fast for visitors on slow connections
- Content lives in git, so every change is reviewable and reversible
- The free hosting plan has no bandwidth ceiling for static assets, so a busy week costs nothing

**Cons**:

- Page edits need someone comfortable with git and Markdown
- The events list depends on a third party embed
- Astro releases major versions often enough to need periodic upgrades

### Option 2: Next.js on Vercel

A React framework that can render pages ahead of time and deploy them to Vercel. The editing model would be similar to Option 1, but the runtime and the hosting terms differ.

**Pros**:

- Very large ecosystem and a familiar model for anyone who knows React
- Review previews for every change, generated by the host

**Cons**:

- The free Hobby plan is reserved for personal, non commercial use, which a temple that may invite donations cannot rely on
- Ships a React runtime to render pages that are mostly text
- More moving parts, such as image optimisation and cache rules, for someone to understand

### Option 3: WordPress on shared hosting

A database backed content management system on a paid host, with plugins for forms and events. This is the conventional answer for a site edited by volunteers who do not read code.

**Pros**:

- Editors change pages in a browser with no git involved
- Plugins cover forms, events, and almost anything else the temple wants later
- Widely understood, so finding help is easy

**Cons**:

- Needs a database, paid hosting, and continuous security patching
- Plugin updates become someone's ongoing job, and lapses in that job are how sites like these get compromised
- Far more system than the site needs, and the events problem it solves is already solved by the calendar

### Option 4: Hand written HTML on GitHub Pages

No build step at all: each page is an HTML file served straight from a repository.

**Pros**:

- Nothing to install, nothing to learn beyond HTML and CSS
- Free hosting and no build pipeline to maintain

**Cons**:

- No components or content model, so shared markup drifts as pages multiply
- GitHub Pages applies soft usage limits and limits how often a site may be rebuilt
- Events and forms still need a third party, and there is no clean path to a growing set of pages

## Decision

**Chosen option**: Option 1: Astro on Cloudflare Pages

Adopt Astro for a static site whose content lives in the repository, hosted on Cloudflare Pages, with events from an embedded Google Calendar, the contact form handled by Formspree, hand written CSS, and Cloudflare Web Analytics.

**Implementation skills**: `astro-framework` (`delineas/astro-framework-agents`, `.agents/skills/astro-framework/`) · `wrangler` (`cloudflare/skills`, `.agents/skills/wrangler/`) · `web-perf` (`cloudflare/skills`, `.agents/skills/web-perf/`)

## Rationale

The deciding forces are who edits the site and what it costs to keep alive. Because the people who maintain it read code, git is already the natural editing interface, and accepting that removes the database and the admin panel a content management system would bring. WordPress was the only option that would improve editing for a volunteer who avoids code, and no such volunteer exists, so it would buy capability the temple would pay for in hosting fees and patching effort.

Cloudflare Pages fits the cost constraint better than the alternatives. It has no bandwidth ceiling for static assets, so traffic after a festival announcement costs nothing, and its free plan allows far more builds per month than this site will ever use. Vercel was ruled out on its own terms rather than ours, since the Hobby plan is restricted to personal, non commercial use and a temple that invites donations should not rest on that footing.

Astro fits the audience constraint. It ships no client side framework by default, so a page read by an older visitor on a weak connection arrives as HTML and CSS, and the only JavaScript involved is the calendar embed and the form. The need for current events is met by the calendar staff already maintain, which means keeping service times accurate never depends on a commit.

## Proposed stack

| Layer                  | Choice                                                                                                         | Reason                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language               | TypeScript on Node 20 or newer                                                                                 | Astro and its tooling are JavaScript based, and types keep content front matter honest                                                                                                                                                                                                                                                                    |
| Framework              | Astro 7, static output                                                                                         | Ships no client JavaScript by default and reads Markdown and other text files as content                                                                                                                                                                                                                                                                  |
| Content source         | Markdown and text files in the repository                                                                      | Content changes become reviewable commits, with no database to host or back up                                                                                                                                                                                                                                                                            |
| Primary DB             | None                                                                                                           | The site stores no records, so a database would add cost and an upgrade burden for no benefit                                                                                                                                                                                                                                                             |
| Auth                   | None                                                                                                           | Nothing on the site is private and no one signs in                                                                                                                                                                                                                                                                                                        |
| Events                 | Embedded Google Calendar                                                                                       | Staff already keep the calendar current, so events stay accurate with no redeploy                                                                                                                                                                                                                                                                         |
| Forms                  | Formspree, free plan                                                                                           | A static page can post to it and it forwards the message to email, so no server is needed                                                                                                                                                                                                                                                                 |
| Styling                | Hand written CSS with scoped styles and design tokens                                                          | Avoids a CSS toolchain and keeps shared colours and spacing in one place                                                                                                                                                                                                                                                                                  |
| Hosting                | Cloudflare Pages, free plan                                                                                    | Free hosting with no bandwidth ceiling for static assets, and builds triggered by a push                                                                                                                                                                                                                                                                  |
| Analytics              | Cloudflare Web Analytics                                                                                       | Free page view counts with no cookies and no personal data                                                                                                                                                                                                                                                                                                |
| Background jobs        | None                                                                                                           | Nothing needs to run on a schedule                                                                                                                                                                                                                                                                                                                        |
| File storage           | Local files alongside content in the repository                                                                | Small images and short videos kept with the content; the service worker precaches the shell and pages but not video, so offline playback needs a prior online load; revisit for Cloudflare R2 or Stream if media grows                                                                                                                                    |
| Service worker         | Hand written `sw.js` in `public/`, served at the site root                                                     | Scope requires pages reachable in airplane mode (AC-7). The Astro PWA wrappers are not viable on Astro 7, since `@vite-pwa/astro` stops at Astro 5 and `@serwist/astro` is preview only, so a small hand written worker keeps the current framework with no unsupported dependency; scope features 5 and 16 build the offline behaviour on this mechanism |
| Offline cache strategy | Pre-cache the shell, pages, Hebrew fonts, and CSS; network-first for video; stale-while-revalidate for content | Keeps the precache small while letting video play from local hosting                                                                                                                                                                                                                                                                                      |

Layers a fuller stack would carry, such as a CDN cache, a search index, and a job queue, are absent (the service worker above is the only caching layer) because the site has no server side work to do.

## Consequences

- Page content changes require a commit, so the temple must keep at least one person comfortable with git and Markdown. Editing stays closed to everyone else.
- The events list depends on a third party embed. If Google Calendar is unavailable, blocked in a visitor's region, or changes how it embeds, the events list breaks on the site. Keep the next one or two events written into an announcement as a fallback.
- The contact form depends on Formspree, whose free plan allows about fifty submissions a month as read during the landscape scan, and any public form attracts spam. Both the cap and spam protection must be handled deliberately.
- Cloudflare Web Analytics and Formspree are external services, so the privacy notice must name them and say what they do and do not collect.
- Astro releases major versions frequently. Expect an upgrade roughly once a year to stay on a supported release, following the upgrade guide rather than guessing at changed APIs.
- What is gained in return is a site with no database, no sign in, and no server, so there is no patch treadmill and effectively no running cost.
- Constraint: every page must render and read correctly with JavaScript switched off. Only the calendar embed and the contact form may depend on it.
- Constraint: no cookies and no third party analytics, so nothing that tracks a visitor may be added later without revisiting this spec. The host still keeps short lived request logs to serve the site, and the privacy notice should say so rather than claiming that nothing is recorded anywhere.
- Constraint: the site is single language. No internationalisation layer is added until a second language is genuinely needed.
- The static build is wired to work offline through a service worker, but that is not free forever: every deploy invalidates the precache, so a content change must also ship for stale returning visitors to get fresh pages; scope feature 16 owns the update strategy, and this spec commits only to the Workbox-based precache mechanism.

## References

- Astro documentation, including the guide to building Astro sites with AI tools, which documents the documentation server and the background dev server: https://docs.astro.build
- Astro documentation, building with AI tools (read during discovery): https://docs.astro.build/en/guides/build-with-ai/
- Astro deployment guide for Cloudflare, which covers the static build this site uses as well as the adapter, and that adapter is only needed for server rendering: https://docs.astro.build/en/guides/deploy/cloudflare/
- Cloudflare Pages documentation, read during the landscape scan for free plan limits, including the absence of a bandwidth ceiling for static assets: https://developers.cloudflare.com/pages/
- Cloudflare Web Analytics documentation: https://developers.cloudflare.com/web-analytics/
- Formspree pricing, read during the landscape scan for the free plan submission cap: https://formspree.io/pricing/
- Netlify Forms documentation, considered while comparing form handling options: https://docs.netlify.com/manage/forms/setup/
- Vercel plan limits, read during the landscape scan when ruling the Hobby plan out: https://vercel.com/docs/limits
- Google Calendar help on embedding a calendar, cited by name only because the article has moved since the scan
- GitHub Pages usage limits, cited by name only because the page has moved since the scan
- Skills registry entries for the installed skills: https://skills.sh/cloudflare/skills/wrangler and https://skills.sh/cloudflare/skills/web-perf
- `cloudflare/skills`, the official Cloudflare Agent Skills repository: https://github.com/cloudflare/skills
- `delineas/astro-framework-agents`, the Astro Agent Skills repository: https://github.com/delineas/astro-framework-agents

## Follow-up

- Before the build, three values must come from the temple: the contact email address for form messages, the Google Calendar to embed, and whether a domain name is already owned and where its DNS is managed.
- Connect the Astro documentation server at `https://mcp.docs.astro.build/mcp` in your MCP settings. Once connected, the agent searches the live Astro documentation, which matters here because content collections, actions, and sessions have all changed across recent major versions.
- Connect the Cloudflare server at `https://mcp.cloudflare.com/mcp` when the site is ready to deploy, so the agent can work with the custom domain, DNS records, and analytics. It can change your Cloudflare account, so grant access only at that point.
- Skills recorded as declined, so they are not offered again: `astrolicious/agent-skills@astro` (a lighter duplicate of the framework reference), `clerk/skills@clerk-astro-patterns` (sign in patterns, and this site has no logins), and the `astronomer/agents` skills whose names mention astro, which belong to Astronomer's managed data platform rather than to the Astro web framework.
- Cloudflare skills left uninstalled on purpose: `cloudflare`, `agents-sdk`, `durable-objects`, `sandbox-stable`, `sandbox-next`, `sandbox-migrate-to-next`, `turnstile-spin`, `cloudflare-email-service`, `cloudflare-one`, `cloudflare-one-migrations`, `nextjs-on-cloudflare`, and `workers-best-practices`.
- Revisit this stack if the temple starts taking payments or needs a private area for members, since either would break the no server and no database assumption the whole decision rests on.
