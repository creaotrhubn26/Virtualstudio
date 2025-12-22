import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  Button,
  Tooltip,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useAppStore } from '../state/store';

interface LightSpec {
  id: string;
  brand: string;
  model: string;
  type: 'strobe' | 'continuous' | 'led' | 'flash';
  power: number;
  powerUnit: 'Ws' | 'W';
  cct?: number;
  cri?: number;
  tlci?: number;
  lux1m?: number;
  beamAngle?: number;
  guideNumber?: number;
  flashDuration?: string;
  recycleTime?: number;
  lumens?: number;
  price?: number;
  thumbnail?: string;
}

const LIGHT_DATABASE: LightSpec[] = [
  { id: 'godox-ad600pro', brand: 'Godox', model: 'AD600 Pro', type: 'strobe', power: 600, powerUnit: 'Ws', cct: 5600, cri: 97, guideNumber: 87, flashDuration: '1/220-1/10100', recycleTime: 0.9, lumens: 24000, thumbnail: '/images/gear/godox_ad600_pro_strobe.png' },
  { id: 'godox-ad200pro', brand: 'Godox', model: 'AD200 Pro', type: 'strobe', power: 200, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 52, flashDuration: '1/220-1/13000', recycleTime: 0.5, lumens: 8000, thumbnail: '/images/gear/godox_ad600_pro_strobe.png' },
  { id: 'godox-ad400pro', brand: 'Godox', model: 'AD400 Pro', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 72, flashDuration: '1/220-1/10000', recycleTime: 0.75, lumens: 16000, thumbnail: '/images/gear/godox_ad600_pro_strobe.png' },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10', type: 'strobe', power: 250, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 72, flashDuration: '1/400-1/14000', recycleTime: 2.0, lumens: 10000, lux1m: 10000, thumbnail: '/images/gear/profoto_b10_flash.png' },
  { id: 'profoto-b10plus', brand: 'Profoto', model: 'B10 Plus', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 102, flashDuration: '1/400-1/50000', recycleTime: 2.5, lumens: 20000, lux1m: 15000, thumbnail: '/images/gear/profoto_b10_flash.png' },
  { id: 'profoto-d2', brand: 'Profoto', model: 'D2 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 98, guideNumber: 145, flashDuration: '1/1000-1/63000', recycleTime: 0.6, lumens: 40000, thumbnail: '/images/gear/profoto_b10_flash.png' },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120d II', type: 'led', power: 135, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 20000, beamAngle: 55, lumens: 7100, thumbnail: '/images/gear/aputure_300d_ii_led.png' },
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300d II', type: 'led', power: 350, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 45000, beamAngle: 55, lumens: 18500, thumbnail: '/images/gear/aputure_300d_ii_led.png' },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600d Pro', type: 'led', power: 720, powerUnit: 'W', cct: 5600, cri: 96, tlci: 98, lux1m: 86000, beamAngle: 55, lumens: 36000, thumbnail: '/images/gear/aputure_300d_ii_led.png' },
  { id: 'aputure-60x', brand: 'Aputure', model: 'LS 60x', type: 'led', power: 80, powerUnit: 'W', cct: 5500, cri: 95, tlci: 96, lux1m: 12000, beamAngle: 15, lumens: 3000, thumbnail: '/images/gear/aputure_300d_ii_led.png' },
  { id: 'nanlite-forza60', brand: 'Nanlite', model: 'Forza 60', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 98, tlci: 97, lux1m: 16500, beamAngle: 120, lumens: 2900, thumbnail: '/images/gear/nanlite_forza_300_led.png' },
  { id: 'nanlite-forza300', brand: 'Nanlite', model: 'Forza 300', type: 'led', power: 300, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 38000, beamAngle: 120, lumens: 13600, thumbnail: '/images/gear/nanlite_forza_300_led.png' },
  { id: 'nanlite-forza500', brand: 'Nanlite', model: 'Forza 500', type: 'led', power: 500, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 62000, beamAngle: 120, lumens: 22000, thumbnail: '/images/gear/nanlite_forza_300_led.png' },
  { id: 'elinchrom-elc500', brand: 'Elinchrom', model: 'ELC Pro HD 500', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 90, flashDuration: '1/3800-1/5000', recycleTime: 0.6, lumens: 20000, thumbnail: '/images/gear/elinchrom_elc_pro_strobe.png' },
  { id: 'elinchrom-elc1000', brand: 'Elinchrom', model: 'ELC Pro HD 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 128, flashDuration: '1/2200-1/5000', recycleTime: 0.9, lumens: 40000, thumbnail: '/images/gear/elinchrom_elc_pro_strobe.png' },
  { id: 'broncolor-siros400', brand: 'Broncolor', model: 'Siros 400 S', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 76, flashDuration: '1/2000-1/11000', recycleTime: 0.6, lumens: 16000, thumbnail: '/images/gear/broncolor_siros_strobe.png' },
  { id: 'broncolor-siros800', brand: 'Broncolor', model: 'Siros 800 S', type: 'strobe', power: 800, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 108, flashDuration: '1/1600-1/11000', recycleTime: 0.8, lumens: 32000, thumbnail: '/images/gear/broncolor_siros_strobe.png' },
];

