import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the @google/generative-ai module BEFORE importing the service.
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  class GoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  }
  return { GoogleGenerativeAI };
});

import {
  analyzeProblem,
  containsCode,
  GeminiKeyMissingError,
  GeminiValidationError,
  generateHint,
  generateSolution,
  parseAnalysisResponse,
  parseHintResponse,
  parseSolutionResponse,
} from '@/services/gemini';
import { setApiKey, clearApiKey } from '@/services/storage';
import type { Approach, LeetCodeProblem } from '@/types';

const mockProblem: LeetCodeProblem = {
  id: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
  tags: ['Array', 'Hash Table'],
  description:
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  examples: ['Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]'],
  constraints: ['2 <= nums.length <= 10^4'],
  url: 'https://leetcode.com/problems/two-sum/',
};

const goodPayload = {
  approaches: [
    {
      name: 'Brute Force',
      technique: 'Nested Loops',
      type: 'Brute Force',
      timeComplexity: 'O(n^2)',
      spaceComplexity: 'O(1)',
      description: 'Check every pair of numbers to see if they add up to the target.',
      difficultyScore: 1,
    },
    {
      name: 'Hash Map',
      technique: 'Hash Table',
      type: 'Optimal',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      description:
        'Store seen numbers in a hash map and look up the complement in constant time.',
      difficultyScore: 2,
    },
  ],
};

beforeEach(async () => {
  mockGenerateContent.mockReset();
  await clearApiKey();
});

// ─────────────────────────────────────────────
// No-code validator
// ─────────────────────────────────────────────

describe('containsCode', () => {
  it('flags triple backticks', () => {
    expect(containsCode('See the example: ```python ... ```')).toContain('code fence');
  });

  it('flags language keywords', () => {
    expect(containsCode('def two_sum(nums, target):')).toContain('def');
    expect(containsCode('function twoSum(nums) { ... }')).toContain('function');
    expect(containsCode('return nums[i]')).toContain('return');
  });

  it('flags assignment statements', () => {
    expect(containsCode('seen = {}')).toContain('assignment');
  });

  it('passes plain English explanations', () => {
    expect(
      containsCode(
        'Use a hash map to store values you have seen and check the complement.',
      ),
    ).toBeNull();
    expect(containsCode('Iterate through the array once.')).toBeNull();
  });
});

// ─────────────────────────────────────────────
// parseAnalysisResponse
// ─────────────────────────────────────────────

