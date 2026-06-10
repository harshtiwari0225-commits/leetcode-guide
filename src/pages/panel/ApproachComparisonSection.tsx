import React, { useMemo, useState } from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useProblemAnalysis } from '@/hooks/useProblemAnalysis';
import { cn } from '@/utils/helpers';
import {
  type Comparison,
  compareComplexity,
} from '@/utils/complexity';
import type { Approach, LeetCodeProblem } from '@/types';

interface ApproachComparisonSectionProps {
  problem: LeetCodeProblem;
}

const TYPE_BG: Record<Approach['type'], string> = {
  'Brute Force': 'text-orange-300 bg-orange-400/10 border-orange-400/30',
  Optimal: 'text-blue-300 bg-blue-400/10 border-blue-400/30',
  Advanced: 'text-purple-300 bg-purple-400/10 border-purple-400/30',
};

export const ApproachComparisonSection: React.FC<
  ApproachComparisonSectionProps
> = ({ problem}) => {
  const { status, analysis } = useProblemAnalysis(problem);

  // Two-of-many selection. We store the user's *desired* IDs; if those IDs
  // no longer exist (cache miss → new IDs), we fall back to the first two
  // approaches. Doing this as derived state avoids a useEffect+setState
  // round-trip that would trip the react-hooks/set-state-in-effect lint rule.
  const approaches = analysis?.approaches ?? [];
  const defaultLeft = approaches[0]?.id ?? '';
  const defaultRight = approaches[1]?.id ?? approaches[0]?.id ?? '';

  const [userLeftId, setLeftId] = useState<string | null>(null);
  const [userRightId, setRightId] = useState<string | null>(null);

  const leftId =
    userLeftId && approaches.find((a) => a.id === userLeftId)
      ? userLeftId
      : defaultLeft;
  const rightId =
    userRightId && approaches.find((a) => a.id === userRightId)
      ? userRightId
      : defaultRight;

  const left = approaches.find((a) => a.id === leftId) ?? null;
  const right = approaches.find((a) => a.id === rightId) ?? null;

  return (
    <CollapsibleSection emoji="⚖️" title="Compare approaches">
      {status !== 'ready' || !analysis ? (
        <p className="text-[11px] text-gray-500">
          Open the Approaches section first.
        </p>
      ) : analysis.approaches.length < 2 ? (
        <p className="text-[11px] text-gray-500">
          Need at least 2 approaches to compare.
        </p>
      ) : (
        <ComparisonBody
          approaches={analysis.approaches}
          left={left}
          right={right}
          onLeftChange={setLeftId}
          onRightChange={setRightId}
        />
      )}
    </CollapsibleSection>
  );
};

// ─────────────────────────────────────────────
// Body
// ─────────────────────────────────────────────

interface ComparisonBodyProps {
  approaches: Approach[];
  left: Approach | null;
  right: Approach | null;
  onLeftChange: (id: string) => void;
  onRightChange: (id: string) => void;
}

