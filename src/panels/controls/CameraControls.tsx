/**
 * CameraControls — Kamerainnstillinger-panel
 * Norsk UI med full eksponeringsverdi (EV), dybdeskarphet og blendetall-display.
 */

import React, { useMemo } from 'react';
import {
  Box,
  Stack,
  Slider,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Refresh,
  CameraAlt,
  BlurOn,
  LightMode,
  Timer,
  FiberManualRecord,
} from '@mui/icons-material';

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

// ─── Exposure tables ─────────────────────────────────────────────────────────

const APERTURE_VALUES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const ISO_VALUES       = [100, 200, 400, 800, 1600, 3200, 6400];
const SHUTTER_VALUES   = [1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4];

const SHUTTER_LABELS = SHUTTER_VALUES.map(v => {
  const denom = Math.round(1 / v);
  return denom >= 4 ? `1/${denom}` : `${v.toFixed(1)}s`;
});

// ─── Calculations ────────────────────────────────────────────────────────────

/**
 * Exposure Value (base-2).  EV 0 = f/1, 1s, ISO 100.
 * EV = log2(f² / t) - log2(ISO/100)
 */
function calcEV(aperture: number, shutter: number, iso: number): number {
  const ev100 = Math.log2((aperture * aperture) / shutter);
  return ev100 - Math.log2(iso / 100);
}

/**
 * Returns a descriptive label for a given EV.
 * Negative = underexposed, 0–14 studio range, positive = overexposed.
 */
function evLabel(ev: number): { text: string; color: string } {
  if (ev < -3) return { text: 'Svært undereksponert', color: '#f44336' };
  if (ev < 0)  return { text: 'Undereksponert',        color: '#ff9800' };
  if (ev < 6)  return { text: 'Studioeksponering',     color: '#4caf50' };
  if (ev < 12) return { text: 'Lyst miljø',             color: '#8bc34a' };
  if (ev < 16) return { text: 'Uteeksponering',         color: '#ff9800' };
  return              { text: 'Overeksponert',           color: '#f44336' };
}

/**
 * Approximate DoF class based on aperture.
 */
function dofLabel(aperture: number): string {
  if (aperture <= 2)   return 'Svært grunn dybdeskarphet';
  if (aperture <= 4)   return 'Grunn dybdeskarphet (portrett)';
  if (aperture <= 8)   return 'Moderat dybdeskarphet';
  if (aperture <= 11)  return 'God skarphet hele bildet';
  return 'Stor dybdeskarphet (landskap)';
}

// ─── Reusable row ────────────────────────────────────────────────────────────

interface ControlRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  children: React.ReactNode;
}

