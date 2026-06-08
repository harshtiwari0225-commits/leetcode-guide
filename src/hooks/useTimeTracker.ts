import { useEffect } from 'react';
import { accrueTimeSpent } from '@/services/progress';
import type { LeetCodeProblem } from '@/types';

const FLUSH_INTERVAL_MS = 30_000;

/**
 * Accrues time the user spends on a problem page while the tab is visible.
 * Flushes every 30 s to chrome.storage so a tab close loses ≤30 s.
 */
export const useTimeTracker = (problem: LeetCodeProblem | null): void => {
  useEffect(() => {
    if (!problem) return;

    let segmentStart: number | null =
      document.visibilityState === 'visible' ? Date.now() : null;

    const flush = () => {
      if (segmentStart === null) return;
      const seconds = Math.round((Date.now() - segmentStart) / 1000);
      segmentStart = Date.now();
      if (seconds > 0) void accrueTimeSpent(problem.id, seconds);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (segmentStart === null) segmentStart = Date.now();
      } else {
        flush();
        segmentStart = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(flush, FLUSH_INTERVAL_MS);
    window.addEventListener('beforeunload', flush);

    return () => {
      flush();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', flush);
    };
  }, [problem]);
};