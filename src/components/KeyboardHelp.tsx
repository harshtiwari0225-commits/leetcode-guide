import React, { useEffect } from 'react';
import { cn } from '@/utils/helpers';

interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Alt', 'L'], description: 'Toggle panel collapse' },
  { keys: ['Alt', 'R'], description: 'Refresh problem' },
  { keys: ['Alt', 'H'], description: 'Show this help' },
  { keys: ['Esc'], description: 'Close this dialog' },
];

const TIPS: { emoji: string; text: string }[] = [
  { emoji: '↔', text: 'Drag the inward edge of the panel to resize width' },
  { emoji: '↕', text: 'Drag the top edge to resize height' },
  { emoji: '◆', text: 'Drag the green corner to resize both' },
  { emoji: '↑↓', text: 'Hold the hook button and drag to move it vertically' },
  { emoji: '⇤⇥', text: 'Click the side button to flip the panel left/right' },
  { emoji: '⟲', text: 'Double-click any handle to reset that dimension' },
];

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts and tips"
      onClick={onClose}
      className="absolute inset-0 z-20 flex items-start justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in"
      style={{ paddingTop: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[90%] max-w-[300px] flex flex-col gap-3 p-3"
      >
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-100">⌨️ Shortcuts & tips</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-100 hover:bg-gray-700 text-[10px]"
          >
            ✕
          </button>
        </header>

        <section>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Keyboard</p>
          <ul className="flex flex-col gap-1.5">
            {SHORTCUTS.map((s) => (
              <li key={s.keys.join('+')} className="flex items-center justify-between gap-2 text-[11px] text-gray-200">
                <span className="flex items-center gap-1">
                  {s.keys.map((k, i) => (
                    <React.Fragment key={k}>
                      <kbd className={cn('inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded', 'border border-gray-600 bg-gray-900 text-gray-100 text-[10px] font-mono font-semibold')}>
                        {k}
                      </kbd>
                      {i < s.keys.length - 1 && <span className="text-gray-500">+</span>}
                    </React.Fragment>
                  ))}
                </span>
                <span className="text-gray-400 text-right">{s.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Mouse tips</p>
          <ul className="flex flex-col gap-1">
            {TIPS.map((t) => (
              <li key={t.text} className="flex items-start gap-2 text-[11px] text-gray-300">
                <span className="text-brand-400 font-mono text-[10px] w-4 flex-shrink-0">{t.emoji}</span>
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[10px] text-gray-500 text-center pt-1 border-t border-gray-700/50">
          Press <kbd className="px-1 py-0.5 rounded border border-gray-600 bg-gray-900 text-[9px] font-mono">Esc</kbd> or click outside to close
        </p>
      </div>
    </div>
  );
};