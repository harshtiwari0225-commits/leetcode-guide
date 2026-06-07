import React, { useState } from 'react';
import { cn } from '@/utils/helpers';
import { Badge } from './ui/Badge';
import type { Approach } from '@/types';

const TYPE_STYLES: Record<Approach['type'], string> = {
  'Brute Force': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  Optimal: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Advanced: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
};

interface ApproachCardProps {
  approach: Approach;
}

/**
 * Approach card.
 * Title row + complexity is always visible. The full description is hidden
 * behind a "Reveal description" toggle so users don't see spoilers by default.
 */
export const ApproachCard: React.FC<ApproachCardProps> = ({ approach }) => {
  const [descOpen, setDescOpen] = useState(false);

  return (
    <article className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 flex flex-col gap-2">
      <header className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold text-white leading-tight">
          {approach.name}
        </h4>
        <span
          className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap',
            TYPE_STYLES[approach.type],
          )}
        >
          {approach.type}
        </span>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <ComplexityChip label="Time" value={approach.timeComplexity} color="blue" />
        <ComplexityChip
          label="Space"
          value={approach.spaceComplexity}
          color="purple"
        />
        <span className="ml-auto text-[10px] text-gray-500">
          Difficulty: {approach.difficultyScore}/5
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-500">Technique:</span>
        <Badge variant="default">{approach.technique}</Badge>
      </div>

      {/* Description is hidden by default — reveal explicitly. */}
      <button
        type="button"
        onClick={() => setDescOpen((v) => !v)}
        aria-expanded={descOpen}
        className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-brand-400 hover:text-brand-300 transition-colors w-full"
      >
        <span>{descOpen ? '▼ Hide description' : '▶ Description'}</span>
      </button>

      {descOpen && (
        <p className="text-[11px] text-gray-300 leading-relaxed bg-gray-900/40 border border-gray-700/40 rounded-md p-2 animate-fade-in">
          {approach.description}
        </p>
      )}
    </article>
  );
};

interface ComplexityChipProps {
  label: string;
  value: string;
  color: 'blue' | 'purple';
}

const ComplexityChip: React.FC<ComplexityChipProps> = ({ label, value, color }) => {
  const palette =
    color === 'blue'
      ? 'text-blue-300 bg-blue-400/10'
      : 'text-purple-300 bg-purple-400/10';
  return (
    <span className="flex items-center gap-1 text-[10px]">
      <span className="text-gray-500">{label}:</span>
      <code className={cn('font-mono px-1.5 py-0.5 rounded', palette)}>
        {value}
      </code>
    </span>
  );
};