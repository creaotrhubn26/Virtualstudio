import React, { Suspense, lazy } from 'react';
import {
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, Movie as MovieIcon, CameraAlt as CameraIcon, Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { ToastProvider } from './components/ToastStack';
import { AccessibilityProvider } from './providers/AccessibilityProvider';
import { CustomThemeProvider, useCustomTheme } from './contexts/ThemeContext';
import { CinematographyPattern } from './core/services/cinematographyPatternsService';
import { ScenarioPreset } from './data/scenarioPresets';

// Lazy load heavy panels for better initial load performance
const VirtualActorPanel = lazy(() => import('./panels/VirtualActorPanel').then(m => ({ default: m.VirtualActorPanel })));
const KeyframeTimeline = lazy(() => import('./panels/KeyframeTimeline').then(m => ({ default: m.KeyframeTimeline })));
const AssetLibraryPanel = lazy(() => import('./panels/AssetLibraryPanel'));
const LibraryPanel = lazy(() => import('./panels/LibraryPanel'));
const CharacterModelLoader = lazy(() => import('./panels/CharacterModelLoader').then(m => ({ default: m.CharacterModelLoader })));
const LightsBrowser = lazy(() => import('./panels/LightsBrowser').then(m => ({ default: m.LightsBrowser })));
const CameraGearPanel = lazy(() => import('./panels/CameraGearPanel').then(m => ({ default: m.CameraGearPanel })));
const HDRIPanel = lazy(() => import('./panels/HDRIPanel').then(m => ({ default: m.HDRIPanel })));
const EquipmentPanel = lazy(() => import('./panels/EquipmentPanel').then(m => ({ default: m.EquipmentPanel })));
const NotesPanel = lazy(() => import('./components/NotesPanel').then(m => ({ default: m.NotesPanel })));
const SceneComposerPanel = lazy(() => import('./components/SceneComposerPanel').then(m => ({ default: m.SceneComposerPanel })));
const AIAssistantPanel = lazy(() => import('./components/AIAssistantPanel').then(m => ({ default: m.AIAssistantPanel })));
const Accessible3DControls = lazy(() => import('./components/Accessible3DControls').then(m => ({ default: m.Accessible3DControls })));
const CinematographyPatternsPanel = lazy(() => import('./components/CinematographyPatternsPanel').then(m => ({ default: m.CinematographyPatternsPanel })));
const LightPatternLibrary = lazy(() => import('./panels/LightPatternLibrary').then(m => ({ default: m.LightPatternLibrary })));
const AvatarGeneratorPanel = lazy(() => import('./panels/AvatarGeneratorPanel').then(m => ({ default: m.AvatarGeneratorPanel })));
const ScenerPanel = lazy(() => import('./panels/ScenerPanel').then(m => ({ default: m.ScenerPanel })));
import { StoryCharacterHUD } from './components/StoryCharacterHUD';
const TidslinjeLibraryPanel = lazy(() => import('./panels/TidslinjeLibraryPanel').then(m => ({ default: m.TidslinjeLibraryPanel })));
const AnimationComposerPanel = lazy(() => import('./panels/AnimationComposerPanel').then(m => ({ default: m.AnimationComposerPanel })));
const EnvironmentBrowser = lazy(() => import('./components/EnvironmentBrowser').then(m => ({ default: m.EnvironmentBrowser })));
const InteractiveElementsBrowser = lazy(() => import('./components/InteractiveElementsBrowser').then(m => ({ default: m.InteractiveElementsBrowser })));
const AmbientSoundsBrowserFallback = lazy(() => import('./components/AmbientSoundsBrowser').then(m => ({ default: m.AmbientSoundsBrowser })));
const VirtualStudioPro = lazy(() => import('./components/VirtualStudioPro').then(m => ({ default: m.VirtualStudioPro })));
const AccessoriesPanel = lazy(() => import('./panels/AccessoriesPanel').then(m => ({ default: m.AccessoriesPanel })));
const PosingModePanel = lazy(() => import('./panels/PosingModePanel').then(m => ({ default: m.PosingModePanel })));
const GelPickerPanel = lazy(() => import('./panels/GelPickerPanel').then(m => ({ default: m.GelPickerPanel })));
const OutdoorLightingPanel = lazy(() => import('./panels/OutdoorLightingPanel').then(m => ({ default: m.OutdoorLightingPanel })));
const CinematicEvaluationPanel = lazy(() => import('./panels/CinematicEvaluationPanel').then(m => ({ default: m.CinematicEvaluationPanel })));

// Loading fallback for lazy-loaded components
const PanelLoadingFallback = () => (
  <Box sx={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: 200,
    color: '#00d4ff',
    bgcolor: 'rgba(0, 0, 0, 0.3)'
  }}>
    <CircularProgress size={40} color="inherit" />
  </Box>
);

