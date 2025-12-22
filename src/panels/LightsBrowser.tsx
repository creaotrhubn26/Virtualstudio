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
  price?: number;
  thumbnail?: string;
}

const LIGHT_DATABASE: LightSpec[] = [
  { id: 'godox-ad600pro', brand: 'Godox', model: 'AD600 Pro', type: 'strobe', power: 600, powerUnit: 'Ws', cct: 5600, cri: 96 },
  { id: 'godox-ad200pro', brand: 'Godox', model: 'AD200 Pro', type: 'strobe', power: 200, powerUnit: 'Ws', cct: 5600, cri: 96 },
  { id: 'godox-ad400pro', brand: 'Godox', model: 'AD400 Pro', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5600, cri: 96 },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10', type: 'strobe', power: 250, powerUnit: 'Ws', cct: 5500, cri: 98 },
  { id: 'profoto-b10plus', brand: 'Profoto', model: 'B10 Plus', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 98 },
  { id: 'profoto-d2', brand: 'Profoto', model: 'D2 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 98 },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120d II', type: 'led', power: 120, powerUnit: 'W', cct: 5500, cri: 96 },
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300d II', type: 'led', power: 300, powerUnit: 'W', cct: 5500, cri: 96 },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600d Pro', type: 'led', power: 600, powerUnit: 'W', cct: 5600, cri: 96 },
  { id: 'aputure-60x', brand: 'Aputure', model: 'LS 60x', type: 'led', power: 60, powerUnit: 'W', cct: 2700, cri: 95 },
  { id: 'nanlite-forza60', brand: 'Nanlite', model: 'Forza 60', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 98 },
  { id: 'nanlite-forza300', brand: 'Nanlite', model: 'Forza 300', type: 'led', power: 300, powerUnit: 'W', cct: 5600, cri: 98 },
  { id: 'nanlite-forza500', brand: 'Nanlite', model: 'Forza 500', type: 'led', power: 500, powerUnit: 'W', cct: 5600, cri: 98 },
  { id: 'elinchrom-elc500', brand: 'Elinchrom', model: 'ELC Pro HD 500', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 97 },
  { id: 'elinchrom-elc1000', brand: 'Elinchrom', model: 'ELC Pro HD 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 97 },
  { id: 'broncolor-siros400', brand: 'Broncolor', model: 'Siros 400 S', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5500, cri: 99 },
  { id: 'broncolor-siros800', brand: 'Broncolor', model: 'Siros 800 S', type: 'strobe', power: 800, powerUnit: 'Ws', cct: 5500, cri: 99 },
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
      },
    });

    window.dispatchEvent(new CustomEvent('ch-add-light', {
      detail: {
        id: nodeId,
        brand: light.brand,
        model: light.model,
        type: light.type,
        power: light.power,
        cct: light.cct,
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
            }}>
              <Typography sx={{ fontSize: 24 }}>💡</Typography>
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
