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
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon, Movie as MovieIcon, CameraAlt as CameraIcon, Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { ToastProvider } from './components/ToastStack';
import { AccessibilityProvider } from './providers/AccessibilityProvider';
import { AcademyProvider } from './contexts/AcademyContext';
import { DemoModeProvider } from './contexts/DemoModeContext';
import { EnhancedMasterIntegrationProvider } from './integration/EnhancedMasterIntegrationProvider';
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
const MarketplacePanel = lazy(() => import('./components/MarketplacePanel').then(m => ({ default: m.MarketplacePanel })));
const CastingPlannerPanel = lazy(() => import('./components/CastingPlannerPanel').then(m => ({ default: m.CastingPlannerPanel })));
const AIAssistantPanel = lazy(() => import('./components/AIAssistantPanel').then(m => ({ default: m.AIAssistantPanel })));
const Accessible3DControls = lazy(() => import('./components/Accessible3DControls').then(m => ({ default: m.Accessible3DControls })));
const CinematographyPatternsPanel = lazy(() => import('./components/CinematographyPatternsPanel').then(m => ({ default: m.CinematographyPatternsPanel })));
const LightPatternLibrary = lazy(() => import('./panels/LightPatternLibrary').then(m => ({ default: m.LightPatternLibrary })));
const AvatarGeneratorPanel = lazy(() => import('./panels/AvatarGeneratorPanel').then(m => ({ default: m.AvatarGeneratorPanel })));
const ScenerPanel = lazy(() => import('./panels/ScenerPanel').then(m => ({ default: m.ScenerPanel })));
const TidslinjeLibraryPanel = lazy(() => import('./panels/TidslinjeLibraryPanel').then(m => ({ default: m.TidslinjeLibraryPanel })));
const AnimationComposerPanel = lazy(() => import('./panels/AnimationComposerPanel').then(m => ({ default: m.AnimationComposerPanel })));
const CourseCreatorSidebar = lazy(() => import('./components/CourseCreatorSidebar'));
const SoundBrowser = lazy(() => import('./components/SoundBrowser').then(m => ({ default: m.SoundBrowser })));
const EnvironmentBrowser = lazy(() => import('./components/EnvironmentBrowser').then(m => ({ default: m.EnvironmentBrowser })));
const InteractiveElementsBrowser = lazy(() => import('./components/InteractiveElementsBrowser').then(m => ({ default: m.InteractiveElementsBrowser })));
const AmbientSoundsBrowserFallback = lazy(() => import('./components/AmbientSoundsBrowser').then(m => ({ default: m.AmbientSoundsBrowser })));
const PanelCreator = lazy(() => import('./components/PanelCreator'));
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <AssetLibraryPanel />
      </Suspense>
    </ThemeProvider>
  );
};

export const CharacterLoaderApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <CharacterModelLoader />
      </Suspense>
    </ThemeProvider>
  );
};

export const LightsBrowserApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <LightsBrowser />
      </Suspense>
    </ThemeProvider>
  );
};

export const CameraGearApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <CameraGearPanel />
      </Suspense>
    </ThemeProvider>
  );
};

export const HDRIPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <HDRIPanel />
      </Suspense>
    </ThemeProvider>
  );
};

export const EquipmentPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <EquipmentPanel />
      </Suspense>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <ScenerPanel 
          onApplyPreset={handleApplyPreset} 
          onShowRecommended={handleShowRecommended}
          getCurrentSceneConfig={getCurrentSceneConfig}
        />
      </Suspense>
    </ThemeProvider>
  );
};

export const TidslinjeLibraryPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <TidslinjeLibraryPanel />
      </Suspense>
    </ThemeProvider>
  );
};

export const LibraryPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <LibraryPanel />
      </Suspense>
    </ThemeProvider>
  );
};

