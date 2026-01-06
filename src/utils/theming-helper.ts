import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';

export interface ThemingColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export interface ThemingResult {
  colors: ThemingColors;
  isDark: boolean;
  alpha: (color: string, opacity: number) => string;
  getThemedCardSx: () => object;
  getThemedButtonSx: () => object;
}

// Helper function to add alpha to a color
const addAlpha = (color: string, opacity: number): string => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Handle rgb colors
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }
  // Handle rgba colors - replace existing alpha
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/, `${opacity})`);
  }
  return color;
};

export function useTheming(_profession?: string): ThemingResult {
  const theme = useTheme();
  
  return useMemo(() => {
    const isDark = theme.palette.mode === 'dark';
    
    const colors: ThemingColors = {
      primary: theme.palette.primary.main,
      secondary: theme.palette.secondary.main,
      background: theme.palette.background.default,
      surface: theme.palette.background.paper,
      text: theme.palette.text.primary,
      textSecondary: theme.palette.text.secondary,
      border: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      error: theme.palette.error.main,
      success: theme.palette.success.main,
      warning: theme.palette.warning.main,
    };
    
    const getThemedCardSx = () => ({
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: colors.primary,
        boxShadow: `0 0 20px ${addAlpha(colors.primary, 0.3)}`,
      },
    });

    const getThemedButtonSx = () => ({
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      textTransform: 'none',
      fontWeight: 600,
      '&:hover': {
        boxShadow: `0 0 20px ${addAlpha(colors.primary, 0.4)}`,
      },
    });

    return {
      colors,
      isDark,
      alpha: addAlpha,
      getThemedCardSx,
      getThemedButtonSx,
    };
  }, [theme]);
}

// Default dark theme colors for non-MUI contexts (Virtual Studio theme)
export const darkThemeColors: ThemingColors = {
  primary: '#00d4ff',
  secondary: '#58a6ff',
  background: '#0d1117',
  surface: '#1c2128',
  text: '#e6edf3',
  textSecondary: '#8b949e',
  border: 'rgba(48, 54, 61, 0.8)',
  error: '#f85149',
  success: '#3fb950',
  warning: '#d29922',
};

export default useTheming;

