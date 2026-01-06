import { useState, useCallback } from 'react';

export interface Theme {
  mode: 'dark' | 'light';
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
}

const darkTheme: Theme = {
  mode: 'dark',
  primary: '#10b981',
  secondary: '#8b5cf6',
  background: '#0a0a0f',
  surface: '#1a1a2e',
  text: '#ffffff',
};

const lightTheme: Theme = {
  mode: 'light',
  primary: '#059669',
  secondary: '#7c3aed',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(darkTheme);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
    setTheme(isDarkMode ? lightTheme : darkTheme);
  }, [isDarkMode]);

  const getProfessionTheme = useCallback((profession: string): Theme => {
    const professionColors: Record<string, Partial<Theme>> = {
      photographer: { primary: '#10b981', secondary: '#3b82f6' },
      videographer: { primary: '#8b5cf6', secondary: '#ec4899' },
      director: { primary: '#ff6b35', secondary: '#fbbf24' },
    };
    return { ...darkTheme, ...professionColors[profession] };
  }, []);

  const getComponentTheme = useCallback((component: string): Record<string, string> => {
    return {
      background: theme.surface,
      color: theme.text,
      borderColor: `${theme.primary}40`,
    };
  }, [theme]);

  return { theme, isDarkMode, toggleTheme, getProfessionTheme, getComponentTheme };
}

export default useTheme;
