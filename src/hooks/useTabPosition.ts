import { useCallback, useEffect, useRef, useState } from 'react';
import { getTabTop, setTabTop } from '@/services/storage';

export const DEFAULT_TAB_TOP = 24;        // px from the top of the panel wrapper
export const MIN_TAB_TOP = 0;
const TAB_HEIGHT_PX = 65;
const PANEL_TOP_OFFSET = 64;              // wrapper sits 64px below viewport top

/**
 * Vertical position of the side-panel hook (the green ▶/◀ tab).
 * - Long-press (150 ms hold) or move ≥4px then drag to move it.
 * - Quick clicks still toggle the panel (handled by the button itself).
 * - Double-click resets to DEFAULT_TAB_TOP.
 * - Position persisted to chrome.storage.
 */

interface UseTabPositionResult {
  top: number;
  isDragging: boolean;
  startMaybeDrag: (e: React.MouseEvent) => void;
  reset: () => void;
}

const clamp = (px: number): number => {
  const maxFromBottom =
    typeof window !== 'undefined'
      ? Math.max(MIN_TAB_TOP, window.innerHeight - PANEL_TOP_OFFSET - TAB_HEIGHT_PX - 8)
      : 600;
  return Math.max(MIN_TAB_TOP, Math.min(maxFromBottom, px));
};

const LONG_PRESS_MS = 150;
const DRAG_THRESHOLD_PX = 4;

export const useTabPosition = (): UseTabPositionResult => {
  const [top, setTop] = useState<number>(DEFAULT_TAB_TOP);
  const [isDragging, setIsDragging] = useState(false);

  const topRef = useRef(top);
  useEffect(() => {
    topRef.current = top;
  }, [top]);

  useEffect(() => {
    let cancelled = false;
    void getTabTop().then((saved) => {
      if (cancelled || saved === null) return;
      setTop(clamp(saved));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startMaybeDrag = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const startY = e.clientY;
    const startTop = topRef.current;
    let longPressFired = false;
    let dragStarted = false;

    const longPressTimer = window.setTimeout(() => {
      longPressFired = true;
      setIsDragging(true);
      document.body.style.cursor = 'ns-resize';
    }, LONG_PRESS_MS);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      if (!dragStarted && (longPressFired || Math.abs(delta) > DRAG_THRESHOLD_PX)) {
        dragStarted = true;
        window.clearTimeout(longPressTimer);
        setIsDragging(true);
        document.body.style.cursor = 'ns-resize';
      }
      if (dragStarted) {
        setTop(clamp(startTop + delta));
      }
    };

    const onUp = () => {
      window.clearTimeout(longPressTimer);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      if (dragStarted) {
        setIsDragging(false);
        void setTabTop(topRef.current);
        // Swallow the click event that would otherwise toggle the panel —
        // user was dragging, didn't mean to click.
        const swallow = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener('click', swallow, true);
        };
        window.addEventListener('click', swallow, true);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const reset = useCallback(() => {
    setTop(DEFAULT_TAB_TOP);
    void setTabTop(DEFAULT_TAB_TOP);
  }, []);

  return { top, isDragging, startMaybeDrag, reset };
};