const BRANDS = ['Alle', 'Godox', 'Profoto', 'Aputure', 'Nanlite', 'Elinchrom', 'Broncolor'];
const TYPES = ['Alle', 'strobe', 'led', 'continuous', 'flash'];

export function LightsBrowser() {
  const { addNode } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('Alle');
  const [typeFilter, setTypeFilter] = useState('Alle');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filteredLights = useMemo(() => {
    return LIGHT_DATABASE.filter((light) => {
      const matchesSearch = searchQuery === '' || 
        light.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        light.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = brandFilter === 'Alle' || light.brand === brandFilter;
      const matchesType = typeFilter === 'Alle' || light.type === typeFilter;
      return matchesSearch && matchesBrand && matchesType;
    });
  }, [searchQuery, brandFilter, typeFilter]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddToScene = (light: LightSpec) => {
    const nodeId = `light-${light.id}-${Date.now()}`;
    
    addNode({
      id: nodeId,
      type: 'light',
      name: `${light.brand} ${light.model}`,
      transform: {
        position: [0, 2, 2],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      visible: true,
      userData: {
        brand: light.brand,
        model: light.model,
        lightType: light.type,
        power: light.power,
        powerUnit: light.powerUnit,
        cct: light.cct,
        cri: light.cri,
        tlci: light.tlci,
        lux1m: light.lux1m,
        beamAngle: light.beamAngle,
        guideNumber: light.guideNumber,
        lumens: light.lumens,
      },
    });

    window.dispatchEvent(new CustomEvent('ch-add-light', {
      detail: {
        id: nodeId,
        brand: light.brand,
        model: light.model,
        type: light.type,
        power: light.power,
        powerUnit: light.powerUnit,
        cct: light.cct,
        cri: light.cri,
        lux1m: light.lux1m,
        beamAngle: light.beamAngle,
        guideNumber: light.guideNumber,
        lumens: light.lumens,
      }
    }));
  };

  return (
    <Box sx={{ p: 1, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Søk lys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 150 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: '#888' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            displayEmpty
          >
            {BRANDS.map(brand => (
              <MenuItem key={brand} value={brand}>{brand}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            displayEmpty
          >
            {TYPES.map(type => (
              <MenuItem key={type} value={type}>{type === 'Alle' ? 'Alle' : type.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
        {filteredLights.length} lys funnet
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
        gap: 1 
      }}>
        {filteredLights.map((light) => (
          <Card 
            key={light.id}
            sx={{ 
              bgcolor: '#252525', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { 
                bgcolor: '#303030',
                transform: 'translateY(-2px)',
              },
              position: 'relative',
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(light.id); }}
              sx={{ 
                position: 'absolute', 
                top: 2, 
                right: 2, 
                color: favorites.has(light.id) ? '#ffd700' : '#666',
                p: 0.5,
              }}
            >
              {favorites.has(light.id) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
            </IconButton>
            
            <Box sx={{ 
              height: 60, 
              background: 'linear-gradient(135deg, #3a3a3a 0%, #5a5a5a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {light.thumbnail ? (
                <Box
                  component="img"
                  src={light.thumbnail}
                  alt={light.model}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography sx={{ fontSize: 24 }}>💡</Typography>
              )}
            </Box>
            
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                {light.brand}
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: 11 }}>
                {light.model}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip 
                  label={`${light.power} ${light.powerUnit}`} 
                  size="small" 
                  sx={{ height: 16, fontSize: 9, bgcolor: '#333' }} 
                />
                {light.cct && (
                  <Chip 
                    label={`${light.cct}K`} 
                    size="small" 
                    sx={{ height: 16, fontSize: 9, bgcolor: '#333' }} 
                  />
                )}
                {light.cri && (
                  <Chip 
                    label={`CRI ${light.cri}`} 
                    size="small" 
                    sx={{ height: 16, fontSize: 9, bgcolor: '#2a4a2a' }} 
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {light.guideNumber && (
                  <Chip 
                    label={`GN ${light.guideNumber}`} 
                    size="small" 
                    sx={{ height: 16, fontSize: 8, bgcolor: '#4a3a2a' }} 
                  />
                )}
                {light.lux1m && (
                  <Chip 
                    label={`${(light.lux1m / 1000).toFixed(0)}k lux`} 
                    size="small" 
                    sx={{ height: 16, fontSize: 8, bgcolor: '#2a3a4a' }} 
                  />
                )}
                {light.beamAngle && (
                  <Chip 
                    label={`${light.beamAngle}°`} 
                    size="small" 
                    sx={{ height: 16, fontSize: 8, bgcolor: '#3a3a4a' }} 
                  />
                )}
              </Box>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleAddToScene(light)}
                sx={{ 
                  mt: 0.5, 
                  width: '100%', 
                  fontSize: 10,
                  py: 0.25,
                  bgcolor: '#00a8ff22',
                  color: '#00a8ff',
                  '&:hover': { bgcolor: '#00a8ff44' },
                }}
              >
                Legg til
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export default LightsBrowser;
