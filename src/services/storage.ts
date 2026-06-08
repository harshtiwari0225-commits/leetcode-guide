/**
 * chrome.storage.local wrapper.
 *
 * M2 surface:
 *  - API key persistence (popup writes, gemini service reads)
 *  - Analysis cache keyed by problem slug, 7-day TTL
 *  - "Problem index" of all slugs we've ever seen (used by M4 dashboard)
 *
 * M4 will add progress records (hints used, attempts, solved status, stats).
 */

import type { Hint, HintLevel, HintSession, ProblemAnalysis } from '@/types';

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────

const KEYS = {
  apiKey: 'gemini_api_key',
  analysis: (slug: string) => `analysis:${slug}`,
  hints: (slug: string, approachId: string) =>
    `hints:${slug}:${approachId}`,
  problemIndex: 'problem_index',
} as const;

// ─────────────────────────────────────────────
// Generic chrome.storage.local helpers (promisified)
// ─────────────────────────────────────────────

const get = <T,>(key: string): Promise<T | null> =>
  new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve((result[key] as T) ?? null);
    });
  });

const set = <T,>(key: string, value: T): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
      } else {
        resolve();
      }
    });
  });

const remove = (key: string): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.local.remove(key, () => resolve());
  });

// ─────────────────────────────────────────────
// API key
// ─────────────────────────────────────────────

export const getApiKey = (): Promise<string | null> => get<string>(KEYS.apiKey);

export const setApiKey = (key: string): Promise<void> =>
  set(KEYS.apiKey, key.trim());

export const clearApiKey = (): Promise<void> => remove(KEYS.apiKey);

// ─────────────────────────────────────────────
// Analysis cache (7-day TTL)
// ─────────────────────────────────────────────

const ANALYSIS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const getCachedAnalysis = async (
  slug: string,
): Promise<ProblemAnalysis | null> => {
  const cached = await get<ProblemAnalysis>(KEYS.analysis(slug));
  if (!cached) return null;
  if (Date.now() - cached.analyzedAt > ANALYSIS_TTL_MS) {
    await remove(KEYS.analysis(slug));
    return null;
  }
  return cached;
};

export const cacheAnalysis = async (
  analysis: ProblemAnalysis,
): Promise<void> => {
  await set(KEYS.analysis(analysis.problem.id), analysis);
  await addToProblemIndex(analysis.problem.id);
};

// ─────────────────────────────────────────────
// Problem index (for the M4 dashboard)
// ─────────────────────────────────────────────

const getProblemIndex = async (): Promise<string[]> =>
  (await get<string[]>(KEYS.problemIndex)) ?? [];

const addToProblemIndex = async (slug: string): Promise<void> => {
  const idx = await getProblemIndex();
  if (idx.includes(slug)) return;
  await set(KEYS.problemIndex, [...idx, slug]);
};

// ─────────────────────────────────────────────
// Hint sessions (one per problem × approach)
// ─────────────────────────────────────────────

export const getHintSession = async (
  slug: string,
  approachId: string,
): Promise<HintSession | null> =>
  get<HintSession>(KEYS.hints(slug, approachId));

export const appendHint = async (
  slug: string,
  approachId: string,
  hint: Hint,
): Promise<HintSession> => {
  const existing =
    (await get<HintSession>(KEYS.hints(slug, approachId))) ?? {
      problemId: slug,
      approachId,
      hintsRevealed: [] as HintLevel[],
      hints: [] as Hint[],
    };
  // Replace existing hint at same level if user re-requests (defensive).
  const filteredHints = existing.hints.filter((h) => h.level !== hint.level);
  const filteredLevels = existing.hintsRevealed.filter((l) => l !== hint.level);
  const next: HintSession = {
    ...existing,
    hintsRevealed: [...filteredLevels, hint.level].sort((a, b) => a - b),
    hints: [...filteredHints, hint].sort((a, b) => a.level - b.level),
  };
  await set(KEYS.hints(slug, approachId), next);
  return next;
};

// ─────────────────────────────────────────────
// Bulk reset (user-triggered in M4 popup; useful for tests)
// ─────────────────────────────────────────────

export const clearAllLocalData = (): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.local.clear(() => resolve());
  });