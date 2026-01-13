import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  InputBase,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CameraIcon from '@mui/icons-material/Camera';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CameraRollIcon from '@mui/icons-material/CameraRoll';

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
    category: 'foto',
    image: '/images/gear/fujifilm_x-h2s_camera_body.png'
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
    category: 'foto',
    image: '/images/gear/phase_one_iq4_digital_back.png'
  },
  { 
    id: 'sony-a1', name: 'Sony A1', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.9×24mm', megapixels: 50.1, 
    baseISO: 100, maxISO: 32000, dynamicRange: 15.0, colorDepth: 25.6,
    maxShutter: '1/8000', flashSync: '1/400', ibis: 5.5, burstFps: 30,
    category: 'foto',
    image: '/images/gear/sony_a1_flagship_camera.png'
  },
  { 
    id: 'leica-sl3', name: 'Leica SL3', brand: 'Leica', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 60, 
    baseISO: 100, maxISO: 100000, dynamicRange: 15.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '1/250', ibis: 5,
    category: 'foto',
    image: '/images/gear/leica_sl3_mirrorless_camera.png'
  },
  { 
    id: 'arri-alexa35', name: 'ARRI ALEXA 35', brand: 'ARRI', 
    sensor: 'Super 35', sensorSize: '27.99×19.22mm', megapixels: 14.5, 
    baseISO: 160, maxISO: 6400, dynamicRange: 17.0, colorDepth: 26.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'ARRIRAW, ProRes 4444 XQ', recording: '4.6K',
    category: 'cine',
    image: '/images/gear/arri_alexa_35_cinema_camera.png'
  },
  { 
    id: 'arri-alexamini', name: 'ARRI ALEXA Mini LF', brand: 'ARRI', 
    sensor: 'Large Format', sensorSize: '36.70×25.54mm', megapixels: 13.8, 
    baseISO: 800, maxISO: 3200, dynamicRange: 14.5, colorDepth: 25.8,
    maxShutter: '1/8000', flashSync: '-', maxFps: 90,
    codec: 'ARRIRAW, ProRes 4444 XQ', recording: '4.5K',
    category: 'cine',
    image: '/images/gear/arri_alexa_mini_lf_camera.png'
  },
  { 
    id: 'red-v-raptor', name: 'RED V-RAPTOR 8K VV', brand: 'RED', 
    sensor: 'Vista Vision', sensorSize: '40.96×21.60mm', megapixels: 35.4, 
    baseISO: 800, maxISO: 6400, dynamicRange: 17.0, colorDepth: 26.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 150,
    codec: 'REDCODE RAW 16-bit', recording: '8K',
    category: 'cine',
    image: '/images/gear/red_v-raptor_8k_cube_camera.png'
  },
  { 
    id: 'red-komodo', name: 'RED KOMODO 6K', brand: 'RED', 
    sensor: 'Super 35', sensorSize: '27.03×14.26mm', megapixels: 19.9, 
    baseISO: 800, maxISO: 3200, dynamicRange: 16.0, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 40,
    codec: 'REDCODE RAW, ProRes 422 HQ', recording: '6K',
    category: 'cine',
    image: '/images/gear/red_komodo_6k_compact_cube.png'
  },
  { 
    id: 'blackmagic-ursa', name: 'Blackmagic URSA Mini Pro 12K', brand: 'Blackmagic', 
    sensor: 'Super 35', sensorSize: '27.03×14.25mm', megapixels: 80, 
    baseISO: 800, maxISO: 3200, dynamicRange: 14.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'Blackmagic RAW 12-bit', recording: '12K',
    category: 'cine',
    image: '/images/gear/blackmagic_ursa_mini_pro_12k.png'
  },
  { 
    id: 'sony-venice2', name: 'Sony VENICE 2 8K', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '36×24mm', megapixels: 49.7, 
    baseISO: 800, maxISO: 3200, dynamicRange: 16.0, colorDepth: 25.8,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'X-OCN, XAVC', recording: '8.6K',
    category: 'cine',
    image: '/images/gear/sony_venice_2_cinema_camera.png'
  },
  { 
    id: 'sony-fx6', name: 'Sony FX6', brand: 'Sony', 
    sensor: 'Full Frame', sensorSize: '35.6×23.8mm', megapixels: 10.2, 
    baseISO: 800, maxISO: 409600, dynamicRange: 15.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'XAVC-I, XAVC-L', recording: '4K',
    category: 'cine',
    image: '/images/gear/sony_fx6_compact_cinema_camera.png'
  },
  { 
    id: 'canon-c70', name: 'Canon C70', brand: 'Canon', 
    sensor: 'Super 35', sensorSize: '26.2×13.8mm', megapixels: 8.85, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.0, colorDepth: 25.0,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC', recording: '4K',
    category: 'cine',
    image: '/images/gear/canon_eos_c70_cinema_camera.png'
  },
  { 
    id: 'canon-c80', name: 'Canon C80', brand: 'Canon', 
    sensor: 'Full Frame BSI', sensorSize: '36×24mm', megapixels: 18.0, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.5, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 120,
    codec: 'Cinema RAW Light, XF-AVC', recording: '6K',
    category: 'cine',
    image: '/images/gear/canon_eos_c80_cinema_camera.png'
  },
  { 
    id: 'canon-c50', name: 'Canon C50', brand: 'Canon', 
    sensor: 'Full Frame BSI', sensorSize: '36×24mm', megapixels: 20.0, 
    baseISO: 800, maxISO: 102400, dynamicRange: 16.5, colorDepth: 25.5,
    maxShutter: '1/8000', flashSync: '-', maxFps: 60,
    codec: 'Cinema RAW Light, XF-AVC', recording: '7K',
    category: 'cine',
    image: '/images/gear/canon_c50_compact_cinema_camera.png'
  },
  { 
    id: 'panasonic-s1h', name: 'Panasonic S1H', brand: 'Panasonic', 
    sensor: 'Full Frame', sensorSize: '35.6×23.8mm', megapixels: 24.2, 
    baseISO: 100, maxISO: 51200, dynamicRange: 14.0, colorDepth: 24.8,
    maxShutter: '1/8000', flashSync: '1/320', ibis: 6.5, maxFps: 60,
    codec: 'V-Log, 10-bit 4:2:2', recording: '6K',
    category: 'cine',
    image: '/images/gear/panasonic_s1h_hybrid_cinema_camera.png'
  },
];

