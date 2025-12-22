import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { VirtualActorPanel } from './panels/VirtualActorPanel';
import { KeyframeTimeline } from './panels/KeyframeTimeline';
import AssetLibraryPanel from './panels/AssetLibraryPanel';
import { CharacterModelLoader } from './panels/CharacterModelLoader';
import { LightsBrowser } from './panels/LightsBrowser';
import { CameraGearPanel } from './panels/CameraGearPanel';
import { HDRIPanel } from './panels/HDRIPanel';
import { EquipmentPanel } from './panels/EquipmentPanel';

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

interface TimelineAppProps {
  clipId?: string;
}

export const TimelineApp: React.FC<TimelineAppProps> = ({ clipId }) => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <KeyframeTimeline clipId={clipId} height={250} />
    </ThemeProvider>
  );
};

export const AssetLibraryApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AssetLibraryPanel />
    </ThemeProvider>
  );
};

export const CharacterLoaderApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <CharacterModelLoader />
    </ThemeProvider>
  );
};

export const LightsBrowserApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <LightsBrowser />
    </ThemeProvider>
  );
};

export const CameraGearApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <CameraGearPanel />
    </ThemeProvider>
  );
};

export const HDRIPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <HDRIPanel />
    </ThemeProvider>
  );
};

export const EquipmentPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <EquipmentPanel />
    </ThemeProvider>
  );
};