const ComparisonBody: React.FC<ComparisonBodyProps> = ({
  approaches,
  left,
  right,
  onLeftChange,
  onRightChange,
}) => {
  const swapped = left?.id === right?.id;

  return (
    <div className="flex flex-col gap-3">
      {/* Pickers */}
      <div className="grid grid-cols-2 gap-2">
        <PickerColumn
          label="Approach A"
          accent="blue"
          approaches={approaches}
          selectedId={left?.id ?? ''}
          excludeId={right?.id}
          onChange={onLeftChange}
        />
        <PickerColumn
          label="Approach B"
          accent="purple"
          approaches={approaches}
          selectedId={right?.id ?? ''}
          excludeId={left?.id}
          onChange={onRightChange}
        />
      </div>

      {swapped && (
        <p className="text-[10px] text-yellow-400 text-center">
          ⚠️ Same approach on both sides — pick a different one for a useful comparison.
        </p>
      )}

      {left && right && !swapped && (
        <>
          <ComparisonTable left={left} right={right} />
          <TradeoffSummary left={left} right={right} />
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Picker column
// ─────────────────────────────────────────────

interface PickerColumnProps {
  label: string;
  accent: 'blue' | 'purple';
  approaches: Approach[];
  selectedId: string;
  excludeId?: string;
  onChange: (id: string) => void;
}

const PickerColumn: React.FC<PickerColumnProps> = ({
  label,
  accent,
  approaches,
  selectedId,
  excludeId,
  onChange,
}) => {
  const accentText = accent === 'blue' ? 'text-blue-400' : 'text-purple-400';
  const accentBorder =
    accent === 'blue' ? 'focus:border-blue-500' : 'focus:border-purple-500';

  return (
    <div>
      <p className={cn('text-[10px] font-semibold mb-1', accentText)}>{label}</p>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-[11px] text-gray-100 focus:outline-none transition-colors',
          accentBorder,
        )}
      >
        {approaches.map((a) => (
          <option key={a.id} value={a.id} disabled={a.id === excludeId}>
            {a.name} — {a.type}
          </option>
        ))}
      </select>
    </div>
  );
};

// ─────────────────────────────────────────────
// Comparison table
// ─────────────────────────────────────────────

interface TableProps {
  left: Approach;
  right: Approach;
}

const COMPARISON_FIELDS: Array<{
  key: keyof Approach;
  label: string;
  isComplexity?: boolean;
  isInverseScore?: boolean; // lower difficultyScore = "better"
}> = [
  { key: 'type', label: 'Type' },
  { key: 'technique', label: 'Technique' },
  { key: 'timeComplexity', label: 'Time', isComplexity: true },
  { key: 'spaceComplexity', label: 'Space', isComplexity: true },
  { key: 'difficultyScore', label: 'Difficulty', isInverseScore: true },
];

const ComparisonTable: React.FC<TableProps> = ({ left, right }) => (
  <div className="bg-gray-800/40 border border-gray-700/40 rounded-md overflow-hidden">
    <table className="w-full text-[11px]">
      <thead>
        <tr className="border-b border-gray-700/50">
          <th className="text-left px-2.5 py-1.5 text-[10px] font-medium text-gray-500 w-20">
            Metric
          </th>
          <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-blue-400">
            {left.name}
          </th>
          <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-purple-400">
            {right.name}
          </th>
        </tr>
      </thead>
      <tbody>
        {COMPARISON_FIELDS.map((field) => (
          <ComparisonRow
            key={String(field.key)}
            field={field}
            left={left}
            right={right}
          />
        ))}
      </tbody>
    </table>
  </div>
);

interface ComparisonRowProps {
  field: (typeof COMPARISON_FIELDS)[number];
  left: Approach;
  right: Approach;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({ field, left, right }) => {
  const leftRaw = left[field.key];
  const rightRaw = right[field.key];
  const leftStr = String(leftRaw);
  const rightStr = String(rightRaw);

  let leftClass = 'text-gray-300 bg-gray-700/40';
  let rightClass = 'text-gray-300 bg-gray-700/40';

  if (field.isComplexity) {
    const cmp = compareComplexity(leftStr, rightStr);
    leftClass = cellClassFor(cmp);
    rightClass = cellClassFor(invert(cmp));
  } else if (field.isInverseScore && typeof leftRaw === 'number' && typeof rightRaw === 'number') {
    const cmp: Comparison =
      leftRaw < rightRaw ? 'better' : leftRaw > rightRaw ? 'worse' : 'equal';
    leftClass = cellClassFor(cmp);
    rightClass = cellClassFor(invert(cmp));
  } else if (field.key === 'type') {
    leftClass = cn('font-semibold', TYPE_BG[left.type]);
    rightClass = cn('font-semibold', TYPE_BG[right.type]);
  }

  return (
    <tr className="border-b border-gray-700/20 last:border-0">
      <td className="px-2.5 py-1.5 text-gray-500 text-[10px]">{field.label}</td>
      <td className="px-2 py-1.5 text-center">
        <code className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded', leftClass)}>
          {field.isInverseScore ? `${leftStr}/5` : leftStr}
        </code>
      </td>
      <td className="px-2 py-1.5 text-center">
        <code className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded', rightClass)}>
          {field.isInverseScore ? `${rightStr}/5` : rightStr}
        </code>
      </td>
    </tr>
  );
};

const cellClassFor = (cmp: Comparison): string => {
  switch (cmp) {
    case 'better':
      return 'text-green-300 bg-green-400/10';
    case 'worse':
      return 'text-red-300 bg-red-400/10';
    case 'equal':
      return 'text-gray-300 bg-gray-700/40';
    case 'unknown':
      return 'text-gray-300 bg-gray-700/40';
  }
};

const invert = (cmp: Comparison): Comparison =>
  cmp === 'better' ? 'worse' : cmp === 'worse' ? 'better' : cmp;

// ─────────────────────────────────────────────
// Trade-off summary
// ─────────────────────────────────────────────

const TradeoffSummary: React.FC<TableProps> = ({ left, right }) => {
  const timeCmp = compareComplexity(left.timeComplexity, right.timeComplexity);
  const spaceCmp = compareComplexity(left.spaceComplexity, right.spaceComplexity);
  const simplerScore = left.difficultyScore <= right.difficultyScore ? left : right;

  const fasterName = useMemo(() => {
    if (timeCmp === 'better') return left.name;
    if (timeCmp === 'worse') return right.name;
    return null;
  }, [timeCmp, left.name, right.name]);

  const lessSpaceName = useMemo(() => {
    if (spaceCmp === 'better') return left.name;
    if (spaceCmp === 'worse') return right.name;
    return null;
  }, [spaceCmp, left.name, right.name]);

  return (
    <div className="bg-gray-800/30 border border-gray-700/40 rounded-md p-2.5">
      <p className="text-[10px] font-semibold text-gray-300 mb-2">
        ⚖️ Trade-off summary
      </p>
      <div className="space-y-1.5">
        <TradeoffRow
          emoji="⚡"
          label="Faster time"
          value={
            fasterName
              ? `${fasterName} (${fasterName === left.name ? left.timeComplexity : right.timeComplexity})`
              : 'Equivalent'
          }
        />
        <TradeoffRow
          emoji="💾"
          label="Less memory"
          value={
            lessSpaceName
              ? `${lessSpaceName} (${lessSpaceName === left.name ? left.spaceComplexity : right.spaceComplexity})`
              : 'Equivalent'
          }
        />
        <TradeoffRow
          emoji="🎓"
          label="Easier to implement"
          value={simplerScore.name}
        />
      </div>
      <p className="text-[10px] text-gray-500 leading-relaxed pt-2 mt-2 border-t border-gray-700/40">
        💡 In interviews, start with{' '}
        <span className="text-gray-300 font-medium">{simplerScore.name}</span> to
        show understanding, then optimise toward{' '}
        <span className="text-gray-300 font-medium">
          {fasterName ?? simplerScore.name}
        </span>{' '}
        if time allows.
      </p>
    </div>
  );
};

interface TradeoffRowProps {
  emoji: string;
  label: string;
  value: string;
}

const TradeoffRow: React.FC<TradeoffRowProps> = ({ emoji, label, value }) => (
  <div className="flex items-start gap-2 text-[11px]">
    <span>{emoji}</span>
    <div className="flex-1">
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  </div>
);
