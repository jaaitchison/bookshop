"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'bp_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const raw = localStorage?.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
    } catch {
      // ignore
    }
    return 'auto';
  });

  useEffect(() => {
    const apply = (m: ThemeMode) => {
      const root = document.documentElement;
      if (!root) return;

      const removeDark = () => root.classList.remove('dark');
      const addDark = () => root.classList.add('dark');

      if (m === 'light') {
        removeDark();
      } else if (m === 'dark') {
        addDark();
      } else {
        // auto: follow system
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const isDark = mq.matches;
        if (isDark) addDark(); else removeDark();

        const handler = (e: MediaQueryListEvent) => {
          if (e.matches) addDark(); else removeDark();
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
      }
    };

    apply(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  const setMode = (m: ThemeMode) => setModeState(m);

  return <ThemeContext.Provider value={{ mode, setMode }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
