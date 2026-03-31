import React, { useState, useEffect } from 'react';
import {
  logger } from '../core/services/logger';
import Grid from '@mui/material/Grid';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Slider,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Person,
  Checkroom,
  Business,
  FitnessCenter,
  ChildCare,
  Elderly,
  Add,
  Refresh,
  ExpandMore,
  Palette,
  Accessibility,
  Face,
  RemoveRedEye,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAppStore } from '../state/store';
import {
  virtualActorService,
  ActorParameters,
  AnnyModelInfo,
} from '../core/services/virtualActorService';
import {
  getPresetsByCategory,
  getPresetById,
  SKIN_TONES,
} from '../core/data/actorPresets';
import { getHairStyles } from '../core/data/hairStyles';
import { GlassesSelector } from '../ui/components/GlassesSelector';
import { GlassesOptions } from '../core/models/GlassesModel';
import { ActorLibraryPanel } from '../ui/components/ActorLibraryPanel';
const log = logger.module('VirtualActorPanel');

interface VirtualActorPanelProps {
  onActorGenerated?: (actorId: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  portrait: <Person />,
  fashion: <Checkroom />,
  commercial: <Business />,
  fitness: <FitnessCenter />,
  child: <ChildCare />,
  elder: <Elderly />,
};

export const VirtualActorPanel: React.FC<VirtualActorPanelProps> = ({ onActorGenerated }) => {
  const { addNode } = useAppStore();

  const [activeTab, setActiveTab] = useState<'library' | 'presets' | 'custom' | 'appearance' | 'hair' | 'glasses'>('library');
  const [activeCategory, setActiveCategory] = useState<'portrait' | 'fashion' | 'commercial' | 'fitness' | 'child' | 'elder'>('portrait');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [age, setAge] = useState(30);
  const [gender, setGender] = useState(0.5);
  const [height, setHeight] = useState(0.5);
  const [weight, setWeight] = useState(0.5);
  const [muscle, setMuscle] = useState(0.5);

  const [skinTone, setSkinTone] = useState<keyof typeof SKIN_TONES>('medium');
  const [roughness, setRoughness] = useState(0.6);

  const [selectedHairStyle, setSelectedHairStyle] = useState<string | null>(null);
  const [hairCategory, setHairCategory] = useState<'all' | 'male' | 'female' | 'children' | 'textured'>('all');

  const [glassesEnabled, setGlassesEnabled] = useState(false);
  const [glassesOptions, setGlassesOptions] = useState<Partial<GlassesOptions>>({
    frameStyle: 'rectangular',
    lensType: 'clear',
    frameMaterial: 'plastic',
    frameColor: '#1a1a1a',
  });

  const [actorName, setActorName] = useState('Virtuell Aktør');
  const [generatedActors, setGeneratedActors] = useState<string[]>([]);

  const [annyAvailable, setAnnyAvailable] = useState<boolean | null>(null);
  const [annyModelInfo, setAnnyModelInfo] = useState<AnnyModelInfo | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    const checkAnnyStatus = async () => {
      setHealthLoading(true);
      try {
        const health = await virtualActorService.checkHealth();
        setAnnyAvailable(health.services?.anny === true);
        
        if (health.services?.anny) {
          const info = await virtualActorService.getModelInfo();
          setAnnyModelInfo(info);
        }
      } catch {
        log.warn('Failed to check Anny status');
        setAnnyAvailable(false);
      } finally {
        setHealthLoading(false);
      }
    };

    checkAnnyStatus();
    const interval = setInterval(checkAnnyStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateActor = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ActorParameters = {
        age,
        gender,
        height,
        weight,
        muscle,
      };

      const actorId = `actor-${Date.now()}`;
      addNode({
        id: actorId,
        type: 'model',
        name: actorName || `Aktør (${age}år)`,
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        visible: true,
        userData: {
          actorType: 'virtual',
          actorParams: params,
          skinTone: SKIN_TONES[skinTone],
          hasGlasses: glassesEnabled,
          glassesOptions: glassesEnabled ? glassesOptions : null,
        },
      });

      setGeneratedActors(prev => [...prev, actorId]);
      onActorGenerated?.(actorId);
      log.info('Actor generated:', actorId);
    } catch (err) {
      log.error('Error generating actor:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke generere aktør');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;

    setAge(preset.parameters.age);
    setGender(preset.parameters.gender);
    setHeight(preset.parameters.height);
    setWeight(preset.parameters.weight);
    setMuscle(preset.parameters.muscle);
    setActorName(preset.name);
  };

  const handleReset = () => {
    setAge(30);
    setGender(0.5);
    setHeight(0.5);
    setWeight(0.5);
    setMuscle(0.5);
    setSkinTone('medium');
    setRoughness(0.6);
    setActorName('Virtuell Aktør');
  };

  const presets = getPresetsByCategory(activeCategory);
  const hairStyles = getHairStyles(hairCategory === 'all' ? undefined : hairCategory);

  return (
    <Paper elevation={3} sx={{ p: 2, backgroundColor: '#1e1e1e', color: '#fff', height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Accessibility />
        Virtuell Aktør Generator
      </Typography>

      <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {healthLoading ? (
              <CircularProgress size={16} />
            ) : annyAvailable ? (
              <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
            ) : (
              <ErrorIcon sx={{ color: '#f44336', fontSize: 20 }} />
            )}
            <Typography variant="body2">
              Anny Body Model: {healthLoading ? 'Sjekker...' : annyAvailable ? 'Tilgjengelig' : 'Ikke tilgjengelig'}
            </Typography>
          </Box>
          {annyModelInfo?.available && (
            <Chip
              size="small"
              label="Apache 2.0"
              sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', fontSize: '0.7rem' }}
            />
          )}
        </Box>
        {!healthLoading && !annyAvailable && (
          <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
            <Typography variant="caption">
              Fallback-modeller brukes. Start Python ML-tjeneste for full funksjonalitet.
            </Typography>
          </Alert>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Generer realistiske 3D-menneskemodeller for lystester og kinematografi.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab value="library" label="Bibliotek" icon={<Person />} iconPosition="start" />
        <Tab value="presets" label="Forhåndsvalg" icon={<Person />} iconPosition="start" />
        <Tab value="custom" label="Tilpass" icon={<Accessibility />} iconPosition="start" />
        <Tab value="appearance" label="Utseende" icon={<Palette />} iconPosition="start" />
        <Tab value="hair" label="Hår" icon={<Face />} iconPosition="start" />
        <Tab value="glasses" label="Briller" icon={<RemoveRedEye />} iconPosition="start" />
      </Tabs>

      {activeTab === 'library' && <ActorLibraryPanel />}

      {activeTab === 'presets' && (
        <Box>
          <Tabs
            value={activeCategory}
            onChange={(_, value) => setActiveCategory(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="portrait" label="Portrett" icon={CATEGORY_ICONS.portrait} iconPosition="start" />
            <Tab value="fashion" label="Mote" icon={CATEGORY_ICONS.fashion} iconPosition="start" />
            <Tab value="commercial" label="Reklame" icon={CATEGORY_ICONS.commercial} iconPosition="start" />
            <Tab value="fitness" label="Fitness" icon={CATEGORY_ICONS.fitness} iconPosition="start" />
            <Tab value="child" label="Barn" icon={CATEGORY_ICONS.child} iconPosition="start" />
            <Tab value="elder" label="Eldre" icon={CATEGORY_ICONS.elder} iconPosition="start" />
          </Tabs>

          <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
            <Grid container spacing={2}>
              {presets.map((preset) => (
                <Grid key={preset.id} sx={{ width: { xs: '100%', sm: '50%' }, p: 1 }}>
                  <Card sx={{ backgroundColor: '#2a2a2a', '&:hover': { backgroundColor: '#333' } }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {preset.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {preset.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={`${preset.parameters.age} år`} size="small" />
                        <Chip
                          label={preset.parameters.gender === 0 ? 'Kvinne' : preset.parameters.gender === 1 ? 'Mann' : 'Nøytral'}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleApplyPreset(preset.id)}>
                        Bruk
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          handleApplyPreset(preset.id);
                          handleGenerateActor();
                        }}
                        disabled={loading}
                      >
                        Generer
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      )}

      {activeTab === 'custom' && (
        <Box>
          <TextField
            fullWidth
            label="Aktørnavn"
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
            sx={{ mb: 3 }}
            size="small"
          />

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography fontWeight={700}>Kroppsparametere</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ px: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Alder: {age} år
                  </Typography>
                  <Slider
                    value={age}
                    onChange={(_, value) => setAge(value as number)}
                    min={0}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: '0' },
                      { value: 18, label: 'Voksen' },
                      { value: 65, label: 'Eldre' },
                      { value: 100, label: '100' },
                    ]}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Kjønn: {gender === 0 ? 'Kvinne' : gender === 1 ? 'Mann' : 'Nøytral'}
                  </Typography>
                  <Slider
                    value={gender}
                    onChange={(_, value) => setGender(value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: 'Kvinne' },
                      { value: 0.5, label: 'Nøytral' },
                      { value: 1, label: 'Mann' },
                    ]}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Høyde: {(height * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={height}
                    onChange={(_, value) => setHeight(value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: 'Kort' },
                      { value: 0.5, label: 'Middels' },
                      { value: 1, label: 'Høy' },
                    ]}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Vekt: {(weight * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={weight}
                    onChange={(_, value) => setWeight(value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: 'Slank' },
                      { value: 0.5, label: 'Middels' },
                      { value: 1, label: 'Tung' },
                    ]}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Muskeldefinisjon: {(muscle * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={muscle}
                    onChange={(_, value) => setMuscle(value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: 'Lav' },
                      { value: 0.5, label: 'Moderat' },
                      { value: 1, label: 'Høy' },
                    ]}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Add />}
              onClick={handleGenerateActor}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Genererer...' : 'Generer Aktør'}
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={handleReset}>
              Nullstill
            </Button>
          </Box>
        </Box>
      )}

      {activeTab === 'appearance' && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Hudtone
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {Object.entries(SKIN_TONES).map(([key, color]) => (
              <Tooltip key={key} title={key.charAt(0).toUpperCase() + key.slice(1)}>
                <Box
                  onClick={() => setSkinTone(key as keyof typeof SKIN_TONES)}
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: color,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: skinTone === key ? '2px solid #00d4ff' : '2px solid transparent',
                    '&:hover': { opacity: 0.8 },
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Ruhet: {(roughness * 100).toFixed(0)}%
          </Typography>
          <Slider
            value={roughness}
            onChange={(_, value) => setRoughness(value as number)}
            min={0}
            max={1}
            step={0.01}
            valueLabelDisplay="auto"
          />
        </Box>
      )}

      {activeTab === 'hair' && (
        <Box>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Harkategori</InputLabel>
            <Select
              value={hairCategory}
              label="Harkategori"
              onChange={(e) => setHairCategory(e.target.value as typeof hairCategory)}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="male">Mann</MenuItem>
              <MenuItem value="female">Kvinne</MenuItem>
              <MenuItem value="children">Barn</MenuItem>
              <MenuItem value="textured">Teksturert</MenuItem>
            </Select>
          </FormControl>
          <Tabs
            value={hairCategory}
            onChange={(_, value) => setHairCategory(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="all" label="Alle" />
            <Tab value="male" label="Mann" />
            <Tab value="female" label="Kvinne" />
            <Tab value="children" label="Barn" />
            <Tab value="textured" label="Teksturert" />
          </Tabs>

          <Grid container spacing={1}>
            {hairStyles.map((style) => (
              <Grid key={style.id} sx={{ width: '50%', p: 0.5 }}>
                <Card
                  onClick={() => setSelectedHairStyle(style.id)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: selectedHairStyle === style.id ? '#333' : '#2a2a2a',
                    border: selectedHairStyle === style.id ? '1px solid #00d4ff' : '1px solid transparent',
                  }}
                >
                  <CardContent sx={{ py: 1, px: 1.5 }}>
                    <Typography variant="body2" noWrap>
                      {style.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {style.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {activeTab === 'glasses' && (
        <GlassesSelector
          enabled={glassesEnabled}
          onEnabledChange={setGlassesEnabled}
          options={glassesOptions}
          onOptionsChange={setGlassesOptions}
        />
      )}

      {generatedActors.length > 0 && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Genererte Aktører ({generatedActors.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {generatedActors.map((id) => (
              <Chip key={id} label={id.replace('actor-', '#')} size="small" />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};
