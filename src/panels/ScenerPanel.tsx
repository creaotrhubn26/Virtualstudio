import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
const TrellisEnvironmentDialog = lazy(() => import('../components/TrellisEnvironmentDialog').then(m => ({ default: m.TrellisEnvironmentDialog })));
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Chip,
  InputBase,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Slider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Palette, Person, BusinessCenter, Favorite, Movie, Star, Lightbulb, CameraAlt, Search as SearchIcon, School, Add, Folder, Edit, Delete, Close, Save, Build, PhotoCamera, Wallpaper, Tune, Landscape, Videocam, FlashOn, ShowChart, CameraEnhance, AutoStories, AccessibilityNew } from '@mui/icons-material';
import { scenarioPresets, ScenarioPreset } from '../data/scenarioPresets';
import { customPresetService, CustomPreset } from '../services/customPresetService';
import { MultiviewSkeletonPanel } from './MultiviewSkeletonPanel';
import { storySceneLoaderService, StorySceneLoadProgress } from '../services/storySceneLoaderService';
import { CinematicDirectorPanel } from '../components/CinematicDirectorPanel';
import { CAMERA_BODIES, LENSES, CameraBody, Lens, getLensFocalLength } from '../data/cameraGear';
import { LIGHT_DATABASE, LightSpec, getLightDisplayName, getLightPowerDisplay } from '../data/lightFixtures';
import { BACKDROP_DATABASE, BACKDROP_CATEGORIES, BackdropSpec, BackdropCategory } from '../data/backdropDefinitions';

interface ScenerPanelProps {
  onApplyPreset: (preset: ScenarioPreset) => void;
  onShowRecommended: (preset: ScenarioPreset) => void;
  getCurrentSceneConfig?: () => ScenarioPreset['sceneConfig'] | null;
}

const kategoriIcons: Record<string, React.ReactNode> = {
  bryllup: <Favorite sx={{ fontSize: 22 }} />,
  portrett: <Person sx={{ fontSize: 22 }} />,
  mote: <Palette sx={{ fontSize: 22 }} />,
  naeringsliv: <BusinessCenter sx={{ fontSize: 22 }} />,
  hollywood: <Movie sx={{ fontSize: 22 }} />,
  skolefoto: <School sx={{ fontSize: 22 }} />,
  story: <AutoStories sx={{ fontSize: 22 }} />,
  'mine-oppsett': <Folder sx={{ fontSize: 22 }} />,
};

const kategoriColors: Record<string, string> = {
  bryllup: '#e91e63',
  portrett: '#2196f3',
  mote: '#9c27b0',
  naeringsliv: '#4caf50',
  hollywood: '#ffc107',
  skolefoto: '#00bcd4',
  story: '#ff6d00',
  'mine-oppsett': '#ff5722',
};

const kategoriLabels: Record<string, string> = {
  alle: 'Alle',
  'mine-oppsett': 'Mine oppsett',
  story: 'Story',
  hollywood: 'Hollywood',
  skolefoto: 'Skolefoto',
  bryllup: 'Bryllup',
  portrett: 'Portrett',
  mote: 'Mote',
  naeringsliv: 'Næringsliv',
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Nybegynner',
  intermediate: 'Middels',
  advanced: 'Avansert',
  expert: 'Ekspert',
};

const difficultyColors: Record<string, string> = {
  beginner: '#4caf50',
  intermediate: '#ff9800',
  advanced: '#f44336',
  expert: '#9c27b0',
};

