import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  Tabs,
  Tab,
  Slider,
  Chip,
  Divider,
  useMediaQuery,
} from '@mui/material';
import { Person, Delete, Refresh, Add } from '@mui/icons-material';
import { logger } from '../core/services/logger';

const log = logger.module('CharacterLoader');

interface CharacterModel {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  category: 'wedding' | 'portrait' | 'fashion' | 'business';
  modelUrl: string;
  thumbnail: string;
  description: string;
  poses: number;
}

interface Pose {
  id: string;
  name: string;
  category: 'standing' | 'sitting' | 'action' | 'couple';
  thumbnail: string;
  description: string;
}

const createCharacterSVG = (type: 'female' | 'male' | 'couple', color = '#666') => {
  const svgs: Record<string, string> = {
    female: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="15"/><path d="M30 45h40l10 60H20z"/><path d="M35 105h10v40H35zM55 105h10v40H55z"/><ellipse cx="50" cy="45" rx="8" ry="3"/></svg>`,
    male: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="15"/><rect x="30" y="40" width="40" height="50" rx="5"/><rect x="35" y="90" width="12" height="45"/><rect x="53" y="90" width="12" height="45"/><rect x="20" y="45" width="15" height="8" rx="2"/><rect x="65" y="45" width="15" height="8" rx="2"/></svg>`,
    couple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" fill="${color}"><circle cx="45" cy="20" r="12"/><circle cx="105" cy="18" r="14"/><path d="M28 38h34l8 50H20z"/><rect x="80" y="36" width="50" height="45" rx="5"/><path d="M32 88h10v40H32zM48 88h10v40H48z"/><rect x="88" y="81" width="14" height="45"/><rect x="108" y="81" width="14" height="45"/></svg>`,
  };
  return `data:image/svg+xml,${encodeURIComponent(svgs[type])}`;
};

interface CategoryInfo {
  key: string;
  label: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'all', label: 'Alle' },
  { key: 'bryllup', label: 'Bryllup' },
  { key: 'portrett', label: 'Portrett' },
  { key: 'mote', label: 'Mote' },
  { key: 'næringsliv', label: 'Næringsliv' },
];

const CHARACTER_MODELS: CharacterModel[] = [
  {
    id: 'bride_01',
    name: 'Klassisk Brud',
    gender: 'female',
    category: 'bryllup' as any,
    modelUrl: '/models/characters/bride_01.glb',
    thumbnail: createCharacterSVG('female', '#f5f5f5'),
    description: 'Elegant bryllupsbrud med hvit kjole',
    poses: 15,
  },
  {
    id: 'groom_01',
    name: 'Klassisk Brudgom',
    gender: 'male',
    category: 'bryllup' as any,
    modelUrl: '/models/characters/groom_01.glb',
    thumbnail: createCharacterSVG('male', '#1a1a1a'),
    description: 'Profesjonell brudgom i svart smoking',
    poses: 15,
  },
  {
    id: 'portrait_f_01',
    name: 'Portrett Kvinne',
    gender: 'female',
    category: 'portrett' as any,
    modelUrl: '/models/characters/portrait_f_01.glb',
    thumbnail: createCharacterSVG('female', '#e8b4a0'),
    description: 'Naturlig portrettmodell - kvinne',
    poses: 25,
  },
  {
    id: 'portrait_m_01',
    name: 'Portrett Mann',
    gender: 'male',
    category: 'portrett' as any,
    modelUrl: '/models/characters/portrait_m_01.glb',
    thumbnail: createCharacterSVG('male', '#c9a082'),
    description: 'Naturlig portrettmodell - mann',
    poses: 25,
  },
  {
    id: 'fashion_f_01',
    name: 'Motemodell Kvinne',
    gender: 'female',
    category: 'mote' as any,
    modelUrl: '/models/characters/fashion_f_01.glb',
    thumbnail: createCharacterSVG('female', '#ff6b9d'),
    description: 'High fashion modell - kvinne',
    poses: 30,
  },
  {
    id: 'business_m_01',
    name: 'Forretningsmann',
    gender: 'male',
    category: 'næringsliv' as any,
    modelUrl: '/models/characters/business_m_01.glb',
    thumbnail: createCharacterSVG('male', '#1a365d'),
    description: 'Profesjonell næringslivsmodell - mann',
    poses: 20,
  },
];

