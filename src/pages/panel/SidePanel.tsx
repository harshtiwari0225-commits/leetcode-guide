import React, { useCallback, useEffect, useState } from 'react';
import { cn, difficultyBgColor, difficultyColor, truncate } from '@/utils/helpers';
import { ApproachesSection } from './ApproachesSection';
import { HintsSection } from './HintsSection';
import { ApproachComparisonSection } from './ApproachComparisonSection';
import { SolutionRevealSection } from './SolutionRevealSection';
import { Toaster } from '@/components/Toaster';
import { showToast } from '@/components/toast';
import { DayNightToggle } from '@/components/DayNightToggle';
import { KeyboardHelp } from '@/components/KeyboardHelp';
import {
  DEFAULT_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  usePanelWidth,
} from '@/hooks/usePanelWidth';
import { usePanelHeight } from '@/hooks/usePanelHeight';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { FONT_LEVELS, useFontLevel } from '@/hooks/useFontLevel';
import { useTabPosition } from '@/hooks/useTabPosition';
import { usePanelSide } from '@/hooks/usePanelSide';
import { useTheme } from '@/hooks/useTheme';
import { useTimeTracker } from '@/hooks/useTimeTracker';
import { useAcceptedSubmission } from '@/hooks/useAcceptedSubmission';
import type { LeetCodeProblem } from '@/types';

interface SidePanelProps {
  problem: LeetCodeProblem | null;
  loading: boolean;
  error: string | null;
}

const TAB_WIDTH_PX = 28;
const TAB_HEIGHT_PX = 65;
const WIDTH_HANDLE_PX = 6;
const HEIGHT_HANDLE_PX = 6;
const CORNER_HANDLE_PX = 14;

const Z_PANEL = 1;
const Z_HOOK = 2;
const Z_WIDTH_HANDLE = 5;
const Z_HEIGHT_HANDLE = 3;
const Z_CORNER_HANDLE = 6;

const ENTRANCE_KEY = 'leetcode-guide:entered';