export const MarketplacePanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleToggle = () => {
      console.log('MarketplacePanelApp: toggle event received, current isOpen:', isOpen);
      setIsOpen(prev => {
        const newState = !prev;
        console.log('MarketplacePanelApp: setting isOpen from', prev, 'to', newState);
        
        // Toggle panel visibility
        const panel = document.getElementById('marketplacePanel');
        if (panel) {
          if (newState) {
            // Close other panels when opening Marketplace
            const studioLibraryPanel = document.getElementById('actorBottomPanel');
            const castingPlannerPanel = document.getElementById('castingPlannerPanel');
            
            if (studioLibraryPanel && studioLibraryPanel.classList.contains('open')) {
              const trigger = document.getElementById('actorPanelTrigger');
              if (trigger) {
                studioLibraryPanel.classList.remove('open');
                trigger.classList.remove('active');
                trigger.setAttribute('aria-expanded', 'false');
                const arrow = trigger.querySelector('.library-arrow');
                if (arrow) arrow.textContent = '+';
                const actorTab = document.getElementById('actorTab');
                if (actorTab) actorTab.classList.remove('panel-open');
              }
            }
            if (castingPlannerPanel && castingPlannerPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
            }
            
            panel.style.display = 'flex';
            panel.classList.add('open');
          } else {
            panel.style.display = 'none';
            panel.classList.remove('open');
            panel.classList.remove('fullscreen');
            setIsFullscreen(false);
          }
        }
        
        // Update button state
        const trigger = document.getElementById('marketplaceTrigger');
        const quickBtn = document.getElementById('marketplaceQuickBtn');
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
        if (quickBtn) {
          if (newState) {
            quickBtn.classList.add('active');
          } else {
            quickBtn.classList.remove('active');
          }
        }
        
        return newState;
      });
    };
    
    const handleFullscreenToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsFullscreen(customEvent.detail);
    };
    
    window.addEventListener('toggle-marketplace-panel', handleToggle);
    window.addEventListener('marketplace-toggle-fullscreen', handleFullscreenToggle);
    console.log('MarketplacePanelApp: Event listener registered');
    return () => {
      window.removeEventListener('toggle-marketplace-panel', handleToggle);
      window.removeEventListener('marketplace-toggle-fullscreen', handleFullscreenToggle);
    };
  }, [isOpen]);

  // Update button state when closing via onClose
  const handleClose = () => {
    setIsOpen(false);
    setIsFullscreen(false);
    const panel = document.getElementById('marketplacePanel');
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('open');
      panel.classList.remove('fullscreen');
    }
    const trigger = document.getElementById('marketplaceTrigger');
    const quickBtn = document.getElementById('marketplaceQuickBtn');
    if (trigger) {
      trigger.classList.remove('active');
      trigger.setAttribute('aria-expanded', 'false');
      const arrow = trigger.querySelector('.library-arrow');
      if (arrow) arrow.textContent = '+';
    }
    if (quickBtn) {
      quickBtn.classList.remove('active');
    }
  };

  const handleToggleFullscreen = () => {
    const panel = document.getElementById('marketplacePanel');
    if (panel) {
      const newFullscreen = !isFullscreen;
      setIsFullscreen(newFullscreen);
      if (newFullscreen) {
        panel.classList.add('fullscreen');
        panel.style.position = 'fixed';
        panel.style.top = '0';
        panel.style.left = '0';
        panel.style.right = '0';
        panel.style.bottom = '0';
        panel.style.zIndex = '99999';
      } else {
        panel.classList.remove('fullscreen');
        panel.style.position = '';
        panel.style.top = '';
        panel.style.left = '';
        panel.style.right = '';
        panel.style.bottom = '';
        panel.style.zIndex = '';
      }
    }
  };

  console.log('MarketplacePanelApp: render, isOpen =', isOpen);
  
  if (!isOpen) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ToastProvider>
        <Suspense fallback={<PanelLoadingFallback />}>
          <MarketplacePanel onClose={handleClose} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
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
            const castingPlannerPanel = document.getElementById('castingPlannerPanel');

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
            if (castingPlannerPanel && castingPlannerPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-plugin-casting-planner-panel'));
            }
            
            // Close help panel if open
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-help-panel'));
            }
            
            // Close CourseCreatorSidebar if open
            window.dispatchEvent(new CustomEvent('close-course-creator-sidebar'));
            
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
};

