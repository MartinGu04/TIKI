import { Home, Wallet, History, Settings, LucideIcon } from 'lucide-react';

export type NavId = 'home' | 'portfolio' | 'history' | 'settings';

export interface NavDestination {
  id: NavId;
  route: string;
  icon: LucideIcon;
}

// Phase 1 lists only the destinations that exist today. Monitoring and
// Decisions are deliberately absent — not even as disabled entries — until
// their real content and data model exist (Review Gate A, PART 5 §A.1/§I).
export const PRIMARY_DESTINATIONS: NavDestination[] = [
  { id: 'home', route: '/', icon: Home },
  { id: 'portfolio', route: '/portfolio', icon: Wallet },
];

// Reachable via the avatar entry point (Settings) or a secondary link from
// Portfolio (History) — never an equal-weight rail/tab item in this slice.
export const SECONDARY_DESTINATIONS: NavDestination[] = [
  { id: 'history', route: '/history', icon: History },
  { id: 'settings', route: '/settings', icon: Settings },
];
