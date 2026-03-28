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
import { SceneComposerPanel as EagerSceneComposerPanel } from './components/SceneComposerPanel';
import { AIEnvironmentPlannerDialog } from './components/AIEnvironmentPlannerDialog';
import {
  consumeBufferedPanelPayload,
  consumeBufferedPanelVisibilityState,
  installBufferedPanelPayloadEvent,
  installBufferedPanelVisibilityEvents,
  markBufferedPanelReady,
} from './services/panelOpenBuffer';

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
const LazySceneComposerPanel = lazy(() => import('./components/SceneComposerPanel').then(m => ({ default: m.SceneComposerPanel })));
const AIAssistantPanel = lazy(() => import('./components/AIAssistantPanel').then(m => ({ default: m.AIAssistantPanel })));
const Accessible3DControls = lazy(() => import('./components/Accessible3DControls').then(m => ({ default: m.Accessible3DControls })));
const CinematographyPatternsPanel = lazy(() => import('./components/CinematographyPatternsPanel').then(m => ({ default: m.CinematographyPatternsPanel })));
const LightPatternLibrary = lazy(() => import('./panels/LightPatternLibrary').then(m => ({ default: m.LightPatternLibrary })));
const AvatarGeneratorPanel = lazy(() => import('./panels/AvatarGeneratorPanel').then(m => ({ default: m.AvatarGeneratorPanel })));
const ScenerPanel = lazy(() => import('./panels/ScenerPanel').then(m => ({ default: m.ScenerPanel })));
const TidslinjeLibraryPanel = lazy(() => import('./panels/TidslinjeLibraryPanel').then(m => ({ default: m.TidslinjeLibraryPanel })));
const AnimationComposerPanel = lazy(() => import('./panels/AnimationComposerPanel').then(m => ({ default: m.AnimationComposerPanel })));
const EnvironmentBrowser = lazy(() => import('./components/EnvironmentBrowser').then(m => ({ default: m.EnvironmentBrowser })));
const InteractiveElementsBrowser = lazy(() => import('./components/InteractiveElementsBrowser').then(m => ({ default: m.InteractiveElementsBrowser })));
const AmbientSoundsBrowserFallback = lazy(() => import('./components/AmbientSoundsBrowser').then(m => ({ default: m.AmbientSoundsBrowser })));
const VirtualStudioPro = lazy(() => import('./components/VirtualStudioPro').then(m => ({ default: m.VirtualStudioPro })));
const AccessoriesPanel = lazy(() => import('./panels/AccessoriesPanel').then(m => ({ default: m.AccessoriesPanel })));

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

const SceneComposerPanelComponent = import.meta.env.VITE_E2E_EAGER_PANELS === '1'
  ? EagerSceneComposerPanel
  : LazySceneComposerPanel;

type PendingLightPatternLibraryOpenRequest = {
  preferredPatternId?: string | null;
  openPreferredPatternDetails?: boolean;
};
type PendingVirtualStudioProOpenRequest = {
  panel?: string | null;
};
installBufferedPanelPayloadEvent<PendingLightPatternLibraryOpenRequest>('lightPatternLibrary', 'openLightPatternLibrary');
installBufferedPanelPayloadEvent<PendingVirtualStudioProOpenRequest>('virtualStudioPro', 'vs-open-pro-panel');
installBufferedPanelVisibilityEvents('cinematographyPatterns', 'openCinematographyPatterns');
installBufferedPanelVisibilityEvents('aiAssistant', 'vs-open-ai-assistant-panel', 'vs-close-ai-assistant-panel');
installBufferedPanelVisibilityEvents('notesPanel', 'vs-open-notes-panel', 'vs-close-notes-panel');
installBufferedPanelVisibilityEvents('avatarGenerator', 'openAvatarGenerator');
installBufferedPanelVisibilityEvents('environmentBrowser', 'openEnvironmentBrowser', 'closeEnvironmentBrowser');
installBufferedPanelVisibilityEvents('interactiveElements', 'openInteractiveElements', 'closeInteractiveElements');
installBufferedPanelVisibilityEvents('ambientSounds', 'openAmbientSounds', 'closeAmbientSounds');

interface AppProps {
  onActorGenerated?: (actorId: string) => void;
}

