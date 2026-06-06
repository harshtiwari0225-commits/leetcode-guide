# LeetCode Guide — Chrome Extension

AI-powered learning guide for LeetCode. Hints without spoilers. Learn, don't copy.

> **Status:** M0 scaffold complete. M1 (LeetCode integration) is next.

## Stack

- TypeScript · React 19 · Vite 8 · Tailwind v4 · Zustand
- Chrome Extension Manifest V3 via `@crxjs/vite-plugin`
- Gemini API (`@google/generative-ai`) — BYO key
- Chrome Storage API (local only — no backend, no cloud sync)
- Vitest (unit) · Playwright (e2e)

## Scripts

```bash
npm run dev          # vite dev server (HMR for popup)
npm run build        # tsc + vite production build → dist/
npm run lint         # eslint
npm run type-check
npm run test         # vitest (unit)
npm run test:e2e     # playwright
npm run package      # build + zip dist
```

## Loading the extension

1. `npm install`
2. `npm run build`
3. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/`
4. Click the green **LG** icon — popup shows "Setup OK ✅"
5. Visit `https://leetcode.com/problems/two-sum/` — DevTools console should log `[LeetCode Guide] content script ready`

## Privacy

- All progress data: `chrome.storage.local` only.
- Problem text is sent only to Google Gemini using **your** API key.
- No analytics, no accounts, no servers.