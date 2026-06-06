import { describe, it, expect } from 'vitest';
import type { LeetCodeProblem, HintLevel } from '@/types';

describe('M0 smoke test', () => {
  it('types compile and chrome.storage mock is wired', async () => {
    const problem: LeetCodeProblem = {
      id: 'two-sum',
      title: 'Two Sum',
      difficulty: 'Easy',
      tags: ['Array'],
      description: 'Find two numbers that add up to target.',
      examples: [],
      constraints: [],
      url: 'https://leetcode.com/problems/two-sum/',
    };
    expect(problem.id).toBe('two-sum');

    const level: HintLevel = 3;
    expect(level).toBeGreaterThanOrEqual(1);

    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ ping: 'pong' }, () => resolve());
    });
    const value = await new Promise<unknown>((resolve) => {
      chrome.storage.local.get('ping', (r) => resolve(r.ping));
    });
    expect(value).toBe('pong');
  });
});