/**
 * Virtual Studio Pro Integration
 * Wrapper component that integrates all professional virtual production features
 * into the main Virtual Studio application
 */

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { ThemeProvider, createTheme, Box, Badge, CircularProgress } from '@mui/material';
import {
  Groups as CollabIcon,
  ViewInAr as XRIcon,
  Animation as AnimIcon,
  LiveTv as StreamIcon,
  Tune as RenderIcon,
  Download as ExportIcon,
  Whatshot as ParticleIcon,
  SpatialAudio as AudioIcon
} from '@mui/icons-material';
import * as BABYLON from '@babylonjs/core';

// Lazy load Pro panels for better initial load performance
const CollaborationPanel = lazy(() => import('./CollaborationPanel').then(m => ({ default: m.CollaborationPanel })));
const XRControlsPanel = lazy(() => import('./XRControlsPanel').then(m => ({ default: m.XRControlsPanel })));
const CharacterAnimationPanel = lazy(() => import('./CharacterAnimationPanel').then(m => ({ default: m.CharacterAnimationPanel })));
const LiveStreamingPanel = lazy(() => import('./LiveStreamingPanel').then(m => ({ default: m.LiveStreamingPanel })));
const RenderingPanel = lazy(() => import('./RenderingPanel').then(m => ({ default: m.RenderingPanel })));
const ExportPanel = lazy(() => import('./ExportPanel').then(m => ({ default: m.ExportPanel })));
const ParticlePanel = lazy(() => import('./ParticlePanel').then(m => ({ default: m.ParticlePanel })));
const SpatialAudioPanel = lazy(() => import('./SpatialAudioPanel').then(m => ({ default: m.SpatialAudioPanel })));

// Import stores for status badges
import { useCollaborationStore } from '../services/collaborationService';
import { useStreamingStore } from '../services/streamingService';
import { useParticleStore } from '../services/particleService';
import { useSpatialAudioStore } from '../services/spatialAudioService';

// Loading fallback component
const PanelLoadingFallback = () => (
  <Box sx={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: 200,
    color: '#00d4ff'
  }}>
    <CircularProgress size={40} color="inherit" />
  </Box>
);

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00d4ff' },
    secondary: { main: '#e91e63' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#3b82f6' },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(20, 20, 25, 0.95)'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    fontSize: 12
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(10px)'
        }
      }
    }
  }
});

type PanelType = 'collaboration' | 'xr' | 'animation' | 'streaming' | 'rendering' | 'export' | 'particles' | 'audio' | null;

interface VirtualStudioProProps {
  scene?: BABYLON.Scene | null;
  camera?: BABYLON.Camera | null;
}

export const VirtualStudioPro: React.FC<VirtualStudioProProps> = ({ scene: propScene, camera: propCamera }) => {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [scene, setScene] = useState<BABYLON.Scene | null>(propScene || null);
  const [camera, setCamera] = useState<BABYLON.Camera | null>(propCamera || null);
  
  // Get status from stores for badges
  const collaborators = useCollaborationStore(state => state.collaborators);
  const isStreaming = useStreamingStore(state => state.isStreaming);
  const activeSystems = useParticleStore(state => state.activeSystems);
  const audioSources = useSpatialAudioStore(state => state.sources);
  
  // Connect to Babylon.js scene from window.virtualStudio if not passed as prop
  useEffect(() => {
    if (propScene) {
      setScene(propScene);
      return;
    }
    
    const checkScene = () => {
      const studio = (window as any).virtualStudio;
      if (studio?.scene) {
        setScene(studio.scene);
        if (studio.camera) {
          setCamera(studio.camera);
        }
        return true;
      }
      return false;
    };
    
    if (!checkScene()) {
      const interval = setInterval(() => {
        if (checkScene()) {
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [propScene]);
  
  useEffect(() => {
    if (propCamera) {
      setCamera(propCamera);
    }
  }, [propCamera]);
  
  // Listen for toggle-pro-panel events from the TopView Pro menu
  useEffect(() => {
    const handleTogglePanel = (e: CustomEvent<{ panel: string }>) => {
      const panel = e.detail.panel as PanelType;
      if (panel) {
        setActivePanel(current => current === panel ? null : panel);
      }
    };
    
    window.addEventListener('toggle-pro-panel', handleTogglePanel as EventListener);
    return () => {
      window.removeEventListener('toggle-pro-panel', handleTogglePanel as EventListener);
    };
  }, []);
  
  const togglePanel = useCallback((panel: PanelType) => {
    setActivePanel(current => current === panel ? null : panel);
  }, []);
  
  const actions = [
    { 
      icon: <Badge badgeContent={collaborators.size} color="primary"><CollabIcon /></Badge>, 
      name: 'Collaboration',
      panel: 'collaboration' as PanelType,
      tooltip: 'Real-time collaboration'
    },
    { 
      icon: <XRIcon />, 
      name: 'VR/AR',
      panel: 'xr' as PanelType,
      tooltip: 'WebXR VR/AR mode'
    },
    { 
      icon: <AnimIcon />, 
      name: 'Animation',
      panel: 'animation' as PanelType,
      tooltip: 'Character animation'
    },
    { 
      icon: <Badge variant={isStreaming ? 'dot' : 'standard'} color="error"><StreamIcon /></Badge>, 
      name: 'Streaming',
      panel: 'streaming' as PanelType,
      tooltip: 'Live streaming'
    },
    { 
      icon: <RenderIcon />, 
      name: 'Rendering',
      panel: 'rendering' as PanelType,
      tooltip: 'Advanced rendering'
    },
    { 
      icon: <ExportIcon />, 
      name: 'Export',
      panel: 'export' as PanelType,
      tooltip: 'Export scene'
    },
    { 
      icon: <Badge badgeContent={activeSystems.length || undefined} color="warning"><ParticleIcon /></Badge>, 
      name: 'Particles',
      panel: 'particles' as PanelType,
      tooltip: 'Particle effects'
    },
    { 
      icon: <Badge badgeContent={audioSources.filter(s => s.isPlaying).length || undefined} color="secondary"><AudioIcon /></Badge>, 
      name: 'Audio',
      panel: 'audio' as PanelType,
      tooltip: 'Spatial audio'
    }
  ];
  
  return (
    <ThemeProvider theme={darkTheme}>
      {/* Panels - positioned based on active panel */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 900 }}>
        {/* Each panel manages its own positioning - wrapped in Suspense for lazy loading */}
        <Suspense fallback={<PanelLoadingFallback />}>
          {activePanel === 'collaboration' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <CollaborationPanel />
            </Box>
          )}
          
          {activePanel === 'xr' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <XRControlsPanel scene={scene} />
            </Box>
          )}
          
          {activePanel === 'animation' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <CharacterAnimationPanel />
            </Box>
          )}
          
          {activePanel === 'streaming' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <LiveStreamingPanel />
            </Box>
          )}
          
          {activePanel === 'rendering' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <RenderingPanel scene={scene} camera={camera} />
            </Box>
          )}
          
          {activePanel === 'export' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <ExportPanel scene={scene} />
            </Box>
          )}
          
          {activePanel === 'particles' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <ParticlePanel scene={scene} />
            </Box>
          )}
          
          {activePanel === 'audio' && (
            <Box sx={{ pointerEvents: 'auto' }}>
              <SpatialAudioPanel scene={scene} camera={camera} />
            </Box>
          )}
        </Suspense>
      </Box>
    </ThemeProvider>
  );
};

export default VirtualStudioPro;