interface AppProps {
  onActorGenerated?: (actorId: string) => void;
}

const AppContent: React.FC<AppProps> = ({ onActorGenerated }) => {
  const { mode, toggleTheme } = useCustomTheme();

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Theme Toggle Button */}
      <Box sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1300,
      }}>
        <IconButton
          onClick={toggleTheme}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
            },
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

export const App: React.FC<AppProps> = ({ onActorGenerated }) => {
  return (
    <CustomThemeProvider>
      <AppContent onActorGenerated={onActorGenerated} />
    </CustomThemeProvider>
  );
};

interface TimelineAppProps {
  clipId?: string;
}

const TimelineAppContent: React.FC<TimelineAppProps> = ({ clipId }) => {
  const { toggleTheme, mode } = useCustomTheme();

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Theme Toggle */}
      <Box sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1300,
      }}>
        <IconButton
          onClick={toggleTheme}
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
          title={mode === 'dark' ? 'Lysere modus' : 'Mørkere modus'}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>

      <Suspense fallback={<PanelLoadingFallback />}>
        <KeyframeTimeline clipId={clipId} height={250} />
      </Suspense>
    </Box>
  );
};

export const TimelineApp: React.FC<TimelineAppProps> = ({ clipId }) => {
  return (
    <CustomThemeProvider>
      <TimelineAppContent clipId={clipId} />
    </CustomThemeProvider>
  );
};

export const AssetLibraryApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <AssetLibraryPanel />
      </Suspense>
    
  );
};

export const CharacterLoaderApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <CharacterModelLoader />
      </Suspense>
    
  );
};

export const LightsBrowserApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <LightsBrowser />
      </Suspense>
    
  );
};

export const CameraGearApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <CameraGearPanel />
      </Suspense>
    
  );
};

export const HDRIPanelApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <HDRIPanel />
      </Suspense>
    
  );
};

export const EquipmentPanelApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <EquipmentPanel />
      </Suspense>
    
  );
};

export const ScenerPanelApp: React.FC = () => {
  const handleApplyPreset = (preset: ScenarioPreset) => {
    window.dispatchEvent(new CustomEvent('applyScenarioPreset', { detail: preset }));
  };

  const handleShowRecommended = (preset: ScenarioPreset) => {
    window.dispatchEvent(new CustomEvent('showRecommendedAssets', { detail: preset }));
  };

  const getCurrentSceneConfig = () => {
    const event = new CustomEvent('getSceneConfig', { detail: { callback: null } });
    let config: ScenarioPreset['sceneConfig'] | null = null;
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      config = customEvent.detail;
    };
    window.addEventListener('sceneConfigResponse', handler, { once: true });
    window.dispatchEvent(event);
    window.removeEventListener('sceneConfigResponse', handler);
    return config;
  };

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <ScenerPanel 
          onApplyPreset={handleApplyPreset} 
          onShowRecommended={handleShowRecommended}
          getCurrentSceneConfig={getCurrentSceneConfig}
        />
      </Suspense>
    
  );
};

export const TidslinjeLibraryPanelApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <TidslinjeLibraryPanel />
      </Suspense>
    
  );
};

export const LibraryPanelApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <LibraryPanel />
      </Suspense>
    
  );
};

