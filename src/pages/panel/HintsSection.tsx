import React, { useState } from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { cn } from '@/utils/helpers';
import { useHints } from '@/hooks/useHints';
import { useProblemAnalysis } from '@/hooks/useProblemAnalysis';
import type { HintLevel, LeetCodeProblem } from '@/types';

const LEVEL_LABELS: Record<HintLevel, string> = {
  1: 'Vague',
  2: 'Category',
  3: 'Technique',
  4: 'Steps',
  5: 'Worked',
};

const LEVEL_DESCRIPTIONS: Record<HintLevel, string> = {
  1: 'A nudge in the right direction',
  2: 'The general kind of solution',
  3: 'The specific technique to use',
  4: 'Plain-English algorithm steps',
  5: 'Step-by-step worked example',
};

interface HintsSectionProps {
  problem: LeetCodeProblem;
}

export const HintsSection: React.FC<HintsSectionProps> = ({ problem}) => {
  const { status, analysis } = useProblemAnalysis(problem);
  const [userPickedId, setUserPickedId] = useState<string | null>(null);

  // Effective selection: user's pick if it still exists, otherwise first approach.
  const effectiveId =
    userPickedId && analysis?.approaches.find((a) => a.id === userPickedId)
      ? userPickedId
      : (analysis?.approaches[0]?.id ?? null);

  const approach =
    analysis?.approaches.find((a) => a.id === effectiveId) ?? null;
  const { session, nextLevel, fetchStatus, error, requestHint } = useHints(
    problem,
    approach,
  );

  const totalRevealed = session?.hintsRevealed.length ?? 0;
  const badge =
    status === 'ready' && analysis
      ? totalRevealed > 0
        ? `${totalRevealed}/5`
        : null
      : null;

  return (
    <CollapsibleSection emoji="💡" title="Progressive hints" badge={badge}>
      {status !== 'ready' || !analysis ? (
        <p className="text-[11px] text-gray-500">
          Open the Approaches section first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Approach picker */}
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">
              Hints for approach:
            </label>
            <select
              value={effectiveId ?? ''}
              onChange={(e) => setUserPickedId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-brand-500"
            >
              {analysis.approaches.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.type}
                </option>
              ))}
            </select>
          </div>

          {/* Hint ladder */}
          <HintLadder
            session={session}
            currentLevel={nextLevel}
            onPickLevel={(level) => {
              if (session?.hintsRevealed.includes(level)) return;
              void requestHint(level);
            }}
            disabled={fetchStatus === 'loading'}
          />

          {/* Revealed hints */}
          {session && session.hints.length > 0 && (
            <div className="flex flex-col gap-2 animate-fade-in">
              {session.hints.map((h) => (
                <article
                  key={h.level}
                  className="bg-gray-900/40 border-l-2 border-l-brand-500/60 border border-gray-700/40 rounded-md p-2.5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {h.level}
                    </span>
                    <span className="text-[11px] font-semibold text-brand-400">
                      {LEVEL_LABELS[h.level]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {h.content}
                  </p>
                </article>
              ))}
            </div>
          )}

          {/* Action area */}
          <ActionArea
            nextLevel={nextLevel}
            fetchStatus={fetchStatus}
            error={error}
            onRequest={(level) => void requestHint(level)}
          />
        </div>
      )}
    </CollapsibleSection>
  );
};

// ─────────────────────────────────────────────
// HintLadder — 5 dots, colored by state
// ─────────────────────────────────────────────

interface HintLadderProps {
  session: ReturnType<typeof useHints>['session'];
  currentLevel: HintLevel | null;
  onPickLevel: (level: HintLevel) => void;
  disabled: boolean;
}

