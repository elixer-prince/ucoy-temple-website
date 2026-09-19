# Tool discovery cache: Astro

**Date**: 2026-09-17
**Tool**: Astro 7 (static site framework, chosen in spec 0001)

## Agent Skills

| Skill                  | Repo                              | Registry installs | Decision                                                 |
| ---------------------- | --------------------------------- | ----------------- | -------------------------------------------------------- |
| `astro-framework`      | `delineas/astro-framework-agents` | 2K                | **Installed** to `.agents/skills/astro-framework/`       |
| `astro`                | `astrolicious/agent-skills`       | 15.3K             | Declined, a lighter duplicate of the framework reference |
| `clerk-astro-patterns` | `clerk/skills`                    | 12.4K             | Declined, sign in patterns and this site has no logins   |

Not relevant, filtered out: skills under `astronomer/agents` whose names mention astro, because Astronomer calls its managed data platform Astro and those skills concern data pipelines, not the web framework.

The companion skill `learning-astro` in the `delineas/astro-framework-agents` repo is a beginner tutorial, so it was not installed.

## MCP servers

| Server                  | Endpoint                           | Decision                                                                                                                   |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Astro documentation MCP | `https://mcp.docs.astro.build/mcp` | Offered, engineer chose to connect it. Official, streamable HTTP, documented in the Astro guide on building with AI tools. |

## Notes

Install command used: `npx -y skills add delineas/astro-framework-agents --skill astro-framework -y`. The path form `delineas/astro-framework-agents/astro-framework` fails with "No valid skills found", so scope with `--skill` instead.
