import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import settingsService, { getCurrentUserId } from '../services/settingsService';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useCustomTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCustomTheme må brukes innenfor ThemeContextProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const loadTheme = async () => {
      const userId = getCurrentUserId();
      const remote = await settingsService.getSetting<ThemeMode>('themeMode', { userId });
      if (remote) {
        setMode(remote);
        return;
      }
    };
    void loadTheme();
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    void settingsService.setSetting('themeMode', newMode, { userId: getCurrentUserId() });
  };

  const theme = useMemo(() => {
    const isLight = mode === 'light';
    
    return createTheme({
      palette: {
        mode,
        primary: {
          main: isLight ? '#6366f1' : '#8b5cf6',
          light: isLight ? '#818cf8' : '#a78bfa',
          dark: isLight ? '#4f46e5' : '#7c3aed',
        },
        secondary: {
          main: isLight ? '#0891b2' : '#06b6d4',
          light: isLight ? '#22d3ee' : '#67e8f9',
          dark: isLight ? '#0e7490' : '#164e63',
        },
        background: {
          default: isLight ? '#f9fafb' : '#0d1117',
          paper: isLight ? '#ffffff' : '#1c2128',
        },
        text: {
          primary: isLight ? '#111827' : '#e6edf3',
          secondary: isLight ? '#6b7280' : '#8b949e',
        },
        divider: isLight ? '#e5e7eb' : '#30363d',
      },
      typography: {
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        
        // Headings med Source Serif Pro (serif font for kino-look)
        h1: {
          fontFamily: '"Source Serif Pro", "Georgia", serif',
          fontSize: '2.5rem',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        },
        h2: {
          fontFamily: '"Source Serif Pro", "Georgia", serif',
          fontSize: '2rem',
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        },
        h3: {
          fontFamily: '"Source Serif Pro", "Georgia", serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          lineHeight: 1.4,
        },
        h4: {
          fontFamily: '"Source Serif Pro", "Georgia", serif',
          fontSize: '1.25rem',
          fontWeight: 600,
          lineHeight: 1.4,
        },
        h5: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '1rem',
          fontWeight: 600,
          lineHeight: 1.5,
        },
        h6: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 600,
          lineHeight: 1.5,
        },
        
        // Body text med Inter
        body1: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '1rem',
          lineHeight: 1.6,
          fontWeight: 400,
        },
        body2: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          fontWeight: 400,
        },
        
        // Button text
        button: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '0.02em',
        },
        
        // Caption
        caption: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.75rem',
          lineHeight: 1.5,
          fontWeight: 500,
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '6px',
            },
            contained: {
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              },
            },
            outlined: {
              borderWidth: '1.5px',
              '&:hover': {
                borderWidth: '1.5px',
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: '8px',
              border: `1px solid ${isLight ? '#e5e7eb' : '#30363d'}`,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: isLight ? '#ffffff' : '#0d1117',
              borderBottom: `1px solid ${isLight ? '#e5e7eb' : '#30363d'}`,
              boxShadow: 'none',
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, theme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
