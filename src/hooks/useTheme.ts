import { useCallback, useEffect, useState } from 'react';
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/services/storage';

export type ResolvedTheme = 'light' | 'dark';

interface UseThemeResult {
  preference: ThemePreference;
  theme: ResolvedTheme;
  toggle: () => void;
  setPreference: (pref: ThemePreference) => void;
}

const matchesDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useTheme = (): UseThemeResult => {
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(matchesDark);

  useEffect(() => {
    let cancelled = false;
    void getThemePreference().then((saved) => {
      if (cancelled || !saved) return;
      setPreferenceState(saved);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const theme: ResolvedTheme =
    preference === 'auto'
      ? systemPrefersDark ? 'dark' : 'light'
      : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void setThemePreference(next);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((cur) => {
      const currentResolved: ResolvedTheme =
        cur === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : cur;
      const next: ThemePreference = currentResolved === 'dark' ? 'light' : 'dark';
      void setThemePreference(next);
      return next;
    });
  }, [systemPrefersDark]);

  return { preference, theme, toggle, setPreference };
};