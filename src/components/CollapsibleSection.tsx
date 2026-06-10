import React, { useEffect, useReducer } from 'react';
import { cn } from '@/utils/helpers';

interface CollapsibleSectionProps {
  emoji: string;
  title: string;
  /** Optional small text shown on the right of the header (e.g. "3 found"). */
  badge?: React.ReactNode;
  /** Default open state. Defaults to false (collapsed). */
  defaultOpen?: boolean;
  /**
   * External "force this state" key. When this number changes, the section
   * snaps to `forceOpen`. Used by the panel header's Expand-all / Collapse-all.
   */
  forceKey?: number;
  forceOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface OpenState {
  forceKey: number | null;
  open: boolean;
}

type OpenAction = { type: 'toggle' } | { type: 'force'; forceKey: number; open: boolean };

const reducer = (state: OpenState, action: OpenAction): OpenState => {
  switch (action.type) {
    case 'toggle':
      return { ...state, open: !state.open };
    case 'force':
      if (state.forceKey === action.forceKey) return state;
      return { forceKey: action.forceKey, open: action.open };
  }
};

/**
 * A consistent collapsible section used inside the side panel.
 * Closed by default so users see a clean overview and explicitly open
 * only the sections they want.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  emoji,
  title,
  badge,
  defaultOpen = false,
  forceKey,
  forceOpen,
  children,
  className,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    forceKey: null,
    open: defaultOpen,
  });

  // When the parent's forceKey changes, snap to forceOpen.
  useEffect(() => {
    if (forceKey === undefined || forceOpen === undefined) return;
    dispatch({ type: 'force', forceKey, open: forceOpen });
  }, [forceKey, forceOpen]);

  return (
    <section
      className={cn(
        'bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: 'toggle' })}
        aria-expanded={state.open}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/60 transition-colors text-left"
      >
        <span className="text-gray-500 text-[10px] w-3">{state.open ? '▼' : '▶'}</span>
        <span>{emoji}</span>
        <h3 className="text-xs font-semibold text-gray-200 flex-1">{title}</h3>
        {badge && (
          <span className="text-[10px] text-gray-500 mr-1">{badge}</span>
        )}
      </button>
      {state.open && (
        <div className="px-3 pb-3 pt-1 animate-fade-in">{children}</div>
      )}
    </section>
  );
};