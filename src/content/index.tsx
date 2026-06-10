/**
 * Content script — injected into every LeetCode problem page.
 *
 * M1 responsibilities:
 *  1. Create a single Shadow-DOM host so our styles do not collide with
 *     LeetCode's (and vice-versa).
 *  2. Wait for the LeetCode SPA to render the problem.
 *  3. Mount the React side panel inside the shadow root.
 *  4. Re-mount on SPA navigation between problems.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SidePanel } from '@/pages/panel/SidePanel';
import {
  extractSlugFromUrl,
  waitForProblemLoad,
  watchForNavigation,
} from '@/services/leetcode';
import type { LeetCodeProblem } from '@/types';

// `?inline` returns the compiled Tailwind CSS as a plain string so we can
// inject it inside the shadow root via a <style> tag.
import styles from './styles.css?inline';

const HOST_ID = 'leetcode-guide-host';
const REACT_MOUNT_ID = 'leetcode-guide-react-root';

interface PanelState {
  problem: LeetCodeProblem | null;
  loading: boolean;
  error: string | null;
}

let reactRoot: Root | null = null;
let currentState: PanelState = { problem: null, loading: true, error: null };

// ─────────────────────────────────────────────
// Shadow-DOM host
// ─────────────────────────────────────────────

const ensureShadowMount = (): HTMLDivElement => {
  const existingHost = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (existingHost?.shadowRoot) {
    const existingMount = existingHost.shadowRoot.getElementById(REACT_MOUNT_ID);
    if (existingMount) return existingMount as HTMLDivElement;
  }

  const host = existingHost ?? document.createElement('div');
  host.id = HOST_ID;
  // Host itself is a 0×0 anchor; the panel positions itself absolutely.
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
  });
  if (!existingHost) document.documentElement.appendChild(host);

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '';

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const mount = document.createElement('div');
  mount.id = REACT_MOUNT_ID;
  shadow.appendChild(mount);
  return mount;
};

const render = (next: Partial<PanelState>) => {
  currentState = { ...currentState, ...next };
  const mount = ensureShadowMount();
  if (!reactRoot) reactRoot = createRoot(mount);
  reactRoot.render(
    <React.StrictMode>
      <SidePanel
        problem={currentState.problem}
        loading={currentState.loading}
        error={currentState.error}
      />
    </React.StrictMode>,
  );
};

// ─────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────

const loadCurrentProblem = async () => {
  const slug = extractSlugFromUrl();
  if (!slug) {
    render({ problem: null, loading: false, error: null });
    return;
  }
  render({ problem: null, loading: true, error: null });
  try {
    const problem = await waitForProblemLoad();
    render({ problem, loading: false, error: null });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to read problem from page';
    render({ problem: null, loading: false, error: message });
  }
};

const main = () => {
  // Only do work on problem pages.
  if (!window.location.pathname.includes('/problems/')) return;

  console.log('[LeetCode Guide] content script ready');
  loadCurrentProblem();

  // LeetCode is a SPA — re-load when the user clicks into a different problem.
  watchForNavigation((newSlug) => {
    if (!newSlug) return;
    console.log('[LeetCode Guide] navigation →', newSlug);
    // Small delay to let LeetCode swap the page content.
    setTimeout(loadCurrentProblem, 400);
  });

  // Manual refresh escape hatch — SidePanel's refresh button dispatches this.
  window.addEventListener('leetcode-guide:refresh', () => {
    console.log('[LeetCode Guide] manual refresh requested');
    loadCurrentProblem();
  });
};


main();
export {};