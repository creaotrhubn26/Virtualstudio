/**
 * App.tsx — keeps only the roots that are still mounted inline from
 * src/main.ts. Every other <X>App wrapper has moved to src/apps/<X>App.tsx
 * and is dynamic-imported via src/bootstrap/mount-*.ts.
 *
 * Remaining here:
 *   - `App` + `AppContent` → mounted into `#actorPanelRoot` with an
 *     `onActorGenerated` callback and a persistent root reference.
 *   - `Accessible3DControlsApp` + `Accessible3DControlsAppProps` →
 *     rendered repeatedly via `controls3DRoot.render(...)` inside a
 *     useAppStore subscriber (closure-captured callbacks that can't be
 *     statically serialised into a mount module).
 */
import React, { Suspense, lazy } from 'react';
import { Box, IconButton } from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { ToastProvider } from './components/ToastStack';
import { AccessibilityProvider } from './providers/AccessibilityProvider';
import { CustomThemeProvider, useCustomTheme } from './contexts/ThemeContext';
import { PanelLoadingFallback } from './apps/shared';

const VirtualActorPanel = lazy(() =>
  import('./panels/VirtualActorPanel').then((m) => ({ default: m.VirtualActorPanel })),
);
const Accessible3DControls = lazy(() =>
  import('./components/Accessible3DControls').then((m) => ({
    default: m.Accessible3DControls,
  })),
);

interface AppProps {
  onActorGenerated?: (actorId: string) => void;
}

const AppContent: React.FC<AppProps> = ({ onActorGenerated }) => {
  const { mode, toggleTheme } = useCustomTheme();

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ position: 'fixed', top: 16, right: 16, zIndex: 1300 }}>
        <IconButton
          onClick={toggleTheme}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          title={mode === 'dark' ? 'Lysere modus' : 'Mørkere modus'}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>

      <ToastProvider>
        <Suspense fallback={<PanelLoadingFallback />}>
          <VirtualActorPanel onActorGenerated={onActorGenerated} />
        </Suspense>
      </ToastProvider>
    </Box>
  );
};

export const App: React.FC<AppProps> = ({ onActorGenerated }) => (
  <CustomThemeProvider>
    <AppContent onActorGenerated={onActorGenerated} />
  </CustomThemeProvider>
);

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
  onCameraChange: (
    state: Partial<{
      position: [number, number, number];
      target: [number, number, number];
      zoom: number;
      fov: number;
    }>,
  ) => void;
  onCameraReset: () => void;
  onObjectSelect: (id: string | null) => void;
  onObjectTransform: (
    id: string,
    transform: Partial<{
      id: string;
      name: string;
      type: string;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
      visible: boolean;
    }>,
  ) => void;
}

export const Accessible3DControlsApp: React.FC<Accessible3DControlsAppProps> = (props) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <AccessibilityProvider>
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

      {isVisible && (
        <div style={{ position: 'absolute', top: 72, right: 16, zIndex: 150 }}>
          <Suspense fallback={<PanelLoadingFallback />}>
            <Accessible3DControls
              cameraState={props.cameraState}
              selectedObject={props.selectedObject}
              objects={props.objects}
              onCameraChange={props.onCameraChange}
              onCameraReset={props.onCameraReset}
              onObjectSelect={props.onObjectSelect}
              onObjectTransform={props.onObjectTransform}
            />
          </Suspense>
        </div>
      )}
    </AccessibilityProvider>
  );
};
