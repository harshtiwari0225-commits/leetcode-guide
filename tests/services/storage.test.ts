import { describe, it, expect } from 'vitest';
import {
  cacheAnalysis,
  clearAllLocalData,
  clearApiKey,
  getApiKey,
  getCachedAnalysis,
  setApiKey,
} from '@/services/storage';
import type { ProblemAnalysis } from '@/types';

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