describe('parseAnalysisResponse', () => {
  it('parses a clean JSON response', () => {
    const out = parseAnalysisResponse(mockProblem, JSON.stringify(goodPayload));
    expect(out.approaches).toHaveLength(2);
    expect(out.approaches[0].name).toBe('Brute Force');
    expect(out.approaches[0].id).toBeTruthy();
    expect(out.problem.id).toBe('two-sum');
  });

  it('parses JSON wrapped in ```json fences', () => {
    const wrapped = '```json\n' + JSON.stringify(goodPayload) + '\n```';
    const out = parseAnalysisResponse(mockProblem, wrapped);
    expect(out.approaches).toHaveLength(2);
  });

  it('throws GeminiValidationError on invalid JSON', () => {
    expect(() => parseAnalysisResponse(mockProblem, 'not json at all')).toThrow(
      GeminiValidationError,
    );
  });

  it('throws when approaches array is missing', () => {
    expect(() =>
      parseAnalysisResponse(mockProblem, JSON.stringify({ foo: 'bar' })),
    ).toThrow(GeminiValidationError);
  });

  it('drops approaches that contain code', () => {
    const bad = {
      approaches: [
        ...goodPayload.approaches,
        {
          name: 'Sneaky',
          technique: 'X',
          type: 'Advanced',
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(1)',
          description: 'def twoSum(nums, target): return [i, j]',
          difficultyScore: 3,
        },
      ],
    };
    const out = parseAnalysisResponse(mockProblem, JSON.stringify(bad));
    expect(out.approaches).toHaveLength(2);
    expect(out.approaches.map((a) => a.name)).not.toContain('Sneaky');
  });

  it('throws if fewer than 2 valid approaches survive', () => {
    const bad = {
      approaches: [
        {
          name: 'Only One',
          technique: 'X',
          type: 'Optimal',
          timeComplexity: 'O(n)',
          spaceComplexity: 'O(1)',
          description: 'Use a hash set.',
          difficultyScore: 2,
        },
      ],
    };
    expect(() => parseAnalysisResponse(mockProblem, JSON.stringify(bad))).toThrow(
      GeminiValidationError,
    );
  });

  it('caps approaches at 5', () => {
    const many = {
      approaches: Array.from({ length: 8 }, (_, i) => ({
        name: `Approach ${i}`,
        technique: 'Technique',
        type: 'Optimal',
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        description: 'Plain english description of an approach.',
        difficultyScore: 2,
      })),
    };
    const out = parseAnalysisResponse(mockProblem, JSON.stringify(many));
    expect(out.approaches).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────
// analyzeProblem (integration with mocked SDK)
// ─────────────────────────────────────────────

describe('analyzeProblem', () => {
  it('throws GeminiKeyMissingError when no key is configured', async () => {
    await expect(analyzeProblem(mockProblem)).rejects.toThrow(GeminiKeyMissingError);
  });

  it('returns analysis when SDK responds correctly', async () => {
    await setApiKey('FAKE');
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(goodPayload) },
    });
    const out = await analyzeProblem(mockProblem);
    expect(out.approaches).toHaveLength(2);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('retries once on transient error then succeeds', async () => {
    await setApiKey('FAKE');
    mockGenerateContent
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({
        response: { text: () => JSON.stringify(goodPayload) },
      });
    const out = await analyzeProblem(mockProblem);
    expect(out.approaches).toHaveLength(2);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('does not retry on validation errors', async () => {
    await setApiKey('FAKE');
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'totally not json' },
    });
    await expect(analyzeProblem(mockProblem)).rejects.toThrow(
      GeminiValidationError,
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────
// Hint generation (M3)
// ─────────────────────────────────────────────

const mockApproach: Approach = {
  id: 'approach-1',
  name: 'Hash Map',
  technique: 'Hash Table',
  type: 'Optimal',
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description: 'Use a hash map to look up complements.',
  difficultyScore: 2,
};

describe('parseHintResponse', () => {
  it('returns a clean plain-English hint', () => {
    const raw = JSON.stringify({
      hint: 'Think about how you might trade space for time.',
    });
    expect(parseHintResponse(raw)).toMatch(/trade space for time/);
  });

  it('strips ```json fences', () => {
    const raw =
      '```json\n' + JSON.stringify({ hint: 'A plain hint.' }) + '\n```';
    expect(parseHintResponse(raw)).toBe('A plain hint.');
  });

  it('rejects empty hints', () => {
    expect(() => parseHintResponse(JSON.stringify({ hint: '   ' }))).toThrow(
      GeminiValidationError,
    );
  });

  it('rejects hints that contain code', () => {
    const raw = JSON.stringify({
      hint: 'def two_sum(nums, target): return [i, j]',
    });
    expect(() => parseHintResponse(raw)).toThrow(GeminiValidationError);
  });

  it('rejects hints with code fences', () => {
    const raw = JSON.stringify({ hint: 'See: ```python ...```' });
    expect(() => parseHintResponse(raw)).toThrow(GeminiValidationError);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseHintResponse('not json')).toThrow(GeminiValidationError);
  });
});

describe('generateHint', () => {
  it('throws GeminiKeyMissingError without a key', async () => {
    await expect(
      generateHint(mockProblem, mockApproach, 1, []),
    ).rejects.toThrow(GeminiKeyMissingError);
  });

  it('returns a Hint with the requested level and approachId', async () => {
    await setApiKey('FAKE');
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ hint: 'Lookup is cheap.' }) },
    });
    const hint = await generateHint(mockProblem, mockApproach, 3, []);
    expect(hint.level).toBe(3);
    expect(hint.approachId).toBe('approach-1');
    expect(hint.content).toBe('Lookup is cheap.');
  });

  it('does not retry on validation error (code leak)', async () => {
    await setApiKey('FAKE');
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ hint: 'def solve(): return 0' }) },
    });
    await expect(
      generateHint(mockProblem, mockApproach, 1, []),
    ).rejects.toThrow(GeminiValidationError);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────
