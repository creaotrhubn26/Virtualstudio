import React, { useState, useCallback, useMemo } from 'react';
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
  TextField,
  InputAdornment,
  useMediaQuery,
} from '@mui/material';
import { Person, Delete, Refresh, Add, Search, Male, Female, ChildCare, Face, BusinessCenter, Checkroom, Accessibility } from '@mui/icons-material';
import { logger } from '../core/services/logger';
import { ALL_POSES } from '../core/animation/PoseLibrary';
import type { PosePreset } from '../core/animation/PoseLibrary';

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
  category: string;
  thumbnail: string;
  description: string;
  difficulty: PosePreset['difficulty'];
}

const createCharacterSVG = (type: 'female' | 'male' | 'couple', color = '#666') => {
  const svgs: Record<string, string> = {
    female: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="15"/><path d="M30 45h40l10 60H20z"/><path d="M35 105h10v40H35zM55 105h10v40H55z"/><ellipse cx="50" cy="45" rx="8" ry="3"/></svg>`,
    male: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="15"/><rect x="30" y="40" width="40" height="50" rx="5"/><rect x="35" y="90" width="12" height="45"/><rect x="53" y="90" width="12" height="45"/><rect x="20" y="45" width="15" height="8" rx="2"/><rect x="65" y="45" width="15" height="8" rx="2"/></svg>`,
    couple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" fill="${color}"><circle cx="45" cy="20" r="12"/><circle cx="105" cy="18" r="14"/><path d="M28 38h34l8 50H20z"/><rect x="80" y="36" width="50" height="45" rx="5"/><path d="M32 88h10v40H32zM48 88h10v40H48z"/><rect x="88" y="81" width="14" height="45"/><rect x="108" y="81" width="14" height="45"/></svg>`,
  };
  return `data:image/svg+xml,${encodeURIComponent(svgs[type])}`;
};

// Create avatar thumbnail placeholder SVG - must be defined before CHARACTER_MODELS
const createAvatarSVG = (type: 'child' | 'teenager' | 'woman' | 'man' | 'elderly' | 'athlete' | 'pregnant' | 'dancer' | 'realistic_man' | 'mixamo', color = '#00d4ff') => {
  const svgs: Record<string, string> = {
    child: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="none"><circle cx="50" cy="25" r="18" fill="${color}"/><rect x="32" y="48" width="36" height="42" rx="4" fill="${color}"/><rect x="36" y="90" width="12" height="38" fill="${color}"/><rect x="52" y="90" width="12" height="38" fill="${color}"/></svg>`,
    teenager: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="22" r="16"/><path d="M35 42h30l5 48H30z"/><rect x="38" y="90" width="10" height="42"/><rect x="52" y="90" width="10" height="42"/></svg>`,
    woman: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="14"/><path d="M34 38h32l8 50H26z"/><rect x="36" y="88" width="11" height="45"/><rect x="53" y="88" width="11" height="45"/></svg>`,
    man: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="15"/><rect x="30" y="40" width="40" height="50" rx="5"/><rect x="35" y="90" width="12" height="45"/><rect x="53" y="90" width="12" height="45"/><rect x="20" y="45" width="15" height="8" rx="2"/><rect x="65" y="45" width="15" height="8" rx="2"/></svg>`,
    elderly: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="22" r="14"/><path d="M36 40h28l6 46H30z"/><rect x="38" y="86" width="10" height="40"/><rect x="52" y="86" width="10" height="40"/><line x1="75" y1="50" x2="75" y2="110" stroke="${color}" stroke-width="3"/></svg>`,
    athlete: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="18" r="14"/><rect x="28" y="36" width="44" height="48" rx="6"/><rect x="32" y="84" width="14" height="48"/><rect x="54" y="84" width="14" height="48"/><rect x="18" y="42" width="18" height="10" rx="3"/><rect x="64" y="42" width="18" height="10" rx="3"/></svg>`,
    pregnant: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="20" r="14"/><ellipse cx="50" cy="65" rx="24" ry="28"/><rect x="36" y="93" width="11" height="42"/><rect x="53" y="93" width="11" height="42"/></svg>`,
    dancer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="${color}"><circle cx="50" cy="18" r="13"/><path d="M38 34h24l4 38H34z"/><line x1="45" y1="72" x2="35" y2="120" stroke="${color}" stroke-width="8"/><line x1="55" y1="72" x2="70" y2="115" stroke="${color}" stroke-width="8"/><line x1="38" y1="38" x2="15" y2="28" stroke="${color}" stroke-width="6"/><line x1="62" y1="38" x2="85" y2="50" stroke="${color}" stroke-width="6"/></svg>`,
    realistic_man: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="none"><circle cx="50" cy="18" r="14" fill="${color}"/><rect x="32" y="36" width="36" height="44" rx="6" fill="${color}"/><rect x="15" y="40" width="18" height="10" rx="3" fill="${color}"/><rect x="67" y="40" width="18" height="10" rx="3" fill="${color}"/><rect x="34" y="80" width="13" height="46" rx="3" fill="${color}"/><rect x="53" y="80" width="13" height="46" rx="3" fill="${color}"/><circle cx="50" cy="16" r="5" fill="#1a1a2e"/><ellipse cx="50" cy="32" rx="6" ry="2" fill="${color}" opacity="0.5"/></svg>`,
    mixamo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150" fill="none"><circle cx="50" cy="18" r="14" fill="${color}"/><rect x="30" y="36" width="40" height="48" rx="5" fill="${color}"/><rect x="14" y="40" width="17" height="9" rx="3" fill="${color}"/><rect x="69" y="40" width="17" height="9" rx="3" fill="${color}"/><rect x="33" y="84" width="14" height="46" rx="3" fill="${color}"/><rect x="53" y="84" width="14" height="46" rx="3" fill="${color}"/><path d="M38 20 Q50 10 62 20" stroke="${color}" stroke-width="2" fill="none" opacity="0.7"/><circle cx="50" cy="36" r="3" fill="${color}" opacity="0.5"/></svg>`
  };
  return `data:image/svg+xml,${encodeURIComponent(svgs[type])}`;
};

