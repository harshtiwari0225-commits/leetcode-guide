import React from 'react';
import { ApproachCard } from '@/components/ApproachCard';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useProblemAnalysis } from '@/hooks/useProblemAnalysis';
import type { LeetCodeProblem } from '@/types';

interface ApproachesSectionProps {
  problem: LeetCodeProblem;
}

export const ApproachesSection: React.FC<ApproachesSectionProps> = ({
  problem,
}) => {
  const { status, analysis, error, refresh } = useProblemAnalysis(problem);

  const badge =
    status === 'loading'
      ? '…'
      : status === 'ready' && analysis
        ? `${analysis.approaches.length} found`
        : null;

  return (
    <CollapsibleSection emoji="🗺️" title="Approaches" badge={badge}>
      {status === 'idle' && (
        <p className="text-[11px] text-gray-500">Waiting for problem…</p>
      )}

      {status === 'loading' && <LoadingState />}

      {status === 'no-key' && (
        <EmptyMessage
          emoji="🔑"
          title="Add your Gemini API key"
          body="Click the LG icon in your toolbar → Settings → paste your key → Save. Then refresh this page."
        />
      )}

      {status === 'validation-error' && (
        <ErrorMessage
          title="Gemini gave a bad response"
          body={error ?? 'Validation failed.'}
          onRetry={refresh}
        />
      )}

      {status === 'error' && (
        <ErrorMessage
          title="Couldn't analyze problem"
          body={error ?? 'Unknown error.'}
          onRetry={refresh}
        />
      )}

      {status === 'ready' && analysis && (
        <div className="flex flex-col gap-2">
          {analysis.approaches.map((a) => (
            <ApproachCard key={a.id} approach={a} />
          ))}
          <p className="text-[10px] text-gray-600 text-center pt-1">
            Cached locally · {new Date(analysis.analyzedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-4">
    <div className="w-6 h-6 rounded-full border-2 border-gray-700 border-t-brand-500 animate-spin" />
    <p className="text-[11px] text-gray-500">Analyzing with Gemini…</p>
  </div>
);

interface EmptyMessageProps {
  emoji: string;
  title: string;
  body: string;
}

const EmptyMessage: React.FC<EmptyMessageProps> = ({ emoji, title, body }) => (
  <div className="flex flex-col items-center text-center gap-1 py-2">
    <div className="text-2xl">{emoji}</div>
    <p className="text-xs font-semibold text-gray-200">{title}</p>
    <p className="text-[11px] text-gray-500 leading-relaxed max-w-[260px]">
      {body}
    </p>
  </div>
);

interface ErrorMessageProps {
  title: string;
  body: string;
  onRetry: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ title, body, onRetry }) => (
  <div className="flex flex-col items-center text-center gap-2 py-2">
    <div className="text-xl">⚠️</div>
    <p className="text-xs font-semibold text-red-400">{title}</p>
    <p className="text-[10px] text-gray-500 leading-relaxed max-w-[260px]">
      {body}
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-1 text-[10px] font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-2"
    >
      Try again
    </button>
  </div>
);