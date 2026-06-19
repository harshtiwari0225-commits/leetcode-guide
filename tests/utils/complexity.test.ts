import { describe, it, expect } from 'vitest';
import { compareComplexity, complexityRank } from '@/utils/complexity';

describe('complexityRank', () => {
  it('ranks standard complexities in order', () => {
    expect(complexityRank('O(1)')).toBeLessThan(complexityRank('O(log n)'));
    expect(complexityRank('O(log n)')).toBeLessThan(complexityRank('O(n)'));
    expect(complexityRank('O(n)')).toBeLessThan(complexityRank('O(n log n)'));
    expect(complexityRank('O(n log n)')).toBeLessThan(complexityRank('O(n^2)'));
    expect(complexityRank('O(n^2)')).toBeLessThan(complexityRank('O(2^n)'));
    expect(complexityRank('O(2^n)')).toBeLessThan(complexityRank('O(n!)'));
  });

  it('treats O(n²) and O(n^2) and O(n**2) as the same', () => {
    expect(complexityRank('O(n²)')).toBe(complexityRank('O(n^2)'));
    expect(complexityRank('O(n^2)')).toBe(complexityRank('O(n**2)'));
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    expect(complexityRank('o(N LOG N)')).toBe(complexityRank('O(n log n)'));
    expect(complexityRank('  O( n )  ')).toBe(complexityRank('O(n)'));
  });

  it('returns a high "unknown" rank for unrecognised input', () => {
    expect(complexityRank('quack')).toBeGreaterThan(complexityRank('O(n!)'));
    expect(complexityRank('')).toBeGreaterThan(complexityRank('O(n!)'));
  });

  it('ranks higher-degree polynomials O(n^4)..O(n^9) above O(n³)', () => {
    expect(complexityRank('O(n^4)')).toBeGreaterThan(complexityRank('O(n^3)'));
    expect(complexityRank('O(n^5)')).toBeGreaterThan(complexityRank('O(n^4)'));
    expect(complexityRank('O(n^9)')).toBeGreaterThan(complexityRank('O(n^5)'));
    // But still under exponential.
    expect(complexityRank('O(n^9)')).toBeLessThan(complexityRank('O(2^n)'));
  });

  it('handles unicode superscript polynomials (O(n⁴))', () => {
    expect(complexityRank('O(n⁴)')).toBe(complexityRank('O(n^4)'));
    expect(complexityRank('O(n⁵)')).toBe(complexityRank('O(n^5)'));
  });
});

describe('compareComplexity', () => {
  it('returns "better" when a is faster than b', () => {
    expect(compareComplexity('O(n)', 'O(n^2)')).toBe('better');
    expect(compareComplexity('O(log n)', 'O(n)')).toBe('better');
  });

  it('returns "worse" when a is slower than b', () => {
    expect(compareComplexity('O(n^2)', 'O(n)')).toBe('worse');
    expect(compareComplexity('O(2^n)', 'O(n!)')).toBe('better');
    expect(compareComplexity('O(n!)', 'O(2^n)')).toBe('worse');
  });

  it('returns "equal" for identical complexities', () => {
    expect(compareComplexity('O(n)', 'O(n)')).toBe('equal');
    expect(compareComplexity('O(n²)', 'O(n^2)')).toBe('equal');
  });

  it('returns "unknown" when either side is unrecognised', () => {
    expect(compareComplexity('O(n)', 'mystery')).toBe('unknown');
    expect(compareComplexity('mystery', 'O(n)')).toBe('unknown');
  });

  it('correctly ranks O(n^4) vs O(n^3) as worse (the original bug)', () => {
    expect(compareComplexity('O(n^4)', 'O(n^3)')).toBe('worse');
    expect(compareComplexity('O(n^3)', 'O(n^4)')).toBe('better');
  });
});
