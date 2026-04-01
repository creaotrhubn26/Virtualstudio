import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Collapse,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  SkipPrevious,
  SkipNext,
  Loop,
  Add,
  Delete,
  ContentCopy,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  ExpandMore,
  Timeline,
  Animation,
  Lightbulb,
  Videocam,
  ViewInAr,
  MyLocation,
  TrackChanges,
  Route,
  Speed,
  Tune,
  Save,
  FolderOpen,
  Layers,
  RadioButtonChecked,
  AddCircle,
  KeyboardArrowUp,
  KeyboardArrowDown,
  MoreVert,
  Settings,
  ShowChart,
  Person,
} from '@mui/icons-material';
import {
  useAnimationComposerStore,
  AnimationLayer,
  AnimationKeyframe,
  AnimationBehavior,
  TrackingConfig,
  BehaviorType,
  TrackingMode,
  BEHAVIOR_PRESETS,
  TRACKING_PRESETS,
  Vector3,
} from '../state/animationComposerStore';

// ============================================================================
// Constants
// ============================================================================

const TRACK_HEIGHT = 56;
const RULER_HEIGHT = 36;
const SIDEBAR_WIDTH = 280;

const LAYER_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
];

// Organized behavior labels with categories
const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
  // Movement behaviors
  orbit: 'Orbit',
  pendulum: 'Pendel',
  bounce: 'Sprette',
  wave: 'Bølge',
  spiral: 'Spiral',
  figure8: 'Åttetall',
  // Intensity behaviors
  breathe: 'Pust',
  flicker: 'Flimre',
  pulse: 'Puls',
  strobe: 'Strobe',
  // Physical simulation
  shake: 'Risting',
  sway: 'Svaie',
  drift: 'Drift',
  jitter: 'Skjelving',
  // Pattern behaviors
  zigzag: 'Sikksakk',
  heartbeat: 'Hjerteslag',
  lightning: 'Lyn',
  candle: 'Stearinlys',
  disco: 'Disco',
  sunrise: 'Soloppgang',
};

const BEHAVIOR_CATEGORIES = {
  'Bevegelse': ['orbit', 'pendulum', 'bounce', 'wave', 'spiral', 'figure8'] as BehaviorType[],
  'Intensitet': ['breathe', 'flicker', 'pulse', 'strobe'] as BehaviorType[],
  'Fysisk simulering': ['shake', 'sway', 'drift', 'jitter'] as BehaviorType[],
  'Mønstre': ['zigzag', 'heartbeat', 'lightning', 'candle', 'disco', 'sunrise'] as BehaviorType[],
};

const TRACKING_LABELS: Record<TrackingMode, string> = {
  none: 'Ingen',
  lookAt: 'Se På',
  follow: 'Følg',
  followWithOffset: 'Følg med Offset',
  orbit: 'Orbit Rundt',
  mirror: 'Speile',
  leadFollow: 'Prediksjon',
  elastic: 'Elastisk',
  parallel: 'Parallell',
  inverse: 'Invers',
};

const TARGET_TYPE_ICONS: Record<string, React.ReactElement> = {
  light: <Lightbulb fontSize="small" />,
  camera: <Videocam fontSize="small" />,
  mesh: <ViewInAr fontSize="small" />,
  actor: <Person fontSize="small" />,
};

// ============================================================================
// Helper Components
// ============================================================================

interface Vector3InputProps {
  value: Vector3;
  onChange: (v: Vector3) => void;
  label?: string;
}

