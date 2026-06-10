import { useEffect } from 'react';

interface KeyboardShortcuts {
  onToggle?: () => void;
  onRefresh?: () => void;
  onHelp?: () => void;
}

/**
 * Global keyboard shortcuts for the side panel:
 *   - Alt+L    → toggle panel collapse
 *   - Alt+R    → refresh problem
 *
 * Bound to `keydown` on the window. Ignored if the user is typing in an
 * input/textarea/contenteditable so we don't fight with LeetCode's editor.
 */
export const useKeyboardShortcuts = ({
  onToggle,
  onRefresh,
  onHelp,
}: KeyboardShortcuts): void => {
  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isEditable(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === 'l' && onToggle) {
        e.preventDefault();
        onToggle();
      } else if (key === 'r' && onRefresh) {
        e.preventDefault();
        onRefresh();
      } else if (key === 'h' && onHelp) {
        e.preventDefault();
        onHelp();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle, onRefresh, onHelp]);
};
