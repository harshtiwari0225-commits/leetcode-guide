/**
 * Lightweight Big-O complexity comparator for the Approach Comparison view.
 *
 * Maps a complexity string like "O(n log n)" to a numeric rank so we can
 * compare two approaches without forcing the user to eyeball them.
 *
 * Ranks are intentionally coarse — we don't try to handle every academic
 * subtlety. The goal is "is this clearly faster/slower than the other?"
 */

const RANK_TABLE: Array<{ pattern: RegExp; rank: number; label: string }> = [
  { pattern: /^o\(\s*1\s*\)$/, rank: 0, label: 'O(1)' },
  { pattern: /^o\(\s*log\s*\*?\s*n?\s*\)$/, rank: 5, label: 'O(log* n)' },
  { pattern: /^o\(\s*log\s*log\s*n\s*\)$/, rank: 7, label: 'O(log log n)' },
  { pattern: /^o\(\s*log\s*n\s*\)$/, rank: 10, label: 'O(log n)' },
  { pattern: /^o\(\s*sqrt\s*\(?\s*n\s*\)?\s*\)$/, rank: 15, label: 'O(√n)' },
  { pattern: /^o\(\s*n\s*\)$/, rank: 20, label: 'O(n)' },
  { pattern: /^o\(\s*n\s*log\s*n\s*\)$/, rank: 25, label: 'O(n log n)' },
  { pattern: /^o\(\s*n\s*\*?\s*log\s*\^?\s*2\s*n\s*\)$/, rank: 27, label: 'O(n log² n)' },
  { pattern: /^o\(\s*n\s*\^?\s*2\s*\)$/, rank: 30, label: 'O(n²)' },
  { pattern: /^o\(\s*n\s*\^?\s*2\s*log\s*n\s*\)$/, rank: 33, label: 'O(n² log n)' },
  { pattern: /^o\(\s*n\s*\^?\s*3\s*\)$/, rank: 40, label: 'O(n³)' },
  // Generic O(n^k) where k is a literal letter k => uncertain; bucket high.
  { pattern: /^o\(\s*n\s*\^?\s*k\s*\)$/, rank: 55, label: 'O(n^k)' },
  { pattern: /^o\(\s*2\s*\^?\s*n\s*\)$/, rank: 60, label: 'O(2^n)' },
  { pattern: /^o\(\s*n\s*!\s*\)$/, rank: 70, label: 'O(n!)' },
  { pattern: /^o\(\s*n\s*\^?\s*n\s*\)$/, rank: 80, label: 'O(n^n)' },
];

// Higher-degree polynomial: O(n^4), O(n^5), … O(n^9).
// Ranked dynamically so n^5 > n^4 > n^3.
// O(n³) is rank 40, each extra degree adds +5, so n^4=45, n^5=50, … n^9=70.
const POLYNOMIAL_PATTERN = /^o\(\s*n\s*\^?\s*([4-9])\s*\)$/;

const UNKNOWN_RANK = 999;

// Unicode superscripts that LeetCode (and many AI outputs) like to emit.
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '^0',
  '¹': '^1',
  '²': '^2',
  '³': '^3',
  '⁴': '^4',
  '⁵': '^5',
  '⁶': '^6',
  '⁷': '^7',
  '⁸': '^8',
  '⁹': '^9',
};

/** Returns a coarse numeric rank for a Big-O string. Higher = slower. */
export const complexityRank = (raw: string): number => {
  const normalized = raw
    .toLowerCase()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .replace(/\*\*/g, '^')
    .replace(/\s+/g, ' ')
    .trim();
  for (const entry of RANK_TABLE) {
    if (entry.pattern.test(normalized)) return entry.rank;
  }
  // Fall back: try the generic polynomial pattern for O(n^4)..O(n^9).
  // Step 2 per degree so even n^9 stays below O(2^n) rank=60.
  // n^4=42, n^5=44, n^6=46, n^7=48, n^8=50, n^9=52.
  const polyMatch = normalized.match(POLYNOMIAL_PATTERN);
  if (polyMatch) {
    const exp = Number.parseInt(polyMatch[1], 10);
    return 40 + (exp - 3) * 2;
  }
  return UNKNOWN_RANK;
};

export type Comparison = 'better' | 'worse' | 'equal' | 'unknown';

/**
 * Compare two complexity strings.
 * Returns 'better' if `a` is more efficient than `b`, 'worse' if `a` is
 * slower than `b`, 'equal' if same rank, 'unknown' if either is unrecognised.
 */
export const compareComplexity = (a: string, b: string): Comparison => {
  const ra = complexityRank(a);
  const rb = complexityRank(b);
  if (ra === UNKNOWN_RANK || rb === UNKNOWN_RANK) return 'unknown';
  if (ra < rb) return 'better';
  if (ra > rb) return 'worse';
  return 'equal';
};