export const AIAssistantApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleToggle = () => {
      console.log('AIAssistantApp: toggle event received, current isOpen:', isOpen);
      setIsOpen(prev => {
        const newState = !prev;
        console.log('AIAssistantApp: setting isOpen from', prev, 'to', newState);

        // Toggle panel visibility
        const panel = document.getElementById('aiAssistantPanel');
        if (panel) {
          if (newState) {
            // Close other panels when opening AI Assistant
            const studioLibraryPanel = document.getElementById('actorBottomPanel');
            const marketplacePanel = document.getElementById('marketplacePanel');

            if (studioLibraryPanel && studioLibraryPanel.classList.contains('open')) {
              const trigger = document.getElementById('actorPanelTrigger');
              if (trigger) {
                studioLibraryPanel.classList.remove('open');
                trigger.classList.remove('active');
                trigger.setAttribute('aria-expanded', 'false');
                const arrow = trigger.querySelector('.library-arrow');
                if (arrow) arrow.textContent = '+';
              }
            }
            if (marketplacePanel && marketplacePanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
            }
            // Close help panel if open
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-help-panel'));
            }
            
            panel.style.display = 'flex';
            panel.classList.add('open');
            
            // Check if any panel was at max height and set new panel to max height if so
            const checkMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight;
            const setMaxHeight = (window as any).setPanelToMaxHeight;
            if (checkMaxHeight && setMaxHeight && checkMaxHeight('marketplacePanel')) {
              setMaxHeight('marketplacePanel', 'marketplacePanelHeight');
            }
          } else {
            panel.style.display = 'none';
            panel.classList.remove('open');
            panel.classList.remove('fullscreen');
            setIsFullscreen(false);
          }
        }

        // Update button state
        const trigger = document.getElementById('tool-trigger-plugin-ai-assistant');
        if (trigger) {
          if (newState) {
            trigger.classList.add('active');
            trigger.setAttribute('aria-expanded', 'true');
            const arrow = trigger.querySelector('.library-arrow');
            if (arrow) arrow.textContent = '−';
          } else {
            trigger.classList.remove('active');
            trigger.setAttribute('aria-expanded', 'false');
            const arrow = trigger.querySelector('.library-arrow');
            if (arrow) arrow.textContent = '+';
          }
        }

        return newState;
      });
    };

    const handleFullscreen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsFullscreen(customEvent.detail);
    };

    window.addEventListener('toggle-ai-assistant-panel', handleToggle);
    window.addEventListener('ai-assistant-toggle-fullscreen', handleFullscreen);
    console.log('AIAssistantApp: Event listeners registered');

    return () => {
      window.removeEventListener('toggle-ai-assistant-panel', handleToggle);
      window.removeEventListener('ai-assistant-toggle-fullscreen', handleFullscreen);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setIsFullscreen(false);
    const panel = document.getElementById('aiAssistantPanel');
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('open');
      panel.classList.remove('fullscreen');
    }
    const trigger = document.getElementById('tool-trigger-plugin-ai-assistant');
    if (trigger) {
      trigger.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
      const arrow = trigger.querySelector('.library-arrow');
      if (arrow) arrow.textContent = '+';
    }
  };

  console.log('AIAssistantApp: render, isOpen =', isOpen);

  if (!isOpen) return null;

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <AIAssistantPanel
          onClose={handleClose}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => {
            const panel = document.getElementById('aiAssistantPanel');
            if (panel) {
              const newState = !panel.classList.contains('fullscreen');
              setIsFullscreen(newState);
              if (newState) {
                panel.classList.add('fullscreen');
              } else {
                panel.classList.remove('fullscreen');
              }
              window.dispatchEvent(new CustomEvent('ai-assistant-toggle-fullscreen', { detail: newState }));
            }
          }}
        />
      </Suspense>
    
  );
};

export const SceneComposerPanelApp: React.FC = () => {
  const handleSaveScene = async (scene: any) => {
    // The scene object passed here is a placeholder - we'll get the actual scene from VirtualStudio
    window.dispatchEvent(new CustomEvent('save-scene', { detail: scene }));
  };

  const handleLoadScene = (scene: any) => {
    window.dispatchEvent(new CustomEvent('load-scene', { detail: scene }));
  };

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <SceneComposerPanel onSaveScene={handleSaveScene} onLoadScene={handleLoadScene} />
      </Suspense>
    
  );
};

export const NotesPanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    const handleToggle = () => {
      if (isOpen && !isClosing) {
        setIsClosing(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsClosing(false);
        }, 350);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    };
    window.addEventListener('toggle-notes-panel', handleToggle);
    return () => window.removeEventListener('toggle-notes-panel', handleToggle);
  }, [isOpen, isClosing]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 350);
  };

  const showPanel = isOpen || isClosing;

  if (!showPanel) return null;

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <NotesPanel onClose={handleClose} isClosing={isClosing} />
      </Suspense>
    
  );
};

