import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

const THEME_KEY = 'tl_theme';
type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  theme: ThemeMode;
  toggleTheme: () => void;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  // Fall back to system preference when no saved value exists.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const toggleTheme = (): void => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(THEME_KEY, theme);

    // Keep both html and body in sync with the active theme class.
    document.documentElement.classList.remove('light', 'dark');
    document.body.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.body.classList.add(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
