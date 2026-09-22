/**
 * Fixed menu entries for the sidebar (spec 0004).
 *
 * The services groups and the pages entries are built from content at
 * render time. This file holds only the fixed routes in menu order.
 * Entries marked `planned` point at routes that do not exist yet and
 * render as quiet text until their feature lands.
 *
 * The two service landings (`/services` and `/shabbatonim`) are not
 * listed here: each one is the first entry of its own group, so the
 * sidebar shows it once (spec 0004, menu order).
 */
export interface NavEntry {
  label: string
  href: string
  kind: 'static' | 'planned'
}

/** One content driven menu group: a services `kind`, its label and landing. */
export interface NavGroup {
  /** The `kind` value in the services collection this group lists. */
  kind: 'weekly' | 'shabbaton'
  label: string
  /** The landing address of the area, always built. */
  href: string
  /** Label of the first entry, the link to the landing page. */
  allLabel: string
}

export const NAV_GROUPS: NavGroup[] = [
  {
    kind: 'weekly',
    label: 'Weekly Shabbat Services',
    href: '/services',
    allLabel: 'All services'
  },
  {
    kind: 'shabbaton',
    label: 'High Shabbatot',
    href: '/shabbatonim',
    allLabel: 'All Shabbatot'
  }
]

export const FIXED_NAV_BEFORE_PAGES: NavEntry[] = [
  { label: 'Home', href: '/', kind: 'static' },
  { label: "This Week's Torah Portion", href: '/torah-portion', kind: 'planned' },
  { label: 'Important Dates', href: '/dates', kind: 'planned' },
  { label: 'Resources', href: '/resources', kind: 'static' }
]

export const FIXED_NAV_AFTER_PAGES: NavEntry[] = [
  { label: 'Contact', href: '/contact', kind: 'static' }
]
