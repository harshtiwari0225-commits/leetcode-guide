import React, { useState } from 'react';
import { cn, difficultyBgColor, difficultyColor, truncate } from '@/utils/helpers';
import { ApproachesSection } from './ApproachesSection';
import { HintsSection } from './HintsSection';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useTimeTracker } from '@/hooks/useTimeTracker';
import type { LeetCodeProblem } from '@/types';

interface SidePanelProps {
  problem: LeetCodeProblem | null;
  loading: boolean;
  error: string | null;
}

const PANEL_WIDTH_PX = 340;
const TAB_WIDTH_PX = 32;

/**
 * Side panel: a collapsible drawer pinned to the right edge of any
 * LeetCode problem page.
 */
export const SidePanel: React.FC<SidePanelProps> = ({ problem, loading, error }) => {
  const [collapsed, setCollapsed] = useState(false);
  useTimeTracker(problem);

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        right: 0,
        height: 'calc(100vh - 64px)',
        width: PANEL_WIDTH_PX + TAB_WIDTH_PX,
        transform: collapsed ? `translateX(${PANEL_WIDTH_PX}px)` : 'translateX(0)',
        transition: 'transform 300ms ease-out',
        pointerEvents: 'none',
        zIndex: 2147483647,
      }}
    >
      {/* Toggle tab — absolutely anchored to the LEFT edge of the wrapper. */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Open LeetCode Guide' : 'Hide LeetCode Guide'}
        aria-label={collapsed ? 'Open LeetCode Guide panel' : 'Hide LeetCode Guide panel'}
        style={{
          position: 'absolute',
          top: 24,
          left: -2,
          width: TAB_WIDTH_PX,
          height: 96,
          pointerEvents: 'auto',
          cursor: 'pointer',
          border: '2px solid #16a34a',
          borderRight: 'none',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          fontSize: 18,
          fontWeight: 700,
          borderRadius: '10px 0 0 10px',
          boxShadow:
            '0 0 0 2px rgba(0,0,0,0.4), -6px 0 24px rgba(34,197,94,0.55), 0 0 18px rgba(254,240,138,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 16 }}>{collapsed ? '◀' : '▶'}</span>
      </button>

      {/* Panel body */}
      <aside
        style={{
          position: 'absolute',
          top: 0,
          left: TAB_WIDTH_PX,
          width: PANEL_WIDTH_PX,
          height: '100%',
          pointerEvents: 'auto',
        }}
        className="bg-gray-900 text-white border-l border-gray-800 shadow-[-4px_0_24px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden"
        aria-label="LeetCode Guide panel"
      >
        {/* Header */}
        <header className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center text-xs font-bold">
              LG
            </div>
            <span className="text-xs font-bold tracking-wide text-gray-200">
              LeetCode Guide
            </span>
            <span className="ml-auto text-[10px] text-gray-600">M3</span>
          </div>

          {loading && <ProblemHeaderSkeleton />}

          {!loading && error && (
            <p className="text-xs text-red-400 leading-snug">⚠️ {error}</p>
          )}

          {!loading && !error && problem && (
            <div>
              <h2 className="text-sm font-bold text-white leading-tight mb-1.5">
                {truncate(problem.title, 48)}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                    difficultyBgColor(problem.difficulty),
                    difficultyColor(problem.difficulty),
                  )}
                >
                  {problem.difficulty}
                </span>
                {problem.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-gray-400 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {problem.tags.length > 3 && (
                  <span className="text-[10px] text-gray-600">
                    +{problem.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-300">
          {!problem && !loading && !error && <EmptyState />}

          {problem && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <ApproachesSection problem={problem} />
              <HintsSection problem={problem} />
              <CollapsibleSection emoji="🔓" title="Solution reveal">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Coming in M5 — unlocks only after an Accepted submission.
                </p>
              </CollapsibleSection>

              <details className="mt-2 bg-gray-800/40 border border-gray-700/40 rounded-lg">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-300 select-none">
                  Debug: extracted problem
                </summary>
                <pre className="text-[10px] font-mono text-gray-400 p-3 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    {
                      id: problem.id,
                      title: problem.title,
                      difficulty: problem.difficulty,
                      tags: problem.tags,
                      examples: problem.examples.length,
                      constraints: problem.constraints.length,
                      descriptionChars: problem.description.length,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 px-4 py-2 border-t border-gray-800 flex items-center justify-between">
          <p className="text-[10px] text-gray-600">Learn, don't copy 🎓</p>
          <p className="text-[10px] text-gray-700">Local-only</p>
        </footer>
      </aside>
    </div>
  );
};

// ─────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────

const ProblemHeaderSkeleton: React.FC = () => (
  <div className="space-y-2 animate-pulse">
    <div className="h-4 w-3/4 bg-gray-700 rounded" />
    <div className="flex gap-1.5">
      <div className="h-4 w-12 bg-gray-700 rounded-full" />
      <div className="h-4 w-16 bg-gray-700 rounded-full" />
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center gap-3">
    <div className="text-4xl">🧩</div>
    <p className="text-sm font-semibold text-gray-300">Open a problem to begin</p>
    <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">
      Navigate to any <code className="font-mono text-gray-300">leetcode.com/problems/*</code>{' '}
      page and this panel will load it automatically.
    </p>
  </div>
);