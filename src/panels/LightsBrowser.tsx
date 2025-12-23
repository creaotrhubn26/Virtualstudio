import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Divider,
  Paper,
  useMediaQuery,
  InputBase,
} from '@mui/material';
import {
  Add as AddIcon,
  Lightbulb,
  FlashOn,
  Camera,
  Search as SearchIcon,
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
  { id: 'godox-ad200pro', brand: 'Godox', model: 'AD200 Pro', type: 'strobe', power: 200, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 52, flashDuration: '1/220-1/13000', recycleTime: 0.5, lumens: 8000, thumbnail: '/images/gear/godox_ad200_pro.png' },
  { id: 'godox-ad400pro', brand: 'Godox', model: 'AD400 Pro', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5600, cri: 96, guideNumber: 72, flashDuration: '1/220-1/10000', recycleTime: 0.75, lumens: 16000, thumbnail: '/images/gear/godox_ad400_pro.png' },
  { id: 'godox-ad600pro', brand: 'Godox', model: 'AD600 Pro', type: 'strobe', power: 600, powerUnit: 'Ws', cct: 5600, cri: 97, guideNumber: 87, flashDuration: '1/220-1/10100', recycleTime: 0.9, lumens: 24000, thumbnail: '/images/gear/godox_ad600_pro.png' },
  { id: 'profoto-b10', brand: 'Profoto', model: 'B10', type: 'strobe', power: 250, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 72, flashDuration: '1/400-1/14000', recycleTime: 2.0, lumens: 10000, lux1m: 10000, thumbnail: '/images/gear/profoto_b10.png' },
  { id: 'profoto-b10plus', brand: 'Profoto', model: 'B10 Plus', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 96, guideNumber: 102, flashDuration: '1/400-1/50000', recycleTime: 2.5, lumens: 20000, lux1m: 15000, thumbnail: '/images/gear/profoto_b10_plus.png' },
  { id: 'profoto-d2', brand: 'Profoto', model: 'D2 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 98, guideNumber: 145, flashDuration: '1/1000-1/63000', recycleTime: 0.6, lumens: 40000, thumbnail: '/images/gear/profoto_d2_1000.png' },
  { id: 'aputure-120d', brand: 'Aputure', model: 'LS 120d II', type: 'led', power: 135, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 20000, beamAngle: 55, lumens: 7100, thumbnail: '/images/gear/aputure_120d_ii.png' },
  { id: 'aputure-300d', brand: 'Aputure', model: 'LS 300d II', type: 'led', power: 350, powerUnit: 'W', cct: 5500, cri: 96, tlci: 97, lux1m: 45000, beamAngle: 55, lumens: 18500, thumbnail: '/images/gear/aputure_300d_ii.png' },
  { id: 'aputure-600d', brand: 'Aputure', model: 'LS 600d Pro', type: 'led', power: 720, powerUnit: 'W', cct: 5600, cri: 96, tlci: 98, lux1m: 86000, beamAngle: 55, lumens: 36000, thumbnail: '/images/gear/aputure_600d_pro.png' },
  { id: 'aputure-60x', brand: 'Aputure', model: 'LS 60x', type: 'led', power: 80, powerUnit: 'W', cct: 5500, cri: 95, tlci: 96, lux1m: 12000, beamAngle: 15, lumens: 3000, thumbnail: '/images/gear/aputure_60x.png' },
  { id: 'nanlite-forza60', brand: 'Nanlite', model: 'Forza 60', type: 'led', power: 60, powerUnit: 'W', cct: 5600, cri: 98, tlci: 97, lux1m: 16500, beamAngle: 120, lumens: 2900, thumbnail: '/images/gear/nanlite_forza_60.png' },
  { id: 'nanlite-forza300', brand: 'Nanlite', model: 'Forza 300', type: 'led', power: 300, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 38000, beamAngle: 120, lumens: 13600, thumbnail: '/images/gear/nanlite_forza_300.png' },
  { id: 'nanlite-forza500', brand: 'Nanlite', model: 'Forza 500', type: 'led', power: 500, powerUnit: 'W', cct: 5600, cri: 98, tlci: 98, lux1m: 62000, beamAngle: 120, lumens: 22000, thumbnail: '/images/gear/nanlite_forza_500.png' },
  { id: 'elinchrom-elc500', brand: 'Elinchrom', model: 'ELC Pro HD 500', type: 'strobe', power: 500, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 90, flashDuration: '1/3800-1/5000', recycleTime: 0.6, lumens: 20000, thumbnail: '/images/gear/elinchrom_elc_500.png' },
  { id: 'elinchrom-elc1000', brand: 'Elinchrom', model: 'ELC Pro HD 1000', type: 'strobe', power: 1000, powerUnit: 'Ws', cct: 5500, cri: 97, guideNumber: 128, flashDuration: '1/2200-1/5000', recycleTime: 0.9, lumens: 40000, thumbnail: '/images/gear/elinchrom_elc_1000.png' },
  { id: 'broncolor-siros400', brand: 'Broncolor', model: 'Siros 400 S', type: 'strobe', power: 400, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 76, flashDuration: '1/2000-1/11000', recycleTime: 0.6, lumens: 16000, thumbnail: '/images/gear/broncolor_siros_400.png' },
  { id: 'broncolor-siros800', brand: 'Broncolor', model: 'Siros 800 S', type: 'strobe', power: 800, powerUnit: 'Ws', cct: 5500, cri: 99, guideNumber: 108, flashDuration: '1/1600-1/11000', recycleTime: 0.8, lumens: 32000, thumbnail: '/images/gear/broncolor_siros_800.png' },
];

interface CategoryInfo {
  key: string;
  label: string;
  logo?: string;
}

const LIGHT_CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'strobe', label: 'Blits' },
  { key: 'led', label: 'LED' },
];

