import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  useMediaQuery,
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CameraIcon from '@mui/icons-material/Camera';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AddIcon from '@mui/icons-material/Add';

interface CameraBody {
  id: string;
  name: string;
  brand: string;
  sensor: string;
  sensorSize: string;
  megapixels: number;
  baseISO: number;
  maxISO: number;
  dynamicRange: number;
  colorDepth: number;
  maxShutter: string;
  flashSync: string;
  category: 'foto' | 'cine';
  ibis?: number;
  burstFps?: number;
  maxFps?: number;
  codec?: string;
  recording?: string;
  image?: string;
}

interface Lens {
  id: string;
  name: string;
  brand: string;
  focalLength: string;
  aperture: string;
  minAperture: string;
  type: 'prime' | 'zoom' | 'macro' | 'tele' | 'probe';
  minFocusDistance?: number;
  weight?: number;
  filterSize?: number;
  opticalElements?: number;
  image?: string;
}

const CAMERA_BODIES: CameraBody[] = [
  { 
    id: 'sony-a7iv', name: 'Sony A7 IV', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.9×24mm', megapixels: 33, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.7, colorDepth: 25.4,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 5.5, burstFps: 10,
    category: 'foto',
    image: '/images/gear/sony_a7_iv_camera.png' 
  },
  { 
    id: 'canon-r5', name: 'Canon EOS R5', brand: 'Canon', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 45, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.6, colorDepth: 25.3,
    maxShutter: '1/8000', flashSync: '1/200', ibis: 8, burstFps: 12,
    category: 'foto',
    image: '/images/gear/canon_eos_r5_camera.png' 
  },
  { 
    id: 'nikon-z8', name: 'Nikon Z8', brand: 'Nikon', 
    sensor: 'Full Frame', sensorSize: '35.9×23.9mm', megapixels: 45.7, 
    baseISO: 64, maxISO: 25600, dynamicRange: 14.8, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '1/200', ibis: 6, burstFps: 20,
    category: 'foto',
    image: '/images/gear/nikon_z8_camera.png' 
  },
  { 
    id: 'fuji-xh2s', name: 'Fujifilm X-H2S', brand: 'Fujifilm', 
    sensor: 'APS-C', sensorSize: '23.5×15.6mm', megapixels: 26.1, 
    baseISO: 160, maxISO: 12800, dynamicRange: 12.8, colorDepth: 23.8,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 7, burstFps: 40,
    category: 'foto'
  },
  { 
    id: 'hasselblad-x2d', name: 'Hasselblad X2D 100C', brand: 'Hasselblad', 
    sensor: 'Medium Format', sensorSize: '43.8×32.9mm', megapixels: 100, 
    baseISO: 64, maxISO: 25600, dynamicRange: 15.0, colorDepth: 26.2,
    maxShutter: '1/4000', flashSync: '1/4000', ibis: 7,
    category: 'foto',
    image: '/images/gear/hasselblad_x2d_camera.png' 
  },
  { 
    id: 'phase-one', name: 'Phase One IQ4 150MP', brand: 'Phase One', 
    sensor: 'Medium Format', sensorSize: '53.4×40mm', megapixels: 150, 
    baseISO: 50, maxISO: 12800, dynamicRange: 15.3, colorDepth: 26.4,
    maxShutter: '1/4000', flashSync: '1/1600',
    category: 'foto'
  },
  { 
    id: 'sony-a1', name: 'Sony A1', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.9×24mm', megapixels: 50.1, 
    baseISO: 100, maxISO: 32000, dynamicRange: 15.0, colorDepth: 25.6,
    maxShutter: '1/8000', flashSync: '1/400', ibis: 5.5, burstFps: 30,
    category: 'foto'
  },
  { 
    id: 'leica-sl3', name: 'Leica SL3', brand: 'Leica', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 60, 
    baseISO: 100, maxISO: 100000, dynamicRange: 15.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 5,
    category: 'foto'
  },
  { 
    id: 'arri-alexa35', name: 'ARRI ALEXA 35', brand: 'ARRI', 
    sensor: 'Super 35', sensorSize: '27.99×19.22mm', megapixels: 4.6, 
    baseISO: 800, maxISO: 6400, dynamicRange: 17.0, colorDepth: 26.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'ARRIRAW, ProRes', recording: '4.6K',
    category: 'cine'
  },
  { 
    id: 'arri-alexamini', name: 'ARRI ALEXA Mini LF', brand: 'ARRI', 
    sensor: 'Large Format', sensorSize: '36.70×25.54mm', megapixels: 4.5, 
    baseISO: 800, maxISO: 3200, dynamicRange: 14.5, colorDepth: 25.8,
    maxShutter: '1/8000', flashSync: '-', maxFps: 90,
    codec: 'ARRIRAW, ProRes', recording: '4.5K',
    category: 'cine'
  },
  { 
    id: 'red-v-raptor', name: 'RED V-RAPTOR 8K VV', brand: 'RED', 
    sensor: 'Vista Vision', sensorSize: '40.96×21.60mm', megapixels: 35.4, 
    baseISO: 800, maxISO: 12800, dynamicRange: 17.0, colorDepth: 26.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'REDCODE RAW', recording: '8K',
    category: 'cine'
  },
  { 
    id: 'red-komodo', name: 'RED KOMODO 6K', brand: 'RED', 
    sensor: 'Super 35', sensorSize: '27.03×14.26mm', megapixels: 19.9, 
    baseISO: 800, maxISO: 25600, dynamicRange: 16.5, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'REDCODE RAW', recording: '6K',
    category: 'cine'
  },
  { 
    id: 'blackmagic-ursa', name: 'Blackmagic URSA Mini Pro 12K', brand: 'Blackmagic', 
    sensor: 'Super 35', sensorSize: '27.03×14.26mm', megapixels: 80, 
    baseISO: 800, maxISO: 3200, dynamicRange: 14.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'Blackmagic RAW', recording: '12K',
    category: 'cine'
  },
  { 
    id: 'sony-venice2', name: 'Sony VENICE 2 8K', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 8.6, 
    baseISO: 800, maxISO: 4500, dynamicRange: 16.0, colorDepth: 25.8,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'X-OCN, ProRes', recording: '8.6K',
    category: 'cine'
  },
  { 
    id: 'canon-c70', name: 'Canon EOS C70', brand: 'Canon', 
    sensor: 'Super 35', sensorSize: '26.2×13.8mm', megapixels: 8.85, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC', recording: '4K DCI',
    category: 'cine'
  },
  { 
    id: 'canon-c80', name: 'Canon EOS C80', brand: 'Canon', 
    sensor: 'Full Frame', sensorSize: '36.0×19.0mm', megapixels: 26.67, 
    baseISO: 800, maxISO: 12800, dynamicRange: 16.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC, ProRes RAW', recording: '6K',
    category: 'cine'
  },
  { 
    id: 'canon-c50', name: 'Canon EOS C50', brand: 'Canon', 
    sensor: 'Full Frame', sensorSize: '36.0×24.0mm', megapixels: 32, 
    baseISO: 800, maxISO: 6400, dynamicRange: 15.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC, XF-HEVC', recording: '7K',
    category: 'cine'
  },
  { 
    id: 'sony-fx6', name: 'Sony FX6', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.6×23.8mm', megapixels: 10.2, 
    baseISO: 800, maxISO: 409600, dynamicRange: 15.0, colorDepth: 25.2,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'XAVC S, XAVC HS', recording: '4K',
    category: 'cine'
  },
  { 
    id: 'panasonic-s1h', name: 'Panasonic S1H', brand: 'Panasonic', 
    sensor: 'Full Frame', sensorSize: '35.6×23.8mm', megapixels: 24.2, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.0, colorDepth: 24.8,
    maxShutter: '1/8000', flashSync: '1/250', maxFps: 60,
    codec: 'V-Log, ProRes RAW', recording: '6K',
    category: 'cine'
  },
];