export const CinematographyPatternsApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openCinematographyPatterns', handleOpen);
    return () => window.removeEventListener('openCinematographyPatterns', handleOpen);
  }, []);

  const handleApplyPattern = async (pattern: CinematographyPattern) => {
    setApplyingId(pattern.id);
    await new Promise(resolve => setTimeout(resolve, 300));
    window.dispatchEvent(new CustomEvent('applyLightPattern', { detail: pattern }));
    setApplyingId(null);
    setIsOpen(false);
  };

  return (
    
      
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            borderRadius: 3,
            border: '2px solid rgba(255,170,0,0.3)',
            maxHeight: '85vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MovieIcon sx={{ color: '#ffaa00', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ color: '#ffaa00', fontWeight: 600 }}>
                Hollywood Lysmønstre
              </Typography>
              <Typography variant="caption" sx={{ color: '#999', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CameraIcon sx={{ fontSize: 14 }} />
                Profesjonelle lysmønstre fra film og fotografi
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setIsOpen(false)} sx={{ color: '#999' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Suspense fallback={<PanelLoadingFallback />}>
            <CinematographyPatternsPanel onApplyPattern={handleApplyPattern} />
          </Suspense>
        </DialogContent>
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          p: 2,
          justifyContent: 'space-between'
        }}>
          <Typography variant="caption" sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}>
            {applyingId ? (
              <><CircularProgress size={14} sx={{ color: '#ffaa00' }} /> Bruker mønster...</>
            ) : (
              'Klikk "Apply Pattern" for å bruke et lysmønster'
            )}
          </Typography>
          <Button onClick={() => setIsOpen(false)} variant="outlined" sx={{ borderColor: '#555', color: '#999' }}>
            Lukk
          </Button>
        </DialogActions>
      </Dialog>
    
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
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <LightPatternLibrary
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onApplyPattern={handleApplyPattern}
        />
      </Suspense>
    
  );
};

export const AvatarGeneratorApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => {
      console.log('AvatarGeneratorApp: Received openAvatarGenerator event');
      setIsOpen(true);
    };
    window.addEventListener('openAvatarGenerator', handleOpen);
    console.log('AvatarGeneratorApp: Event listener registered');
    return () => window.removeEventListener('openAvatarGenerator', handleOpen);
  }, []);

  React.useEffect(() => {
    console.log('AvatarGeneratorApp: isOpen changed to', isOpen);
  }, [isOpen]);

  const handleAvatarGenerated = (glbUrl: string, metadata: any) => {
    window.dispatchEvent(new CustomEvent('avatarGenerated', { detail: { glbUrl, metadata } }));
  };

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <AvatarGeneratorPanel
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onAvatarGenerated={handleAvatarGenerated}
        />
      </Suspense>
    
  );
};

// Environment Browser App
export const EnvironmentBrowserApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('openEnvironmentBrowser', handleOpen);
    window.addEventListener('closeEnvironmentBrowser', handleClose);
    return () => {
      window.removeEventListener('openEnvironmentBrowser', handleOpen);
      window.removeEventListener('closeEnvironmentBrowser', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <EnvironmentBrowser />
      </Suspense>
    
  );
};

// Animation Composer Panel App
export const AnimationComposerApp: React.FC = () => {
  return (
    
      
      <ToastProvider>
        <Suspense fallback={<PanelLoadingFallback />}>
          <AnimationComposerPanel />
        </Suspense>
      </ToastProvider>
    
  );
};

// Interactive Elements Browser App
export const InteractiveElementsBrowserApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('openInteractiveElements', handleOpen);
    window.addEventListener('closeInteractiveElements', handleClose);
    return () => {
      window.removeEventListener('openInteractiveElements', handleOpen);
      window.removeEventListener('closeInteractiveElements', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <InteractiveElementsBrowser />
      </Suspense>
    
  );
};

// Ambient Sounds Browser App
export const AmbientSoundsBrowserApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('openAmbientSounds', handleOpen);
    window.addEventListener('closeAmbientSounds', handleClose);
    return () => {
      window.removeEventListener('openAmbientSounds', handleOpen);
      window.removeEventListener('closeAmbientSounds', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <AmbientSoundsBrowserFallback />
      </Suspense>
    
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

// Virtual Studio Pro - Advanced production features
export const VirtualStudioProApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <VirtualStudioPro />
      </Suspense>
    
  );
};

// Accessories Panel App
export const AccessoriesPanelApp: React.FC = () => {
  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <AccessoriesPanel />
      </Suspense>
    
  );
};

// Story Character HUD — floating WASD character selector overlay
export const StoryCharacterHUDApp: React.FC = () => (
  <CustomThemeProvider>
    <StoryCharacterHUD />
  </CustomThemeProvider>
);

export const PosingModePanelApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <PosingModePanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export const GelPickerApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <GelPickerPanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export const OutdoorLightingApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <OutdoorLightingPanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);

export const CinematicEvaluationApp: React.FC = () => (
  <CustomThemeProvider>
    <ToastProvider>
      <Suspense fallback={<PanelLoadingFallback />}>
        <CinematicEvaluationPanel />
      </Suspense>
    </ToastProvider>
  </CustomThemeProvider>
);
