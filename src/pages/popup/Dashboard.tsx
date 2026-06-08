import React, { useCallback, useEffect, useState } from 'react';
import {
  computeGlobalStats,
  getAllProgress,
  resetAllProgress,
} from '@/services/progress';
import {
  cn,
  difficultyColor,
  formatDuration,
  formatRelativeTime,
  truncate,
} from '@/utils/helpers';
import type { GlobalStats, ProblemProgress } from '@/types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [records, setRecords] = useState<ProblemProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const reload = useCallback(async () => {
    const [s, r] = await Promise.all([computeGlobalStats(), getAllProgress()]);
    setStats(s);
    setRecords([...r].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleReset = async () => {
    await resetAllProgress();
    setConfirmingReset(false);
    setLoading(true);
    await reload();
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  const solveRate =
    stats.totalProblems > 0
      ? Math.round((stats.solvedProblems / stats.totalProblems) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Top stat grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          emoji="✅"
          label="Solved"
          value={stats.solvedProblems}
          sub={`of ${stats.totalProblems} attempted`}
        />
        <StatTile
          emoji="💡"
          label="Hints used"
          value={stats.totalHintsUsed}
          sub={`avg ${stats.averageHintsPerProblem}/problem`}
        />
        <StatTile
          emoji="🔄"
          label="Avg attempts"
          value={stats.averageAttemptsBeforeSolve}
          sub="before solving"
        />
        <StatTile
          emoji="🔥"
          label="Day streak"
          value={stats.streakDays}
          sub={stats.lastActiveDateStr || 'no activity yet'}
        />
      </div>

      {/* Solve-rate bar */}
      {stats.totalProblems > 0 && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-300">
              Solve rate
            </span>
            <span className="text-[11px] font-bold text-brand-400">
              {solveRate}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${solveRate}%` }}
            />
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          Recent problems
        </p>
        {records.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-2xl mb-1">📚</p>
            <p className="text-xs">No problems yet.</p>
            <p className="text-[10px] mt-0.5">
              Visit a LeetCode problem to start tracking.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {records.slice(0, 30).map((r) => (
              <HistoryRow key={r.problemId} record={r} />
            ))}
          </div>
        )}
      </div>

      {/* Reset */}
      {records.length > 0 && !confirmingReset && (
        <button
          type="button"
          onClick={() => setConfirmingReset(true)}
          className="text-[10px] text-gray-600 hover:text-red-400 self-start transition-colors"
        >
          🗑️ Reset all progress
        </button>
      )}

      {confirmingReset && (
        <div className="bg-red-900/10 border border-red-700/40 rounded-lg p-2.5">
          <p className="text-[11px] font-semibold text-red-400 mb-1">
            Reset all progress?
          </p>
          <p className="text-[10px] text-gray-500 mb-2">
            Erases problem history, hint counts, and time spent. Cached
            analyses and your API key are kept.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold rounded transition-colors"
            >
              Yes, reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-semibold rounded border border-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────

interface StatTileProps {
  emoji: string;
  label: string;
  value: number;
  sub?: string;
}

const StatTile: React.FC<StatTileProps> = ({ emoji, label, value, sub }) => (
  <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2.5 text-center">
    <div className="text-base">{emoji}</div>
    <div className="text-base font-bold text-white leading-tight">{value}</div>
    <div className="text-[10px] font-semibold text-gray-300">{label}</div>
    {sub && <div className="text-[9px] text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

interface HistoryRowProps {
  record: ProblemProgress;
}

const HistoryRow: React.FC<HistoryRowProps> = ({ record }) => {
  const statusEmoji =
    record.status === 'solved'
      ? '✅'
      : record.status === 'given-up'
        ? '⏭️'
        : '🔄';

  return (
    <button
      type="button"
      onClick={() =>
        chrome.tabs.create({
          url: `https://leetcode.com/problems/${record.problemId}/`,
        })
      }
      className="flex items-center gap-2 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/40 rounded-md p-2 text-left transition-colors"
    >
      <span className="text-sm">{statusEmoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-200 truncate">
          {truncate(record.problemTitle, 32)}
        </p>
        <p className="text-[9px] text-gray-500">
          <span className={cn('font-semibold', difficultyColor(record.difficulty))}>
            {record.difficulty}
          </span>
          {' · '}
          {record.hintsUsed} hints · {formatDuration(record.timeSpentSeconds)} ·{' '}
          {formatRelativeTime(record.lastUpdatedAt)}
        </p>
      </div>
    </button>
  );
};