const createPoseSVG = (pose: string, color = '#666') => {
  const poses: Record<string, string> = {
    stand: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100" fill="${color}"><circle cx="30" cy="12" r="10"/><line x1="30" y1="22" x2="30" y2="55" stroke="${color}" stroke-width="6"/><line x1="30" y1="55" x2="20" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="55" x2="40" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="30" x2="15" y2="50" stroke="${color}" stroke-width="4"/><line x1="30" y1="30" x2="45" y2="50" stroke="${color}" stroke-width="4"/></svg>`,
    confident: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100" fill="${color}"><circle cx="30" cy="12" r="10"/><line x1="30" y1="22" x2="30" y2="55" stroke="${color}" stroke-width="6"/><line x1="30" y1="55" x2="18" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="55" x2="42" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="32" x2="10" y2="45" stroke="${color}" stroke-width="4"/><line x1="30" y1="32" x2="50" y2="45" stroke="${color}" stroke-width="4"/></svg>`,
    sit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 80" fill="${color}"><circle cx="35" cy="10" r="9"/><line x1="35" y1="19" x2="35" y2="45" stroke="${color}" stroke-width="6"/><line x1="35" y1="45" x2="55" y2="48" stroke="${color}" stroke-width="5"/><line x1="55" y1="48" x2="55" y2="75" stroke="${color}" stroke-width="5"/><line x1="35" y1="45" x2="15" y2="48" stroke="${color}" stroke-width="5"/><line x1="15" y1="48" x2="15" y2="75" stroke="${color}" stroke-width="5"/></svg>`,
  };
  return `data:image/svg+xml,${encodeURIComponent(poses[pose] || poses.stand)}`;
};

const POSE_LIBRARY: Pose[] = [
  { id: 'stand_neutral', name: 'Nøytral', category: 'standing', thumbnail: createPoseSVG('stand', '#666'), description: 'Avslappet stående pose' },
  { id: 'stand_confident', name: 'Selvsikker', category: 'standing', thumbnail: createPoseSVG('confident', '#666'), description: 'Kraftig selvsikker pose' },
  { id: 'sit_chair', name: 'Sittende', category: 'sitting', thumbnail: createPoseSVG('sit', '#666'), description: 'Sittende på stol' },
  { id: 'stand_relaxed', name: 'Avslappet', category: 'standing', thumbnail: createPoseSVG('stand', '#888'), description: 'Naturlig avslappet stående' },
  { id: 'stand_formal', name: 'Formell', category: 'standing', thumbnail: createPoseSVG('confident', '#555'), description: 'Formell stående positur' },
  { id: 'sit_casual', name: 'Uformell sittende', category: 'sitting', thumbnail: createPoseSVG('sit', '#888'), description: 'Avslappet sittende pose' },
];

interface CharacterModelLoaderProps {
  onLoadCharacter?: (modelUrl: string, position?: [number, number, number]) => void;
  onRemoveCharacter?: () => void;
}