function ControlRow({ icon, label, value, children }: ControlRowProps) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Box sx={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
        </Stack>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: '#ce93d8', fontFamily: 'monospace', fontSize: '0.75rem' }}
        >
          {value}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const CameraControls = React.memo(function CameraControls({
  settings,
  onChange,
  onReset,
}: CameraControlsProps) {
  const apertureIdx = useMemo(
    () => Math.max(0, APERTURE_VALUES.findIndex(v => v === settings.aperture)),
    [settings.aperture],
  );
  const isoIdx = useMemo(
    () => Math.max(0, ISO_VALUES.findIndex(v => v === settings.iso)),
    [settings.iso],
  );
  const shutterIdx = useMemo(
    () => Math.max(0, SHUTTER_VALUES.findIndex(v => Math.abs(v - settings.shutter) < 0.00001)),
    [settings.shutter],
  );

  const ev = useMemo(
    () => calcEV(settings.aperture, settings.shutter, settings.iso),
    [settings.aperture, settings.shutter, settings.iso],
  );
  const evInfo = evLabel(ev);
  const evNorm = Math.min(100, Math.max(0, ((ev + 4) / 20) * 100));

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, letterSpacing: '0.05em', color: '#b39ddb', textTransform: 'uppercase', fontSize: '0.7rem' }}
        >
          Kamerainnstillinger
        </Typography>
        <Tooltip title="Tilbakestill til standard">
          <IconButton size="small" onClick={onReset} sx={{ color: 'rgba(255,255,255,0.4)' }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* EV Summary card */}
      <Box
        sx={{
          mb: 2,
          p: 1.25,
          borderRadius: 1.5,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
            Eksponeringsverdi (EV)
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <FiberManualRecord sx={{ fontSize: 8, color: evInfo.color }} />
            <Typography variant="caption" sx={{ color: evInfo.color, fontWeight: 600 }}>
              {evInfo.text}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={evNorm}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': { bgcolor: evInfo.color, borderRadius: 3 },
            }}
          />
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#e8e8f0', minWidth: 36, textAlign: 'right' }}>
            EV {ev.toFixed(1)}
          </Typography>
        </Stack>
      </Box>

      <Stack spacing={2}>
        {/* Aperture */}
        <ControlRow
          icon={<CameraAlt sx={{ fontSize: 14 }} />}
          label="Blenderåpning"
          value={`f/${settings.aperture}`}
        >
          <Slider
            value={apertureIdx}
            min={0}
            max={APERTURE_VALUES.length - 1}
            step={1}
            onChange={(_, v) => onChange({ ...settings, aperture: APERTURE_VALUES[typeof v === 'number' ? v : v[0]] || 2.8 })}
            size="small"
            marks
            sx={{ '& .MuiSlider-markActive': { bgcolor: '#ce93d8' }, '& .MuiSlider-thumb': { bgcolor: '#ce93d8' }, '& .MuiSlider-track': { bgcolor: '#9c27b0' } }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)' }}>
            {dofLabel(settings.aperture)}
          </Typography>
        </ControlRow>

        {/* ISO */}
        <ControlRow
          icon={<LightMode sx={{ fontSize: 14 }} />}
          label="ISO-følsomhet"
          value={`ISO ${settings.iso}`}
        >
          <Slider
            value={isoIdx}
            min={0}
            max={ISO_VALUES.length - 1}
            step={1}
            onChange={(_, v) => onChange({ ...settings, iso: ISO_VALUES[typeof v === 'number' ? v : v[0]] || 100 })}
            size="small"
            marks
            sx={{ '& .MuiSlider-markActive': { bgcolor: '#ce93d8' }, '& .MuiSlider-thumb': { bgcolor: '#ce93d8' }, '& .MuiSlider-track': { bgcolor: '#9c27b0' } }}
          />
          {settings.iso > 1600 && (
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#ff9800' }}>
              ⚠ Høy ISO — synlig støy
            </Typography>
          )}
        </ControlRow>

        {/* Shutter */}
        <ControlRow
          icon={<Timer sx={{ fontSize: 14 }} />}
          label="Lukkerhastiget"
          value={SHUTTER_LABELS[shutterIdx] ?? `1/${Math.round(1 / settings.shutter)}`}
        >
          <Slider
            value={shutterIdx}
            min={0}
            max={SHUTTER_VALUES.length - 1}
            step={1}
            onChange={(_, v) => onChange({ ...settings, shutter: SHUTTER_VALUES[typeof v === 'number' ? v : v[0]] || 1 / 125 })}
            size="small"
            marks
            sx={{ '& .MuiSlider-markActive': { bgcolor: '#ce93d8' }, '& .MuiSlider-thumb': { bgcolor: '#ce93d8' }, '& .MuiSlider-track': { bgcolor: '#9c27b0' } }}
          />
          {settings.shutter > 1 / 60 && (
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: '#ff9800' }}>
              ⚠ Langsom lukkerhastighet — risiko for bevegelsesuskarphet
            </Typography>
          )}
        </ControlRow>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Focus distance */}
        <ControlRow
          icon={<BlurOn sx={{ fontSize: 14 }} />}
          label="Fokusavstand"
          value={`${settings.focusDistance.toFixed(1)} m`}
        >
          <Slider
            value={settings.focusDistance}
            min={0.3}
            max={20}
            step={0.1}
            onChange={(_, v) => onChange({ ...settings, focusDistance: typeof v === 'number' ? v : v[0] })}
            size="small"
            sx={{ '& .MuiSlider-thumb': { bgcolor: '#ce93d8' }, '& .MuiSlider-track': { bgcolor: '#9c27b0' } }}
          />
        </ControlRow>
      </Stack>

      {/* Quick exposure chips */}
      <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 2 }}>
        {[
          { label: 'Portrett f/2.8', aperture: 2.8, iso: 100, shutter: 1/125 },
          { label: 'Studio f/8',     aperture: 8,   iso: 100, shutter: 1/125 },
          { label: 'Konsert f/2',    aperture: 2,   iso: 3200, shutter: 1/250 },
        ].map(preset => (
          <Chip
            key={preset.label}
            label={preset.label}
            size="small"
            onClick={() => onChange({ ...settings, aperture: preset.aperture, iso: preset.iso, shutter: preset.shutter })}
            sx={{
              fontSize: '0.62rem',
              height: 20,
              bgcolor: 'rgba(156,39,176,0.15)',
              color: '#b39ddb',
              border: '1px solid rgba(156,39,176,0.2)',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(156,39,176,0.3)' },
              '& .MuiChip-label': { px: 1 },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
});