const Vector3Input: React.FC<Vector3InputProps> = ({ value, onChange, label }) => (
  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
    {label && <Typography variant="caption" sx={{ width: 60, color: 'text.secondary' }}>{label}</Typography>}
    {(['x', 'y', 'z'] as const).map(axis => (
      <TextField
        key={axis}
        size="small"
        label={axis.toUpperCase()}
        type="number"
        value={value[axis]}
        onChange={e => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
        sx={{ width: 70 }}
        inputProps={{ step: 0.1 }}
      />
    ))}
  </Box>
);

// ============================================================================
// Layer Track Component
// ============================================================================

interface LayerTrackProps {
  layer: AnimationLayer;
  isSelected: boolean;
  duration: number;
  zoom: number;
  currentTime: number;
  onSelect: () => void;
}

const LayerTrack: React.FC<LayerTrackProps> = ({
  layer,
  isSelected,
  duration,
  zoom,
  currentTime,
  onSelect,
}) => {
  const { updateLayer, removeLayer, duplicateLayer, selectKeyframes } = useAnimationComposerStore();
  const timeToPixel = (t: number) => (t / duration) * 100 * zoom;

  return (
    <Box
      onClick={onSelect}
      sx={{
        display: 'flex',
        height: TRACK_HEIGHT,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: isSelected ? 'rgba(33,150,243,0.15)' : 'transparent',
        cursor: 'pointer',
        '&:hover': { backgroundColor: isSelected ? 'rgba(33,150,243,0.2)' : 'rgba(255,255,255,0.05)' },
      }}
    >
      {/* Layer info sidebar */}
      <Box sx={{ 
        width: SIDEBAR_WIDTH, 
        flexShrink: 0, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        px: 1,
        borderRight: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Color indicator */}
        <Box sx={{ width: 4, height: 32, borderRadius: 1, backgroundColor: layer.color }} />
        
        {/* Type icon */}
        {TARGET_TYPE_ICONS[layer.targetType]}
        
        {/* Name */}
        <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {layer.name}
        </Typography>
        
        {/* Tracking indicator */}
        {layer.tracking && layer.tracking.mode !== 'none' && (
          <Tooltip title={`Sporing: ${TRACKING_LABELS[layer.tracking.mode]}`}>
            <TrackChanges fontSize="small" sx={{ color: '#ff9800' }} />
          </Tooltip>
        )}
        
        {/* Behaviors indicator */}
        {layer.behaviors.length > 0 && (
          <Tooltip title={`${layer.behaviors.length} oppførsel(er)`}>
            <Chip size="small" label={layer.behaviors.length} sx={{ height: 20, fontSize: 10 }} />
          </Tooltip>
        )}
        
        {/* Controls */}
        <IconButton size="small" onClick={e => { e.stopPropagation(); updateLayer(layer.id, { enabled: !layer.enabled }); }}>
          {layer.enabled ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={e => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}>
          {layer.locked ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
        </IconButton>
      </Box>
      
      {/* Keyframe timeline */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Keyframes */}
        {layer.keyframes.map(kf => (
          <Tooltip key={kf.id} title={`${kf.time.toFixed(2)}s`}>
            <Box
              onClick={e => { e.stopPropagation(); selectKeyframes([kf.id]); }}
              sx={{
                position: 'absolute',
                left: `${timeToPixel(kf.time)}%`,
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
                width: 12,
                height: 12,
                backgroundColor: layer.color,
                border: '2px solid white',
                cursor: 'pointer',
                '&:hover': { transform: 'translate(-50%, -50%) rotate(45deg) scale(1.2)' },
              }}
            />
          </Tooltip>
        ))}
        
        {/* Behavior bars */}
        {layer.behaviors.filter(b => b.enabled).map((behavior, i) => (
          <Box
            key={behavior.id}
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 4 + i * 8,
              height: 6,
              backgroundColor: `${layer.color}40`,
              borderRadius: 1,
              border: `1px solid ${layer.color}`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

// ============================================================================
// Behavior Editor Panel
// ============================================================================

interface BehaviorEditorProps {
  layer: AnimationLayer;
}

const BehaviorEditor: React.FC<BehaviorEditorProps> = ({ layer }) => {
  const { addBehavior, removeBehavior, updateBehavior } = useAnimationComposerStore();
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);

  const handleAddBehavior = (type: BehaviorType) => {
    const preset = BEHAVIOR_PRESETS[type];
    addBehavior(layer.id, {
      type,
      enabled: true,
      speed: preset.speed || 1,
      amplitude: preset.amplitude,
      axis: preset.axis,
      radius: preset.radius,
      loop: preset.loop || false,
    });
    setAddMenuAnchor(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Animation /> Oppførsler
        </Typography>
        <Button size="small" startIcon={<Add />} onClick={e => setAddMenuAnchor(e.currentTarget)}>
          Legg til
        </Button>
        <Menu
          anchorEl={addMenuAnchor}
          open={Boolean(addMenuAnchor)}
          onClose={() => setAddMenuAnchor(null)}
          PaperProps={{ sx: { maxHeight: 400 } }}
        >
          {Object.entries(BEHAVIOR_CATEGORIES).map(([category, types]) => [
            <MenuItem key={`cat-${category}`} disabled sx={{
              fontWeight: 600,
              fontSize: 12,
              color: 'primary.main',
              opacity: '1 !important',
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
              {category}
            </MenuItem>,
            ...types.map(type => (
              <MenuItem key={type} onClick={() => handleAddBehavior(type)} sx={{ pl: 3 }}>
                {BEHAVIOR_LABELS[type]}
              </MenuItem>
            ))
          ])}
        </Menu>
      </Box>

      {layer.behaviors.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Ingen oppførsler lagt til
        </Typography>
      ) : (
        layer.behaviors.map(behavior => (
          <Accordion key={behavior.id} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                <Switch
                  size="small"
                  checked={behavior.enabled}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateBehavior(layer.id, behavior.id, { enabled: e.target.checked })}
                />
                <Typography variant="body2">{BEHAVIOR_LABELS[behavior.type]}</Typography>
                {behavior.loop && <Chip size="small" label="Loop" sx={{ height: 18, fontSize: 10 }} />}
              </Box>
              <IconButton size="small" onClick={e => { e.stopPropagation(); removeBehavior(layer.id, behavior.id); }}>
                <Delete fontSize="small" />
              </IconButton>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    size="small"
                    label="Hastighet"
                    type="number"
                    value={behavior.speed}
                    onChange={e => updateBehavior(layer.id, behavior.id, { speed: parseFloat(e.target.value) || 1 })}
                    inputProps={{ step: 0.1, min: 0.1, max: 10 }}
                    sx={{ width: 100 }}
                  />
                  {behavior.amplitude !== undefined && (
                    <TextField
                      size="small"
                      label="Amplitude"
                      type="number"
                      value={behavior.amplitude}
                      onChange={e => updateBehavior(layer.id, behavior.id, { amplitude: parseFloat(e.target.value) || 0 })}
                      inputProps={{ step: 0.1 }}
                      sx={{ width: 100 }}
                    />
                  )}
                  {behavior.radius !== undefined && (
                    <TextField
                      size="small"
                      label="Radius"
                      type="number"
                      value={behavior.radius}
                      onChange={e => updateBehavior(layer.id, behavior.id, { radius: parseFloat(e.target.value) || 1 })}
                      inputProps={{ step: 0.5, min: 0.5 }}
                      sx={{ width: 100 }}
                    />
                  )}
                </Box>
                {behavior.axis !== undefined && (
                  <FormControl size="small" sx={{ width: 100 }}>
                    <InputLabel>Akse</InputLabel>
                    <Select
                      value={behavior.axis}
                      label="Akse"
                      onChange={e => updateBehavior(layer.id, behavior.id, { axis: e.target.value as 'x' | 'y' | 'z' | 'all' })}
                    >
                      <MenuItem value="x">X</MenuItem>
                      <MenuItem value="y">Y</MenuItem>
                      <MenuItem value="z">Z</MenuItem>
                      <MenuItem value="all">Alle</MenuItem>
                    </Select>
                  </FormControl>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.loop}
                      onChange={e => updateBehavior(layer.id, behavior.id, { loop: e.target.checked })}
                    />
                  }
                  label="Loop"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};

// ============================================================================
// Tracking Editor Panel
// ============================================================================

interface TrackingEditorProps {
  layer: AnimationLayer;
}

const TrackingEditor: React.FC<TrackingEditorProps> = ({ layer }) => {
  const { setTracking, availableTargets } = useAnimationComposerStore();
  const tracking = layer.tracking;

  const handleModeChange = (mode: TrackingMode) => {
    if (mode === 'none') {
      setTracking(layer.id, undefined);
    } else {
      const preset = TRACKING_PRESETS[mode];
      setTracking(layer.id, {
        mode,
        targetId: tracking?.targetId || null,
        targetType: preset.targetType || 'actor',
        smoothing: preset.smoothing || 0.1,
        offset: preset.offset || { x: 0, y: 0, z: 0 },
      });
    }
  };

  const handleTargetChange = (targetId: string) => {
    if (!tracking) return;
    const target = availableTargets.find(t => t.id === targetId);
    setTracking(layer.id, {
      ...tracking,
      targetId,
      targetType: (['camera', 'light', 'mesh', 'actor', 'point'] as const).includes(target?.type as 'camera' | 'light' | 'mesh' | 'actor' | 'point') ? (target?.type as 'camera' | 'light' | 'mesh' | 'actor' | 'point') : 'mesh',
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TrackChanges /> Sporing
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Sporingsmodus</InputLabel>
        <Select
          value={tracking?.mode || 'none'}
          label="Sporingsmodus"
          onChange={e => handleModeChange(e.target.value as TrackingMode)}
        >
          {(Object.keys(TRACKING_LABELS) as TrackingMode[]).map(mode => (
            <MenuItem key={mode} value={mode}>{TRACKING_LABELS[mode]}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {tracking && tracking.mode !== 'none' && (
        <>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Mål</InputLabel>
            <Select
              value={tracking.targetId || ''}
              label="Mål"
              onChange={e => handleTargetChange(e.target.value)}
            >
              <MenuItem value="">Velg mål...</MenuItem>
              {availableTargets.map(target => (
                <MenuItem key={target.id} value={target.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {TARGET_TYPE_ICONS[target.type]}
                    {target.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Utjevning: {tracking.smoothing.toFixed(2)}
            </Typography>
            <Slider
              value={tracking.smoothing}
              min={0}
              max={1}
              step={0.01}
              onChange={(_, v) => setTracking(layer.id, { ...tracking, smoothing: v as number })}
            />
          </Box>

          {tracking.offset && (
            <Vector3Input
              label="Offset"
              value={tracking.offset}
              onChange={offset => setTracking(layer.id, { ...tracking, offset })}
            />
          )}
        </>
      )}
    </Box>
  );
};

// ============================================================================
// Add Layer Dialog
// ============================================================================

interface AddLayerDialogProps {
  open: boolean;
  onClose: () => void;
}

const AddLayerDialog: React.FC<AddLayerDialogProps> = ({ open, onClose }) => {
  const { addLayer, availableTargets } = useAnimationComposerStore();
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [layerName, setLayerName] = useState('');

  const handleAdd = () => {
    const target = availableTargets.find(t => t.id === selectedTarget);
    if (!target) return;

    addLayer({
      name: layerName || target.name,
      targetId: target.id,
      targetType: target.type,
      enabled: true,
      solo: false,
      locked: false,
      color: LAYER_COLORS[Math.floor(Math.random() * LAYER_COLORS.length)],
      keyframes: [],
      behaviors: [],
      blendMode: 'replace',
      weight: 1,
    });

    setSelectedTarget('');
    setLayerName('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1c2128',
          color: '#fff',
        },
      }}
    >
      <DialogTitle>Legg til Animasjonslag</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Velg Objekt</InputLabel>
            <Select
              value={selectedTarget}
              label="Velg Objekt"
              onChange={e => setSelectedTarget(e.target.value)}
              sx={{
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9c27b0',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9c27b0',
                },
              }}
            >
              {availableTargets.map(target => (
                <MenuItem key={target.id} value={target.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {TARGET_TYPE_ICONS[target.type]}
                    {target.name}
                    <Chip size="small" label={target.type} sx={{ ml: 1 }} />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Navn på lag (valgfritt)"
            value={layerName}
            onChange={e => setLayerName(e.target.value)}
            placeholder="Bruk objektnavn"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: '#9c27b0' },
                '&.Mui-focused fieldset': { borderColor: '#9c27b0' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.87)' }}>Avbryt</Button>
        <Button 
          variant="contained" 
          onClick={handleAdd} 
          disabled={!selectedTarget}
          sx={{
            bgcolor: '#9c27b0',
            color: '#fff',
            '&:hover': { bgcolor: '#7b1fa2' },
            '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' },
          }}
        >
          Legg til
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// Main Animation Composer Panel
// ============================================================================

export const AnimationComposerPanel: React.FC = () => {
  const {
    activeSequence,
    sequences,
    currentTime,
    isPlaying,
    isLooping,
    playbackSpeed,
    selectedLayerId,
    zoom,
    showBehaviorPanel,
    showTrackingPanel,

    createSequence,
    setActiveSequence,
    updateSequence,
    play,
    pause,
    stop,
    setCurrentTime,
    setPlaybackSpeed,
    toggleLoop,
    selectLayer,
    setZoom,
    removeLayer,
    duplicateLayer,
    addKeyframe,
  } = useAnimationComposerStore();

  const [addLayerOpen, setAddLayerOpen] = useState(false);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [inspectorTab, setInspectorTab] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const selectedLayer = activeSequence?.layers.find(l => l.id === selectedLayerId);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !activeSequence) return;

    const interval = setInterval(() => {
      setCurrentTime(currentTime + (1 / 30) * playbackSpeed);
      if (currentTime >= activeSequence.duration) {
        if (isLooping) {
          setCurrentTime(0);
        } else {
          pause();
        }
      }
    }, 1000 / 30);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, playbackSpeed, isLooping, activeSequence, setCurrentTime, pause]);

  const handleAddKeyframeAtPlayhead = () => {
    if (!selectedLayerId) return;
    addKeyframe(selectedLayerId, {
      time: currentTime,
      easing: 'easeInOut',
    });
  };

  const handleCreateSequence = () => {
    if (newSequenceName.trim()) {
      createSequence(newSequenceName.trim());
      setNewSequenceName('');
      setNewSequenceOpen(false);
    }
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const frames = Math.floor((t % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a2e' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.3)'
      }}>
        <Timeline sx={{ color: '#2196f3' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Animasjonskomponist</Typography>

        {/* Sequence selector */}
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={activeSequence?.id || ''}
            displayEmpty
            onChange={e => setActiveSequence(e.target.value || null)}
          >
            <MenuItem value="">Velg sekvens...</MenuItem>
            {sequences.map(seq => (
              <MenuItem key={seq.id} value={seq.id}>{seq.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button size="small" startIcon={<Add />} onClick={() => setNewSequenceOpen(true)}>
          Ny Sekvens
        </Button>

        <Box sx={{ flex: 1 }} />

        {/* Duration & FPS */}
        {activeSequence && (
          <>
            <TextField
              size="small"
              label="Varighet (s)"
              type="number"
              value={activeSequence.duration}
              onChange={e => updateSequence(activeSequence.id, { duration: parseFloat(e.target.value) || 10 })}
              sx={{ width: 100 }}
              inputProps={{ min: 1, max: 600 }}
            />
            <TextField
              size="small"
              label="FPS"
              type="number"
              value={activeSequence.fps}
              onChange={e => updateSequence(activeSequence.id, { fps: parseInt(e.target.value) || 30 })}
              sx={{ width: 70 }}
              inputProps={{ min: 12, max: 60 }}
            />
          </>
        )}
      </Box>

      {!activeSequence ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
          <Animation sx={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
          <Typography color="text.secondary">Velg eller opprett en sekvens for å begynne</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setNewSequenceOpen(true)}>
            Ny Sekvens
          </Button>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Main timeline area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Transport controls */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
              <IconButton onClick={stop}><SkipPrevious /></IconButton>
              <IconButton onClick={isPlaying ? pause : play} sx={{
                backgroundColor: isPlaying ? 'rgba(244,67,54,0.2)' : 'rgba(76,175,80,0.2)',
                '&:hover': { backgroundColor: isPlaying ? 'rgba(244,67,54,0.3)' : 'rgba(76,175,80,0.3)' }
              }}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton onClick={toggleLoop} sx={{ color: isLooping ? '#2196f3' : 'inherit' }}>
                <Loop />
              </IconButton>

              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

              <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 90 }}>
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary">/</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {formatTime(activeSequence.duration)}
              </Typography>

              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

              <Speed fontSize="small" />
              <Select
                size="small"
                value={playbackSpeed}
                onChange={e => setPlaybackSpeed(e.target.value as number)}
                sx={{ minWidth: 80 }}
              >
                <MenuItem value={0.25}>0.25x</MenuItem>
                <MenuItem value={0.5}>0.5x</MenuItem>
                <MenuItem value={1}>1x</MenuItem>
                <MenuItem value={2}>2x</MenuItem>
                <MenuItem value={4}>4x</MenuItem>
              </Select>

              <Box sx={{ flex: 1 }} />

              <Tooltip title="Legg til keyframe">
                <IconButton onClick={handleAddKeyframeAtPlayhead} disabled={!selectedLayerId}>
                  <RadioButtonChecked />
                </IconButton>
              </Tooltip>
              <Button size="small" startIcon={<Add />} onClick={() => setAddLayerOpen(true)}>
                Legg til Lag
              </Button>

              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

              <Typography variant="caption" color="text.secondary">Zoom:</Typography>
              <Slider
                value={zoom}
                min={0.5}
                max={4}
                step={0.1}
                onChange={(_, v) => setZoom(v as number)}
                sx={{ width: 100 }}
              />
            </Box>

            {/* Timeline ruler */}
            <Box sx={{
              height: RULER_HEIGHT,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'flex-end',
              pl: `${SIDEBAR_WIDTH}px`,
              position: 'relative'
            }}>
              {/* Time markers */}
              {Array.from({ length: Math.ceil(activeSequence.duration) + 1 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    left: `calc(${SIDEBAR_WIDTH}px + ${(i / activeSequence.duration) * 100 * zoom}%)`,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {i}s
                  </Typography>
                  <Box sx={{ width: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                </Box>
              ))}

              {/* Playhead */}
              <Box
                sx={{
                  position: 'absolute',
                  left: `calc(${SIDEBAR_WIDTH}px + ${(currentTime / activeSequence.duration) * 100 * zoom}%)`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: '#f44336',
                  zIndex: 10,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: -5,
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '8px solid #f44336',
                  }
                }}
              />
            </Box>

            {/* Layers */}
            <Box ref={timelineRef} sx={{ flex: 1, overflow: 'auto' }}>
              {activeSequence.layers.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                  <Layers sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }} />
                  <Typography color="text.secondary">Ingen lag ennå</Typography>
                  <Button variant="outlined" startIcon={<Add />} onClick={() => setAddLayerOpen(true)}>
                    Legg til første lag
                  </Button>
                </Box>
              ) : (
                activeSequence.layers.map(layer => (
                  <LayerTrack
                    key={layer.id}
                    layer={layer}
                    isSelected={layer.id === selectedLayerId}
                    duration={activeSequence.duration}
                    zoom={zoom}
                    currentTime={currentTime}
                    onSelect={() => selectLayer(layer.id)}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* Inspector sidebar */}
          {selectedLayer && (
            <Box sx={{
              width: 320,
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <Box sx={{
                p: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: selectedLayer.color }} />
                <Typography variant="subtitle2" sx={{ flex: 1 }}>{selectedLayer.name}</Typography>
                <IconButton size="small" onClick={() => duplicateLayer(selectedLayer.id)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => removeLayer(selectedLayer.id)} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              </Box>

              <Tabs value={inspectorTab} onChange={(_, v) => setInspectorTab(v)} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Tab label="Oppførsel" icon={<Animation />} iconPosition="start" sx={{ minHeight: 48 }} />
                <Tab label="Sporing" icon={<TrackChanges />} iconPosition="start" sx={{ minHeight: 48 }} />
              </Tabs>

              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {inspectorTab === 0 && <BehaviorEditor layer={selectedLayer} />}
                {inspectorTab === 1 && <TrackingEditor layer={selectedLayer} />}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Dialogs */}
      <AddLayerDialog open={addLayerOpen} onClose={() => setAddLayerOpen(false)} />

      <Dialog 
        open={newSequenceOpen} 
        onClose={() => setNewSequenceOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Ny Sekvens</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Sekvensnavn"
            value={newSequenceName}
            onChange={e => setNewSequenceName(e.target.value)}
            sx={{ 
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: '#9c27b0' },
                '&.Mui-focused fieldset': { borderColor: '#9c27b0' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNewSequenceOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            Avbryt
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCreateSequence}
            sx={{
              bgcolor: '#9c27b0',
              color: '#fff',
              '&:hover': { bgcolor: '#7b1fa2' },
            }}
          >
            Opprett
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnimationComposerPanel;

