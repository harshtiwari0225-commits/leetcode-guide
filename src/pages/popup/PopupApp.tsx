import React from 'react';

/**
 * Minimal popup placeholder for M0. The full Status/Settings UI lands in M4.
 * Purpose right now: prove the popup mounts when the extension icon is clicked
 * and that Tailwind v4 styles resolve.
 */
export const PopupApp: React.FC = () => {
  return (
    <div className="w-80 p-4 flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center text-xs font-bold">
          LG
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">LeetCode Guide</h1>
          <p className="text-[10px] text-gray-400">Learn, don't copy 🎓</p>
        </div>
      </header>

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 text-xs text-gray-300">
        <p className="font-semibold text-brand-400 mb-1">Setup OK ✅</p>
        <p>
          Open any <code className="font-mono text-gray-200">leetcode.com/problems/*</code>{' '}
          page and the side panel will appear.
        </p>
      </div>

      <p className="text-[10px] text-gray-600 text-center">
        v0.1.0 · MVP scaffold (M0)
      </p>
    </div>
  );
};