const AppContent: React.FC<AppProps> = ({ onActorGenerated }) => {
  const { mode, toggleTheme } = useCustomTheme();
  const [plannerOpen, setPlannerOpen] = React.useState(false);

  React.useEffect(() => {
    const appWindow = window as Window & {
      __virtualStudioGlobalEnvironmentPlannerHost?: {
        open: () => void;
        close: () => void;
        getSnapshot: () => { plannerOpen: boolean };
      };
    };

    const handleOpenPlanner = () => {
      setPlannerOpen(true);
    };

    const handleClosePlanner = () => {
      setPlannerOpen(false);
    };

    appWindow.__virtualStudioGlobalEnvironmentPlannerHost = {
      open: () => setPlannerOpen(true),
      close: () => setPlannerOpen(false),
      getSnapshot: () => ({ plannerOpen }),
    };

    window.addEventListener('vs-open-ai-environment-planner', handleOpenPlanner);
    window.addEventListener('vs-close-ai-environment-planner', handleClosePlanner);

    return () => {
      window.removeEventListener('vs-open-ai-environment-planner', handleOpenPlanner);
      window.removeEventListener('vs-close-ai-environment-planner', handleClosePlanner);
      delete appWindow.__virtualStudioGlobalEnvironmentPlannerHost;
    };
  }, [plannerOpen]);

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
      <AIEnvironmentPlannerDialog
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
      />
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
  const [plannerOpen, setPlannerOpen] = React.useState(false);

  React.useEffect(() => {
    const aiWindow = window as Window & {
      __virtualStudioGlobalEnvironmentPlannerHost?: {
        open: () => void;
        close: () => void;
        getSnapshot: () => { plannerOpen: boolean; aiAssistantOpen: boolean };
      };
    };

    const applyOpenState = (newState: boolean) => {
      const panel = document.getElementById('aiAssistantPanel');
      if (panel) {
        if (newState) {
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
            window.dispatchEvent(new CustomEvent('vs-close-marketplace-panel'));
          }

          const helpPanel = document.getElementById('helpPanel');
          if (helpPanel && helpPanel.classList.contains('open')) {
            window.dispatchEvent(new CustomEvent('vs-close-help-panel'));
          }

          panel.style.display = 'flex';
          panel.classList.add('open');

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
    };

    // Keep a dedicated toggle path for user-facing launchers and legacy callers.
    const handleToggle = () => {
      console.log('AIAssistantApp: toggle event received, current isOpen:', isOpen);
      setIsOpen(prev => {
        const newState = !prev;
        console.log('AIAssistantApp: setting isOpen from', prev, 'to', newState);
        applyOpenState(newState);
        return newState;
      });
    };

    const handleOpen = () => {
      setIsOpen(prev => {
        if (prev) {
          return prev;
        }
        applyOpenState(true);
        return true;
      });
    };

    const handleCloseEvent = () => {
      setIsOpen(prev => {
        if (!prev) {
          return prev;
        }
        applyOpenState(false);
        return false;
      });
    };

    const handleFullscreen = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsFullscreen(customEvent.detail);
    };

    const handleOpenEnvironmentPlanner = () => {
      setPlannerOpen(true);
    };

    const handleCloseEnvironmentPlanner = () => {
      setPlannerOpen(false);
    };

    const pendingIsOpen = consumeBufferedPanelVisibilityState('aiAssistant');
    if (pendingIsOpen !== null) {
      applyOpenState(pendingIsOpen);
      setIsOpen(pendingIsOpen);
    }

    window.addEventListener('toggle-ai-assistant-panel', handleToggle);
    window.addEventListener('vs-open-ai-assistant-panel', handleOpen);
    window.addEventListener('vs-close-ai-assistant-panel', handleCloseEvent);
    window.addEventListener('ai-assistant-toggle-fullscreen', handleFullscreen);
    window.addEventListener('vs-open-ai-environment-planner', handleOpenEnvironmentPlanner);
    window.addEventListener('vs-close-ai-environment-planner', handleCloseEnvironmentPlanner);
    markBufferedPanelReady('aiAssistant', true);
    aiWindow.__virtualStudioGlobalEnvironmentPlannerHost = {
      open: () => setPlannerOpen(true),
      close: () => setPlannerOpen(false),
      getSnapshot: () => ({
        plannerOpen,
        aiAssistantOpen: isOpen,
      }),
    };
    console.log('AIAssistantApp: Event listeners registered');

    return () => {
      markBufferedPanelReady('aiAssistant', false);
      window.removeEventListener('toggle-ai-assistant-panel', handleToggle);
      window.removeEventListener('vs-open-ai-assistant-panel', handleOpen);
      window.removeEventListener('vs-close-ai-assistant-panel', handleCloseEvent);
      window.removeEventListener('ai-assistant-toggle-fullscreen', handleFullscreen);
      window.removeEventListener('vs-open-ai-environment-planner', handleOpenEnvironmentPlanner);
      window.removeEventListener('vs-close-ai-environment-planner', handleCloseEnvironmentPlanner);
      delete aiWindow.__virtualStudioGlobalEnvironmentPlannerHost;
    };
  }, [isOpen, plannerOpen]);

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

  return (
    <>
      {isOpen && (
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
      )}
      <AIEnvironmentPlannerDialog
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
      />
    </>
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
        <SceneComposerPanelComponent onSaveScene={handleSaveScene} onLoadScene={handleLoadScene} />
      </Suspense>
    
  );
};

