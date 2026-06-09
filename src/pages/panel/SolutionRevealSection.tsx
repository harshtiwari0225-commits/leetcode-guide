import React, { useCallback, useEffect, useState } from 'react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useProblemAnalysis } from '@/hooks/useProblemAnalysis';
import {
  GeminiKeyMissingError,
  GeminiValidationError,
  generateSolution,
} from '@/services/gemini';
import { cacheSolution, getCachedSolution } from '@/services/storage';
import { cn } from '@/utils/helpers';
import type {
  LeetCodeProblem,
  ProgrammingLanguage,
  SolutionReveal,
} from '@/types';

interface SolutionRevealSectionProps {
  problem: LeetCodeProblem;
  accepted: boolean;
}

const LANGUAGE_OPTIONS: { value: ProgrammingLanguage; label: string; emoji: string }[] = [
  { value: 'python', label: 'Python', emoji: '🐍' },
  { value: 'javascript', label: 'JavaScript', emoji: '🟨' },
  { value: 'java', label: 'Java', emoji: '☕' },
  { value: 'cpp', label: 'C++', emoji: '⚡' },
  { value: 'c', label: 'C', emoji: '🔧' },
];

type RevealStatus = 'idle' | 'loading' | 'ready' | 'no-key' | 'error';

export const SolutionRevealSection: React.FC<SolutionRevealSectionProps> = ({
  problem,
  accepted,
}) => {
  const { analysis } = useProblemAnalysis(problem);
  const [language, setLanguage] = useState<ProgrammingLanguage>('python');
  const [reveal, setReveal] = useState<SolutionReveal | null>(null);
  const [status, setStatus] = useState<RevealStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Whenever the problem or language changes, look up the cache.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await getCachedSolution(problem.id, language);
      if (cancelled) return;
      setReveal(cached);
      setStatus(cached ? 'ready' : 'idle');
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [problem.id, language]);

  const fetchSolution = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await generateSolution(
        problem,
        analysis?.approaches ?? [],
        language,
      );
      await cacheSolution(language, result);
      setReveal(result);
      setStatus('ready');
    } catch (err) {
      if (err instanceof GeminiKeyMissingError) {
        setStatus('no-key');
        setError(err.message);
      } else if (err instanceof GeminiValidationError) {
        setStatus('error');
        setError(err.message);
      } else {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }, [problem, analysis, language]);

  const handleCopy = async () => {
    if (!reveal?.solutions[0]) return;
    try {
      await navigator.clipboard.writeText(reveal.solutions[0].code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied — fail silently */
    }
  };

  // Locked state (no Accepted yet)
  if (!accepted) {
    return (
      <CollapsibleSection emoji="🔓" title="Solution reveal" badge="🔒 locked">
        <div className="flex flex-col items-center text-center gap-2 py-3">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
            🔒
          </div>
          <p className="text-xs font-semibold text-gray-300">
            Solution is locked
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed max-w-[260px]">
            Submit an{' '}
            <span className="text-green-400 font-medium">Accepted</span> answer
            on LeetCode to unlock the ideal solution and explanation.
          </p>
          <p className="text-[10px] text-green-400 mt-1">
            💪 Keep working at it — you've got this.
          </p>
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection emoji="🔓" title="Solution reveal" badge="✅ unlocked">
      <div className="flex flex-col gap-3">
        {/* Accepted banner */}
        <div className="bg-green-900/20 border border-green-700/40 rounded-md p-2.5 flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <div>
            <p className="text-[11px] font-bold text-green-400">
              Solution Accepted!
            </p>
            <p className="text-[10px] text-gray-400">
              You earned the right to see the reference solution.
            </p>
          </div>
        </div>

        {/* Language picker */}
        <div>
          <p className="text-[10px] text-gray-500 mb-1">Language:</p>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors',
                  language === opt.value
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500',
                )}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action area */}
        {status === 'idle' && !reveal && (
          <button
            type="button"
            onClick={fetchSolution}
            className="w-full px-3 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold rounded-md transition-colors"
          >
            🔓 Reveal solution in {LANGUAGE_OPTIONS.find((o) => o.value === language)?.label}
          </button>
        )}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-4 h-4 rounded-full border-2 border-gray-700 border-t-brand-500 animate-spin" />
            <p className="text-[11px] text-gray-500">Generating solution…</p>
          </div>
        )}

        {status === 'no-key' && (
          <p className="text-[11px] text-yellow-400 text-center py-2">
            🔑 Add your Gemini API key in the popup Settings.
          </p>
        )}

        {status === 'error' && (
          <div className="text-center py-2">
            <p className="text-[11px] text-red-400">⚠️ {error}</p>
            <button
              type="button"
              onClick={fetchSolution}
              className="mt-1 text-[10px] font-semibold text-brand-400 hover:text-brand-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Solution display */}
        {reveal && reveal.solutions[0] && (
          <SolutionBody
            solution={reveal.solutions[0]}
            alternatives={reveal.alternativeApproaches}
            onCopy={handleCopy}
            copied={copied}
            onRegenerate={fetchSolution}
          />
        )}
      </div>
    </CollapsibleSection>
  );
};

