// Registers the MCP servers this project needs on the machine you are working on.
//
// Cline reads MCP server definitions from ONE global file, not from the
// repository, so a committed .cline/mcp.json would be ignored. That makes the
// setup awkward to repeat across machines, which is what this script fixes:
// it writes the same entries to the global file every time, so a fresh clone
// on a new laptop is one command rather than a hand edited JSON file.
//
// Run it with: npm run setup:mcp
//
// It merges rather than overwrites, so servers you added by hand for other
// projects survive. Rerunning is safe. Pass --dry-run to see the file it
// would write without touching it.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Where Cline keeps the global MCP settings, shared by the IDE and the CLI. */
const SETTINGS_PATH = join(homedir(), '.cline', 'data', 'settings', 'cline_mcp_settings.json')

/**
 * The servers this project relies on.
 *
 * chrome-devtools drives a real Chrome, which is how the keyboard, narrow
 * screen, reduced motion, High Contrast and both colour mode steps in
 * docs/specs/0004-design-system-ui-foundation/verify.md get exercised. Add the
 * Astro and Cloudflare servers from AGENTS.md here when their time comes.
 */
const SERVERS = {
  'chrome-devtools': {
    command: 'npx',
    // No --headless: a visible window lets you watch the theme switch and the
    // menu yourself while the steps run. Add --headless for a background run.
    // The screenshot width cap keeps large captures from timing out the call.
    args: [
      '-y',
      'chrome-devtools-mcp@latest',
      '--no-usage-statistics',
      '--screenshot-max-width',
      '1280'
    ],
    disabled: false,
    autoApprove: []
  }
}

const dryRun = process.argv.includes('--dry-run')

async function readCurrent() {
  if (!existsSync(SETTINGS_PATH)) return { mcpServers: {} }
  const raw = await readFile(SETTINGS_PATH, 'utf-8')
  try {
    return JSON.parse(raw)
  } catch {
    // A hand broken file is not worth guessing at: keep a copy and start clean
    // so the script always leaves valid JSON behind.
    const backup = `${SETTINGS_PATH}.broken`
    await writeFile(backup, raw, 'utf-8')
    console.warn(`That file was not valid JSON. A copy is at ${backup}`)
    return { mcpServers: {} }
  }
}

const current = await readCurrent()
const existing = current.mcpServers ?? {}
const added = []
const kept = []

for (const name of Object.keys(SERVERS)) {
  if (existing[name]) kept.push(name)
  else added.push(name)
}

// The project's servers win, so a rerun repairs a hand edited entry, but any
// other server in the file is left exactly as it was.
const merged = { ...current, mcpServers: { ...existing, ...SERVERS } }
const output = `${JSON.stringify(merged, null, 2)}\n`

if (dryRun) {
  console.log(`Would write ${SETTINGS_PATH}:`)
  console.log(output)
} else {
  await mkdir(join(homedir(), '.cline', 'data', 'settings'), { recursive: true })
  await writeFile(SETTINGS_PATH, output, 'utf-8')
  console.log(`Wrote ${SETTINGS_PATH}`)
}

if (added.length) console.log(`Added: ${added.join(', ')}`)
if (kept.length) console.log(`Already there: ${kept.join(', ')}`)

if (!dryRun) {
  console.log('Reload the VS Code window (Developer: Reload Window), or restart the')
  console.log('server from the MCP Servers tab, so Cline picks the file up.')
}
