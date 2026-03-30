import React, { useState, useMemo, useEffect } from 'react';
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
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Lightbulb,
  FlashOn,
  Camera,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAppStore } from '../state/store';
import { LIGHT_DATABASE, LightSpec } from '../data/lightFixtures';
import { AtmosphereSettings } from '../core/models/sceneComposer';
export type { LightSpec };
export { LIGHT_DATABASE };

interface CategoryInfo {
  key: string;
  label: string;
  logo?: string;
}

const LIGHT_CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'strobe', label: 'Blits' },
  { key: 'led', label: 'LED' },
  { key: 'continuous', label: 'Kontinuerlig' },
  { key: 'atmospheric', label: 'Atmosfærisk' },
  { key: 'practical', label: 'Praktisk' },
];

const LIGHT_BRANDS: CategoryInfo[] = [
  { key: 'all', label: 'Alle merker' },
  { key: 'Arri', label: 'Arri' },
  { key: 'Godox', label: 'Godox' },
  { key: 'Profoto', label: 'Profoto' },
  { key: 'Aputure', label: 'Aputure' },
  { key: 'Nanlite', label: 'Nanlite' },
  { key: 'Elinchrom', label: 'Elinchrom' },
  { key: 'Broncolor', label: 'Broncolor' },
  { key: 'Westcott', label: 'Westcott' },
  { key: 'Arri', label: 'Arri' },
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
  { id: 'snoot-conical', brand: 'Generic', model: 'Konisk Snoot', type: 'snoot', stopLoss: 0, thumbnail: '/images/gear/modifier_snoot.png' },
  { id: 'barn-doors-4leaf', brand: 'Generic', model: 'Barn Doors 4-Leaf', type: 'barn-doors', stopLoss: 0, thumbnail: '/images/gear/modifier_barndoors.png' },
  { id: 'reflector-5in1', brand: 'Generic', model: 'Reflektor 5-i-1', type: 'reflector', size: '110cm', stopLoss: 0.5, thumbnail: '/images/gear/reflector_5in1.png' },
  { id: 'godox-strip-20x90', brand: 'Godox', model: 'Strip 20x90cm', type: 'stripbox', size: '20x90cm', shape: 'strip', stopLoss: 1.5, mount: 'Bowens', thumbnail: '/images/gear/modifier_stripbox.png' },
  { id: 'elinchrom-rotalux-90', brand: 'Elinchrom', model: 'Rotalux 90cm Octa', type: 'octabox', size: '90cm', shape: 'octagon', stopLoss: 1.5, mount: 'Elinchrom', thumbnail: '/images/gear/modifier_octabox.png' },
  { id: 'elinchrom-rotalux-100', brand: 'Elinchrom', model: 'Rotalux 100cm Deep Octa', type: 'octabox', size: '100cm', shape: 'deep-octagon', stopLoss: 1.5, mount: 'Elinchrom', thumbnail: '/images/gear/modifier_octabox.png' },
  { id: 'profoto-beauty-65', brand: 'Profoto', model: 'Beauty Dish 65cm Hvit', type: 'beauty-dish', size: '65cm', stopLoss: 0.5, mount: 'Profoto', thumbnail: '/images/gear/modifier_beautydish.png' },
  { id: 'fomex-fl900', brand: 'Fomex', model: 'FL-900 Panel', type: 'softbox', size: '90cm', shape: 'rectangle', stopLoss: 1.5, mount: 'Bowens', thumbnail: '/images/gear/modifier_softbox.png' },
  { id: 'diffuser-1-4', brand: 'Lee Filters', model: 'Grid Cloth 1/4 Stop', type: 'diffuser', stopLoss: 0.5, thumbnail: '/images/gear/modifier_diffuser.png' },
  { id: 'diffuser-1-2', brand: 'Lee Filters', model: 'Grid Cloth 1/2 Stop', type: 'diffuser', stopLoss: 1.0, thumbnail: '/images/gear/modifier_diffuser.png' },
  { id: 'diffuser-full', brand: 'Lee Filters', model: 'Grid Cloth Full Stop', type: 'diffuser', stopLoss: 2.0, thumbnail: '/images/gear/modifier_diffuser.png' },
];

