/**
 * CinematicEvaluationPanel — Kinematisk evalueringspanel
 *
 * Tabs: Kamera · LUT · Falskfarge · Optikk
 * Fires: vs-camera-settings · vs-lut-preview · vs-false-color · vs-anamorphic
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Stack,
  Typography,
  Slider,
  Switch,
  Divider,
  Tooltip,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CameraAlt,
  Videocam,
  Palette,
  Visibility,
  Lens,
  Circle,
} from '@mui/icons-material';

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraMode = 'photo' | 'film';
type AnamorphicSqueeze = 1 | 1.33 | 1.5 | 2;

interface PhotoSettings {
  sensor: string;
  format: string;
  focalLength: number;
  iso: number;
  aperture: number;
  shutterSpeed: string;
  whiteBalance: number;
  bw: boolean;
  orientation: 'landscape' | 'portrait';
  manualFocus: boolean;
  focusDistance: number;
}

interface FilmSettings {
  sensor: string;
  format: string;
  focalLength: number;
  iso: number;
  aperture: number;
  ndFilter: number;
  shutterAngle: number;
  framerate: number;
  whiteBalance: number;
  bw: boolean;
  anamorphic: AnamorphicSqueeze;
}

interface LutPreset {
  id: string;
  name: string;
  nameEN: string;
  swatch: string;
  contrast: number;
  exposure: number;
  saturation: number;
  shadowsHue: number;
  shadowsDensity: number;
  highlightsHue: number;
  highlightsDensity: number;
  midtonesHue: number;
  midtonesDensity: number;
  vignette: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SENSORS_PHOTO = ['Full Frame', 'APS-C', 'APS-C (Canon)', 'Micro 4/3', 'Medium Format'];
const SENSORS_FILM  = ['Full Frame', 'Super 35', 'Super 35 4K', 'Large Format', 'Vista Vision', 'S35 Anamorfisk'];
const FORMATS_PHOTO = ['3:2', '4:3', '1:1', '16:9', '4:5'];
const FORMATS_FILM  = ['16:9', '17:9 (2K)', '2.39:1', '2.35:1', '1.85:1', '4:3 Anamorfisk'];
const SHUTTER_SPEEDS = ['1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8'];
const ND_STOPS = [0, 1, 2, 3, 4, 6, 8, 10];
const FRAMERATES = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120];
const APERTURES  = [1, 1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const ISO_VALUES = [100, 200, 400, 800, 1600, 3200, 6400, 12800];

const LUT_PRESETS: LutPreset[] = [
  {
    id: 'neutral',    name: 'Nøytral',         nameEN: 'Neutral',
    swatch: '#8899aa',
    contrast: 1.0, exposure: 1.0, saturation: 100,
    shadowsHue: 0, shadowsDensity: 0, highlightsHue: 0, highlightsDensity: 0,
    midtonesHue: 0, midtonesDensity: 0, vignette: 0,
  },
  {
    id: 'dark_somber', name: 'Mørk & Sørgmodig', nameEN: 'Dark and Somber',
    swatch: '#223344',
    contrast: 1.5, exposure: 0.65, saturation: 55,
    shadowsHue: 218, shadowsDensity: 22, highlightsHue: 200, highlightsDensity: 8,
    midtonesHue: 210, midtonesDensity: 5, vignette: 0.55,
  },
  {
    id: 'magic_hour',  name: 'Magisk Time',      nameEN: 'Magic Hour',
    swatch: '#c06020',
    contrast: 1.15, exposure: 1.25, saturation: 130,
    shadowsHue: 28, shadowsDensity: 18, highlightsHue: 35, highlightsDensity: 22,
    midtonesHue: 30, midtonesDensity: 10, vignette: 0.25,
  },
  {
    id: 'cold_chrome', name: 'Kald Krom',         nameEN: 'Cold Chrome',
    swatch: '#99aabb',
    contrast: 1.35, exposure: 0.85, saturation: 35,
    shadowsHue: 200, shadowsDensity: 12, highlightsHue: 195, highlightsDensity: 6,
    midtonesHue: 198, midtonesDensity: 4, vignette: 0.3,
  },
  {
    id: 'teal_orange', name: 'Teal & Oransje',    nameEN: 'Teal & Orange',
    swatch: '#338877',
    contrast: 1.25, exposure: 1.05, saturation: 115,
    shadowsHue: 185, shadowsDensity: 20, highlightsHue: 28, highlightsDensity: 25,
    midtonesHue: 0, midtonesDensity: 0, vignette: 0.2,
  },
  {
    id: 'filmlook',    name: 'Klassisk Film',     nameEN: 'Classic Film',
    swatch: '#997755',
    contrast: 1.18, exposure: 0.98, saturation: 78,
    shadowsHue: 35, shadowsDensity: 10, highlightsHue: 45, highlightsDensity: 8,
    midtonesHue: 0, midtonesDensity: 0, vignette: 0.35,
  },
  {
    id: 'bleach',      name: 'Bleach Bypass',     nameEN: 'Bleach Bypass',
    swatch: '#667788',
    contrast: 1.6, exposure: 0.9, saturation: 22,
    shadowsHue: 0, shadowsDensity: 0, highlightsHue: 0, highlightsDensity: 0,
    midtonesHue: 0, midtonesDensity: 0, vignette: 0.42,
  },
  {
    id: 'green_night', name: 'Grønn Natt',        nameEN: 'Green Night',
    swatch: '#224433',
    contrast: 1.28, exposure: 0.7, saturation: 45,
    shadowsHue: 140, shadowsDensity: 18, highlightsHue: 145, highlightsDensity: 10,
    midtonesHue: 140, midtonesDensity: 8, vignette: 0.5,
  },
];

const FALSE_COLOR_LEGEND = [
  { label: 'Klippet HL',   color: '#e53935', range: '> 90%' },
  { label: 'Høylys',       color: '#fb8c00', range: '70–90%' },
  { label: 'Åpne HL',      color: '#fdd835', range: '52–70%' },
  { label: 'Midtoner',     color: '#78909c', range: '42–52%' },
  { label: 'Lave midter',  color: '#43a047', range: '20–42%' },
  { label: 'Skygger',      color: '#1e88e5', range: '5–20%' },
  { label: 'Klippet skygge', color: '#6a1b9a', range: '< 5%' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{
      fontWeight: 700,
      fontSize: '0.63rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.38)',
      display: 'block',
      mb: 0.75,
      mt: 1.5,
    }}>
      {children}
    </Typography>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 30 }}>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', flexShrink: 0, mr: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {children}
      </Box>
    </Stack>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#90caf9', fontSize: '0.72rem' }}>
      {children}
    </Typography>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CinematicEvaluationPanel() {
  const [tab, setTab] = useState(0);
  const TABS = ['Kamera', 'LUT', 'Falskfarge', 'Optikk'];

  // Camera tab state
  const [mode, setMode] = useState<CameraMode>('photo');

  const [photo, setPhoto] = useState<PhotoSettings>({
    sensor: 'Full Frame', format: '3:2', focalLength: 35,
    iso: 400, aperture: 8, shutterSpeed: '1/125',
    whiteBalance: 5500, bw: false,
    orientation: 'landscape', manualFocus: false, focusDistance: 1,
  });

  const [film, setFilm] = useState<FilmSettings>({
    sensor: 'Super 35', format: '2.39:1', focalLength: 32,
    iso: 800, aperture: 2.8, ndFilter: 0,
    shutterAngle: 180, framerate: 24,
    whiteBalance: 5600, bw: false, anamorphic: 1,
  });

  // LUT tab state
  const [activeLut, setActiveLut] = useState<string>('neutral');
  const [lutIntensity, setLutIntensity] = useState(1.0);

  // False color tab state
  const [falseColorEnabled, setFalseColorEnabled] = useState(false);

  // Optics tab state
  const [anamorphicEnabled, setAnamorphicEnabled] = useState(false);
  const [anamorphicSqueeze, setAnamorphicSqueeze] = useState<AnamorphicSqueeze>(2);
  const [lensDistortion, setLensDistortion] = useState(0);

  // ── Dispatch helpers ──────────────────────────────────────────────────────

  const dispatchCamera = useCallback((p: PhotoSettings, f: FilmSettings, m: CameraMode) => {
    window.dispatchEvent(new CustomEvent('vs-camera-settings', {
      detail: { mode: m, photo: p, film: f },
    }));
  }, []);

  const dispatchLut = useCallback((id: string, intensity: number) => {
    const preset = LUT_PRESETS.find(l => l.id === id);
    if (!preset) return;
    window.dispatchEvent(new CustomEvent('vs-lut-preview', {
      detail: { ...preset, intensity },
    }));
  }, []);

  const dispatchFalseColor = useCallback((enabled: boolean) => {
    window.dispatchEvent(new CustomEvent('vs-false-color', { detail: { enabled } }));
  }, []);

  const dispatchAnamorphic = useCallback((enabled: boolean, squeezeRatio: number, distortion: number) => {
    window.dispatchEvent(new CustomEvent('vs-anamorphic', { detail: { enabled, squeezeRatio, distortion } }));
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const setPhotoField = <K extends keyof PhotoSettings>(k: K, v: PhotoSettings[K]) => {
    const next = { ...photo, [k]: v };
    setPhoto(next);
    dispatchCamera(next, film, mode);
  };

  const setFilmField = <K extends keyof FilmSettings>(k: K, v: FilmSettings[K]) => {
    const next = { ...film, [k]: v };
    setFilm(next);
    dispatchCamera(photo, next, mode);
  };

  const handleModeChange = (_: React.MouseEvent, m: CameraMode | null) => {
    if (!m) return;
    setMode(m);
    dispatchCamera(photo, film, m);
  };

  const handleLutSelect = (id: string) => {
    setActiveLut(id);
    dispatchLut(id, lutIntensity);
  };

  const handleLutIntensity = (_: Event, v: number | number[]) => {
    const val = Array.isArray(v) ? v[0] : v;
    setLutIntensity(val);
    dispatchLut(activeLut, val);
  };

  const handleFalseColor = (v: boolean) => {
    setFalseColorEnabled(v);
    dispatchFalseColor(v);
  };

  const handleAnamorphicToggle = (v: boolean) => {
    setAnamorphicEnabled(v);
    dispatchAnamorphic(v, anamorphicSqueeze, lensDistortion);
  };

  const handleAnamorphicSqueeze = (v: AnamorphicSqueeze) => {
    setAnamorphicSqueeze(v);
    dispatchAnamorphic(anamorphicEnabled, v, lensDistortion);
  };

  const handleLensDistortion = (_: Event, v: number | number[]) => {
    const val = Array.isArray(v) ? v[0] : v;
    setLensDistortion(val);
    dispatchAnamorphic(anamorphicEnabled, anamorphicSqueeze, val);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const shutterExposure = film.shutterAngle / (360 * film.framerate);
  const exposureTime = shutterExposure < 1
    ? `1/${Math.round(1 / shutterExposure)}`
    : shutterExposure.toFixed(2) + 's';

  const ev = Math.log2((film.aperture * film.aperture) / shutterExposure) - Math.log2(film.iso / 100);
  const evColor = ev < 0 ? '#ef5350' : ev > 16 ? '#ff9800' : '#66bb6a';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(8,14,22,0.0)', overflow: 'hidden' }}>

      {/* Tab bar */}
      <Stack direction="row" sx={{ px: 1, pt: 0.75, pb: 0, flexShrink: 0, gap: 0.25 }}>
        {TABS.map((t, i) => (
          <Box
            key={t}
            onClick={() => setTab(i)}
            sx={{
              flex: 1, textAlign: 'center', py: 0.75, cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.04em',
              userSelect: 'none',
              color: tab === i ? '#90caf9' : 'rgba(255,255,255,0.4)',
              bgcolor: tab === i ? 'rgba(33,150,243,0.14)' : 'transparent',
              borderBottom: tab === i ? '2px solid #2196f3' : '2px solid transparent',
              transition: 'all 0.15s',
              '&:hover': { color: 'rgba(255,255,255,0.75)' },
            }}
          >
            {t.toUpperCase()}
          </Box>
        ))}
      </Stack>
      <Divider sx={{ borderColor: 'rgba(33,150,243,0.15)', flexShrink: 0 }} />

      {/* Tab content */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2 },
      }}>

        {/* ── Tab 0: Camera ── */}
        {tab === 0 && (
          <Box>
            {/* Photo / Film toggle */}
            <Box sx={{ mt: 1.25, mb: 1.5 }}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                size="small"
                sx={{ width: '100%', '& .MuiToggleButton-root': {
                  flex: 1, py: 0.6, fontSize: '0.68rem', fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(33,150,243,0.25)',
                  '&.Mui-selected': { bgcolor: 'rgba(33,150,243,0.2)', color: '#90caf9' },
                }}}
              >
                <ToggleButton value="photo">
                  <CameraAlt sx={{ fontSize: 14, mr: 0.5 }} /> Foto
                </ToggleButton>
                <ToggleButton value="film">
                  <Videocam sx={{ fontSize: 14, mr: 0.5 }} /> Film
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* EV indicator (film mode) */}
            {mode === 'film' && (
              <Box sx={{ mb: 1.25, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>
                    Eksponeringsverdi
                  </Typography>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: evColor, fontWeight: 700 }}>
                      EV {ev.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                      {exposureTime}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}

            <SectionLabel>Sensor & Format</SectionLabel>
            <Stack spacing={0.5}>
              <Row label="Sensor">
                <Select
                  value={mode === 'photo' ? photo.sensor : film.sensor}
                  onChange={e => mode === 'photo'
                    ? setPhotoField('sensor', e.target.value)
                    : setFilmField('sensor', e.target.value)}
                  size="small"
                  sx={selectSx}
                >
                  {(mode === 'photo' ? SENSORS_PHOTO : SENSORS_FILM).map(s => (
                    <MenuItem key={s} value={s} sx={{ fontSize: '0.72rem' }}>{s}</MenuItem>
                  ))}
                </Select>
              </Row>

              <Row label="Format">
                <Select
                  value={mode === 'photo' ? photo.format : film.format}
                  onChange={e => mode === 'photo'
                    ? setPhotoField('format', e.target.value)
                    : setFilmField('format', e.target.value)}
                  size="small" sx={selectSx}
                >
                  {(mode === 'photo' ? FORMATS_PHOTO : FORMATS_FILM).map(f => (
                    <MenuItem key={f} value={f} sx={{ fontSize: '0.72rem' }}>{f}</MenuItem>
                  ))}
                </Select>
              </Row>

              <Row label="Brennvidde">
                <Select
                  value={mode === 'photo' ? photo.focalLength : film.focalLength}
                  onChange={e => {
                    const v = Number(e.target.value);
                    mode === 'photo' ? setPhotoField('focalLength', v) : setFilmField('focalLength', v);
                  }}
                  size="small" sx={selectSx}
                >
                  {[16,24,28,32,35,40,50,65,85,100,135,200].map(f => (
                    <MenuItem key={f} value={f} sx={{ fontSize: '0.72rem' }}>{f} mm</MenuItem>
                  ))}
                </Select>
              </Row>

              {mode === 'film' && (
                <Row label="Anamorfisk">
                  <Select
                    value={film.anamorphic}
                    onChange={e => setFilmField('anamorphic', Number(e.target.value) as AnamorphicSqueeze)}
                    size="small" sx={selectSx}
                  >
                    <MenuItem value={1} sx={{ fontSize: '0.72rem' }}>Normal (1×)</MenuItem>
                    <MenuItem value={1.33} sx={{ fontSize: '0.72rem' }}>1.33× (4:3 out)</MenuItem>
                    <MenuItem value={1.5} sx={{ fontSize: '0.72rem' }}>1.5× Deluxe</MenuItem>
                    <MenuItem value={2} sx={{ fontSize: '0.72rem' }}>2× Anamorfisk</MenuItem>
                  </Select>
                </Row>
              )}
            </Stack>

            <SectionLabel>Eksponering</SectionLabel>
            <Stack spacing={0.5}>
              <Row label="ISO">
                <Select
                  value={mode === 'photo' ? photo.iso : film.iso}
                  onChange={e => {
                    const v = Number(e.target.value);
                    mode === 'photo' ? setPhotoField('iso', v) : setFilmField('iso', v);
                  }}
                  size="small" sx={selectSx}
                >
                  {ISO_VALUES.map(v => (
                    <MenuItem key={v} value={v} sx={{ fontSize: '0.72rem' }}>ISO {v}</MenuItem>
                  ))}
                </Select>
              </Row>

              <Row label="Blender">
                <Select
                  value={mode === 'photo' ? photo.aperture : film.aperture}
                  onChange={e => {
                    const v = Number(e.target.value);
                    mode === 'photo' ? setPhotoField('aperture', v) : setFilmField('aperture', v);
                  }}
                  size="small" sx={selectSx}
                >
                  {APERTURES.map(a => (
                    <MenuItem key={a} value={a} sx={{ fontSize: '0.72rem' }}>f/{a}</MenuItem>
                  ))}
                </Select>
              </Row>

              {mode === 'film' ? (
                <>
                  <Row label="ND-filter">
                    <Select
                      value={film.ndFilter}
                      onChange={e => setFilmField('ndFilter', Number(e.target.value))}
                      size="small" sx={selectSx}
                    >
                      {ND_STOPS.map(n => (
                        <MenuItem key={n} value={n} sx={{ fontSize: '0.72rem' }}>
                          {n === 0 ? 'ND 0 (Ingen)' : `ND ${n} (${Math.pow(2, n)}×)`}
                        </MenuItem>
                      ))}
                    </Select>
                  </Row>
                  <Row label="Lukkervinkel">
                    <Stack direction="row" gap={0.5} alignItems="center">
                      <Val>{film.shutterAngle.toFixed(0)}°</Val>
                      <Slider
                        value={film.shutterAngle}
                        min={11.25} max={360} step={11.25}
                        onChange={(_, v) => setFilmField('shutterAngle', typeof v === 'number' ? v : v[0])}
                        size="small" sx={{ width: 70, ...sliderSx }}
                      />
                    </Stack>
                  </Row>
                  <Row label="Bildefrekvens">
                    <Select
                      value={film.framerate}
                      onChange={e => setFilmField('framerate', Number(e.target.value))}
                      size="small" sx={selectSx}
                    >
                      {FRAMERATES.map(f => (
                        <MenuItem key={f} value={f} sx={{ fontSize: '0.72rem' }}>{f} fps</MenuItem>
                      ))}
                    </Select>
                  </Row>
                </>
              ) : (
                <Row label="Lukkerhastighet">
                  <Select
                    value={photo.shutterSpeed}
                    onChange={e => setPhotoField('shutterSpeed', e.target.value)}
                    size="small" sx={selectSx}
                  >
                    {SHUTTER_SPEEDS.map(s => (
                      <MenuItem key={s} value={s} sx={{ fontSize: '0.72rem' }}>{s} s</MenuItem>
                    ))}
                  </Select>
                </Row>
              )}
            </Stack>

            <SectionLabel>Utseende</SectionLabel>
            <Stack spacing={0.5}>
              <Row label="Hvitbalanse">
                <Stack direction="row" gap={0.75} alignItems="center">
                  <Val>{mode === 'photo' ? photo.whiteBalance : film.whiteBalance} K</Val>
                  <Slider
                    value={mode === 'photo' ? photo.whiteBalance : film.whiteBalance}
                    min={2000} max={10000} step={100}
                    onChange={(_, v) => {
                      const val = typeof v === 'number' ? v : v[0];
                      mode === 'photo' ? setPhotoField('whiteBalance', val) : setFilmField('whiteBalance', val);
                    }}
                    size="small"
                    sx={{
                      width: 70,
                      '& .MuiSlider-thumb': { bgcolor: '#ffcc80' },
                      '& .MuiSlider-track': { background: 'linear-gradient(90deg, #6ab0f5, #ffd280, #ff8c40)' },
                      '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.12)' },
                    }}
                  />
                </Stack>
              </Row>

              <Row label="Sort/hvit">
                <Switch
                  size="small"
                  checked={mode === 'photo' ? photo.bw : film.bw}
                  onChange={e => mode === 'photo'
                    ? setPhotoField('bw', e.target.checked)
                    : setFilmField('bw', e.target.checked)}
                  sx={switchSx}
                />
              </Row>

              {mode === 'photo' && (
                <>
                  <Row label="Orientering">
                    <ToggleButtonGroup
                      value={photo.orientation} exclusive size="small"
                      onChange={(_, v) => v && setPhotoField('orientation', v)}
                      sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 0.75, fontSize: '0.62rem', border: '1px solid rgba(33,150,243,0.25)', '&.Mui-selected': { bgcolor: 'rgba(33,150,243,0.2)', color: '#90caf9' }, color: 'rgba(255,255,255,0.5)' } }}
                    >
                      <ToggleButton value="landscape">Liggende</ToggleButton>
                      <ToggleButton value="portrait">Stående</ToggleButton>
                    </ToggleButtonGroup>
                  </Row>
                  <Row label="Manuelt fokus">
                    <Switch
                      size="small" checked={photo.manualFocus}
                      onChange={e => setPhotoField('manualFocus', e.target.checked)}
                      sx={switchSx}
                    />
                  </Row>
                  {photo.manualFocus && (
                    <Row label="Fokusavstand">
                      <Stack direction="row" gap={0.5} alignItems="center">
                        <Val>{photo.focusDistance.toFixed(1)} m</Val>
                        <Slider
                          value={photo.focusDistance}
                          min={0.3} max={30} step={0.1}
                          onChange={(_, v) => setPhotoField('focusDistance', typeof v === 'number' ? v : v[0])}
                          size="small" sx={{ width: 70, ...sliderSx }}
                        />
                      </Stack>
                    </Row>
                  )}
                </>
              )}
            </Stack>

            {/* Quick presets */}
            <SectionLabel>Hurtigvalg</SectionLabel>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {(mode === 'photo' ? [
                { label: 'Portrett', iso: 200, aperture: 1.8, shutter: '1/250' },
                { label: 'Studio', iso: 100, aperture: 8, shutter: '1/125' },
                { label: 'Konsert', iso: 3200, aperture: 2, shutter: '1/250' },
                { label: 'Landskap', iso: 100, aperture: 11, shutter: '1/60' },
              ] : [
                { label: 'Nattscene',  iso: 3200, aperture: 1.4, angle: 180, fps: 24 },
                { label: 'Action',     iso: 800,  aperture: 2.8, angle: 90,  fps: 48 },
                { label: 'Drama',      iso: 400,  aperture: 2.8, angle: 180, fps: 24 },
                { label: 'Dokumentar', iso: 800,  aperture: 5.6, angle: 180, fps: 25 },
              ]).map((p: Record<string, unknown>) => (
                <Chip
                  key={p.label as string} label={p.label as string} size="small"
                  onClick={() => {
                    if (mode === 'photo') {
                      const next = { ...photo, iso: p.iso as number, aperture: p.aperture as number, shutterSpeed: p.shutter as string };
                      setPhoto(next); dispatchCamera(next, film, mode);
                    } else {
                      const next = { ...film, iso: p.iso as number, aperture: p.aperture as number, shutterAngle: p.angle as number, framerate: p.fps as number };
                      setFilm(next); dispatchCamera(photo, next, mode);
                    }
                  }}
                  sx={{
                    height: 20, fontSize: '0.62rem', cursor: 'pointer',
                    bgcolor: 'rgba(33,150,243,0.12)', color: '#90caf9',
                    border: '1px solid rgba(33,150,243,0.22)',
                    '&:hover': { bgcolor: 'rgba(33,150,243,0.25)' },
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* ── Tab 1: LUT ── */}
        {tab === 1 && (
          <Box>
            <Box sx={{ mt: 1.25, mb: 1, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', display: 'block', mb: 0.75 }}>
                LUT-simulering (ImageProcessing)
              </Typography>
              <Stack direction="row" alignItems="center" gap={1}>
                <Palette sx={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, flex: 1 }}>
                  {LUT_PRESETS.find(l => l.id === activeLut)?.name ?? '—'}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#90caf9' }}>
                  {Math.round(lutIntensity * 100)}%
                </Typography>
              </Stack>
              <Slider
                value={lutIntensity}
                min={0} max={1} step={0.01}
                onChange={handleLutIntensity}
                size="small"
                sx={{ mt: 0.75, ...sliderSx }}
              />
            </Box>

            {/* LUT grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mt: 1 }}>
              {LUT_PRESETS.map(lut => (
                <Box
                  key={lut.id}
                  onClick={() => handleLutSelect(lut.id)}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    border: activeLut === lut.id
                      ? '1.5px solid #2196f3'
                      : '1.5px solid rgba(255,255,255,0.07)',
                    bgcolor: activeLut === lut.id ? 'rgba(33,150,243,0.12)' : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.15s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <Stack direction="row" gap={0.75} alignItems="center">
                    {/* Swatch sphere */}
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: `radial-gradient(circle at 38% 38%, ${lut.swatch}dd, ${lut.swatch}55 60%, #111 100%)`,
                      border: '1px solid rgba(255,255,255,0.12)',
                    }} />
                    <Box>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600, color: activeLut === lut.id ? '#90caf9' : 'rgba(255,255,255,0.8)', display: 'block', lineHeight: 1.2 }}>
                        {lut.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', display: 'block' }}>
                        {lut.nameEN}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>

            {/* Tone info */}
            {activeLut !== 'neutral' && (() => {
              const p = LUT_PRESETS.find(l => l.id === activeLut)!;
              return (
                <Box sx={{ mt: 1.25, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    <Chip size="small" label={`Kontrast ×${p.contrast.toFixed(2)}`} sx={infoBadgeSx} />
                    <Chip size="small" label={`Eksponering ×${p.exposure.toFixed(2)}`} sx={infoBadgeSx} />
                    <Chip size="small" label={`Metning ${p.saturation}%`} sx={infoBadgeSx} />
                    {p.vignette > 0 && <Chip size="small" label={`Vignett ${(p.vignette * 100).toFixed(0)}%`} sx={infoBadgeSx} />}
                  </Stack>
                </Box>
              );
            })()}
          </Box>
        )}

        {/* ── Tab 2: False color ── */}
        {tab === 2 && (
          <Box>
            <Box sx={{ mt: 1.25, p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', display: 'block' }}>
                    Falsk-farge eksponering
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.63rem' }}>
                    ARRI-stil luminanskart
                  </Typography>
                </Box>
                <Switch
                  checked={falseColorEnabled}
                  onChange={e => handleFalseColor(e.target.checked)}
                  sx={switchSx}
                />
              </Stack>
            </Box>

            {/* Legend */}
            <SectionLabel>Eksponeringssoner</SectionLabel>
            <Stack spacing={0.5}>
              {FALSE_COLOR_LEGEND.map(z => (
                <Stack key={z.label} direction="row" alignItems="center" gap={1}>
                  <Box sx={{
                    width: 18, height: 12, borderRadius: 0.75, flexShrink: 0,
                    bgcolor: z.color, border: '1px solid rgba(255,255,255,0.12)',
                  }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', flex: 1 }}>
                    {z.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', fontSize: '0.63rem' }}>
                    {z.range}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            {falseColorEnabled && (
              <Box sx={{ mt: 1.5, p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,200,50,0.08)', border: '1px solid rgba(255,200,50,0.2)' }}>
                <Typography variant="caption" sx={{ color: '#fdd835', fontSize: '0.68rem' }}>
                  Aktiv — 3D-visningen viser eksponeringskart.
                  Grå midtoner er korrekt eksponert.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* ── Tab 3: Optics ── */}
        {tab === 3 && (
          <Box>
            {/* Anamorphic */}
            <SectionLabel>Anamorfisk simulering</SectionLabel>
            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', mb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem' }}>
                  Aktiver anamorfisk
                </Typography>
                <Switch
                  checked={anamorphicEnabled}
                  onChange={e => handleAnamorphicToggle(e.target.checked)}
                  sx={switchSx}
                />
              </Stack>

              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', display: 'block', mb: 0.75 }}>
                Klemmeforhold
              </Typography>
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {([1, 1.33, 1.5, 2] as AnamorphicSqueeze[]).map(r => (
                  <Chip
                    key={r} label={r === 1 ? 'Normal' : `${r}×`}
                    size="small"
                    onClick={() => handleAnamorphicSqueeze(r)}
                    sx={{
                      height: 22, fontSize: '0.65rem', cursor: 'pointer',
                      bgcolor: anamorphicSqueeze === r ? 'rgba(33,150,243,0.25)' : 'rgba(255,255,255,0.05)',
                      color: anamorphicSqueeze === r ? '#90caf9' : 'rgba(255,255,255,0.55)',
                      border: anamorphicSqueeze === r ? '1px solid rgba(33,150,243,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      '& .MuiChip-label': { px: 0.85 },
                    }}
                  />
                ))}
              </Stack>

              {anamorphicEnabled && (
                <Box sx={{ mt: 1.25, p: 1, borderRadius: 1, bgcolor: 'rgba(33,150,243,0.07)', border: '1px solid rgba(33,150,243,0.15)' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#90caf9' }}>
                    {anamorphicSqueeze}× klem → horisontalt strukket billede simulert i viewport.
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Lens distortion */}
            <SectionLabel>Linsedistorsjon</SectionLabel>
            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>
                  Bøyning
                </Typography>
                <Val>{lensDistortion > 0 ? '+' : ''}{lensDistortion.toFixed(1)}%</Val>
              </Stack>
              <Slider
                value={lensDistortion}
                min={-30} max={30} step={0.5}
                onChange={handleLensDistortion}
                size="small"
                sx={sliderSx}
              />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Tonneformet</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>Pute</Typography>
              </Stack>

              {/* Preset distortion chips */}
              <Stack direction="row" gap={0.5} sx={{ mt: 0.75 }} flexWrap="wrap">
                {[
                  { label: 'Anamorfisk',  val: -8 },
                  { label: 'Fisheye',     val: 25 },
                  { label: 'Nøytral',     val: 0  },
                  { label: 'Telephoto',   val: 2  },
                ].map(p => (
                  <Chip
                    key={p.label} label={p.label} size="small"
                    onClick={() => {
                      setLensDistortion(p.val);
                      dispatchAnamorphic(anamorphicEnabled, anamorphicSqueeze, p.val);
                    }}
                    sx={{
                      height: 20, fontSize: '0.62rem', cursor: 'pointer',
                      bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                      '& .MuiChip-label': { px: 0.85 },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Vignette info */}
            <SectionLabel>Vignett</SectionLabel>
            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem' }}>
                Vignett styres av aktiv LUT-forhåndsvisning. Velg en LUT i fanen &quot;LUT&quot; for vignett-kontroll.
              </Typography>
            </Box>
          </Box>
        )}

      </Box>
    </Box>
  );
}

// ─── Shared MUI sx helpers ────────────────────────────────────────────────────

const selectSx = {
  minWidth: 110, maxWidth: 150,
  fontSize: '0.72rem',
  '& .MuiSelect-select': { py: 0.5, fontSize: '0.72rem', color: '#90caf9' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(33,150,243,0.2)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(33,150,243,0.5)' },
  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)' },
} as const;

const sliderSx = {
  '& .MuiSlider-thumb': { bgcolor: '#2196f3', width: 12, height: 12 },
  '& .MuiSlider-track': { bgcolor: '#2196f3' },
  '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.12)' },
} as const;

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#2196f3' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#2196f3' },
} as const;

const infoBadgeSx = {
  height: 18, fontSize: '0.6rem',
  bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
  border: '1px solid rgba(255,255,255,0.1)',
  '& .MuiChip-label': { px: 0.85 },
} as const;
