import React, { useEffect, useRef, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { VirtualActorPanel } from './panels/VirtualActorPanel';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
    },
    secondary: {
      main: '#58a6ff',
    },
    background: {
      default: '#0d1117',
      paper: '#1c2128',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

interface AppProps {
  onActorGenerated?: (actorId: string) => void;
}

export const App: React.FC<AppProps> = ({ onActorGenerated }) => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <VirtualActorPanel onActorGenerated={onActorGenerated} />
    </ThemeProvider>
  );
};
