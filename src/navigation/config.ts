import { Home, Wallet, History, Settings, LucideIcon } from 'lucide-react';

export type NavId = 'home' | 'portfolio' | 'history' | 'settings';
export type NavPlacement = 'primary' | 'secondary';

export interface NavDestination {
  id: NavId;
  route: string;
  icon: LucideIcon;
  placement: NavPlacement;
}

// The single registry of every real destination that exists today. Primary
// and secondary groups, and any route -> destination lookup (e.g. contextual
// titles), all derive from this one list rather than being hand-duplicated
// per consumer. Monitoring and Decisions are deliberately absent — not even
// as disabled entries — until their real content and data model exist
// (Review Gate A, PART 5 §A.1/§I).
export const ALL_DESTINATIONS: NavDestination[] = [
  { id: 'home', route: '/', icon: Home, placement: 'primary' },
  { id: 'portfolio', route: '/portfolio', icon: Wallet, placement: 'primary' },
  { id: 'history', route: '/history', icon: History, placement: 'secondary' },
  { id: 'settings', route: '/settings', icon: Settings, placement: 'secondary' },
];

export const PRIMARY_DESTINATIONS: NavDestination[] = ALL_DESTINATIONS.filter((d) => d.placement === 'primary');

// Reachable via the avatar entry point (Settings) or a secondary link from
// Portfolio (History) — never an equal-weight rail/tab item in this slice.
export const SECONDARY_DESTINATIONS: NavDestination[] = ALL_DESTINATIONS.filter((d) => d.placement === 'secondary');

/**
 * Exact-route lookup against the full registry. Returns null for any path
 * that isn't a real destination — callers must not fall back to Home for an
 * unmatched route.
 */
export function getDestinationByRoute(pathname: string): NavDestination | null {
  return ALL_DESTINATIONS.find((d) => d.route === pathname) ?? null;
}
