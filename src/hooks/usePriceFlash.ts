import { useEffect, useRef, useState } from 'react';

export type FlashDirection = 'up' | 'down' | null;

const FLASH_DURATION_MS = 500;

/**
 * Tracks a numeric value and briefly returns 'up'/'down' right after it
 * changes, then back to null. Drives both the color flash
 * (.animate-flash-up/-down) and the direction of the rolling-number
 * transition (.animate-roll-up/-down) in index.css, so a live price tick
 * flashes and rolls in the same direction it moved.
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
