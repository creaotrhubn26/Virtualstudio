import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Slider,
  FormControl,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  WbSunny,
  Brightness4,
  CloudQueue,
  NightsStay,
  Landscape,
  CheckCircle,
} from '@mui/icons-material';

interface HDRIPreset {
  id: string;
  name: string;
  category: 'studio' | 'outdoor' | 'sunset' | 'night' | 'overcast';
  thumbnail: string;
  intensity: number;
  rotation: number;
  description: string;
}

const HDRI_PRESETS: HDRIPreset[] = [
  {
    id: 'studio_small_03',
    name: 'Studio Small',
    category: 'studio',
    thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/studio_small_03.png',
    intensity: 1.0,
    rotation: 0,
    description: 'Profesjonelt studio med mykt lys',
  },
  {
    id: 'photo_studio_01',
    name: 'Photo Studio',
    category: 'studio',
    thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/photo_studio_01.png',
    intensity: 1.0,
    rotation: 0,
    description: 'Rent studio med jevnt lys',
  },
  {
    id: 'evening_road',
    name: 'Kveldsvei',
    category: 'sunset',
    thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/evening_road_01.png',
    intensity: 0.8,
    rotation: 0,
    description: 'Varm kveldsstemning',
  },
  {
    id: 'kloppenheim',
    name: 'Kloppenheim',
    category: 'outdoor',
    thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/kloppenheim_02.png',
    intensity: 1.2,
    rotation: 0,
    description: 'Utendørs med blå himmel',
  },
  {
    id: 'cloudy_sky',
    name: 'Overskyet',
    category: 'overcast',
    thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/kloofendal_overcast_puresky.png',
    intensity: 0.9,
    rotation: 0,
    description: 'Mykt overskyet lys',
  },
  {
    id: 'night_city',
    name: 'Natt i byen',
    category: 'night',
    thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/potsdamer_platz.png',
    intensity: 0.5,
    rotation: 0,
    description: 'Nattscene med bylys',
  },
];

const CATEGORIES = [
  { id: 'all', name: 'Alle', icon: null },
  { id: 'studio', name: 'Studio', icon: <Brightness4 fontSize="small" /> },
  { id: 'outdoor', name: 'Utendørs', icon: <Landscape fontSize="small" /> },
  { id: 'sunset', name: 'Solnedgang', icon: <WbSunny fontSize="small" /> },
  { id: 'overcast', name: 'Overskyet', icon: <CloudQueue fontSize="small" /> },
  { id: 'night', name: 'Natt', icon: <NightsStay fontSize="small" /> },
];

export function HDRIPanel() {
  const [selectedHDRI, setSelectedHDRI] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [intensity, setIntensity] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [showBackground, setShowBackground] = useState(true);

  const filteredPresets = HDRI_PRESETS.filter(
    hdri => category === 'all' || hdri.category === category
  );

  const handleSelectHDRI = (hdri: HDRIPreset) => {
    setSelectedHDRI(hdri.id);
    setIntensity(hdri.intensity);
    setRotation(hdri.rotation);

    window.dispatchEvent(new CustomEvent('ch-load-hdri', {
      detail: {
        id: hdri.id,
        name: hdri.name,
        intensity: hdri.intensity,
        rotation: hdri.rotation,
        showBackground,
      }
    }));
  };

  const updateHDRISettings = () => {
    if (selectedHDRI) {
      window.dispatchEvent(new CustomEvent('ch-update-hdri', {
        detail: {
          id: selectedHDRI,
          intensity,
          rotation,
          showBackground,
        }
      }));
    }
  };

  return (
    <Box sx={{ p: 1.5, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Typography variant="subtitle2" sx={{ color: '#00a8ff', mb: 1.5, fontWeight: 600 }}>
        HDRI Miljø
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.id}
            icon={cat.icon || undefined}
            label={cat.name}
            size="small"
            onClick={() => setCategory(cat.id)}
            sx={{
              bgcolor: category === cat.id ? '#00a8ff' : '#333',
              color: category === cat.id ? '#fff' : '#aaa',
              fontSize: 11,
              '&:hover': { bgcolor: category === cat.id ? '#00a8ff' : '#444' },
            }}
          />
        ))}
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 1,
        mb: 2,
      }}>
        {filteredPresets.map((hdri) => (
          <Card 
            key={hdri.id}
            onClick={() => handleSelectHDRI(hdri)}
            sx={{ 
              bgcolor: '#252525', 
              cursor: 'pointer',
              border: selectedHDRI === hdri.id ? '2px solid #00a8ff' : '2px solid transparent',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: '#303030',
              },
              position: 'relative',
            }}
          >
            {selectedHDRI === hdri.id && (
              <CheckCircle 
                sx={{ 
                  position: 'absolute', 
                  top: 4, 
                  right: 4, 
                  color: '#00a8ff',
                  fontSize: 18,
                  bgcolor: '#1a1a1a',
                  borderRadius: '50%',
                }} 
              />
            )}
            <CardMedia
              component="img"
              height="60"
              image={hdri.thumbnail}
              alt={hdri.name}
              sx={{ objectFit: 'cover' }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect fill="%23333" width="100%" height="100%"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">HDRI</text></svg>';
              }}
            />
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Typography variant="body2" sx={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>
                {hdri.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', fontSize: 9 }}>
                {hdri.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {selectedHDRI && (
        <Box sx={{ p: 1.5, bgcolor: '#252525', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
            Innstillinger
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Intensitet: {intensity.toFixed(1)}
            </Typography>
            <Slider
              value={intensity}
              onChange={(_, v) => setIntensity(v as number)}
              onChangeCommitted={updateHDRISettings}
              min={0}
              max={3}
              step={0.1}
              sx={{ color: '#00a8ff' }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Rotasjon: {rotation}°
            </Typography>
            <Slider
              value={rotation}
              onChange={(_, v) => setRotation(v as number)}
              onChangeCommitted={updateHDRISettings}
              min={0}
              max={360}
              step={15}
              sx={{ color: '#00a8ff' }}
            />
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={() => { setShowBackground(!showBackground); setTimeout(updateHDRISettings, 0); }}
            sx={{
              width: '100%',
              borderColor: showBackground ? '#00a8ff' : '#444',
              color: showBackground ? '#00a8ff' : '#888',
            }}
          >
            {showBackground ? 'Skjul bakgrunn' : 'Vis bakgrunn'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default HDRIPanel;