// Solution reveal (M5)
// ─────────────────────────────────────────────

const goodSolutionPayload = {
  code: 'def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen: return [seen[target-n], i]\n        seen[n] = i',
  explanation: [
    'Walk through the list once.',
    'For each number, check if its complement (target - number) was already seen.',
    'If yes, return both indices. If no, store the number and its index.',
  ],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  keyTakeaways: [
    'Hash maps turn O(n) lookups into O(1).',
    'A single pass is often enough when you accumulate state.',
  ],
  alternativeApproaches: [
    'Sort first and use two pointers — O(n log n) time, O(1) extra space.',
  ],
};

describe('parseSolutionResponse', () => {
  it('parses a valid solution payload', () => {
    const out = parseSolutionResponse(JSON.stringify(goodSolutionPayload));
    expect(out.code).toContain('def two_sum');
    expect(out.explanation).toHaveLength(3);
    expect(out.timeComplexity).toBe('O(n)');
    expect(out.spaceComplexity).toBe('O(n)');
    expect(out.keyTakeaways).toHaveLength(2);
    expect(out.alternativeApproaches).toHaveLength(1);
  });

  it('strips ```json fences', () => {
    const raw = '```json\n' + JSON.stringify(goodSolutionPayload) + '\n```';
    const out = parseSolutionResponse(raw);
    expect(out.code).toContain('def two_sum');
  });

  it('throws on missing code field', () => {
    expect(() =>
      parseSolutionResponse(JSON.stringify({ ...goodSolutionPayload, code: '' })),
    ).toThrow(GeminiValidationError);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseSolutionResponse('not json')).toThrow(GeminiValidationError);
  });

  it('defaults missing arrays to empty arrays', () => {
    const minimal = { code: 'print("hi")', timeComplexity: 'O(1)', spaceComplexity: 'O(1)' };
    const out = parseSolutionResponse(JSON.stringify(minimal));
    expect(out.explanation).toEqual([]);
    expect(out.keyTakeaways).toEqual([]);
    expect(out.alternativeApproaches).toEqual([]);
  });
});

describe('generateSolution', () => {
  it('throws GeminiKeyMissingError without a key', async () => {
    await expect(
      generateSolution(mockProblem, [mockApproach], 'python'),
    ).rejects.toThrow(GeminiKeyMissingError);
  });

  it('returns a SolutionReveal with one solution for the requested language', async () => {
    await setApiKey('FAKE');
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(goodSolutionPayload) },
    });
    const reveal = await generateSolution(mockProblem, [mockApproach], 'python');
    expect(reveal.problemId).toBe('two-sum');
    expect(reveal.solutions).toHaveLength(1);
    expect(reveal.solutions[0].language).toBe('python');
    expect(reveal.solutions[0].code).toContain('def two_sum');
    expect(reveal.solutions[0].approachId).toBe('approach-1');
    expect(reveal.alternativeApproaches).toHaveLength(1);
  });

  it('attaches the Optimal approach id when multiple approaches exist', async () => {
    await setApiKey('FAKE');
    const brute: Approach = { ...mockApproach, id: 'brute-1', type: 'Brute Force' };
    const optimal: Approach = { ...mockApproach, id: 'opt-2', type: 'Optimal' };
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(goodSolutionPayload) },
    });
    const reveal = await generateSolution(mockProblem, [brute, optimal], 'python');
    expect(reveal.solutions[0].approachId).toBe('opt-2');
  });

  it('does not retry on validation error', async () => {
    await setApiKey('FAKE');
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'totally not json' },
    });
    await expect(
      generateSolution(mockProblem, [mockApproach], 'python'),
    ).rejects.toThrow(GeminiValidationError);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