export const ScenerPanel: React.FC<ScenerPanelProps> = ({ onApplyPreset, onShowRecommended, getCurrentSceneConfig }) => {
  const theme = useTheme();
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isIPadFriendly = isTablet || isTouchDevice;

const buttonStyle = {
    minHeight: isIPadFriendly ? 56 : 48,
    minWidth: isIPadFriendly ? 120 : 110,
    fontSize: isIPadFriendly ? '1rem' : 15,
  fontWeight: 600,
  textTransform: 'none' as const,
    borderRadius: '12px',
  borderWidth: 2,
  transition: 'all 0.2s ease',
  WebkitTapHighlightColor: 'transparent',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    padding: isIPadFriendly ? '14px 20px' : '12px 16px',
  '&:active': {
    transform: 'scale(0.97)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
    '@media (hover: none) and (pointer: coarse)': {
      '&:active': {
        transform: 'scale(0.95)',
      }
    }
};

  const [activeKategori, setActiveKategori] = useState<string>('alle');
  const [search, setSearch] = useState<string>('');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [multiviewPreset, setMultiviewPreset] = useState<ScenarioPreset | null>(null);
  const [storyLoadProgress, setStoryLoadProgress] = useState<StorySceneLoadProgress | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSetupTypeDialog, setShowSetupTypeDialog] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [setupType, setSetupType] = useState<'foto' | 'video'>('foto');
  const [createMode, setCreateMode] = useState<'current' | 'custom'>('current');
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetTags, setPresetTags] = useState('');
  const [customBuildTab, setCustomBuildTab] = useState(0);
  const [customBackdropColor, setCustomBackdropColor] = useState('#808080');
  const [backdropCategory, setBackdropCategory] = useState<BackdropCategory>('bakgrunn');
  const [selectedBackdropId, setSelectedBackdropId] = useState<string | null>('background');
  const [customFocalLength, setCustomFocalLength] = useState(85);
  const [customCCT, setCustomCCT] = useState(5600);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);
  const [lightCount, setLightCount] = useState(1);
  const [selectedLightTypes, setSelectedLightTypes] = useState<string[]>(['key']);
  const [cameraCount, setCameraCount] = useState(1);

  const LIGHT_TYPES = [
    { id: 'key', label: 'Hovedlys', icon: '☀️', description: 'Primært lys', color: '#ffc107' },
    { id: 'fill', label: 'Fylllys', icon: '🌤️', description: 'Reduserer skygger', color: '#90caf9' },
    { id: 'back', label: 'Baklys', icon: '✨', description: 'Separasjon fra bakgrunn', color: '#ce93d8' },
    { id: 'rim', label: 'Kantlys', icon: '🌙', description: 'Konturbelysning', color: '#80deea' },
    { id: 'hair', label: 'Hårlys', icon: '💫', description: 'Fremhever hår', color: '#ffab91' },
    { id: 'background', label: 'Bakgrunnslys', icon: '🎭', description: 'Lyser opp bakgrunn', color: '#a5d6a7' },
  ];


  const [selectedFixtures, setSelectedFixtures] = useState<(string | null)[]>([null]);
  const [lightPickerOpen, setLightPickerOpen] = useState<number | null>(null);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [trellisDialogOpen, setTrellisDialogOpen] = useState(false);
  const [brandColor, setBrandColor] = useState('#c8392b');

  const filteredCameras = useMemo(() => {
    return CAMERA_BODIES.filter(c => 
      setupType === 'foto' ? c.category === 'foto' : c.category === 'cine'
    );
  }, [setupType]);

  const selectedCamera = useMemo(() => 
    CAMERA_BODIES.find(c => c.id === selectedCameraId) || null
  , [selectedCameraId]);

  const selectedLens = useMemo(() => 
    LENSES.find(l => l.id === selectedLensId) || null
  , [selectedLensId]);

  useEffect(() => {
    setCustomPresets(customPresetService.getAll());
  }, []);

  const allPresets = [...customPresets.map(p => ({ ...p, kategori: 'mine-oppsett' as const })), ...scenarioPresets];

  const filteredPresets = allPresets.filter(p => {
    const matchesKategori = activeKategori === 'alle' || p.kategori === activeKategori;
    const searchLower = search.toLowerCase();
    const matchesSearch = search === '' || 
      p.navn.toLowerCase().includes(searchLower) ||
      (p.beskrivelse?.toLowerCase() ?? '').includes(searchLower) ||
      (p.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ?? false) ||
      ('usedIn' in p && p.usedIn && p.usedIn.some(film => film.toLowerCase().includes(searchLower)));
    return matchesKategori && matchesSearch;
  });

  const handleCreatePreset = () => {
    setEditingPreset(null);
    setPresetName('');
    setPresetDescription('');
    setPresetTags('');
    setCreateMode('current');
    setSetupType('foto');
    setSelectedCameraId(null);
    setSelectedLensId(null);
    setLightCount(1);
    setShowSetupTypeDialog(true);
  };

  const handleSelectSetupType = (type: 'foto' | 'video') => {
    setSetupType(type);
    setSelectedCameraId(null);
    setSelectedLensId(null);
    setCameraCount(1);
    setShowSetupTypeDialog(false);
    setShowModeSelection(true);
  };

  const handleSelectMode = (mode: 'current' | 'custom') => {
    setCreateMode(mode);
    setShowModeSelection(false);
    setShowCreateDialog(true);
    if (mode === 'custom') {
      setCustomBuildTab(0);
      setCustomBackdropColor('#808080');
      setCustomFocalLength(85);
      setLightCount(1);
      setSelectedLightTypes(['key']);
      setSelectedFixtures([null]);
      setCameraCount(1);
      setCustomCCT(5600);
    }
  };

  const handleEditPreset = (preset: CustomPreset) => {
    setEditingPreset(preset);
    setPresetName(preset.navn);
    setPresetDescription(preset.beskrivelse ?? '');
    setPresetTags(preset.tags?.filter(t => t !== 'egendefinert').join(', ') ?? '');
    setShowCreateDialog(true);
  };

  const handleDeletePreset = (id: string) => {
    if (confirm('Er du sikker på at du vil slette dette oppsettet?')) {
      customPresetService.delete(id);
      setCustomPresets(customPresetService.getAll());
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const tagsArray = presetTags.split(',').map(t => t.trim()).filter(t => t);
    
    if (editingPreset) {
      customPresetService.update(editingPreset.id, {
        navn: presetName,
        beskrivelse: presetDescription,
        tags: ['egendefinert', ...tagsArray],
      });
    } else {
      let sceneConfig: ScenarioPreset['sceneConfig'];
      
      if (createMode === 'current') {
        sceneConfig = getCurrentSceneConfig?.() || {
          lights: [{ type: 'key-light', position: [0, 2, 2] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], intensity: 1.0, cct: 5600 }],
          backdrop: { type: 'seamless', color: '#808080' },
          camera: { position: [0, 1.6, 3] as [number, number, number], target: [0, 1.5, 0] as [number, number, number], focalLength: 85 }
        };
      } else {
        const focalLength = selectedLens ? getLensFocalLength(selectedLens) : customFocalLength;
        const lights: ScenarioPreset['sceneConfig']['lights'] = [];
        const lightPositions = [
          [-2, 2.5, 2],
          [2, 2.5, 2],
          [0, 3, -1],
          [-3, 2, 0],
          [3, 2, 0],
          [0, 4, 2],
        ];
        const lightTypeMap: Record<string, string> = {
          'key': 'key-light',
          'fill': 'fill-light',
          'back': 'back-light',
          'rim': 'rim-light',
          'hair': 'hair-light',
          'background': 'background-light',
        };
        for (let i = 0; i < lightCount; i++) {
          const pos = lightPositions[i % lightPositions.length];
          const lightType = selectedLightTypes[i] || 'key';
          lights.push({
            type: lightTypeMap[lightType] || 'key-light',
            position: pos as [number, number, number],
            rotation: [0, i * 30, 0] as [number, number, number],
            intensity: lightType === 'key' ? 1.0 : 0.5,
            cct: customCCT,
          });
        }
        
        sceneConfig = {
          lights,
          backdrop: { type: 'seamless', color: customBackdropColor },
          camera: { 
            position: [0, 1.6, 4] as [number, number, number], 
            target: [0, 1.5, 0] as [number, number, number], 
            focalLength 
          },
          gear: {
            setupType,
            cameraBodyId: selectedCameraId || undefined,
            cameraLabel: selectedCamera?.name,
            cameraCount: setupType === 'video' ? cameraCount : 1,
            lensId: selectedLensId || undefined,
            lensLabel: selectedLens?.name,
            lightCount,
            lightTypes: selectedLightTypes.slice(0, lightCount),
            fixtureIds: selectedFixtures.slice(0, lightCount).filter(Boolean) as string[],
          },
        };
      }
      
      const newPreset = customPresetService.createFromCurrentScene(
        presetName,
        presetDescription,
        [...tagsArray, setupType === 'foto' ? 'foto' : 'video'],
        sceneConfig
      );
      customPresetService.save(newPreset);
    }
    
    setCustomPresets(customPresetService.getAll());
    setShowCreateDialog(false);
  };

  const renderPresetCard = (preset: ScenarioPreset | CustomPreset, isCustom: boolean) => {
    const color = kategoriColors[preset.kategori] || kategoriColors['mine-oppsett'];
    const icon = kategoriIcons[preset.kategori] || kategoriIcons['mine-oppsett'];
    
    return (
      <Card
        key={preset.id}
        sx={{
          bgcolor: '#2a2a2a',
          border: `3px solid ${color}50`,
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          position: 'relative',
          '&:hover': {
            borderColor: color,
            transform: 'translateY(-3px)',
            boxShadow: `0 8px 24px ${color}30`,
          },
        }}
      >
        {isCustom && (
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => handleEditPreset(preset as CustomPreset)}
              sx={{ 
                bgcolor: 'rgba(0,0,0,0.6)', 
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
              }}
            >
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDeletePreset(preset.id)}
              sx={{ 
                bgcolor: 'rgba(0,0,0,0.6)', 
                color: '#f44336',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
              }}
            >
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}
        {preset.kategori === 'story' && (() => {
          const aktMatch = preset.id.match(/akt(\d+)/);
          const aktNum = aktMatch ? aktMatch[1] : null;
          return aktNum ? (
            <Box sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 10,
              px: 1.2,
              py: 0.4,
              borderRadius: '8px',
              background: 'rgba(255,109,0,0.9)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
            }}>
              <AutoStories sx={{ fontSize: 13, color: '#fff' }} />
              <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
                AKT {aktNum}/3
              </Typography>
            </Box>
          ) : null;
        })()}
        
        {preset.previewImage && (
          <CardMedia
            component="img"
            height="180"
            image={preset.previewImage}
            alt={preset.navn}
            sx={{
              objectFit: 'cover',
              objectPosition: 'center 20%',
              borderBottom: `3px solid ${color}50`,
            }}
          />
        )}
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Box sx={{ 
              color: color,
              display: 'flex',
              alignItems: 'center',
              bgcolor: `${color}20`,
              p: 1,
              borderRadius: '8px',
            }}>
              {icon}
            </Box>
            <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
              {preset.navn}
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ 
            color: 'rgba(255,255,255,0.8)', 
            mb: 2, 
            minHeight: preset.previewImage ? 40 : 48,
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            {preset.beskrivelse}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {preset.difficulty && (
              <Chip
                icon={<Star sx={{ fontSize: 16 }} />}
                label={difficultyLabels[preset.difficulty] || preset.difficulty}
                sx={{
                  height: 32,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: `${difficultyColors[preset.difficulty]}25`,
                  color: difficultyColors[preset.difficulty],
                  border: `1px solid ${difficultyColors[preset.difficulty]}50`,
                  '& .MuiChip-icon': { color: difficultyColors[preset.difficulty] }
                }}
              />
            )}
            <Chip
              icon={<Lightbulb sx={{ fontSize: 16 }} />}
              label={`${preset.sceneConfig.lights.length} lys`}
              sx={{
                height: 32,
                fontSize: 13,
                fontWeight: 500,
                bgcolor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                '& .MuiChip-icon': { color: '#ffc107' }
              }}
            />
            {preset.sceneConfig.camera?.focalLength && (
              <Chip
                icon={<CameraAlt sx={{ fontSize: 16 }} />}
                label={`${preset.sceneConfig.camera.focalLength}mm`}
                sx={{
                  height: 32,
                  fontSize: 13,
                  fontWeight: 500,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  '& .MuiChip-icon': { color: '#00a8ff' }
                }}
              />
            )}
            {isCustom && (
              <Chip
                label="Egendefinert"
                sx={{
                  height: 32,
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: `${color}25`,
                  color: color,
                  border: `1px solid ${color}50`,
                }}
              />
            )}
          </Box>

          {'usedIn' in preset && preset.usedIn && preset.usedIn.length > 0 && (
            <Typography sx={{ 
              color: color, 
              fontStyle: 'italic',
              display: 'block',
              mb: 2,
              fontSize: 13,
              fontWeight: 500,
            }}>
              🎬 Brukt i: {preset.usedIn.slice(0, 2).join(', ')}
            </Typography>
          )}

          <Stack direction="column" spacing={1}>
            {storyLoadProgress && storyLoadProgress.phase !== 'done' && storyLoadProgress.phase !== 'error' && (
              <Box sx={{ mb: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                  <Typography sx={{ fontSize: 11, color: '#ff9800' }}>{storyLoadProgress.message}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{Math.round(storyLoadProgress.progress * 100)}%</Typography>
                </Box>
                <Box sx={{ height: 3, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', bgcolor: '#ff9800', borderRadius: 2, width: `${storyLoadProgress.progress * 100}%`, transition: 'width 0.3s ease' }} />
                </Box>
              </Box>
            )}
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                fullWidth
                onClick={async () => {
                  const p = preset as ScenarioPreset;
                  if (p.kategori === 'story' && (p.characters?.length || p.props?.length)) {
                    setStoryLoadProgress({ phase: 'lights', progress: 0, message: 'Starter scenelasting…' });
                    try {
                      await storySceneLoaderService.load(p, (progress) => setStoryLoadProgress(progress));
                    } catch (err) {
                      setStoryLoadProgress({ phase: 'error', progress: 0, message: 'Feil under lasting av scene' });
                    } finally {
                      setTimeout(() => setStoryLoadProgress(null), 3000);
                    }
                  } else {
                    onApplyPreset(p);
                  }
                }}
                sx={{
                  ...buttonStyle,
                  bgcolor: color,
                  color: preset.kategori === 'hollywood' ? '#000' : '#fff',
                  fontWeight: 700,
                  '&:hover': {
                    bgcolor: color,
                    filter: 'brightness(1.15)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 16px ${color}50`,
                  },
                }}
              >
                Last mal
              </Button>
              {!isCustom && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => onShowRecommended(preset as ScenarioPreset)}
                  sx={{
                    ...buttonStyle,
                    borderColor: color,
                    color: color,
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: color,
                      bgcolor: `${color}15`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 16px ${color}30`,
                    },
                  }}
                >
                  Anbefalt utstyr
                </Button>
              )}
            </Stack>

            {preset.kategori === 'story' && !isCustom && (preset as ScenarioPreset).characters && (preset as ScenarioPreset).characters!.length > 0 && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AccessibilityNew sx={{ fontSize: 18 }} />}
                onClick={() => setMultiviewPreset(preset as ScenarioPreset)}
                sx={{
                  ...buttonStyle,
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  borderWidth: 2,
                  bgcolor: 'rgba(255,152,0,0.05)',
                  '&:hover': {
                    borderColor: '#ff9800',
                    bgcolor: 'rgba(255,152,0,0.15)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(255,152,0,0.25)',
                  },
                }}
              >
                🎬 Åpne Multiview
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', bgcolor: '#1a1a1a' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 3, 
        mb: 3, 
        pb: 2.5,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          background: 'linear-gradient(135deg, rgba(155,89,182,0.15) 0%, rgba(142,68,173,0.15) 100%)',
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
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            boxShadow: '0 4px 12px rgba(155,89,182,0.4)',
          }}>
            <Movie sx={{ fontSize: 24, color: '#fff' }} />
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
              Scener og lysmønstre
            </Typography>
            <Typography sx={{ 
              fontSize: 12, 
              color: '#888',
              fontWeight: 500,
            }}>
              Hollywood-teknikker og profesjonelle oppsett
            </Typography>
          </Box>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreatePreset}
          sx={{
            ...buttonStyle,
            minWidth: 160,
            background: 'linear-gradient(135deg, #ff5722 0%, #ff7043 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(255,87,34,0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ff7043 0%, #ff8a65 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(255,87,34,0.5)',
            },
          }}
        >
          Nytt oppsett
        </Button>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: '#252525', 
          borderRadius: '12px', 
          px: 2, 
          py: 0.5,
          minHeight: 56,
          border: '1px solid rgba(255,255,255,0.08)',
          flex: 1,
          minWidth: 200,
          maxWidth: 320,
          transition: 'all 0.2s ease',
          '&:focus-within': {
            borderColor: 'rgba(255,193,7,0.5)',
            boxShadow: '0 0 0 3px rgba(255,193,7,0.1)',
          },
        }}>
          <SearchIcon sx={{ color: '#666', fontSize: 22, mr: 1 }} />
          <InputBase
            placeholder="Søk lysmønster..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              color: '#fff',
              fontSize: 15,
              fontWeight: 500,
              flex: 1,
              '& input::placeholder': { color: '#555', opacity: 1 },
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {['alle', 'mine-oppsett', 'story', 'hollywood', 'skolefoto', 'bryllup', 'portrett', 'mote', 'naeringsliv'].map((kat) => (
          <Button
            key={kat}
            variant={activeKategori === kat ? 'contained' : 'outlined'}
            startIcon={kat !== 'alle' ? kategoriIcons[kat] : undefined}
            onClick={() => setActiveKategori(kat)}
            sx={{
              ...buttonStyle,
              bgcolor: activeKategori === kat 
                ? (kat === 'alle' ? '#555' : kategoriColors[kat])
                : 'transparent',
              borderColor: activeKategori === kat 
                ? (kat === 'alle' ? '#555' : kategoriColors[kat])
                : '#444',
              color: activeKategori === kat ? '#fff' : '#aaa',
              boxShadow: activeKategori === kat 
                ? `0 4px 12px ${kat === 'alle' ? 'rgba(85,85,85,0.3)' : kategoriColors[kat]}40`
                : '0 2px 6px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: activeKategori === kat 
                  ? (kat === 'alle' ? '#666' : kategoriColors[kat])
                  : '#333',
                borderColor: activeKategori === kat 
                  ? (kat === 'alle' ? '#666' : kategoriColors[kat])
                  : '#555',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                filter: activeKategori === kat ? 'brightness(1.1)' : 'none',
              },
            }}
          >
            {kategoriLabels[kat]}
            {kat === 'mine-oppsett' && customPresets.length > 0 && (
              <Chip 
                label={customPresets.length} 
                size="small" 
                sx={{ 
                  ml: 1, 
                  height: 22, 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  fontSize: 12,
                }} 
              />
            )}
          </Button>
        ))}
      </Box>

      {activeKategori === 'mine-oppsett' && customPresets.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8, 
          px: 4,
          bgcolor: '#222',
          borderRadius: '16px',
          border: '2px dashed #444',
        }}>
          <Folder sx={{ fontSize: 64, color: '#555', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#888', mb: 1 }}>
            Ingen egne oppsett ennå
          </Typography>
          <Typography sx={{ color: '#666', mb: 3 }}>
            Lag ditt første oppsett ved å klikke "Nytt oppsett" ovenfor.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreatePreset}
            sx={{
              ...buttonStyle,
              bgcolor: '#ff5722',
              '&:hover': { bgcolor: '#ff7043' },
            }}
          >
            Lag nytt oppsett
          </Button>
        </Box>
      )}

      {activeKategori === 'story' && (
        <Box sx={{
          mb: 3,
          p: 3,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1a0a00 0%, #2a1200 50%, #1a0a00 100%)',
          border: '1px solid rgba(255,109,0,0.35)',
          boxShadow: '0 4px 24px rgba(255,109,0,0.12)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <AutoStories sx={{ color: '#ff6d00', fontSize: 28 }} />
            <Typography sx={{ color: '#ff9a4d', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>
              Napoli Dreams
            </Typography>
            <Box sx={{
              ml: 'auto',
              px: 1.5,
              py: 0.4,
              borderRadius: '20px',
              background: 'rgba(255,109,0,0.15)',
              border: '1px solid rgba(255,109,0,0.3)',
            }}>
              <Typography sx={{ color: '#ff9a4d', fontSize: 12, fontWeight: 600 }}>
                4 akter · 1 fortelling
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#cc8855', fontSize: 13.5, lineHeight: 1.6, mb: 2 }}>
            En komplett produksjonsserie for en pizzarestaurant-merkevare. Fire ulike scener — restaurantens atmosfære, profesjonell produktfotografering, branded videostudio og utendørs napolitansk piazza — som sammen forteller én sammenhengende merkevarehistorie.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {[
              { akt: 'Akt 1', tittel: 'Restauranten', ikoner: '🕯️ 🍕', desc: 'Atmosfære & stemning' },
              { akt: 'Akt 2', tittel: 'Produktfoto', ikoner: '📸 💡', desc: 'Studio & menybilder' },
              { akt: 'Akt 3', tittel: 'Chef-video', ikoner: '🎬 👨‍🍳', desc: 'Intervju & brand story' },
              { akt: 'Akt 4', tittel: 'Utendørs piazza', ikoner: '🌅 🏛️', desc: 'Naturlig lys & by' },
            ].map((a, i) => (
              <Box key={i} sx={{
                flex: 1,
                minWidth: 100,
                p: 1.5,
                borderRadius: '10px',
                background: 'rgba(255,109,0,0.08)',
                border: '1px solid rgba(255,109,0,0.2)',
                textAlign: 'center',
              }}>
                <Typography sx={{ color: '#ff6d00', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 0.3 }}>
                  {a.akt}
                </Typography>
                <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600, mb: 0.3 }}>
                  {a.tittel}
                </Typography>
                <Typography sx={{ color: '#888', fontSize: 11 }}>{a.ikoner}</Typography>
                <Typography sx={{ color: '#777', fontSize: 11, mt: 0.3 }}>{a.desc}</Typography>
              </Box>
            ))}
          </Box>

          {/* Napoli Dreams banner: open multiview for currently loaded story act */}
          {(() => {
            const activeStoryPreset = storySceneLoaderService.getCurrentPreset();
            const napoliPreset = (activeStoryPreset?.kategori === 'story' && activeStoryPreset.characters?.length)
              ? activeStoryPreset
              : scenarioPresets.find(p => p.kategori === 'story' && p.characters && p.characters.length > 0);
            if (!napoliPreset) return null;
            return (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AccessibilityNew sx={{ fontSize: 18 }} />}
                onClick={() => setMultiviewPreset(napoliPreset)}
                sx={{
                  borderColor: '#ff6d00',
                  color: '#ff9a4d',
                  borderWidth: 2,
                  bgcolor: 'rgba(255,109,0,0.06)',
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  '&:hover': {
                    borderColor: '#ff9a4d',
                    bgcolor: 'rgba(255,109,0,0.15)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(255,109,0,0.3)',
                  },
                  transition: 'all 0.18s',
                }}
              >
                Åpne Multiview — Napoli Dreams
              </Button>
            );
          })()}

          {/* Bilde → 3D Miljø via TRELLIS */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Landscape sx={{ fontSize: 18 }} />}
            onClick={() => setTrellisDialogOpen(true)}
            sx={{
              mt: 1,
              borderColor: 'rgba(99,102,241,0.5)',
              color: '#a5b4fc',
              borderWidth: 1.5,
              bgcolor: 'rgba(99,102,241,0.05)',
              fontWeight: 600,
              fontSize: 13,
              '&:hover': {
                borderColor: '#818cf8',
                bgcolor: 'rgba(99,102,241,0.12)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
              },
              transition: 'all 0.18s',
            }}
          >
            Bilde → 3D Miljø (TRELLIS)
          </Button>

          {/* TRELLIS-genererte Napoli-miljøer */}
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{ color: '#7c86d4', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
              TRELLIS-genererte Napoli-miljøer
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[
                { label: 'Utendørs restaurant', emoji: '🪑', file: 'trellis-outdoor-restaurant.glb', desc: 'Uteserveringsscene' },
                { label: 'Restaurantterrasse', emoji: '🌿', file: 'trellis-terrace.glb', desc: 'Terrasse & grønt' },
                { label: 'Italiensk restaurant', emoji: '🍕', file: 'trellis-italian-restaurant.glb', desc: 'Klassisk interiør' },
                { label: 'Utendørs dining', emoji: '🌅', file: 'trellis-outdoor-dining.glb', desc: 'Piazza & bord' },
                { label: 'Restaurantfasade', emoji: '🏛️', file: 'trellis-exterior.glb', desc: 'Bygningsfasade' },
              ].map((env) => (
                <Box
                  key={env.file}
                  onClick={() => window.dispatchEvent(new CustomEvent('ch-load-environment', { detail: { url: `/models/environments/napoli/${env.file}`, scale: 10 } }))}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(99,102,241,0.07)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    cursor: 'pointer',
                    '&:hover': {
                      background: 'rgba(99,102,241,0.15)',
                      borderColor: 'rgba(99,102,241,0.5)',
                      transform: 'translateX(2px)',
                    },
                    transition: 'all 0.15s',
                  }}
                >
                  <Typography sx={{ fontSize: 18 }}>{env.emoji}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#c7d2fe', fontSize: 12.5, fontWeight: 600 }}>{env.label}</Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: 11 }}>{env.desc}</Typography>
                  </Box>
                  <Typography sx={{ color: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}>GLB</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Merkevarebygging — Scene Branding */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,109,0,0.2)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: brandingOpen ? 1.5 : 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessCenter sx={{ color: '#ff9a4d', fontSize: 18 }} />
                <Typography sx={{ color: '#ff9a4d', fontWeight: 700, fontSize: 13 }}>
                  Merkevarebygging
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => setBrandingOpen(v => !v)}
                sx={{ color: '#ff6d00', fontSize: 12, minWidth: 0, p: '3px 10px', borderRadius: '8px', bgcolor: 'rgba(255,109,0,0.08)', '&:hover': { bgcolor: 'rgba(255,109,0,0.18)' } }}
              >
                {brandingOpen ? 'Skjul' : 'Sett opp'}
              </Button>
            </Box>
            {brandingOpen && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography sx={{ color: '#888', fontSize: 11, mb: 0.5 }}>Bedriftsnavn</Typography>
                  <InputBase
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="F.eks. Napoli Pizzeria AS"
                    sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '8px', px: 1.5, py: 0.8, fontSize: 13, color: '#fff', width: '100%', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ color: '#888', fontSize: 11, mb: 0.5 }}>Logo-URL (PNG / SVG)</Typography>
                  <InputBase
                    value={brandLogoUrl}
                    onChange={e => setBrandLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '8px', px: 1.5, py: 0.8, fontSize: 13, color: '#fff', width: '100%', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#888', fontSize: 11, mb: 0.5 }}>Merkevarefarge</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '8px', px: 1.5, py: 0.5, border: '1px solid rgba(255,255,255,0.12)' }}>
                      <Box
                        component="input"
                        type="color"
                        value={brandColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrandColor(e.target.value)}
                        sx={{ width: 28, height: 28, border: 'none', borderRadius: '6px', cursor: 'pointer', bgcolor: 'transparent', p: 0 }}
                      />
                      <Typography sx={{ color: '#ccc', fontSize: 12, fontFamily: 'monospace' }}>{brandColor.toUpperCase()}</Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('ch-apply-scene-branding', {
                        detail: { companyName: brandName, logoUrl: brandLogoUrl, brandColor },
                      }));
                    }}
                    sx={{
                      bgcolor: brandColor,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      px: 2,
                      py: 1,
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: brandColor, filter: 'brightness(1.2)' },
                    }}
                  >
                    Bruk i scene
                  </Button>
                </Box>
                <Typography sx={{ color: '#666', fontSize: 11, lineHeight: 1.5 }}>
                  Merkevarenavn og logo plasseres på skiltet i scenen og i eksporterte stillbilder.
                </Typography>
              </Box>
            )}
          </Box>

          {/* Cinematic Director for Napoli Dreams */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,109,0,0.2)' }}>
            <CinematicDirectorPanel sceneType="napoli" />
          </Box>
        </Box>
      )}

      {/* ─── Hollywood Studio Section ─────────────────────────────────────── */}
      {(activeKategori === 'story' || activeKategori === 'hollywood' || activeKategori === 'alle') && (() => {
        const hwPreset = scenarioPresets.find(p => p.id === 'story-hollywood-studio');
        if (!hwPreset) return null;
        return (
          <Box sx={{
            mb: 3,
            p: 3,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0a0a12 0%, #0d0d20 50%, #0a0a12 100%)',
            border: '1px solid rgba(255,193,7,0.35)',
            boxShadow: '0 4px 24px rgba(255,193,7,0.08)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Movie sx={{ color: '#ffc107', fontSize: 28 }} />
              <Typography sx={{ color: '#ffd54f', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>
                Hollywood Studio
              </Typography>
              <Box sx={{
                ml: 'auto',
                px: 1.5,
                py: 0.4,
                borderRadius: '20px',
                background: 'rgba(255,193,7,0.12)',
                border: '1px solid rgba(255,193,7,0.3)',
              }}>
                <Typography sx={{ color: '#ffc107', fontSize: 12, fontWeight: 600 }}>
                  AI + TRELLIS · Full produksjon
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ color: '#9e8c44', fontSize: 13.5, lineHeight: 1.6, mb: 2 }}>
              Et komplett Hollywood-nivå produksjonsstudio med 15 profesjonelle rekvisitter. LED-videowall (virtual production), kinokamera på dolly-spor, jib-kran, lydmikser og video village. Miljøet er AI-generert og konvertert til 3D med TRELLIS.
            </Typography>

            {/* Equipment overview */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
              {[
                { icon: '🎬', label: 'Kinokamera' },
                { icon: '💡', label: 'LED SkyPanel' },
                { icon: '🎤', label: 'Bom-mikrofon' },
                { icon: '🖥️', label: 'Video Village' },
                { icon: '📽️', label: 'Jib-kran' },
                { icon: '🌟', label: 'LED Videowall' },
                { icon: '🎚️', label: 'Lydmikser' },
                { icon: '🎞️', label: 'Dolly-spor' },
                { icon: '💺', label: 'Regissørstol' },
                { icon: '🔦', label: 'Fresnel-spot' },
              ].map((eq) => (
                <Box key={eq.label} sx={{
                  px: 1.2,
                  py: 0.5,
                  borderRadius: '8px',
                  background: 'rgba(255,193,7,0.07)',
                  border: '1px solid rgba(255,193,7,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}>
                  <Typography sx={{ fontSize: 13 }}>{eq.icon}</Typography>
                  <Typography sx={{ color: '#cbb060', fontSize: 11.5, fontWeight: 600 }}>{eq.label}</Typography>
                </Box>
              ))}
            </Box>

            {/* Load scene button */}
            <Button
              variant="contained"
              fullWidth
              startIcon={<Landscape sx={{ fontSize: 18 }} />}
              onClick={() => {
                storySceneLoaderService.load(hwPreset);
              }}
              sx={{
                mb: 1.5,
                bgcolor: '#ffc107',
                color: '#000',
                fontWeight: 700,
                fontSize: 13.5,
                letterSpacing: 0.5,
                '&:hover': {
                  bgcolor: '#ffd54f',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(255,193,7,0.4)',
                },
                transition: 'all 0.18s',
              }}
            >
              Last inn Hollywood Studio
            </Button>

            {/* TRELLIS-generated studio environments */}
            <Typography sx={{ color: '#7c6d30', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
              TRELLIS-genererte studiomiljøer
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[
                { label: 'Hollywood Studio (hoved)', emoji: '🏟️', file: 'trellis-studio-main.glb', desc: 'AI-generert · hoved-lydstudio' },
                { label: 'Kamerarigg-oppsett', emoji: '🎥', file: 'trellis-camera-setup.glb', desc: 'AI-generert · kinokamera-scene' },
              ].map((env) => (
                <Box
                  key={env.file}
                  onClick={() => window.dispatchEvent(new CustomEvent('ch-load-environment', { detail: { url: `/models/environments/studio/${env.file}`, scale: 10 } }))}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,193,7,0.06)',
                    border: '1px solid rgba(255,193,7,0.18)',
                    cursor: 'pointer',
                    '&:hover': {
                      background: 'rgba(255,193,7,0.14)',
                      borderColor: 'rgba(255,193,7,0.45)',
                      transform: 'translateX(2px)',
                    },
                    transition: 'all 0.15s',
                  }}
                >
                  <Typography sx={{ fontSize: 18 }}>{env.emoji}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#ffd54f', fontSize: 12.5, fontWeight: 600 }}>{env.label}</Typography>
                    <Typography sx={{ color: '#6b5d20', fontSize: 11 }}>{env.desc}</Typography>
                  </Box>
                  <Typography sx={{ color: '#4b4020', fontSize: 10, fontFamily: 'monospace' }}>GLB</Typography>
                </Box>
              ))}
            </Box>

            {/* Cinematic Director for Hollywood Studio */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,193,7,0.15)' }}>
              <CinematicDirectorPanel sceneType="hollywood" />
            </Box>
          </Box>
        );
      })()}

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: 2.5 
      }}>
        {filteredPresets.map((preset) => 
          renderPresetCard(preset, preset.kategori === 'mine-oppsett')
        )}
      </Box>

      <Dialog 
        open={showSetupTypeDialog} 
        onClose={() => setShowSetupTypeDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            borderRadius: isIPadFriendly ? '20px' : '16px',
            border: '2px solid #333',
            maxHeight: isIPadFriendly ? '90vh' : '85vh',
            m: isIPadFriendly ? 2 : 1,
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
          px: isIPadFriendly ? 3 : 2.5,
          py: isIPadFriendly ? 2.5 : 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isIPadFriendly ? 2 : 1.5 }}>
            <Add sx={{ color: '#ff5722', fontSize: isIPadFriendly ? 28 : 24 }} />
            <Typography sx={{ fontSize: isIPadFriendly ? '1.5rem' : '1.25rem', fontWeight: 700 }}>
            Nytt oppsett
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setShowSetupTypeDialog(false)} 
            sx={{ 
              color: '#fff',
              minWidth: isIPadFriendly ? 48 : 40,
              minHeight: isIPadFriendly ? 48 : 40,
              '&:focus-visible': {
                outline: '3px solid #2196f3',
                outlineOffset: '2px',
              },
            }}
            aria-label="Lukk dialog"
          >
            <Close sx={{ fontSize: isIPadFriendly ? 28 : 24 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: isIPadFriendly ? 4 : 3, px: isIPadFriendly ? 3 : 2.5, pb: isIPadFriendly ? 3 : 2 }}>
          <Typography sx={{ 
            color: '#fff', 
            mb: isIPadFriendly ? 4 : 3, 
            fontSize: isIPadFriendly ? '1.125rem' : '0.9375rem',
            lineHeight: 1.6,
            fontWeight: 500,
          }}>
            Hva slags oppsett vil du lage?
          </Typography>
          <Stack spacing={isIPadFriendly ? 3 : 2}>
            <Button
              variant="outlined"
              onClick={() => handleSelectSetupType('foto')}
              sx={{
                p: isIPadFriendly ? 4 : 3,
                minHeight: isIPadFriendly ? 120 : 100,
                borderRadius: '16px',
                borderColor: '#2196f3',
                borderWidth: 3,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: isIPadFriendly ? 3 : 2,
                bgcolor: '#2a2a2a',
                '&:hover': {
                  borderColor: '#42a5f5',
                  bgcolor: 'rgba(33,150,243,0.15)',
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                  outline: '3px solid #2196f3',
                  outlineOffset: '4px',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{
                width: isIPadFriendly ? 72 : 56,
                height: isIPadFriendly ? 72 : 56,
                borderRadius: '16px',
                bgcolor: 'rgba(33,150,243,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <PhotoCamera sx={{ fontSize: isIPadFriendly ? 36 : 28, color: '#2196f3' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: isIPadFriendly ? '1.25rem' : '1rem',
                  mb: 1,
                  lineHeight: 1.3,
                }}>
                  Foto-oppsett
                </Typography>
                <Typography sx={{ 
                  color: '#ccc', 
                  fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                  lineHeight: 1.5,
                }}>
                  For stillbilder med fotokameraer (Sony A7, Canon R5, Nikon Z8, etc.)
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleSelectSetupType('video')}
              sx={{
                p: isIPadFriendly ? 4 : 3,
                minHeight: isIPadFriendly ? 120 : 100,
                borderRadius: '16px',
                borderColor: '#e91e63',
                borderWidth: 3,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: isIPadFriendly ? 3 : 2,
                bgcolor: '#2a2a2a',
                '&:hover': {
                  borderColor: '#f06292',
                  bgcolor: 'rgba(233,30,99,0.15)',
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                  outline: '3px solid #e91e63',
                  outlineOffset: '4px',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{
                width: isIPadFriendly ? 72 : 56,
                height: isIPadFriendly ? 72 : 56,
                borderRadius: '16px',
                bgcolor: 'rgba(233,30,99,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Videocam sx={{ fontSize: isIPadFriendly ? 36 : 28, color: '#e91e63' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: isIPadFriendly ? '1.25rem' : '1rem',
                  mb: 1,
                  lineHeight: 1.3,
                }}>
                  Video-oppsett
                </Typography>
                <Typography sx={{ 
                  color: '#ccc', 
                  fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                  lineHeight: 1.5,
                }}>
                  For film og video med cine-kameraer (ARRI, RED, Blackmagic, etc.)
                </Typography>
              </Box>
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showModeSelection} 
        onClose={() => setShowModeSelection(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            borderRadius: isIPadFriendly ? '20px' : '16px',
            border: '2px solid #333',
            maxHeight: isIPadFriendly ? '90vh' : '85vh',
            m: isIPadFriendly ? 2 : 1,
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
          px: isIPadFriendly ? 3 : 2.5,
          py: isIPadFriendly ? 2.5 : 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isIPadFriendly ? 2 : 1.5 }}>
            <Add sx={{ color: '#ff5722', fontSize: isIPadFriendly ? 28 : 24 }} />
            <Typography sx={{ fontSize: isIPadFriendly ? '1.5rem' : '1.25rem', fontWeight: 700 }}>
            Velg oppsettmetode
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setShowModeSelection(false)} 
            sx={{ 
              color: '#fff',
              minWidth: isIPadFriendly ? 48 : 40,
              minHeight: isIPadFriendly ? 48 : 40,
              '&:focus-visible': {
                outline: '3px solid #2196f3',
                outlineOffset: '2px',
              },
            }}
            aria-label="Lukk dialog"
          >
            <Close sx={{ fontSize: isIPadFriendly ? 28 : 24 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: isIPadFriendly ? 4 : 3, px: isIPadFriendly ? 3 : 2.5, pb: isIPadFriendly ? 3 : 2 }}>
          <Stack spacing={isIPadFriendly ? 3 : 2}>
            <Button
              variant="outlined"
              onClick={() => handleSelectMode('current')}
              sx={{
                p: isIPadFriendly ? 4 : 3,
                minHeight: isIPadFriendly ? 120 : 100,
                borderRadius: '16px',
                borderColor: '#4caf50',
                borderWidth: 3,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: isIPadFriendly ? 3 : 2,
                bgcolor: '#2a2a2a',
                '&:hover': {
                  borderColor: '#66bb6a',
                  bgcolor: 'rgba(76,175,80,0.15)',
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                  outline: '3px solid #4caf50',
                  outlineOffset: '4px',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{
                width: isIPadFriendly ? 72 : 56,
                height: isIPadFriendly ? 72 : 56,
                borderRadius: '16px',
                bgcolor: 'rgba(76,175,80,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Save sx={{ fontSize: isIPadFriendly ? 36 : 28, color: '#4caf50' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: isIPadFriendly ? '1.25rem' : '1rem',
                  mb: 1,
                  lineHeight: 1.3,
                }}>
                  Lagre nåværende scene
                </Typography>
                <Typography sx={{ 
                  color: '#ccc', 
                  fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                  lineHeight: 1.5,
                }}>
                  Lagrer lys, kamera og bakgrunn fra det du ser i 3D-visningen
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleSelectMode('custom')}
              sx={{
                p: isIPadFriendly ? 4 : 3,
                minHeight: isIPadFriendly ? 120 : 100,
                borderRadius: '16px',
                borderColor: '#2196f3',
                borderWidth: 3,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: isIPadFriendly ? 3 : 2,
                bgcolor: '#2a2a2a',
                '&:hover': {
                  borderColor: '#42a5f5',
                  bgcolor: 'rgba(33,150,243,0.15)',
                  transform: 'translateY(-2px)',
                },
                '&:focus-visible': {
                  outline: '3px solid #2196f3',
                  outlineOffset: '4px',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{
                width: isIPadFriendly ? 72 : 56,
                height: isIPadFriendly ? 72 : 56,
                borderRadius: '16px',
                bgcolor: 'rgba(33,150,243,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Build sx={{ fontSize: isIPadFriendly ? 36 : 28, color: '#2196f3' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: isIPadFriendly ? '1.25rem' : '1rem',
                  mb: 1,
                  lineHeight: 1.3,
                }}>
                  Bygg eget oppsett
                </Typography>
                <Typography sx={{ 
                  color: '#ccc', 
                  fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                  lineHeight: 1.5,
                }}>
                  Velg kamera, linse, bakgrunnsfarge og lystemperatur manuelt
                </Typography>
              </Box>
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        maxWidth={createMode === 'custom' && !editingPreset ? 'lg' : 'sm'}
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            borderRadius: isIPadFriendly ? '20px' : '16px',
            border: '2px solid #333',
            maxHeight: isIPadFriendly ? '90vh' : '85vh',
            m: isIPadFriendly ? 2 : 1,
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
          px: isIPadFriendly ? 3 : 2.5,
          py: isIPadFriendly ? 2.5 : 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isIPadFriendly ? 2 : 1.5 }}>
            {editingPreset ? <Edit sx={{ color: '#ff5722', fontSize: isIPadFriendly ? 28 : 24 }} /> : 
             createMode === 'current' ? <Save sx={{ color: '#4caf50', fontSize: isIPadFriendly ? 28 : 24 }} /> : 
             <Build sx={{ color: '#2196f3', fontSize: isIPadFriendly ? 28 : 24 }} />}
            <Typography sx={{ fontSize: isIPadFriendly ? '1.5rem' : '1.25rem', fontWeight: 700 }}>
            {editingPreset ? 'Rediger oppsett' : 
             createMode === 'current' ? 'Lagre nåværende scene' : 
             'Bygg eget oppsett'}
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setShowCreateDialog(false)} 
            sx={{ 
              color: '#fff',
              minWidth: isIPadFriendly ? 48 : 40,
              minHeight: isIPadFriendly ? 48 : 40,
              '&:focus-visible': {
                outline: '3px solid #2196f3',
                outlineOffset: '2px',
              },
            }}
            aria-label="Lukk dialog"
          >
            <Close sx={{ fontSize: isIPadFriendly ? 28 : 24 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          pt: isIPadFriendly ? 4 : 3, 
          px: isIPadFriendly ? 3 : 2.5, 
          pb: isIPadFriendly ? 3 : 2,
          '&.MuiDialogContent-root': {
            overflowY: 'auto',
          },
        }}>
          <TextField
            fullWidth
            label="Navn"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            required
            sx={{ 
              mb: isIPadFriendly ? 4 : 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                minHeight: isIPadFriendly ? 96 : 56,
                fontSize: isIPadFriendly ? '2rem' : '1rem',
                borderRadius: '12px',
                '& fieldset': { 
                  borderColor: '#666',
                  borderWidth: 3,
                },
                '&:hover fieldset': { 
                  borderColor: '#888',
                  borderWidth: 3,
                },
                '&.Mui-focused fieldset': { 
                  borderColor: '#ff5722',
                  borderWidth: 4,
                },
                '&.Mui-error fieldset': {
                  borderColor: '#f44336',
                  borderWidth: 4,
                },
              },
              '& .MuiInputLabel-root': { 
                color: '#ddd',
                fontSize: isIPadFriendly ? '2rem' : '1rem',
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#ff5722',
                  fontWeight: 600,
                },
              },
              '& .MuiInputBase-input': {
                padding: isIPadFriendly ? '28px 26px' : '16px 14px',
                fontSize: isIPadFriendly ? '2rem' : '1rem',
                lineHeight: 1.5,
                '&::placeholder': {
                  color: '#999',
                  opacity: 1,
                  fontSize: isIPadFriendly ? '1.5rem' : '0.9375rem',
                },
              },
              '& .MuiFormHelperText-root': {
                fontSize: isIPadFriendly ? '1.5rem' : '0.875rem',
                marginTop: isIPadFriendly ? 1.5 : 0.5,
              },
            }}
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            multiline
            rows={isIPadFriendly ? 4 : 3}
            sx={{ 
              mb: isIPadFriendly ? 4 : 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                fontSize: isIPadFriendly ? '2rem' : '1rem',
                borderRadius: '12px',
                minHeight: isIPadFriendly ? 200 : 90,
                '& fieldset': { 
                  borderColor: '#666',
                  borderWidth: 3,
                },
                '&:hover fieldset': { 
                  borderColor: '#888',
                  borderWidth: 3,
                },
                '&.Mui-focused fieldset': { 
                  borderColor: '#ff5722',
                  borderWidth: 4,
                },
              },
              '& .MuiInputLabel-root': { 
                color: '#ddd',
                fontSize: isIPadFriendly ? '2rem' : '1rem',
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#ff5722',
                  fontWeight: 600,
                },
              },
              '& .MuiInputBase-input': {
                padding: isIPadFriendly ? '28px 26px' : '16px 14px',
                fontSize: isIPadFriendly ? '2rem' : '1rem',
                lineHeight: 1.6,
                '&::placeholder': {
                  color: '#999',
                  opacity: 1,
                  fontSize: isIPadFriendly ? '1.5rem' : '0.9375rem',
                },
              },
              '& .MuiFormHelperText-root': {
                fontSize: isIPadFriendly ? '1.5rem' : '0.875rem',
                marginTop: isIPadFriendly ? 1.5 : 0.5,
              },
            }}
          />
          <TextField
            fullWidth
            label="Tagger (kommaseparert)"
            value={presetTags}
            onChange={(e) => setPresetTags(e.target.value)}
            placeholder="portrett, dramatisk, 2-lys"
            helperText="Separer flere tagger med komma"
            sx={{ 
              mb: isIPadFriendly ? 4 : 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                minHeight: isIPadFriendly ? 64 : 56,
                fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                borderRadius: '12px',
                '& fieldset': { 
                  borderColor: '#666',
                  borderWidth: 3,
                },
                '&:hover fieldset': { 
                  borderColor: '#888',
                  borderWidth: 3,
                },
                '&.Mui-focused fieldset': { 
                  borderColor: '#ff5722',
                  borderWidth: 4,
                },
              },
              '& .MuiInputLabel-root': { 
                color: '#ddd',
                fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#ff5722',
                  fontWeight: 600,
                },
              },
              '& .MuiInputBase-input': {
                padding: isIPadFriendly ? '20px 18px' : '16px 14px',
                fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                lineHeight: 1.5,
                '&::placeholder': {
                  color: '#999',
                  opacity: 1,
                  fontSize: isIPadFriendly ? '1rem' : '0.9375rem',
                },
              },
              '& .MuiFormHelperText-root': {
                fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                marginTop: isIPadFriendly ? 1 : 0.5,
                color: '#aaa',
              },
            }}
          />
          
          {createMode === 'custom' && !editingPreset && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ 
                mb: 2, 
                p: 1.5, 
                bgcolor: setupType === 'foto' ? 'rgba(33,150,243,0.1)' : 'rgba(233,30,99,0.1)', 
                borderRadius: '8px',
                border: `1px solid ${setupType === 'foto' ? 'rgba(33,150,243,0.3)' : 'rgba(233,30,99,0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                {setupType === 'foto' ? 
                  <PhotoCamera sx={{ color: '#2196f3' }} /> : 
                  <Videocam sx={{ color: '#e91e63' }} />
                }
                <Typography sx={{ color: setupType === 'foto' ? '#2196f3' : '#e91e63', fontWeight: 600 }}>
                  {setupType === 'foto' ? 'Foto-oppsett' : 'Video-oppsett'}
                </Typography>
              </Box>
              
              <Tabs
                value={customBuildTab}
                onChange={(_, v) => setCustomBuildTab(v)}
                variant={isIPadFriendly ? 'fullWidth' : 'standard'}
                sx={{
                  mb: isIPadFriendly ? 5 : 4,
                  borderBottom: '2px solid #333',
                  '& .MuiTab-root': { 
                    color: '#ccc', 
                    minHeight: isIPadFriendly ? 80 : 64,
                    fontSize: isIPadFriendly ? '1.25rem' : '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    padding: isIPadFriendly ? '20px 24px' : '16px 20px',
                    gap: isIPadFriendly ? 1.5 : 1,
                    '&:hover': {
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.05)',
                  },
                    '&:focus-visible': {
                      outline: '4px solid #2196f3',
                      outlineOffset: '3px',
                      borderRadius: '8px',
                    },
                    '&.Mui-selected': {
                      color: '#2196f3',
                      fontWeight: 700,
                    },
                  },
                  '& .MuiTabs-indicator': { 
                    bgcolor: '#2196f3',
                    height: isIPadFriendly ? 5 : 4,
                  },
                }}
              >
                <Tab 
                  icon={<CameraAlt sx={{ fontSize: isIPadFriendly ? 32 : 24 }} />} 
                  label="Kamera" 
                  iconPosition="start" 
                />
                <Tab 
                  icon={<CameraEnhance sx={{ fontSize: isIPadFriendly ? 32 : 24 }} />} 
                  label="Linse" 
                  iconPosition="start" 
                />
                <Tab 
                  icon={<FlashOn sx={{ fontSize: isIPadFriendly ? 32 : 24 }} />} 
                  label="Lys" 
                  iconPosition="start" 
                />
                <Tab 
                  icon={<Wallpaper sx={{ fontSize: isIPadFriendly ? 32 : 24 }} />} 
                  label="Bakgrunn" 
                  iconPosition="start" 
                />
              </Tabs>

              {customBuildTab === 0 && (
                <Box>
                  {setupType === 'video' && (
                    <Box sx={{ mb: 3 }}>
                  <Typography sx={{ 
                    color: '#fff', 
                    fontWeight: 600, 
                    mb: isIPadFriendly ? 3 : 2,
                    fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                  }}>
                        Hvor mange kameraer?
                      </Typography>
                  <Stack direction="row" spacing={isIPadFriendly ? 2 : 1.5} sx={{ flexWrap: 'wrap', gap: isIPadFriendly ? 2 : 1 }}>
                        {[1, 2, 3, 4].map((count) => (
                          <Button
                            key={count}
                            onClick={() => setCameraCount(count)}
                            sx={{
                          minWidth: isIPadFriendly ? 100 : 80,
                          minHeight: isIPadFriendly ? 100 : 80,
                              flexDirection: 'column',
                          borderRadius: '16px',
                          border: cameraCount === count ? '3px solid #2196f3' : '2px solid #555',
                          bgcolor: cameraCount === count ? 'rgba(33,150,243,0.2)' : '#2a2a2a',
                          gap: 0.5,
                              '&:hover': {
                            borderColor: '#42a5f5',
                            bgcolor: 'rgba(33,150,243,0.15)',
                            transform: 'translateY(-2px)',
                              },
                          '&:focus-visible': {
                            outline: '3px solid #2196f3',
                            outlineOffset: '4px',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                          >
                        <Videocam sx={{ fontSize: isIPadFriendly ? 32 : 28, color: cameraCount === count ? '#2196f3' : '#aaa' }} />
                        <Typography sx={{ 
                          color: cameraCount === count ? '#2196f3' : '#fff', 
                          fontWeight: 700, 
                          fontSize: isIPadFriendly ? 22 : 18,
                        }}>
                              {count}
                            </Typography>
                        <Typography sx={{ 
                          color: '#ccc', 
                          fontSize: isIPadFriendly ? 12 : 10,
                        }}>
                              {count === 1 ? 'kamera' : 'kameraer'}
                            </Typography>
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  <Typography sx={{ 
                    color: '#fff', 
                    fontWeight: 600, 
                    mb: isIPadFriendly ? 3 : 2,
                    fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                  }}>
                    Velg kamera ({setupType === 'foto' ? 'Fotokameraer' : 'Cine-kameraer'})
                  </Typography>
                  <Box sx={{ 
                    maxHeight: isIPadFriendly ? 500 : 400, 
                    overflow: 'auto',
                    display: 'grid',
                    gridTemplateColumns: isIPadFriendly 
                      ? 'repeat(auto-fill, minmax(200px, 1fr))' 
                      : 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: isIPadFriendly ? 2.5 : 2,
                  }}>
                    {filteredCameras.map((cam) => (
                      <Button
                        key={cam.id}
                        onClick={() => setSelectedCameraId(cam.id)}
                        sx={{
                          p: isIPadFriendly ? 2.5 : 2,
                          minHeight: isIPadFriendly ? 140 : 100,
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          border: selectedCameraId === cam.id ? '3px solid #2196f3' : '2px solid #555',
                          bgcolor: selectedCameraId === cam.id ? 'rgba(33,150,243,0.2)' : '#2a2a2a',
                          textTransform: 'none',
                          gap: isIPadFriendly ? 1.5 : 1,
                          '&:hover': {
                            borderColor: '#42a5f5',
                            bgcolor: 'rgba(33,150,243,0.15)',
                            transform: 'translateY(-2px)',
                          },
                          '&:focus-visible': {
                            outline: '3px solid #2196f3',
                            outlineOffset: '4px',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {cam.image && (
                          <Box
                            component="img"
                            src={cam.image}
                            alt={cam.name}
                            sx={{ 
                              width: isIPadFriendly ? 72 : 56, 
                              height: isIPadFriendly ? 72 : 56, 
                              objectFit: 'contain', 
                              mb: isIPadFriendly ? 1 : 0.5,
                            }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <Typography sx={{ 
                          color: '#fff', 
                          fontSize: isIPadFriendly ? '1rem' : '0.875rem', 
                          fontWeight: 600, 
                          textAlign: 'center',
                          lineHeight: 1.3,
                        }}>
                          {cam.name}
                        </Typography>
                        <Typography sx={{ 
                          color: '#ccc', 
                          fontSize: isIPadFriendly ? '0.875rem' : '0.75rem',
                          lineHeight: 1.4,
                        }}>
                          {cam.megapixels}MP • {cam.sensor}
                        </Typography>
                      </Button>
                    ))}
                  </Box>
                  {selectedCamera && (
                    <Box sx={{ 
                      mt: isIPadFriendly ? 4 : 3, 
                      p: isIPadFriendly ? 3 : 2.5, 
                      bgcolor: 'rgba(33,150,243,0.15)', 
                      borderRadius: '16px',
                      border: '3px solid rgba(33,150,243,0.4)',
                    }}>
                      <Typography sx={{ 
                        color: '#2196f3', 
                        fontWeight: 700, 
                        fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                        mb: isIPadFriendly ? 1 : 0.5,
                      }}>
                        Valgt: {selectedCamera.name} {setupType === 'video' && cameraCount > 1 ? `(${cameraCount} stk)` : ''}
                      </Typography>
                      <Typography sx={{ 
                        color: '#ccc', 
                        fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                        lineHeight: 1.5,
                      }}>
                        {selectedCamera.sensor} • {selectedCamera.megapixels}MP • ISO {selectedCamera.baseISO}-{selectedCamera.maxISO}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {customBuildTab === 1 && (
                <Box>
                  <Typography sx={{ 
                    color: '#fff', 
                    fontWeight: 600, 
                    mb: isIPadFriendly ? 3 : 2,
                    fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                  }}>
                    Velg objektiv
                  </Typography>
                  <Box sx={{ 
                    maxHeight: isIPadFriendly ? 500 : 400, 
                    overflow: 'auto',
                    display: 'grid',
                    gridTemplateColumns: isIPadFriendly 
                      ? 'repeat(auto-fill, minmax(200px, 1fr))' 
                      : 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: isIPadFriendly ? 2.5 : 2,
                  }}>
                    {LENSES.map((lens) => (
                      <Button
                        key={lens.id}
                        onClick={() => setSelectedLensId(lens.id)}
                        sx={{
                          p: isIPadFriendly ? 2.5 : 2,
                          minHeight: isIPadFriendly ? 140 : 100,
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          border: selectedLensId === lens.id ? '3px solid #2196f3' : '2px solid #555',
                          bgcolor: selectedLensId === lens.id ? 'rgba(33,150,243,0.2)' : '#2a2a2a',
                          textTransform: 'none',
                          gap: isIPadFriendly ? 1.5 : 1,
                          '&:hover': {
                            borderColor: '#42a5f5',
                            bgcolor: 'rgba(33,150,243,0.15)',
                            transform: 'translateY(-2px)',
                          },
                          '&:focus-visible': {
                            outline: '3px solid #2196f3',
                            outlineOffset: '4px',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {lens.image && (
                          <Box
                            component="img"
                            src={lens.image}
                            alt={lens.name}
                            sx={{ 
                              width: isIPadFriendly ? 72 : 56, 
                              height: isIPadFriendly ? 72 : 56, 
                              objectFit: 'contain', 
                              mb: isIPadFriendly ? 1 : 0.5,
                            }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <Typography sx={{ 
                          color: '#fff', 
                          fontSize: isIPadFriendly ? '1rem' : '0.875rem', 
                          fontWeight: 600, 
                          textAlign: 'center',
                          lineHeight: 1.3,
                        }}>
                          {lens.name}
                        </Typography>
                        <Typography sx={{ 
                          color: '#ccc', 
                          fontSize: isIPadFriendly ? '0.875rem' : '0.75rem',
                          lineHeight: 1.4,
                        }}>
                          {lens.focalLength} • {lens.aperture}
                        </Typography>
                      </Button>
                    ))}
                  </Box>
                  {selectedLens && (
                    <Box sx={{ 
                      mt: isIPadFriendly ? 4 : 3, 
                      p: isIPadFriendly ? 3 : 2.5, 
                      bgcolor: 'rgba(33,150,243,0.15)', 
                      borderRadius: '16px',
                      border: '3px solid rgba(33,150,243,0.4)',
                    }}>
                      <Typography sx={{ 
                        color: '#2196f3', 
                        fontWeight: 700, 
                        fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                        mb: isIPadFriendly ? 1 : 0.5,
                      }}>
                        Valgt: {selectedLens.name}
                      </Typography>
                      <Typography sx={{ 
                        color: '#ccc', 
                        fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                        lineHeight: 1.5,
                      }}>
                        {selectedLens.focalLength} • {selectedLens.aperture} • {selectedLens.type}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {customBuildTab === 2 && (
                <Box>
                  <Typography sx={{ 
                    color: '#fff', 
                    fontWeight: 600, 
                    mb: isIPadFriendly ? 3 : 2,
                    fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                  }}>
                    Hvor mange lys/blits ønsker du å sette opp?
                  </Typography>
                  <Stack direction="row" spacing={isIPadFriendly ? 2 : 1.5} sx={{ flexWrap: 'wrap', gap: isIPadFriendly ? 2 : 1 }}>
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <Button
                        key={count}
                        onClick={() => {
                          setLightCount(count);
                          setSelectedLightTypes(prev => {
                            const defaultTypes = ['key', 'fill', 'back', 'rim', 'hair', 'background'];
                            if (count > prev.length) {
                              const newTypes = [...prev];
                              for (let i = prev.length; i < count; i++) {
                                newTypes.push(defaultTypes[i] || 'key');
                              }
                              return newTypes;
                            } else {
                              return prev.slice(0, count);
                            }
                          });
                          setSelectedFixtures(prev => {
                            if (count > prev.length) {
                              const newFixtures = [...prev];
                              for (let i = prev.length; i < count; i++) {
                                newFixtures.push(null);
                              }
                              return newFixtures;
                            } else {
                              return prev.slice(0, count);
                            }
                          });
                        }}
                        sx={{
                          minWidth: isIPadFriendly ? 100 : 80,
                          minHeight: isIPadFriendly ? 100 : 80,
                          flexDirection: 'column',
                          borderRadius: '16px',
                          border: lightCount === count ? '3px solid #2196f3' : '2px solid #555',
                          bgcolor: lightCount === count ? 'rgba(33,150,243,0.2)' : '#2a2a2a',
                          gap: 0.5,
                          '&:hover': {
                            borderColor: '#42a5f5',
                            bgcolor: 'rgba(33,150,243,0.15)',
                            transform: 'translateY(-2px)',
                          },
                          '&:focus-visible': {
                            outline: '3px solid #2196f3',
                            outlineOffset: '4px',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <FlashOn sx={{ fontSize: isIPadFriendly ? 32 : 28, color: lightCount === count ? '#2196f3' : '#aaa' }} />
                        <Typography sx={{ 
                          color: lightCount === count ? '#2196f3' : '#fff', 
                          fontWeight: 700, 
                          fontSize: isIPadFriendly ? 22 : 18,
                        }}>
                          {count}
                        </Typography>
                        <Typography sx={{ 
                          color: '#ccc', 
                          fontSize: isIPadFriendly ? 12 : 10,
                        }}>
                          lys
                        </Typography>
                      </Button>
                    ))}
                  </Stack>
                  
                  <Box sx={{ mt: isIPadFriendly ? 4 : 3 }}>
                    <Typography sx={{ 
                      color: '#fff', 
                      fontWeight: 600, 
                      mb: isIPadFriendly ? 3 : 2,
                      fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                    }}>
                      Konfigurer lys ({lightCount} stk)
                    </Typography>
                    <Stack spacing={isIPadFriendly ? 3 : 2}>
                      {Array.from({ length: lightCount }).map((_, idx) => {
                        const lightType = LIGHT_TYPES.find(t => t.id === (selectedLightTypes[idx] || 'key')) || LIGHT_TYPES[0];
                        const fixture = LIGHT_DATABASE.find(f => f.id === selectedFixtures[idx]);
                        return (
                          <Box 
                            key={idx} 
                            sx={{ 
                              p: isIPadFriendly ? 3 : 2, 
                              bgcolor: '#1e1e1e', 
                              borderRadius: '16px',
                              border: `3px solid ${lightType.color}60`,
                              display: 'flex',
                              gap: isIPadFriendly ? 3 : 2,
                              alignItems: 'stretch',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: `${lightType.color}80`,
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            <Box sx={{ 
                              width: isIPadFriendly ? 100 : 80, 
                              minWidth: isIPadFriendly ? 100 : 80,
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: `${lightType.color}25`,
                              borderRadius: '16px',
                              p: isIPadFriendly ? 2 : 1.5,
                              border: `2px solid ${lightType.color}40`,
                            }}>
                              <Typography sx={{ fontSize: isIPadFriendly ? 48 : 36 }}>{lightType.icon}</Typography>
                              <Typography sx={{ 
                                color: lightType.color, 
                                fontSize: isIPadFriendly ? '0.875rem' : '0.75rem', 
                                fontWeight: 700, 
                                textAlign: 'center',
                                mt: isIPadFriendly ? 1 : 0.5,
                                lineHeight: 1.2,
                              }}>
                                LYS {idx + 1}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isIPadFriendly ? 2.5 : 1.5 }}>
                              <Box>
                                <Typography sx={{ 
                                  color: '#fff', 
                                  fontSize: isIPadFriendly ? '1rem' : '0.875rem', 
                                  mb: isIPadFriendly ? 1.5 : 1,
                                  fontWeight: 600,
                                }}>
                                  Lysrolle
                                </Typography>
                                <Stack 
                                  direction="row" 
                                  spacing={isIPadFriendly ? 1.5 : 1} 
                                  sx={{ 
                                    flexWrap: 'wrap', 
                                    gap: isIPadFriendly ? 1.5 : 1,
                                  }}
                                >
                                  {LIGHT_TYPES.map((type) => (
                                    <Chip
                                      key={type.id}
                                      label={type.label}
                                      size="small"
                                      onClick={() => {
                                        setSelectedLightTypes(prev => {
                                          const newTypes = [...prev];
                                          while (newTypes.length < lightCount) newTypes.push('key');
                                          newTypes[idx] = type.id;
                                          return newTypes;
                                        });
                                      }}
                                      sx={{
                                        height: isIPadFriendly ? 44 : 36,
                                        fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                                        fontWeight: 600,
                                        minWidth: isIPadFriendly ? 100 : 80,
                                        minHeight: isIPadFriendly ? 44 : 36,
                                        bgcolor: (selectedLightTypes[idx] || 'key') === type.id ? type.color : '#333',
                                        color: (selectedLightTypes[idx] || 'key') === type.id ? '#000' : '#ccc',
                                        border: (selectedLightTypes[idx] || 'key') === type.id ? `2px solid ${type.color}` : '2px solid #555',
                                        '&:hover': { 
                                          bgcolor: (selectedLightTypes[idx] || 'key') === type.id ? type.color : '#444',
                                          borderColor: (selectedLightTypes[idx] || 'key') === type.id ? type.color : '#666',
                                          transform: 'translateY(-1px)',
                                        },
                                        '&:focus-visible': {
                                          outline: '3px solid #2196f3',
                                          outlineOffset: '3px',
                                        },
                                        '&:active': {
                                          transform: 'translateY(0)',
                                        },
                                        transition: 'all 0.2s ease',
                                      }}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                              
                              <Box>
                                <Typography sx={{ 
                                  color: '#fff', 
                                  fontSize: isIPadFriendly ? '1rem' : '0.875rem', 
                                  mb: isIPadFriendly ? 1.5 : 1,
                                  fontWeight: 600,
                                }}>
                                  Lyskilde
                                </Typography>
                                <Button
                                  variant="outlined"
                                  onClick={() => setLightPickerOpen(idx)}
                                  sx={{
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    textTransform: 'none',
                                    borderColor: fixture ? '#2196f3' : '#555',
                                    borderWidth: 3,
                                    borderRadius: '16px',
                                    minHeight: isIPadFriendly ? 64 : 56,
                                    px: isIPadFriendly ? 3 : 2.5,
                                    py: isIPadFriendly ? 2 : 1.5,
                                    color: fixture ? '#fff' : '#ccc',
                                    bgcolor: fixture ? 'rgba(33,150,243,0.2)' : '#2a2a2a',
                                    fontSize: isIPadFriendly ? '1rem' : '0.9375rem',
                                    gap: isIPadFriendly ? 1.5 : 1,
                                    '&:hover': {
                                      borderColor: '#42a5f5',
                                      bgcolor: fixture ? 'rgba(33,150,243,0.25)' : 'rgba(33,150,243,0.15)',
                                      transform: 'translateY(-2px)',
                                    },
                                    '&:focus-visible': {
                                      outline: '3px solid #2196f3',
                                      outlineOffset: '4px',
                                    },
                                    '&:active': {
                                      transform: 'translateY(0)',
                                    },
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <FlashOn sx={{ 
                                    fontSize: isIPadFriendly ? 28 : 22, 
                                    color: fixture ? '#2196f3' : '#888',
                                  }} />
                                  {fixture ? (
                                    <Box sx={{ textAlign: 'left', flex: 1 }}>
                                      <Typography sx={{ 
                                        fontSize: isIPadFriendly ? '1rem' : '0.875rem', 
                                        fontWeight: 600,
                                        lineHeight: 1.3,
                                        mb: 0.5,
                                      }}>
                                        {getLightDisplayName(fixture)}
                                      </Typography>
                                      <Typography sx={{ 
                                        fontSize: isIPadFriendly ? '0.875rem' : '0.75rem', 
                                        color: '#ccc',
                                        lineHeight: 1.4,
                                      }}>
                                        {getLightPowerDisplay(fixture)} • {fixture.type === 'strobe' ? 'Blits' : 'LED'}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Typography sx={{ 
                                      fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                                      color: '#aaa',
                                      flex: 1,
                                      textAlign: 'left',
                                    }}>
                                      Velg lyskilde...
                                    </Typography>
                                  )}
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                  
                  <Dialog
                    open={lightPickerOpen !== null}
                    onClose={() => setLightPickerOpen(null)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ 
                      sx: { 
                        bgcolor: '#1a1a1a', 
                        borderRadius: isIPadFriendly ? '20px' : '16px',
                        maxHeight: isIPadFriendly ? '90vh' : '85vh',
                        m: isIPadFriendly ? 2 : 1,
                      } 
                    }}
                  >
                    <DialogTitle sx={{ 
                      color: '#fff', 
                      borderBottom: '1px solid #333',
                      px: isIPadFriendly ? 3 : 2.5,
                      py: isIPadFriendly ? 2.5 : 2,
                      fontSize: isIPadFriendly ? '1.25rem' : '1.125rem',
                    }}>
                      Velg lyskilde for Lys {(lightPickerOpen ?? 0) + 1}
                    </DialogTitle>
                    <DialogContent sx={{ 
                      p: isIPadFriendly ? 3 : 2, 
                      mt: isIPadFriendly ? 2 : 1,
                      '&.MuiDialogContent-root': {
                        overflowY: 'auto',
                      },
                    }}>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: isIPadFriendly 
                          ? 'repeat(auto-fill, minmax(160px, 1fr))' 
                          : 'repeat(auto-fill, minmax(140px, 1fr))', 
                        gap: isIPadFriendly ? 2 : 1.5,
                      }}>
                        {LIGHT_DATABASE.map((fix) => (
                          <Button
                            key={fix.id}
                            onClick={() => {
                              if (lightPickerOpen !== null) {
                                setSelectedFixtures(prev => {
                                  const newFix = [...prev];
                                  while (newFix.length <= lightPickerOpen) newFix.push(null);
                                  newFix[lightPickerOpen] = fix.id;
                                  return newFix;
                                });
                                setLightPickerOpen(null);
                              }
                            }}
                            sx={{
                              p: isIPadFriendly ? 2 : 1,
                              minHeight: isIPadFriendly ? 120 : 100,
                              flexDirection: 'column',
                              alignItems: 'center',
                              textTransform: 'none',
                              borderRadius: '16px',
                              border: selectedFixtures[lightPickerOpen ?? 0] === fix.id ? '3px solid #2196f3' : '2px solid #555',
                              bgcolor: selectedFixtures[lightPickerOpen ?? 0] === fix.id ? 'rgba(33,150,243,0.2)' : '#2a2a2a',
                              gap: 1,
                              '&:hover': {
                                borderColor: '#42a5f5',
                                bgcolor: 'rgba(33,150,243,0.15)',
                                transform: 'translateY(-2px)',
                              },
                              '&:focus-visible': {
                                outline: '3px solid #2196f3',
                                outlineOffset: '4px',
                              },
                              '&:active': {
                                transform: 'translateY(0)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Box
                              sx={{
                                width: isIPadFriendly ? 100 : 80,
                                height: isIPadFriendly ? 100 : 80,
                                borderRadius: '12px',
                                bgcolor: '#222',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: isIPadFriendly ? 1.5 : 1,
                                overflow: 'hidden',
                                border: '2px solid #333',
                              }}
                            >
                              {fix.thumbnail ? (
                                <Box
                                  component="img"
                                  src={fix.thumbnail}
                                  alt={getLightDisplayName(fix)}
                                  sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                  }}
                                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><svg style="color:${fix.type === 'strobe' ? '#ffc107' : '#4fc3f7'};width:40px;height:40px" viewBox="0 0 24 24"><path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/></svg></div>`;
                                  }}
                                />
                              ) : (
                                <FlashOn sx={{ 
                                  color: fix.type === 'strobe' ? '#ffc107' : '#4fc3f7', 
                                  fontSize: isIPadFriendly ? 48 : 40,
                                }} />
                              )}
                            </Box>
                            <Typography sx={{ 
                              color: '#fff', 
                              fontSize: isIPadFriendly ? '0.875rem' : '0.6875rem', 
                              fontWeight: 600, 
                              textAlign: 'center', 
                              lineHeight: 1.3,
                            }}>
                              {getLightDisplayName(fix)}
                            </Typography>
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: isIPadFriendly ? '0.75rem' : '0.625rem', 
                              textAlign: 'center',
                              lineHeight: 1.4,
                            }}>
                              {getLightPowerDisplay(fix)} • {fix.type === 'strobe' ? 'Blits' : 'LED'}
                            </Typography>
                          </Button>
                        ))}
                      </Box>
                    </DialogContent>
                    <DialogActions sx={{ 
                      p: isIPadFriendly ? 3 : 2, 
                      borderTop: '1px solid #333',
                    }}>
                      <Button 
                        onClick={() => setLightPickerOpen(null)} 
                        sx={{ 
                          color: '#fff',
                          minWidth: isIPadFriendly ? 120 : 100,
                          minHeight: isIPadFriendly ? 48 : 40,
                          fontSize: isIPadFriendly ? '1rem' : '0.9375rem',
                          '&:focus-visible': {
                            outline: '3px solid #2196f3',
                            outlineOffset: '4px',
                          },
                        }}
                      >
                        Avbryt
                      </Button>
                    </DialogActions>
                  </Dialog>
                  
                  <Box sx={{ mt: isIPadFriendly ? 4 : 3 }}>
                    <Typography sx={{ 
                      color: '#fff', 
                      fontSize: isIPadFriendly ? '1rem' : '0.8125rem', 
                      mb: isIPadFriendly ? 3 : 2,
                      fontWeight: 500,
                    }}>
                      Fargetemperatur (Kelvin) for lysene:
                    </Typography>
                    <Box sx={{ px: isIPadFriendly ? 3 : 2 }}>
                      <Slider
                        value={customCCT}
                        onChange={(_, v) => setCustomCCT(v as number)}
                        min={2700}
                        max={7500}
                        marks={[
                          { value: 2700, label: 'Varm' },
                          { value: 5600, label: 'Dagslys' },
                          { value: 7500, label: 'Kald' },
                        ]}
                        valueLabelDisplay="on"
                        valueLabelFormat={(v) => `${v}K`}
                        sx={{
                          background: 'linear-gradient(90deg, #ff9800 0%, #fff 50%, #90caf9 100%)',
                          height: isIPadFriendly ? 12 : 8,
                          '& .MuiSlider-track': { display: 'none' },
                          '& .MuiSlider-rail': { opacity: 0 },
                          '& .MuiSlider-thumb': { 
                            bgcolor: '#fff', 
                            border: '3px solid #333',
                            width: isIPadFriendly ? 24 : 20,
                            height: isIPadFriendly ? 24 : 20,
                            '&:focus-visible': {
                              outline: '3px solid #2196f3',
                              outlineOffset: '4px',
                            },
                          },
                          '& .MuiSlider-markLabel': { 
                            color: '#ccc', 
                            fontSize: isIPadFriendly ? '0.875rem' : '0.6875rem',
                          },
                          '& .MuiSlider-valueLabel': { 
                            bgcolor: '#2196f3', 
                            color: '#fff', 
                            fontWeight: 700,
                            fontSize: isIPadFriendly ? '0.875rem' : '0.75rem',
                          },
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    mt: isIPadFriendly ? 4 : 3, 
                    p: isIPadFriendly ? 3 : 2.5, 
                    bgcolor: 'rgba(33,150,243,0.15)', 
                    borderRadius: '16px',
                    border: '3px solid rgba(33,150,243,0.4)',
                  }}>
                    <Typography sx={{ 
                      color: '#2196f3', 
                      fontWeight: 700, 
                      fontSize: isIPadFriendly ? '1.125rem' : '1rem', 
                      mb: isIPadFriendly ? 2 : 1.5,
                    }}>
                      Oppsummering: {lightCount} lys • {customCCT}K
                    </Typography>
                    <Stack spacing={isIPadFriendly ? 1.5 : 1}>
                    {Array.from({ length: lightCount }).map((_, idx) => {
                      const lt = LIGHT_TYPES.find(t => t.id === (selectedLightTypes[idx] || 'key'));
                      const fix = LIGHT_DATABASE.find(f => f.id === selectedFixtures[idx]);
                      return (
                          <Box 
                            key={idx} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: isIPadFriendly ? 2 : 1.5, 
                              p: isIPadFriendly ? 1.5 : 1,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              borderRadius: '12px',
                            }}
                          >
                            <Typography sx={{ 
                              fontSize: isIPadFriendly ? 24 : 18,
                            }}>
                              {lt?.icon}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ 
                                color: '#fff', 
                                fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                                fontWeight: 600,
                                lineHeight: 1.3,
                                mb: 0.25,
                              }}>
                                {lt?.label}
                              </Typography>
                              <Typography sx={{ 
                                color: '#ccc', 
                                fontSize: isIPadFriendly ? '0.875rem' : '0.75rem',
                                lineHeight: 1.4,
                              }}>
                                {fix ? getLightDisplayName(fix) : 'Ikke valgt'}
                          </Typography>
                            </Box>
                        </Box>
                      );
                    })}
                    </Stack>
                    <Box sx={{ 
                      mt: isIPadFriendly ? 2 : 1.5,
                      pt: isIPadFriendly ? 2 : 1.5,
                      borderTop: '2px solid rgba(33,150,243,0.3)',
                    }}>
                      <Typography sx={{ 
                        color: '#2196f3', 
                        fontSize: isIPadFriendly ? '0.9375rem' : '0.8125rem', 
                        fontWeight: 600,
                        lineHeight: 1.5,
                      }}>
                      CCT: {customCCT}K ({customCCT <= 3200 ? 'Varm tungsten' : customCCT <= 4500 ? 'Nøytral' : customCCT <= 5600 ? 'Dagslys' : 'Kald'})
                    </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {customBuildTab === 3 && (
                <Box>
                  <Typography sx={{ 
                    color: '#fff', 
                    fontWeight: 600, 
                    mb: isIPadFriendly ? 3 : 2,
                    fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                  }}>
                    Velg bakgrunn
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: isIPadFriendly 
                      ? 'repeat(auto-fill, minmax(160px, 1fr))' 
                      : 'repeat(auto-fill, minmax(140px, 1fr))', 
                    gap: isIPadFriendly ? 4 : 3,
                  }}>
                    {BACKDROP_DATABASE.map((backdrop) => (
                      <Box
                        key={backdrop.id}
                        onClick={() => {
                          setSelectedBackdropId(backdrop.id);
                          if (backdrop.color) setCustomBackdropColor(backdrop.color);
                        }}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          height: '100%',
                          gap: isIPadFriendly ? 1 : 0.5,
                          '&:focus-visible': {
                            outline: '3px solid #2196f3',
                            outlineOffset: '4px',
                            borderRadius: '12px',
                          },
                        }}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedBackdropId(backdrop.id);
                            if (backdrop.color) setCustomBackdropColor(backdrop.color);
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            aspectRatio: '4/3',
                            borderRadius: '16px',
                            bgcolor: '#2a2a2a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: selectedBackdropId === backdrop.id ? '4px solid #4caf50' : '3px solid #666',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                            boxShadow: selectedBackdropId === backdrop.id 
                              ? '0 4px 16px rgba(76,175,80,0.4)' 
                              : '0 2px 8px rgba(0,0,0,0.3)',
                            '&:hover': {
                              borderColor: '#4caf50',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 20px rgba(76,175,80,0.5)',
                            },
                          }}
                        >
                          <Box
                            component="img"
                            src={backdrop.thumbnail}
                            alt={backdrop.name}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              filter: 'grayscale(100%)',
                            }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                e.currentTarget.style.display = 'none';
                              }
                            }}
                          />
                        </Box>
                        <Box sx={{ 
                          flex: 1, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'flex-start',
                          width: '100%',
                          minHeight: isIPadFriendly ? 60 : 50,
                        }}>
                          <Typography sx={{ 
                            color: '#fff', 
                            fontSize: isIPadFriendly ? '1.125rem' : '1rem', 
                            fontWeight: 600, 
                            textAlign: 'center', 
                            lineHeight: 1.4,
                            mb: backdrop.size ? (isIPadFriendly ? 0.75 : 0.5) : (isIPadFriendly ? 1.5 : 1),
                          }}>
                          {backdrop.name}
                        </Typography>
                        {backdrop.size && (
                            <Typography sx={{ 
                              color: '#ccc', 
                              fontSize: isIPadFriendly ? '1rem' : '0.875rem', 
                              textAlign: 'center',
                              lineHeight: 1.4,
                              mb: isIPadFriendly ? 1.5 : 1,
                            }}>
                            {backdrop.size}
                          </Typography>
                        )}
                        </Box>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBackdropId(backdrop.id);
                            if (backdrop.color) setCustomBackdropColor(backdrop.color);
                          }}
                          sx={{
                            mt: isIPadFriendly ? 1.5 : 1,
                            bgcolor: selectedBackdropId === backdrop.id ? '#2196f3' : '#4caf50',
                            color: '#fff',
                            fontSize: isIPadFriendly ? '1.25rem' : '1.125rem',
                            fontWeight: 700,
                            px: isIPadFriendly ? 4 : 3,
                            py: isIPadFriendly ? 1.75 : 1.25,
                            minWidth: isIPadFriendly ? 180 : 140,
                            minHeight: isIPadFriendly ? 60 : 52,
                            borderRadius: '12px',
                            textTransform: 'none',
                            border: selectedBackdropId === backdrop.id ? '3px solid #fff' : '2px solid rgba(255,255,255,0.3)',
                            boxShadow: selectedBackdropId === backdrop.id 
                              ? '0 4px 12px rgba(33,150,243,0.5)' 
                              : '0 2px 8px rgba(76,175,80,0.4)',
                            '&:hover': {
                              bgcolor: selectedBackdropId === backdrop.id ? '#42a5f5' : '#66bb6a',
                              transform: 'translateY(-2px)',
                              boxShadow: selectedBackdropId === backdrop.id 
                                ? '0 6px 16px rgba(33,150,243,0.6)' 
                                : '0 4px 12px rgba(76,175,80,0.5)',
                            },
                            '&:focus-visible': {
                              outline: '3px solid #fff',
                              outlineOffset: '3px',
                              boxShadow: '0 0 0 6px rgba(33,150,243,0.3)',
                            },
                            '&:active': {
                              transform: 'translateY(0)',
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {selectedBackdropId === backdrop.id ? '✓ Valgt' : '+ Legg til'}
                        </Button>
                      </Box>
                    ))}
                  </Box>
                  
                  {selectedBackdropId && (
                    <Box sx={{ 
                      mt: isIPadFriendly ? 4 : 3, 
                      p: isIPadFriendly ? 3 : 2.5, 
                      bgcolor: 'rgba(33,150,243,0.15)', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: isIPadFriendly ? 3 : 2,
                      border: '3px solid rgba(33,150,243,0.4)',
                    }}>
                    <Box 
                      sx={{ 
                          width: isIPadFriendly ? 96 : 72, 
                          height: isIPadFriendly ? 96 : 72, 
                          borderRadius: '16px',
                        bgcolor: '#2a2a2a', 
                        overflow: 'hidden',
                          flexShrink: 0,
                          border: '3px solid #555',
                      }}
                    >
                      {selectedBackdropId && (
                        <Box
                          component="img"
                          src={BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.thumbnail}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }}
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ 
                          color: '#2196f3', 
                          fontWeight: 700, 
                          fontSize: isIPadFriendly ? '1.125rem' : '1rem',
                          mb: isIPadFriendly ? 1 : 0.5,
                        }}>
                        Valgt bakgrunn
                      </Typography>
                        <Typography sx={{ 
                          color: '#fff', 
                          fontSize: isIPadFriendly ? '1rem' : '0.875rem',
                          fontWeight: 600,
                          lineHeight: 1.4,
                          mb: isIPadFriendly ? 0.5 : 0.25,
                        }}>
                        {selectedBackdropId ? BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.name : 'Ingen valgt'}
                      </Typography>
                      {selectedBackdropId && BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.size && (
                          <Typography sx={{ 
                            color: '#ccc', 
                            fontSize: isIPadFriendly ? '0.875rem' : '0.75rem',
                            lineHeight: 1.4,
                          }}>
                          {BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.size}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
          
          {createMode === 'current' && !editingPreset && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'rgba(76,175,80,0.1)', 
              borderRadius: '10px',
              border: '1px solid rgba(76,175,80,0.3)',
            }}>
              <Typography sx={{ color: '#4caf50', fontSize: 14, fontWeight: 500 }}>
                💡 Nåværende scene-oppsett (lys, kamera, bakgrunn) vil bli lagret.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: isIPadFriendly ? 4 : 3, 
          borderTop: '1px solid #333',
          gap: isIPadFriendly ? 2 : 1.5,
        }}>
          <Button 
            onClick={() => setShowCreateDialog(false)}
            sx={{ 
              ...buttonStyle, 
              minWidth: isIPadFriendly ? 140 : 100, 
              minHeight: isIPadFriendly ? 56 : 48,
              color: '#fff', 
              borderColor: '#555',
              borderWidth: 2,
              fontSize: isIPadFriendly ? '1rem' : '0.9375rem',
              '&:focus-visible': {
                outline: '3px solid #2196f3',
                outlineOffset: '4px',
              },
            }}
            variant="outlined"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            sx={{
              ...buttonStyle,
              minWidth: isIPadFriendly ? 180 : 140,
              minHeight: isIPadFriendly ? 56 : 48,
              bgcolor: editingPreset ? '#ff5722' : createMode === 'current' ? '#4caf50' : '#2196f3',
              color: '#fff',
              fontSize: isIPadFriendly ? '1rem' : '0.9375rem',
              '&:hover': { 
                bgcolor: editingPreset ? '#ff7043' : createMode === 'current' ? '#66bb6a' : '#42a5f5',
                transform: 'translateY(-2px)',
              },
              '&:focus-visible': {
                outline: '3px solid #fff',
                outlineOffset: '4px',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': { 
                bgcolor: '#333', 
                color: '#666',
                opacity: 0.5,
              },
              transition: 'all 0.2s ease',
            }}
            variant="contained"
          >
            {editingPreset ? 'Lagre endringer' : 'Lagre oppsett'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Multiview Skeleton Panel */}
      {multiviewPreset && multiviewPreset.characters && (
        <MultiviewSkeletonPanel
          open={Boolean(multiviewPreset)}
          onClose={() => setMultiviewPreset(null)}
          characters={multiviewPreset.characters}
          sceneName={multiviewPreset.navn}
        />
      )}

      {/* TRELLIS Image → 3D Environment Dialog */}
      <Suspense fallback={null}>
        <TrellisEnvironmentDialog
          open={trellisDialogOpen}
          onClose={() => setTrellisDialogOpen(false)}
          onUseEnvironment={(glbPath: string) => {
            window.dispatchEvent(new CustomEvent('ch-load-environment', {
              detail: { url: glbPath, scale: 10 },
            }));
          }}
        />
      </Suspense>
    </Box>
  );
};

export default ScenerPanel;
