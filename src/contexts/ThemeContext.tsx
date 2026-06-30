import {
  createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type Theme = 'dark' | 'light' | 'mamish';

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
  mamishToast: boolean;
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {}, mamishToast: false });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>('tiki-theme', 'dark');
  const [mamishToast, setMamishToast] = useState(false);
  const beforeMamish = useRef<'dark' | 'light'>('dark');
  const pressCount = useRef(0);
  const lastPress = useRef(0);

  // Apply theme class to html element immediately on mount + change
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-dark', 'theme-light', 'theme-mamish');
    html.classList.add(`theme-${theme}`);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    // One tap exits Mamish immediately
    if (theme === 'mamish') {
      setTheme(beforeMamish.current);
      pressCount.current = 0;
      return;
    }

    // Count rapid presses to enter Mamish (5 within 2 seconds)
    const now = Date.now();
    if (now - lastPress.current > 2000) pressCount.current = 0;
    lastPress.current = now;
    pressCount.current += 1;

    if (pressCount.current >= 5) {
      pressCount.current = 0;
      beforeMamish.current = theme;
      setTheme('mamish');
      setMamishToast(true);
      setTimeout(() => setMamishToast(false), 2800);
      return;
    }

    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <Ctx.Provider value={{ theme, toggleTheme, mamishToast }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx { return useContext(Ctx); }
