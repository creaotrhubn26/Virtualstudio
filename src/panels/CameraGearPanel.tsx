import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import { useAppStore } from '../state/store';

interface CameraSettings {
  aperture: number;
  iso: number;
  shutterSpeed: number;
  focalLength: number;
  focusDistance: number;
}

const APERTURES = [1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
const ISOS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
const SHUTTER_SPEEDS = [
  { value: 1/8000, label: '1/8000' },
  { value: 1/4000, label: '1/4000' },
  { value: 1/2000, label: '1/2000' },
  { value: 1/1000, label: '1/1000' },
  { value: 1/500, label: '1/500' },
  { value: 1/250, label: '1/250' },
  { value: 1/125, label: '1/125' },
  { value: 1/60, label: '1/60' },
  { value: 1/30, label: '1/30' },
  { value: 1/15, label: '1/15' },
];
const FOCAL_LENGTHS = [14, 24, 35, 50, 85, 105, 135, 200];

const LENS_PRESETS = [
  { name: 'Wide Angle', focal: 24, aperture: 2.8 },
  { name: 'Standard', focal: 50, aperture: 1.8 },
  { name: 'Portrait', focal: 85, aperture: 1.4 },
  { name: 'Telephoto', focal: 135, aperture: 2 },
];

export function CameraGearPanel() {
  const { scene, updateNode, selectedNodeId } = useAppStore();
  
  const [settings, setSettings] = useState<CameraSettings>({
    aperture: 2.8,
    iso: 100,
    shutterSpeed: 1/125,
    focalLength: 50,
    focusDistance: 3,
  });

  const cameraNode = scene.find(n => n.type === 'camera');

  useEffect(() => {
    if (cameraNode?.userData) {
      setSettings({
        aperture: (cameraNode.userData.aperture as number) || 2.8,
        iso: (cameraNode.userData.iso as number) || 100,
        shutterSpeed: (cameraNode.userData.shutterSpeed as number) || 1/125,
        focalLength: (cameraNode.userData.focalLength as number) || 50,
        focusDistance: (cameraNode.userData.focusDistance as number) || 3,
      });
    }
  }, [cameraNode]);

  const updateSettings = (key: keyof CameraSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (cameraNode) {
      updateNode(cameraNode.id, {
        userData: {
          ...cameraNode.userData,
          [key]: value,
        },
      });
    }

    window.dispatchEvent(new CustomEvent('ch-camera-settings', {
      detail: newSettings
    }));
  };

  const applyPreset = (preset: typeof LENS_PRESETS[0]) => {
    const newSettings = { 
      ...settings, 
      focalLength: preset.focal, 
      aperture: preset.aperture 
    };
    setSettings(newSettings);

    if (cameraNode) {
      updateNode(cameraNode.id, {
        userData: {
          ...cameraNode.userData,
          focalLength: preset.focal,
          aperture: preset.aperture,
        },
      });
    }

    window.dispatchEvent(new CustomEvent('ch-camera-settings', {
      detail: newSettings
    }));
  };

  const getEV = () => {
    const ev = Math.log2((settings.aperture * settings.aperture) / settings.shutterSpeed) - Math.log2(settings.iso / 100);
    return ev.toFixed(1);
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Typography variant="subtitle2" sx={{ color: '#00a8ff', mb: 2, fontWeight: 600 }}>
        Kamerainnstillinger
      </Typography>

      <Box sx={{ mb: 2, p: 1.5, bgcolor: '#252525', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: '#888' }}>Eksponeringsverdi</Typography>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
          EV {getEV()}
        </Typography>
        <Typography variant="caption" sx={{ color: '#666' }}>
          f/{settings.aperture} · {SHUTTER_SPEEDS.find(s => s.value === settings.shutterSpeed)?.label || '1/125'}s · ISO {settings.iso}
        </Typography>
      </Box>

      <Stack spacing={2}>
        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Blender (f-stop)</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {APERTURES.map(ap => (
              <Chip
                key={ap}
                label={`f/${ap}`}
                size="small"
                onClick={() => updateSettings('aperture', ap)}
                sx={{
                  bgcolor: settings.aperture === ap ? '#00a8ff' : '#333',
                  color: settings.aperture === ap ? '#fff' : '#aaa',
                  fontSize: 10,
                  '&:hover': { bgcolor: settings.aperture === ap ? '#00a8ff' : '#444' },
                }}
              />
            ))}
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Lukkertid</Typography>
          <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
            <Select
              value={settings.shutterSpeed}
              onChange={(e) => updateSettings('shutterSpeed', Number(e.target.value))}
            >
              {SHUTTER_SPEEDS.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}s</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>ISO</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {ISOS.map(iso => (
              <Chip
                key={iso}
                label={iso}
                size="small"
                onClick={() => updateSettings('iso', iso)}
                sx={{
                  bgcolor: settings.iso === iso ? '#00a8ff' : '#333',
                  color: settings.iso === iso ? '#fff' : '#aaa',
                  fontSize: 10,
                  '&:hover': { bgcolor: settings.iso === iso ? '#00a8ff' : '#444' },
                }}
              />
            ))}
          </Box>
        </Box>

        <Divider sx={{ borderColor: '#333' }} />

        <Typography variant="subtitle2" sx={{ color: '#00a8ff', fontWeight: 600 }}>
          Linse
        </Typography>

        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Brennvidde</Typography>
          <Slider
            value={settings.focalLength}
            onChange={(_, v) => updateSettings('focalLength', v as number)}
            min={14}
            max={200}
            step={1}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}mm`}
            sx={{ color: '#00a8ff' }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>14mm</Typography>
            <Typography variant="body2" sx={{ color: '#fff' }}>{settings.focalLength}mm</Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>200mm</Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#888' }}>Fokusavstand</Typography>
          <Slider
            value={settings.focusDistance}
            onChange={(_, v) => updateSettings('focusDistance', v as number)}
            min={0.3}
            max={20}
            step={0.1}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}m`}
            sx={{ color: '#00a8ff' }}
          />
        </Box>

        <Divider sx={{ borderColor: '#333' }} />

        <Typography variant="caption" sx={{ color: '#888' }}>Forhåndsinnstillinger</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {LENS_PRESETS.map(preset => (
            <Button
              key={preset.name}
              size="small"
              variant="outlined"
              onClick={() => applyPreset(preset)}
              sx={{
                fontSize: 10,
                py: 0.5,
                borderColor: '#444',
                color: '#aaa',
                '&:hover': { borderColor: '#00a8ff', color: '#00a8ff' },
              }}
            >
              {preset.name}
            </Button>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}

export default CameraGearPanel;
