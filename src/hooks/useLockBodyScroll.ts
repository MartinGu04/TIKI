import { useEffect } from 'react';

/**
 * Prevents the page from scrolling behind an open modal/sheet. As a side
 * effect this also avoids a rendering glitch seen when opening a modal while
 * scrolled down on a page with a `position: sticky` + `backdrop-filter`
 * header: some browsers' compositing can let the sticky header's blur layer
 * bleed through a later `position: fixed` overlay mid-scroll. Locking scroll
 * removes the scrolling compositing path entirely.
 */
export function useLockBodyScroll(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [active]);
}
