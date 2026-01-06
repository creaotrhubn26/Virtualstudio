/**
 * Advanced Guides Panel
 * 
 * Unified control panel for all visual guides:
 * - Composition Overlays
 * - Lighting Visualization
 * - Depth of Field Preview
 * - Video Production Guides
 * - Height References
 * - Safety & Spacing
 * - Color & Exposure
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  GridOn,
  Lightbulb,
  CameraAlt,
  Videocam,
  Straighten,
  Warning,
  Palette,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { CompositionGuideType } from '../components/CompositionOverlays';
import { AspectRatioType } from '../components/VideoProductionGuides';
import { useAppStore } from '../../state/store';

export interface AdvancedGuideSettings {
  // Composition
  composition: {
    enabled: boolean;
    guides: CompositionGuideType[];
    color: string;
    opacity: number;
  };
  // Lighting
  lighting: {
    enabled: boolean;
    showShadowDirection: boolean;
    showLightFalloff: boolean;
    showCatchlightPreview: boolean;
    showLightingRatio: boolean;
    showReflectorBounce: boolean;
  };
  // Depth of Field
  depthOfField: {
    enabled: boolean;
    showFocusPlane: boolean;
    showInFocusZone: boolean;
    showHyperfocalDistance: boolean;
    showNearFarLimits: boolean;
  };
  // Video Production
  videoProduction: {
    enabled: boolean;
    showTitleSafe: boolean;
    showActionSafe: boolean;
    showAspectRatioMask: boolean;
    showCenterMarkers: boolean;
    aspectRatio: AspectRatioType;
  };
  // Height References
  heightReferences: {
    enabled: boolean;
    showSubjectHeights: boolean;
    showCameraHeights: boolean;
    showLightHeights: boolean;
    showBackgroundHeight: boolean;
  };
  // Safety & Spacing
  safetySpacing: {
    enabled: boolean;
    showEquipmentClearance: boolean;
    showCableRoutes: boolean;
    showMovementZones: boolean;
    showHotLightWarning: boolean;
  };
  // Color & Exposure
  colorExposure: {
    enabled: boolean;
    showColorTemperatureScale: boolean;
    showGrayCardPosition: boolean;
    showExposureZones: boolean;
    showColorCheckerPosition: boolean;
  };
}

const DEFAULT_SETTINGS: AdvancedGuideSettings = {
  composition: {
    enabled: false,
    guides: ['rule_of_thirds'],
    color: '#00ff88',
    opacity: 0.5,
  },
  lighting: {
    enabled: false,
    showShadowDirection: true,
    showLightFalloff: true,
    showCatchlightPreview: true,
    showLightingRatio: true,
    showReflectorBounce: false,
  },
  depthOfField: {
    enabled: false,
    showFocusPlane: true,
    showInFocusZone: true,
    showHyperfocalDistance: false,
    showNearFarLimits: true,
  },
  videoProduction: {
    enabled: false,
    showTitleSafe: true,
    showActionSafe: true,
    showAspectRatioMask: false,
    showCenterMarkers: true,
    aspectRatio: '16:9',
  },
  heightReferences: {
    enabled: false,
    showSubjectHeights: true,
    showCameraHeights: true,
    showLightHeights: true,
    showBackgroundHeight: true,
  },
  safetySpacing: {
    enabled: false,
    showEquipmentClearance: true,
    showCableRoutes: true,
    showMovementZones: true,
    showHotLightWarning: false,
  },
  colorExposure: {
    enabled: false,
    showColorTemperatureScale: true,
    showGrayCardPosition: true,
    showExposureZones: true,
    showColorCheckerPosition: false,
  },
};

interface AdvancedGuidesPanelProps {
  settings?: AdvancedGuideSettings;
  onSettingsChange?: (settings: AdvancedGuideSettings) => void;
}

export const AdvancedGuidesPanel: React.FC<AdvancedGuidesPanelProps> = ({
  settings: propSettings,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<AdvancedGuideSettings>(propSettings || DEFAULT_SETTINGS);
  const [allEnabled, setAllEnabled] = useState(false);

  const updateSettings = useCallback((
    category: keyof AdvancedGuideSettings,
    updates: Partial<AdvancedGuideSettings[typeof category]>
  ) => {
    const newSettings = {
      ...settings,
      [category]: { ...settings[category], ...updates },
    };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);

    // Dispatch event for 3D components to listen to
    window.dispatchEvent(new CustomEvent('vs-advanced-guides-changed', {
      detail: newSettings,
    }));
  }, [settings, onSettingsChange]);

  const toggleAllGuides = useCallback(() => {
    const newEnabled = !allEnabled;
    setAllEnabled(newEnabled);
    
    const newSettings: AdvancedGuideSettings = {
      composition: { ...settings.composition, enabled: newEnabled },
      lighting: { ...settings.lighting, enabled: newEnabled },
      depthOfField: { ...settings.depthOfField, enabled: newEnabled },
      videoProduction: { ...settings.videoProduction, enabled: newEnabled },
      heightReferences: { ...settings.heightReferences, enabled: newEnabled },
      safetySpacing: { ...settings.safetySpacing, enabled: newEnabled },
      colorExposure: { ...settings.colorExposure, enabled: newEnabled },
    };
    
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
    window.dispatchEvent(new CustomEvent('vs-advanced-guides-changed', { detail: newSettings }));
  }, [allEnabled, settings, onSettingsChange]);

  const countEnabledGuides = () => {
    let count = 0;
    if (settings.composition.enabled) count += settings.composition.guides.length;
    if (settings.lighting.enabled) count += Object.values(settings.lighting).filter(v => v === true).length - 1;
    if (settings.depthOfField.enabled) count += Object.values(settings.depthOfField).filter(v => v === true).length - 1;
    if (settings.videoProduction.enabled) count += Object.values(settings.videoProduction).filter(v => v === true).length - 1;
    if (settings.heightReferences.enabled) count += Object.values(settings.heightReferences).filter(v => v === true).length - 1;
    if (settings.safetySpacing.enabled) count += Object.values(settings.safetySpacing).filter(v => v === true).length - 1;
    if (settings.colorExposure.enabled) count += Object.values(settings.colorExposure).filter(v => v === true).length - 1;
    return count;
  };

  return (
    <Box sx={{ 
      height: '100%', 
      overflow: 'auto', 
      p: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 } 
    }}>
      {/* Header */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        sx={{ mb: { xs: 1.5, sm: 2, md: 2.5 } }}
      >
        <Typography 
          variant="h6"
          sx={{ 
            fontSize: { xs: 16, sm: 17, md: 18, lg: 20, xl: 22 },
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          Advanced Guides
          <Chip 
            label={`${countEnabledGuides()} active`} 
            size="small" 
            color="primary" 
            sx={{ 
              ml: { xs: 0.5, sm: 1 },
              height: { xs: 24, sm: 26, md: 28, xl: 32 },
              fontSize: { xs: 11, sm: 12, md: 13, xl: 14 },
            }} 
          />
        </Typography>
        <Tooltip title={allEnabled ? 'Hide All' : 'Show All'}>
          <IconButton 
            onClick={toggleAllGuides} 
            color={allEnabled ? 'primary' : 'default'}
            sx={{
              minWidth: { xs: 44, sm: 46, md: 48, xl: 52 },
              minHeight: { xs: 44, sm: 46, md: 48, xl: 52 },
              touchAction: 'manipulation',
            }}
          >
            {allEnabled ? <Visibility /> : <VisibilityOff />}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Composition Guides */}
      <Accordion 
        defaultExpanded={settings.composition.enabled}
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': {
              my: { xs: 1, sm: 1.25, md: 1.5 },
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <GridOn 
              color={settings.composition.enabled ? 'primary' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>
              Composition
            </Typography>
            <Switch
              checked={settings.composition.enabled}
              onChange={(e) => updateSettings('composition', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase': {
                  padding: { xs: '8px', sm: '9px' },
                },
              }}
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ mb: { xs: 1, sm: 1.5 }, display: 'block', fontSize: { xs: 11, sm: 12, md: 13, xl: 14 } }}
          >
            Select overlay guides:
          </Typography>
          <ToggleButtonGroup
            value={settings.composition.guides}
            onChange={(_, guides) => updateSettings('composition', { guides: guides || [] })}
            size="small"
            sx={{ 
              flexWrap: 'wrap', 
              gap: { xs: 0.5, sm: 0.75, md: 1 },
              '& .MuiToggleButton-root': {
                minHeight: { xs: 36, sm: 40, md: 44, xl: 48 },
                fontSize: { xs: 11, sm: 12, md: 13, xl: 14 },
                px: { xs: 1.5, sm: 2, md: 2.5 },
                borderRadius: { xs: '6px', md: '8px' },
              },
            }}
          >
            <ToggleButton value="rule_of_thirds">Thirds</ToggleButton>
            <ToggleButton value="golden_ratio">Golden Ratio</ToggleButton>
            <ToggleButton value="golden_spiral">Spiral</ToggleButton>
            <ToggleButton value="diagonal">Diagonal</ToggleButton>
            <ToggleButton value="center_cross">Center</ToggleButton>
            <ToggleButton value="golden_triangle">Triangle</ToggleButton>
            <ToggleButton value="dynamic_symmetry">Dynamic</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ mt: { xs: 1.5, sm: 2, md: 2.5 } }}>
            <Typography variant="caption" sx={{ fontSize: { xs: 11, sm: 12, md: 13, xl: 14 } }}>
              Opacity: {settings.composition.opacity}
            </Typography>
            <Slider
              value={settings.composition.opacity}
              onChange={(_, v) => updateSettings('composition', { opacity: v as number })}
              min={0.1}
              max={1}
              step={0.1}
              size="small"
              sx={{
                '& .MuiSlider-thumb': {
                  width: { xs: 16, sm: 18, md: 20, xl: 24 },
                  height: { xs: 16, sm: 18, md: 20, xl: 24 },
                },
                '& .MuiSlider-rail, & .MuiSlider-track': {
                  height: { xs: 4, sm: 5, md: 6, xl: 8 },
                },
              }}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Lighting Visualization */}
      <Accordion
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': { my: { xs: 1, sm: 1.25, md: 1.5 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <Lightbulb 
              color={settings.lighting.enabled ? 'warning' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>Lighting</Typography>
            <Switch
              checked={settings.lighting.enabled}
              onChange={(e) => updateSettings('lighting', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack spacing={{ xs: 0.5, sm: 0.75, md: 1 }}>
            <FormControlLabel
              control={<Switch size="small" checked={settings.lighting.showShadowDirection} onChange={(e) => updateSettings('lighting', { showShadowDirection: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Shadow Direction</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.lighting.showLightFalloff} onChange={(e) => updateSettings('lighting', { showLightFalloff: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Light Fall-off (Inverse Square)</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.lighting.showCatchlightPreview} onChange={(e) => updateSettings('lighting', { showCatchlightPreview: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Catchlight Preview</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.lighting.showLightingRatio} onChange={(e) => updateSettings('lighting', { showLightingRatio: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Lighting Ratio</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.lighting.showReflectorBounce} onChange={(e) => updateSettings('lighting', { showReflectorBounce: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Reflector Bounce Path</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Depth of Field */}
      <Accordion
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': { my: { xs: 1, sm: 1.25, md: 1.5 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <CameraAlt 
              color={settings.depthOfField.enabled ? 'info' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>Depth of Field</Typography>
            <Switch
              checked={settings.depthOfField.enabled}
              onChange={(e) => updateSettings('depthOfField', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack spacing={{ xs: 0.5, sm: 0.75, md: 1 }}>
            <FormControlLabel
              control={<Switch size="small" checked={settings.depthOfField.showFocusPlane} onChange={(e) => updateSettings('depthOfField', { showFocusPlane: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Focus Plane</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.depthOfField.showInFocusZone} onChange={(e) => updateSettings('depthOfField', { showInFocusZone: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>In-Focus Zone (DoF Volume)</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.depthOfField.showHyperfocalDistance} onChange={(e) => updateSettings('depthOfField', { showHyperfocalDistance: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Hyperfocal Distance</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.depthOfField.showNearFarLimits} onChange={(e) => updateSettings('depthOfField', { showNearFarLimits: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Near/Far Focus Limits</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Video Production */}
      <Accordion
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': { my: { xs: 1, sm: 1.25, md: 1.5 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <Videocam 
              color={settings.videoProduction.enabled ? 'error' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>Video Production</Typography>
            <Switch
              checked={settings.videoProduction.enabled}
              onChange={(e) => updateSettings('videoProduction', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack spacing={{ xs: 0.75, sm: 1, md: 1.25 }}>
            <FormControlLabel
              control={<Switch size="small" checked={settings.videoProduction.showTitleSafe} onChange={(e) => updateSettings('videoProduction', { showTitleSafe: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Title Safe (90%)</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.videoProduction.showActionSafe} onChange={(e) => updateSettings('videoProduction', { showActionSafe: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Action Safe (93%)</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.videoProduction.showCenterMarkers} onChange={(e) => updateSettings('videoProduction', { showCenterMarkers: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Center Markers</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.videoProduction.showAspectRatioMask} onChange={(e) => updateSettings('videoProduction', { showAspectRatioMask: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Aspect Ratio Mask</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            {settings.videoProduction.showAspectRatioMask && (
              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Aspect Ratio</InputLabel>
                <Select
                  value={settings.videoProduction.aspectRatio}
                  onChange={(e) => updateSettings('videoProduction', { aspectRatio: e.target.value as AspectRatioType })}
                  label="Aspect Ratio"
                  sx={{ 
                    minHeight: { xs: 44, sm: 48, md: 52, xl: 56 },
                    fontSize: { xs: 13, sm: 14, md: 15, xl: 16 },
                  }}
                >
                  <MenuItem value="16:9" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>16:9 (HD/4K)</MenuItem>
                  <MenuItem value="4:3" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>4:3 (Classic)</MenuItem>
                  <MenuItem value="21:9" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>21:9 (Ultrawide)</MenuItem>
                  <MenuItem value="2.35:1" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>2.35:1 (Cinemascope)</MenuItem>
                  <MenuItem value="1.85:1" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>1.85:1 (Academy Flat)</MenuItem>
                  <MenuItem value="1:1" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>1:1 (Square)</MenuItem>
                  <MenuItem value="9:16" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>9:16 (Vertical)</MenuItem>
                  <MenuItem value="4:5" sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>4:5 (Instagram)</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Height References */}
      <Accordion
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': { my: { xs: 1, sm: 1.25, md: 1.5 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <Straighten 
              color={settings.heightReferences.enabled ? 'success' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>Height References</Typography>
            <Switch
              checked={settings.heightReferences.enabled}
              onChange={(e) => updateSettings('heightReferences', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack spacing={{ xs: 0.5, sm: 0.75, md: 1 }}>
            <FormControlLabel
              control={<Switch size="small" checked={settings.heightReferences.showSubjectHeights} onChange={(e) => updateSettings('heightReferences', { showSubjectHeights: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Subject Heights</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.heightReferences.showCameraHeights} onChange={(e) => updateSettings('heightReferences', { showCameraHeights: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Camera Heights</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.heightReferences.showLightHeights} onChange={(e) => updateSettings('heightReferences', { showLightHeights: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Light Heights</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.heightReferences.showBackgroundHeight} onChange={(e) => updateSettings('heightReferences', { showBackgroundHeight: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Background Coverage</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Safety & Spacing */}
      <Accordion
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': { my: { xs: 1, sm: 1.25, md: 1.5 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <Warning 
              color={settings.safetySpacing.enabled ? 'warning' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>Safety & Spacing</Typography>
            <Switch
              checked={settings.safetySpacing.enabled}
              onChange={(e) => updateSettings('safetySpacing', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack spacing={{ xs: 0.5, sm: 0.75, md: 1 }}>
            <FormControlLabel
              control={<Switch size="small" checked={settings.safetySpacing.showEquipmentClearance} onChange={(e) => updateSettings('safetySpacing', { showEquipmentClearance: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Equipment Clearance Zones</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.safetySpacing.showCableRoutes} onChange={(e) => updateSettings('safetySpacing', { showCableRoutes: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Cable Routes</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.safetySpacing.showMovementZones} onChange={(e) => updateSettings('safetySpacing', { showMovementZones: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Movement Zones</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.safetySpacing.showHotLightWarning} onChange={(e) => updateSettings('safetySpacing', { showHotLightWarning: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Hot Light Warning</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Color & Exposure */}
      <Accordion
        sx={{
          mb: { xs: 0.5, sm: 0.75, md: 1 },
          '&:before': { display: 'none' },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMore sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }} />}
          sx={{
            minHeight: { xs: 52, sm: 56, md: 60, lg: 64, xl: 72 },
            px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
            '& .MuiAccordionSummary-content': { my: { xs: 1, sm: 1.25, md: 1.5 } },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.75, sm: 1, md: 1.5 }} sx={{ flex: 1, mr: 2 }}>
            <Palette 
              color={settings.colorExposure.enabled ? 'secondary' : 'disabled'} 
              sx={{ fontSize: { xs: 22, sm: 24, md: 26, xl: 28 } }}
            />
            <Typography sx={{ fontSize: { xs: 14, sm: 15, md: 16, lg: 17, xl: 18 } }}>Color & Exposure</Typography>
            <Switch
              checked={settings.colorExposure.enabled}
              onChange={(e) => updateSettings('colorExposure', { enabled: e.target.checked })}
              onClick={(e) => e.stopPropagation()}
              size="small"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 }, pb: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack spacing={{ xs: 0.5, sm: 0.75, md: 1 }}>
            <FormControlLabel
              control={<Switch size="small" checked={settings.colorExposure.showColorTemperatureScale} onChange={(e) => updateSettings('colorExposure', { showColorTemperatureScale: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Color Temperature Scale</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.colorExposure.showExposureZones} onChange={(e) => updateSettings('colorExposure', { showExposureZones: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Exposure Zone System</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.colorExposure.showGrayCardPosition} onChange={(e) => updateSettings('colorExposure', { showGrayCardPosition: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Gray Card Position</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
            <FormControlLabel
              control={<Switch size="small" checked={settings.colorExposure.showColorCheckerPosition} onChange={(e) => updateSettings('colorExposure', { showColorCheckerPosition: e.target.checked })} />}
              label={<Typography sx={{ fontSize: { xs: 13, sm: 14, md: 15, xl: 16 } }}>Color Checker Position</Typography>}
              sx={{ minHeight: { xs: 40, sm: 42, md: 44, xl: 48 } }}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Tips */}
      <Alert 
        severity="info" 
        sx={{ 
          mt: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: { xs: '10px', md: '12px', xl: '14px' },
          px: { xs: 1.5, sm: 2, md: 2.5, xl: 3 },
          py: { xs: 1, sm: 1.25, md: 1.5 },
        }}
      >
        <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 14, xl: 15 } }}>
          Use composition guides for framing, lighting guides for setup verification,
          and safety guides during studio setup.
        </Typography>
      </Alert>
    </Box>
  );
};

export default AdvancedGuidesPanel;