export const CastingPlannerApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => {
        const newState = !prev;
        
        // Toggle panel visibility
        const panel = document.getElementById('castingPlannerPanel');
        if (panel) {
          if (newState) {
            // Close other panels when opening Casting Planner
            const studioLibraryPanel = document.getElementById('actorBottomPanel');
            const marketplacePanel = document.getElementById('marketplacePanel');
            const aiAssistantPanel = document.getElementById('aiAssistantPanel');

            if (studioLibraryPanel && studioLibraryPanel.classList.contains('open')) {
              const trigger = document.getElementById('actorPanelTrigger');
              if (trigger) {
                studioLibraryPanel.classList.remove('open');
                trigger.classList.remove('active');
                trigger.setAttribute('aria-expanded', 'false');
                const arrow = trigger.querySelector('.library-arrow');
                if (arrow) arrow.textContent = '+';
                const actorTab = document.getElementById('actorTab');
                if (actorTab) actorTab.classList.remove('panel-open');
              }
            }
            if (marketplacePanel && marketplacePanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-marketplace-panel'));
            }
            if (aiAssistantPanel && aiAssistantPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-ai-assistant-panel'));
            }

            // Close help panel if open
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-help-panel'));
            }

            // Close CourseCreatorSidebar if open
            window.dispatchEvent(new CustomEvent('close-course-creator-sidebar'));

            panel.style.display = 'flex';
            panel.classList.add('open');
            
            // Check if any panel was at max height and set new panel to max height if so
            const checkMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight;
            const setMaxHeight = (window as any).setPanelToMaxHeight;
            if (checkMaxHeight && setMaxHeight && checkMaxHeight('aiAssistantPanel')) {
              setMaxHeight('aiAssistantPanel', 'aiAssistantPanelHeight');
            }
          } else {
            panel.style.display = 'none';
            panel.classList.remove('open');
            panel.classList.remove('fullscreen');
            setIsFullscreen(false);
          }
        }
        
        // Update button state - find the Casting Planner button
        const button = document.getElementById('tool-trigger-plugin-casting-planner');
        const quickBtn = document.getElementById('castingPlannerQuickBtn');
        if (button) {
          if (newState) {
            button.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
            const arrow = button.querySelector('.library-arrow');
            if (arrow) arrow.textContent = '−';
          } else {
            button.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
            const arrow = button.querySelector('.library-arrow');
            if (arrow) arrow.textContent = '+';
          }
        }
        if (quickBtn) {
          if (newState) {
            quickBtn.classList.add('active');
          } else {
            quickBtn.classList.remove('active');
          }
        }
        
        return newState;
      });
    };
    
    const handleFullscreenToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsFullscreen(customEvent.detail);
    };
    
    window.addEventListener('toggle-plugin-casting-planner-panel', handleToggle);
    window.addEventListener('casting-planner-toggle-fullscreen', handleFullscreenToggle);
    return () => {
      window.removeEventListener('toggle-plugin-casting-planner-panel', handleToggle);
      window.removeEventListener('casting-planner-toggle-fullscreen', handleFullscreenToggle);
    };
  }, [isOpen]);

  // Update button state when closing via onClose
  const handleClose = () => {
    setIsOpen(false);
    setIsFullscreen(false);
    const panel = document.getElementById('castingPlannerPanel');
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('open');
      panel.classList.remove('fullscreen');
    }
    const button = document.getElementById('tool-trigger-plugin-casting-planner');
    const quickBtn = document.getElementById('castingPlannerQuickBtn');
    if (button) {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
      const arrow = button.querySelector('.library-arrow');
      if (arrow) arrow.textContent = '+';
    }
    if (quickBtn) {
      quickBtn.classList.remove('active');
    }
  };

  const handleToggleFullscreen = () => {
    const panel = document.getElementById('castingPlannerPanel');
    if (panel) {
      const newFullscreen = !isFullscreen;
      setIsFullscreen(newFullscreen);
      
      // Match Marketplace fullscreen behavior exactly
      if (newFullscreen) {
        panel.classList.add('fullscreen');
        panel.style.position = 'fixed';
        panel.style.top = '0';
        panel.style.left = '0';
        panel.style.right = '0';
        panel.style.bottom = '0';
        panel.style.zIndex = '99999';
        panel.style.borderRadius = '0';
        panel.style.height = ''; // Let CSS handle height
      } else {
        panel.classList.remove('fullscreen');
        panel.style.position = '';
        panel.style.top = '';
        panel.style.left = '';
        panel.style.right = '';
        panel.style.bottom = '';
        panel.style.zIndex = '';
        panel.style.borderRadius = '';
        panel.style.height = '';
      }
      
      // Dispatch event to sync with main.ts listeners
      window.dispatchEvent(new CustomEvent('casting-planner-toggle-fullscreen', { detail: newFullscreen }));
    }
  };

  if (!isOpen) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ToastProvider>
        <Suspense fallback={<PanelLoadingFallback />}>
          <CastingPlannerPanel onClose={handleClose} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <SceneComposerPanel onSaveScene={handleSaveScene} onLoadScene={handleLoadScene} />
      </Suspense>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <NotesPanel onClose={handleClose} isClosing={isClosing} />
      </Suspense>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="md"
        fullWidth
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
              <Typography variant="caption" sx={{ color: '#999' }}>
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
          <Typography variant="caption" sx={{ color: '#666' }}>
            Klikk "Apply Pattern" for å bruke et lysmønster
          </Typography>
          <Button onClick={() => setIsOpen(false)} variant="outlined" sx={{ borderColor: '#555', color: '#999' }}>
            Lukk
          </Button>
        </DialogActions>
      </Dialog>
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
      <Suspense fallback={<PanelLoadingFallback />}>
        <LightPatternLibrary
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onApplyPattern={handleApplyPattern}
        />
      </Suspense>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <AvatarGeneratorPanel
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onAvatarGenerated={handleAvatarGenerated}
        />
      </Suspense>
    </ThemeProvider>
  );
};

