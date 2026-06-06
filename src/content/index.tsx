/**
 * Content script entry — injected into every LeetCode problem page.
 *
 * M0 responsibilities (placeholder):
 *  - Confirm the script loads on /problems/* URLs.
 *  - Mount an empty Shadow-DOM host so future React panels (M1+) can render
 *    inside style-isolated DOM without colliding with LeetCode's CSS.
 *
 * Real panel UI lands in M1.
 */

const HOST_ID = 'leetcode-guide-host';

const ensureShadowHost = (): ShadowRoot => {
  let host = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (host?.shadowRoot) return host.shadowRoot;

  host = document.createElement('div');
  host.id = HOST_ID;
  // Stay out of LeetCode's layout flow; M1 will add the floating panel styles.
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '0',
    height: '0',
    zIndex: '2147483647',
  });
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  // Placeholder marker so we can verify mount during M0 smoke testing.
  const marker = document.createElement('div');
  marker.setAttribute('data-leetcode-guide', 'mounted');
  shadow.appendChild(marker);
  return shadow;
};

const main = (): void => {
  if (!window.location.pathname.includes('/problems/')) return;
  ensureShadowHost();
  console.log('[LeetCode Guide] content script ready');
};

main();

export {};