export const NotesPanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimeoutRef = React.useRef<number | null>(null);
  const stateRef = React.useRef({ isOpen: false, isClosing: false });

  React.useEffect(() => {
    stateRef.current = { isOpen, isClosing };
  }, [isOpen, isClosing]);

  const clearCloseTimeout = React.useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openPanel = React.useCallback(() => {
    clearCloseTimeout();
    setIsClosing(false);
    setIsOpen(true);
  }, [clearCloseTimeout]);

  const closePanel = React.useCallback(() => {
    clearCloseTimeout();
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
    }, 350);
  }, [clearCloseTimeout]);

  const togglePanel = React.useCallback(() => {
    const { isOpen: currentOpen, isClosing: currentClosing } = stateRef.current;
    if (currentOpen && !currentClosing) {
      closePanel();
      return;
    }
    if (!currentOpen) {
      openPanel();
    }
  }, [closePanel, openPanel]);

  React.useEffect(() => {
    const notesWindow = window as Window & {
      __virtualStudioGlobalNotesPanelHost?: {
        open: () => void;
        close: () => void;
        toggle: () => void;
        getSnapshot: () => { isOpen: boolean; isClosing: boolean };
      };
    };

    const handleToggle = () => {
      togglePanel();
    };

    const handleOpen = () => {
      openPanel();
    };

    const handleCloseEvent = () => {
      const { isOpen: currentOpen, isClosing: currentClosing } = stateRef.current;
      if (currentOpen || currentClosing) {
        closePanel();
      }
    };

    const pendingIsOpen = consumeBufferedPanelVisibilityState('notesPanel');
    if (pendingIsOpen !== null) {
      if (pendingIsOpen) {
        openPanel();
      } else {
        handleCloseEvent();
      }
    }

    notesWindow.__virtualStudioGlobalNotesPanelHost = {
      open: openPanel,
      close: handleCloseEvent,
      toggle: togglePanel,
      getSnapshot: () => {
        const { isOpen: currentOpen, isClosing: currentClosing } = stateRef.current;
        return {
          isOpen: currentOpen || currentClosing,
          isClosing: currentClosing,
        };
      },
    };

    markBufferedPanelReady('notesPanel', true);
    window.addEventListener('toggle-notes-panel', handleToggle);
    window.addEventListener('vs-open-notes-panel', handleOpen);
    window.addEventListener('vs-close-notes-panel', handleCloseEvent);
    return () => {
      markBufferedPanelReady('notesPanel', false);
      clearCloseTimeout();
      delete notesWindow.__virtualStudioGlobalNotesPanelHost;
      window.removeEventListener('toggle-notes-panel', handleToggle);
      window.removeEventListener('vs-open-notes-panel', handleOpen);
      window.removeEventListener('vs-close-notes-panel', handleCloseEvent);
    };
  }, [clearCloseTimeout, closePanel, openPanel, togglePanel]);

  const handleClose = () => {
    closePanel();
  };

  const showPanel = isOpen || isClosing;

  return (
    <Box
      data-testid="notes-panel-shell"
      data-open={showPanel ? 'true' : 'false'}
      data-closing={isClosing ? 'true' : 'false'}
      sx={{ display: 'contents' }}
    >
      {showPanel && (
        <Suspense fallback={<PanelLoadingFallback />}>
          <NotesPanel onClose={handleClose} isClosing={isClosing} />
        </Suspense>
      )}
    </Box>
  );
};

