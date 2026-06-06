/**
 * Background Service Worker (MV3).
 *
 * M0 responsibilities (minimal):
 *  - Log install/update lifecycle.
 *  - Set a green badge dot on tabs that are on a LeetCode problem page.
 *
 * Later milestones may add message routing (M4: API-key plumbing,
 * M5: submission-result fallback hook).
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[LeetCode Guide] Installed/updated:', details.reason);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const isProblemPage = tab.url?.includes('leetcode.com/problems/') ?? false;
  if (isProblemPage) {
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

export {};