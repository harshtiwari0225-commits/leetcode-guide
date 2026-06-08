import { useCallback, useEffect, useState } from 'react';
import {
  GeminiKeyMissingError,
  GeminiValidationError,
  generateHint,
} from '@/services/gemini';
import { appendHint, getHintSession } from '@/services/storage';
import type {
  Approach,
  Hint,
  HintLevel,
  HintSession,
  LeetCodeProblem,
} from '@/types';

export type HintFetchStatus =
  | 'idle'
  | 'loading'
  | 'no-key'
  | 'validation-error'
  | 'error';

export interface UseHintsResult {
  session: HintSession | null;
  /** Highest level not yet revealed (1..5), or null if all revealed. */
  nextLevel: HintLevel | null;
  fetchStatus: HintFetchStatus;
  error: string | null;
  requestHint: (level: HintLevel) => Promise<void>;
}

const MAX_LEVEL: HintLevel = 5;

const computeNextLevel = (session: HintSession | null): HintLevel | null => {
  if (!session || session.hintsRevealed.length === 0) return 1;
  const top = Math.max(...session.hintsRevealed);
  if (top >= MAX_LEVEL) return null;
  return (top + 1) as HintLevel;
};

export const useHints = (
  problem: LeetCodeProblem | null,
  approach: Approach | null,
): UseHintsResult => {
  const [session, setSession] = useState<HintSession | null>(null);
  const [fetchStatus, setFetchStatus] = useState<HintFetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Load existing session whenever the (problem, approach) pair changes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!problem || !approach) {
        if (!cancelled) {
          setSession(null);
          setFetchStatus('idle');
          setError(null);
        }
        return;
      }
      const existing = await getHintSession(problem.id, approach.id);
      if (!cancelled) {
        setSession(existing);
        setFetchStatus('idle');
        setError(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [problem, approach]);

  const requestHint = useCallback(
    async (level: HintLevel) => {
      if (!problem || !approach) return;
      if (session?.hintsRevealed.includes(level)) return;

      setFetchStatus('loading');
      setError(null);

      const previousHints: Hint[] = (session?.hints ?? []).filter(
        (h) => h.level < level,
      );

      try {
        const hint = await generateHint(problem, approach, level, previousHints);
        const updated = await appendHint(problem.id, approach.id, hint);
        setSession(updated);
        setFetchStatus('idle');
      } catch (err) {
        if (err instanceof GeminiKeyMissingError) {
          setFetchStatus('no-key');
          setError(err.message);
        } else if (err instanceof GeminiValidationError) {
          setFetchStatus('validation-error');
          setError(err.message);
        } else {
          setFetchStatus('error');
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    },
    [problem, approach, session],
  );

  return {
    session,
    nextLevel: computeNextLevel(session),
    fetchStatus,
    error,
    requestHint,
  };
};