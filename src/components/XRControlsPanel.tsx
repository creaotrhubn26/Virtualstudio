/**
 * XR Controls Panel
 * VR/AR settings and session management UI
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Slider,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Vrpano as VRIcon,
  ViewInAr as ARIcon,
  ExitToApp as ExitIcon,
  Settings as SettingsIcon,
  SportsEsports as ControllerIcon,
  Straighten as ScaleIcon,
  RotateRight as RotateIcon,
  Speed as SpeedIcon,
  Place as TeleportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useXRStore } from '../services/xrService';
import * as BABYLON from '@babylonjs/core';

interface XRControlsPanelProps {
  scene?: BABYLON.Scene | null;
}

export const XRControlsPanel: React.FC<XRControlsPanelProps> = ({ scene }) => {
  const {
    isVRSupported,
    isARSupported,
    isInXR,
    sessionType,
    leftController,
    rightController,
    teleportEnabled,
    snapTurnEnabled,
    snapTurnAngle,
    movementSpeed,
    roomScale,
    checkXRSupport,
    enterVR,
    enterAR,
    exitXR,
    setTeleportEnabled,
    setSnapTurnEnabled,
    setSnapTurnAngle,
    setMovementSpeed,
    setRoomScale
  } = useXRStore();
  
  const [expanded, setExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check XR support on mount
  useEffect(() => {
    checkXRSupport();
  }, [checkXRSupport]);
  
  const handleEnterVR = async () => {
    if (!scene) {
      setError('Scene not ready');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await enterVR(scene);
    } catch (e) {
      setError('Failed to enter VR. Make sure your headset is connected.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEnterAR = async () => {
    if (!scene) {
      setError('Scene not ready');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await enterAR(scene);
    } catch (e) {
      setError('Failed to enter AR. Check device compatibility.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExitXR = async () => {
    setLoading(true);
    try {
      await exitXR();
    } finally {
      setLoading(false);
    }
  };
  
  const xrNotSupported = !isVRSupported && !isARSupported;
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 100,
        right: 16,
        width: 300,
        maxHeight: 'calc(100vh - 200px)',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 10001
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: isInXR ? 'primary.dark' : 'grey.800',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {sessionType === 'immersive-ar' ? <ARIcon /> : <VRIcon />}
          <Typography variant="subtitle1" fontWeight="bold">
            XR Controls
          </Typography>
          {isInXR && (
            <Chip
              size="small"
              label={sessionType === 'immersive-ar' ? 'AR Active' : 'VR Active'}
              color="primary"
              sx={{ height: 20 }}
            />
          )}
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {/* Not Supported Warning */}
          {xrNotSupported && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              WebXR is not supported in this browser. Try Chrome or Edge on a VR-capable device.
            </Alert>
          )}
          
          {/* Session Controls */}
          {!isInXR ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <VRIcon />}
                onClick={handleEnterVR}
                disabled={!isVRSupported || loading || !scene}
                fullWidth
              >
                Enter VR
              </Button>
              <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={20} /> : <ARIcon />}
                onClick={handleEnterAR}
                disabled={!isARSupported || loading || !scene}
                fullWidth
              >
                Enter AR
              </Button>
              
              {/* Support Status */}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip
                  size="small"
                  icon={<VRIcon />}
                  label={isVRSupported ? 'VR Ready' : 'No VR'}
                  color={isVRSupported ? 'success' : 'default'}
                />
                <Chip
                  size="small"
                  icon={<ARIcon />}
                  label={isARSupported ? 'AR Ready' : 'No AR'}
                  color={isARSupported ? 'success' : 'default'}
                />
              </Box>
            </Box>
          ) : (
            <Box>
              <Button
                variant="contained"
                color="error"
                startIcon={<ExitIcon />}
                onClick={handleExitXR}
                disabled={loading}
                fullWidth
              >
                Exit {sessionType === 'immersive-ar' ? 'AR' : 'VR'}
              </Button>
              
              {/* Controller Status */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Controllers
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip
                    size="small"
                    icon={<ControllerIcon />}
                    label="Left"
                    color={leftController?.isConnected ? 'success' : 'default'}
                  />
                  <Chip
                    size="small"
                    icon={<ControllerIcon />}
                    label="Right"
                    color={rightController?.isConnected ? 'success' : 'default'}
                  />
                </Box>
              </Box>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Settings Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Typography variant="body2" fontWeight="medium">
              <SettingsIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              XR Settings
            </Typography>
            {showSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          
          <Collapse in={showSettings}>
            <Box sx={{ mt: 2 }}>
              {/* Teleport */}
              <FormControlLabel
                control={
                  <Switch
                    checked={teleportEnabled}
                    onChange={(e) => setTeleportEnabled(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TeleportIcon fontSize="small" />
                    <Typography variant="body2">Teleport Movement</Typography>
                  </Box>
                }
              />
              
              {/* Snap Turn */}
              <FormControlLabel
                control={
                  <Switch
                    checked={snapTurnEnabled}
                    onChange={(e) => setSnapTurnEnabled(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RotateIcon fontSize="small" />
                    <Typography variant="body2">Snap Turn</Typography>
                  </Box>
                }
              />
              
              {/* Snap Turn Angle */}
              {snapTurnEnabled && (
                <Box sx={{ mt: 1, px: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Turn Angle: {snapTurnAngle}°
                  </Typography>
                  <Slider
                    value={snapTurnAngle}
                    onChange={(_, v) => setSnapTurnAngle(v as number)}
                    min={15}
                    max={90}
                    step={15}
                    marks
                    size="small"
                  />
                </Box>
              )}
              
              {/* Movement Speed */}
              <Box sx={{ mt: 1, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <SpeedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Movement Speed: {movementSpeed.toFixed(1)}x
                </Typography>
                <Slider
                  value={movementSpeed}
                  onChange={(_, v) => setMovementSpeed(v as number)}
                  min={0.5}
                  max={3}
                  step={0.25}
                  size="small"
                />
              </Box>
              
              {/* Room Scale */}
              <Box sx={{ mt: 1, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <ScaleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Room Scale: {roomScale.toFixed(1)}x
                </Typography>
                <Slider
                  value={roomScale}
                  onChange={(_, v) => setRoomScale(v as number)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  size="small"
                />
              </Box>
            </Box>
          </Collapse>
          
          {/* Controller Input Display (when in XR) */}
          {isInXR && (leftController || rightController) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Controller Input
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                {leftController && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">Left</Typography>
                    <Box sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Trigger: {(leftController.buttons.trigger * 100).toFixed(0)}%
                      <br />
                      Grip: {(leftController.buttons.grip * 100).toFixed(0)}%
                    </Box>
                  </Box>
                )}
                {rightController && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">Right</Typography>
                    <Box sx={{ fontSize: 10, color: 'text.secondary' }}>
                      Trigger: {(rightController.buttons.trigger * 100).toFixed(0)}%
                      <br />
                      Grip: {(rightController.buttons.grip * 100).toFixed(0)}%
                    </Box>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default XRControlsPanel;
