import React, { useEffect, useState } from 'react';
import { cn } from '@/utils/helpers';
import { clearApiKey, getApiKey, setApiKey } from '@/services/storage';
import { Dashboard } from './Dashboard';

type Tab = 'status' | 'dashboard' | 'settings';

/**
 * Popup UI (M2): status + settings tabs. Settings lets the user paste a
 * Gemini API key, which is persisted to chrome.storage.local and read by
 * the gemini service on every call.
 */
export const PopupApp: React.FC = () => {
  const [tab, setTab] = useState<Tab>('status');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [onProblemPage, setOnProblemPage] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => {
      setSavedKey(k);
      if (k) setDraftKey(k);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? '';
      setOnProblemPage(url.includes('leetcode.com/problems/'));
    });
  }, []);

  const handleSave = async () => {
    const trimmed = draftKey.trim();
    if (!trimmed) return;
    setBusy(true);
    await setApiKey(trimmed);
    setSavedKey(trimmed);
    setBusy(false);
    setNotice('Saved ✓');
    setTimeout(() => setNotice(null), 1800);
  };

  const handleClear = async () => {
    setBusy(true);
    await clearApiKey();
    setSavedKey(null);
    setDraftKey('');
    setBusy(false);
    setNotice('Key removed');
    setTimeout(() => setNotice(null), 1800);
  };

  const maskKey = (k: string): string =>
    k.length <= 10 ? '•'.repeat(k.length) : `${k.slice(0, 4)}${'•'.repeat(10)}${k.slice(-4)}`;

  return (
    <div className="w-80 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-sm font-bold">
          LG
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold leading-tight">LeetCode Guide</h1>
          <p className="text-[10px] text-gray-400">Learn, don't copy 🎓</p>
        </div>
        <span className="text-[10px] text-gray-600">v0.1.0</span>
      </header>

      {/* Status strip */}
      <div
        className={cn(
          'px-4 py-2 text-[11px] flex items-center gap-2 border-b',
          onProblemPage
            ? 'bg-green-900/20 text-green-400 border-green-800/30'
            : 'bg-gray-800/40 text-gray-500 border-gray-700/40',
        )}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            onProblemPage ? 'bg-green-400 animate-pulse' : 'bg-gray-600',
          )}
        />
        {onProblemPage
          ? 'Active on this LeetCode problem'
          : 'Not on a LeetCode problem page'}
      </div>

      {/* Tabs */}
      <nav className="flex border-b border-gray-800">
        {(
          [
            { id: 'status', label: '📊 Status' },
            { id: 'dashboard', label: '📈 Dashboard' },
            { id: 'settings', label: '⚙️ Settings' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2.5 text-[11px] font-semibold transition-colors',
              tab === t.id
                ? 'text-brand-400 border-b-2 border-brand-500'
                : 'text-gray-500 hover:text-gray-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 min-h-[260px]">
        {tab === 'status' && (
          <StatusTab
            savedKey={savedKey}
            maskKey={maskKey}
            onProblemPage={onProblemPage}
            onOpenSettings={() => setTab('settings')}
          />
        )}

        {tab === 'dashboard' && <Dashboard />}

        {tab === 'settings' && (
          <SettingsTab
            draftKey={draftKey}
            setDraftKey={setDraftKey}
            savedKey={savedKey}
            maskKey={maskKey}
            busy={busy}
            notice={notice}
            onSave={handleSave}
            onClear={handleClear}
          />
        )}
      </div>

      <footer className="px-4 py-2 border-t border-gray-800 text-center">
        <p className="text-[10px] text-gray-700">
          All data stays local · No accounts · No servers
        </p>
      </footer>
    </div>
  );
};

// ─────────────────────────────────────────────
// Status tab
// ─────────────────────────────────────────────

interface StatusTabProps {
  savedKey: string | null;
  maskKey: (k: string) => string;
  onProblemPage: boolean;
  onOpenSettings: () => void;
}

const StatusTab: React.FC<StatusTabProps> = ({
  savedKey,
  maskKey,
  onProblemPage,
  onOpenSettings,
}) => (
  <>
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            savedKey ? 'bg-green-400' : 'bg-red-400',
          )}
        />
        <p className="text-xs font-semibold text-gray-200">Gemini API key</p>
      </div>
      {savedKey ? (
        <p className="text-[11px] text-gray-500 font-mono">{maskKey(savedKey)}</p>
      ) : (
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-[11px] text-red-400 hover:text-red-300 underline"
        >
          Not set — click here to add one
        </button>
      )}
    </div>

    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
      <p className="text-xs font-semibold text-gray-200 mb-2">How it works</p>
      <ol className="space-y-1.5">
        {[
          'Add your Gemini key (Settings tab)',
          'Visit a LeetCode problem',
          'See AI-identified approaches (no code spoilers)',
          'Hints + reveal land in M3/M5',
        ].map((step, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-[11px] text-gray-400"
          >
            <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 text-[9px] font-bold">
              {idx + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>

    {!onProblemPage && (
      <button
        type="button"
        onClick={() =>
          chrome.tabs.create({ url: 'https://leetcode.com/problems/two-sum/' })
        }
        className="px-3 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        🔗 Open Two Sum on LeetCode
      </button>
    )}
  </>
);

// ─────────────────────────────────────────────
// Settings tab
// ─────────────────────────────────────────────

interface SettingsTabProps {
  draftKey: string;
  setDraftKey: (v: string) => void;
  savedKey: string | null;
  maskKey: (k: string) => string;
  busy: boolean;
  notice: string | null;
  onSave: () => void;
  onClear: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  draftKey,
  setDraftKey,
  savedKey,
  maskKey,
  busy,
  notice,
  onSave,
  onClear,
}) => (
  <>
    <div>
      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
        Gemini API key
      </label>
      <input
        type="password"
        value={draftKey}
        onChange={(e) => setDraftKey(e.target.value)}
        placeholder="AIzaSy…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
      />
      <p className="text-[10px] text-gray-500 mt-1.5">
        Free key:{' '}
        <button
          type="button"
          onClick={() =>
            chrome.tabs.create({ url: 'https://aistudio.google.com/apikey' })
          }
          className="text-brand-400 hover:underline"
        >
          aistudio.google.com/apikey
        </button>
      </p>
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={busy || !draftKey.trim() || draftKey.trim() === savedKey}
        className="flex-1 px-3 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? 'Saving…' : notice ?? 'Save key'}
      </button>
      {savedKey && (
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-700 transition-colors"
        >
          Clear
        </button>
      )}
    </div>

    {savedKey && (
      <p className="text-[10px] text-gray-500 font-mono">
        Currently saved: {maskKey(savedKey)}
      </p>
    )}

    <div className="mt-2 p-3 bg-blue-900/10 border border-blue-700/30 rounded-lg">
      <p className="text-[10px] text-blue-400 font-semibold mb-1">🔒 Privacy</p>
      <p className="text-[10px] text-gray-500 leading-relaxed">
        Your key is stored only in this browser via chrome.storage.local.
        Problem text is sent only to Google Gemini using your key. We have no
        server.
      </p>
    </div>
  </>
);
