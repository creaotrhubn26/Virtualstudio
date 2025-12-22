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
  useMediaQuery,
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

interface ModifierSpec {
  id: string;
  brand: string;
  model: string;
  type: 'softbox' | 'octabox' | 'stripbox' | 'umbrella' | 'beauty-dish' | 'reflector' | 'grid' | 'snoot' | 'barn-doors' | 'diffuser';
  size?: string;
  shape?: string;
  stopLoss?: number;
  mount?: string;
  thumbnail?: string;
}

const MODIFIER_DATABASE: ModifierSpec[] = [
  { id: 'profoto-ocf-60', brand: 'Profoto', model: 'OCF Softbox 60cm', type: 'softbox', size: '60cm', shape: 'square', stopLoss: 1.5, mount: 'OCF', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'profoto-ocf-90', brand: 'Profoto', model: 'OCF Softbox 90cm', type: 'softbox', size: '90cm', shape: 'rectangle', stopLoss: 1.5, mount: 'OCF', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'profoto-ocf-octa', brand: 'Profoto', model: 'OCF Octa 90cm', type: 'octabox', size: '90cm', shape: 'octagon', stopLoss: 1.5, mount: 'OCF', thumbnail: '/images/gear/modifier_octabox.png' },
  { id: 'profoto-ocf-strip', brand: 'Profoto', model: 'OCF Striplight 30x90', type: 'stripbox', size: '30x90cm', shape: 'strip', stopLoss: 1.5, mount: 'OCF', thumbnail: '/images/gear/modifier_stripbox.png' },
  { id: 'profoto-beauty', brand: 'Profoto', model: 'Softlight Reflector', type: 'beauty-dish', size: '65cm', stopLoss: 0.5, mount: 'Profoto', thumbnail: '/images/gear/modifier_beautydish.png' },
  { id: 'godox-qr-p90', brand: 'Godox', model: 'QR-P90 Parabolic', type: 'softbox', size: '90cm', shape: 'parabolic', stopLoss: 1.5, mount: 'Bowens', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'godox-qr-p120', brand: 'Godox', model: 'QR-P120 Parabolic', type: 'softbox', size: '120cm', shape: 'parabolic', stopLoss: 2.0, mount: 'Bowens', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'godox-sl60-softbox', brand: 'Godox', model: 'Lantern Softbox 65cm', type: 'softbox', size: '65cm', shape: 'lantern', stopLoss: 1.0, mount: 'Bowens', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'godox-octa-120', brand: 'Godox', model: 'Octa 120cm', type: 'octabox', size: '120cm', shape: 'octagon', stopLoss: 2.0, mount: 'Bowens', thumbnail: '/images/gear/modifier_octabox.png' },
  { id: 'godox-strip-35x160', brand: 'Godox', model: 'Strip 35x160cm', type: 'stripbox', size: '35x160cm', shape: 'strip', stopLoss: 2.0, mount: 'Bowens', thumbnail: '/images/gear/modifier_stripbox.png' },
  { id: 'aputure-light-dome', brand: 'Aputure', model: 'Light Dome II', type: 'softbox', size: '90cm', shape: 'parabolic', stopLoss: 1.5, mount: 'Bowens', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'aputure-lantern', brand: 'Aputure', model: 'Lantern 90', type: 'softbox', size: '90cm', shape: 'lantern', stopLoss: 1.0, mount: 'Bowens', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'aputure-fresnel', brand: 'Aputure', model: 'Fresnel 2X', type: 'reflector', size: '2X', stopLoss: -1.0, mount: 'Bowens', thumbnail: '/images/gear/modifier_reflector.png' },
  { id: 'westcott-rapid-box', brand: 'Westcott', model: 'Rapid Box Duo 32"', type: 'octabox', size: '32"', shape: 'octagon', stopLoss: 1.5, mount: 'Bowens', thumbnail: '/images/gear/modifier_octabox.png' },
  { id: 'westcott-scrim', brand: 'Westcott', model: 'Scrim Jim 4x4', type: 'diffuser', size: '4x4ft', stopLoss: 1.0, thumbnail: '/images/gear/modifier_diffuser.png' },
  { id: 'photoflex-umbrella-w', brand: 'Photoflex', model: 'Umbrella White 45"', type: 'umbrella', size: '45"', stopLoss: 1.0, thumbnail: '/images/gear/modifier_umbrella.png' },
  { id: 'photoflex-umbrella-s', brand: 'Photoflex', model: 'Umbrella Silver 45"', type: 'umbrella', size: '45"', stopLoss: 0.5, thumbnail: '/images/gear/modifier_umbrella.png' },
  { id: 'broncolor-para88', brand: 'Broncolor', model: 'Para 88', type: 'softbox', size: '88cm', shape: 'parabolic', stopLoss: 1.0, mount: 'Broncolor', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'broncolor-para133', brand: 'Broncolor', model: 'Para 133', type: 'softbox', size: '133cm', shape: 'parabolic', stopLoss: 1.5, mount: 'Broncolor', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'broncolor-beauty', brand: 'Broncolor', model: 'Beauty Dish', type: 'beauty-dish', size: '55cm', stopLoss: 0.5, mount: 'Broncolor', thumbnail: '/images/gear/modifier_beautydish.png' },
  { id: 'mola-setti', brand: 'Mola', model: 'Setti Beauty Dish 28"', type: 'beauty-dish', size: '28"', stopLoss: 0.5, mount: 'Bowens', thumbnail: '/images/gear/modifier_beautydish.png' },
  { id: 'honeycomb-grid-20', brand: 'Generic', model: 'Honeycomb Grid 20°', type: 'grid', size: '20°', stopLoss: 1.0, thumbnail: '/images/gear/modifier_grid.png' },
  { id: 'honeycomb-grid-40', brand: 'Generic', model: 'Honeycomb Grid 40°', type: 'grid', size: '40°', stopLoss: 0.5, thumbnail: '/images/gear/modifier_grid.png' },
  { id: 'snoot-standard', brand: 'Generic', model: 'Snoot Standard', type: 'snoot', stopLoss: 0, thumbnail: '/images/gear/modifier_snoot.png' },
  { id: 'barn-doors-4leaf', brand: 'Generic', model: 'Barn Doors 4-Leaf', type: 'barn-doors', stopLoss: 0, thumbnail: '/images/gear/modifier_barndoors.png' },
];

