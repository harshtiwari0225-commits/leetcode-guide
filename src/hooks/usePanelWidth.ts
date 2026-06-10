import { useCallback, useEffect, useRef, useState } from 'react';
import { getPanelWidth, setPanelWidth } from '@/services/storage';

export const DEFAULT_PANEL_WIDTH = 340;
export const MIN_PANEL_WIDTH = 280;
export const MAX_PANEL_WIDTH = 600;

const clamp = (px: number) =>
  Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, px));

interface UsePanelWidthResult {
  width: number;
  isDragging: boolean;
  /** Attach to the resize handle's onMouseDown. */
  startDrag: (e: React.MouseEvent | MouseEvent) => void;
  /** Snap back to DEFAULT_PANEL_WIDTH (double-click on the handle). */
  reset: () => void;
}

/**
 * Panel width state + drag-to-resize behaviour.
 *
 * The `isLeft` flag inverts drag direction so "drag the handle away from
 * the panel's near edge = widens" always feels natural — regardless of
 * which side of the viewport the panel is on.
 */
export const usePanelWidth = (isLeft = false): UsePanelWidthResult => {
  const [width, setWidth] = useState<number>(DEFAULT_PANEL_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Keep a live ref to isLeft so the drag handler — captured at mousedown
  // time — sees side changes that happen mid-drag (rare but possible).
  const isLeftRef = useRef(isLeft);
  useEffect(() => {
    isLeftRef.current = isLeft;
  }, [isLeft]);

  useEffect(() => {
    let cancelled = false;
    void getPanelWidth().then((saved) => {
      if (cancelled || saved === null) return;
      setWidth(clamp(saved));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startDrag = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;

    setIsDragging(true);

    const onMove = (ev: MouseEvent) => {
      // RIGHT side: handle on left edge of panel; drag-left widens.
      // LEFT side:  handle on right edge of panel; drag-right widens.
      const delta = isLeftRef.current
        ? ev.clientX - startX
        : startX - ev.clientX;
      setWidth(clamp(startWidth + delta));
    };

    const onUp = () => {
      setIsDragging(false);
      void setPanelWidth(widthRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const reset = useCallback(() => {
    setWidth(DEFAULT_PANEL_WIDTH);
    void setPanelWidth(DEFAULT_PANEL_WIDTH);
  }, []);

  return { width, isDragging, startDrag, reset };
};