import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  accrueTimeSpent,
  addApproachExplored,
  computeGlobalStats,
  getAllProgress,
  getProgress,
  incrementHintsUsed,
  markSolved,
  resetAllProgress,
  touchProblem,
} from '@/services/progress';

const ONE_DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('progress — touchProblem', () => {
  it('creates a fresh record on first call', async () => {
    const rec = await touchProblem('two-sum', 'Two Sum', 'Easy');
    expect(rec.problemId).toBe('two-sum');
    expect(rec.status).toBe('attempted');
    expect(rec.hintsUsed).toBe(0);
    expect(rec.attempts).toBe(0);
    expect(rec.startedAt).toBeGreaterThan(0);
  });

  it('preserves counters on subsequent calls', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await incrementHintsUsed('two-sum');
    await incrementHintsUsed('two-sum');
    const rec = await touchProblem('two-sum', 'Two Sum', 'Easy');
    expect(rec.hintsUsed).toBe(2);
  });
});

describe('progress — counters', () => {
  it('incrementHintsUsed increments the counter', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await incrementHintsUsed('two-sum');
    await incrementHintsUsed('two-sum');
    expect((await getProgress('two-sum'))!.hintsUsed).toBe(2);
  });

  it('addApproachExplored deduplicates', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await addApproachExplored('two-sum', 'a1');
    await addApproachExplored('two-sum', 'a2');
    await addApproachExplored('two-sum', 'a1');
    expect((await getProgress('two-sum'))!.approachesExplored).toEqual([
      'a1',
      'a2',
    ]);
  });

  it('accrueTimeSpent sums up seconds', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await accrueTimeSpent('two-sum', 12);
    await accrueTimeSpent('two-sum', 18);
    expect((await getProgress('two-sum'))!.timeSpentSeconds).toBe(30);
  });

  it('accrueTimeSpent ignores 0 or negative', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await accrueTimeSpent('two-sum', 0);
    await accrueTimeSpent('two-sum', -5);
    expect((await getProgress('two-sum'))!.timeSpentSeconds).toBe(0);
  });

  it('counter calls on missing slug are no-ops', async () => {
    await incrementHintsUsed('ghost'); // no throw
    expect(await getProgress('ghost')).toBeNull();
  });
});

describe('progress — markSolved', () => {
  it('flips status and records solvedAt + approach', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await markSolved('two-sum', 'approach-1');
    const rec = await getProgress('two-sum');
    expect(rec!.status).toBe('solved');
    expect(rec!.solvedAt).toBeGreaterThan(0);
    expect(rec!.solvedWithApproach).toBe('approach-1');
  });

  it('is idempotent', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await markSolved('two-sum', 'a1');
    const first = await getProgress('two-sum');
    await markSolved('two-sum', 'a2'); // second call shouldn't overwrite
    const second = await getProgress('two-sum');
    expect(second!.solvedWithApproach).toBe(first!.solvedWithApproach);
  });
});

describe('progress — getAllProgress / computeGlobalStats', () => {
  it('returns empty stats with no records', async () => {
    const stats = await computeGlobalStats();
    expect(stats.totalProblems).toBe(0);
    expect(stats.solvedProblems).toBe(0);
    expect(stats.totalHintsUsed).toBe(0);
    expect(stats.streakDays).toBe(0);
  });

  it('aggregates across multiple problems', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await incrementHintsUsed('two-sum');
    await incrementHintsUsed('two-sum');
    await markSolved('two-sum', 'a1');

    await touchProblem('add-two-numbers', 'Add Two Numbers', 'Medium');
    await incrementHintsUsed('add-two-numbers');

    const stats = await computeGlobalStats();
    expect(stats.totalProblems).toBe(2);
    expect(stats.solvedProblems).toBe(1);
    expect(stats.attemptedProblems).toBe(1);
    expect(stats.totalHintsUsed).toBe(3);
    expect(stats.averageHintsPerProblem).toBe(1.5);
  });

  it('computes streak across consecutive days', async () => {
    // Day 1 — 3 days ago
    vi.setSystemTime(new Date(Date.now() - 2 * ONE_DAY));
    await touchProblem('p1', 'Problem 1', 'Easy');
    // Day 2 — yesterday
    vi.setSystemTime(new Date(Date.now() + ONE_DAY));
    await touchProblem('p2', 'Problem 2', 'Easy');
    // Day 3 — today
    vi.setSystemTime(new Date(Date.now() + ONE_DAY));
    await touchProblem('p3', 'Problem 3', 'Easy');

    const stats = await computeGlobalStats();
    expect(stats.streakDays).toBe(3);
  });

  it('streak resets when last active was not today/yesterday', async () => {
    // Last activity was 5 days ago — streak should be 0.
    vi.setSystemTime(new Date(Date.now() - 5 * ONE_DAY));
    await touchProblem('p1', 'P1', 'Easy');

    vi.setSystemTime(new Date(Date.now() + 5 * ONE_DAY));
    const stats = await computeGlobalStats();
    expect(stats.streakDays).toBe(0);
  });
});

describe('progress — resetAllProgress', () => {
  it('wipes records but keeps the function safe with empty index', async () => {
    await touchProblem('two-sum', 'Two Sum', 'Easy');
    await touchProblem('add-two-numbers', 'Add Two Numbers', 'Medium');
    expect((await getAllProgress()).length).toBe(2);

    await resetAllProgress();
    expect((await getAllProgress()).length).toBe(0);

    // Idempotent — second call shouldn't error.
    await resetAllProgress();
    expect((await getAllProgress()).length).toBe(0);
  });
});