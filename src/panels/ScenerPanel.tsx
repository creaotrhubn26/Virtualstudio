import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Card, CardContent, CardMedia, Stack, Chip, InputBase, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tabs, Tab, Slider } from '@mui/material';
import { Palette, Person, BusinessCenter, Favorite, Movie, Star, Lightbulb, CameraAlt, Search as SearchIcon, School, Add, Folder, Edit, Delete, Close, Save, Build, PhotoCamera, Wallpaper, Tune, Landscape, Videocam, FlashOn } from '@mui/icons-material';
import { scenarioPresets, ScenarioPreset } from '../data/scenarioPresets';
import { customPresetService, CustomPreset } from '../services/customPresetService';
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
  'mine-oppsett': <Folder sx={{ fontSize: 22 }} />,
};

const kategoriColors: Record<string, string> = {
  bryllup: '#e91e63',
  portrett: '#2196f3',
  mote: '#9c27b0',
  naeringsliv: '#4caf50',
  hollywood: '#ffc107',
  skolefoto: '#00bcd4',
  'mine-oppsett': '#ff5722',
};

const kategoriLabels: Record<string, string> = {
  alle: 'Alle',
  'mine-oppsett': 'Mine oppsett',
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

const buttonStyle = {
  minHeight: 56,
  minWidth: 110,
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

export const ScenerPanel: React.FC<ScenerPanelProps> = ({ onApplyPreset, onShowRecommended, getCurrentSceneConfig }) => {
  const [activeKategori, setActiveKategori] = useState<string>('alle');
  const [search, setSearch] = useState<string>('');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
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
      p.beskrivelse.toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
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
    setPresetDescription(preset.beskrivelse);
    setPresetTags(preset.tags.filter(t => t !== 'egendefinert').join(', '));
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

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => onApplyPreset(preset as ScenarioPreset)}
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
        {['alle', 'mine-oppsett', 'hollywood', 'skolefoto', 'bryllup', 'portrett', 'mote', 'naeringsliv'].map((kat) => (
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
            borderRadius: '16px',
            border: '2px solid #333',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Add sx={{ color: '#ff5722' }} />
            Nytt oppsett
          </Box>
          <IconButton onClick={() => setShowSetupTypeDialog(false)} sx={{ color: '#888' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ color: '#aaa', mb: 3, fontSize: 15 }}>
            Hva slags oppsett vil du lage?
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={() => handleSelectSetupType('foto')}
              sx={{
                p: 3,
                borderRadius: '12px',
                borderColor: '#2196f3',
                borderWidth: 2,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: 2,
                '&:hover': {
                  borderColor: '#2196f3',
                  bgcolor: 'rgba(33,150,243,0.1)',
                },
              }}
            >
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                bgcolor: 'rgba(33,150,243,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <PhotoCamera sx={{ fontSize: 28, color: '#2196f3' }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  Foto-oppsett
                </Typography>
                <Typography sx={{ color: '#888', fontSize: 13 }}>
                  For stillbilder med fotokameraer (Sony A7, Canon R5, Nikon Z8, etc.)
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleSelectSetupType('video')}
              sx={{
                p: 3,
                borderRadius: '12px',
                borderColor: '#e91e63',
                borderWidth: 2,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: 2,
                '&:hover': {
                  borderColor: '#e91e63',
                  bgcolor: 'rgba(233,30,99,0.1)',
                },
              }}
            >
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                bgcolor: 'rgba(233,30,99,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Videocam sx={{ fontSize: 28, color: '#e91e63' }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  Video-oppsett
                </Typography>
                <Typography sx={{ color: '#888', fontSize: 13 }}>
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
            borderRadius: '16px',
            border: '2px solid #333',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Add sx={{ color: '#ff5722' }} />
            Velg oppsettmetode
          </Box>
          <IconButton onClick={() => setShowModeSelection(false)} sx={{ color: '#888' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={() => handleSelectMode('current')}
              sx={{
                p: 3,
                borderRadius: '12px',
                borderColor: '#4caf50',
                borderWidth: 2,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: 2,
                '&:hover': {
                  borderColor: '#4caf50',
                  bgcolor: 'rgba(76,175,80,0.1)',
                },
              }}
            >
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                bgcolor: 'rgba(76,175,80,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Save sx={{ fontSize: 28, color: '#4caf50' }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  Lagre nåværende scene
                </Typography>
                <Typography sx={{ color: '#888', fontSize: 13 }}>
                  Lagrer lys, kamera og bakgrunn fra det du ser i 3D-visningen
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              onClick={() => handleSelectMode('custom')}
              sx={{
                p: 3,
                borderRadius: '12px',
                borderColor: '#2196f3',
                borderWidth: 2,
                textAlign: 'left',
                justifyContent: 'flex-start',
                gap: 2,
                '&:hover': {
                  borderColor: '#2196f3',
                  bgcolor: 'rgba(33,150,243,0.1)',
                },
              }}
            >
              <Box sx={{
                width: 56,
                height: 56,
                borderRadius: '12px',
                bgcolor: 'rgba(33,150,243,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Build sx={{ fontSize: 28, color: '#2196f3' }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  Bygg eget oppsett
                </Typography>
                <Typography sx={{ color: '#888', fontSize: 13 }}>
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
        maxWidth={createMode === 'custom' && !editingPreset ? 'md' : 'sm'}
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1e1e1e',
            borderRadius: '16px',
            border: '2px solid #333',
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {editingPreset ? <Edit sx={{ color: '#ff5722' }} /> : 
             createMode === 'current' ? <Save sx={{ color: '#4caf50' }} /> : 
             <Build sx={{ color: '#2196f3' }} />}
            {editingPreset ? 'Rediger oppsett' : 
             createMode === 'current' ? 'Lagre nåværende scene' : 
             'Bygg eget oppsett'}
          </Box>
          <IconButton onClick={() => setShowCreateDialog(false)} sx={{ color: '#888' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Navn"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff5722' },
              },
              '& .MuiInputLabel-root': { color: '#888' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ff5722' },
            }}
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            multiline
            rows={2}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff5722' },
              },
              '& .MuiInputLabel-root': { color: '#888' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ff5722' },
            }}
          />
          <TextField
            fullWidth
            label="Tagger (kommaseparert)"
            value={presetTags}
            onChange={(e) => setPresetTags(e.target.value)}
            placeholder="portrett, dramatisk, 2-lys"
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                bgcolor: '#2a2a2a',
                color: '#fff',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff5722' },
              },
              '& .MuiInputLabel-root': { color: '#888' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ff5722' },
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
                sx={{
                  mb: 3,
                  '& .MuiTab-root': { 
                    color: '#888', 
                    minHeight: 56,
                    fontSize: 14,
                    fontWeight: 600,
                  },
                  '& .Mui-selected': { color: '#2196f3' },
                  '& .MuiTabs-indicator': { bgcolor: '#2196f3' },
                }}
              >
                <Tab icon={<CameraAlt />} label="Kamera" iconPosition="start" />
                <Tab icon={<Tune />} label="Linse" iconPosition="start" />
                <Tab icon={<FlashOn />} label="Lys" iconPosition="start" />
                <Tab icon={<Wallpaper />} label="Bakgrunn" iconPosition="start" />
              </Tabs>

              {customBuildTab === 0 && (
                <Box>
                  {setupType === 'video' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                        Hvor mange kameraer?
                      </Typography>
                      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {[1, 2, 3, 4].map((count) => (
                          <Button
                            key={count}
                            onClick={() => setCameraCount(count)}
                            sx={{
                              minWidth: 80,
                              minHeight: 80,
                              flexDirection: 'column',
                              borderRadius: '12px',
                              border: cameraCount === count ? '3px solid #2196f3' : '2px solid #444',
                              bgcolor: cameraCount === count ? 'rgba(33,150,243,0.15)' : '#2a2a2a',
                              '&:hover': {
                                borderColor: '#2196f3',
                                bgcolor: 'rgba(33,150,243,0.1)',
                              },
                            }}
                          >
                            <Videocam sx={{ fontSize: 28, color: cameraCount === count ? '#2196f3' : '#888' }} />
                            <Typography sx={{ color: cameraCount === count ? '#2196f3' : '#fff', fontWeight: 700, fontSize: 18 }}>
                              {count}
                            </Typography>
                            <Typography sx={{ color: '#888', fontSize: 10 }}>
                              {count === 1 ? 'kamera' : 'kameraer'}
                            </Typography>
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                    Velg kamera ({setupType === 'foto' ? 'Fotokameraer' : 'Cine-kameraer'})
                  </Typography>
                  <Box sx={{ 
                    maxHeight: 300, 
                    overflow: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 1.5,
                  }}>
                    {filteredCameras.map((cam) => (
                      <Button
                        key={cam.id}
                        onClick={() => setSelectedCameraId(cam.id)}
                        sx={{
                          p: 1.5,
                          minHeight: 80,
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          border: selectedCameraId === cam.id ? '3px solid #2196f3' : '2px solid #444',
                          bgcolor: selectedCameraId === cam.id ? 'rgba(33,150,243,0.15)' : '#2a2a2a',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#2196f3',
                            bgcolor: 'rgba(33,150,243,0.1)',
                          },
                        }}
                      >
                        {cam.image && (
                          <Box
                            component="img"
                            src={cam.image}
                            alt={cam.name}
                            sx={{ width: 48, height: 48, objectFit: 'contain', mb: 0.5 }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                          {cam.name}
                        </Typography>
                        <Typography sx={{ color: '#888', fontSize: 10 }}>
                          {cam.megapixels}MP • {cam.sensor}
                        </Typography>
                      </Button>
                    ))}
                  </Box>
                  {selectedCamera && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(33,150,243,0.1)', borderRadius: '8px' }}>
                      <Typography sx={{ color: '#2196f3', fontWeight: 600, fontSize: 14 }}>
                        Valgt: {selectedCamera.name} {setupType === 'video' && cameraCount > 1 ? `(${cameraCount} stk)` : ''}
                      </Typography>
                      <Typography sx={{ color: '#888', fontSize: 12 }}>
                        {selectedCamera.sensor} • {selectedCamera.megapixels}MP • ISO {selectedCamera.baseISO}-{selectedCamera.maxISO}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {customBuildTab === 1 && (
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                    Velg objektiv
                  </Typography>
                  <Box sx={{ 
                    maxHeight: 300, 
                    overflow: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 1.5,
                  }}>
                    {LENSES.map((lens) => (
                      <Button
                        key={lens.id}
                        onClick={() => setSelectedLensId(lens.id)}
                        sx={{
                          p: 1.5,
                          minHeight: 80,
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          border: selectedLensId === lens.id ? '3px solid #2196f3' : '2px solid #444',
                          bgcolor: selectedLensId === lens.id ? 'rgba(33,150,243,0.15)' : '#2a2a2a',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#2196f3',
                            bgcolor: 'rgba(33,150,243,0.1)',
                          },
                        }}
                      >
                        {lens.image && (
                          <Box
                            component="img"
                            src={lens.image}
                            alt={lens.name}
                            sx={{ width: 48, height: 48, objectFit: 'contain', mb: 0.5 }}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                          {lens.name}
                        </Typography>
                        <Typography sx={{ color: '#888', fontSize: 10 }}>
                          {lens.focalLength} • {lens.aperture}
                        </Typography>
                      </Button>
                    ))}
                  </Box>
                  {selectedLens && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(33,150,243,0.1)', borderRadius: '8px' }}>
                      <Typography sx={{ color: '#2196f3', fontWeight: 600, fontSize: 14 }}>
                        Valgt: {selectedLens.name}
                      </Typography>
                      <Typography sx={{ color: '#888', fontSize: 12 }}>
                        {selectedLens.focalLength} • {selectedLens.aperture} • {selectedLens.type}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {customBuildTab === 2 && (
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                    Hvor mange lys/blits ønsker du å sette opp?
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
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
                          minWidth: 80,
                          minHeight: 80,
                          flexDirection: 'column',
                          borderRadius: '12px',
                          border: lightCount === count ? '3px solid #2196f3' : '2px solid #444',
                          bgcolor: lightCount === count ? 'rgba(33,150,243,0.15)' : '#2a2a2a',
                          '&:hover': {
                            borderColor: '#2196f3',
                            bgcolor: 'rgba(33,150,243,0.1)',
                          },
                        }}
                      >
                        <FlashOn sx={{ fontSize: 28, color: lightCount === count ? '#2196f3' : '#888' }} />
                        <Typography sx={{ color: lightCount === count ? '#2196f3' : '#fff', fontWeight: 700, fontSize: 18 }}>
                          {count}
                        </Typography>
                        <Typography sx={{ color: '#888', fontSize: 10 }}>
                          lys
                        </Typography>
                      </Button>
                    ))}
                  </Stack>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                      Konfigurer lys ({lightCount} stk)
                    </Typography>
                    <Stack spacing={1.5}>
                      {Array.from({ length: lightCount }).map((_, idx) => {
                        const lightType = LIGHT_TYPES.find(t => t.id === (selectedLightTypes[idx] || 'key')) || LIGHT_TYPES[0];
                        const fixture = LIGHT_DATABASE.find(f => f.id === selectedFixtures[idx]);
                        return (
                          <Box 
                            key={idx} 
                            sx={{ 
                              p: 2, 
                              bgcolor: '#1e1e1e', 
                              borderRadius: '16px',
                              border: `2px solid ${lightType.color}40`,
                              display: 'flex',
                              gap: 2,
                              alignItems: 'stretch',
                            }}
                          >
                            <Box sx={{ 
                              width: 60, 
                              display: 'flex', 
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: `${lightType.color}20`,
                              borderRadius: '12px',
                              p: 1,
                            }}>
                              <Typography sx={{ fontSize: 28 }}>{lightType.icon}</Typography>
                              <Typography sx={{ color: lightType.color, fontSize: 10, fontWeight: 700, textAlign: 'center' }}>
                                LYS {idx + 1}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box>
                                <Typography sx={{ color: '#888', fontSize: 10, mb: 0.5 }}>Lysrolle</Typography>
                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
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
                                        height: 28,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        bgcolor: (selectedLightTypes[idx] || 'key') === type.id ? type.color : '#333',
                                        color: (selectedLightTypes[idx] || 'key') === type.id ? '#000' : '#888',
                                        border: 'none',
                                        '&:hover': { 
                                          bgcolor: (selectedLightTypes[idx] || 'key') === type.id ? type.color : '#444',
                                        },
                                      }}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                              
                              <Box>
                                <Typography sx={{ color: '#888', fontSize: 10, mb: 0.5 }}>Lyskilde</Typography>
                                <Button
                                  variant="outlined"
                                  onClick={() => setLightPickerOpen(idx)}
                                  sx={{
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    textTransform: 'none',
                                    borderColor: '#444',
                                    borderRadius: '8px',
                                    minHeight: 44,
                                    px: 2,
                                    color: fixture ? '#fff' : '#666',
                                    bgcolor: fixture ? 'rgba(33,150,243,0.1)' : 'transparent',
                                    '&:hover': {
                                      borderColor: '#2196f3',
                                      bgcolor: 'rgba(33,150,243,0.15)',
                                    },
                                  }}
                                >
                                  <FlashOn sx={{ mr: 1, fontSize: 18, color: fixture ? '#2196f3' : '#555' }} />
                                  {fixture ? (
                                    <Box sx={{ textAlign: 'left' }}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{getLightDisplayName(fixture)}</Typography>
                                      <Typography sx={{ fontSize: 10, color: '#888' }}>{getLightPowerDisplay(fixture)} • {fixture.type === 'strobe' ? 'Blits' : 'LED'}</Typography>
                                    </Box>
                                  ) : (
                                    <Typography sx={{ fontSize: 12 }}>Velg lyskilde...</Typography>
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
                    PaperProps={{ sx: { bgcolor: '#1a1a1a', borderRadius: '16px' } }}
                  >
                    <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid #333' }}>
                      Velg lyskilde for Lys {(lightPickerOpen ?? 0) + 1}
                    </DialogTitle>
                    <DialogContent sx={{ p: 2, mt: 1 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
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
                              p: 1,
                              flexDirection: 'column',
                              alignItems: 'center',
                              textTransform: 'none',
                              borderRadius: '12px',
                              border: selectedFixtures[lightPickerOpen ?? 0] === fix.id ? '2px solid #2196f3' : '1px solid #444',
                              bgcolor: selectedFixtures[lightPickerOpen ?? 0] === fix.id ? 'rgba(33,150,243,0.15)' : '#2a2a2a',
                              '&:hover': {
                                borderColor: '#2196f3',
                                bgcolor: 'rgba(33,150,243,0.1)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '8px',
                                bgcolor: '#222',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 1,
                                overflow: 'hidden',
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
                                <FlashOn sx={{ color: fix.type === 'strobe' ? '#ffc107' : '#4fc3f7', fontSize: 40 }} />
                              )}
                            </Box>
                            <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                              {getLightDisplayName(fix)}
                            </Typography>
                            <Typography sx={{ color: '#888', fontSize: 10, textAlign: 'center' }}>
                              {getLightPowerDisplay(fix)} • {fix.type === 'strobe' ? 'Blits' : 'LED'}
                            </Typography>
                          </Button>
                        ))}
                      </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: '1px solid #333' }}>
                      <Button onClick={() => setLightPickerOpen(null)} sx={{ color: '#888' }}>
                        Avbryt
                      </Button>
                    </DialogActions>
                  </Dialog>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography sx={{ color: '#aaa', fontSize: 13, mb: 2 }}>
                      Fargetemperatur (Kelvin) for lysene:
                    </Typography>
                    <Box sx={{ px: 2 }}>
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
                          height: 8,
                          '& .MuiSlider-track': { display: 'none' },
                          '& .MuiSlider-rail': { opacity: 0 },
                          '& .MuiSlider-thumb': { bgcolor: '#fff', border: '3px solid #333' },
                          '& .MuiSlider-markLabel': { color: '#888', fontSize: 11 },
                          '& .MuiSlider-valueLabel': { bgcolor: '#2196f3', color: '#fff', fontWeight: 700 },
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(33,150,243,0.1)', borderRadius: '12px' }}>
                    <Typography sx={{ color: '#2196f3', fontWeight: 600, fontSize: 14, mb: 1 }}>
                      Oppsummering: {lightCount} lys • {customCCT}K
                    </Typography>
                    {Array.from({ length: lightCount }).map((_, idx) => {
                      const lt = LIGHT_TYPES.find(t => t.id === (selectedLightTypes[idx] || 'key'));
                      const fix = LIGHT_DATABASE.find(f => f.id === selectedFixtures[idx]);
                      return (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography sx={{ fontSize: 12 }}>{lt?.icon}</Typography>
                          <Typography sx={{ color: '#aaa', fontSize: 11 }}>
                            {lt?.label}: {fix ? getLightDisplayName(fix) : 'Ikke valgt'}
                          </Typography>
                        </Box>
                      );
                    })}
                    <Typography sx={{ color: '#666', fontSize: 10, mt: 1 }}>
                      CCT: {customCCT}K ({customCCT <= 3200 ? 'Varm tungsten' : customCCT <= 4500 ? 'Nøytral' : customCCT <= 5600 ? 'Dagslys' : 'Kald'})
                    </Typography>
                  </Box>
                </Box>
              )}

              {customBuildTab === 3 && (
                <Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 1.5 }}>
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
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '8px',
                            bgcolor: '#2a2a2a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            border: selectedBackdropId === backdrop.id ? '2px solid #4caf50' : '1px solid #444',
                            mb: 0.5,
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
                        <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>
                          {backdrop.name}
                        </Typography>
                        {backdrop.size && (
                          <Typography sx={{ color: '#888', fontSize: 9, textAlign: 'center' }}>
                            {backdrop.size}
                          </Typography>
                        )}
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBackdropId(backdrop.id);
                            if (backdrop.color) setCustomBackdropColor(backdrop.color);
                          }}
                          sx={{
                            mt: 0.5,
                            bgcolor: selectedBackdropId === backdrop.id ? '#2196f3' : '#4caf50',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.3,
                            minWidth: 70,
                            borderRadius: '6px',
                            textTransform: 'none',
                            '&:hover': {
                              bgcolor: selectedBackdropId === backdrop.id ? '#1976d2' : '#43a047',
                            },
                          }}
                        >
                          {selectedBackdropId === backdrop.id ? '✓ Valgt' : '+ Legg til'}
                        </Button>
                      </Box>
                    ))}
                  </Box>
                  
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(33,150,243,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box 
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        bgcolor: '#2a2a2a', 
                        borderRadius: '8px', 
                        border: '2px solid #444',
                        overflow: 'hidden',
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
                    <Box>
                      <Typography sx={{ color: '#2196f3', fontWeight: 600, fontSize: 14 }}>
                        Valgt bakgrunn
                      </Typography>
                      <Typography sx={{ color: '#aaa', fontSize: 12 }}>
                        {selectedBackdropId ? BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.name : 'Ingen valgt'}
                      </Typography>
                      {selectedBackdropId && BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.size && (
                        <Typography sx={{ color: '#666', fontSize: 10 }}>
                          {BACKDROP_DATABASE.find(b => b.id === selectedBackdropId)?.size}
                        </Typography>
                      )}
                    </Box>
                  </Box>
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
        <DialogActions sx={{ p: 3, borderTop: '1px solid #333' }}>
          <Button 
            onClick={() => setShowCreateDialog(false)}
            sx={{ ...buttonStyle, minWidth: 100, color: '#888', borderColor: '#444' }}
            variant="outlined"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            sx={{
              ...buttonStyle,
              minWidth: 140,
              bgcolor: editingPreset ? '#ff5722' : createMode === 'current' ? '#4caf50' : '#2196f3',
              color: '#fff',
              '&:hover': { 
                bgcolor: editingPreset ? '#ff7043' : createMode === 'current' ? '#66bb6a' : '#42a5f5',
              },
              '&:disabled': { bgcolor: '#333', color: '#666' },
            }}
            variant="contained"
          >
            {editingPreset ? 'Lagre endringer' : 'Lagre oppsett'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScenerPanel;
