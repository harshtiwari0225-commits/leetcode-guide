import { useCallback, useEffect, useRef, useState } from 'react';
import { getPanelHeight, setPanelHeight } from '@/services/storage';

export const MIN_PANEL_HEIGHT = 300;
const DEFAULT_TOP_OFFSET = 64;     // initial gap below viewport top (LeetCode navbar)
const VIEWPORT_PADDING = 16;       // breathing room above the OS taskbar
const FULL_HEIGHT_SENTINEL = 0;    // 0 means "fill remaining viewport from default top"

// Max height = full viewport minus a bit of bottom padding.
// (We intentionally do NOT subtract the navbar — option A — so the user
// can grow the panel up over LeetCode's navbar if they want.)
const maxHeight = (): number => {
  if (typeof window === 'undefined') return 1000;
  return Math.max(MIN_PANEL_HEIGHT, window.innerHeight - VIEWPORT_PADDING);
};

const clamp = (px: number): number =>
  Math.max(MIN_PANEL_HEIGHT, Math.min(maxHeight(), px));

interface UsePanelHeightResult {
  /** Pixel height, or null when in "fill from default top" mode. */
  height: number | null;
  /** CSS height to apply to the wrapper. */
  cssHeight: string;
  /** CSS `top` to apply to the wrapper. Shrinks as height grows so the
   *  panel's BOTTOM stays anchored to the viewport bottom. */
  cssTop: string;
  isDragging: boolean;
  startDrag: (e: React.MouseEvent | MouseEvent) => void;
  reset: () => void;
}

/**
 * Panel height state + drag-from-top resize behaviour.
 *
 * Default = "fill from 64px below viewport top to bottom of viewport".
 * Dragging the top edge upward grows the panel (panel's bottom stays put).
 * Dragging downward shrinks. Double-click resets to fill.
 */
export const usePanelHeight = (): UsePanelHeightResult => {
  const [height, setHeight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const heightRef = useRef<number | null>(height);
  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  useEffect(() => {
    let cancelled = false;
    void getPanelHeight().then((saved) => {
      if (cancelled || saved === null) return;
      if (saved === FULL_HEIGHT_SENTINEL) {
        setHeight(null);
      } else {
        setHeight(clamp(saved));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startDrag = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight =
      heightRef.current ??
      (typeof window !== 'undefined'
        ? window.innerHeight - DEFAULT_TOP_OFFSET
        : MIN_PANEL_HEIGHT);

    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      // Dragging the TOP edge up (negative delta) should GROW the panel.
      const delta = startY - ev.clientY;
      setHeight(clamp(startHeight + delta));
    };

    const onUp = () => {
      setIsDragging(false);
      if (heightRef.current !== null) {
        void setPanelHeight(heightRef.current);
      }
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const reset = useCallback(() => {
    setHeight(null);
    void setPanelHeight(FULL_HEIGHT_SENTINEL);
  }, []);

  // When in fill mode: top sits at default (under navbar), height fills the rest.
  // When at custom height: top shifts up so the BOTTOM stays at the viewport bottom.
  const cssHeight =
    height === null ? `calc(100vh - ${DEFAULT_TOP_OFFSET}px)` : `${height}px`;
  const cssTop =
    height === null
      ? `${DEFAULT_TOP_OFFSET}px`
      : `calc(100vh - ${height}px)`;

  return { height, cssHeight, cssTop, isDragging, startDrag, reset };
};