const MODIFIER_BRANDS = ['Alle', 'Profoto', 'Godox', 'Aputure', 'Westcott', 'Photoflex', 'Broncolor', 'Mola', 'Generic'];
const MODIFIER_TYPES = ['Alle', 'softbox', 'octabox', 'stripbox', 'umbrella', 'beauty-dish', 'reflector', 'grid', 'snoot', 'barn-doors', 'diffuser'];

type BrowserTab = 'lights' | 'modifiers';

export function LightsBrowser() {
  const { addNode } = useAppStore();
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const shouldUseTabletMode = isTablet || isTouchDevice;
  
  const [activeTab, setActiveTab] = useState<BrowserTab>('lights');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('Alle');
  const [typeFilter, setTypeFilter] = useState('Alle');
  const [modifierBrandFilter, setModifierBrandFilter] = useState('Alle');
  const [modifierTypeFilter, setModifierTypeFilter] = useState('Alle');
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

  const filteredModifiers = useMemo(() => {
    return MODIFIER_DATABASE.filter((mod) => {
      const matchesSearch = searchQuery === '' || 
        mod.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = modifierBrandFilter === 'Alle' || mod.brand === modifierBrandFilter;
      const matchesType = modifierTypeFilter === 'Alle' || mod.type === modifierTypeFilter;
      return matchesSearch && matchesBrand && matchesType;
    });
  }, [searchQuery, modifierBrandFilter, modifierTypeFilter]);

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

  const handleAddModifier = (modifier: ModifierSpec) => {
    const nodeId = `modifier-${modifier.id}-${Date.now()}`;
    
    addNode({
      id: nodeId,
      type: 'modifier',
      name: `${modifier.brand} ${modifier.model}`,
      transform: {
        position: [0, 2, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      visible: true,
      userData: {
        brand: modifier.brand,
        model: modifier.model,
        modifierType: modifier.type,
        size: modifier.size,
        shape: modifier.shape,
        stopLoss: modifier.stopLoss,
        mount: modifier.mount,
      },
    });

    window.dispatchEvent(new CustomEvent('ch-add-modifier', {
      detail: {
        id: nodeId,
        brand: modifier.brand,
        model: modifier.model,
        type: modifier.type,
        size: modifier.size,
        shape: modifier.shape,
        stopLoss: modifier.stopLoss,
        mount: modifier.mount,
      }
    }));
  };

  const getModifierTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'softbox': 'Softboks',
      'octabox': 'Oktaboks',
      'stripbox': 'Stripboks',
      'umbrella': 'Paraply',
      'beauty-dish': 'Beauty Dish',
      'reflector': 'Reflektor',
      'grid': 'Grid/Raster',
      'snoot': 'Snoot',
      'barn-doors': 'Klaffedører',
      'diffuser': 'Diffuser',
    };
    return labels[type] || type;
  };

  return (
    <Box sx={{ p: shouldUseTabletMode ? 2 : 1, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          mb: 1, 
          minHeight: shouldUseTabletMode ? 48 : 32, 
          '& .MuiTab-root': { 
            minHeight: shouldUseTabletMode ? 48 : 32, 
            py: shouldUseTabletMode ? 1 : 0.5, 
            fontSize: shouldUseTabletMode ? 14 : 12,
            minWidth: shouldUseTabletMode ? 100 : 'auto',
          },
          '& .MuiTabs-scrollButtons': {
            minWidth: shouldUseTabletMode ? 44 : 32,
          },
        }}
      >
        <Tab value="lights" label="Lyskilder" />
        <Tab value="modifiers" label="Lysformere" />
      </Tabs>

      {activeTab === 'lights' && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <TextField
              size={shouldUseTabletMode ? 'medium' : 'small'}
              placeholder="Søk lys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 150 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: shouldUseTabletMode ? 22 : 18, color: '#888' }} />
                  </InputAdornment>
                ),
                sx: { minHeight: shouldUseTabletMode ? 48 : 40 },
              }}
            />
            <FormControl size={shouldUseTabletMode ? 'medium' : 'small'} sx={{ minWidth: shouldUseTabletMode ? 120 : 100 }}>
              <Select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                displayEmpty
                sx={{ minHeight: shouldUseTabletMode ? 48 : 40 }}
              >
                {BRANDS.map(brand => (
                  <MenuItem key={brand} value={brand} sx={{ minHeight: shouldUseTabletMode ? 44 : 36 }}>{brand}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size={shouldUseTabletMode ? 'medium' : 'small'} sx={{ minWidth: shouldUseTabletMode ? 100 : 80 }}>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                displayEmpty
                sx={{ minHeight: shouldUseTabletMode ? 48 : 40 }}
              >
                {TYPES.map(type => (
                  <MenuItem key={type} value={type} sx={{ minHeight: shouldUseTabletMode ? 44 : 36 }}>{type === 'Alle' ? 'Alle' : type.toUpperCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block', fontSize: shouldUseTabletMode ? 13 : 11 }}>
            {filteredLights.length} lys funnet
          </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: shouldUseTabletMode 
          ? 'repeat(auto-fill, minmax(180px, 1fr))' 
          : 'repeat(auto-fill, minmax(140px, 1fr))', 
        gap: shouldUseTabletMode ? 2 : 1,
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
              aria-label={favorites.has(light.id) ? 'Fjern fra favoritter' : 'Legg til favoritter'}
              sx={{ 
                position: 'absolute', 
                top: 2, 
                right: 2, 
                color: favorites.has(light.id) ? '#ffd700' : '#666',
                minWidth: 44,
                minHeight: 44,
                p: shouldUseTabletMode ? 1 : 0.5,
              }}
            >
              {favorites.has(light.id) ? <StarIcon fontSize={shouldUseTabletMode ? 'medium' : 'small'} /> : <StarBorderIcon fontSize={shouldUseTabletMode ? 'medium' : 'small'} />}
            </IconButton>
            
            <Box sx={{ 
              height: shouldUseTabletMode ? 80 : 60, 
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
                <Typography sx={{ fontSize: shouldUseTabletMode ? 32 : 24 }}>💡</Typography>
              )}
            </Box>
            
            <CardContent sx={{ p: shouldUseTabletMode ? 1.5 : 1, '&:last-child': { pb: shouldUseTabletMode ? 1.5 : 1 } }}>
              <Typography variant="caption" sx={{ color: '#888', display: 'block', fontSize: shouldUseTabletMode ? 12 : 10 }}>
                {light.brand}
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: shouldUseTabletMode ? 13 : 11 }}>
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
                startIcon={<AddIcon sx={{ fontSize: shouldUseTabletMode ? 18 : 14 }} />}
                onClick={() => handleAddToScene(light)}
                aria-label={`Legg til ${light.model}`}
                sx={{ 
                  mt: 0.5, 
                  width: '100%', 
                  fontSize: shouldUseTabletMode ? 12 : 10,
                  py: shouldUseTabletMode ? 1 : 0.5,
                  minHeight: 44,
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
        </>
      )}

      {activeTab === 'modifiers' && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <TextField
              size={shouldUseTabletMode ? 'medium' : 'small'}
              placeholder="Søk lysformere..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 150 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: shouldUseTabletMode ? 22 : 18, color: '#888' }} />
                  </InputAdornment>
                ),
                sx: { minHeight: shouldUseTabletMode ? 48 : 40 },
              }}
            />
            <FormControl size={shouldUseTabletMode ? 'medium' : 'small'} sx={{ minWidth: shouldUseTabletMode ? 120 : 100 }}>
              <Select
                value={modifierBrandFilter}
                onChange={(e) => setModifierBrandFilter(e.target.value)}
                displayEmpty
                sx={{ minHeight: shouldUseTabletMode ? 48 : 40 }}
              >
                {MODIFIER_BRANDS.map(brand => (
                  <MenuItem key={brand} value={brand} sx={{ minHeight: shouldUseTabletMode ? 44 : 36 }}>{brand}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size={shouldUseTabletMode ? 'medium' : 'small'} sx={{ minWidth: shouldUseTabletMode ? 110 : 90 }}>
              <Select
                value={modifierTypeFilter}
                onChange={(e) => setModifierTypeFilter(e.target.value)}
                displayEmpty
                sx={{ minHeight: shouldUseTabletMode ? 48 : 40 }}
              >
                {MODIFIER_TYPES.map(type => (
                  <MenuItem key={type} value={type} sx={{ minHeight: shouldUseTabletMode ? 44 : 36 }}>{type === 'Alle' ? 'Alle' : getModifierTypeLabel(type)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block', fontSize: shouldUseTabletMode ? 13 : 11 }}>
            {filteredModifiers.length} lysformere funnet
          </Typography>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: shouldUseTabletMode 
              ? 'repeat(auto-fill, minmax(180px, 1fr))' 
              : 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: shouldUseTabletMode ? 2 : 1,
          }}>
            {filteredModifiers.map((modifier) => (
              <Card 
                key={modifier.id}
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
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(modifier.id); }}
                  aria-label={favorites.has(modifier.id) ? 'Fjern fra favoritter' : 'Legg til favoritter'}
                  sx={{ 
                    position: 'absolute', 
                    top: 2, 
                    right: 2, 
                    color: favorites.has(modifier.id) ? '#ffd700' : '#666',
                    minWidth: 44,
                    minHeight: 44,
                    p: shouldUseTabletMode ? 1 : 0.5,
                  }}
                >
                  {favorites.has(modifier.id) ? <StarIcon fontSize={shouldUseTabletMode ? 'medium' : 'small'} /> : <StarBorderIcon fontSize={shouldUseTabletMode ? 'medium' : 'small'} />}
                </IconButton>
                
                <Box sx={{ 
                  height: shouldUseTabletMode ? 80 : 60, 
                  background: 'linear-gradient(135deg, #2a3a4a 0%, #3a4a5a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {modifier.thumbnail ? (
                    <Box
                      component="img"
                      src={modifier.thumbnail}
                      alt={modifier.model}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: shouldUseTabletMode ? 32 : 24 }}>🔲</Typography>
                  )}
                </Box>
                
                <CardContent sx={{ p: shouldUseTabletMode ? 1.5 : 1, '&:last-child': { pb: shouldUseTabletMode ? 1.5 : 1 } }}>
                  <Typography variant="caption" sx={{ color: '#888', display: 'block', fontSize: shouldUseTabletMode ? 12 : 10 }}>
                    {modifier.brand}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: shouldUseTabletMode ? 13 : 11 }}>
                    {modifier.model}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip 
                      label={getModifierTypeLabel(modifier.type)} 
                      size="small" 
                      sx={{ height: shouldUseTabletMode ? 20 : 16, fontSize: shouldUseTabletMode ? 11 : 9, bgcolor: '#333' }} 
                    />
                    {modifier.size && (
                      <Chip 
                        label={modifier.size} 
                        size="small" 
                        sx={{ height: shouldUseTabletMode ? 20 : 16, fontSize: shouldUseTabletMode ? 11 : 9, bgcolor: '#333' }} 
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                    {modifier.mount && (
                      <Chip 
                        label={modifier.mount} 
                        size="small" 
                        sx={{ height: shouldUseTabletMode ? 20 : 16, fontSize: shouldUseTabletMode ? 10 : 8, bgcolor: '#2a3a4a' }} 
                      />
                    )}
                    {modifier.stopLoss !== undefined && (
                      <Chip 
                        label={modifier.stopLoss >= 0 ? `-${modifier.stopLoss} stop` : `+${Math.abs(modifier.stopLoss)} stop`} 
                        size="small" 
                        sx={{ height: shouldUseTabletMode ? 20 : 16, fontSize: shouldUseTabletMode ? 10 : 8, bgcolor: modifier.stopLoss >= 0 ? '#4a3a2a' : '#2a4a3a' }} 
                      />
                    )}
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: shouldUseTabletMode ? 18 : 14 }} />}
                    onClick={() => handleAddModifier(modifier)}
                    aria-label={`Legg til ${modifier.model}`}
                    sx={{ 
                      mt: 0.5, 
                      width: '100%', 
                      fontSize: shouldUseTabletMode ? 12 : 10,
                      py: shouldUseTabletMode ? 1 : 0.5,
                      minHeight: 44,
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
        </>
      )}
    </Box>
  );
}

export default LightsBrowser;
