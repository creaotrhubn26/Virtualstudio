import React from 'react';
import { Box, Stack, Slider, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';

export interface LensSettings {
  focalLength: number;
  sensor: [number, number];
}

interface LensSelectorProps {
  settings: LensSettings;
  onChange: (settings: LensSettings) => void;
}

const FOCAL_LENGTHS = [14, 24, 35, 50, 85, 105, 135, 200];
const SENSOR_SIZES: { label: string; value: [number, number] }[] = [
  { label: 'Full Frame', value: [36, 24] },
  { label: 'APS-C', value: [23.5, 15.6] },
  { label: 'MFT', value: [17.3, 13] },
];

export function LensSelector({ settings, onChange }: LensSelectorProps) {
  const handleFocalLengthChange = (_: Event, value: number | number[]) => {
    const val = typeof value === 'number' ? value : value[0];
    onChange({ ...settings, focalLength: val });
  };

  const handleSensorChange = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    if (newValue) {
      const sensor = SENSOR_SIZES.find(s => s.label === newValue);
      if (sensor) {
        onChange({ ...settings, sensor: sensor.value });
      }
    }
  };

  const currentSensorLabel = SENSOR_SIZES.find(
    s => s.value[0] === settings.sensor[0] && s.value[1] === settings.sensor[1]
  )?.label || 'Full Frame';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Lens Settings</Typography>

      <Stack spacing={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Focal Length: {settings.focalLength}mm
          </Typography>
          <Slider
            value={settings.focalLength}
            min={14}
            max={200}
            step={1}
            onChange={handleFocalLengthChange}
            marks={FOCAL_LENGTHS.map(v => ({ value: v, label: `${v}` }))}
            size="small"
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Sensor Size
          </Typography>
          <ToggleButtonGroup
            value={currentSensorLabel}
            exclusive
            onChange={handleSensorChange}
            size="small"
            fullWidth
          >
            {SENSOR_SIZES.map(sensor => (
              <ToggleButton key={sensor.label} value={sensor.label}>
                {sensor.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </Box>
  );
}
