import { useCallback, useEffect, useState } from 'react';
import {
  analyzeProblem,
  GeminiKeyMissingError,
  GeminiValidationError,
} from '@/services/gemini';
import { cacheAnalysis, getCachedAnalysis } from '@/services/storage';
import type { LeetCodeProblem, ProblemAnalysis } from '@/types';

export type AnalysisStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no-key'
  | 'validation-error'
  | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  analysis: ProblemAnalysis | null;
  error: string | null;
  /** Re-run, bypassing cache. */
  refresh: () => void;
}

export const useProblemAnalysis = (
  problem: LeetCodeProblem | null,
): AnalysisState => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [analysis, setAnalysis] = useState<ProblemAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!problem) {
        if (cancelled) return;
        setStatus('idle');
        setAnalysis(null);
        setError(null);
        return;
      }

      if (cancelled) return;
      setStatus('loading');
      setError(null);

      // 1. Try cache first (unless this is an explicit refresh — nonce>0 forces refetch).
      if (nonce === 0) {
        const cached = await getCachedAnalysis(problem.id);
        if (cached && !cancelled) {
          setAnalysis(cached);
          setStatus('ready');
          return;
        }
      }

      // 2. Hit Gemini.
      try {
        const result = await analyzeProblem(problem);
        if (cancelled) return;
        await cacheAnalysis(result);
        setAnalysis(result);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof GeminiKeyMissingError) {
          setStatus('no-key');
          setError(err.message);
        } else if (err instanceof GeminiValidationError) {
          setStatus('validation-error');
          setError(err.message);
        } else {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [problem, nonce]);

  return { status, analysis, error, refresh };
};