const LIGHT_BRANDS: CategoryInfo[] = [
  { key: 'all', label: 'Alle merker' },
  { key: 'Godox', label: 'Godox' },
  { key: 'Profoto', label: 'Profoto' },
  { key: 'Aputure', label: 'Aputure' },
  { key: 'Nanlite', label: 'Nanlite' },
  { key: 'Elinchrom', label: 'Elinchrom' },
  { key: 'Broncolor', label: 'Broncolor' },
];

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

const MODIFIER_CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'softbox', label: 'Softboks' },
  { key: 'octabox', label: 'Oktaboks' },
  { key: 'umbrella', label: 'Paraply' },
  { key: 'beauty-dish', label: 'Beauty Dish' },
  { key: 'grid', label: 'Grid' },
];

type BrowserTab = 'lights' | 'modifiers';

export function LightsBrowser() {
  const { addNode } = useAppStore();
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const shouldUseTabletMode = isTablet || isTouchDevice;

  const [activeTab, setActiveTab] = useState<BrowserTab>('lights');
  const [selectedTypeCategory, setSelectedTypeCategory] = useState('all');
  const [selectedBrandCategory, setSelectedBrandCategory] = useState('all');
  const [selectedModifierCategory, setSelectedModifierCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modifierSearchQuery, setModifierSearchQuery] = useState('');

  const filteredLights = useMemo(() => {
    return LIGHT_DATABASE.filter((light) => {
      const matchesType = selectedTypeCategory === 'all' || light.type === selectedTypeCategory;
      const matchesBrand = selectedBrandCategory === 'all' || light.brand === selectedBrandCategory;
      const matchesSearch = searchQuery === '' || 
        light.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        light.model.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesBrand && matchesSearch;
    });
  }, [selectedTypeCategory, selectedBrandCategory, searchQuery]);

  const filteredModifiers = useMemo(() => {
    return MODIFIER_DATABASE.filter((mod) => {
      const matchesType = selectedModifierCategory === 'all' || mod.type === selectedModifierCategory;
      const matchesSearch = modifierSearchQuery === '' || 
        mod.brand.toLowerCase().includes(modifierSearchQuery.toLowerCase()) ||
        mod.model.toLowerCase().includes(modifierSearchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [selectedModifierCategory, modifierSearchQuery]);

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
    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'transparent', color: '#fff' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Lightbulb sx={{ color: '#fbbf24' }} />
        <Typography variant="subtitle1" fontWeight={600}>Lyskilder</Typography>
        <Chip
          label={`${LIGHT_DATABASE.length} lys`}
          size="medium"
          sx={{ 
            ml: 'auto', 
            bgcolor: '#fbbf24', 
            color: '#000',
            fontSize: 14,
            fontWeight: 700,
            px: 1.5,
            height: 32,
            boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      </Box>

      {/* Main tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          mb: 2, 
          minHeight: shouldUseTabletMode ? 48 : 36,
          '& .MuiTabs-scrollButtons': {
            minWidth: shouldUseTabletMode ? 44 : 32,
          },
        }}
      >
        <Tab value="lights" label="Lyskilder" sx={{ minHeight: shouldUseTabletMode ? 48 : 36, py: shouldUseTabletMode ? 1 : 0, fontSize: shouldUseTabletMode ? 14 : 12 }} />
        <Tab value="modifiers" label="Lysformere" sx={{ minHeight: shouldUseTabletMode ? 48 : 36, py: shouldUseTabletMode ? 1 : 0, fontSize: shouldUseTabletMode ? 14 : 12 }} />
      </Tabs>

      {activeTab === 'lights' && (
        <>
          {/* Type category buttons with search */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {LIGHT_CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                variant={selectedTypeCategory === cat.key ? 'contained' : 'outlined'}
                size="medium"
                onClick={() => setSelectedTypeCategory(cat.key)}
                startIcon={cat.key === 'strobe' ? <FlashOn /> : cat.key === 'led' ? <Lightbulb /> : undefined}
                sx={{ 
                  fontSize: 13, 
                  py: 1.5, 
                  px: 2.5,
                  minHeight: 48,
                  minWidth: 90,
                  borderRadius: 2,
                  fontWeight: selectedTypeCategory === cat.key ? 700 : 500,
                  bgcolor: selectedTypeCategory === cat.key ? '#fbbf24' : 'transparent',
                  borderColor: selectedTypeCategory === cat.key ? '#fbbf24' : '#555',
                  color: selectedTypeCategory === cat.key ? '#000' : '#ccc',
                  boxShadow: selectedTypeCategory === cat.key ? '0 4px 12px rgba(251, 191, 36, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: selectedTypeCategory === cat.key ? '#f59e0b' : 'rgba(251, 191, 36, 0.15)',
                    borderColor: '#fbbf24',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
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
              borderRadius: 2, 
              px: 1.5, 
              py: 0.5,
              minHeight: 48,
              border: '1px solid #444',
              flex: 1,
              minWidth: 120,
              maxWidth: 200,
            }}>
              <SearchIcon sx={{ color: '#888', fontSize: 20, mr: 1 }} />
              <InputBase
                placeholder="Søk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  color: '#fff',
                  fontSize: 14,
                  flex: 1,
                  '& input::placeholder': { color: '#666', opacity: 1 },
                }}
              />
            </Box>
          </Box>

          {/* Brand category buttons */}
          <Typography variant="body2" sx={{ color: '#aaa', mb: 1.5, display: 'block', fontSize: 13, fontWeight: 600 }}>
            Merke
          </Typography>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {LIGHT_BRANDS.map((brand) => (
              <Button
                key={brand.key}
                variant={selectedBrandCategory === brand.key ? 'contained' : 'outlined'}
                size="large"
                onClick={() => setSelectedBrandCategory(brand.key)}
                sx={{ 
                  fontSize: 14, 
                  py: 1.5, 
                  px: 2.5,
                  minHeight: 52,
                  minWidth: 100,
                  borderRadius: 2,
                  fontWeight: selectedBrandCategory === brand.key ? 700 : 600,
                  bgcolor: selectedBrandCategory === brand.key ? '#3b82f6' : '#2a2a2a',
                  borderColor: selectedBrandCategory === brand.key ? '#3b82f6' : '#555',
                  borderWidth: 2,
                  color: selectedBrandCategory === brand.key ? '#fff' : '#ddd',
                  boxShadow: selectedBrandCategory === brand.key ? '0 4px 12px rgba(59, 130, 246, 0.4)' : '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  '&:hover': {
                    bgcolor: selectedBrandCategory === brand.key ? '#2563eb' : '#3a3a3a',
                    borderColor: '#3b82f6',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.3)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {brand.label}
              </Button>
            ))}
          </Box>

          <Divider sx={{ my: 1.5, borderColor: '#333' }} />

          {/* Lights grid */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 1.5,
            }}>
              {filteredLights.map((light) => (
                <Card
                  key={light.id}
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid #444',
                    backgroundColor: '#1e1e1e',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      borderColor: '#fbbf24',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height={100}
                    image={light.thumbnail || '/images/gear/default_light.png'}
                    alt={light.model}
                    sx={{ backgroundColor: '#2a2a2a', objectFit: 'contain', p: 1.5 }}
                  />
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#888', fontSize: 10 }}>
                      {light.brand}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: '#fff', fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                      {light.model}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#888', fontSize: 11, mb: 1 }}>
                      {light.power} {light.powerUnit} • {light.type === 'strobe' ? 'Blits' : 'LED'}
                    </Typography>
                    <Button
                      size="medium"
                      startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                      onClick={() => handleAddToScene(light)}
                      aria-label={`Legg til ${light.model}`}
                      sx={{ 
                        width: '100%', 
                        fontSize: 12,
                        fontWeight: 600,
                        py: 1.25,
                        minHeight: 48,
                        borderRadius: 1.5,
                        bgcolor: '#fbbf24',
                        color: '#000',
                        boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          bgcolor: '#f59e0b',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    >
                      Legg til
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        </>
      )}

      {activeTab === 'modifiers' && (
        <>
          {/* Modifier type category buttons with search */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {MODIFIER_CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                variant={selectedModifierCategory === cat.key ? 'contained' : 'outlined'}
                size="medium"
                onClick={() => setSelectedModifierCategory(cat.key)}
                sx={{ 
                  fontSize: 13, 
                  py: 1.5, 
                  px: 2.5,
                  minHeight: 48,
                  minWidth: 90,
                  borderRadius: 2,
                  fontWeight: selectedModifierCategory === cat.key ? 700 : 500,
                  bgcolor: selectedModifierCategory === cat.key ? '#8b5cf6' : 'transparent',
                  borderColor: selectedModifierCategory === cat.key ? '#8b5cf6' : '#555',
                  color: selectedModifierCategory === cat.key ? '#fff' : '#ccc',
                  boxShadow: selectedModifierCategory === cat.key ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: selectedModifierCategory === cat.key ? '#7c3aed' : 'rgba(139, 92, 246, 0.15)',
                    borderColor: '#8b5cf6',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
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
              borderRadius: 2, 
              px: 1.5, 
              py: 0.5,
              minHeight: 48,
              border: '1px solid #444',
              flex: 1,
              minWidth: 120,
              maxWidth: 200,
            }}>
              <SearchIcon sx={{ color: '#888', fontSize: 20, mr: 1 }} />
              <InputBase
                placeholder="Søk..."
                value={modifierSearchQuery}
                onChange={(e) => setModifierSearchQuery(e.target.value)}
                sx={{
                  color: '#fff',
                  fontSize: 14,
                  flex: 1,
                  '& input::placeholder': { color: '#666', opacity: 1 },
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 1.5, borderColor: '#333' }} />

          {/* Modifiers grid */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 1.5,
            }}>
              {filteredModifiers.map((modifier) => (
                <Card
                  key={modifier.id}
                  sx={{
                    cursor: 'pointer',
                    border: '1px solid #444',
                    backgroundColor: '#1e1e1e',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      borderColor: '#8b5cf6',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height={100}
                    image={modifier.thumbnail || '/images/gear/default_modifier.png'}
                    alt={modifier.model}
                    sx={{ backgroundColor: '#2a2a2a', objectFit: 'contain', p: 1.5 }}
                  />
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" sx={{ color: '#888', fontSize: 10 }}>
                      {modifier.brand}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: '#fff', fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                      {modifier.model}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#888', fontSize: 11, mb: 1 }}>
                      {getModifierTypeLabel(modifier.type)} {modifier.size ? `• ${modifier.size}` : ''}
                    </Typography>
                    <Button
                      size="medium"
                      startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                      onClick={() => handleAddModifier(modifier)}
                      aria-label={`Legg til ${modifier.model}`}
                      sx={{ 
                        width: '100%', 
                        fontSize: 12,
                        fontWeight: 600,
                        py: 1.25,
                        minHeight: 48,
                        borderRadius: 1.5,
                        bgcolor: '#8b5cf6',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          bgcolor: '#7c3aed',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                      }}
                    >
                      Legg til
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
}

export default LightsBrowser;