// ─────────────────────────────────────────────
// Subcomponent: solution body (code + explanation + takeaways)
// ─────────────────────────────────────────────

interface SolutionBodyProps {
  solution: {
    code: string;
    explanation: string[];
    timeComplexity: string;
    spaceComplexity: string;
    keyTakeaways: string[];
  };
  alternatives: string[];
  onCopy: () => void;
  copied: boolean;
  onRegenerate: () => void;
}

const SolutionBody: React.FC<SolutionBodyProps> = ({
  solution,
  alternatives,
  onCopy,
  copied,
  onRegenerate,
}) => {
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {/* Code block */}
      <div className="bg-gray-950 border border-gray-700/40 rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-900/80 border-b border-gray-700/40">
          <span className="text-[10px] font-mono text-gray-500">Solution</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="text-[10px] font-semibold text-gray-400 hover:text-brand-400 transition-colors"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              title="Regenerate (costs an API call)"
              className="text-[10px] font-semibold text-gray-400 hover:text-brand-400 transition-colors"
            >
              ⟳
            </button>
          </div>
        </div>
        <pre className="text-[11px] font-mono text-gray-200 p-2.5 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed custom-scrollbar">
          <code>{solution.code}</code>
        </pre>
      </div>

      {/* Complexity */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-500">Time:</span>
        <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-300">
          {solution.timeComplexity}
        </code>
        <span className="text-[10px] text-gray-500">Space:</span>
        <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-300">
          {solution.spaceComplexity}
        </code>
      </div>

      {/* Explanation */}
      {solution.explanation.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowExplanation((v) => !v)}
            aria-expanded={showExplanation}
            className="text-[10px] font-semibold text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
          >
            <span>{showExplanation ? '▼' : '▶'}</span>
            Step-by-step explanation
          </button>
          {showExplanation && (
            <ol className="mt-2 space-y-1.5 bg-gray-900/40 border-l-2 border-l-blue-500/50 border border-gray-700/40 rounded-md p-2.5">
              {solution.explanation.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] text-gray-300 leading-relaxed"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center flex-shrink-0 text-[9px] font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Key takeaways */}
      {solution.keyTakeaways.length > 0 && (
        <div className="bg-brand-500/5 border border-brand-500/30 rounded-md p-2.5">
          <p className="text-[10px] font-semibold text-brand-400 mb-1.5">
            🎯 Key takeaways
          </p>
          <ul className="space-y-1">
            {solution.keyTakeaways.map((t, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11px] text-gray-300"
              >
                <span className="text-brand-400 mt-0.5">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="bg-gray-800/30 border border-gray-700/40 rounded-md p-2.5">
          <p className="text-[10px] font-semibold text-gray-300 mb-1.5">
            🔀 Other approaches you could explore
          </p>
          <ul className="space-y-1">
            {alternatives.map((alt, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11px] text-gray-400"
              >
                <span className="text-brand-400 mt-0.5">→</span>
                <span>{alt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
