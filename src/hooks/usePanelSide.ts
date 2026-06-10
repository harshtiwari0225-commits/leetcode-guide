import { useCallback, useEffect, useState } from 'react';
import {
  getPanelSide,
  type PanelSide,
  setPanelSideStored,
} from '@/services/storage';

export const DEFAULT_PANEL_SIDE: PanelSide = 'right';

interface UsePanelSideResult {
  side: PanelSide;
  isLeft: boolean;
  toggle: () => void;
  setSide: (side: PanelSide) => void;
}

/**
 * Which edge of the viewport the panel hugs.
 * - Persisted to chrome.storage.
 * - Defaults to 'right' (the original behaviour).
 */
export const usePanelSide = (): UsePanelSideResult => {
  const [side, setSideState] = useState<PanelSide>(DEFAULT_PANEL_SIDE);

  useEffect(() => {
    let cancelled = false;
    void getPanelSide().then((saved) => {
      if (cancelled || !saved) return;
      setSideState(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSide = useCallback((next: PanelSide) => {
    setSideState(next);
    void setPanelSideStored(next);
  }, []);

  const toggle = useCallback(() => {
    setSideState((cur) => {
      const next: PanelSide = cur === 'right' ? 'left' : 'right';
      void setPanelSideStored(next);
      return next;
    });
  }, []);

  return { side, isLeft: side === 'left', toggle, setSide };
};