export const CharacterModelLoader: React.FC<CharacterModelLoaderProps> = ({
  onLoadCharacter,
  onRemoveCharacter,
}) => {
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const shouldUseTabletMode = isTablet || isTouchDevice;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<CharacterModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [skinTone, setSkinTone] = useState('#FFDAB9');
  const [height, setHeight] = useState(1.0);

  const filteredModels =
    selectedCategory === 'all'
      ? CHARACTER_MODELS
      : CHARACTER_MODELS.filter((model) => model.category === selectedCategory);

  const loadCharacter = useCallback(async (model: CharacterModel) => {
    setLoading(true);
    setSelectedModel(model);

    try {
      log.info(`Loading character: ${model.name}`);
      
      if (onLoadCharacter) {
        onLoadCharacter(model.modelUrl, [0, 0, 0]);
      }

      window.dispatchEvent(new CustomEvent('ch-load-character', {
        detail: {
          modelUrl: model.modelUrl,
          name: model.name,
          skinTone,
          height,
        },
      }));
    } catch (error) {
      log.error('Failed to load character:', error);
    } finally {
      setLoading(false);
    }
  }, [onLoadCharacter, skinTone, height]);

  const removeCharacter = useCallback(() => {
    setSelectedModel(null);
    setSelectedPose(null);
    if (onRemoveCharacter) {
      onRemoveCharacter();
    }
    window.dispatchEvent(new CustomEvent('ch-remove-character'));
    log.debug('Character removed');
  }, [onRemoveCharacter]);

  const applyPose = useCallback((pose: Pose) => {
    setSelectedPose(pose);
    window.dispatchEvent(new CustomEvent('ch-apply-pose', {
      detail: { poseId: pose.id, poseName: pose.name },
    }));
    log.debug(`Applied pose: ${pose.name}`);
  }, []);

  return (
    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'transparent', color: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Person sx={{ color: '#3b82f6' }} />
        <Typography variant="subtitle1" fontWeight={600}>Karakterer</Typography>
        <Chip
          label={`${CHARACTER_MODELS.length} modeller`}
          size="medium"
          sx={{ 
            ml: 'auto', 
            bgcolor: '#3b82f6', 
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            px: 1.5,
            height: 32,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        />
      </Box>

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
        <Tab label="Modeller" sx={{ minHeight: shouldUseTabletMode ? 48 : 36, py: shouldUseTabletMode ? 1 : 0, fontSize: shouldUseTabletMode ? 14 : 12 }} />
        <Tab label="Poser" sx={{ minHeight: shouldUseTabletMode ? 48 : 36, py: shouldUseTabletMode ? 1 : 0, fontSize: shouldUseTabletMode ? 14 : 12 }} />
        <Tab label="Tilpass" sx={{ minHeight: shouldUseTabletMode ? 48 : 36, py: shouldUseTabletMode ? 1 : 0, fontSize: shouldUseTabletMode ? 14 : 12 }} />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                variant={selectedCategory === cat.key ? 'contained' : 'outlined'}
                size="medium"
                onClick={() => setSelectedCategory(cat.key)}
                sx={{ 
                  fontSize: 13, 
                  py: 1.5, 
                  px: 2.5,
                  minHeight: 48,
                  minWidth: 90,
                  borderRadius: 2,
                  fontWeight: selectedCategory === cat.key ? 700 : 500,
                  bgcolor: selectedCategory === cat.key ? '#3b82f6' : 'transparent',
                  borderColor: selectedCategory === cat.key ? '#3b82f6' : '#555',
                  color: selectedCategory === cat.key ? '#fff' : '#ccc',
                  boxShadow: selectedCategory === cat.key ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: selectedCategory === cat.key ? '#2563eb' : 'rgba(59, 130, 246, 0.15)',
                    borderColor: '#3b82f6',
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
          </Box>

          <Divider sx={{ my: 1.5, borderColor: '#333' }} />

          <Box sx={{ 
            maxHeight: filteredModels.length > 6 ? 400 : 'none', 
            overflowY: filteredModels.length > 6 ? 'auto' : 'visible', 
            mb: 2 
          }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 1.5,
            }}>
              {filteredModels.map((model) => (
                <Card
                  key={model.id}
                  sx={{
                    cursor: 'pointer',
                    border: selectedModel?.id === model.id ? '2px solid #3b82f6' : '1px solid #444',
                    backgroundColor: '#1e1e1e',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      borderColor: '#3b82f6',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height={100}
                    image={model.thumbnail}
                    alt={model.name}
                    sx={{ backgroundColor: '#2a2a2a', objectFit: 'contain', p: 1.5 }}
                    onClick={() => loadCharacter(model)}
                  />
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="body2" noWrap sx={{ color: '#fff', fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                      {model.name}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#888', fontSize: 11, mb: 1 }}>
                      {model.poses} poser
                    </Typography>
                    <Button
                      size="medium"
                      startIcon={<Add sx={{ fontSize: 18 }} />}
                      onClick={() => loadCharacter(model)}
                      disabled={loading && selectedModel?.id === model.id}
                      aria-label={`Legg til ${model.name}`}
                      sx={{ 
                        width: '100%', 
                        fontSize: 12,
                        fontWeight: 600,
                        py: 1.25,
                        minHeight: 48,
                        borderRadius: 1.5,
                        bgcolor: selectedModel?.id === model.id ? '#22c55e' : '#3b82f6',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          bgcolor: selectedModel?.id === model.id ? '#16a34a' : '#2563eb',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                        '&:disabled': {
                          bgcolor: '#666',
                          color: '#aaa',
                        },
                      }}
                    >
                      {selectedModel?.id === model.id ? 'Aktiv' : 'Legg til'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          {selectedModel && (
            <Button
              variant="contained"
              startIcon={<Delete sx={{ fontSize: 20 }} />}
              onClick={removeCharacter}
              fullWidth
              size="large"
              sx={{ 
                minHeight: 52,
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 2,
                bgcolor: '#dc2626',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  bgcolor: '#b91c1c',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              }}
            >
              Fjern karakter
            </Button>
          )}
        </>
      )}

      {activeTab === 1 && (
        <Box sx={{ maxHeight: shouldUseTabletMode ? 400 : 350, overflowY: 'auto' }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: shouldUseTabletMode 
              ? 'repeat(auto-fill, minmax(120px, 1fr))' 
              : 'repeat(4, 1fr)', 
            gap: shouldUseTabletMode ? 2 : 1,
          }}>
            {POSE_LIBRARY.map((pose) => (
              <Card
                key={pose.id}
                sx={{
                  cursor: 'pointer',
                  border: selectedPose?.id === pose.id ? '2px solid #22c55e' : '1px solid #333',
                  backgroundColor: '#1a1a1a',
                  '&:hover': { borderColor: '#22c55e' },
                }}
              >
                <CardMedia
                  component="img"
                  height={shouldUseTabletMode ? 100 : 80}
                  image={pose.thumbnail}
                  alt={pose.name}
                  sx={{ backgroundColor: '#2a2a2a', objectFit: 'contain', p: 1 }}
                />
                <CardContent sx={{ p: shouldUseTabletMode ? 1 : 0.5, '&:last-child': { pb: shouldUseTabletMode ? 1 : 0.5 } }}>
                  <Typography variant="caption" noWrap sx={{ color: '#fff', fontSize: shouldUseTabletMode ? 12 : 10 }}>
                    {pose.name}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => applyPose(pose)}
                    aria-label={`Bruk pose ${pose.name}`}
                    sx={{ 
                      mt: 0.5, 
                      width: '100%', 
                      fontSize: shouldUseTabletMode ? 11 : 9,
                      py: shouldUseTabletMode ? 0.75 : 0.25,
                      minHeight: 36,
                      bgcolor: '#22c55e22',
                      color: '#22c55e',
                      '&:hover': { bgcolor: '#22c55e44' },
                    }}
                  >
                    Bruk
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontSize: shouldUseTabletMode ? 13 : 11 }}>
            Hudtone
          </Typography>
          <Box sx={{ display: 'flex', gap: shouldUseTabletMode ? 1.5 : 1, mb: 2 }}>
            {['#FFDAB9', '#F0C19F', '#D4A574', '#8D5524', '#4A2C2A'].map((color) => (
              <Box
                key={color}
                onClick={() => setSkinTone(color)}
                role="button"
                tabIndex={0}
                aria-label={`Velg hudtone ${color}`}
                aria-pressed={skinTone === color}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSkinTone(color); }}
                sx={{
                  width: shouldUseTabletMode ? 44 : 28,
                  height: shouldUseTabletMode ? 44 : 28,
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: skinTone === color ? '3px solid #3b82f6' : '2px solid #333',
                  '&:hover': { transform: 'scale(1.1)' },
                  '&:focus-visible': { outline: '2px solid #3b82f6', outlineOffset: 2 },
                }}
              />
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ fontSize: shouldUseTabletMode ? 13 : 11 }}>
            Hoyde: {(height * 1.7).toFixed(2)}m
          </Typography>
          <Slider
            value={height}
            onChange={(_, v) => setHeight(v as number)}
            min={0.8}
            max={1.2}
            step={0.01}
            size={shouldUseTabletMode ? 'medium' : 'small'}
            sx={{ 
              '& .MuiSlider-thumb': { 
                width: shouldUseTabletMode ? 24 : 16, 
                height: shouldUseTabletMode ? 24 : 16,
              },
            }}
          />

          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => selectedModel && loadCharacter(selectedModel)}
            fullWidth
            sx={{ mt: 2, minHeight: 44 }}
            disabled={!selectedModel}
          >
            Oppdater Karakter
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default CharacterModelLoader;
