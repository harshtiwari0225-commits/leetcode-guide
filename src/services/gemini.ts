/**
 * Gemini API service.
 *
 * M2 surface: `analyzeProblem(problem)` → 3–5 solution approaches.
 *
 * Hard guarantees enforced here (per PRD §4 F1 + §9 acceptance):
 *  - Never returns code, pseudocode, or implementation syntax. We run a
 *    no-code validator on the model output and reject responses that leak.
 *  - Bounded latency: 8 s timeout, one retry, then surface a friendly error.
 *  - API key is read from chrome.storage at call time (not module load),
 *    so the popup can update it without a reload.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Approach, LeetCodeProblem, ProblemAnalysis } from '@/types';
import { getApiKey } from '@/services/storage';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MODEL_NAME = 'gemini-2.5-flash-lite';
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;

// ─────────────────────────────────────────────
// No-code validator
// Returns the offending fragment if the text looks like code, else null.
// Whitelist patterns common in plain English so we don't false-positive.
// ─────────────────────────────────────────────

const CODE_FENCE_RE = /```/;
const CODE_KEYWORDS_RE =
  /\b(?:def |function |class |return |const |let |var |import |for\s*\(|while\s*\(|if\s*\(|public\s+(?:static|class)|#include)\b/;
const ASSIGNMENT_RE = /[a-zA-Z_]\w*\s*=\s*[a-zA-Z0-9_[{(]/;

export const containsCode = (text: string): string | null => {
  if (CODE_FENCE_RE.test(text)) return 'code fence (```)';
  if (CODE_KEYWORDS_RE.test(text)) {
    const m = text.match(CODE_KEYWORDS_RE);
    return `code keyword "${m?.[0]?.trim() ?? '?'}"`;
  }
  if (ASSIGNMENT_RE.test(text)) {
    const m = text.match(ASSIGNMENT_RE);
    return `assignment "${m?.[0] ?? '?'}"`;
  }
  return null;
};

// ─────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────

const buildAnalysisPrompt = (problem: LeetCodeProblem): string => {
  const examples = problem.examples.slice(0, 2).join('\n');
  const constraints = problem.constraints.join('\n');
  return [
    'You are an expert competitive-programming instructor helping a student learn.',
    'Identify 3 to 5 distinct solution approaches for the LeetCode problem below.',
    '',
    'STRICT RULES — non-negotiable:',
    '- NEVER show code, pseudocode, syntax, variable assignments, or language keywords.',
    '- NEVER include backticks, triple backticks, function signatures, or "return".',
    '- Each "description" must be 1–2 plain-English sentences. Focus on the IDEA, not the implementation.',
    '- Include at least one Brute Force and one Optimal approach.',
    '- Order results from simplest to most optimal.',
    '',
    'Respond with ONLY a valid JSON object — no prose before or after — in this exact shape:',
    '{',
    '  "approaches": [',
    '    {',
    '      "name": "Brute Force" | "Hash Map" | "Two Pointers" | etc.,',
    '      "technique": "Nested Loops" | "Hash Table" | "Sliding Window" | etc.,',
    '      "type": "Brute Force" | "Optimal" | "Advanced",',
    '      "timeComplexity": "O(n)",',
    '      "spaceComplexity": "O(1)",',
    '      "description": "1–2 sentence plain-English idea (no code).",',
    '      "difficultyScore": 1',
    '    }',
    '  ]',
    '}',
    '',
    `Problem: ${problem.title} (${problem.difficulty})`,
    `Tags: ${problem.tags.join(', ') || '(none)'}`,
    '',
    'Problem statement:',
    problem.description,
    '',
    examples ? `Examples:\n${examples}` : '',
    constraints ? `Constraints:\n${constraints}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

// ─────────────────────────────────────────────
// JSON extractor — handles models that wrap JSON in ```json ... ``` fences
// despite our instructions.
// ─────────────────────────────────────────────

const extractJson = (raw: string): string => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  // Find the first { ... last } slice
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last > first) return raw.slice(first, last + 1).trim();
  return raw.trim();
};

// ─────────────────────────────────────────────
// Approach validation + sanitization
// ─────────────────────────────────────────────

const APPROACH_TYPES = ['Brute Force', 'Optimal', 'Advanced'] as const;

const sanitizeApproach = (
  raw: unknown,
  index: number,
): { ok: true; value: Approach } | { ok: false; reason: string } => {
  if (!raw || typeof raw !== 'object')
    return { ok: false, reason: `approach[${index}] is not an object` };
  const a = raw as Record<string, unknown>;

  const name = typeof a.name === 'string' ? a.name.trim() : '';
  const technique = typeof a.technique === 'string' ? a.technique.trim() : '';
  const type =
    typeof a.type === 'string' &&
    (APPROACH_TYPES as readonly string[]).includes(a.type)
      ? (a.type as Approach['type'])
      : 'Optimal';
  const timeComplexity =
    typeof a.timeComplexity === 'string' ? a.timeComplexity.trim() : 'O(?)';
  const spaceComplexity =
    typeof a.spaceComplexity === 'string' ? a.spaceComplexity.trim() : 'O(?)';
  const description =
    typeof a.description === 'string' ? a.description.trim() : '';
  const difficultyScore =
    typeof a.difficultyScore === 'number'
      ? Math.max(1, Math.min(5, Math.round(a.difficultyScore)))
      : 3;

  if (!name) return { ok: false, reason: `approach[${index}] missing name` };
  if (!description)
    return { ok: false, reason: `approach[${index}] missing description` };

  const codeIn = containsCode(`${name} ${technique} ${description}`);
  if (codeIn) {
    return {
      ok: false,
      reason: `approach[${index}] "${name}" contains ${codeIn}`,
    };
  }

  return {
    ok: true,
    value: {
      id: `${Date.now().toString(36)}_${index}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name,
      technique: technique || name,
      type,
      timeComplexity,
      spaceComplexity,
      description,
      difficultyScore,
    },
  };
};

// ─────────────────────────────────────────────
// Timeout + retry wrapper
// ─────────────────────────────────────────────

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Gemini request timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export class GeminiKeyMissingError extends Error {
  constructor() {
    super('Gemini API key not configured. Add it in the extension popup.');
    this.name = 'GeminiKeyMissingError';
  }
}

export class GeminiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiValidationError';
  }
}

const generateOnce = async (apiKey: string, prompt: string): Promise<string> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await withTimeout(model.generateContent(prompt), TIMEOUT_MS);
  return result.response.text();
};

export const analyzeProblem = async (
  problem: LeetCodeProblem,
): Promise<ProblemAnalysis> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new GeminiKeyMissingError();

  const prompt = buildAnalysisPrompt(problem);

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await generateOnce(apiKey, prompt);
      return parseAnalysisResponse(problem, raw);
    } catch (err) {
      lastError = err;
      // Validation errors are deterministic — no retry helps.
      if (err instanceof GeminiValidationError) break;
      if (err instanceof GeminiKeyMissingError) break;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error('Gemini analysis failed for unknown reason');
};

/** Exposed for testing. */
export const parseAnalysisResponse = (
  problem: LeetCodeProblem,
  raw: string,
): ProblemAnalysis => {
  const jsonText = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new GeminiValidationError(
      `Gemini did not return valid JSON: "${jsonText.slice(0, 120)}..."`,
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as { approaches?: unknown }).approaches)
  ) {
    throw new GeminiValidationError(
      'Gemini response missing "approaches" array',
    );
  }

  const rawApproaches = (parsed as { approaches: unknown[] }).approaches;
  const sanitized: Approach[] = [];
  const reasons: string[] = [];
  rawApproaches.forEach((a, i) => {
    const r = sanitizeApproach(a, i);
    if (r.ok) sanitized.push(r.value);
    else reasons.push(r.reason);
  });

  if (sanitized.length < 2) {
    throw new GeminiValidationError(
      `Need ≥2 valid approaches, got ${sanitized.length}. Issues: ${reasons.join('; ')}`,
    );
  }

  return {
    problem,
    approaches: sanitized.slice(0, 5),
    analyzedAt: Date.now(),
    cacheKey: `${problem.id}_${problem.title}`,
  };
};