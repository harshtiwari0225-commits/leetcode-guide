import React, { useState } from 'react';
import { cn } from '@/utils/helpers';

interface CollapsibleSectionProps {
  emoji: string;
  title: string;
  /** Optional small text shown on the right of the header (e.g. "3 found"). */
  badge?: React.ReactNode;
  /** Default open state. Defaults to false (collapsed). */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

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
  children,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        'bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/60 transition-colors text-left"
      >
        <span className="text-gray-500 text-[10px] w-3">{open ? '▼' : '▶'}</span>
        <span>{emoji}</span>
        <h3 className="text-xs font-semibold text-gray-200 flex-1">{title}</h3>
        {badge && (
          <span className="text-[10px] text-gray-500 mr-1">{badge}</span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 animate-fade-in">{children}</div>
      )}
    </section>
  );
};