const CHARACTER_MODELS: CharacterModel[] = [
  {
    id: 'rigged_cesium_man',
    name: 'Rigget Demo',
    gender: 'male',
    category: 'mote' as any,
    modelUrl: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
    thumbnail: createAvatarSVG('man', '#6ef0c2'),
    description: 'Rigget + animert modell (anbefalt for gåing)',
    poses: 1,
  },
  {
    id: 'sam3d_child',
    name: 'Barn',
    gender: 'neutral',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/avatar_child.glb',
    thumbnail: createAvatarSVG('child'),
    description: 'SAM 3D Body - Barn 8 år',
    poses: 1,
  },
  {
    id: 'sam3d_teenager',
    name: 'Tenåring',
    gender: 'female',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/avatar_teenager.glb',
    thumbnail: createAvatarSVG('teenager'),
    description: 'SAM 3D Body - Tenåring 14 år',
    poses: 1,
  },
  {
    id: 'sam3d_woman',
    name: 'Voksen Kvinne',
    gender: 'female',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/avatar_woman.glb',
    thumbnail: createAvatarSVG('woman'),
    description: 'SAM 3D Body - Profesjonell kvinne',
    poses: 1,
  },
  {
    id: 'sam3d_man',
    name: 'Voksen Mann',
    gender: 'male',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/avatar_man.glb',
    thumbnail: createAvatarSVG('man'),
    description: 'SAM 3D Body - Casual mann',
    poses: 1,
  },
  {
    id: 'sam3d_elderly',
    name: 'Eldre Kvinne',
    gender: 'female',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/avatar_elderly.glb',
    thumbnail: createAvatarSVG('elderly'),
    description: 'SAM 3D Body - Bestemor 70+',
    poses: 1,
  },
  {
    id: 'sam3d_athlete',
    name: 'Atlet',
    gender: 'male',
    category: 'mote' as any,
    modelUrl: '/models/avatars/avatar_athlete.glb',
    thumbnail: createAvatarSVG('athlete'),
    description: 'SAM 3D Body - Atletisk mann',
    poses: 1,
  },
  {
    id: 'sam3d_pregnant',
    name: 'Gravid',
    gender: 'female',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/avatar_pregnant.glb',
    thumbnail: createAvatarSVG('pregnant'),
    description: 'SAM 3D Body - Gravid kvinne',
    poses: 1,
  },
  {
    id: 'sam3d_dancer',
    name: 'Balettdanser',
    gender: 'female',
    category: 'mote' as any,
    modelUrl: '/models/avatars/avatar_dancer.glb',
    thumbnail: createAvatarSVG('dancer'),
    description: 'SAM 3D Body - Grasiøs danser',
    poses: 1,
  },
  {
    id: 'human_realistic_male',
    name: 'Fotorealistisk Mann',
    gender: 'male',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/human-male-realistic.glb',
    thumbnail: createAvatarSVG('realistic_man', '#f97316'),
    description: 'Fotorealistisk 3D-mann — PBR-materialer, detaljert hud',
    poses: 1,
  },
  {
    id: 'mixamo_soldier',
    name: 'Mixamo-figur (poseable)',
    gender: 'male',
    category: 'portrett' as any,
    modelUrl: '/models/avatars/mixamo-character.glb',
    thumbnail: createAvatarSVG('mixamo', '#22c55e'),
    description: 'Fullrigget Mixamo-karakter — 49 bein, alle poser støttet',
    poses: ALL_POSES.length,
  },
];