export const SidePanel: React.FC<SidePanelProps> = ({ problem, loading, error }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Entrance animation — once per browser tab session.
  const [showEntrance, setShowEntrance] = useState(() => {
    try {
      return sessionStorage.getItem(ENTRANCE_KEY) === null;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!showEntrance) return;
    try {
      sessionStorage.setItem(ENTRANCE_KEY, '1');
    } catch {
      /* sessionStorage unavailable — fine */
    }
    const timer = window.setTimeout(() => setShowEntrance(false), 600);
    return () => window.clearTimeout(timer);
  }, [showEntrance]);

  const { side, isLeft, toggle: toggleSide } = usePanelSide();
  const {
    width,
    isDragging: isWidthDragging,
    startDrag: startWidthDrag,
    reset: resetWidth,
  } = usePanelWidth(isLeft);
  const {
    cssHeight,
    cssTop,
    isDragging: isHeightDragging,
    startDrag: startHeightDrag,
    reset: resetHeight,
  } = usePanelHeight();
  const { level: fontLevel, zoom, bumpUp, bumpDown, canBumpUp, canBumpDown } =
    useFontLevel();
  const {
    top: tabTop,
    isDragging: isTabDragging,
    startMaybeDrag: startTabDrag,
    reset: resetTabPosition,
  } = useTabPosition();
  const { theme, toggle: toggleTheme } = useTheme();
  useTimeTracker(problem);
  const accepted = useAcceptedSubmission(problem);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    window.dispatchEvent(new CustomEvent('leetcode-guide:refresh'));
    window.setTimeout(() => setSpinning(false), 1000);
    showToast('Refreshing problem…', 'info');
  }, []);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  const handleBumpUp = useCallback(() => {
    bumpUp();
    showToast(`Font size: level ${fontLevel + 2}/${FONT_LEVELS.length}`, 'info');
  }, [bumpUp, fontLevel]);

  const handleBumpDown = useCallback(() => {
    bumpDown();
    showToast(`Font size: level ${fontLevel}/${FONT_LEVELS.length}`, 'info');
  }, [bumpDown, fontLevel]);

  const handleToggleSide = useCallback(() => {
    toggleSide();
    showToast(
      side === 'right' ? 'Panel moved to left' : 'Panel moved to right',
      'info',
    );
  }, [toggleSide, side]);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
    showToast(theme === 'dark' ? 'Light mode' : 'Dark mode', 'info');
  }, [toggleTheme, theme]);

  const handleOpenHelp = useCallback(() => setHelpOpen(true), []);
  const handleCloseHelp = useCallback(() => setHelpOpen(false), []);

  const handleCornerDrag = useCallback(
    (e: React.MouseEvent) => {
      startWidthDrag(e);
      startHeightDrag(e);
    },
    [startWidthDrag, startHeightDrag],
  );

  useKeyboardShortcuts({
    onToggle: handleToggleCollapsed,
    onRefresh: handleRefresh,
    onHelp: handleOpenHelp,
  });

  const isAnyDrag = isWidthDragging || isHeightDragging;

  const nearEdgeStyle: React.CSSProperties = isLeft ? { left: 0 } : { right: 0 };

  // Combine collapse + entrance animation into the same transform.
  const baseTransform = collapsed
    ? isLeft
      ? `translateX(-${width}px)`
      : `translateX(${width}px)`
    : 'translateX(0)';
  const entranceTransform =
    showEntrance && !collapsed
      ? isLeft
        ? `translateX(-${width + TAB_WIDTH_PX}px)`
        : `translateX(${width + TAB_WIDTH_PX}px)`
      : null;
  const finalTransform = entranceTransform ?? baseTransform;

  const hookEdgeStyle: React.CSSProperties = isLeft ? { right: 0 } : { left: 0 };
  const arrowGlyph = isLeft
    ? collapsed ? '▶' : '◀'
    : collapsed ? '◀' : '▶';

  const widthHandleStyle: React.CSSProperties = isLeft
    ? { right: TAB_WIDTH_PX - WIDTH_HANDLE_PX / 2 }
    : { left: TAB_WIDTH_PX - WIDTH_HANDLE_PX / 2 };

  const cornerHandleStyle: React.CSSProperties = isLeft
    ? { right: TAB_WIDTH_PX - CORNER_HANDLE_PX / 2, top: -CORNER_HANDLE_PX / 2 }
    : { left: TAB_WIDTH_PX - CORNER_HANDLE_PX / 2, top: -CORNER_HANDLE_PX / 2 };

  const panelBodyStyle: React.CSSProperties = isLeft
    ? { left: 0 }
    : { left: TAB_WIDTH_PX };

  const halfCircleRadius = TAB_HEIGHT_PX / 2;
  const hookBorderRadius = isLeft
    ? `0 ${halfCircleRadius}px ${halfCircleRadius}px 0`
    : `${halfCircleRadius}px 0 0 ${halfCircleRadius}px`;

  const panelShadow = isLeft
    ? 'var(--lg-shadow-panel-left)'
    : 'var(--lg-shadow-panel)';
  const panelBorderClass = isLeft
    ? 'border-r border-gray-800'
    : 'border-l border-gray-800';

  const cornerCursor = isLeft ? 'nwse-resize' : 'nesw-resize';

  return (
    <div
      data-theme={theme}
      style={{
        position: 'fixed',
        top: cssTop,
        ...nearEdgeStyle,
        height: cssHeight,
        width: width + TAB_WIDTH_PX,
        transform: finalTransform,
        transition: isAnyDrag
          ? 'none'
          : 'transform 400ms cubic-bezier(0.22, 0.61, 0.36, 1), width 150ms ease-out, height 150ms ease-out, top 150ms ease-out',
        pointerEvents: 'none',
        zIndex: 2147483647,
      }}
    >
      {/* Toggle hook */}
      <button
        type="button"
        onClick={handleToggleCollapsed}
        onMouseDown={startTabDrag}
        onDoubleClick={() => {
          resetTabPosition();
          showToast('Hook position reset', 'info');
        }}
        title={
          collapsed
            ? 'Open LeetCode Guide (Alt+L) · hold to drag · double-click to reset'
            : 'Hide LeetCode Guide (Alt+L) · hold to drag · double-click to reset'
        }
        aria-label={collapsed ? 'Open LeetCode Guide panel' : 'Hide LeetCode Guide panel'}
        style={{
          position: 'absolute',
          top: tabTop,
          ...hookEdgeStyle,
          width: TAB_WIDTH_PX,
          height: TAB_HEIGHT_PX,
          padding: 0,
          pointerEvents: 'auto',
          cursor: isTabDragging ? 'ns-resize' : 'pointer',
          border: isTabDragging ? '2px solid #16a34a' : '1px solid #16a34a',
          ...(isLeft ? { borderLeft: 'none' } : { borderRight: 'none' }),
          background: 'linear-gradient(135deg, #22c55e 0%, #0f7c37 100%)',
          color: 'white',
          fontSize: 16,
          fontWeight: 700,
          borderRadius: hookBorderRadius,
          boxShadow:
            '-2px 2px 8px rgba(0,0,0,0.45), 0 0 12px rgba(34,197,94,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          transition: isTabDragging ? 'none' : 'top 150ms ease-out',
          userSelect: 'none',
          zIndex: Z_HOOK,
        }}
      >
        <span aria-hidden="true">{arrowGlyph}</span>
      </button>

      {/* Width-resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize panel width (current ${width}px, min ${MIN_PANEL_WIDTH}, max ${MAX_PANEL_WIDTH}). Double-click to reset.`}
        onMouseDown={startWidthDrag}
        onDoubleClick={() => {
          resetWidth();
          showToast(`Panel width reset to ${DEFAULT_PANEL_WIDTH}px`, 'info');
        }}
        title="Drag to resize width · double-click to reset"
        style={{
          position: 'absolute',
          top: 0,
          ...widthHandleStyle,
          width: WIDTH_HANDLE_PX,
          height: '100%',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          zIndex: Z_WIDTH_HANDLE,
          background: isWidthDragging ? 'rgba(34,197,94,0.4)' : 'transparent',
          transition: 'background 150ms',
        }}
      />

      {/* Height-resize handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel height by dragging the top edge. Double-click to fill viewport."
        onMouseDown={startHeightDrag}
        onDoubleClick={() => {
          resetHeight();
          showToast('Panel height reset to fill viewport', 'info');
        }}
        title="Drag to resize height · double-click to fill viewport"
        style={{
          position: 'absolute',
          left: isLeft ? 0 : TAB_WIDTH_PX,
          right: isLeft ? TAB_WIDTH_PX : 0,
          top: -HEIGHT_HANDLE_PX,
          height: HEIGHT_HANDLE_PX,
          cursor: 'ns-resize',
          pointerEvents: 'auto',
          zIndex: Z_HEIGHT_HANDLE,
          background: isHeightDragging ? 'rgba(34,197,94,0.4)' : 'transparent',
          transition: 'background 150ms',
        }}
      />

      {/* Corner handle */}
      <div
        role="separator"
        aria-label="Resize panel width and height. Double-click to reset both."
        onMouseDown={handleCornerDrag}
        onDoubleClick={() => {
          resetWidth();
          resetHeight();
          showToast('Panel size reset', 'info');
        }}
        title="Drag to resize · double-click to reset both"
        style={{
          position: 'absolute',
          ...cornerHandleStyle,
          width: CORNER_HANDLE_PX,
          height: CORNER_HANDLE_PX,
          cursor: cornerCursor,
          pointerEvents: 'auto',
          zIndex: Z_CORNER_HANDLE,
          background: isAnyDrag ? 'rgba(34,197,94,0.6)' : 'rgba(34,197,94,0.25)',
          borderRadius: 3,
          transition: 'background 150ms',
        }}
      />

      <aside
        style={{
          position: 'absolute',
          top: 0,
          ...panelBodyStyle,
          width,
          height: '100%',
          pointerEvents: 'auto',
          boxShadow: panelShadow,
          zIndex: Z_PANEL,
        }}
        className={cn(
          'bg-gray-900 text-white flex flex-col overflow-hidden relative',
          panelBorderClass,
        )}
        aria-label="LeetCode Guide panel"
      >
        <header className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center text-xs font-bold">
              💡
            </div>
            <span className="text-xs font-bold tracking-wide text-gray-200">
              LeetCode Guide
            </span>
            <span className="ml-auto flex items-center gap-0.5">
              <DayNightToggle theme={theme} onToggle={handleToggleTheme} />
              <HeaderIconButton
                onClick={handleToggleSide}
                title={`Move panel to ${isLeft ? 'right' : 'left'}`}
                ariaLabel={`Move panel to ${isLeft ? 'right' : 'left'}`}
              >
                <span className="text-[12px]">{isLeft ? '⇥' : '⇤'}</span>
              </HeaderIconButton>
              <HeaderIconButton
                onClick={handleBumpDown}
                title={`Decrease font size (currently ${fontLevel + 1}/${FONT_LEVELS.length})`}
                ariaLabel="Decrease font size"
                disabled={!canBumpDown}
              >
                <span className="text-[10px]">A−</span>
              </HeaderIconButton>
              <HeaderIconButton
                onClick={handleBumpUp}
                title={`Increase font size (currently ${fontLevel + 1}/${FONT_LEVELS.length})`}
                ariaLabel="Increase font size"
                disabled={!canBumpUp}
              >
                <span className="text-[12px] font-bold">A+</span>
              </HeaderIconButton>
              <HeaderIconButton
                onClick={handleRefresh}
                title="Refresh problem (Alt+R)"
                ariaLabel="Refresh problem"
                spinning={spinning}
              >
                ⟳
              </HeaderIconButton>
              <HeaderIconButton
                onClick={handleOpenHelp}
                title="Shortcuts & tips (Alt+H)"
                ariaLabel="Open keyboard help"
              >
                <span className="text-[12px]">?</span>
              </HeaderIconButton>
            </span>
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

        <div
          className="flex-1 overflow-y-auto p-4 text-sm text-gray-300 custom-scrollbar"
          style={{ zoom }}
        >
          {!problem && !loading && !error && <EmptyState />}

          {problem && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <ApproachesSection problem={problem} />
              <HintsSection problem={problem} />
              <ApproachComparisonSection problem={problem} />
              <SolutionRevealSection problem={problem} accepted={accepted} />

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

        <footer className="flex-shrink-0 px-4 py-2 border-t border-gray-800 flex items-center justify-between">
          <p className="text-[10px] text-gray-600">Learn, don't copy 🎓</p>
          <p className="text-[10px] text-gray-700">Local-only · M7a</p>
        </footer>

        <KeyboardHelp open={helpOpen} onClose={handleCloseHelp} />

        <Toaster />
      </aside>
    </div>
  );
};

interface HeaderIconButtonProps {
  onClick: () => void;
  title: string;
  ariaLabel: string;
  spinning?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  onClick,
  title,
  ariaLabel,
  spinning = false,
  disabled = false,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={ariaLabel}
    disabled={disabled}
    className={cn(
      'w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-brand-400 hover:bg-gray-800 transition-colors text-sm',
      spinning && 'animate-spin pointer-events-none',
      disabled && 'opacity-40 cursor-not-allowed hover:text-gray-400 hover:bg-transparent',
    )}
  >
    {children}
  </button>
);

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
