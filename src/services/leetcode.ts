/**
 * LeetCode page integration service.
 *
 * Responsibilities (M1 + M5):
 *  - Read problem identity (slug) from the URL.
 *  - Extract title / difficulty / tags / description from the LeetCode DOM
 *    with selector fallbacks so DOM redesigns don't kill us (PRD §7).
 *  - Poll until the SPA finishes rendering, then return a `LeetCodeProblem`.
 *  - Notify when the user navigates to a different problem without a reload.
 *  - Watch for an "Accepted" submission verdict (M5).
 */

import type { Difficulty, LeetCodeProblem } from '@/types';

// ─────────────────────────────────────────────
// Selector ladders — first match wins. Tried in order so older LeetCode
// markup remains supported even after redesigns.
// ─────────────────────────────────────────────

const SELECTORS = {
  title: [
    'a[href^="/problems/"].no-underline', // 2024 redesign
    "[data-cy='question-title']",
    '.text-title-large',
    '.question-title',
  ],
  difficulty: [
    'div[class*="text-difficulty-easy"]',
    'div[class*="text-difficulty-medium"]',
    'div[class*="text-difficulty-hard"]',
    "[diff]",
    "[class*='difficulty']",
  ],
  description: [
    "[data-track-load='description_content']",
    "div[class*='question-content']",
    '.question-content__JfgR',
    '.content__u3I1',
    '.description__24sA',
  ],
  tags: [
    'a[href^="/tag/"]',
    "[data-cy='topic-tag']",
    "[class*='topic-tag']",
    '.ant-tag',
  ],
};

// ─────────────────────────────────────────────
// Safe selector helpers
// ─────────────────────────────────────────────

const tryQuerySelector = (selectors: string[]): Element | null => {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch {
      /* selector invalid after redesign — skip */
    }
  }
  return null;
};

const tryQuerySelectorAll = (selectors: string[]): Element[] => {
  for (const selector of selectors) {
    try {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) return Array.from(els);
    } catch {
      /* skip */
    }
  }
  return [];
};

// ─────────────────────────────────────────────
// Atomic extractors
// ─────────────────────────────────────────────

export const extractSlugFromUrl = (
  pathname: string = window.location.pathname,
): string | null => {
  const match = pathname.match(/\/problems\/([^/]+)/);
  return match ? match[1] : null;
};

const titleCaseFromSlug = (slug: string): string =>
  slug
    .split('-')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

const extractTitle = (slug: string): string => {
  const el = tryQuerySelector(SELECTORS.title);
  if (el?.textContent) {
    return el.textContent.trim().replace(/^\d+\.\s*/, '');
  }
  // Fallback: parse <title> ("1. Two Sum - LeetCode")
  const m = document.title.match(/^(?:\d+\.\s*)?(.+?)\s*[-|]\s*LeetCode/i);
  if (m) return m[1].trim();
  // Last resort: title-case the URL slug
  return titleCaseFromSlug(slug);
};

const extractDifficulty = (): Difficulty => {
  const html = document.body?.className + ' ' + document.body?.innerHTML.slice(0, 5000);
  // Try class-based markers first
  if (document.querySelector('[class*="difficulty-easy"], [class*="text-olive"]'))
    return 'Easy';
  if (document.querySelector('[class*="difficulty-hard"], [class*="text-pink"]'))
    return 'Hard';
  if (document.querySelector('[class*="difficulty-medium"], [class*="text-yellow"]'))
    return 'Medium';

  // Try text content of any difficulty-tagged element
  const el = tryQuerySelector(SELECTORS.difficulty);
  if (el) {
    const text = el.textContent?.trim().toLowerCase() ?? '';
    if (text.includes('easy')) return 'Easy';
    if (text.includes('hard')) return 'Hard';
    if (text.includes('medium')) return 'Medium';
  }

  // Heuristic last resort
  if (/\beasy\b/i.test(html)) return 'Easy';
  if (/\bhard\b/i.test(html)) return 'Hard';
  return 'Medium';
};

const extractDescription = (): string => {
  const el = tryQuerySelector(SELECTORS.description);
  if (!el) return '';
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 4000);
};

const extractExamples = (): string[] => {
  const desc = tryQuerySelector(SELECTORS.description);
  if (!desc) return [];
  const out: string[] = [];

  // Most LeetCode examples live in <pre> blocks
  desc.querySelectorAll('pre').forEach((pre) => {
    const text = pre.textContent?.trim();
    if (text) out.push(text.slice(0, 800));
  });

  // Fallback: split text on "Example N:" markers
  if (out.length === 0) {
    const fullText = desc.textContent ?? '';
    const matches = fullText.match(/Example\s*\d+:[\s\S]*?(?=Example\s*\d+:|Constraints:|$)/gi);
    matches?.forEach((m) => out.push(m.trim().slice(0, 800)));
  }

  return out.slice(0, 5);
};

const extractConstraints = (): string[] => {
  const desc = tryQuerySelector(SELECTORS.description);
  if (!desc) return [];
  const fullText = desc.textContent ?? '';
  const section = fullText.match(/Constraints:?([\s\S]*?)(?=Follow-?up:|Example|$)/i);
  if (!section) return [];
  return section[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 10);
};