const LENSES: Lens[] = [
  { id: 'sony-24-70', name: 'Sony 24-70mm f/2.8 GM II', brand: 'Sony', focalLength: '24-70mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'zoom', minFocusDistance: 0.21, weight: 695, filterSize: 82, opticalElements: 20, image: '/images/gear/sony_24-70mm_gm_ii_lens.png' },
  { id: 'sony-85', name: 'Sony 85mm f/1.4 GM', brand: 'Sony', focalLength: '85mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.80, weight: 820, filterSize: 77, opticalElements: 11, image: '/images/gear/sony_85mm_gm_lens.png' },
  { id: 'sony-50', name: 'Sony 50mm f/1.2 GM', brand: 'Sony', focalLength: '50mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.40, weight: 778, filterSize: 72, opticalElements: 14, image: '/images/gear/sony_50mm_gm_lens.png' },
  { id: 'sony-90-macro', name: 'Sony 90mm f/2.8 Macro G OSS', brand: 'Sony', focalLength: '90mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'macro', minFocusDistance: 0.28, weight: 602, filterSize: 62, opticalElements: 15, image: '/images/gear/sony_90mm_macro_lens.png' },
  { id: 'canon-rf85', name: 'Canon RF 85mm f/1.2L USM', brand: 'Canon', focalLength: '85mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.85, weight: 1195, filterSize: 82, opticalElements: 13, image: '/images/gear/canon_rf_85mm_lens.png' },
  { id: 'canon-rf100-macro', name: 'Canon RF 100mm f/2.8L Macro IS', brand: 'Canon', focalLength: '100mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'macro', minFocusDistance: 0.26, weight: 685, filterSize: 67, opticalElements: 17, image: '/images/gear/canon_rf_100mm_macro_l_lens.png' },
  { id: 'canon-rf70-200', name: 'Canon RF 70-200mm f/2.8L IS', brand: 'Canon', focalLength: '70-200mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'tele', minFocusDistance: 0.70, weight: 1070, filterSize: 77, opticalElements: 17, image: '/images/gear/canon_rf_70-200mm_lens.png' },
  { id: 'nikon-z50', name: 'Nikon Z 50mm f/1.2 S', brand: 'Nikon', focalLength: '50mm', aperture: 'f/1.2', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.45, weight: 1090, filterSize: 82, opticalElements: 17, image: '/images/gear/nikon_z_50mm_lens.png' },
  { id: 'nikon-z105-macro', name: 'Nikon Z MC 105mm f/2.8 VR S', brand: 'Nikon', focalLength: '105mm', aperture: 'f/2.8', minAperture: 'f/32', type: 'macro', minFocusDistance: 0.29, weight: 630, filterSize: 62, opticalElements: 16, image: '/images/gear/nikon_z_mc_105mm_macro_lens.png' },
  { id: 'sigma-art35', name: 'Sigma 35mm f/1.4 DG DN Art', brand: 'Sigma', focalLength: '35mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.30, weight: 645, filterSize: 67, opticalElements: 15, image: '/images/gear/sigma_35mm_art_lens.png' },
  { id: 'sigma-105-macro', name: 'Sigma 105mm f/2.8 DG DN Macro Art', brand: 'Sigma', focalLength: '105mm', aperture: 'f/2.8', minAperture: 'f/22', type: 'macro', minFocusDistance: 0.295, weight: 715, filterSize: 62, opticalElements: 17, image: '/images/gear/sigma_105mm_macro_lens.png' },
  { id: 'zeiss-otus85', name: 'Zeiss Otus 85mm f/1.4 APO', brand: 'Zeiss', focalLength: '85mm', aperture: 'f/1.4', minAperture: 'f/16', type: 'prime', minFocusDistance: 0.80, weight: 1140, filterSize: 86, opticalElements: 11, image: '/images/gear/zeiss_otus_85mm_lens.png' },
  { id: 'laowa-probe', name: 'Laowa 24mm f/14 2x Macro Probe', brand: 'Laowa', focalLength: '24mm', aperture: 'f/14', minAperture: 'f/40', type: 'probe', minFocusDistance: 0.02, weight: 474, opticalElements: 27, image: '/images/gear/laowa_probe_macro_lens.png' },
  { id: 'laowa-probe-cine', name: 'Laowa 24mm T14 2x Periprobe', brand: 'Laowa', focalLength: '24mm', aperture: 'T/14', minAperture: 'T/40', type: 'probe', minFocusDistance: 0.02, weight: 770, opticalElements: 28, image: '/images/gear/laowa_periprobe_cine_macro_lens.png' },
  { id: 'innovision-probe', name: 'Innovision Probe II Plus', brand: 'Innovision', focalLength: '9.8mm', aperture: 'f/5.6', minAperture: 'f/22', type: 'probe', minFocusDistance: 0.01, weight: 1200, image: '/images/gear/innovision_probe_ii_plus_lens.png' },
];

interface CategoryInfo {
  key: string;
  label: string;
}

const CAMERA_TYPE_CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'foto', label: 'Foto' },
  { key: 'cine', label: 'Cine' },
];

const CAMERA_BRANDS: CategoryInfo[] = [
  { key: 'all', label: 'Alle merker' },
  { key: 'Sony', label: 'Sony' },
  { key: 'Canon', label: 'Canon' },
  { key: 'Nikon', label: 'Nikon' },
  { key: 'ARRI', label: 'ARRI' },
  { key: 'RED', label: 'RED' },
  { key: 'Blackmagic', label: 'Blackmagic' },
];

const LENS_TYPE_CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'prime', label: 'Prime' },
  { key: 'zoom', label: 'Zoom' },
  { key: 'macro', label: 'Makro' },
  { key: 'tele', label: 'Tele' },
  { key: 'probe', label: 'Probe' },
];

const LENS_BRANDS: CategoryInfo[] = [
  { key: 'all', label: 'Alle merker' },
  { key: 'Sony', label: 'Sony' },
  { key: 'Canon', label: 'Canon' },
  { key: 'Nikon', label: 'Nikon' },
  { key: 'Sigma', label: 'Sigma' },
  { key: 'Zeiss', label: 'Zeiss' },
  { key: 'Laowa', label: 'Laowa' },
];

export function CameraGearPanel() {
  const theme = useTheme();
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIPadFriendly = isTablet || isTouchDevice;

  const [activeTab, setActiveTab] = useState(0);
  const [cameraTypeFilter, setCameraTypeFilter] = useState('all');
  const [cameraBrandFilter, setCameraBrandFilter] = useState('all');
  const [lensTypeFilter, setLensTypeFilter] = useState('all');
  const [lensBrandFilter, setLensBrandFilter] = useState('all');
  const [cameraSearch, setCameraSearch] = useState('');
  const [lensSearch, setLensSearch] = useState('');
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedLens, setSelectedLens] = useState<string | null>(null);

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

  const filteredCameras = useMemo(() => {
    return CAMERA_BODIES.filter(c => {
      const matchesType = cameraTypeFilter === 'all' || c.category === cameraTypeFilter;
      const matchesBrand = cameraBrandFilter === 'all' || c.brand === cameraBrandFilter;
      const matchesSearch = cameraSearch === '' ||
        c.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
        c.brand.toLowerCase().includes(cameraSearch.toLowerCase()) ||
        c.sensor.toLowerCase().includes(cameraSearch.toLowerCase());
      return matchesType && matchesBrand && matchesSearch;
    });
  }, [cameraTypeFilter, cameraBrandFilter, cameraSearch]);

  const filteredLenses = useMemo(() => {
    return LENSES.filter(l => {
      const matchesType = lensTypeFilter === 'all' || l.type === lensTypeFilter;
      const matchesBrand = lensBrandFilter === 'all' || l.brand === lensBrandFilter;
      const matchesSearch = lensSearch === '' ||
        l.name.toLowerCase().includes(lensSearch.toLowerCase()) ||
        l.brand.toLowerCase().includes(lensSearch.toLowerCase()) ||
        l.focalLength.toLowerCase().includes(lensSearch.toLowerCase());
      return matchesType && matchesBrand && matchesSearch;
    });
  }, [lensTypeFilter, lensBrandFilter, lensSearch]);

  const buttonStyle = {
    minHeight: 56,
    minWidth: 110,
    fontSize: 15,
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '10px',
    borderWidth: 2,
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    '&:active': {
      transform: 'scale(0.97)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        background: 'linear-gradient(135deg, rgba(52,152,219,0.15) 0%, rgba(41,128,185,0.15) 100%)',
        borderRadius: '14px',
        px: 2.5,
        py: 1.5,
        mx: 2,
        mt: 2,
        mb: 1,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
          boxShadow: '0 4px 12px rgba(52,152,219,0.4)',
        }}>
          <CameraRollIcon sx={{ fontSize: 24, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ 
            fontWeight: 800, 
            fontSize: 20,
            background: 'linear-gradient(90deg, #85c1e9 0%, #5dade2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px',
          }}>
            Kamerautstyr
          </Typography>
          <Typography sx={{ 
            fontSize: 12, 
            color: '#888',
            fontWeight: 500,
          }}>
            Kameraer og objektiver
          </Typography>
        </Box>
      </Box>
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          minHeight: 60,
          borderBottom: '2px solid #333',
          '& .MuiTab-root': {
            color: '#aaa',
            minHeight: 60,
            fontSize: 16,
            fontWeight: 600,
            textTransform: 'none',
            px: 3,
            transition: 'all 0.2s ease',
            '&:hover': {
              color: '#fff',
              bgcolor: 'rgba(0, 168, 255, 0.1)',
            },
            '&.Mui-selected': { 
              color: '#00a8ff',
              fontWeight: 700,
            },
          },
          '& .MuiTabs-indicator': { 
            backgroundColor: '#00a8ff',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        <Tab icon={<CameraAltIcon sx={{ fontSize: 22 }} />} iconPosition="start" label="Kameraer" />
        <Tab icon={<CameraIcon sx={{ fontSize: 22 }} />} iconPosition="start" label="Objektiver" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <>
            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              Type
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
              {CAMERA_TYPE_CATEGORIES.map(cat => (
                <Button
                  key={cat.key}
                  variant={cameraTypeFilter === cat.key ? 'contained' : 'outlined'}
                  startIcon={cat.key === 'foto' ? <PhotoCameraIcon /> : cat.key === 'cine' ? <VideocamIcon /> : undefined}
                  onClick={() => setCameraTypeFilter(cat.key)}
                  sx={{
                    ...buttonStyle,
                    bgcolor: cameraTypeFilter === cat.key ? '#00a8ff' : 'transparent',
                    borderColor: cameraTypeFilter === cat.key ? '#00a8ff' : '#444',
                    color: cameraTypeFilter === cat.key ? '#fff' : '#aaa',
                    boxShadow: cameraTypeFilter === cat.key ? '0 4px 12px rgba(0,168,255,0.3)' : 'none',
                    '&:hover': {
                      bgcolor: cameraTypeFilter === cat.key ? '#0090dd' : '#333',
                      borderColor: cameraTypeFilter === cat.key ? '#0090dd' : '#555',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  {cat.label}
                </Button>
              ))}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: '#2a2a2a', 
                borderRadius: '10px', 
                px: 2, 
                py: 0.5,
                minHeight: 56,
                border: '2px solid #444',
                flex: 1,
                minWidth: 140,
                maxWidth: 220,
              }}>
                <SearchIcon sx={{ color: '#888', fontSize: 22, mr: 1 }} />
                <InputBase
                  placeholder="Søk kamera..."
                  value={cameraSearch}
                  onChange={(e) => setCameraSearch(e.target.value)}
                  sx={{
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 500,
                    flex: 1,
                    '& input::placeholder': { color: '#666', opacity: 1 },
                  }}
                />
              </Box>
            </Box>

            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              Merke
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {CAMERA_BRANDS.map(brand => (
                <Button
                  key={brand.key}
                  variant={cameraBrandFilter === brand.key ? 'contained' : 'outlined'}
                  onClick={() => setCameraBrandFilter(brand.key)}
                  sx={{
                    ...buttonStyle,
                    bgcolor: cameraBrandFilter === brand.key ? '#00a8ff' : 'transparent',
                    borderColor: cameraBrandFilter === brand.key ? '#00a8ff' : '#444',
                    color: cameraBrandFilter === brand.key ? '#fff' : '#aaa',
                    boxShadow: cameraBrandFilter === brand.key ? '0 4px 12px rgba(0,168,255,0.3)' : 'none',
                    '&:hover': {
                      bgcolor: cameraBrandFilter === brand.key ? '#0090dd' : '#333',
                      borderColor: cameraBrandFilter === brand.key ? '#0090dd' : '#555',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  {brand.label}
                </Button>
              ))}
            </Box>

            <Divider sx={{ my: 1.5, borderColor: '#333' }} />

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 1.5,
            }}>
              {filteredCameras.map(camera => (
                <Card
                  key={camera.id}
                  onClick={() => selectCamera(camera)}
                  sx={{
                    bgcolor: selectedCamera === camera.id ? '#00a8ff22' : '#252525',
                    border: selectedCamera === camera.id ? '2px solid #00a8ff' : '1px solid #333',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: '#2a2a2a',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="100"
                    image={camera.image || '/images/gear/placeholder_camera.png'}
                    alt={camera.name}
                    sx={{ 
                      objectFit: 'contain', 
                      bgcolor: '#1a1a1a',
                      p: 1,
                    }}
                  />
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 600, 
                        fontSize: 11, 
                        lineHeight: 1.2,
                        mb: 0.5,
                      }}
                    >
                      {camera.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', fontSize: 9 }}>
                      {camera.sensor} · {camera.megapixels}MP
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', fontSize: 9 }}>
                      {camera.category === 'cine' ? camera.recording : `DR ${camera.dynamicRange}EV`}
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                      onClick={(e) => { e.stopPropagation(); selectCamera(camera); }}
                      sx={{
                        mt: 1,
                        width: '100%',
                        minHeight: 32,
                        fontSize: 10,
                        bgcolor: '#00a8ff',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#0090dd' },
                      }}
                    >
                      Velg
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </>
        )}

        {activeTab === 1 && (
          <>
            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              Type
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
              {LENS_TYPE_CATEGORIES.map(cat => (
                <Button
                  key={cat.key}
                  variant={lensTypeFilter === cat.key ? 'contained' : 'outlined'}
                  onClick={() => setLensTypeFilter(cat.key)}
                  sx={{
                    ...buttonStyle,
                    bgcolor: lensTypeFilter === cat.key ? '#00a8ff' : 'transparent',
                    borderColor: lensTypeFilter === cat.key ? '#00a8ff' : '#444',
                    color: lensTypeFilter === cat.key ? '#fff' : '#aaa',
                    boxShadow: lensTypeFilter === cat.key ? '0 4px 12px rgba(0,168,255,0.3)' : 'none',
                    '&:hover': {
                      bgcolor: lensTypeFilter === cat.key ? '#0090dd' : '#333',
                      borderColor: lensTypeFilter === cat.key ? '#0090dd' : '#555',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  {cat.label}
                </Button>
              ))}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: '#2a2a2a', 
                borderRadius: '10px', 
                px: 2, 
                py: 0.5,
                minHeight: 56,
                border: '2px solid #444',
                flex: 1,
                minWidth: 140,
                maxWidth: 220,
              }}>
                <SearchIcon sx={{ color: '#888', fontSize: 22, mr: 1 }} />
                <InputBase
                  placeholder="Søk objektiv..."
                  value={lensSearch}
                  onChange={(e) => setLensSearch(e.target.value)}
                  sx={{
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 500,
                    flex: 1,
                    '& input::placeholder': { color: '#666', opacity: 1 },
                  }}
                />
              </Box>
            </Box>

            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              Merke
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {LENS_BRANDS.map(brand => (
                <Button
                  key={brand.key}
                  variant={lensBrandFilter === brand.key ? 'contained' : 'outlined'}
                  onClick={() => setLensBrandFilter(brand.key)}
                  sx={{
                    ...buttonStyle,
                    bgcolor: lensBrandFilter === brand.key ? '#00a8ff' : 'transparent',
                    borderColor: lensBrandFilter === brand.key ? '#00a8ff' : '#444',
                    color: lensBrandFilter === brand.key ? '#fff' : '#aaa',
                    boxShadow: lensBrandFilter === brand.key ? '0 4px 12px rgba(0,168,255,0.3)' : 'none',
                    '&:hover': {
                      bgcolor: lensBrandFilter === brand.key ? '#0090dd' : '#333',
                      borderColor: lensBrandFilter === brand.key ? '#0090dd' : '#555',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  {brand.label}
                </Button>
              ))}
            </Box>

            <Divider sx={{ my: 1.5, borderColor: '#333' }} />

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 1.5,
            }}>
              {filteredLenses.map(lens => (
                <Card
                  key={lens.id}
                  onClick={() => selectLens(lens)}
                  sx={{
                    bgcolor: selectedLens === lens.id ? '#00a8ff22' : '#252525',
                    border: selectedLens === lens.id ? '2px solid #00a8ff' : '1px solid #333',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: '#2a2a2a',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="100"
                    image={lens.image || '/images/gear/placeholder_lens.png'}
                    alt={lens.name}
                    sx={{ 
                      objectFit: 'contain', 
                      bgcolor: '#1a1a1a',
                      p: 1,
                    }}
                  />
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 600, 
                        fontSize: 11, 
                        lineHeight: 1.2,
                        mb: 0.5,
                      }}
                    >
                      {lens.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', fontSize: 9 }}>
                      {lens.focalLength} · {lens.aperture}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', fontSize: 9 }}>
                      {lens.weight}g · ø{lens.filterSize}mm
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                      onClick={(e) => { e.stopPropagation(); selectLens(lens); }}
                      sx={{
                        mt: 1,
                        width: '100%',
                        minHeight: 32,
                        fontSize: 10,
                        bgcolor: '#00a8ff',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#0090dd' },
                      }}
                    >
                      Velg
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

export default CameraGearPanel;
