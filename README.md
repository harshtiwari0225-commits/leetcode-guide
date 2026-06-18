# Nudge — LeetCode Guide

> Learn competitive programming step-by-step with AI-powered hints.
> **Hints, not handouts. Learn, don't copy.**

A Chrome/Edge extension that mounts a side panel on LeetCode problem pages. Get multiple approach suggestions, progressive hints (5 levels deep), a side-by-side comparison of approaches, and a solution reveal that only unlocks after you've submitted an accepted answer.

Everything is **local-first**: your API key, your progress, your preferences stay in your browser. The extension makes exactly one network call — to your own Gemini API key.

---

## Features

- 🧠 **Approach suggestions** — 3 different ways to think about a problem (Brute Force → Optimized → Optimal)
- 💡 **Progressive hints** — 5 levels per approach, from gentle nudges to nearly-pseudocode. Never the answer
- 📊 **Compare approaches** — side-by-side time/space complexity table with trade-off summary
- 🔓 **Solution reveal** — locked until your submission is Accepted. Available in your preferred language
- 📈 **Progress tracking** — per-problem stats, time spent, hints used, streaks
- 🎨 **Polished UX** — light/dark themes, resizable panel, font scaling, side flip (L/R), keyboard shortcuts (Alt+L, Alt+R, Alt+H)
- 🔒 **Privacy-first** — no servers, no analytics, no accounts. [Full privacy policy](./public/privacy.html)

---

## Install

### Microsoft Edge Add-ons Store

*Pending review — link will appear here when approved.*

### Google Chrome (manual install)

1. Download the latest `leetcode-guide-extension.zip` from [Releases](https://github.com/<you>/leetcode-guide/releases/latest)
2. Unzip somewhere permanent on your device or alternatively save the repository link.
3. Open `chrome://extensions`
4. Toggle **Developer mode** on (top right)
5. Click **Load unpacked**, select the unzipped folder
6. Get a [free Gemini API key](https://aistudio.google.com/apikey), paste it into the popup's Settings tab
7. Visit any LeetCode problem

> Chrome shows a "developer mode" reminder for unpacked extensions — that's normal. Read `src/` to verify exactly what it does.

### Firefox

*Pending review — link will appear here if approved.*

### From source

```powershell
git clone https://github.com/harshtiwari0225-commits/leetcode-guide.git
cd leetcode-guide
npm install
npm run build
# load the dist/ folder via chrome://extensions → Load unpacked
```

---

## Development

```powershell
npm run dev          # vite dev server
npm test             # 108 unit tests
npm run test:all     # build + unit + perf budget tests
npm run lint         # eslint
npm run type-check   # tsc -b
npm run build        # production build into dist/
npm run package      # build + zip dist/ → leetcode-guide-extension.zip
```

### Stack

- TypeScript 6, React 19, Vite 8, Tailwind v4
- Zustand for state, Vitest for tests
- `@crxjs/vite-plugin` for MV3 packaging
- `@google/generative-ai` for hint generation

### Architecture

```
src/
├── background/     service worker (badge + lifecycle)
├── content/        Shadow-DOM mount on LeetCode pages
├── pages/
│   ├── panel/      side panel UI
│   └── popup/      browser action popup (Status / Dashboard / Settings)
├── components/     shared React components
├── hooks/          UI hooks (resize, theme, shortcuts, etc.)
├── services/       gemini, leetcode scrape, storage, progress
├── utils/          helpers, complexity ranking
└── types/          shared types
```

---

## Privacy

Nudge stores everything in `chrome.storage.local`. Nothing is sent anywhere except your problem text → Google Gemini, using your own API key.

See [`public/privacy.html`](./public/privacy.html) for the full policy.

---

## Disclaimer

Nudge is an independent project. Not affiliated with, endorsed by, or sponsored by LeetCode or Google. **LeetCode®** is a registered trademark of its respective owner.

---