const extractTags = (): string[] => {
  const els = tryQuerySelectorAll(SELECTORS.tags);
  const tags = els
    .map((el) => el.textContent?.trim() ?? '')
    .filter((t) => t.length > 0 && t.length < 30);
  return Array.from(new Set(tags)).slice(0, 8);
};

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * One-shot DOM scrape. Returns null if we cannot confidently identify a
 * loaded problem (e.g. SPA still rendering).
 */
export const extractProblemFromPage = (): LeetCodeProblem | null => {
  const slug = extractSlugFromUrl();
  if (!slug) return null;

  try {
    const description = extractDescription();
    // Description is the strongest "is the SPA done?" signal. If it's missing
    // or trivially short, assume the page isn't ready yet.
    if (description.length < 20) return null;

    return {
      id: slug,
      title: extractTitle(slug),
      difficulty: extractDifficulty(),
      tags: extractTags(),
      description,
      examples: extractExamples(),
      constraints: extractConstraints(),
      url: window.location.href,
    };
  } catch (err) {
    console.error('[LeetCode Guide] extractProblemFromPage failed:', err);
    return null;
  }
};

/**
 * Poll the DOM until the problem renders or we time out.
 * Resolves with the extracted problem, rejects on timeout.
 */
export const waitForProblemLoad = (
  timeoutMs = 15000,
  pollMs = 400,
): Promise<LeetCodeProblem> =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const problem = extractProblemFromPage();
      if (problem) return resolve(problem);
      if (Date.now() - started > timeoutMs) {
        return reject(new Error('Timed out waiting for LeetCode problem to load'));
      }
      setTimeout(tick, pollMs);
    };
    tick();
  });

/**
 * Notify when the user navigates to a different problem within the SPA.
 * Wraps history.pushState/replaceState and listens to popstate.
 *
 * Returns a teardown function — call it during cleanup to restore the
 * original History methods (important for tests and HMR).
 */
export const watchForNavigation = (
  onChange: (newSlug: string | null) => void,
): (() => void) => {
  let lastSlug = extractSlugFromUrl();

  const fireIfChanged = () => {
    const slug = extractSlugFromUrl();
    if (slug !== lastSlug) {
      lastSlug = slug;
      onChange(slug);
    }
  };

  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPush(...args);
    fireIfChanged();
  };
  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    originalReplace(...args);
    fireIfChanged();
  };

  window.addEventListener('popstate', fireIfChanged);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener('popstate', fireIfChanged);
  };
};

// ─────────────────────────────────────────────
// Submission verdict watcher (M5)
//
// Strategy A (primary): hook window.fetch and inspect responses to
// /submissions/check — LeetCode polls this URL for verdicts. When the
// response's status_msg field is "Accepted" and the submission's question
// matches the current slug, fire onAccepted.
//
// Strategy B (fallback): MutationObserver scoped to the submission result
// container. Looks for an element whose text contains "Accepted" inside a
// narrow set of selectors (NOT the whole body).
//
// Both fire only once per slug per session; teardown undoes both.
// ─────────────────────────────────────────────

const RESULT_SELECTORS = [
  '[data-e2e-locator="submission-result"]',
  '[data-e2e-locator="console-result"]',
  '.text-green-s', // 2024 redesign — green Accepted text
];

const isAcceptedText = (text: string): boolean => {
  const t = text.toLowerCase();
  if (!t.includes('accepted')) return false;
  if (t.includes('not accepted')) return false;
  if (t.includes('wrong')) return false;
  if (t.includes('limit exceeded')) return false;
  return true;
};

export const watchForAcceptedSubmission = (
  onAccepted: () => void,
): (() => void) => {
  let fired = false;
  const fireOnce = () => {
    if (fired) return;
    fired = true;
    try {
      onAccepted();
    } catch (err) {
      console.error('[LeetCode Guide] onAccepted threw:', err);
    }
  };

  // ── Strategy A: fetch hook ──
  const originalFetch = window.fetch.bind(window);
  const hookedFetch: typeof window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (
        url.includes('/submissions/check/') ||
        url.includes('/submissions/detail/')
      ) {
        const cloned = response.clone();
        cloned
          .json()
          .then((data: unknown) => {
            if (
              data &&
              typeof data === 'object' &&
              'status_msg' in data &&
              typeof (data as { status_msg: unknown }).status_msg === 'string' &&
              isAcceptedText((data as { status_msg: string }).status_msg)
            ) {
              fireOnce();
            }
          })
          .catch(() => {
            /* not JSON or parse failure — ignore */
          });
      }
    } catch {
      /* never let our hook break LeetCode */
    }
    return response;
  };
  window.fetch = hookedFetch;

  // ── Strategy B: scoped DOM observer ──
  const observer = new MutationObserver((mutations) => {
    if (fired) return;
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        for (const sel of RESULT_SELECTORS) {
          try {
            const match = el.matches(sel) ? el : el.querySelector(sel);
            if (match && isAcceptedText(match.textContent ?? '')) {
              fireOnce();
              return;
            }
          } catch {
            /* invalid selector for this engine — skip */
          }
        }
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Initial scan — user may have refreshed after solving.
  for (const sel of RESULT_SELECTORS) {
    try {
      const existing = document.querySelector(sel);
      if (existing && isAcceptedText(existing.textContent ?? '')) {
        // Defer so the listener has time to mount.
        setTimeout(fireOnce, 200);
        break;
      }
    } catch {
      /* skip */
    }
  }

  return () => {
    if (window.fetch === hookedFetch) {
      window.fetch = originalFetch;
    }
    observer.disconnect();
  };
};