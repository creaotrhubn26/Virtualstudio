/**
 * LoadingOverlay - Full-screen loading overlay with animated icons
 *
 * Professional loading animations for Virtual Studio operations.
 */

import React from 'react';
import { Box, Typography, LinearProgress, keyframes } from '@mui/material';
import { useLoadingStore, LoadingStage } from '../state/loadingStore';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const cameraFlash = keyframes`
  0%, 90%, 100% { opacity: 0; }
  92% { opacity: 1; }
`;

const filmRoll = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const modelRotate = keyframes`
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
`;

const clipboardWrite = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(2px); }
`;

const sunRise = keyframes`
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
  50% { transform: translateY(-4px) scale(1.1); opacity: 1; }
`;

const gearSpin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const saveFlicker = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const STAGE_COLORS: Record<LoadingStage, string> = {
  'idle': '#64748b',
  'initializing': '#f59e0b',
  'loading-scene': '#8b5cf6',
  'loading-model': '#06b6d4',
  'loading-hdri': '#22c55e',
  'loading-assets': '#3b82f6',
  'processing': '#f97316',
  'saving': '#6366f1',
  'exporting': '#ec4899',
};

// Animated Camera Icon (taking photos)
const CameraIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ position: 'relative', width: 64, height: 64 }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      {/* Camera body */}
      <rect x="8" y="18" width="48" height="36" rx="4" fill={color} opacity="0.9" />
      {/* Lens */}
      <circle cx="32" cy="36" r="12" fill="#1a1a2e" stroke={color} strokeWidth="3" />
      <circle cx="32" cy="36" r="6" fill={color} opacity="0.6" />
      {/* Viewfinder */}
      <rect x="22" y="12" width="20" height="8" rx="2" fill={color} opacity="0.7" />
      {/* Flash */}
      <rect x="44" y="22" width="8" height="6" rx="1" fill="#fff" opacity="0.8" />
    </svg>
    {/* Flash effect */}
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
        animation: `${cameraFlash} 2s ease-in-out infinite`,
        pointerEvents: 'none',
      }}
    />
  </Box>
);

// Animated Film Camera Icon (recording)
const FilmCameraIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ position: 'relative', width: 64, height: 64 }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      {/* Camera body */}
      <rect x="12" y="20" width="40" height="28" rx="3" fill={color} opacity="0.9" />
      {/* Lens */}
      <circle cx="32" cy="34" r="10" fill="#1a1a2e" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="34" r="4" fill="#ef4444" />
      {/* Film reels */}
      <g style={{ transformOrigin: '18px 14px', animation: `${filmRoll} 2s linear infinite` }}>
        <circle cx="18" cy="14" r="8" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="18" cy="14" r="3" fill={color} />
      </g>
      <g style={{ transformOrigin: '46px 14px', animation: `${filmRoll} 2s linear infinite reverse` }}>
        <circle cx="46" cy="14" r="8" fill="none" stroke={color} strokeWidth="2" />
        <circle cx="46" cy="14" r="3" fill={color} />
      </g>
      {/* REC indicator */}
      <circle cx="48" cy="26" r="4" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  </Box>
);

// Animated 3D Model Icon
const ModelIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ perspective: '200px', width: 64, height: 64 }}>
    <Box
      sx={{
        width: '100%',
        height: '100%',
        animation: `${modelRotate} 3s ease-in-out infinite`,
        transformStyle: 'preserve-3d',
      }}
    >
      <svg viewBox="0 0 64 64" width="64" height="64">
        {/* 3D cube wireframe */}
        <g fill="none" stroke={color} strokeWidth="2">
          {/* Front face */}
          <path d="M20 24 L44 24 L44 48 L20 48 Z" opacity="0.9" />
          {/* Top face */}
          <path d="M20 24 L28 16 L52 16 L44 24" opacity="0.7" />
          {/* Right face */}
          <path d="M44 24 L52 16 L52 40 L44 48" opacity="0.5" />
          {/* Depth lines */}
          <line x1="20" y1="48" x2="28" y2="40" opacity="0.3" />
          <line x1="28" y1="40" x2="52" y2="40" opacity="0.3" />
          <line x1="28" y1="40" x2="28" y2="16" opacity="0.3" />
        </g>
        {/* Human silhouette inside */}
        <ellipse cx="32" cy="30" rx="4" ry="5" fill={color} opacity="0.6" />
        <path d="M26 38 Q32 44 38 38 L36 50 L28 50 Z" fill={color} opacity="0.6" />
      </svg>
    </Box>
  </Box>
);

// Animated HDRI/Environment Icon (sun/globe)
const HDRIIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ width: 64, height: 64, animation: `${sunRise} 2s ease-in-out infinite` }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      {/* Sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1="32"
          y1="32"
          x2={32 + Math.cos((angle * Math.PI) / 180) * 28}
          y2={32 + Math.sin((angle * Math.PI) / 180) * 28}
          stroke={color}
          strokeWidth="2"
          opacity="0.4"
          strokeLinecap="round"
        />
      ))}
      {/* Globe/sphere */}
      <circle cx="32" cy="32" r="16" fill={color} opacity="0.8" />
      {/* Globe lines */}
      <ellipse cx="32" cy="32" rx="16" ry="6" fill="none" stroke="#1a1a2e" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="32" cy="32" rx="6" ry="16" fill="none" stroke="#1a1a2e" strokeWidth="1.5" opacity="0.5" />
      <line x1="16" y1="32" x2="48" y2="32" stroke="#1a1a2e" strokeWidth="1.5" opacity="0.3" />
      {/* Highlight */}
      <circle cx="26" cy="26" r="4" fill="#fff" opacity="0.4" />
    </svg>
  </Box>
);

// Animated Clipboard/Assets Icon
const AssetsIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ width: 64, height: 64 }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      {/* Clipboard */}
      <rect x="14" y="10" width="36" height="48" rx="3" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      {/* Clip */}
      <rect x="24" y="6" width="16" height="10" rx="2" fill={color} />
      {/* Checklist items */}
      <g style={{ animation: `${clipboardWrite} 1.5s ease-in-out infinite` }}>
        <rect x="20" y="22" width="8" height="8" rx="1" fill={color} opacity="0.8" />
        <line x1="22" y1="26" x2="26" y2="28" stroke="#1a1a2e" strokeWidth="2" />
        <line x1="26" y1="28" x2="30" y2="22" stroke="#1a1a2e" strokeWidth="2" />
        <rect x="32" y="24" width="14" height="4" rx="1" fill={color} opacity="0.5" />
      </g>
      <g style={{ animation: `${clipboardWrite} 1.5s ease-in-out infinite 0.3s` }}>
        <rect x="20" y="34" width="8" height="8" rx="1" fill={color} opacity="0.8" />
        <rect x="32" y="36" width="10" height="4" rx="1" fill={color} opacity="0.5" />
      </g>
      <g style={{ animation: `${clipboardWrite} 1.5s ease-in-out infinite 0.6s` }}>
        <rect x="20" y="46" width="8" height="8" rx="1" fill={color} opacity="0.4" stroke={color} strokeWidth="1" />
        <rect x="32" y="48" width="12" height="4" rx="1" fill={color} opacity="0.3" />
      </g>
    </svg>
  </Box>
);

// Animated Gear/Processing Icon
const ProcessingIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ width: 64, height: 64, animation: `${gearSpin} 3s linear infinite` }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      <path
        d="M32 12 L35 12 L36 16 L40 17 L43 14 L46 17 L43 21 L44 25 L48 26 L48 30 L44 31 L43 35 L46 38 L43 41 L40 38 L36 39 L35 43 L29 43 L28 39 L24 38 L21 41 L18 38 L21 35 L20 31 L16 30 L16 26 L20 25 L21 21 L18 17 L21 14 L24 17 L28 16 L29 12 Z"
        fill={color}
        opacity="0.9"
      />
      <circle cx="32" cy="28" r="8" fill="#1a1a2e" />
      <circle cx="32" cy="28" r="4" fill={color} opacity="0.6" />
    </svg>
  </Box>
);

// Animated Save Icon
const SaveIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ width: 64, height: 64, animation: `${saveFlicker} 1s ease-in-out infinite` }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      {/* Floppy disk body */}
      <rect x="10" y="10" width="44" height="44" rx="3" fill={color} opacity="0.9" />
      {/* Label area */}
      <rect x="16" y="10" width="32" height="20" rx="2" fill="#1a1a2e" />
      {/* Metal slider */}
      <rect x="38" y="14" width="8" height="12" rx="1" fill="#64748b" />
      {/* Bottom window */}
      <rect x="20" y="36" width="24" height="16" rx="2" fill="#1a1a2e" />
      <rect x="24" y="40" width="16" height="8" rx="1" fill={color} opacity="0.4" />
    </svg>
  </Box>
);

// Animated Export Icon
const ExportIcon: React.FC<{ color: string }> = ({ color }) => (
  <Box sx={{ width: 64, height: 64 }}>
    <svg viewBox="0 0 64 64" width="64" height="64">
      {/* Box */}
      <rect x="12" y="24" width="40" height="32" rx="3" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
      {/* Arrow */}
      <g>
        <line x1="32" y1="44" x2="32" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round">
          <animate attributeName="y2" values="8;4;8" dur="1s" repeatCount="indefinite" />
        </line>
        <path d="M24 16 L32 6 L40 16" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="transform" values="translate(0,0);translate(0,-4);translate(0,0)" dur="1s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  </Box>
);

// Icon selector based on stage
const StageIcon: React.FC<{ stage: LoadingStage; color: string }> = ({ stage, color }) => {
  switch (stage) {
    case 'initializing':
    case 'loading-scene':
      return <FilmCameraIcon color={color} />;
    case 'loading-model':
      return <ModelIcon color={color} />;
    case 'loading-hdri':
      return <HDRIIcon color={color} />;
    case 'loading-assets':
      return <AssetsIcon color={color} />;
    case 'processing':
      return <ProcessingIcon color={color} />;
    case 'saving':
      return <SaveIcon color={color} />;
    case 'exporting':
      return <ExportIcon color={color} />;
    default:
      return <CameraIcon color={color} />;
  }
};

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

export const LoadingOverlay: React.FC = () => {
  const { isLoading, currentStage, message, progress, subMessage, tasks, sceneInitialized } = useLoadingStore();
  const [isVisible, setIsVisible] = React.useState(true);
  const [isFadingOut, setIsFadingOut] = React.useState(false);
  const [hasEverInitialized, setHasEverInitialized] = React.useState(false);

  // Track if we've ever completed initialization
  React.useEffect(() => {
    if (sceneInitialized) {
      setHasEverInitialized(true);
    }
  }, [sceneInitialized]);

  // Handle fade out animation
  React.useEffect(() => {
    // Hide overlay when: scene is initialized AND not actively loading
    // OR if we've ever initialized and not actively loading
    const shouldHide = (sceneInitialized || hasEverInitialized) && !isLoading;

    if (shouldHide) {
      // Start fade out
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 400); // Match fade out duration
      return () => clearTimeout(timer);
    } else if (isLoading) {
      // Show loading when actively loading
      setIsVisible(true);
      setIsFadingOut(false);
    }
  }, [isLoading, sceneInitialized, hasEverInitialized]);

  // Don't render if not visible
  if (!isVisible) return null;

  // Show initial scene loading only during first load
  const showInitializing = !sceneInitialized && !hasEverInitialized && !isLoading;
  const displayMessage = showInitializing ? 'Initialiserer Virtual Studio...' : (message || 'Laster...');
  const displayStage = showInitializing ? 'initializing' : (currentStage || 'initializing');
  const color = STAGE_COLORS[displayStage] || STAGE_COLORS['initializing'];
  const displayProgress = progress >= 0 ? progress : (showInitializing ? -1 : progress);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(10, 10, 20, 0.98) 0%, rgba(20, 20, 40, 0.98) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: isFadingOut
          ? `${fadeOut} 0.4s ease-out forwards`
          : `${fadeIn} 0.4s ease-out`,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Animated Icon */}
      <Box
        sx={{
          mb: 3,
          animation: `${float} 3s ease-in-out infinite`,
          filter: `drop-shadow(0 8px 24px ${color}40)`,
        }}
      >
        <StageIcon stage={displayStage} color={color} />
      </Box>

      {/* Logo */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box
          component="img"
          src="/creatorhub-virtual-studio-logo.svg"
          alt="Virtual Studio"
          sx={{
            height: 48,
            width: 'auto',
            opacity: 0.8,
            filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.3))',
          }}
        />
      </Box>

      {/* Message */}
      <Typography variant="h6" sx={{ color: '#fff', mb: 1, fontWeight: 500 }}>
        {displayMessage}
      </Typography>

      {subMessage && (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 3 }}>
          {subMessage}
        </Typography>
      )}

      {/* Progress indicator */}
      <Box sx={{ width: 300, mt: 2 }}>
        {displayProgress >= 0 ? (
          <>
            <LinearProgress
              variant="determinate"
              value={displayProgress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 3,
                  transition: 'transform 0.3s ease-out',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.87)', mt: 1, display: 'block', textAlign: 'center' }}>
              {Math.round(displayProgress)}%
            </Typography>
          </>
        ) : (
          <LinearProgress
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { backgroundColor: color },
            }}
          />
        )}
      </Box>

      {/* Multiple tasks */}
      {tasks.length > 0 && (
        <Box sx={{ mt: 4, width: 300 }}>
          {tasks.map(task => (
            <Box key={task.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                  {task.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                  {task.progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={task.progress}
                sx={{
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': { backgroundColor: STAGE_COLORS[task.stage] },
                }}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LoadingOverlay;

