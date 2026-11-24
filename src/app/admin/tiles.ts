export interface Tile {
  key: string
  label: string
  live: boolean
}

export const TILES: Tile[] = [
  { key: 'overview', label: 'Overview', live: true },
  { key: 'members', label: 'Members', live: true },
  { key: 'events', label: 'Events', live: false },
  { key: 'catalogue', label: 'Catalogue', live: false },
  { key: 'shop', label: 'Shop', live: false },
  { key: 'site-content', label: 'Site content', live: false },
  { key: 'leads', label: 'Leads', live: false },
  { key: 'bestie', label: 'Bestie', live: false },
  { key: 'reports', label: 'Reports', live: false },
  { key: 'team', label: 'Team', live: true },
]