const createPoseSVG = (pose: string, color = '#666') => {
  const poses: Record<string, string> = {
    stand: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100" fill="${color}"><circle cx="30" cy="12" r="10"/><line x1="30" y1="22" x2="30" y2="55" stroke="${color}" stroke-width="6"/><line x1="30" y1="55" x2="20" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="55" x2="40" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="30" x2="15" y2="50" stroke="${color}" stroke-width="4"/><line x1="30" y1="30" x2="45" y2="50" stroke="${color}" stroke-width="4"/></svg>`,
    confident: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100" fill="${color}"><circle cx="30" cy="12" r="10"/><line x1="30" y1="22" x2="30" y2="55" stroke="${color}" stroke-width="6"/><line x1="30" y1="55" x2="18" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="55" x2="42" y2="90" stroke="${color}" stroke-width="5"/><line x1="30" y1="32" x2="10" y2="45" stroke="${color}" stroke-width="4"/><line x1="30" y1="32" x2="50" y2="45" stroke="${color}" stroke-width="4"/></svg>`,
    sit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 80" fill="${color}"><circle cx="35" cy="10" r="9"/><line x1="35" y1="19" x2="35" y2="45" stroke="${color}" stroke-width="6"/><line x1="35" y1="45" x2="55" y2="48" stroke="${color}" stroke-width="5"/><line x1="55" y1="48" x2="55" y2="75" stroke="${color}" stroke-width="5"/><line x1="35" y1="45" x2="15" y2="48" stroke="${color}" stroke-width="5"/><line x1="15" y1="48" x2="15" y2="75" stroke="${color}" stroke-width="5"/></svg>`,
    action: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 100" fill="${color}"><circle cx="35" cy="12" r="9"/><line x1="35" y1="21" x2="35" y2="50" stroke="${color}" stroke-width="6"/><line x1="35" y1="50" x2="20" y2="88" stroke="${color}" stroke-width="5"/><line x1="35" y1="50" x2="50" y2="74" stroke="${color}" stroke-width="5"/><line x1="35" y1="30" x2="18" y2="22" stroke="${color}" stroke-width="4"/><line x1="35" y1="30" x2="56" y2="40" stroke="${color}" stroke-width="4"/></svg>`,
    dance: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" fill="${color}"><circle cx="40" cy="12" r="9"/><line x1="40" y1="21" x2="40" y2="52" stroke="${color}" stroke-width="6"/><line x1="40" y1="52" x2="26" y2="90" stroke="${color}" stroke-width="5"/><line x1="40" y1="52" x2="62" y2="84" stroke="${color}" stroke-width="5"/><line x1="40" y1="30" x2="12" y2="20" stroke="${color}" stroke-width="4"/><line x1="40" y1="30" x2="68" y2="16" stroke="${color}" stroke-width="4"/></svg>`,
  };
  return `data:image/svg+xml,${encodeURIComponent(poses[pose] || poses.stand)}`;
};

