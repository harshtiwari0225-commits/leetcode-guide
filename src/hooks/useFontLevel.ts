import { useCallback, useEffect, useState } from 'react';
import { getFontLevel, setFontLevel } from '@/services/storage';

/**
 * Discrete font-size levels. Applied to the panel body via CSS `zoom`,
 * which scales text + spacing + buttons proportionally (cheap, no
 * refactor of arbitrary [10px]/[11px] Tailwind values needed).
 */
export const FONT_LEVELS = [0.88, 1.0, 1.13, 1.28, 1.45] as const;
export const MIN_LEVEL = 0;
export const MAX_LEVEL = FONT_LEVELS.length - 1; // 4
export const DEFAULT_LEVEL = 1; // 1.0× zoom — same as before this feature

interface UseFontLevelResult {
  level: number;
  zoom: number;
  bumpUp: () => void;
  bumpDown: () => void;
  canBumpUp: boolean;
  canBumpDown: boolean;
}

const clamp = (n: number) => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, n));

export const useFontLevel = (): UseFontLevelResult => {
  const [level, setLevel] = useState<number>(DEFAULT_LEVEL);

  // Load persisted level once.
  useEffect(() => {
    let cancelled = false;
    void getFontLevel().then((saved) => {
      if (cancelled || saved === null) return;
      setLevel(clamp(saved));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bumpUp = useCallback(() => {
    setLevel((cur) => {
      const next = clamp(cur + 1);
      if (next !== cur) void setFontLevel(next);
      return next;
    });
  }, []);

  const bumpDown = useCallback(() => {
    setLevel((cur) => {
      const next = clamp(cur - 1);
      if (next !== cur) void setFontLevel(next);
      return next;
    });
  }, []);

  return {
    level,
    zoom: FONT_LEVELS[level],
    bumpUp,
    bumpDown,
    canBumpUp: level < MAX_LEVEL,
    canBumpDown: level > MIN_LEVEL,
  };
};