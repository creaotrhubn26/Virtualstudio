import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Slider,
  Button,
  InputBase,
  Divider,
  useMediaQuery,
} from '@mui/material';
import {
  WbSunny,
  Brightness4,
  CloudQueue,
  NightsStay,
  Landscape,
  CheckCircle,
  Add as AddIcon,
  Search as SearchIcon,
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

interface CategoryInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryInfo[] = [
  { id: 'all', name: 'Alle', icon: null },
  { id: 'studio', name: 'Studio', icon: <Brightness4 sx={{ fontSize: 20 }} /> },
  { id: 'outdoor', name: 'Utendørs', icon: <Landscape sx={{ fontSize: 20 }} /> },
  { id: 'sunset', name: 'Solnedgang', icon: <WbSunny sx={{ fontSize: 20 }} /> },
  { id: 'overcast', name: 'Overskyet', icon: <CloudQueue sx={{ fontSize: 20 }} /> },
  { id: 'night', name: 'Natt', icon: <NightsStay sx={{ fontSize: 20 }} /> },
];

export function HDRIPanel() {
  const [selectedHDRI, setSelectedHDRI] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [intensity, setIntensity] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [showBackground, setShowBackground] = useState(true);
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  const filteredPresets = useMemo(() => {
    return HDRI_PRESETS.filter(hdri => {
      const matchesCategory = category === 'all' || hdri.category === category;
      const matchesSearch = search === '' ||
        hdri.name.toLowerCase().includes(search.toLowerCase()) ||
        hdri.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

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

  const handleAddHDRI = (hdri: HDRIPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectHDRI(hdri);
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

  const buttonStyle = {
    minHeight: 56,
    minWidth: 100,
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
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Typography variant="subtitle2" sx={{ color: '#00a8ff', mb: 2, fontWeight: 600, fontSize: 16 }}>
        HDRI Miljø
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORIES.map(cat => (
          <Button
            key={cat.id}
            variant={category === cat.id ? 'contained' : 'outlined'}
            startIcon={cat.icon}
            onClick={() => setCategory(cat.id)}
            sx={{
              ...buttonStyle,
              bgcolor: category === cat.id ? '#00a8ff' : 'transparent',
              borderColor: category === cat.id ? '#00a8ff' : '#444',
              color: category === cat.id ? '#fff' : '#aaa',
              boxShadow: category === cat.id ? '0 4px 12px rgba(0,168,255,0.3)' : '0 2px 6px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: category === cat.id ? '#0090dd' : '#333',
                borderColor: category === cat.id ? '#0090dd' : '#555',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              },
            }}
          >
            {cat.name}
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
            placeholder="Søk HDRI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      <Divider sx={{ my: 2, borderColor: '#333' }} />

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
        gap: 1.5,
        mb: 2,
      }}>
        {filteredPresets.map((hdri) => (
          <Card 
            key={hdri.id}
            onClick={() => handleSelectHDRI(hdri)}
            sx={{ 
              bgcolor: '#252525', 
              cursor: 'pointer',
              border: selectedHDRI === hdri.id ? '2px solid #00a8ff' : '2px solid #333',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': { 
                bgcolor: '#303030',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                borderColor: '#00a8ff',
              },
              position: 'relative',
            }}
          >
            {selectedHDRI === hdri.id && (
              <CheckCircle 
                sx={{ 
                  position: 'absolute', 
                  top: 6, 
                  right: 6, 
                  color: '#00a8ff',
                  fontSize: 22,
                  bgcolor: '#1a1a1a',
                  borderRadius: '50%',
                  zIndex: 1,
                }} 
              />
            )}
            <CardMedia
              component="img"
              height="80"
              image={hdri.thumbnail}
              alt={hdri.name}
              sx={{ objectFit: 'cover' }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect fill="%23333" width="100%" height="100%"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">HDRI</text></svg>';
              }}
            />
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" sx={{ color: '#fff', fontSize: 12, fontWeight: 600, mb: 0.5 }}>
                {hdri.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888', fontSize: 10, display: 'block', mb: 1, lineHeight: 1.3 }}>
                {hdri.description}
              </Typography>
              <Button
                size="medium"
                variant="contained"
                fullWidth
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={(e) => handleAddHDRI(hdri, e)}
                aria-label={`Legg til ${hdri.name}`}
                sx={{
                  minHeight: 44,
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: '#00a8ff',
                  borderRadius: '8px',
                  '&:hover': { bgcolor: '#0090dd' },
                  textTransform: 'none',
                }}
              >
                Legg til
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {selectedHDRI && (
        <Box sx={{ p: 2, bgcolor: '#252525', borderRadius: 2, border: '1px solid #333' }}>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
            Innstillinger
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#888', fontSize: 12 }}>
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
            <Typography variant="caption" sx={{ color: '#888', fontSize: 12 }}>
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
            size="large"
            variant="outlined"
            onClick={() => { setShowBackground(!showBackground); setTimeout(updateHDRISettings, 0); }}
            sx={{
              width: '100%',
              minHeight: 48,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: '10px',
              borderWidth: 2,
              borderColor: showBackground ? '#00a8ff' : '#444',
              color: showBackground ? '#00a8ff' : '#888',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#00a8ff',
                bgcolor: 'rgba(0, 168, 255, 0.1)',
              },
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
