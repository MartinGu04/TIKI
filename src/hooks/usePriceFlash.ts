import { useEffect, useRef, useState } from 'react';

export type FlashDirection = 'up' | 'down' | null;

const FLASH_DURATION_MS = 500;

/**
 * Tracks a numeric value and briefly returns 'up'/'down' right after it
 * changes, then back to null — for a restrained, color-only "just updated"
 * pulse (see .animate-flash-up/-down in index.css). Deliberately not a
 * counting/rolling-digit effect: the number itself never changes visually
 * beyond its own color tint, per the confirmed "no slot-machine" direction.
 */
export function usePriceFlash(value: number): FlashDirection {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState<FlashDirection>(null);

  useEffect(() => {
    if (value === prevRef.current) return;
    const direction: FlashDirection = value > prevRef.current ? 'up' : 'down';
    prevRef.current = value;
    setFlash(direction);
    const id = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => clearTimeout(id);
  }, [value]);

  return flash;
}
