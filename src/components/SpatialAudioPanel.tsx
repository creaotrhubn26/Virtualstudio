/**
 * Spatial Audio Panel
 * UI for 3D audio positioning, reverb zones, and ambience control
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Slider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Collapse,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  TextField,
  FormControlLabel,
  Switch,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  SpatialAudio as SpatialIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  MusicNote as MusicIcon,
  Landscape as AmbientIcon,
  Room as ZoneIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Forest as ForestIcon,
  WaterDrop as RainIcon,
  Waves as OceanIcon,
  LocationCity as CityIcon,
  LocalCafe as CafeIcon,
  Business as OfficeIcon,
  Rocket as SpaceIcon,
  Castle as DungeonIcon,
  Thunderstorm as StormIcon,
  Nightlight as NightIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import {
  useSpatialAudioStore,
  REVERB_PRESETS,
  AMBIENCE_PRESETS,
  ReverbPreset,
  AudioSource
} from '../services/spatialAudioService';
import * as BABYLON from '@babylonjs/core';

interface SpatialAudioPanelProps {
  scene?: BABYLON.Scene | null;
  camera?: BABYLON.Camera | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 1 }}>{children}</Box>}
    </div>
  );
}

// Ambience preset icons
const ambienceIcons: Record<string, React.ReactNode> = {
  'forest-day': <ForestIcon />,
  'forest-night': <NightIcon />,
  'rain': <RainIcon />,
  'thunderstorm': <StormIcon />,
  'ocean': <OceanIcon />,
  'city': <CityIcon />,
  'cafe': <CafeIcon />,
  'office': <OfficeIcon />,
  'spaceship': <SpaceIcon />,
  'dungeon': <DungeonIcon />
};

export const SpatialAudioPanel: React.FC<SpatialAudioPanelProps> = ({ scene, camera }) => {
  const {
    sources,
    zones,
    selectedSource,
    selectedZone,
    masterVolume,
    globalReverb,
    isEnabled,
    initialize,
    dispose,
    addSource,
    removeSource,
    updateSource,
    selectSource,
    playSource,
    stopSource,
    pauseSource,
    playAll,
    stopAll,
    addZone,
    removeZone,
    updateZone,
    selectZone,
    setMasterVolume,
    setGlobalReverb,
    setEnabled,
    loadAmbiencePreset,
    syncListenerToCamera,
    getSourceById
  } = useSpatialAudioStore();
  
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAmbienceDialog, setShowAmbienceDialog] = useState(false);
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newAudioName, setNewAudioName] = useState('');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  // Unlock audio on first interaction
  const unlockAudio = async () => {
    try {
      // Resume Web Audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Unlock Babylon audio engine
      const engine = (window as any).BABYLON?.Engine?.audioEngine;
      if (engine && !engine.unlocked) {
        engine.unlock();
      }
      
      setAudioUnlocked(true);
      console.log('[SpatialAudio] Audio unlocked by user interaction');
    } catch (error) {
      console.error('[SpatialAudio] Failed to unlock audio:', error);
    }
  };
  
  // Initialize when scene available
  useEffect(() => {
    if (scene) {
      initialize(scene);
    }
    return () => {
      dispose();
    };
  }, [scene]);
  
  // Sync listener to camera position each frame
  useEffect(() => {
    if (!scene || !camera) return;
    
    const observer = scene.onBeforeRenderObservable.add(() => {
      syncListenerToCamera(camera);
    });
    
    return () => {
      scene.onBeforeRenderObservable.remove(observer);
    };
  }, [scene, camera]);
  
  const selectedSourceData = selectedSource ? getSourceById(selectedSource) : null;
  const playingCount = sources.filter(s => s.isPlaying).length;
  
  const handleAddAudio = () => {
    if (newAudioUrl && newAudioName) {
      addSource({
        name: newAudioName,
        url: newAudioUrl,
        type: 'point',
        position: camera?.position.clone() || new BABYLON.Vector3(0, 0, 5)
      });
      setNewAudioUrl('');
      setNewAudioName('');
      setShowAddDialog(false);
    }
  };
  
  const handleLoadAmbience = async (presetKey: string) => {
    // Ensure audio is unlocked
    await unlockAudio();
    
    // Stop existing sources
    stopAll();
    
    // Load new ambience
    loadAmbiencePreset(presetKey);
    setShowAmbienceDialog(false);
    
    // Auto-play after a short delay for loading
    setTimeout(() => playAll(), 500);
  };
  
  const handlePlaySource = async (id: string) => {
    await unlockAudio();
    playSource(id);
  };
  
  const handlePlayAll = async () => {
    await unlockAudio();
    playAll();
  };
  
  return (
    <>
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          top: 100,
          right: 16,
          width: 320,
          maxHeight: 'calc(100vh - 200px)',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          zIndex: 10001
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'secondary.dark',
            cursor: 'pointer'
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpatialIcon />
            <Typography variant="subtitle1" fontWeight="bold">
              Audio
            </Typography>
            {playingCount > 0 && (
              <Chip
                size="small"
                label={`${playingCount} playing`}
                color="secondary"
                sx={{ height: 20 }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setEnabled(!isEnabled);
              }}
            >
              {isEnabled ? <VolumeIcon /> : <MuteIcon />}
            </IconButton>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
        </Box>
        
        <Collapse in={expanded}>
          <Box sx={{ maxHeight: 'calc(50vh - 60px)', overflow: 'auto' }}>
            {/* Audio Unlock Alert */}
            {!audioUnlocked && (
              <Alert 
                severity="info" 
                sx={{ m: 1, cursor: 'pointer' }}
                onClick={unlockAudio}
                action={
                  <Button color="inherit" size="small" onClick={unlockAudio}>
                    Aktiver
                  </Button>
                }
              >
                Klikk her for å aktivere lyd
              </Alert>
            )}
            
            {/* Master Volume */}
            <Box sx={{ px: 2, py: 1, bgcolor: 'grey.900' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VolumeIcon fontSize="small" />
                <Typography variant="caption">Master Volume</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption">{Math.round(masterVolume * 100)}%</Typography>
              </Box>
              <Slider
                value={masterVolume}
                onChange={(_, v) => setMasterVolume(v as number)}
                min={0}
                max={1}
                step={0.01}
                size="small"
                disabled={!isEnabled}
              />
            </Box>
            
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<MusicIcon />} label="Sources" />
              <Tab icon={<AmbientIcon />} label="Ambience" />
              <Tab icon={<ZoneIcon />} label="Reverb" />
            </Tabs>
            
            {/* Sources Tab */}
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 1 }}>
                {/* Toolbar */}
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddDialog(true)}
                  >
                    Add Source
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Play All">
                    <IconButton size="small" onClick={handlePlayAll} disabled={!isEnabled}>
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Stop All">
                    <IconButton size="small" onClick={stopAll}>
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {/* Source List */}
                {sources.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No audio sources yet
                  </Typography>
                ) : (
                  <List dense>
                    {sources.map((source) => (
                      <ListItem key={source.id}>
                        <ListItemButton
                          selected={selectedSource === source.id}
                          onClick={() => selectSource(source.id)}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {source.type === 'ambient' ? <AmbientIcon /> : <SpatialIcon />}
                          </ListItemIcon>
                          <ListItemText
                            primary={source.name}
                            secondary={source.isPlaying ? 'Playing' : 'Stopped'}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => source.isPlaying ? stopSource(source.id) : handlePlaySource(source.id)}
                            disabled={!isEnabled}
                          >
                            {source.isPlaying ? <StopIcon /> : <PlayIcon />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => removeSource(source.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                
                {/* Selected Source Controls */}
                {selectedSourceData && (
                  <Box sx={{ p: 1, mt: 1, bgcolor: 'grey.900', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Volume: {Math.round(selectedSourceData.volume * 100)}%
                    </Typography>
                    <Slider
                      value={selectedSourceData.volume}
                      onChange={(_, v) => updateSource(selectedSourceData.id, { volume: v as number })}
                      min={0}
                      max={1}
                      step={0.01}
                      size="small"
                    />
                    
                    {selectedSourceData.type === 'point' && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          Max Distance: {selectedSourceData.maxDistance}m
                        </Typography>
                        <Slider
                          value={selectedSourceData.maxDistance}
                          onChange={(_, v) => updateSource(selectedSourceData.id, { maxDistance: v as number })}
                          min={1}
                          max={500}
                          size="small"
                        />
                      </>
                    )}
                    
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={selectedSourceData.isLooping}
                          onChange={(e) => updateSource(selectedSourceData.id, { isLooping: e.target.checked })}
                        />
                      }
                      label={<Typography variant="caption">Loop</Typography>}
                    />
                  </Box>
                )}
              </Box>
            </TabPanel>
            
            {/* Ambience Tab */}
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Load an atmosphere preset for your scene
                </Typography>
                
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AmbientIcon />}
                  onClick={() => setShowAmbienceDialog(true)}
                  sx={{ mb: 2 }}
                >
                  Browse Presets
                </Button>
                
                {/* Quick presets */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Quick Selection
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {['forest-day', 'rain', 'city', 'cafe'].map((key) => (
                    <Chip
                      key={key}
                      icon={ambienceIcons[key] as any}
                      label={AMBIENCE_PRESETS[key].name}
                      size="small"
                      onClick={() => handleLoadAmbience(key)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </TabPanel>
            
            {/* Reverb Tab */}
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Global reverb settings affect all audio
                </Typography>
                
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Reverb Preset</InputLabel>
                  <Select
                    value={globalReverb}
                    onChange={(e) => setGlobalReverb(e.target.value as ReverbPreset)}
                    label="Reverb Preset"
                  >
                    {Object.keys(REVERB_PRESETS).map((key) => (
                      <MenuItem key={key} value={key}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Reverb indicators */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Decay: {REVERB_PRESETS[globalReverb].decay}s
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Wet/Dry: {Math.round(REVERB_PRESETS[globalReverb].wetDryMix * 100)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Density: {Math.round(REVERB_PRESETS[globalReverb].density * 100)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Diffusion: {Math.round(REVERB_PRESETS[globalReverb].diffusion * 100)}%
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Add Zone button */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => addZone({
                    name: `Zone ${zones.length + 1}`,
                    position: camera?.position.clone() || new BABYLON.Vector3(0, 0, 0),
                    size: new BABYLON.Vector3(10, 5, 10)
                  })}
                >
                  Add Reverb Zone
                </Button>
                
                {zones.length > 0 && (
                  <List dense sx={{ mt: 1 }}>
                    {zones.map((zone) => (
                      <ListItem key={zone.id}>
                        <ListItemButton
                          selected={selectedZone === zone.id}
                          onClick={() => selectZone(zone.id)}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <ZoneIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={zone.name}
                            secondary={zone.reverbPreset}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => removeZone(zone.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </TabPanel>
          </Box>
        </Collapse>
      </Paper>
      
      {/* Add Source Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Audio Source</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newAudioName}
            onChange={(e) => setNewAudioName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Audio URL"
            placeholder="/audio/sound.mp3"
            value={newAudioUrl}
            onChange={(e) => setNewAudioUrl(e.target.value)}
            helperText="Enter path to audio file (MP3, WAV, OGG)"
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Place audio files in the /public/audio folder
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddAudio}
            disabled={!newAudioUrl || !newAudioName}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Ambience Presets Dialog */}
      <Dialog
        open={showAmbienceDialog}
        onClose={() => setShowAmbienceDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ambience Presets</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {Object.entries(AMBIENCE_PRESETS).map(([key, preset]) => (
              <Box key={key}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleLoadAmbience(key)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {ambienceIcons[key]}
                    <Typography variant="body2" fontWeight="medium">
                      {preset.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {preset.description}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAmbienceDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SpatialAudioPanel;
