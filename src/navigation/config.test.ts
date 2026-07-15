import { describe, it, expect } from 'vitest';
import {
  ALL_DESTINATIONS, PRIMARY_DESTINATIONS, SECONDARY_DESTINATIONS, getDestinationByRoute,
} from './config';

describe('navigation/config', () => {
  it('resolves all four current routes to the correct destination', () => {
    expect(getDestinationByRoute('/')?.id).toBe('home');
    expect(getDestinationByRoute('/portfolio')?.id).toBe('portfolio');
    expect(getDestinationByRoute('/history')?.id).toBe('history');
    expect(getDestinationByRoute('/settings')?.id).toBe('settings');
  });

  it('returns null for an unknown route rather than falling back to Home', () => {
    expect(getDestinationByRoute('/monitoring')).toBeNull();
    expect(getDestinationByRoute('/decisions')).toBeNull();
    expect(getDestinationByRoute('/nonexistent')).toBeNull();
    expect(getDestinationByRoute('')).toBeNull();
  });

  it('derives PRIMARY_DESTINATIONS and SECONDARY_DESTINATIONS from the single registry', () => {
    // Every registry entry appears in exactly one of the two derived groups.
    for (const destination of ALL_DESTINATIONS) {
      const inPrimary = PRIMARY_DESTINATIONS.includes(destination);
      const inSecondary = SECONDARY_DESTINATIONS.includes(destination);
      expect(inPrimary !== inSecondary).toBe(true);
    }
    expect(PRIMARY_DESTINATIONS.length + SECONDARY_DESTINATIONS.length).toBe(ALL_DESTINATIONS.length);

    // Every derived group member actually carries the placement it was grouped by.
    expect(PRIMARY_DESTINATIONS.every((d) => d.placement === 'primary')).toBe(true);
    expect(SECONDARY_DESTINATIONS.every((d) => d.placement === 'secondary')).toBe(true);

    expect(PRIMARY_DESTINATIONS.map((d) => d.id)).toEqual(['home', 'portfolio']);
    expect(SECONDARY_DESTINATIONS.map((d) => d.id)).toEqual(['history', 'settings']);
  });
});