// Sound Browser App
export const SoundBrowserApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener('openSoundBrowser', handleOpen);
    window.addEventListener('closeSoundBrowser', handleClose);
    return () => {
      window.removeEventListener('openSoundBrowser', handleOpen);
      window.removeEventListener('closeSoundBrowser', handleClose);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <SoundBrowser />
      </Suspense>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <EnvironmentBrowser />
      </Suspense>
    </ThemeProvider>
  );
};

// Animation Composer Panel App
export const AnimationComposerApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ToastProvider>
        <Suspense fallback={<PanelLoadingFallback />}>
          <AnimationComposerPanel />
        </Suspense>
      </ToastProvider>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <InteractiveElementsBrowser />
      </Suspense>
    </ThemeProvider>
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <AmbientSoundsBrowser />
      </Suspense>
    </ThemeProvider>
  );
};

// Course Creator Sidebar App - for video editing
export const CourseCreatorSidebarApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const [currentVideo, setCurrentVideo] = React.useState<any>(null);

  React.useEffect(() => {
    console.log('CourseCreatorSidebarApp: Setting up edit-video listener');
    
    const handleEditVideo = (e: Event) => {
      const customEvent = e as CustomEvent;
      const videoData = customEvent.detail;
      
      console.log('CourseCreatorSidebarApp: Received edit-video event', videoData);
      
      if (!videoData) {
        console.warn('CourseCreatorSidebarApp: No video data in event');
        return;
      }
      
      // Stop event propagation to prevent other handlers from running
      if (e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
      
      // Ensure help panel is open (since sidebar is inside help panel)
      const helpPanel = document.getElementById('helpPanel');
      if (helpPanel && !helpPanel.classList.contains('open')) {
        console.log('CourseCreatorSidebarApp: Opening help panel first');
        window.dispatchEvent(new CustomEvent('toggle-help-panel'));
        
        // Wait for help panel to open, then open sidebar
        setTimeout(() => {
          setCurrentVideo(videoData);
          setIsOpen(true);
          setActiveTab(0); // Switch to video details tab
          console.log('CourseCreatorSidebarApp: Sidebar opened with data:', videoData);
        }, 600);
      } else {
        // Help panel is already open, open sidebar immediately (but with small delay to ensure DOM is ready)
        setTimeout(() => {
          setCurrentVideo(videoData);
          setIsOpen(true);
          setActiveTab(0); // Switch to video details tab
          console.log('CourseCreatorSidebarApp: Sidebar opened with data:', videoData);
        }, 100);
      }
    };

    // Close sidebar when other panels open
    const handlePanelToggle = () => {
      setIsOpen((prevIsOpen) => {
        if (prevIsOpen) {
          console.log('CourseCreatorSidebarApp: Closing sidebar because another panel opened');
          setCurrentVideo(null);
          return false;
        }
        return prevIsOpen;
      });
    };

    // Close sidebar when explicitly requested
    const handleCloseSidebar = () => {
      setIsOpen((prevIsOpen) => {
        if (prevIsOpen) {
          console.log('CourseCreatorSidebarApp: Closing sidebar via close event');
          setCurrentVideo(null);
          return false;
        }
        return prevIsOpen;
      });
    };

    // Close sidebar when help panel closes (since sidebar is inside help panel)
    const handleHelpPanelClose = () => {
      const helpPanel = document.getElementById('helpPanel');
      if (helpPanel && !helpPanel.classList.contains('open')) {
        setIsOpen((prevIsOpen) => {
          if (prevIsOpen) {
            console.log('CourseCreatorSidebarApp: Closing sidebar because help panel closed');
            setCurrentVideo(null);
            return false;
          }
          return prevIsOpen;
        });
      }
    };

    // Use capture phase to handle event before other listeners
    window.addEventListener('edit-video', handleEditVideo, true);
    
    // Listen for panel toggle events (but NOT toggle-help-panel, since sidebar is inside help panel)
    window.addEventListener('toggle-marketplace-panel', handlePanelToggle);
    window.addEventListener('toggle-ai-assistant-panel', handlePanelToggle);
    window.addEventListener('toggle-plugin-casting-planner-panel', handlePanelToggle);
    window.addEventListener('close-course-creator-sidebar', handleCloseSidebar);
    
    // Check help panel state periodically (since it doesn't dispatch events)
    const checkHelpPanelInterval = setInterval(() => {
      handleHelpPanelClose();
    }, 100);
    
    console.log('CourseCreatorSidebarApp: Event listeners registered');
    
    return () => {
      window.removeEventListener('edit-video', handleEditVideo, true);
      window.removeEventListener('toggle-marketplace-panel', handlePanelToggle);
      window.removeEventListener('toggle-ai-assistant-panel', handlePanelToggle);
      window.removeEventListener('toggle-plugin-casting-planner-panel', handlePanelToggle);
      window.removeEventListener('close-course-creator-sidebar', handleCloseSidebar);
      clearInterval(checkHelpPanelInterval);
      console.log('CourseCreatorSidebarApp: Event listeners removed');
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setCurrentVideo(null);
  };

  const handleCourseUpdate = (updatedCourse: any) => {
    if (!currentVideo) return;
    
    // Update the video in the DOM
    const placeholder = document.querySelector(
      `.help-video-placeholder[data-video-id="${currentVideo.videoId}"], .help-video-player-container[data-video-id="${currentVideo.videoId}"]`
    ) as HTMLElement;
    
    if (placeholder) {
      // Update data attributes
      if (updatedCourse.videoUrl) {
        placeholder.setAttribute('data-video-url', updatedCourse.videoUrl);
      }
      if (updatedCourse.thumbnailUrl) {
        placeholder.setAttribute('data-thumbnail-url', updatedCourse.thumbnailUrl);
      }
      
      // If it's still a placeholder (not mounted), update HTML
      if (placeholder.classList.contains('help-video-placeholder')) {
        const titleEl = placeholder.querySelector('.video-info h4');
        const descEl = placeholder.querySelector('.video-info p');
        const durationEl = placeholder.querySelector('.video-duration');
        
        if (titleEl) titleEl.textContent = updatedCourse.title || currentVideo.title;
        if (descEl) descEl.textContent = updatedCourse.description || currentVideo.description;
        if (durationEl) durationEl.textContent = updatedCourse.duration || currentVideo.duration;
      } else {
        // Remount with new data
        placeholder.setAttribute('data-video-url', updatedCourse.videoUrl || '');
        placeholder.setAttribute('data-thumbnail-url', updatedCourse.thumbnailUrl || '');
        placeholder.classList.add('help-video-placeholder');
        placeholder.classList.remove('help-video-player-container');
        placeholder.innerHTML = `
          <div class="video-thumbnail">
            <div class="video-gradient-overlay"></div>
            <span class="video-play-icon">▶</span>
            <span class="video-duration">${updatedCourse.duration || currentVideo.duration}</span>
          </div>
          <div class="video-info">
            <h4>${updatedCourse.title || currentVideo.title}</h4>
            <p>${updatedCourse.description || currentVideo.description}</p>
            <span class="video-status">${updatedCourse.videoUrl ? 'Klikk for å spille av' : 'Video kommer snart'}</span>
          </div>
        `;
        
        // Remount video player
        setTimeout(() => {
          const { mountHelpVideoPlayers } = require('./components/HelpVideoPlayer');
          mountHelpVideoPlayers();
        }, 0);
      }
      
      // Update current video state
      setCurrentVideo({ ...currentVideo, ...updatedCourse });
    }
  };

  // Always render the component (even when closed) so event listeners stay active
  // But only render CourseCreatorSidebar when open
  return (
    <React.Fragment>
      {isOpen && (
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <DemoModeProvider>
            <AcademyProvider>
              <EnhancedMasterIntegrationProvider>
                <Suspense fallback={<PanelLoadingFallback />}>
                  <CourseCreatorSidebar
                    open={isOpen}
                    onClose={handleClose}
                    course={currentVideo ? {
                      id: currentVideo.videoId,
                      title: currentVideo.title,
                      description: currentVideo.description,
                      status: 'draft',
                      videoUrl: currentVideo.videoUrl,
                      thumbnailUrl: currentVideo.thumbnailUrl,
                      duration: currentVideo.duration,
                    } : {
                      id: 'new-video',
                      title: 'Ny video',
                      description: '',
                      status: 'draft',
                    }}
                  onCourseUpdate={handleCourseUpdate}
                  onPublish={() => {}}
                  onSaveDraft={handleCourseUpdate}
                  onPreview={() => {}}
                  onShare={() => {}}
                  onExport={() => {}}
                  onImport={() => {}}
                  onDelete={() => {}}
                  onVersionRestore={() => {}}
                  onVersionCreate={() => {}}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  modules={[]}
                  lessons={[]}
                  resources={[]}
                  lowerThirds={[]}
                />
                </Suspense>
              </EnhancedMasterIntegrationProvider>
            </AcademyProvider>
          </DemoModeProvider>
        </ThemeProvider>
      )}
    </React.Fragment>
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
    </ThemeProvider>
  );
};

// Virtual Studio Pro - Advanced production features
export const VirtualStudioProApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <VirtualStudioPro />
      </Suspense>
    </ThemeProvider>
  );
};

// Accessories Panel App
export const AccessoriesPanelApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Suspense fallback={<PanelLoadingFallback />}>
        <AccessoriesPanel />
      </Suspense>
    </ThemeProvider>
  );
};
