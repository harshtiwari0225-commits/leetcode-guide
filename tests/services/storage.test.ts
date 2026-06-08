import { describe, it, expect } from 'vitest';
import {
  appendHint,
  cacheAnalysis,
  clearAllLocalData,
  clearApiKey,
  getApiKey,
  getCachedAnalysis,
  getHintSession,
  setApiKey,
} from '@/services/storage';
import type { Hint, ProblemAnalysis } from '@/types';

const fixtureAnalysis = (slug: string, ageMs = 0): ProblemAnalysis => ({
  problem: {
    id: slug,
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array'],
    description: 'desc',
    examples: [],
    constraints: [],
    url: `https://leetcode.com/problems/${slug}/`,
  },
  approaches: [
    {
      id: 'a1',
      name: 'Hash Map',
      technique: 'Hash Table',
      type: 'Optimal',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      description: 'Lookup complements in O(1).',
      difficultyScore: 2,
    },
  ],
  analyzedAt: Date.now() - ageMs,
  cacheKey: slug,
});

const makeHint = (level: 1 | 2 | 3 | 4 | 5, content: string): Hint => ({
  level,
  content,
  approachId: 'a1',
  generatedAt: Date.now(),
});

// ─────────────────────────────────────────────
// API key
// ─────────────────────────────────────────────

describe('storage — API key', () => {
  it('round-trips an API key', async () => {
    expect(await getApiKey()).toBeNull();
    await setApiKey('AIzaSy_TEST_KEY');
    expect(await getApiKey()).toBe('AIzaSy_TEST_KEY');
    await clearApiKey();
    expect(await getApiKey()).toBeNull();
  });

  it('trims whitespace on save', async () => {
    await setApiKey('   padded-key   ');
    expect(await getApiKey()).toBe('padded-key');
  });
});

// ─────────────────────────────────────────────
// Analysis cache
// ─────────────────────────────────────────────

describe('storage — analysis cache', () => {
  it('returns null for unknown slug', async () => {
    expect(await getCachedAnalysis('unknown')).toBeNull();
  });

  it('round-trips a fresh analysis', async () => {
    await cacheAnalysis(fixtureAnalysis('two-sum'));
    const out = await getCachedAnalysis('two-sum');
    expect(out).not.toBeNull();
    expect(out!.problem.id).toBe('two-sum');
    expect(out!.approaches).toHaveLength(1);
  });

  it('expires entries older than 7 days', async () => {
    const eightDays = 8 * 24 * 60 * 60 * 1000;
    await cacheAnalysis(fixtureAnalysis('stale', eightDays));
    expect(await getCachedAnalysis('stale')).toBeNull();
  });

  it('clearAllLocalData wipes everything', async () => {
    await setApiKey('K');
    await cacheAnalysis(fixtureAnalysis('x'));
    await clearAllLocalData();
    expect(await getApiKey()).toBeNull();
    expect(await getCachedAnalysis('x')).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Hint sessions (M3)
// ─────────────────────────────────────────────

describe('storage — hint sessions', () => {
  it('returns null for an unknown session', async () => {
    expect(await getHintSession('two-sum', 'a1')).toBeNull();
  });

  it('appends hints and sorts them by level', async () => {
    await appendHint('two-sum', 'a1', makeHint(2, 'Category hint'));
    await appendHint('two-sum', 'a1', makeHint(1, 'Vague hint'));

    const session = await getHintSession('two-sum', 'a1');
    expect(session).not.toBeNull();
    expect(session!.hintsRevealed).toEqual([1, 2]);
    expect(session!.hints.map((h) => h.level)).toEqual([1, 2]);
  });

  it('replaces an existing hint when same level is appended again', async () => {
    await appendHint('two-sum', 'a1', makeHint(1, 'first version'));
    await appendHint('two-sum', 'a1', makeHint(1, 'second version'));

    const session = await getHintSession('two-sum', 'a1');
    expect(session!.hints).toHaveLength(1);
    expect(session!.hints[0].content).toBe('second version');
    expect(session!.hintsRevealed).toEqual([1]);
  });

  it('keeps sessions per approach independent', async () => {
    await appendHint('two-sum', 'a1', makeHint(1, 'for a1'));
    await appendHint('two-sum', 'a2', makeHint(1, 'for a2'));

    const s1 = await getHintSession('two-sum', 'a1');
    const s2 = await getHintSession('two-sum', 'a2');
    expect(s1!.hints[0].content).toBe('for a1');
    expect(s2!.hints[0].content).toBe('for a2');
  });
});