export const CinematographyPatternsApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const pendingIsOpen = consumeBufferedPanelVisibilityState('cinematographyPatterns');
    if (pendingIsOpen !== null) {
      setIsOpen(pendingIsOpen);
    }
    markBufferedPanelReady('cinematographyPatterns', true);
    window.addEventListener('openCinematographyPatterns', handleOpen);
    return () => {
      markBufferedPanelReady('cinematographyPatterns', false);
      window.removeEventListener('openCinematographyPatterns', handleOpen);
    };
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
  const [preferredPatternId, setPreferredPatternId] = React.useState<string | null>(null);
  const [openPreferredPatternDetails, setOpenPreferredPatternDetails] = React.useState(false);

  React.useEffect(() => {
    const applyOpenRequest = (request?: PendingLightPatternLibraryOpenRequest | null) => {
      setPreferredPatternId(request?.preferredPatternId ?? null);
      setOpenPreferredPatternDetails(Boolean(request?.openPreferredPatternDetails));
      setIsOpen(true);
    };
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<PendingLightPatternLibraryOpenRequest>;
      applyOpenRequest(customEvent.detail);
    };
    const pendingRequest = consumeBufferedPanelPayload<PendingLightPatternLibraryOpenRequest>('lightPatternLibrary');
    if (pendingRequest?.hasEvent) {
      applyOpenRequest(pendingRequest.payload);
    }
    markBufferedPanelReady('lightPatternLibrary', true);
    window.addEventListener('openLightPatternLibrary', handleOpen as EventListener);
    return () => {
      markBufferedPanelReady('lightPatternLibrary', false);
      window.removeEventListener('openLightPatternLibrary', handleOpen as EventListener);
    };
  }, []);

  const handleApplyPattern = async (pattern: any) => {
    window.dispatchEvent(new CustomEvent('applyLightPattern', { detail: pattern }));
    setIsOpen(false);
  };

  return (
    
      
      <Suspense fallback={<PanelLoadingFallback />}>
        <LightPatternLibrary
          open={isOpen}
          onClose={() => {
            setIsOpen(false);
            setPreferredPatternId(null);
            setOpenPreferredPatternDetails(false);
          }}
          onApplyPattern={handleApplyPattern}
          preferredPatternId={preferredPatternId}
          openPreferredPatternDetails={openPreferredPatternDetails}
        />
      </Suspense>
    
  );
};

export const AvatarGeneratorApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const pendingIsOpen = consumeBufferedPanelVisibilityState('avatarGenerator');
    if (pendingIsOpen !== null) {
      setIsOpen(pendingIsOpen);
    }
    const handleOpen = () => {
      console.log('AvatarGeneratorApp: Received openAvatarGenerator event');
      setIsOpen(true);
    };
    markBufferedPanelReady('avatarGenerator', true);
    window.addEventListener('openAvatarGenerator', handleOpen);
    console.log('AvatarGeneratorApp: Event listener registered');
    return () => {
      markBufferedPanelReady('avatarGenerator', false);
      window.removeEventListener('openAvatarGenerator', handleOpen);
    };
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
    const pendingIsOpen = consumeBufferedPanelVisibilityState('environmentBrowser');
    if (pendingIsOpen !== null) {
      setIsOpen(pendingIsOpen);
    }
    markBufferedPanelReady('environmentBrowser', true);
    window.addEventListener('openEnvironmentBrowser', handleOpen);
    window.addEventListener('closeEnvironmentBrowser', handleClose);
    return () => {
      markBufferedPanelReady('environmentBrowser', false);
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
    const pendingIsOpen = consumeBufferedPanelVisibilityState('interactiveElements');
    if (pendingIsOpen !== null) {
      setIsOpen(pendingIsOpen);
    }
    markBufferedPanelReady('interactiveElements', true);
    window.addEventListener('openInteractiveElements', handleOpen);
    window.addEventListener('closeInteractiveElements', handleClose);
    return () => {
      markBufferedPanelReady('interactiveElements', false);
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
    const pendingIsOpen = consumeBufferedPanelVisibilityState('ambientSounds');
    if (pendingIsOpen !== null) {
      setIsOpen(pendingIsOpen);
    }
    markBufferedPanelReady('ambientSounds', true);
    window.addEventListener('openAmbientSounds', handleOpen);
    window.addEventListener('closeAmbientSounds', handleClose);
    return () => {
      markBufferedPanelReady('ambientSounds', false);
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
  React.useEffect(() => {
    const appWindow = window as Window & {
      __virtualStudioGlobalVirtualStudioProHost?: {
        open: (panel?: string | null) => void;
        close: (panel?: string | null) => void;
        getSnapshot: () => { activePanel: string | null };
      };
    };

    const handleOpenProPanel = (event: Event) => {
      const customEvent = event as CustomEvent<PendingVirtualStudioProOpenRequest>;
      appWindow.__virtualStudioGlobalVirtualStudioProHost?.open(customEvent.detail?.panel ?? null);
    };

    const handleCloseProPanel = (event: Event) => {
      const customEvent = event as CustomEvent<PendingVirtualStudioProOpenRequest>;
      appWindow.__virtualStudioGlobalVirtualStudioProHost?.close(customEvent.detail?.panel ?? null);
    };

    window.addEventListener('vs-open-pro-panel', handleOpenProPanel as EventListener);
    window.addEventListener('vs-close-pro-panel', handleCloseProPanel as EventListener);

    return () => {
      window.removeEventListener('vs-open-pro-panel', handleOpenProPanel as EventListener);
      window.removeEventListener('vs-close-pro-panel', handleCloseProPanel as EventListener);
    };
  }, []);

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
