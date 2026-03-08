/**
 * Advanced Rendering Panel
 * UI for post-processing effects, image quality, and cinematic settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Collapse,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
//
import {
  Tune as TuneIcon,
  Brightness6 as ExposureIcon,
  Contrast as ContrastIcon,
  ColorLens as ColorIcon,
  BlurOn as BlurIcon,
  Flare as BloomIcon,
  Gradient as VignetteIcon,
  Grain as GrainIcon,
  CenterFocusWeak as DOFIcon,
  Waves as FogIcon,
  WbSunny as LightIcon,
  Refresh as ResetIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Speed as PerformanceIcon,
  Movie as CinematicIcon,
  Star as QualityIcon,
  Balance as BalancedIcon,
  Portrait as PortraitIcon
} from '@mui/icons-material';
import { useRenderingStore, RENDERING_PRESETS, RenderingPreset } from '../services/renderingService';
import * as BABYLON from '@babylonjs/core';

interface RenderingPanelProps {
  scene?: BABYLON.Scene | null;
  camera?: BABYLON.Camera | null;
}

export const RenderingPanel: React.FC<RenderingPanelProps> = ({ scene, camera }) => {
  const {
    settings,
    activePreset,
    isInitialized,
    initialize,
    dispose,
    applyPreset,
    setSSAO,
    setSSR,
    setBloom,
    setDOF,
    setChromaticAberration,
    setVignette,
    setGrain,
    setSharpen,
    setTonemapping,
    setExposure,
    setContrast,
    setFog,
    setVolumetricLighting
  } = useRenderingStore();
  
  const [expanded, setExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    quality: true,
    effects: true,
    color: true,
    atmosphere: false
  });
  
  // Initialize rendering pipeline when scene/camera available
  useEffect(() => {
    if (scene && camera && !isInitialized) {
      initialize(scene, camera);
    }
    
    return () => {
      if (isInitialized) {
        dispose();
      }
    };
  }, [scene, camera]);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleApplyPreset = (presetKey: string) => {
    const studio = (window as {
      virtualStudio?: {
        applyRenderingPreset?: (name: string) => void;
      };
    }).virtualStudio;

    if (studio?.applyRenderingPreset) {
      studio.applyRenderingPreset(presetKey);
      return;
    }

    applyPreset(presetKey);
  };
  
  const presetIcons: Record<string, React.ReactNode> = {
    'performance': <PerformanceIcon />,
    'balanced': <BalancedIcon />,
    'quality': <QualityIcon />,
    'cinematic': <CinematicIcon />,
    'portrait-realistic': <PortraitIcon />
  };
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 100,
        right: 16,
        width: 340,
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
          bgcolor: 'info.dark',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon />
          <Typography variant="subtitle1" fontWeight="bold">
            Rendering
          </Typography>
          {activePreset && (
            <Chip
              size="small"
              label={RENDERING_PRESETS[activePreset]?.name || activePreset}
              color="info"
              sx={{ height: 20 }}
            />
          )}
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ maxHeight: 'calc(50vh - 60px)', overflow: 'auto' }}>
          {/* Presets */}
          <Box sx={{ p: 1.5, bgcolor: 'grey.900' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Quality Presets
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {Object.entries(RENDERING_PRESETS).map(([key, preset]) => (
                <Chip
                  key={key}
                  icon={presetIcons[key] as any}
                  label={preset.name}
                  onClick={() => handleApplyPreset(key)}
                  color={activePreset === key ? 'primary' : 'default'}
                  variant={activePreset === key ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </Box>
          
          <Box sx={{ p: 1.5 }}>
            {/* Quality Settings */}
            <Accordion
              expanded={expandedSections.quality}
              onChange={() => toggleSection('quality')}
              sx={{ bgcolor: 'transparent', boxShadow: 'none' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight="medium">
                  Quality Settings
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* SSAO */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.ssaoEnabled}
                      onChange={(e) => setSSAO(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Ambient Occlusion (SSAO)</Typography>}
                />
                {settings.ssaoEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Samples: {settings.ssaoSamples}
                    </Typography>
                    <Slider
                      value={settings.ssaoSamples}
                      onChange={(_, v) => setSSAO(true, v as number)}
                      min={8}
                      max={64}
                      step={8}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* SSR */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.ssrEnabled}
                      onChange={(e) => setSSR(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Screen Space Reflections</Typography>}
                />
                {settings.ssrEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Strength: {(settings.ssrStrength * 100).toFixed(0)}%
                    </Typography>
                    <Slider
                      value={settings.ssrStrength}
                      onChange={(_, v) => setSSR(true, v as number)}
                      min={0}
                      max={1}
                      step={0.1}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* Sharpen */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sharpenEnabled}
                      onChange={(e) => setSharpen(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Sharpening</Typography>}
                />
                {settings.sharpenEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Amount: {(settings.sharpenAmount * 100).toFixed(0)}%
                    </Typography>
                    <Slider
                      value={settings.sharpenAmount}
                      onChange={(_, v) => setSharpen(true, v as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      size="small"
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
            
            {/* Visual Effects */}
            <Accordion
              expanded={expandedSections.effects}
              onChange={() => toggleSection('effects')}
              sx={{ bgcolor: 'transparent', boxShadow: 'none' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight="medium">
                  Visual Effects
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Bloom */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BloomIcon fontSize="small" color="primary" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.bloomEnabled}
                        onChange={(e) => setBloom(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Bloom</Typography>}
                    sx={{ flex: 1 }}
                  />
                </Box>
                {settings.bloomEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Intensity: {(settings.bloomIntensity * 100).toFixed(0)}%
                    </Typography>
                    <Slider
                      value={settings.bloomIntensity}
                      onChange={(_, v) => setBloom(true, v as number)}
                      min={0}
                      max={2}
                      step={0.1}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* DOF */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DOFIcon fontSize="small" color="primary" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.dofEnabled}
                        onChange={(e) => setDOF(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Depth of Field</Typography>}
                    sx={{ flex: 1 }}
                  />
                </Box>
                {settings.dofEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Focal Length: {settings.dofFocalLength}mm
                        </Typography>
                        <Slider
                          value={settings.dofFocalLength}
                          onChange={(_, v) => setDOF(true, v as number)}
                          min={12}
                          max={200}
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Aperture: f/{settings.dofAperture}
                        </Typography>
                        <Slider
                          value={settings.dofAperture}
                          onChange={(_, v) => setDOF(true, undefined, v as number)}
                          min={1.2}
                          max={22}
                          step={0.1}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                )}
                
                {/* Chromatic Aberration */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.chromaticAberrationEnabled}
                      onChange={(e) => setChromaticAberration(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Chromatic Aberration</Typography>}
                />
                {settings.chromaticAberrationEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Slider
                      value={settings.chromaticAberrationAmount}
                      onChange={(_, v) => setChromaticAberration(true, v as number)}
                      min={0}
                      max={0.5}
                      step={0.01}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* Vignette */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <VignetteIcon fontSize="small" color="primary" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.vignetteEnabled}
                        onChange={(e) => setVignette(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Vignette</Typography>}
                    sx={{ flex: 1 }}
                  />
                </Box>
                {settings.vignetteEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Slider
                      value={settings.vignetteStrength}
                      onChange={(_, v) => setVignette(true, v as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* Film Grain */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GrainIcon fontSize="small" color="primary" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.grainEnabled}
                        onChange={(e) => setGrain(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Film Grain</Typography>}
                    sx={{ flex: 1 }}
                  />
                </Box>
                {settings.grainEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Slider
                      value={settings.grainIntensity}
                      onChange={(_, v) => setGrain(true, v as number)}
                      min={0}
                      max={0.2}
                      step={0.01}
                      size="small"
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
            
            {/* Color Grading */}
            <Accordion
              expanded={expandedSections.color}
              onChange={() => toggleSection('color')}
              sx={{ bgcolor: 'transparent', boxShadow: 'none' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight="medium">
                  Color Grading
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Tonemapping */}
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Tone Mapping</InputLabel>
                  <Select
                    value={settings.tonemapping}
                    onChange={(e) => setTonemapping(e.target.value as any)}
                    label="Tone Mapping"
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="aces">ACES Filmic</MenuItem>
                    <MenuItem value="reinhard">Reinhard</MenuItem>
                    <MenuItem value="filmic">Filmic</MenuItem>
                  </Select>
                </FormControl>
                
                {/* Exposure */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ExposureIcon fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Exposure: {settings.exposure.toFixed(1)}
                    </Typography>
                  </Box>
                  <Slider
                    value={settings.exposure}
                    onChange={(_, v) => setExposure(v as number)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    size="small"
                  />
                </Box>
                
                {/* Contrast */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ContrastIcon fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Contrast: {settings.contrast.toFixed(1)}
                    </Typography>
                  </Box>
                  <Slider
                    value={settings.contrast}
                    onChange={(_, v) => setContrast(v as number)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    size="small"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
            
            {/* Atmosphere */}
            <Accordion
              expanded={expandedSections.atmosphere}
              onChange={() => toggleSection('atmosphere')}
              sx={{ bgcolor: 'transparent', boxShadow: 'none' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight="medium">
                  Atmosphere
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Volumetric Lighting */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LightIcon fontSize="small" color="primary" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.volumetricLightingEnabled}
                        onChange={(e) => setVolumetricLighting(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Volumetric Lighting</Typography>}
                    sx={{ flex: 1 }}
                  />
                </Box>
                {settings.volumetricLightingEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Density
                    </Typography>
                    <Slider
                      value={settings.volumetricLightingDensity}
                      onChange={(_, v) => setVolumetricLighting(true, v as number)}
                      min={0}
                      max={0.2}
                      step={0.01}
                      size="small"
                    />
                  </Box>
                )}
                
                {/* Fog */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FogIcon fontSize="small" color="primary" />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.fogEnabled}
                        onChange={(e) => setFog(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Fog</Typography>}
                    sx={{ flex: 1 }}
                  />
                </Box>
                {settings.fogEnabled && (
                  <Box sx={{ px: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Density
                    </Typography>
                    <Slider
                      value={settings.fogDensity}
                      onChange={(_, v) => setFog(true, v as number)}
                      min={0}
                      max={0.1}
                      step={0.005}
                      size="small"
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default RenderingPanel;
