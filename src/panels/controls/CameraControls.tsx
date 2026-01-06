import React from 'react';
import { Box, Stack, Slider, Typography, IconButton, Tooltip } from '@mui/material';
import { Refresh } from '@mui/icons-material';

export interface CameraSettings {
  aperture: number;
  iso: number;
  shutter: number;
  focusDistance: number;
  focalLength: number;
}

interface CameraControlsProps {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
  onReset: () => void;
}

const APERTURE_VALUES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const ISO_VALUES = [100, 200, 400, 800, 1600, 3200, 6400];
const SHUTTER_VALUES = [1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8];

export function CameraControls({ settings, onChange, onReset }: CameraControlsProps) {
  const handleApertureChange = (_: Event, value: number | number[]) => {
    const idx = typeof value === 'number' ? value : value[0];
    onChange({ ...settings, aperture: APERTURE_VALUES[idx] || 2.8 });
  };

  const handleIsoChange = (_: Event, value: number | number[]) => {
    const idx = typeof value === 'number' ? value : value[0];
    onChange({ ...settings, iso: ISO_VALUES[idx] || 100 });
  };

  const handleShutterChange = (_: Event, value: number | number[]) => {
    const idx = typeof value === 'number' ? value : value[0];
    onChange({ ...settings, shutter: SHUTTER_VALUES[idx] || 1/125 });
  };

  const handleFocusChange = (_: Event, value: number | number[]) => {
    const val = typeof value === 'number' ? value : value[0];
    onChange({ ...settings, focusDistance: val });
  };

  const apertureIdx = APERTURE_VALUES.findIndex(v => v === settings.aperture) ?? 2;
  const isoIdx = ISO_VALUES.findIndex(v => v === settings.iso) ?? 0;
  const shutterIdx = SHUTTER_VALUES.findIndex(v => Math.abs(v - settings.shutter) < 0.0001) ?? 3;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Camera Settings</Typography>
        <Tooltip title="Reset to defaults">
          <IconButton size="small" onClick={onReset}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Aperture: f/{settings.aperture}
          </Typography>
          <Slider
            value={apertureIdx >= 0 ? apertureIdx : 2}
            min={0}
            max={APERTURE_VALUES.length - 1}
            step={1}
            onChange={handleApertureChange}
            size="small"
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            ISO: {settings.iso}
          </Typography>
          <Slider
            value={isoIdx >= 0 ? isoIdx : 0}
            min={0}
            max={ISO_VALUES.length - 1}
            step={1}
            onChange={handleIsoChange}
            size="small"
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Shutter: 1/{Math.round(1 / settings.shutter)}
          </Typography>
          <Slider
            value={shutterIdx >= 0 ? shutterIdx : 3}
            min={0}
            max={SHUTTER_VALUES.length - 1}
            step={1}
            onChange={handleShutterChange}
            size="small"
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Focus Distance: {settings.focusDistance.toFixed(1)}m
          </Typography>
          <Slider
            value={settings.focusDistance}
            min={0.5}
            max={20}
            step={0.1}
            onChange={handleFocusChange}
            size="small"
          />
        </Box>
      </Stack>
    </Box>
  );
}
