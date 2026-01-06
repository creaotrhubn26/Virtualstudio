import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { CastingPlannerPanel } from './components/CastingPlannerPanel';
import { CastingLandingPage } from './components/CastingLandingPage';
import { ToastProvider } from './components/ToastStack';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b5cf6',
    },
    secondary: {
      main: '#6366f1',
    },
    background: {
      default: '#0a0a0f',
      paper: '#1a1a24',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
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

function CastingStandaloneApp() {
  // Check if user is logged in - determines which view to show
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const adminUser = localStorage.getItem('adminUser');
    return !!adminUser;
  });

  const handleEnter = () => {
    // Reload the page to check authentication state
    window.location.reload();
  };

  // If not authenticated, always show landing page
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <CastingLandingPage onEnter={handleEnter} />
      </ThemeProvider>
    );
  }

  // If authenticated, show the planner
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ToastProvider position="bottom-right">
        <CastingPlannerPanel 
          onClose={() => {
            // Logout and redirect to landing
            localStorage.removeItem('adminUser');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('selectedProfession');
            window.location.reload();
          }}
          isFullscreen={true}
          onToggleFullscreen={() => {}}
          isStandalone={true}
        />
      </ToastProvider>
    </ThemeProvider>
  );
}

const container = document.getElementById('casting-root');
if (container) {
  const root = createRoot(container);
  root.render(<CastingStandaloneApp />);
}
