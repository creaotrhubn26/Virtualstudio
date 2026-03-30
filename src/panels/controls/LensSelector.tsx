/**
 * LensSelector — Objektivvelger
 * Norsk UI med feltvinkel-kalkulator, beskjæringsgruppefaktor og hurtigvalg av objektiv.
 */

import React, { useMemo } from 'react';
import {
  Box,
  Stack,
  Slider,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';

export interface LensSettings {
  focalLength: number;
  sensor: [number, number];
}

interface LensSelectorProps {
  settings: LensSettings;
  onChange: (settings: LensSettings) => void;
}

// ─── Sensor profiles ──────────────────────────────────────────────────────────

const SENSOR_PROFILES: { label: string; shortLabel: string; value: [number, number]; cropFactor: number }[] = [
  { label: 'Full Frame (35mm)',   shortLabel: 'FF',    value: [36, 24],    cropFactor: 1.0 },
  { label: 'APS-C (Canon)',       shortLabel: 'APS-C', value: [22.3, 14.9], cropFactor: 1.6 },
  { label: 'APS-C (Nikon/Sony)', shortLabel: 'APS-C',  value: [23.5, 15.6], cropFactor: 1.5 },
  { label: 'Micro Four Thirds',   shortLabel: 'MFT',   value: [17.3, 13],  cropFactor: 2.0 },
  { label: 'Medium Format (645)', shortLabel: 'MF',    value: [44, 33],    cropFactor: 0.79 },
];

// Only 3-choice toggle for UI space — show FF / APS-C / MFT
const SENSOR_SIZES = [
  SENSOR_PROFILES[0],
  SENSOR_PROFILES[2],
  SENSOR_PROFILES[3],
];

// ─── Lens preset categories ───────────────────────────────────────────────────

const LENS_PRESETS: { label: string; mm: number; category: string }[] = [
  { label: '14mm', mm: 14,  category: 'Ultra-vidvinkel' },
  { label: '24mm', mm: 24,  category: 'Vidvinkel' },
  { label: '35mm', mm: 35,  category: 'Reportasje' },
  { label: '50mm', mm: 50,  category: 'Normal' },
  { label: '85mm', mm: 85,  category: 'Portrett' },
  { label: '105mm', mm: 105, category: 'Makro' },
  { label: '135mm', mm: 135, category: 'Portrett tele' },
  { label: '200mm', mm: 200, category: 'Tele' },
];

// ─── Calculations ─────────────────────────────────────────────────────────────

/**
 * Horizontal FoV in degrees using full-frame 36mm sensor as base.
 * fov = 2 * arctan(sensorWidth / (2 * focalLength))
 */
function calcHFoV(focalLength: number, sensorWidth: number): number {
  return (2 * Math.atan(sensorWidth / (2 * focalLength)) * 180) / Math.PI;
}

/**
 * Vertical FoV in degrees.
 */
function calcVFoV(focalLength: number, sensorHeight: number): number {
  return (2 * Math.atan(sensorHeight / (2 * focalLength)) * 180) / Math.PI;
}

/**
 * Categorise the lens type based on equivalent focal length on FF.
 */
function lensCategory(eqFl: number): string {
  if (eqFl <= 18) return 'Ultra-vidvinkel';
  if (eqFl <= 35) return 'Vidvinkel';
  if (eqFl <= 55) return 'Normal / standard';
  if (eqFl <= 105) return 'Portrett / medium tele';
  if (eqFl <= 200) return 'Tele';
  return 'Supertele';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LensSelector({ settings, onChange }: LensSelectorProps) {
  const currentSensor = useMemo(
    () =>
      SENSOR_SIZES.find(
        s => s.value[0] === settings.sensor[0] && s.value[1] === settings.sensor[1],
      ) ?? SENSOR_SIZES[0],
    [settings.sensor],
  );

  const cropFactor = useMemo(() => {
    const profile = SENSOR_PROFILES.find(
      s => s.value[0] === settings.sensor[0] && s.value[1] === settings.sensor[1],
    );
    return profile?.cropFactor ?? 1.0;
  }, [settings.sensor]);

  const eqFocalLength = useMemo(
    () => Math.round(settings.focalLength * cropFactor),
    [settings.focalLength, cropFactor],
  );
  const hFoV = useMemo(
    () => calcHFoV(settings.focalLength, settings.sensor[0]),
    [settings.focalLength, settings.sensor],
  );
  const vFoV = useMemo(
    () => calcVFoV(settings.focalLength, settings.sensor[1]),
    [settings.focalLength, settings.sensor],
  );
  const category = lensCategory(eqFocalLength);

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {/* Header */}
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, letterSpacing: '0.05em', color: '#b39ddb', textTransform: 'uppercase', fontSize: '0.7rem', mb: 1.5 }}
      >
        Objektivinnstillinger
      </Typography>

      {/* Focal length summary card */}
      <Box
        sx={{
          mb: 2,
          p: 1.25,
          borderRadius: 1.5,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block' }}>
              Brennvidde
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: '#ce93d8', lineHeight: 1.1 }}>
              {settings.focalLength}mm
            </Typography>
            {cropFactor !== 1 && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                ≈ {eqFocalLength}mm ekv. (FF)
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block' }}>
              Synsvinkel (H × V)
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#e8e8f0', lineHeight: 1.2 }}>
              {hFoV.toFixed(0)}° × {vFoV.toFixed(0)}°
            </Typography>
            <Typography variant="caption" sx={{ color: '#b39ddb', fontSize: '0.65rem' }}>
              {category}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack spacing={2}>
        {/* Focal length slider */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Brennvidde
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#ce93d8', fontWeight: 700 }}>
              {settings.focalLength} mm
            </Typography>
          </Stack>
          <Slider
            value={settings.focalLength}
            min={14}
            max={200}
            step={1}
            onChange={(_, v) => onChange({ ...settings, focalLength: typeof v === 'number' ? v : v[0] })}
            marks={[14, 24, 35, 50, 85, 135, 200].map(v => ({ value: v, label: `${v}` }))}
            size="small"
            sx={{
              '& .MuiSlider-markLabel': { fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' },
              '& .MuiSlider-thumb': { bgcolor: '#ce93d8' },
              '& .MuiSlider-track': { bgcolor: '#9c27b0' },
              '& .MuiSlider-markActive': { bgcolor: '#ce93d8' },
            }}
          />
        </Box>

        {/* Quick lens preset chips */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 500 }}>
            Hurtigvalg objektiv
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {LENS_PRESETS.map(preset => (
              <Tooltip key={preset.mm} title={preset.category} placement="top" arrow>
                <Chip
                  label={preset.label}
                  size="small"
                  onClick={() => onChange({ ...settings, focalLength: preset.mm })}
                  sx={{
                    fontSize: '0.62rem',
                    height: 20,
                    bgcolor: settings.focalLength === preset.mm
                      ? 'rgba(156,39,176,0.45)'
                      : 'rgba(156,39,176,0.12)',
                    color: settings.focalLength === preset.mm ? '#fff' : '#b39ddb',
                    border: `1px solid ${settings.focalLength === preset.mm ? 'rgba(156,39,176,0.6)' : 'rgba(156,39,176,0.2)'}`,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(156,39,176,0.3)' },
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Sensor size */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Sensorstørrelse
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#ce93d8', fontWeight: 700 }}>
              {settings.sensor[0]}×{settings.sensor[1]} mm
              {cropFactor !== 1 && (
                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>
                  ({cropFactor.toFixed(1)}× beskjæring)
                </span>
              )}
            </Typography>
          </Stack>
          <ToggleButtonGroup
            value={currentSensor.label}
            exclusive
            onChange={(_, val) => {
              if (val) {
                const s = SENSOR_SIZES.find(x => x.label === val);
                if (s) onChange({ ...settings, sensor: s.value });
              }
            }}
            size="small"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                fontSize: '0.65rem',
                py: 0.4,
                color: 'rgba(255,255,255,0.5)',
                borderColor: 'rgba(156,39,176,0.25)',
                '&.Mui-selected': {
                  bgcolor: 'rgba(156,39,176,0.3)',
                  color: '#ce93d8',
                  borderColor: 'rgba(156,39,176,0.5)',
                },
              },
            }}
          >
            {SENSOR_SIZES.map(sensor => (
              <ToggleButton key={sensor.label} value={sensor.label}>
                {sensor.shortLabel}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
            {currentSensor.label}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
