# Tool discovery cache: Cloudflare

**Date**: 2026-09-17
**Tool**: Cloudflare Pages and Cloudflare Web Analytics (chosen in spec 0001)

## Agent Skills

All from the official `cloudflare/skills` repository (Apache 2.0, 2.9k stars, maintained by Cloudflare).

| Skill | Registry installs | Decision |
|---|---|---|
| `wrangler` | 89.6K | **Installed** to `.agents/skills/wrangler/` |
| `web-perf` | 75.2K | **Installed** to `.agents/skills/web-perf/` |
| `cloudflare` | 92.2K | Declined, product discovery guidance the chosen stack does not need |
| `workers-best-practices` | 82.7K | Declined, no Workers in this stack |
| `agents-sdk` | 72.8K | Declined, no AI agents in this stack |
| `durable-objects` | 75.4K | Declined, no stateful server code |
| `cloudflare-email-service` | 68.2K | Declined, form email is handled by Formspree |
| `turnstile-spin` | 59.5K | Declined for now, revisit if form spam becomes a problem |
| `cloudflare-one` and `cloudflare-one-migrations` | 57.2K, 56.4K | Declined, zero trust networking is out of scope |
| `sandbox-stable`, `sandbox-next`, `sandbox-migrate-to-next`, `sandbox-sdk` | 33.6K to 35.8K | Declined, no code sandbox needed |
| `nextjs-on-cloudflare` | 10.7K | Declined, the framework here is Astro |

## MCP servers

| Server | Endpoint | Decision |
|---|---|---|
| Cloudflare API MCP | `https://mcp.cloudflare.com/mcp` | Offered, engineer chose to record it for deploy time rather than connect now. Official, OAuth, Code Mode. It can read and change the Cloudflare account (Pages, DNS, and analytics among the covered products), so it should be connected only when the site is ready to deploy. |

## Notes

Install command used: `npx -y skills add cloudflare/skills --skill <name> -y`. Adding the repository without `--skill` would install every skill in it, including many unrelated to this stack, so the scope flag matters here.