const MODIFIER_CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'softbox', label: 'Softboks' },
  { key: 'octabox', label: 'Oktaboks' },
  { key: 'stripbox', label: 'Stripboks' },
  { key: 'umbrella', label: 'Paraply' },
  { key: 'beauty-dish', label: 'Beauty Dish' },
  { key: 'reflector', label: 'Reflektor' },
  { key: 'grid', label: 'Grid' },
  { key: 'snoot', label: 'Snoot' },
  { key: 'barn-doors', label: 'Klaffedører' },
  { key: 'diffuser', label: 'Diffuser' },
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
  const [activeAtmosphere, setActiveAtmosphere] = useState<AtmosphereSettings | null>(null);

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

  // Listen to atmosphere changes
  useEffect(() => {
    const handleAtmosphere = (e: CustomEvent) => setActiveAtmosphere(e.detail);
    window.addEventListener('ch-atmosphere-changed', handleAtmosphere as EventListener);
    return () => window.removeEventListener('ch-atmosphere-changed', handleAtmosphere as EventListener);
  }, []);

  // Get recommended lights based on environment
  const getRecommendedLights = useMemo(() => {
    if (!activeAtmosphere) return [];
    
    // For Lovecraft environments: recommend low-intensity, warm-colored lights
    if (activeAtmosphere.fogEnabled && activeAtmosphere.fogColor && activeAtmosphere.fogColor.includes('0a')) {
      return LIGHT_DATABASE.filter(light => 
        light.cct < 4000 || // Warm color
        light.power < 200 || // Low power
        light.type === 'led-panel' // Continuous light for atmosphere
      ).slice(0, 3);
    }
    
    return [];
  }, [activeAtmosphere]);

  const handleAddToScene = (light: LightSpec) => {
    // Don't add a node to the store - let addLight in main.ts handle everything
    // This ensures the light and 3D model are properly connected
    const nodeId = `light-${light.id}-${Date.now()}`;

    // Dispatch event to add light - main.ts will create both the light and 3D model
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
      {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: 1.5,
        mb: 2,
      }}>
      <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          background: 'linear-gradient(135deg, rgba(243,156,18,0.15) 0%, rgba(241,196,15,0.15) 100%)',
          borderRadius: '14px',
          px: 2.5,
          py: 1.5,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
            boxShadow: '0 4px 12px rgba(243,156,18,0.4)',
          }}>
            <Lightbulb sx={{ fontSize: 24, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ 
              fontWeight: 800, 
              fontSize: 20,
              background: 'linear-gradient(90deg, #f5d76e 0%, #f7dc6f 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.3px',
            }}>
              Lys og lysformere
            </Typography>
            <Typography sx={{ 
              fontSize: 12, 
              color: '#888',
              fontWeight: 500,
            }}>
              Profesjonelle lyskilder og modifikatorer
            </Typography>
          </Box>
        </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${LIGHT_DATABASE.length} lys`}
            size="medium"
            sx={{ 
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
          <Chip
            label={`${MODIFIER_DATABASE.length} lysformere`}
            size="medium"
            sx={{ 
              bgcolor: '#8b5cf6', 
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              px: 1.5,
              height: 32,
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}
          />
        </Box>
      </Box>

      {/* Main tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          mb: 2, 
          minHeight: 60,
          '& .MuiTabs-scrollButtons': {
            minWidth: 44,
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            backgroundColor: '#fbbf24',
          },
        }}
      >
        <Tab 
          value="lights" 
          icon={<FlashOn sx={{ fontSize: 22 }} />}
          iconPosition="start"
          label="Lyskilder" 
          sx={{ 
            minHeight: 60, 
            py: 1.5, 
            px: 3,
            fontSize: 16, 
            fontWeight: 600,
            textTransform: 'none',
            color: activeTab === 'lights' ? '#fbbf24' : '#888',
            '&.Mui-selected': {
              color: '#fbbf24',
              fontWeight: 700,
            },
            '&:hover': {
              color: '#fbbf24',
              bgcolor: 'rgba(251, 191, 36, 0.1)',
            },
          }} 
        />
        <Tab 
          value="modifiers" 
          icon={<Camera sx={{ fontSize: 22 }} />}
          iconPosition="start"
          label="Lysformere" 
          sx={{ 
            minHeight: 60, 
            py: 1.5, 
            px: 3,
            fontSize: 16, 
            fontWeight: 600,
            textTransform: 'none',
            color: activeTab === 'modifiers' ? '#8b5cf6' : '#888',
            '&.Mui-selected': {
              color: '#8b5cf6',
              fontWeight: 700,
            },
            '&:hover': {
              color: '#8b5cf6',
              bgcolor: 'rgba(139, 92, 246, 0.1)',
            },
          }} 
        />
      </Tabs>

      {activeTab === 'lights' && (
        <>
          {/* Type category buttons with search */}
          {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {LIGHT_CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                variant={selectedTypeCategory === cat.key ? 'contained' : 'outlined'}
                size="large"
                onClick={() => setSelectedTypeCategory(cat.key)}
                startIcon={cat.key === 'strobe' ? <FlashOn sx={{ fontSize: 20 }} /> : cat.key === 'led' ? <Lightbulb sx={{ fontSize: 20 }} /> : undefined}
                sx={{ 
                  fontSize: 15, 
                  py: 1.5, 
                  px: 3,
                  minHeight: 56,
                  minWidth: 100,
                  borderRadius: '10px',
                  borderWidth: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: selectedTypeCategory === cat.key ? '#fbbf24' : 'transparent',
                  borderColor: selectedTypeCategory === cat.key ? '#fbbf24' : '#444',
                  color: selectedTypeCategory === cat.key ? '#000' : '#aaa',
                  boxShadow: selectedTypeCategory === cat.key ? '0 4px 12px rgba(251, 191, 36, 0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  '&:hover': {
                    bgcolor: selectedTypeCategory === cat.key ? '#f59e0b' : '#333',
                    borderColor: selectedTypeCategory === cat.key ? '#f59e0b' : '#555',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                  },
                  '&:active': {
                    transform: 'scale(0.97)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {cat.label}
              </Button>
            ))}
            {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

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
                placeholder="Søk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Brand category buttons */}
          <Typography variant="body2" sx={{ color: '#aaa', mb: 1.5, display: 'block', fontSize: 14, fontWeight: 600 }}>
            Merke
          </Typography>
          {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {LIGHT_BRANDS.map((brand) => (
              <Button
                key={brand.key}
                variant={selectedBrandCategory === brand.key ? 'contained' : 'outlined'}
                size="large"
                onClick={() => setSelectedBrandCategory(brand.key)}
                sx={{ 
                  fontSize: 15, 
                  py: 1.5, 
                  px: 3,
                  minHeight: 56,
                  minWidth: 110,
                  borderRadius: '10px',
                  borderWidth: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: selectedBrandCategory === brand.key ? '#3b82f6' : 'transparent',
                  borderColor: selectedBrandCategory === brand.key ? '#3b82f6' : '#444',
                  color: selectedBrandCategory === brand.key ? '#fff' : '#aaa',
                  boxShadow: selectedBrandCategory === brand.key ? '0 4px 12px rgba(59, 130, 246, 0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  '&:hover': {
                    bgcolor: selectedBrandCategory === brand.key ? '#2563eb' : '#333',
                    borderColor: selectedBrandCategory === brand.key ? '#2563eb' : '#555',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                  },
                  '&:active': {
                    transform: 'scale(0.97)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {brand.label}
              </Button>
            ))}
          </Box>

          <Divider sx={{ my: 1.5, borderColor: '#333' }} />

          {/* Lights grid */}
          {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
            {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

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
                    image={light.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="30" y="10" width="40" height="15" rx="2" fill="%23444"/%3E%3Cpath d="M40 25 L35 60 L65 60 L60 25 Z" fill="%23666"/%3E%3Ccircle cx="50" cy="65" r="20" fill="%23FFD700"/%3E%3Ccircle cx="50" cy="65" r="15" fill="%23FFF8DC"/%3E%3C/svg%3E'}
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
          {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {MODIFIER_CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                variant={selectedModifierCategory === cat.key ? 'contained' : 'outlined'}
                size="large"
                onClick={() => setSelectedModifierCategory(cat.key)}
                sx={{ 
                  fontSize: 15, 
                  py: 1.5, 
                  px: 3,
                  minHeight: 56,
                  minWidth: 100,
                  borderRadius: '10px',
                  borderWidth: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: selectedModifierCategory === cat.key ? '#8b5cf6' : 'transparent',
                  borderColor: selectedModifierCategory === cat.key ? '#8b5cf6' : '#444',
                  color: selectedModifierCategory === cat.key ? '#fff' : '#aaa',
                  boxShadow: selectedModifierCategory === cat.key ? '0 4px 12px rgba(139, 92, 246, 0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  '&:hover': {
                    bgcolor: selectedModifierCategory === cat.key ? '#7c3aed' : '#333',
                    borderColor: selectedModifierCategory === cat.key ? '#7c3aed' : '#555',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                  },
                  '&:active': {
                    transform: 'scale(0.97)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {cat.label}
              </Button>
            ))}
            {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

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
                placeholder="Søk..."
                value={modifierSearchQuery}
                onChange={(e) => setModifierSearchQuery(e.target.value)}
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

          <Divider sx={{ my: 1.5, borderColor: '#333' }} />

          {/* Modifiers grid */}
          {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
            {/* Atmosphere recommendations */}
      {activeAtmosphere && getRecommendedLights.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255,165,0,0.1)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#ff9800', mb: 1 }}>
            🌫️ Miljø-tilpassede anbefalinger
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
            Basert på aktivt miljø anbefaler vi disse lysene:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {getRecommendedLights.map(light => (
              <Chip 
                key={light.id}
                label={`${light.brand} ${light.model}`}
                size="small"
                onClick={() => handleAddToScene(light)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      )}

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
