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

import type {
  Hint,
  HintLevel,
  HintSession,
  ProblemAnalysis,
  ProgrammingLanguage,
  SolutionReveal,
} from '@/types';

// ─────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────

const KEYS = {
  apiKey: 'gemini_api_key',
  analysis: (slug: string) => `analysis:${slug}`,
  hints: (slug: string, approachId: string) =>
    `hints:${slug}:${approachId}`,
  solution: (slug: string, language: string) =>
    `solution:${slug}:${language}`,
  problemIndex: 'problem_index',
  panelWidth: 'ui:panel_width',
  panelHeight: 'ui:panel_height',
  fontLevel: 'ui:font_level',
  tabTop: 'ui:tab_top',
  panelSide: 'ui:panel_side',
  theme: 'ui:theme',
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
// Solution reveal cache (M5)
// One entry per (slug, language) — generating in another language costs
// another API call but caches independently.
// ─────────────────────────────────────────────

export const getCachedSolution = async (
  slug: string,
  language: ProgrammingLanguage,
): Promise<SolutionReveal | null> =>
  get<SolutionReveal>(KEYS.solution(slug, language));

export const cacheSolution = async (
  language: ProgrammingLanguage,
  reveal: SolutionReveal,
): Promise<void> => {
  await set(KEYS.solution(reveal.problemId, language), reveal);
};

// ─────────────────────────────────────────────
// UI preferences (M7a) — panel width, collapsed sections, etc.
// ─────────────────────────────────────────────

export const getPanelWidth = (): Promise<number | null> =>
  get<number>(KEYS.panelWidth);

export const setPanelWidth = (px: number): Promise<void> =>
  set(KEYS.panelWidth, Math.round(px));

export const getPanelHeight = (): Promise<number | null> =>
  get<number>(KEYS.panelHeight);

export const setPanelHeight = (px: number): Promise<void> =>
  set(KEYS.panelHeight, Math.round(px));

export const getFontLevel = (): Promise<number | null> =>
  get<number>(KEYS.fontLevel);

export const setFontLevel = (level: number): Promise<void> =>
  set(KEYS.fontLevel, level);

export const getTabTop = (): Promise<number | null> =>
  get<number>(KEYS.tabTop);

export const setTabTop = (px: number): Promise<void> =>
  set(KEYS.tabTop, Math.round(px));

export type PanelSide = 'left' | 'right';

export const getPanelSide = (): Promise<PanelSide | null> =>
  get<PanelSide>(KEYS.panelSide);

export const setPanelSideStored = (side: PanelSide): Promise<void> =>
  set(KEYS.panelSide, side);

export type ThemePreference = 'auto' | 'light' | 'dark';

export const getThemePreference = (): Promise<ThemePreference | null> =>
  get<ThemePreference>(KEYS.theme);

export const setThemePreference = (theme: ThemePreference): Promise<void> =>
  set(KEYS.theme, theme);

// ─────────────────────────────────────────────
// Bulk reset (user-triggered in M4 popup; useful for tests)
// ─────────────────────────────────────────────

export const clearAllLocalData = (): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.local.clear(() => resolve());
  });
