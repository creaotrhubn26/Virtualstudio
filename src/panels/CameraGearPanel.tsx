import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CameraIcon from '@mui/icons-material/Camera';

interface CameraBody {
  id: string;
  name: string;
  brand: string;
  sensor: string;
  megapixels: number;
  maxISO: number;
}

interface Lens {
  id: string;
  name: string;
  brand: string;
  focalLength: string;
  aperture: string;
  type: 'prime' | 'zoom' | 'macro' | 'tele' | 'probe';
}

const CAMERA_BODIES: CameraBody[] = [
  { id: 'sony-a7iv', name: 'Sony A7 IV', brand: 'Sony', sensor: 'Full Frame', megapixels: 33, maxISO: 51200 },
  { id: 'canon-r5', name: 'Canon EOS R5', brand: 'Canon', sensor: 'Full Frame', megapixels: 45, maxISO: 51200 },
  { id: 'nikon-z8', name: 'Nikon Z8', brand: 'Nikon', sensor: 'Full Frame', megapixels: 45.7, maxISO: 25600 },
  { id: 'fuji-xh2s', name: 'Fujifilm X-H2S', brand: 'Fujifilm', sensor: 'APS-C', megapixels: 26.1, maxISO: 12800 },
  { id: 'hasselblad-x2d', name: 'Hasselblad X2D', brand: 'Hasselblad', sensor: 'Medium Format', megapixels: 100, maxISO: 25600 },
  { id: 'phase-one', name: 'Phase One IQ4', brand: 'Phase One', sensor: 'Medium Format', megapixels: 150, maxISO: 12800 },
];

const LENSES: Lens[] = [
  { id: 'sony-24-70', name: 'Sony 24-70mm f/2.8 GM II', brand: 'Sony', focalLength: '24-70mm', aperture: 'f/2.8', type: 'zoom' },
  { id: 'sony-85', name: 'Sony 85mm f/1.4 GM', brand: 'Sony', focalLength: '85mm', aperture: 'f/1.4', type: 'prime' },
  { id: 'sony-50', name: 'Sony 50mm f/1.2 GM', brand: 'Sony', focalLength: '50mm', aperture: 'f/1.2', type: 'prime' },
  { id: 'sony-90-macro', name: 'Sony 90mm f/2.8 Macro G', brand: 'Sony', focalLength: '90mm', aperture: 'f/2.8', type: 'macro' },
  { id: 'canon-rf85', name: 'Canon RF 85mm f/1.2L', brand: 'Canon', focalLength: '85mm', aperture: 'f/1.2', type: 'prime' },
  { id: 'canon-rf100-macro', name: 'Canon RF 100mm f/2.8L Macro', brand: 'Canon', focalLength: '100mm', aperture: 'f/2.8', type: 'macro' },
  { id: 'canon-rf70-200', name: 'Canon RF 70-200mm f/2.8L', brand: 'Canon', focalLength: '70-200mm', aperture: 'f/2.8', type: 'tele' },
  { id: 'nikon-z50', name: 'Nikon Z 50mm f/1.2 S', brand: 'Nikon', focalLength: '50mm', aperture: 'f/1.2', type: 'prime' },
  { id: 'nikon-z105-macro', name: 'Nikon Z MC 105mm f/2.8 VR S', brand: 'Nikon', focalLength: '105mm', aperture: 'f/2.8', type: 'macro' },
  { id: 'sigma-art35', name: 'Sigma 35mm f/1.4 DG DN Art', brand: 'Sigma', focalLength: '35mm', aperture: 'f/1.4', type: 'prime' },
  { id: 'sigma-105-macro', name: 'Sigma 105mm f/2.8 DG DN Macro', brand: 'Sigma', focalLength: '105mm', aperture: 'f/2.8', type: 'macro' },
  { id: 'zeiss-otus85', name: 'Zeiss Otus 85mm f/1.4', brand: 'Zeiss', focalLength: '85mm', aperture: 'f/1.4', type: 'prime' },
  { id: 'laowa-probe', name: 'Laowa 24mm f/14 2x Macro Probe', brand: 'Laowa', focalLength: '24mm', aperture: 'f/14', type: 'probe' },
  { id: 'laowa-probe-cine', name: 'Laowa 24mm T14 2x Periprobe Cine', brand: 'Laowa', focalLength: '24mm', aperture: 'T/14', type: 'probe' },
  { id: 'innovision-probe', name: 'Innovision Probe II Plus', brand: 'Innovision', focalLength: '9.8mm', aperture: 'f/5.6', type: 'probe' },
];

