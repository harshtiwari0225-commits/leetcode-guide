import { useEffect, useReducer } from 'react';
import { watchForAcceptedSubmission } from '@/services/leetcode';
import { markSolved } from '@/services/progress';
import type { LeetCodeProblem } from '@/types';

interface AcceptedState {
  problemId: string | null;
  accepted: boolean;
}

type AcceptedAction =
  | { type: 'reset'; problemId: string | null }
  | { type: 'accept' };

const reducer = (state: AcceptedState, action: AcceptedAction): AcceptedState => {
  switch (action.type) {
    case 'reset':
      // Reset only when the problem actually changes — avoids re-renders
      // that would re-fire the effect tear-down/setup.
      if (state.problemId === action.problemId) return state;
      return { problemId: action.problemId, accepted: false };
    case 'accept':
      if (state.accepted) return state;
      return { ...state, accepted: true };
  }
};

/**
 * Returns `true` once an Accepted submission is detected for the current
 * problem. Resets when problem changes. Persists `markSolved` (idempotent).
 */
export const useAcceptedSubmission = (
  problem: LeetCodeProblem | null,
): boolean => {
  const [state, dispatch] = useReducer(reducer, {
    problemId: problem?.id ?? null,
    accepted: false,
  });

  useEffect(() => {
    dispatch({ type: 'reset', problemId: problem?.id ?? null });
    if (!problem) return;

    const stop = watchForAcceptedSubmission(() => {
      dispatch({ type: 'accept' });
      void markSolved(problem.id);
    });
    return stop;
  }, [problem]);

  return state.accepted;
};