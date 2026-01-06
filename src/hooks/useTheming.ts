import { useState, useCallback, useMemo } from 'react';

export interface ThemingConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
}

const professionThemes: Record<string, Partial<ThemingConfig['colors']>> = {
  photographer: { primary: '#10b981', secondary: '#3b82f6', accent: '#fbbf24' },
  videographer: { primary: '#8b5cf6', secondary: '#ec4899', accent: '#06b6d4' },
  director: { primary: '#ff6b35', secondary: '#ef4444', accent: '#84cc16' },
};

const defaultTheme: ThemingConfig = {
  colors: {
    primary: '#10b981',
    secondary: '#8b5cf6',
    accent: '#fbbf24',
    background: '#0a0a0f',
    surface: '#1a1a2e',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem' },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, full: 9999 },
};

export function useTheming(profession: string = 'photographer') {
  const theme = useMemo<ThemingConfig>(() => {
    const professionColors = professionThemes[profession] || {};
    return {
      ...defaultTheme,
      colors: { ...defaultTheme.colors, ...professionColors },
    };
  }, [profession]);

  const getColor = useCallback((colorKey: keyof ThemingConfig['colors']): string => {
    return theme.colors[colorKey];
  }, [theme]);

  const getSpacing = useCallback((size: keyof ThemingConfig['spacing']): number => {
    return theme.spacing[size];
  }, [theme]);

  return { theme, getColor, getSpacing };
}

export default useTheming;