type LensType = 'all' | 'prime' | 'zoom' | 'macro' | 'tele' | 'probe';

export function CameraGearPanel() {
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedLens, setSelectedLens] = useState<string | null>(null);
  const [lensFilter, setLensFilter] = useState<LensType>('all');

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectCamera = (camera: CameraBody) => {
    setSelectedCamera(camera.id);
    window.dispatchEvent(new CustomEvent('ch-select-camera', { detail: camera }));
  };

  const selectLens = (lens: Lens) => {
    setSelectedLens(lens.id);
    const focalMatch = lens.focalLength.match(/(\d+)/);
    const apertureMatch = lens.aperture.match(/f\/([\d.]+)/);
    window.dispatchEvent(new CustomEvent('ch-select-lens', {
      detail: {
        ...lens,
        focalValue: focalMatch ? parseInt(focalMatch[1]) : 50,
        apertureValue: apertureMatch ? parseFloat(apertureMatch[1]) : 2.8,
      }
    }));
  };

  const filteredCameras = CAMERA_BODIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.brand.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLenses = LENSES.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.brand.toLowerCase().includes(search.toLowerCase());
    const matchesType = lensFilter === 'all' || l.type === lensFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Søk kamerautstyr..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#666' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#252525',
            '& fieldset': { borderColor: '#333' },
          },
          '& .MuiInputBase-input': { color: '#fff' },
        }}
      />

      <Typography variant="subtitle2" sx={{ color: '#00a8ff', mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraAltIcon fontSize="small" />
        Kamerahus
      </Typography>

      <Stack spacing={1} sx={{ mb: 3 }}>
        {filteredCameras.map(camera => (
          <Box
            key={camera.id}
            onClick={() => selectCamera(camera)}
            sx={{
              p: 1.5,
              bgcolor: selectedCamera === camera.id ? '#00a8ff22' : '#252525',
              border: selectedCamera === camera.id ? '1px solid #00a8ff' : '1px solid #333',
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              '&:hover': { bgcolor: '#2a2a2a' },
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>{camera.name}</Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>
                {camera.sensor} · {camera.megapixels}MP · ISO {camera.maxISO}
              </Typography>
            </Box>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}>
              {favorites.has(camera.id) ? <StarIcon sx={{ color: '#ffd700', fontSize: 18 }} /> : <StarBorderIcon sx={{ color: '#666', fontSize: 18 }} />}
            </IconButton>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ borderColor: '#333', mb: 2 }} />

      <Typography variant="subtitle2" sx={{ color: '#00a8ff', mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraIcon fontSize="small" />
        Objektiver
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
        {(['all', 'prime', 'zoom', 'macro', 'tele', 'probe'] as LensType[]).map(type => (
          <Chip
            key={type}
            label={type === 'all' ? 'Alle' : type === 'prime' ? 'Prime' : type === 'zoom' ? 'Zoom' : type === 'macro' ? 'Makro' : type === 'tele' ? 'Tele' : 'Probe'}
            size="small"
            onClick={() => setLensFilter(type)}
            sx={{
              bgcolor: lensFilter === type ? '#00a8ff' : '#333',
              color: lensFilter === type ? '#fff' : '#aaa',
              fontSize: 11,
              '&:hover': { bgcolor: lensFilter === type ? '#00a8ff' : '#444' },
            }}
          />
        ))}
      </Box>

      <Stack spacing={1}>
        {filteredLenses.map(lens => (
          <Box
            key={lens.id}
            onClick={() => selectLens(lens)}
            sx={{
              p: 1.5,
              bgcolor: selectedLens === lens.id ? '#00a8ff22' : '#252525',
              border: selectedLens === lens.id ? '1px solid #00a8ff' : '1px solid #333',
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              '&:hover': { bgcolor: '#2a2a2a' },
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>{lens.name}</Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>
                {lens.focalLength} · {lens.aperture} · {lens.type === 'macro' ? 'Makro' : lens.type.charAt(0).toUpperCase() + lens.type.slice(1)}
              </Typography>
            </Box>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(lens.id); }}>
              {favorites.has(lens.id) ? <StarIcon sx={{ color: '#ffd700', fontSize: 18 }} /> : <StarBorderIcon sx={{ color: '#666', fontSize: 18 }} />}
            </IconButton>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