const POSE_CATEGORY_STYLE: Record<PosePreset['category'], { icon: string; color: string }> = {
  portrait: { icon: 'stand', color: '#7dd3fc' },
  fashion: { icon: 'confident', color: '#f9a8d4' },
  commercial: { icon: 'action', color: '#86efac' },
  editorial: { icon: 'confident', color: '#c4b5fd' },
  fitness: { icon: 'action', color: '#fca5a5' },
  dance: { icon: 'dance', color: '#fcd34d' },
};

const POSE_LIBRARY: Pose[] = ALL_POSES.map((pose) => {
  const style = POSE_CATEGORY_STYLE[pose.category];
  return {
    id: pose.id,
    name: pose.name,
    category: pose.category,
    thumbnail: createPoseSVG(style.icon, style.color),
    description: pose.description,
    difficulty: pose.difficulty,
  };
});

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

  const [selectedModel, setSelectedModel] = useState<CharacterModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [skinTone, setSkinTone] = useState('#FFDAB9');
  const [height, setHeight] = useState(1.0);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'neutral'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'portrett' | 'mote' | 'bryllup' | 'naringsliv'>('all');

  const filteredModels = useMemo(() => {
    return CHARACTER_MODELS.filter((model) => {
      const matchesSearch = searchQuery === '' || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === 'all' || model.gender === genderFilter;
      const matchesCategory = categoryFilter === 'all' || (model.category as string) === categoryFilter;
      return matchesSearch && matchesGender && matchesCategory;
    });
  }, [searchQuery, genderFilter, categoryFilter]);

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
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        background: 'linear-gradient(135deg, rgba(155,89,182,0.15) 0%, rgba(142,68,173,0.15) 100%)',
        borderRadius: '14px',
        px: 2.5,
        py: 1.5,
        mb: 2,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
          boxShadow: '0 4px 12px rgba(155,89,182,0.4)',
        }}>
          <Accessibility sx={{ fontSize: 24, color: '#fff' }} />
        </Box>
        <Box>
          <Typography sx={{ 
            fontWeight: 800, 
            fontSize: 20,
            background: 'linear-gradient(90deg, #d4a5e8 0%, #bb8fce 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px',
          }}>
            Modeller
          </Typography>
          <Typography sx={{ 
            fontSize: 12, 
            color: '#888',
            fontWeight: 500,
          }}>
            SAM 3D Body karakterer og poser
          </Typography>
        </Box>
        <Chip
          label={`${filteredModels.length}/${CHARACTER_MODELS.length}`}
          size="medium"
          sx={{ 
            ml: 'auto', 
            bgcolor: '#9b59b6', 
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            px: 1.5,
            height: 32,
            boxShadow: '0 2px 8px rgba(155,89,182,0.4)',
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
          <TextField
            size="small"
            placeholder="Søk modeller..."
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#888', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiInputBase-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                borderRadius: 2,
                minHeight: 48,
                fontSize: 14,
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& input': { color: '#fff' },
              '& input::placeholder': { color: '#888' },
            }}
          />

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block', fontSize: 12 }}>Kjønn</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              <Chip
                icon={<Person sx={{ fontSize: 18 }} />}
                label="Alle"
                onClick={() => setGenderFilter('all')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: genderFilter === 'all' ? '#3b82f6' : '#2a2a2a',
                  color: '#fff',
                  border: genderFilter === 'all' ? '2px solid #3b82f6' : '1px solid #444',
                  '&:hover': { bgcolor: genderFilter === 'all' ? '#2563eb' : '#333' },
                }}
              />
              <Chip
                icon={<Male sx={{ fontSize: 18 }} />}
                label="Mann"
                onClick={() => setGenderFilter('male')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: genderFilter === 'male' ? '#3b82f6' : '#2a2a2a',
                  color: '#fff',
                  border: genderFilter === 'male' ? '2px solid #3b82f6' : '1px solid #444',
                  '&:hover': { bgcolor: genderFilter === 'male' ? '#2563eb' : '#333' },
                }}
              />
              <Chip
                icon={<Female sx={{ fontSize: 18 }} />}
                label="Kvinne"
                onClick={() => setGenderFilter('female')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: genderFilter === 'female' ? '#3b82f6' : '#2a2a2a',
                  color: '#fff',
                  border: genderFilter === 'female' ? '2px solid #3b82f6' : '1px solid #444',
                  '&:hover': { bgcolor: genderFilter === 'female' ? '#2563eb' : '#333' },
                }}
              />
              <Chip
                icon={<ChildCare sx={{ fontSize: 18 }} />}
                label="Barn"
                onClick={() => setGenderFilter('neutral')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: genderFilter === 'neutral' ? '#3b82f6' : '#2a2a2a',
                  color: '#fff',
                  border: genderFilter === 'neutral' ? '2px solid #3b82f6' : '1px solid #444',
                  '&:hover': { bgcolor: genderFilter === 'neutral' ? '#2563eb' : '#333' },
                }}
              />
            </Box>

            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block', fontSize: 12 }}>Kategori</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="Alle"
                onClick={() => setCategoryFilter('all')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: categoryFilter === 'all' ? '#22c55e' : '#2a2a2a',
                  color: '#fff',
                  border: categoryFilter === 'all' ? '2px solid #22c55e' : '1px solid #444',
                  '&:hover': { bgcolor: categoryFilter === 'all' ? '#16a34a' : '#333' },
                }}
              />
              <Chip
                icon={<Face sx={{ fontSize: 18 }} />}
                label="Portrett"
                onClick={() => setCategoryFilter('portrett')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: categoryFilter === 'portrett' ? '#22c55e' : '#2a2a2a',
                  color: '#fff',
                  border: categoryFilter === 'portrett' ? '2px solid #22c55e' : '1px solid #444',
                  '&:hover': { bgcolor: categoryFilter === 'portrett' ? '#16a34a' : '#333' },
                }}
              />
              <Chip
                icon={<Checkroom sx={{ fontSize: 18 }} />}
                label="Mote"
                onClick={() => setCategoryFilter('mote')}
                sx={{
                  minHeight: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: categoryFilter === 'mote' ? '#22c55e' : '#2a2a2a',
                  color: '#fff',
                  border: categoryFilter === 'mote' ? '2px solid #22c55e' : '1px solid #444',
                  '&:hover': { bgcolor: categoryFilter === 'mote' ? '#16a34a' : '#333' },
                }}
              />
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block', fontSize: 12 }}>
            Viser {filteredModels.length} av {CHARACTER_MODELS.length} modeller
          </Typography>

          {filteredModels.length === 0 && (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4, 
              color: '#888',
              bgcolor: '#1a1a1a',
              borderRadius: 2,
              border: '1px dashed #444',
              mb: 2,
            }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Ingen modeller funnet</Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Prøv å endre søk eller filtre
              </Typography>
            </Box>
          )}

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
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={model.gender === 'male' ? 'Mann' : model.gender === 'female' ? 'Kvinne' : 'Barn'}
                        sx={{
                          height: 20,
                          fontSize: 10,
                          bgcolor: model.gender === 'male' ? '#3b82f622' : model.gender === 'female' ? '#ec489922' : '#8b5cf622',
                          color: model.gender === 'male' ? '#60a5fa' : model.gender === 'female' ? '#f472b6' : '#a78bfa',
                          border: '1px solid currentColor',
                        }}
                      />
                      <Chip
                        size="small"
                        label={(model.category as string).charAt(0).toUpperCase() + (model.category as string).slice(1)}
                        sx={{
                          height: 20,
                          fontSize: 10,
                          bgcolor: '#22c55e22',
                          color: '#4ade80',
                          border: '1px solid currentColor',
                        }}
                      />
                    </Box>
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
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      color: '#9ca3af',
                      display: 'block',
                      fontSize: shouldUseTabletMode ? 10 : 9,
                      textTransform: 'capitalize',
                    }}
                  >
                    {pose.category} · {pose.difficulty}
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
