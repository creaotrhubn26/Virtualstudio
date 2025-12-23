/**
 * ViewfinderOverlay - Professional Camera Viewfinder HUD
 *
 * Features:
 * - Focus points grid (single, zone, full grid modes)
 * - Safe area guides (action safe, title safe)
 * - Recording indicator with timecode
 * - Aspect ratio frame lines
 * - Level indicator
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Tooltip, Chip, ToggleButtonGroup, ToggleButton, Typography, Stack } from '@mui/material';
import {
  CenterFocusStrong as FocusIcon,
  GridOn as GridIcon,
  Crop169 as SafeAreaIcon,
  FiberManualRecord as RecordIcon,
  Videocam as VideoIcon,
  PhotoCamera as PhotoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

export type FocusMode = 'single' | 'zone' | 'wide' | 'tracking';
export type SafeAreaMode = 'none' | 'action' | 'title' | 'both';
export type AspectRatio = '16:9' | '2.39:1' | '1.85:1' | '4:3' | '1:1' | '9:16';

interface ViewfinderOverlayProps {
  isRecording?: boolean;
  showFocusPoints?: boolean;
  focusMode?: FocusMode;
  activeFocusPoint?: number;
  safeAreaMode?: SafeAreaMode;
  aspectRatio?: AspectRatio;
  showTimecode?: boolean;
  timecodeValue?: string;
  fps?: number;
  isVideoMode?: boolean;
  onFocusModeChange?: (mode: FocusMode) => void;
  onSafeAreaChange?: (mode: SafeAreaMode) => void;
  onFocusPointSelect?: (point: number) => void;
}

const FocusPointGrid: React.FC<{
  mode: FocusMode;
  activePoint: number;
  onPointSelect: (point: number) => void;
}> = ({ mode, activePoint, onPointSelect }) => {
  const getGridLayout = () => {
    switch (mode) {
      case 'single':
        return { cols: 1, rows: 1, points: [0] };
      case 'zone':
        return { cols: 3, rows: 3, points: Array.from({ length: 9 }, (_, i) => i) };
      case 'wide':
        return { cols: 9, rows: 5, points: Array.from({ length: 45 }, (_, i) => i) };
      case 'tracking':
        return { cols: 5, rows: 3, points: Array.from({ length: 15 }, (_, i) => i) };
      default:
        return { cols: 3, rows: 3, points: Array.from({ length: 9 }, (_, i) => i) };
    }
  };

  const { cols, rows, points } = getGridLayout();
  const pointSize = mode === 'wide' ? 8 : mode === 'single' ? 40 : 16;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: mode === 'wide' ? '8px' : mode === 'single' ? '0' : '20px',
        width: mode === 'single' ? 'auto' : mode === 'wide' ? '85%' : '60%',
        height: mode === 'single' ? 'auto' : mode === 'wide' ? '70%' : '50%',
        pointerEvents: 'none',
      }}
    >
      {points.map((point) => (
        <Box
          key={point}
          onClick={() => onPointSelect(point)}
          sx={{
            width: pointSize,
            height: pointSize,
            border: `2px solid ${activePoint === point ? '#ff3333' : 'rgba(255, 255, 255, 0.6)'}`,
            borderRadius: mode === 'single' ? '4px' : '2px',
            backgroundColor: activePoint === point ? 'rgba(255, 51, 51, 0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            pointerEvents: 'auto',
            '&:hover': {
              borderColor: '#ff6666',
              backgroundColor: 'rgba(255, 102, 102, 0.15)',
            },
            ...(mode === 'single' && {
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '60%',
                height: '2px',
                backgroundColor: activePoint === point ? '#ff3333' : 'rgba(255, 255, 255, 0.6)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                width: '2px',
                height: '60%',
                backgroundColor: activePoint === point ? '#ff3333' : 'rgba(255, 255, 255, 0.6)',
              },
            }),
          }}
        >
          {mode === 'single' && (
            <>
              <Box sx={{
                position: 'absolute',
                width: '24px',
                height: '2px',
                backgroundColor: activePoint === point ? '#ff3333' : 'rgba(255, 255, 255, 0.6)',
              }} />
              <Box sx={{
                position: 'absolute',
                width: '2px',
                height: '24px',
                backgroundColor: activePoint === point ? '#ff3333' : 'rgba(255, 255, 255, 0.6)',
              }} />
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};

const SafeAreaGuides: React.FC<{ mode: SafeAreaMode }> = ({ mode }) => {
  if (mode === 'none') return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {(mode === 'action' || mode === 'both') && (
        <Box
          sx={{
            position: 'absolute',
            top: '5%',
            left: '5%',
            right: '5%',
            bottom: '5%',
            border: '1px dashed rgba(255, 255, 0, 0.5)',
            borderRadius: '2px',
          }}
        />
      )}
      {(mode === 'title' || mode === 'both') && (
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            right: '10%',
            bottom: '10%',
            border: '1px dashed rgba(0, 255, 255, 0.5)',
            borderRadius: '2px',
          }}
        />
      )}
      {mode === 'both' && (
        <>
          <Typography
            sx={{
              position: 'absolute',
              top: '5%',
              left: '5%',
              fontSize: '9px',
              color: 'rgba(255, 255, 0, 0.7)',
              transform: 'translateY(-100%)',
            }}
          >
            ACTION SAFE
          </Typography>
          <Typography
            sx={{
              position: 'absolute',
              top: '10%',
              left: '10%',
              fontSize: '9px',
              color: 'rgba(0, 255, 255, 0.7)',
              transform: 'translateY(-100%)',
            }}
          >
            TITLE SAFE
          </Typography>
        </>
      )}
    </Box>
  );
};

const RecordingIndicator: React.FC<{
  isRecording: boolean;
  timecode: string;
  fps: number;
}> = ({ isRecording, timecode, fps }) => {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '4px',
        border: isRecording ? '1px solid rgba(255, 0, 0, 0.5)' : '1px solid transparent',
      }}
    >
      <RecordIcon
        sx={{
          fontSize: 14,
          color: isRecording ? (blink ? '#ff0000' : '#660000') : 'rgba(255, 255, 255, 0.4)',
          transition: 'color 0.2s ease',
        }}
      />
      <Typography
        sx={{
          fontFamily: 'monospace',
          fontSize: '12px',
          fontWeight: 600,
          color: isRecording ? '#ff4444' : 'rgba(255, 255, 255, 0.7)',
          letterSpacing: '1px',
        }}
      >
        {timecode}
      </Typography>
      <Typography
        sx={{
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
          marginLeft: 0.5,
        }}
      >
        {fps}fps
      </Typography>
    </Box>
  );
};

const CenterCrosshair: React.FC = () => (
  <Box
    sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}
  >
    <Box sx={{ width: 30, height: 2, backgroundColor: 'rgba(255, 255, 255, 0.6)', position: 'absolute', left: -15, top: 0 }} />
    <Box sx={{ width: 2, height: 30, backgroundColor: 'rgba(255, 255, 255, 0.6)', position: 'absolute', top: -15, left: 0 }} />
  </Box>
);

const RuleOfThirdsGrid: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      <Box sx={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
      <Box sx={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
      <Box sx={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
      <Box sx={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
    </Box>
  );
};

export const ViewfinderOverlay: React.FC<ViewfinderOverlayProps> = ({
  isRecording = false,
  showFocusPoints = true,
  focusMode = 'zone',
  activeFocusPoint = 4,
  safeAreaMode = 'none',
  aspectRatio = '16:9',
  showTimecode = true,
  timecodeValue = '00:00:00:00',
  fps = 24,
  isVideoMode = true,
  onFocusModeChange,
  onSafeAreaChange,
  onFocusPointSelect,
}) => {
  const [showGrid, setShowGrid] = useState(false);
  const [localFocusMode, setLocalFocusMode] = useState<FocusMode>(focusMode);
  const [localSafeArea, setLocalSafeArea] = useState<SafeAreaMode>(safeAreaMode);
  const [localActivePoint, setLocalActivePoint] = useState(activeFocusPoint);

  const handleFocusModeChange = (mode: FocusMode) => {
    setLocalFocusMode(mode);
    onFocusModeChange?.(mode);
  };

  const handleSafeAreaChange = (mode: SafeAreaMode) => {
    setLocalSafeArea(mode);
    onSafeAreaChange?.(mode);
  };

  const handleFocusPointSelect = (point: number) => {
    setLocalActivePoint(point);
    onFocusPointSelect?.(point);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <CenterCrosshair />
      <RuleOfThirdsGrid visible={showGrid} />
      <SafeAreaGuides mode={localSafeArea} />
      
      {showFocusPoints && (
        <FocusPointGrid
          mode={localFocusMode}
          activePoint={localActivePoint}
          onPointSelect={handleFocusPointSelect}
        />
      )}
      
      {isVideoMode && showTimecode && (
        <RecordingIndicator
          isRecording={isRecording}
          timecode={timecodeValue}
          fps={fps}
        />
      )}

      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 0.5,
          pointerEvents: 'auto',
        }}
      >
        <Tooltip title="Fokusmodus">
          <ToggleButtonGroup
            size="small"
            value={localFocusMode}
            exclusive
            onChange={(_, v) => v && handleFocusModeChange(v)}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              '& .MuiToggleButton-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                padding: '4px 8px',
                fontSize: '10px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 168, 255, 0.3)',
                  color: '#00a8ff',
                },
              },
            }}
          >
            <ToggleButton value="single">1P</ToggleButton>
            <ToggleButton value="zone">ZONE</ToggleButton>
            <ToggleButton value="wide">WIDE</ToggleButton>
            <ToggleButton value="tracking">TRK</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          display: 'flex',
          gap: 0.5,
          pointerEvents: 'auto',
        }}
      >
        <Tooltip title="Safe Areas">
          <ToggleButtonGroup
            size="small"
            value={localSafeArea}
            exclusive
            onChange={(_, v) => v && handleSafeAreaChange(v)}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              '& .MuiToggleButton-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                padding: '4px 8px',
                fontSize: '10px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 168, 255, 0.3)',
                  color: '#00a8ff',
                },
              },
            }}
          >
            <ToggleButton value="none">OFF</ToggleButton>
            <ToggleButton value="action">ACT</ToggleButton>
            <ToggleButton value="title">TTL</ToggleButton>
            <ToggleButton value="both">ALL</ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>

        <Tooltip title="Rutenett">
          <IconButton
            size="small"
            onClick={() => setShowGrid(!showGrid)}
            sx={{
              backgroundColor: showGrid ? 'rgba(0, 168, 255, 0.3)' : 'rgba(0, 0, 0, 0.6)',
              color: showGrid ? '#00a8ff' : 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: showGrid ? 'rgba(0, 168, 255, 0.4)' : 'rgba(0, 0, 0, 0.8)',
              },
            }}
          >
            <GridIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '4px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
        }}
      >
        {isVideoMode ? (
          <VideoIcon sx={{ fontSize: 14, color: '#ff4444' }} />
        ) : (
          <PhotoIcon sx={{ fontSize: 14, color: '#00a8ff' }} />
        )}
        <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
          {isVideoMode ? 'VIDEO' : 'FOTO'}
        </Typography>
        <Typography sx={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
          {aspectRatio}
        </Typography>
      </Box>
    </div>
  );
};

export default ViewfinderOverlay;
