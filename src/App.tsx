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
import { NotesPanel } from './components/NotesPanel';
import { AccessibilityProvider } from './providers/AccessibilityProvider';
import { Accessible3DControls } from './components/Accessible3DControls';
import { CinematographyPatternsPanel } from './components/CinematographyPatternsPanel';
import { CinematographyPattern } from './core/services/cinematographyPatternsService';
import { LightPatternLibrary } from './panels/LightPatternLibrary';

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

export const NotesPanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-notes-panel', handleToggle);
    return () => window.removeEventListener('toggle-notes-panel', handleToggle);
  }, []);

  if (!isOpen) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <NotesPanel onClose={() => setIsOpen(false)} />
    </ThemeProvider>
  );
};

export const CinematographyPatternsApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openCinematographyPatterns', handleOpen);
    return () => window.removeEventListener('openCinematographyPatterns', handleOpen);
  }, []);

  const handleApplyPattern = (pattern: CinematographyPattern) => {
    window.dispatchEvent(new CustomEvent('applyCinematographyPattern', { detail: pattern }));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }} onClick={() => setIsOpen(false)}>
        <div style={{
          background: '#1c2128',
          borderRadius: 16,
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,170,0,0.3)'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#ffaa00', fontSize: 18 }}>🎬 Hollywood Lysmønstre</h2>
            <button onClick={() => setIsOpen(false)} style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer'
            }}>&times;</button>
          </div>
          <CinematographyPatternsPanel onApplyPattern={handleApplyPattern} />
        </div>
      </div>
    </ThemeProvider>
  );
};

export const LightPatternLibraryApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openLightPatternLibrary', handleOpen);
    return () => window.removeEventListener('openLightPatternLibrary', handleOpen);
  }, []);

  const handleApplyPattern = async (pattern: any) => {
    window.dispatchEvent(new CustomEvent('applyLightPattern', { detail: pattern }));
    setIsOpen(false);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <LightPatternLibrary
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onApplyPattern={handleApplyPattern}
      />
    </ThemeProvider>
  );
};

export interface Accessible3DControlsAppProps {
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
    fov: number;
  };
  selectedObject: {
    id: string;
    name: string;
    type: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    visible: boolean;
  } | null;
  objects: Array<{
    id: string;
    name: string;
    type: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    visible: boolean;
  }>;
  onCameraChange: (state: Partial<{
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
    fov: number;
  }>) => void;
  onCameraReset: () => void;
  onObjectSelect: (id: string | null) => void;
  onObjectTransform: (id: string, transform: Partial<{
    id: string;
    name: string;
    type: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    visible: boolean;
  }>) => void;
}

export const Accessible3DControlsApp: React.FC<Accessible3DControlsAppProps> = (props) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AccessibilityProvider>
        {/* Toggle button - always visible */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 48,
            height: 48,
            borderRadius: 8,
            background: isVisible ? '#00d4ff' : 'rgba(28, 33, 40, 0.95)',
            border: '2px solid rgba(0, 212, 255, 0.5)',
            color: isVisible ? '#000' : '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            zIndex: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
          aria-label={isVisible ? 'Skjul kamerakontroller' : 'Vis kamerakontroller'}
          title={isVisible ? 'Skjul kamerakontroller' : 'Vis kamerakontroller'}
        >
          ⌨
        </button>

        {/* Controls panel - shown when toggled */}
        {isVisible && (
          <div style={{ position: 'absolute', top: 72, right: 16, zIndex: 150 }}>
            <Accessible3DControls
              cameraState={props.cameraState}
              selectedObject={props.selectedObject}
              objects={props.objects}
              onCameraChange={props.onCameraChange}
              onCameraReset={props.onCameraReset}
              onObjectSelect={props.onObjectSelect}
              onObjectTransform={props.onObjectTransform}
            />
          </div>
        )}
      </AccessibilityProvider>
    </ThemeProvider>
  );
};
