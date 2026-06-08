/**
 * Per-problem progress tracking + global stats (M4).
 *
 * Wires into M2/M3 flows:
 *  - Analysis ready  → `touchProblem()` to ensure a record exists.
 *  - Hint requested  → `incrementHintsUsed()` + `addApproachExplored()`.
 *  - Page visible    → `accrueTimeSpent()` every N seconds.
 *
 * Solved status (`status = 'solved'`, `solvedWithApproach`) is wired in M5
 * once we have Accepted-submission detection.
 */

import type {
  Difficulty,
  GlobalStats,
  ProblemProgress,
} from '@/types';

// ─────────────────────────────────────────────
// Storage helpers (kept local to avoid circular import with storage.ts)
// ─────────────────────────────────────────────

const KEYS = {
  progress: (slug: string) => `progress:${slug}`,
  progressIndex: 'progress_index',
} as const;

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
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });

// ─────────────────────────────────────────────
// Progress index — tracks which slugs have records
// ─────────────────────────────────────────────

const getProgressIndex = async (): Promise<string[]> =>
  (await get<string[]>(KEYS.progressIndex)) ?? [];

const addToProgressIndex = async (slug: string): Promise<void> => {
  const idx = await getProgressIndex();
  if (idx.includes(slug)) return;
  await set(KEYS.progressIndex, [...idx, slug]);
};

// ─────────────────────────────────────────────
// Core CRUD
// ─────────────────────────────────────────────

export const getProgress = async (
  slug: string,
): Promise<ProblemProgress | null> => get<ProblemProgress>(KEYS.progress(slug));

const writeProgress = async (record: ProblemProgress): Promise<void> => {
  await set(KEYS.progress(record.problemId), record);
  await addToProgressIndex(record.problemId);
};

/**
 * Ensure a progress record exists for this problem. Creates a fresh one if
 * none exists; otherwise touches `lastUpdatedAt`. Returns the (current) record.
 */
export const touchProblem = async (
  slug: string,
  title: string,
  difficulty: Difficulty,
): Promise<ProblemProgress> => {
  const existing = await getProgress(slug);
  if (existing) {
    const updated: ProblemProgress = {
      ...existing,
      // Title may have changed (LeetCode renames are rare but possible).
      problemTitle: title || existing.problemTitle,
      difficulty: difficulty || existing.difficulty,
      lastUpdatedAt: Date.now(),
    };
    await writeProgress(updated);
    return updated;
  }
  const fresh: ProblemProgress = {
    problemId: slug,
    problemTitle: title,
    difficulty,
    status: 'attempted',
    hintsUsed: 0,
    attempts: 0,
    timeSpentSeconds: 0,
    approachesExplored: [],
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };
  await writeProgress(fresh);
  return fresh;
};

export const incrementHintsUsed = async (slug: string): Promise<void> => {
  const cur = await getProgress(slug);
  if (!cur) return;
  await writeProgress({
    ...cur,
    hintsUsed: cur.hintsUsed + 1,
    lastUpdatedAt: Date.now(),
  });
};

export const addApproachExplored = async (
  slug: string,
  approachId: string,
): Promise<void> => {
  const cur = await getProgress(slug);
  if (!cur) return;
  if (cur.approachesExplored.includes(approachId)) return;
  await writeProgress({
    ...cur,
    approachesExplored: [...cur.approachesExplored, approachId],
    lastUpdatedAt: Date.now(),
  });
};

export const accrueTimeSpent = async (
  slug: string,
  seconds: number,
): Promise<void> => {
  if (seconds <= 0) return;
  const cur = await getProgress(slug);
  if (!cur) return;
  await writeProgress({
    ...cur,
    timeSpentSeconds: cur.timeSpentSeconds + Math.round(seconds),
    lastUpdatedAt: Date.now(),
  });
};

/** Marked by M5 (Accepted submission detection). Kept here so types align. */
export const markSolved = async (
  slug: string,
  approachId?: string,
): Promise<void> => {
  const cur = await getProgress(slug);
  if (!cur) return;
  if (cur.status === 'solved') return;
  await writeProgress({
    ...cur,
    status: 'solved',
    solvedAt: Date.now(),
    solvedWithApproach: approachId ?? cur.solvedWithApproach,
    lastUpdatedAt: Date.now(),
  });
};

// ─────────────────────────────────────────────
// Aggregations
// ─────────────────────────────────────────────

export const getAllProgress = async (): Promise<ProblemProgress[]> => {
  const idx = await getProgressIndex();
  const records = await Promise.all(idx.map((slug) => getProgress(slug)));
  return records.filter((r): r is ProblemProgress => r !== null);
};

const dayKey = (ts: number): string => new Date(ts).toISOString().slice(0, 10);

const computeStreak = (sortedDates: string[]): number => {
  if (sortedDates.length === 0) return 0;
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 24 * 60 * 60 * 1000);
  // Streak counts only if the most-recent active day is today or yesterday.
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
};

export const computeGlobalStats = async (): Promise<GlobalStats> => {
  const records = await getAllProgress();
  const solved = records.filter((r) => r.status === 'solved');
  const attempted = records.filter((r) => r.status === 'attempted');

  const totalHintsUsed = records.reduce((s, r) => s + r.hintsUsed, 0);
  const totalAttempts = solved.reduce((s, r) => s + r.attempts, 0);

  const avgAttempts =
    solved.length > 0 ? Math.round((totalAttempts / solved.length) * 10) / 10 : 0;
  const avgHints =
    records.length > 0
      ? Math.round((totalHintsUsed / records.length) * 10) / 10
      : 0;

  // Active-day set, descending.
  const activeDays = Array.from(
    new Set(records.map((r) => dayKey(r.lastUpdatedAt))),
  ).sort((a, b) => (a < b ? 1 : -1));

  return {
    totalProblems: records.length,
    solvedProblems: solved.length,
    attemptedProblems: attempted.length,
    totalHintsUsed,
    averageAttemptsBeforeSolve: avgAttempts,
    averageHintsPerProblem: avgHints,
    techniquesLearned: {}, // populated in a later milestone if useful
    streakDays: computeStreak(activeDays),
    lastActiveDateStr: activeDays[0] ?? '',
  };
};

// ─────────────────────────────────────────────
// Bulk reset (popup → "Reset all progress")
// ─────────────────────────────────────────────

export const resetAllProgress = async (): Promise<void> => {
  const idx = await getProgressIndex();
  const keys = [
    KEYS.progressIndex,
    ...idx.map((slug) => KEYS.progress(slug)),
  ];
  await new Promise<void>((resolve) =>
    chrome.storage.local.remove(keys, () => resolve()),
  );
};