const HintLadder: React.FC<HintLadderProps> = ({
  session,
  currentLevel,
  onPickLevel,
  disabled,
}) => (
  <div>
    <div className="grid grid-cols-5 gap-1">
      {([1, 2, 3, 4, 5] as HintLevel[]).map((level) => {
        const revealed = session?.hintsRevealed.includes(level) ?? false;
        const isNext = currentLevel === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onPickLevel(level)}
            disabled={disabled || (!revealed && !isNext)}
            title={`Level ${level} — ${LEVEL_DESCRIPTIONS[level]}`}
            className={cn(
              'h-7 rounded-md text-[10px] font-bold border transition-colors',
              revealed
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                : isNext
                  ? 'bg-gray-800 border-gray-500 text-gray-200 hover:bg-gray-700 hover:border-brand-500'
                  : 'bg-gray-900/40 border-gray-800 text-gray-600 cursor-not-allowed',
            )}
          >
            {level}
          </button>
        );
      })}
    </div>
    <div className="grid grid-cols-5 gap-1 mt-0.5">
      {([1, 2, 3, 4, 5] as HintLevel[]).map((level) => (
        <span
          key={level}
          className="text-[8px] text-gray-600 text-center truncate"
        >
          {LEVEL_LABELS[level]}
        </span>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// ActionArea — "Get next hint" with confirm for L4/L5
// ─────────────────────────────────────────────

interface ActionAreaProps {
  nextLevel: HintLevel | null;
  fetchStatus: ReturnType<typeof useHints>['fetchStatus'];
  error: string | null;
  onRequest: (level: HintLevel) => void;
}

const ActionArea: React.FC<ActionAreaProps> = ({
  nextLevel,
  fetchStatus,
  error,
  onRequest,
}) => {
  const [confirmingLevel, setConfirmingLevel] = useState<HintLevel | null>(null);

  if (fetchStatus === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-4 h-4 rounded-full border-2 border-gray-700 border-t-brand-500 animate-spin" />
        <p className="text-[11px] text-gray-500">Generating hint…</p>
      </div>
    );
  }

  if (fetchStatus === 'no-key') {
    return (
      <p className="text-[11px] text-yellow-400 text-center py-2">
        🔑 Add your Gemini API key in the popup Settings.
      </p>
    );
  }

  if (fetchStatus === 'validation-error' || fetchStatus === 'error') {
    return (
      <div className="text-center py-2">
        <p className="text-[11px] text-red-400">⚠️ {error ?? 'Hint failed.'}</p>
        {nextLevel && (
          <button
            type="button"
            onClick={() => onRequest(nextLevel)}
            className="mt-1 text-[10px] font-semibold text-brand-400 hover:text-brand-300 underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!nextLevel) {
    return (
      <div className="text-center py-3 rounded-md bg-brand-500/10 border border-brand-500/30">
        <p className="text-[11px] text-brand-300 font-semibold">
          🎯 All 5 hints revealed
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          Try implementing the solution now.
        </p>
      </div>
    );
  }

  // Confirmation dialog for big reveals (levels 4 & 5)
  if (confirmingLevel !== null) {
    return (
      <div className="bg-yellow-900/10 border border-yellow-700/40 rounded-md p-2.5">
        <p className="text-[11px] font-semibold text-yellow-300 mb-1">
          ⚠️ Big hint incoming
        </p>
        <p className="text-[10px] text-gray-400 mb-2">
          Level {confirmingLevel}: {LEVEL_DESCRIPTIONS[confirmingLevel]}.
          Are you sure?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const lvl = confirmingLevel;
              setConfirmingLevel(null);
              onRequest(lvl);
            }}
            className="flex-1 px-2 py-1 bg-brand-500 hover:bg-brand-400 text-white text-[10px] font-semibold rounded transition-colors"
          >
            Yes, show me
          </button>
          <button
            type="button"
            onClick={() => setConfirmingLevel(null)}
            className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-semibold rounded border border-gray-700 transition-colors"
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (nextLevel >= 4) setConfirmingLevel(nextLevel);
        else onRequest(nextLevel);
      }}
      className="w-full px-3 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold rounded-md transition-colors"
    >
      💡 Get hint {nextLevel} — {LEVEL_LABELS[nextLevel]}
    </button>
  );
};
