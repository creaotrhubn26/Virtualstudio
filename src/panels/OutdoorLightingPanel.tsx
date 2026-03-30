/**
 * OutdoorLightingPanel — Utendørslys & Atmosfære
 *
 * Three-tab panel:
 *   Tab 0 — Solposisjon : GPS location + date/time → solar angles via NOAA algorithm
 *   Tab 1 — Himmelprofil : Sky presets (ClearSky/Cloudy/Overcast/Sunrise/NightSky…)
 *   Tab 2 — Tåke & Atmosfære : Fine-grain fog + ambient controls
 *
 * Events dispatched to main.ts:
 *   vs-outdoor-sun    { elevation, azimuth, intensity, color, enabled }
 *   vs-outdoor-sky    { preset, clearColor, ambientColor, ambientIntensity, fogEnabled, fogDensity, fogColor, sunEnabled, sunIntensity, sunColor }
 *   vs-outdoor-fog    { fogEnabled, mode, density, color, start, end }
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Stack,
  Tabs,
  Tab,
  Slider,
  Typography,
  TextField,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  WbSunny,
  NightsStay,
  CloudQueue,
  Grain,
  LocationOn,
  Schedule,
  Tune,
  MyLocation,
  Refresh,
  NavigationOutlined,
} from '@mui/icons-material';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SunState {
  enabled: boolean;
  elevation: number;   // degrees, -90 … +90
  azimuth: number;     // degrees, 0=N 90=E 180=S 270=W
  intensity: number;   // 0 … 5
  color: string;       // hex
}

interface SkyPreset {
  id: string;
  name: string;
  clearColor: string;
  ambientColor: string;
  ambientIntensity: number;
  fogEnabled: boolean;
  fogDensity: number;
  fogColor: string;
  sunIntensity: number;
  sunColor: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}

interface FogState {
  enabled: boolean;
  mode: 'exp2' | 'linear';
  density: number;
  color: string;
  start: number;
  end: number;
}

interface LocationState {
  name: string;
  lat: number;
  lng: number;
  dateStr: string;  // yyyy-mm-dd
  timeStr: string;  // HH:MM
}

// ─── Sky presets (matching reference images) ──────────────────────────────────

const SKY_PRESETS: SkyPreset[] = [
  {
    id: 'clear_sky',
    name: 'ClearSky',
    clearColor: '#5a9fd4',
    ambientColor: '#d4e8f0',
    ambientIntensity: 0.9,
    fogEnabled: false,
    fogDensity: 0,
    fogColor: '#d4e8f0',
    sunIntensity: 3.2,
    sunColor: '#fff8e8',
    description: 'Klar blå himmel, sterk sol',
    gradientFrom: '#1a7fc4',
    gradientTo: '#87CEEB',
  },
  {
    id: 'cloudy',
    name: 'Cloudy',
    clearColor: '#8a9cad',
    ambientColor: '#c8d0d8',
    ambientIntensity: 0.7,
    fogEnabled: true,
    fogDensity: 0.003,
    fogColor: '#c0c8d0',
    sunIntensity: 1.4,
    sunColor: '#e8ecf0',
    description: 'Delvis skyet, diffust lys',
    gradientFrom: '#607080',
    gradientTo: '#b0bec5',
  },
  {
    id: 'overcast',
    name: 'Overcast',
    clearColor: '#7a8490',
    ambientColor: '#b8bec4',
    ambientIntensity: 0.55,
    fogEnabled: true,
    fogDensity: 0.006,
    fogColor: '#b0b8c0',
    sunIntensity: 0.6,
    sunColor: '#d0d4d8',
    description: 'Overskyet, flat belysning',
    gradientFrom: '#546070',
    gradientTo: '#90a0ac',
  },
  {
    id: 'heavy_overcast',
    name: 'Heavy Overcast',
    clearColor: '#5a6068',
    ambientColor: '#909898',
    ambientIntensity: 0.4,
    fogEnabled: true,
    fogDensity: 0.012,
    fogColor: '#909898',
    sunIntensity: 0.2,
    sunColor: '#c0c0c0',
    description: 'Tett skydekke, mørk dag',
    gradientFrom: '#3c4450',
    gradientTo: '#70808a',
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    clearColor: '#e87040',
    ambientColor: '#f0a060',
    ambientIntensity: 0.65,
    fogEnabled: true,
    fogDensity: 0.004,
    fogColor: '#e88050',
    sunIntensity: 2.0,
    sunColor: '#ffa040',
    description: 'Soloppgang, varmt oransje lys',
    gradientFrom: '#c03010',
    gradientTo: '#ff8040',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    clearColor: '#c86030',
    ambientColor: '#d88040',
    ambientIntensity: 0.5,
    fogEnabled: true,
    fogDensity: 0.005,
    fogColor: '#d07030',
    sunIntensity: 1.5,
    sunColor: '#ffc060',
    description: 'Gylden time, dramatisk lys',
    gradientFrom: '#a04010',
    gradientTo: '#e07030',
  },
  {
    id: 'blue_hour',
    name: 'Blue Hour',
    clearColor: '#1a2a4a',
    ambientColor: '#3050a0',
    ambientIntensity: 0.3,
    fogEnabled: true,
    fogDensity: 0.006,
    fogColor: '#1a2a50',
    sunIntensity: 0.3,
    sunColor: '#4060c0',
    description: 'Blå time, silhuettlys',
    gradientFrom: '#0a1228',
    gradientTo: '#203060',
  },
  {
    id: 'night_sky',
    name: 'NightSky',
    clearColor: '#08102a',
    ambientColor: '#101828',
    ambientIntensity: 0.08,
    fogEnabled: true,
    fogDensity: 0.002,
    fogColor: '#08102a',
    sunIntensity: 0.0,
    sunColor: '#ffffff',
    description: 'Nattscene, stjernehjemmel',
    gradientFrom: '#040810',
    gradientTo: '#101828',
  },
];

// ─── Norwegian city presets ───────────────────────────────────────────────────

const CITY_PRESETS = [
  { name: 'Oslo, Norge',        lat: 59.91, lng: 10.75 },
  { name: 'Bergen, Norge',      lat: 60.39, lng: 5.33  },
  { name: 'London, UK',         lat: 51.51, lng: -0.13 },
  { name: 'Paris, Frankrike',   lat: 48.86, lng: 2.35  },
  { name: 'New York, USA',      lat: 40.71, lng: -74.01 },
  { name: 'Los Angeles, USA',   lat: 34.05, lng: -118.24 },
  { name: 'Tokyo, Japan',       lat: 35.68, lng: 139.69 },
  { name: 'Sydney, Australia',  lat: -33.87, lng: 151.21 },
];

// ─── Solar position algorithm (NOAA simplified) ──────────────────────────────

function calcSolarPosition(lat: number, lng: number, date: Date): { elevation: number; azimuth: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  // Julian day
  const JD = date.getTime() / 86400000 + 2440587.5;
  const n = JD - 2451545.0;

  // Mean longitude & anomaly
  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;

  // Ecliptic longitude
  const lambda = L + 1.915 * Math.sin(toRad(g)) + 0.02 * Math.sin(toRad(2 * g));

  // Obliquity
  const epsilon = 23.439 - 0.0000004 * n;

  // Declination
  const delta = toDeg(Math.asin(Math.sin(toRad(epsilon)) * Math.sin(toRad(lambda))));

  // Right ascension
  const alpha = toDeg(
    Math.atan2(Math.cos(toRad(epsilon)) * Math.sin(toRad(lambda)), Math.cos(toRad(lambda))),
  );

  // GMST in hours
  const GMST =
    ((6.697375 + 0.0657098242 * n + date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) %
      24 +
      24) %
    24;

  // Hour angle (degrees)
  const H = ((GMST * 15 + lng - alpha) % 360 + 360) % 360;
  const Hrad = H > 180 ? toRad(H - 360) : toRad(H);

  const latRad = toRad(lat);
  const deltaRad = toRad(delta);

  // Elevation
  const elevation = toDeg(
    Math.asin(Math.sin(latRad) * Math.sin(deltaRad) + Math.cos(latRad) * Math.cos(deltaRad) * Math.cos(Hrad)),
  );

  // Azimuth (0=N, clockwise)
  const az = toDeg(
    Math.atan2(-Math.sin(Hrad), Math.cos(Hrad) * Math.sin(latRad) - Math.tan(deltaRad) * Math.cos(latRad)),
  );
  const azimuth = ((az + 180) % 360 + 360) % 360;

  return { elevation, azimuth };
}

// ─── Compass Rose SVG ─────────────────────────────────────────────────────────

function CompassRose({ azimuth, elevation }: { azimuth: number; elevation: number }) {
  const cx = 64;
  const cy = 64;
  const r = 52;
  const arrowLen = 38;

  // Sun position on circle (azimuth, 0=top=N, clockwise)
  const angleRad = ((azimuth - 90 + 360) % 360) * (Math.PI / 180);
  const sx = cx + Math.cos(angleRad) * 38;
  const sy = cy + Math.sin(angleRad) * 38;

  // Elevation colour: negative = dark red, 0-10 = warm orange, >30 = gold
  const sunColor =
    elevation < 0
      ? '#666'
      : elevation < 5
        ? '#ff6030'
        : elevation < 20
          ? '#ffa030'
          : '#ffd060';

  const arrowX = cx + Math.cos(angleRad) * arrowLen;
  const arrowY = cy + Math.sin(angleRad) * arrowLen;

  return (
    <svg width={128} height={128} viewBox="0 0 128 128" style={{ display: 'block', margin: '0 auto' }}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r * 0.67} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

      {/* Cardinal tick marks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const ar = ((a - 90 + 360) % 360) * (Math.PI / 180);
        const isMajor = a % 90 === 0;
        const inner = r * (isMajor ? 0.84 : 0.92);
        return (
          <line
            key={a}
            x1={cx + Math.cos(ar) * inner}
            y1={cy + Math.sin(ar) * inner}
            x2={cx + Math.cos(ar) * r}
            y2={cy + Math.sin(ar) * r}
            stroke={isMajor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'}
            strokeWidth={isMajor ? 1.5 : 1}
          />
        );
      })}

      {/* Cardinal labels */}
      {[
        { a: 0,   label: 'N', dx: 0,   dy: -r + 8 },
        { a: 90,  label: 'Ø', dx: r - 8, dy: 0   },
        { a: 180, label: 'S', dx: 0,   dy:  r - 8 },
        { a: 270, label: 'V', dx: -r + 8, dy: 0  },
      ].map(({ a, label, dx, dy }) => (
        <text
          key={a}
          x={cx + dx}
          y={cy + dy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={a === 0 ? '#ef5350' : 'rgba(255,255,255,0.55)'}
          fontSize={a % 90 === 0 ? 9 : 7}
          fontWeight={a === 0 ? 700 : 400}
          fontFamily="monospace"
        >
          {label}
        </text>
      ))}

      {/* Sun arrow */}
      {elevation > -2 && (
        <line
          x1={cx}
          y1={cy}
          x2={arrowX}
          y2={arrowY}
          stroke={sunColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}

      {/* Sun disc */}
      <circle cx={sx} cy={sy} r={elevation > 0 ? 7 : 5} fill={sunColor} opacity={elevation > 0 ? 1 : 0.4} />
      {elevation > 0 && (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((ra) => {
            const ar = ra * (Math.PI / 180);
            return (
              <line
                key={ra}
                x1={sx + Math.cos(ar) * 8}
                y1={sy + Math.sin(ar) * 8}
                x2={sx + Math.cos(ar) * 11}
                y2={sy + Math.sin(ar) * 11}
                stroke={sunColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.8}
              />
            );
          })}
        </>
      )}

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function OutdoorLightingPanel() {
  const [activeTab, setActiveTab] = useState(0);

  // Sun state
  const [sun, setSun] = useState<SunState>({
    enabled: true,
    elevation: 42,
    azimuth: 180,
    intensity: 2.5,
    color: '#fff8e8',
  });

  // Location state
  const today = new Date();
  const [location, setLocation] = useState<LocationState>({
    name: 'Oslo, Norge',
    lat: 59.91,
    lng: 10.75,
    dateStr: today.toISOString().slice(0, 10),
    timeStr: '10:00',
  });
  const [autoSun, setAutoSun] = useState(false);

  // Sky preset
  const [selectedSky, setSelectedSky] = useState<string>('clear_sky');

  // Fog state
  const [fog, setFog] = useState<FogState>({
    enabled: false,
    mode: 'exp2',
    density: 0.005,
    color: '#c0c8d0',
    start: 5,
    end: 80,
  });

  // ── Solar calculation ───────────────────────────────────────────────────────

  const calcSun = useCallback(() => {
    const [h, m] = location.timeStr.split(':').map(Number);
    const [year, month, day] = location.dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day, h ?? 10, m ?? 0));
    const pos = calcSolarPosition(location.lat, location.lng, d);
    const newSun = { ...sun, elevation: Math.round(pos.elevation * 10) / 10, azimuth: Math.round(pos.azimuth * 10) / 10 };
    setSun(newSun);
    dispatchSun(newSun);
  }, [location, sun]);

  // Auto-recalc when location/time changes
  useEffect(() => {
    if (autoSun) calcSun();
  }, [location.lat, location.lng, location.dateStr, location.timeStr, autoSun]);

  // ── Dispatch helpers ────────────────────────────────────────────────────────

  const dispatchSun = (s: SunState) => {
    window.dispatchEvent(
      new CustomEvent('vs-outdoor-sun', {
        detail: { elevation: s.elevation, azimuth: s.azimuth, intensity: s.intensity, color: s.color, enabled: s.enabled },
      }),
    );
  };

  const dispatchSky = (presetId: string) => {
    const preset = SKY_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    window.dispatchEvent(
      new CustomEvent('vs-outdoor-sky', {
        detail: {
          preset: presetId,
          clearColor: preset.clearColor,
          ambientColor: preset.ambientColor,
          ambientIntensity: preset.ambientIntensity,
          fogEnabled: preset.fogEnabled,
          fogDensity: preset.fogDensity,
          fogColor: preset.fogColor,
          sunEnabled: preset.sunIntensity > 0,
          sunIntensity: preset.sunIntensity,
          sunColor: preset.sunColor,
        },
      }),
    );
  };

  const dispatchFog = (f: FogState) => {
    window.dispatchEvent(
      new CustomEvent('vs-outdoor-fog', {
        detail: { fogEnabled: f.enabled, mode: f.mode, density: f.density, color: f.color, start: f.start, end: f.end },
      }),
    );
  };

  // ── Sun handlers ────────────────────────────────────────────────────────────

  const handleSunChange = (patch: Partial<SunState>) => {
    const next = { ...sun, ...patch };
    setSun(next);
    dispatchSun(next);
  };

  // ── Fog handlers ────────────────────────────────────────────────────────────

  const handleFogChange = (patch: Partial<FogState>) => {
    const next = { ...fog, ...patch };
    setFog(next);
    dispatchFog(next);
  };

  // ── Sky preset selection ────────────────────────────────────────────────────

  const handleSkySelect = (id: string) => {
    setSelectedSky(id);
    dispatchSky(id);
    // Also sync fog from preset
    const preset = SKY_PRESETS.find(p => p.id === id);
    if (preset) {
      const newFog: FogState = {
        ...fog,
        enabled: preset.fogEnabled,
        density: preset.fogDensity,
        color: preset.fogColor,
      };
      setFog(newFog);
      // Also sync sun color/intensity
      setSun(prev => ({ ...prev, color: preset.sunColor, intensity: preset.sunIntensity, enabled: preset.sunIntensity > 0 }));
    }
  };

  // ── Elevation arc display ───────────────────────────────────────────────────

  const elevLabel = useMemo(() => {
    const e = sun.elevation;
    if (e < -5) return { text: 'Under horisont', color: '#607080' };
    if (e < 5)  return { text: 'Soloppgang / -nedgang', color: '#ff8040' };
    if (e < 20) return { text: 'Lav sol', color: '#ffa040' };
    if (e < 45) return { text: 'Middag-sol', color: '#ffd060' };
    return             { text: 'Høy sol (zenit)', color: '#ffe090' };
  }, [sun.elevation]);

  // ── Tab content ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{
          minHeight: 36,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.68rem', py: 0.5, color: 'rgba(255,255,255,0.5)' },
          '& .Mui-selected': { color: '#ffd060 !important' },
          '& .MuiTabs-indicator': { bgcolor: '#ffd060' },
        }}
      >
        <Tab icon={<WbSunny sx={{ fontSize: 14 }} />} iconPosition="start" label="Sol" />
        <Tab icon={<CloudQueue sx={{ fontSize: 14 }} />} iconPosition="start" label="Himmel" />
        <Tab icon={<Grain sx={{ fontSize: 14 }} />} iconPosition="start" label="Tåke" />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 1.5, pb: 2 }}>

        {/* ── TAB 0: Sun Position ────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <Stack spacing={2}>
            {/* Compass + elevation summary */}
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 2, p: 1.5, border: '1px solid rgba(255,200,0,0.15)' }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <CompassRose azimuth={sun.azimuth} elevation={sun.elevation} />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Asimut</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#ffd060' }}>
                        {sun.azimuth.toFixed(1)}°
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Høyde</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: elevLabel.color }}>
                        {sun.elevation.toFixed(1)}°
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={elevLabel.text}
                    size="small"
                    sx={{ mt: 0.75, fontSize: '0.62rem', height: 18, bgcolor: `${elevLabel.color}22`, color: elevLabel.color, border: `1px solid ${elevLabel.color}44`, '& .MuiChip-label': { px: 0.75 } }}
                  />
                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.75 }}>
                    <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>Sol</Typography>
                    <Switch
                      size="small"
                      checked={sun.enabled}
                      onChange={(_, v) => handleSunChange({ enabled: v })}
                      sx={{ '& .MuiSwitch-thumb': { bgcolor: sun.enabled ? '#ffd060' : '#666' }, '& .Mui-checked+.MuiSwitch-track': { bgcolor: '#ffd06080 !important' } }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* GPS Location */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <LocationOn sx={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    Sted
                  </Typography>
                </Stack>
                <Stack direction="row" gap={0.5} alignItems="center">
                  <FormControlLabel
                    label={<Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>Auto</Typography>}
                    control={
                      <Switch
                        size="small"
                        checked={autoSun}
                        onChange={(_, v) => setAutoSun(v)}
                        sx={{ '& .Mui-checked+.MuiSwitch-track': { bgcolor: '#ffd06080 !important' } }}
                      />
                    }
                    sx={{ mr: 0 }}
                  />
                  <Tooltip title="Beregn solposisjon nå">
                    <IconButton size="small" onClick={calcSun} sx={{ color: '#ffd060', width: 24, height: 24 }}>
                      <MyLocation sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* City quick select */}
              <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                {CITY_PRESETS.map(c => (
                  <Chip
                    key={c.name}
                    label={c.name.split(',')[0]}
                    size="small"
                    onClick={() => setLocation(prev => ({ ...prev, name: c.name, lat: c.lat, lng: c.lng }))}
                    sx={{
                      fontSize: '0.58rem', height: 18,
                      bgcolor: location.name === c.name ? 'rgba(255,208,0,0.2)' : 'rgba(255,255,255,0.06)',
                      color: location.name === c.name ? '#ffd060' : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${location.name === c.name ? 'rgba(255,208,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(255,208,0,0.1)' },
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" gap={1} sx={{ mb: 0.75 }}>
                <TextField
                  label="Breddegrad"
                  value={location.lat}
                  size="small"
                  type="number"
                  onChange={e => setLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) || 0 }))}
                  inputProps={{ step: 0.01, style: { fontSize: '0.75rem' } }}
                  sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: '0.7rem' }, '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                />
                <TextField
                  label="Lengdegrad"
                  value={location.lng}
                  size="small"
                  type="number"
                  onChange={e => setLocation(prev => ({ ...prev, lng: parseFloat(e.target.value) || 0 }))}
                  inputProps={{ step: 0.01, style: { fontSize: '0.75rem' } }}
                  sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: '0.7rem' }, '& .MuiOutlinedInput-root': { fontSize: '0.75rem' } }}
                />
              </Stack>

              <Stack direction="row" gap={1}>
                <TextField
                  label="Dato"
                  value={location.dateStr}
                  type="date"
                  size="small"
                  onChange={e => setLocation(prev => ({ ...prev, dateStr: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ style: { fontSize: '0.75rem' } }}
                  sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: '0.7rem' } }}
                />
                <TextField
                  label="Klokkeslett"
                  value={location.timeStr}
                  type="time"
                  size="small"
                  onChange={e => setLocation(prev => ({ ...prev, timeStr: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ style: { fontSize: '0.75rem' } }}
                  sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: '0.7rem' } }}
                />
              </Stack>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

            {/* Manual sun controls */}
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                Manuell justering
              </Typography>

              <Stack spacing={1.5}>
                <Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Asimut</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#ffd060' }}>{sun.azimuth.toFixed(0)}°</Typography>
                  </Stack>
                  <Slider value={sun.azimuth} min={0} max={360} step={1} size="small"
                    onChange={(_, v) => handleSunChange({ azimuth: typeof v === 'number' ? v : v[0] })}
                    sx={{ '& .MuiSlider-thumb': { bgcolor: '#ffd060', width: 12, height: 12 }, '& .MuiSlider-track': { bgcolor: '#ff9020' } }} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Høyde over horisont</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: elevLabel.color }}>{sun.elevation.toFixed(0)}°</Typography>
                  </Stack>
                  <Slider value={sun.elevation} min={-10} max={90} step={0.5} size="small"
                    onChange={(_, v) => handleSunChange({ elevation: typeof v === 'number' ? v : v[0] })}
                    sx={{ '& .MuiSlider-thumb': { bgcolor: '#ffd060', width: 12, height: 12 }, '& .MuiSlider-track': { bgcolor: '#ff9020' } }} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Sol-intensitet</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#ffd060' }}>{sun.intensity.toFixed(1)}</Typography>
                  </Stack>
                  <Slider value={sun.intensity} min={0} max={5} step={0.1} size="small"
                    onChange={(_, v) => handleSunChange({ intensity: typeof v === 'number' ? v : v[0] })}
                    sx={{ '& .MuiSlider-thumb': { bgcolor: '#ffd060', width: 12, height: 12 }, '& .MuiSlider-track': { bgcolor: '#ff9020' } }} />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">Fargetemperatur</Typography>
                    <Box sx={{ width: 20, height: 14, borderRadius: 0.5, bgcolor: sun.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                  </Stack>
                  <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
                    {['#ffd060', '#fff8e8', '#ffe090', '#ffa040', '#ffffff', '#c0d8ff'].map(c => (
                      <Box key={c} onClick={() => handleSunChange({ color: c })}
                        sx={{ width: 20, height: 16, borderRadius: 0.5, bgcolor: c, cursor: 'pointer', border: `2px solid ${sun.color === c ? '#fff' : 'transparent'}`, '&:hover': { opacity: 0.85 } }} />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ── TAB 1: Sky Presets ─────────────────────────────────────────────── */}
        {activeTab === 1 && (
          <Stack spacing={1.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block' }}>
              Velg et himmel-profil for å sette lysning, atmosfære og solfarge automatisk.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {SKY_PRESETS.map(preset => {
                const selected = selectedSky === preset.id;
                return (
                  <Box
                    key={preset.id}
                    onClick={() => handleSkySelect(preset.id)}
                    sx={{
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `2px solid ${selected ? '#ffd060' : 'rgba(255,255,255,0.08)'}`,
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: selected ? '#ffd060' : 'rgba(255,208,0,0.3)' },
                    }}
                  >
                    {/* Gradient sky swatch */}
                    <Box sx={{
                      height: 44,
                      background: `linear-gradient(180deg, ${preset.gradientFrom} 0%, ${preset.gradientTo} 100%)`,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-end',
                      px: 0.75,
                      pb: 0.4,
                    }}>
                      {preset.fogEnabled && (
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 0.5, px: 0.5, py: 0.1 }}>
                          <Typography sx={{ fontSize: '0.52rem', color: '#fff', lineHeight: 1.4 }}>TÅKE</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ px: 0.75, py: 0.5, bgcolor: 'rgba(0,0,0,0.4)' }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: selected ? 700 : 500, color: selected ? '#ffd060' : '#e0e0e0', lineHeight: 1.2 }}>
                        {preset.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.3, mt: 0.2 }}>
                        {preset.description}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Selected preset summary */}
            {selectedSky && (() => {
              const p = SKY_PRESETS.find(x => x.id === selectedSky);
              if (!p) return null;
              return (
                <Box sx={{ bgcolor: 'rgba(255,208,0,0.07)', border: '1px solid rgba(255,208,0,0.2)', borderRadius: 1.5, p: 1.25 }}>
                  <Stack direction="row" gap={1.5} flexWrap="wrap">
                    {[
                      { label: 'Amb. int.', value: p.ambientIntensity.toFixed(2) },
                      { label: 'Sol int.', value: p.sunIntensity.toFixed(1) },
                      { label: 'Tåke', value: p.fogEnabled ? `${(p.fogDensity * 1000).toFixed(1)}‰` : 'Av' },
                    ].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>{label}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffd060', fontFamily: 'monospace' }}>{value}</Typography>
                      </Box>
                    ))}
                    <Box>
                      <Typography sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>Himmel</Typography>
                      <Box sx={{ width: 20, height: 14, borderRadius: 0.5, bgcolor: p.clearColor, border: '1px solid rgba(255,255,255,0.2)', mt: 0.25 }} />
                    </Box>
                  </Stack>
                </Box>
              );
            })()}
          </Stack>
        )}

        {/* ── TAB 2: Fog & Atmosphere ────────────────────────────────────────── */}
        {activeTab === 2 && (
          <Stack spacing={2}>
            {/* Fog toggle */}
            <Box sx={{ bgcolor: fog.enabled ? 'rgba(100,160,255,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${fog.enabled ? 'rgba(100,160,255,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 1.5, p: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <Grain sx={{ fontSize: 16, color: fog.enabled ? '#90caf9' : 'rgba(255,255,255,0.3)' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: fog.enabled ? '#90caf9' : 'rgba(255,255,255,0.5)' }}>
                    Tåke aktivert
                  </Typography>
                </Stack>
                <Switch size="small" checked={fog.enabled} onChange={(_, v) => handleFogChange({ enabled: v })}
                  sx={{ '& .Mui-checked+.MuiSwitch-track': { bgcolor: '#4090ff80 !important' } }} />
              </Stack>
            </Box>

            {/* Fog mode */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, display: 'block', mb: 0.75 }}>Tåketype</Typography>
              <Stack direction="row" gap={0.75}>
                {([['exp2', 'Eksponentiell'], ['linear', 'Lineær']] as [string, string][]).map(([id, label]) => (
                  <Chip key={id} label={label} size="small"
                    onClick={() => handleFogChange({ mode: id as 'exp2' | 'linear' })}
                    sx={{
                      fontSize: '0.65rem', height: 22,
                      bgcolor: fog.mode === id ? 'rgba(100,160,255,0.25)' : 'rgba(255,255,255,0.06)',
                      color: fog.mode === id ? '#90caf9' : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${fog.mode === id ? 'rgba(100,160,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer', '&:hover': { bgcolor: 'rgba(100,160,255,0.15)' },
                      '& .MuiChip-label': { px: 1 },
                    }} />
                ))}
              </Stack>
            </Box>

            {/* Density or start/end */}
            {fog.mode === 'exp2' ? (
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Tetthet</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#90caf9' }}>{fog.density.toFixed(4)}</Typography>
                </Stack>
                <Slider value={fog.density} min={0.0001} max={0.05} step={0.0001} size="small"
                  onChange={(_, v) => handleFogChange({ density: typeof v === 'number' ? v : v[0] })}
                  sx={{ '& .MuiSlider-thumb': { bgcolor: '#90caf9', width: 12, height: 12 }, '& .MuiSlider-track': { bgcolor: '#4090ff' } }} />
                <Stack direction="row" gap={0.5} sx={{ mt: 0.5 }}>
                  {[[0.001, 'Lett'], [0.005, 'Moderat'], [0.015, 'Tett'], [0.035, 'Tykk']].map(([v, label]) => (
                    <Chip key={String(v)} label={String(label)} size="small"
                      onClick={() => handleFogChange({ density: v as number })}
                      sx={{ fontSize: '0.58rem', height: 18, bgcolor: 'rgba(64,144,255,0.1)', color: '#90caf9', border: '1px solid rgba(64,144,255,0.2)', cursor: 'pointer', '& .MuiChip-label': { px: 0.75 } }} />
                  ))}
                </Stack>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Tåke start (m)</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#90caf9' }}>{fog.start} m</Typography>
                  </Stack>
                  <Slider value={fog.start} min={0} max={50} step={1} size="small"
                    onChange={(_, v) => handleFogChange({ start: typeof v === 'number' ? v : v[0] })}
                    sx={{ '& .MuiSlider-thumb': { bgcolor: '#90caf9', width: 12, height: 12 }, '& .MuiSlider-track': { bgcolor: '#4090ff' } }} />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Tåke slutt (m)</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#90caf9' }}>{fog.end} m</Typography>
                  </Stack>
                  <Slider value={fog.end} min={10} max={200} step={5} size="small"
                    onChange={(_, v) => handleFogChange({ end: typeof v === 'number' ? v : v[0] })}
                    sx={{ '& .MuiSlider-thumb': { bgcolor: '#90caf9', width: 12, height: 12 }, '& .MuiSlider-track': { bgcolor: '#4090ff' } }} />
                </Box>
              </Stack>
            )}

            {/* Fog colour */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Tåkefarge</Typography>
                <Box sx={{ width: 20, height: 14, borderRadius: 0.5, bgcolor: fog.color, border: '1px solid rgba(255,255,255,0.2)' }} />
              </Stack>
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {['#c0c8d0', '#d4e8f0', '#e8c8a0', '#1a2a4a', '#909898', '#f0f0f0', '#08102a'].map(c => (
                  <Box key={c} onClick={() => handleFogChange({ color: c })}
                    sx={{ width: 22, height: 16, borderRadius: 0.5, bgcolor: c, cursor: 'pointer', border: `2px solid ${fog.color === c ? '#90caf9' : 'transparent'}`, '&:hover': { opacity: 0.8 } }} />
                ))}
              </Stack>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

            {/* Atmosphere presets */}
            <Box>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                Hurtig-stemning
              </Typography>
              <Stack spacing={0.75}>
                {[
                  { label: 'Ingen tåke',    enabled: false, density: 0, color: '#c0c8d0' },
                  { label: 'Morgendugg',    enabled: true, density: 0.004, color: '#d4e8f0' },
                  { label: 'Kystdis',       enabled: true, density: 0.008, color: '#c0c8d8' },
                  { label: 'Skogtåke',      enabled: true, density: 0.015, color: '#b0c8a0' },
                  { label: 'Tykk havtåke', enabled: true, density: 0.030, color: '#c8c8c8' },
                  { label: 'Natt-dis',      enabled: true, density: 0.006, color: '#08102a' },
                ].map(atm => (
                  <Box key={atm.label}
                    onClick={() => handleFogChange({ enabled: atm.enabled, density: atm.density, color: atm.color })}
                    sx={{
                      px: 1.25, py: 0.75, borderRadius: 1, cursor: 'pointer',
                      bgcolor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', gap: 1,
                      '&:hover': { bgcolor: 'rgba(64,144,255,0.1)', borderColor: 'rgba(64,144,255,0.25)' },
                    }}
                  >
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: atm.color, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{atm.label}</Typography>
                    {atm.enabled && (
                      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', ml: 'auto', fontFamily: 'monospace' }}>
                        {(atm.density * 1000).toFixed(1)}‰
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

      </Box>
    </Box>
  );
}
