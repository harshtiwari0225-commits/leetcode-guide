import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  extractSlugFromUrl,
  extractProblemFromPage,
  waitForProblemLoad,
  watchForAcceptedSubmission,
  watchForNavigation,
} from '@/services/leetcode';

const TWO_SUM_HTML = `
  <a href="/problems/two-sum" class="no-underline">Two Sum</a>
  <div class="text-difficulty-easy">Easy</div>
  <a href="/tag/array">Array</a>
  <a href="/tag/hash-table">Hash Table</a>
  <div data-track-load="description_content">
    Given an array of integers <code>nums</code> and an integer <code>target</code>,
    return indices of the two numbers such that they add up to target.
    <pre>Input: nums = [2,7,11,15], target = 9
Output: [0,1]</pre>
    Constraints:
    2 &lt;= nums.length &lt;= 10^4
    -10^9 &lt;= nums[i] &lt;= 10^9
    -10^9 &lt;= target &lt;= 10^9
    Only one valid answer exists.
  </div>
`;

const setUrl = (path: string) => {
  // jsdom allows direct mutation of window.location via history API
  history.replaceState({}, '', path);
};

describe('extractSlugFromUrl', () => {
  it('returns the slug from a /problems/ URL', () => {
    expect(extractSlugFromUrl('/problems/two-sum/')).toBe('two-sum');
    expect(extractSlugFromUrl('/problems/add-two-numbers/description/')).toBe(
      'add-two-numbers',
    );
  });

  it('returns null for non-problem URLs', () => {
    expect(extractSlugFromUrl('/problemset/all/')).toBeNull();
    expect(extractSlugFromUrl('/')).toBeNull();
  });
});

describe('extractProblemFromPage', () => {
  beforeEach(() => {
    setUrl('/problems/two-sum/');
    document.title = '1. Two Sum - LeetCode';
    document.body.innerHTML = TWO_SUM_HTML;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts a fully populated problem from a realistic DOM', () => {
    const problem = extractProblemFromPage();
    expect(problem).not.toBeNull();
    expect(problem!.id).toBe('two-sum');
    expect(problem!.title).toBe('Two Sum');
    expect(problem!.difficulty).toBe('Easy');
    expect(problem!.tags).toContain('Array');
    expect(problem!.tags).toContain('Hash Table');
    expect(problem!.description.length).toBeGreaterThan(50);
    expect(problem!.examples.length).toBeGreaterThan(0);
    expect(problem!.constraints.length).toBeGreaterThan(0);
  });

  it('returns null when description is missing (SPA still loading)', () => {
    document.body.innerHTML = '<div>loading...</div>';
    expect(extractProblemFromPage()).toBeNull();
  });

  it('returns null when not on a problem URL', () => {
    setUrl('/problemset/');
    expect(extractProblemFromPage()).toBeNull();
  });

  it('falls back to <title> when DOM title selector misses', () => {
    document.body.innerHTML = `
      <div data-track-load="description_content">
        ${'lorem ipsum dolor sit amet consectetur '.repeat(5)}
      </div>
    `;
    document.title = '42. Trapping Rain Water - LeetCode';
    const p = extractProblemFromPage();
    expect(p?.title).toBe('Trapping Rain Water');
  });
});

describe('waitForProblemLoad', () => {
  beforeEach(() => {
    setUrl('/problems/two-sum/');
    document.body.innerHTML = '';
  });

  it('resolves once the DOM becomes ready', async () => {
    setTimeout(() => {
      document.title = '1. Two Sum - LeetCode';
      document.body.innerHTML = TWO_SUM_HTML;
    }, 200);
    const p = await waitForProblemLoad(3000, 100);
    expect(p.id).toBe('two-sum');
  });

  it('rejects on timeout', async () => {
    await expect(waitForProblemLoad(300, 100)).rejects.toThrow(/Timed out/);
  });
});

describe('watchForNavigation', () => {
  let originalPush: typeof history.pushState;
  let originalReplace: typeof history.replaceState;

  beforeEach(() => {
    setUrl('/problems/two-sum/');
    originalPush = history.pushState;
    originalReplace = history.replaceState;
  });

  afterEach(() => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
  });

  it('fires onChange when the problem slug changes via pushState', () => {
    const onChange = vi.fn();
    const stop = watchForNavigation(onChange);

    history.pushState({}, '', '/problems/add-two-numbers/');
    expect(onChange).toHaveBeenCalledWith('add-two-numbers');

    stop();
  });

  it('does not fire when navigating to the same problem', () => {
    const onChange = vi.fn();
    const stop = watchForNavigation(onChange);

    history.pushState({}, '', '/problems/two-sum/description/');
    expect(onChange).not.toHaveBeenCalled();

    stop();
  });

  it('teardown stops firing events', () => {
    const onChange = vi.fn();
    const stop = watchForNavigation(onChange);
    stop();

    history.pushState({}, '', '/problems/add-two-numbers/');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('watchForAcceptedSubmission', () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.fetch = originalFetch;
    document.body.innerHTML = '';
  });

  const installFakeFetch = (body: Record<string, unknown>) => {
    window.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as typeof window.fetch;
  };

  it('fires onAccepted when fetch returns Accepted on /submissions/check/', async () => {
    installFakeFetch({ status_msg: 'Accepted' });
    const onAccepted = vi.fn();
    const stop = watchForAcceptedSubmission(onAccepted);

    await window.fetch('https://leetcode.com/submissions/check/12345/');
    // Allow microtasks to settle (cloned response.json() is async).
    await new Promise((r) => setTimeout(r, 10));
    expect(onAccepted).toHaveBeenCalledTimes(1);

    stop();
  });

  it('does not fire on /submissions/check/ when status is Wrong Answer', async () => {
    installFakeFetch({ status_msg: 'Wrong Answer' });
    const onAccepted = vi.fn();
    const stop = watchForAcceptedSubmission(onAccepted);

    await window.fetch('https://leetcode.com/submissions/check/12345/');
    await new Promise((r) => setTimeout(r, 10));
    expect(onAccepted).not.toHaveBeenCalled();

    stop();
  });

  it('fires at most once even if Accepted appears multiple times', async () => {
    installFakeFetch({ status_msg: 'Accepted' });
    const onAccepted = vi.fn();
    const stop = watchForAcceptedSubmission(onAccepted);

    await window.fetch('https://leetcode.com/submissions/check/1/');
    await window.fetch('https://leetcode.com/submissions/check/2/');
    await new Promise((r) => setTimeout(r, 10));
    expect(onAccepted).toHaveBeenCalledTimes(1);

    stop();
  });

  it('teardown stops intercepting fetch calls', async () => {
    const onAccepted = vi.fn();
    const stop = watchForAcceptedSubmission(onAccepted);
    stop();

    // After teardown, even a juicy Accepted body shouldn't fire.
    installFakeFetch({ status_msg: 'Accepted' });
    await window.fetch('https://leetcode.com/submissions/check/12345/');
    await new Promise((r) => setTimeout(r, 10));
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('fires via DOM observer when result element is added to body', async () => {
    const onAccepted = vi.fn();
    const stop = watchForAcceptedSubmission(onAccepted);

    const el = document.createElement('div');
    el.setAttribute('data-e2e-locator', 'submission-result');
    el.textContent = 'Accepted';
    document.body.appendChild(el);

    // MutationObserver is async — yield.
    await new Promise((r) => setTimeout(r, 10));
    expect(onAccepted).toHaveBeenCalledTimes(1);

    stop();
  });
});