const LENSES: Lens[] = [
  { id: 'sony-24-70', name: 'Sony 24-70mm f/2.8 GM II', brand: 'Sony', focalLength: '24-70mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'zoom', weight: 695, filterSize: 82 },
  { id: 'sony-85', name: 'Sony 85mm f/1.4 GM', brand: 'Sony', focalLength: '85mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.8, weight: 820, filterSize: 77, image: '/images/gear/sony_85mm_gm_lens.png' },
  { id: 'sony-50', name: 'Sony 50mm f/1.2 GM', brand: 'Sony', focalLength: '50mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.4, weight: 778, filterSize: 72 },
  { id: 'sony-90-macro', name: 'Sony 90mm f/2.8 Macro G', brand: 'Sony', focalLength: '90mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'macro', minFocusDistance: 0.28, weight: 602, filterSize: 62 },
  { id: 'canon-rf85', name: 'Canon RF 85mm f/1.2L', brand: 'Canon', focalLength: '85mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.85, weight: 1195, filterSize: 82 },
  { id: 'canon-rf100-macro', name: 'Canon RF 100mm f/2.8L Macro', brand: 'Canon', focalLength: '100mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'macro', minFocusDistance: 0.26, weight: 730, filterSize: 67 },
  { id: 'canon-rf70-200', name: 'Canon RF 70-200mm f/2.8L', brand: 'Canon', focalLength: '70-200mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'tele', minFocusDistance: 0.7, weight: 1070, filterSize: 77, image: '/images/gear/canon_rf_70-200mm_lens.png' },
  { id: 'nikon-z50', name: 'Nikon Z 50mm f/1.2 S', brand: 'Nikon', focalLength: '50mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.45, weight: 1090, filterSize: 82 },
  { id: 'nikon-z105-macro', name: 'Nikon Z MC 105mm f/2.8 VR S', brand: 'Nikon', focalLength: '105mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'macro', minFocusDistance: 0.29, weight: 630, filterSize: 62 },
  { id: 'sigma-art35', name: 'Sigma 35mm f/1.4 DG DN Art', brand: 'Sigma', focalLength: '35mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.3, weight: 645, filterSize: 67, image: '/images/gear/sigma_35mm_art_lens.png' },
  { id: 'sigma-105-macro', name: 'Sigma 105mm f/2.8 DG DN Macro', brand: 'Sigma', focalLength: '105mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'macro', minFocusDistance: 0.295, weight: 715, filterSize: 62 },
  { id: 'zeiss-otus85', name: 'Zeiss Otus 85mm f/1.4', brand: 'Zeiss', focalLength: '85mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.8, weight: 1140, filterSize: 86 },
  { id: 'laowa-probe', name: 'Laowa 24mm f/14 2x Macro Probe', brand: 'Laowa', focalLength: '24mm', aperture: 'f/14', minAperture: 'f/40', type: 'probe', minFocusDistance: 0.02, weight: 474, image: '/images/gear/laowa_probe_macro_lens.png' },
  { id: 'laowa-probe-cine', name: 'Laowa 24mm T14 2x Periprobe Cine', brand: 'Laowa', focalLength: '24mm', aperture: 'T/14', minAperture: 'T/40', type: 'probe', minFocusDistance: 0.02, weight: 590 },
  { id: 'innovision-probe', name: 'Innovision Probe II Plus', brand: 'Innovision', focalLength: '9.8mm', aperture: 'f/5.6', minAperture: 'f/22', type: 'probe', minFocusDistance: 0.01, weight: 1200 },
];

type LensType = 'all' | 'prime' | 'zoom' | 'macro' | 'tele' | 'probe';
type CameraCategory = 'all' | 'foto' | 'cine';

export function CameraGearPanel() {
  const [activeTab, setActiveTab] = useState(0);
  const [cameraSearch, setCameraSearch] = useState('');
  const [lensSearch, setLensSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedLens, setSelectedLens] = useState<string | null>(null);
  const [lensFilter, setLensFilter] = useState<LensType>('all');
  const [cameraFilter, setCameraFilter] = useState<CameraCategory>('all');
  const isTablet = useMediaQuery('(max-width: 1024px), (pointer: coarse)');

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

  const addCamera = (camera: CameraBody, e: React.MouseEvent) => {
    e.stopPropagation();
    selectCamera(camera);
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

  const addLens = (lens: Lens, e: React.MouseEvent) => {
    e.stopPropagation();
    selectLens(lens);
  };

  const filteredCameras = CAMERA_BODIES.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      c.brand.toLowerCase().includes(cameraSearch.toLowerCase());
    const matchesCategory = cameraFilter === 'all' || c.category === cameraFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredLenses = LENSES.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(lensSearch.toLowerCase()) ||
      l.brand.toLowerCase().includes(lensSearch.toLowerCase());
    const matchesType = lensFilter === 'all' || l.type === lensFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          minHeight: 40,
          borderBottom: '1px solid #333',
          '& .MuiTab-root': {
            color: '#888',
            minHeight: 40,
            fontSize: 12,
            textTransform: 'none',
            '&.Mui-selected': { color: '#00a8ff' },
          },
          '& .MuiTabs-indicator': { backgroundColor: '#00a8ff' },
        }}
      >
        <Tab icon={<CameraAltIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Kamera" />
        <Tab icon={<CameraIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Linser" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <>
            <TextField
              fullWidth
              size="small"
              placeholder="Søk kameraer..."
              value={cameraSearch}
              onChange={(e) => setCameraSearch(e.target.value)}
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

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {(['all', 'foto', 'cine'] as CameraCategory[]).map(cat => (
                <Chip
                  key={cat}
                  icon={cat === 'foto' ? <PhotoCameraIcon sx={{ fontSize: 14 }} /> : cat === 'cine' ? <VideocamIcon sx={{ fontSize: 14 }} /> : undefined}
                  label={cat === 'all' ? 'Alle' : cat === 'foto' ? 'Foto' : 'Cine'}
                  size="small"
                  onClick={() => setCameraFilter(cat)}
                  sx={{
                    bgcolor: cameraFilter === cat ? '#00a8ff' : '#333',
                    color: cameraFilter === cat ? '#fff' : '#aaa',
                    fontSize: 11,
                    '& .MuiChip-icon': { color: cameraFilter === cat ? '#fff' : '#888' },
                    '&:hover': { bgcolor: cameraFilter === cat ? '#00a8ff' : '#444' },
                  }}
                />
              ))}
            </Box>

            <Stack spacing={1}>
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
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': { bgcolor: '#2a2a2a' },
                  }}
                >
                  {camera.image ? (
                    <Box
                      component="img"
                      src={camera.image}
                      alt={camera.name}
                      sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', bgcolor: '#333' }}
                    />
                  ) : (
                    <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {camera.category === 'cine' ? <VideocamIcon sx={{ color: '#666' }} /> : <CameraAltIcon sx={{ color: '#666' }} />}
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>{camera.name}</Typography>
                      <Chip 
                        label={camera.category === 'cine' ? 'Cine' : 'Foto'} 
                        size="small" 
                        sx={{ 
                          height: 16, 
                          fontSize: 8, 
                          bgcolor: camera.category === 'cine' ? '#4a2a4a' : '#2a4a3a',
                          color: '#fff'
                        }} 
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                      {camera.sensor} ({camera.sensorSize}) · {camera.megapixels}MP
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={`DR ${camera.dynamicRange}EV`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#2a4a2a' }} />
                      <Chip label={`ISO ${camera.baseISO}-${camera.maxISO}`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#333' }} />
                      {camera.category === 'foto' && camera.flashSync !== '-' && (
                        <Chip label={`Sync ${camera.flashSync}`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#4a3a2a' }} />
                      )}
                      {camera.ibis && <Chip label={`IBIS ${camera.ibis}`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#2a3a4a' }} />}
                      {camera.category === 'cine' && camera.recording && (
                        <Chip label={camera.recording} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#4a2a4a' }} />
                      )}
                      {camera.category === 'cine' && camera.maxFps && (
                        <Chip label={`${camera.maxFps}fps`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#3a3a4a' }} />
                      )}
                    </Box>
                    {camera.category === 'cine' && camera.codec && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5, fontSize: 9 }}>
                        {camera.codec}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(camera.id); }}>
                      {favorites.has(camera.id) ? <StarIcon sx={{ color: '#ffd700', fontSize: 18 }} /> : <StarBorderIcon sx={{ color: '#666', fontSize: 18 }} />}
                    </IconButton>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                      onClick={(e) => addCamera(camera, e)}
                      aria-label={`Legg til ${camera.name}`}
                      sx={{
                        minWidth: isTablet ? 80 : 70,
                        minHeight: isTablet ? 36 : 28,
                        fontSize: 10,
                        bgcolor: '#00a8ff',
                        '&:hover': { bgcolor: '#0090dd' },
                        textTransform: 'none',
                      }}
                    >
                      Legg til
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {activeTab === 1 && (
          <>
            <TextField
              fullWidth
              size="small"
              placeholder="Søk linser..."
              value={lensSearch}
              onChange={(e) => setLensSearch(e.target.value)}
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
                    alignItems: 'center',
                    gap: 1.5,
                    '&:hover': { bgcolor: '#2a2a2a' },
                  }}
                >
                  {lens.image ? (
                    <Box
                      component="img"
                      src={lens.image}
                      alt={lens.name}
                      sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', bgcolor: '#333' }}
                    />
                  ) : (
                    <Box sx={{ width: 48, height: 48, borderRadius: 1, bgcolor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CameraIcon sx={{ color: '#666' }} />
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>{lens.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                      {lens.focalLength} · {lens.aperture}-{lens.minAperture}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={lens.type === 'macro' ? 'Makro' : lens.type.charAt(0).toUpperCase() + lens.type.slice(1)} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#333' }} />
                      {lens.weight && <Chip label={`${lens.weight}g`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#333' }} />}
                      {lens.minFocusDistance && <Chip label={`Min ${(lens.minFocusDistance * 100).toFixed(0)}cm`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#2a3a4a' }} />}
                      {lens.filterSize && <Chip label={`ø${lens.filterSize}mm`} size="small" sx={{ height: 16, fontSize: 8, bgcolor: '#3a3a4a' }} />}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFavorite(lens.id); }}>
                      {favorites.has(lens.id) ? <StarIcon sx={{ color: '#ffd700', fontSize: 18 }} /> : <StarBorderIcon sx={{ color: '#666', fontSize: 18 }} />}
                    </IconButton>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                      onClick={(e) => addLens(lens, e)}
                      aria-label={`Legg til ${lens.name}`}
                      sx={{
                        minWidth: isTablet ? 80 : 70,
                        minHeight: isTablet ? 36 : 28,
                        fontSize: 10,
                        bgcolor: '#00a8ff',
                        '&:hover': { bgcolor: '#0090dd' },
                        textTransform: 'none',
                      }}
                    >
                      Legg til
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
