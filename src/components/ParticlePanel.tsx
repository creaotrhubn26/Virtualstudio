/**
 * Particle System Panel
 * UI for managing VFX particle effects with presets and configuration
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
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
  Slider,
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
} from '@mui/material';
//
import {
  Whatshot as FireIcon,
  Cloud as SmokeIcon,
  WaterDrop as RainIcon,
  AcUnit as SnowIcon,
  Grain as DustIcon,
  Bolt as SparksIcon,
  FlashOn as ExplosionIcon,
  AutoAwesome as MagicIcon,
  BlurOn as FogIcon,
  Celebration as ConfettiIcon,
  Lightbulb as FireflyIcon,
  Water as WaterfallIcon,
  HotTub as SteamIcon,
  Park as LeavesIcon,
  Tune as CustomIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ContentCopy as DuplicateIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Speed as GPUIcon
} from '@mui/icons-material';
import {
  useParticleStore,
  PARTICLE_PRESETS,
  ParticleEffectType,
  ActiveParticleSystem
} from '../services/particleService';
import * as BABYLON from '@babylonjs/core';

interface ParticlePanelProps {
  scene?: BABYLON.Scene | null;
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

// Icon mapping for particle types
const particleIcons: Record<ParticleEffectType, React.ReactNode> = {
  fire: <FireIcon />,
  smoke: <SmokeIcon />,
  rain: <RainIcon />,
  snow: <SnowIcon />,
  dust: <DustIcon />,
  sparks: <SparksIcon />,
  explosion: <ExplosionIcon />,
  magic: <MagicIcon />,
  fog: <FogIcon />,
  confetti: <ConfettiIcon />,
  fireflies: <FireflyIcon />,
  waterfall: <WaterfallIcon />,
  steam: <SteamIcon />,
  leaves: <LeavesIcon />,
  custom: <CustomIcon />
};

export const ParticlePanel: React.FC<ParticlePanelProps> = ({ scene }) => {
  const {
    activeSystems,
    selectedSystem,
    useGPU,
    initialize,
    dispose,
    createSystem,
    removeSystem,
    duplicateSystem,
    selectSystem,
    playSystem,
    stopSystem,
    playAll,
    stopAll,
    updateSystemConfig,
    applyPreset,
    setUseGPU,
    getSystemById,
    exportSystemConfig
  } = useParticleStore();
  
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportedConfig, setExportedConfig] = useState('');
  
  // Initialize when scene available
  useEffect(() => {
    if (scene) {
      initialize(scene);
    }
    return () => {
      dispose();
    };
  }, [scene]);
  
  const selectedSystemData = selectedSystem ? getSystemById(selectedSystem) : null;
  
  const handleAddEffect = (type: ParticleEffectType) => {
    // Add at camera look direction
    const position = scene?.activeCamera?.position.clone() || new BABYLON.Vector3(0, 0, 0);
    position.z += 5; // Place in front of camera
    createSystem(type, position);
    setShowAddDialog(false);
  };
  
  const handleExport = () => {
    if (selectedSystem) {
      const config = exportSystemConfig(selectedSystem);
      setExportedConfig(config);
      setExportDialogOpen(true);
    }
  };
  
  const presetCategories = {
    'Fire & Heat': ['fire', 'smoke', 'sparks', 'explosion', 'steam'] as ParticleEffectType[],
    'Weather': ['rain', 'snow', 'fog'] as ParticleEffectType[],
    'Nature': ['dust', 'leaves', 'fireflies', 'waterfall'] as ParticleEffectType[],
    'Special': ['magic', 'confetti', 'custom'] as ParticleEffectType[]
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
            bgcolor: 'error.dark',
            cursor: 'pointer'
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FireIcon />
            <Typography variant="subtitle1" fontWeight="bold">
              Particles
            </Typography>
            <Chip
              size="small"
              label={activeSystems.length}
              color="error"
              sx={{ height: 20 }}
            />
          </Box>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        
        <Collapse in={expanded}>
          <Box sx={{ maxHeight: 'calc(60vh - 60px)', overflow: 'auto' }}>
            {/* Toolbar */}
            <Box sx={{ p: 1, display: 'flex', gap: 0.5, bgcolor: 'grey.900' }}>
              <Tooltip title="Add Effect">
                <IconButton size="small" onClick={() => setShowAddDialog(true)}>
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Play All">
                <IconButton size="small" onClick={playAll}>
                  <PlayIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Stop All">
                <IconButton size="small" onClick={stopAll}>
                  <StopIcon />
                </IconButton>
              </Tooltip>
              <Box sx={{ flex: 1 }} />
              <Tooltip title={useGPU ? 'GPU Accelerated' : 'CPU Mode'}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={useGPU}
                      onChange={(e) => setUseGPU(e.target.checked)}
                    />
                  }
                  label={<GPUIcon fontSize="small" />}
                />
              </Tooltip>
            </Box>
            
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Systems" />
              <Tab label="Properties" disabled={!selectedSystemData} />
            </Tabs>
            
            {/* Systems List Tab */}
            <TabPanel value={activeTab} index={0}>
              {activeSystems.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No particle systems yet
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setShowAddDialog(true)}
                    sx={{ mt: 1 }}
                  >
                    Add Effect
                  </Button>
                </Box>
              ) : (
                <List dense>
                  {activeSystems.map((system) => (
                    <ListItem
                      key={system.id}
                      sx={{
                        borderLeft: 3,
                        borderColor: selectedSystem === system.id ? 'primary.main' : 'transparent'
                      }}
                    >
                      <ListItemButton
                        selected={selectedSystem === system.id}
                        onClick={() => selectSystem(system.id)}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {particleIcons[system.type]}
                        </ListItemIcon>
                        <ListItemText
                          primary={system.name}
                          secondary={PARTICLE_PRESETS[system.type].name}
                        />
                      </ListItemButton>
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            system.isPlaying ? stopSystem(system.id) : playSystem(system.id);
                          }}
                        >
                          {system.isPlaying ? <StopIcon /> : <PlayIcon />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSystem(system.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPanel>
            
            {/* Properties Tab */}
            <TabPanel value={activeTab} index={1}>
              {selectedSystemData && (
                <Box sx={{ p: 1.5 }}>
                  {/* Name & Type */}
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                    {selectedSystemData.name}
                  </Typography>
                  
                  {/* Quick Preset Selector */}
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Preset</InputLabel>
                    <Select
                      value={selectedSystemData.type}
                      onChange={(e) => applyPreset(selectedSystemData.id, e.target.value as ParticleEffectType)}
                      label="Preset"
                    >
                      {Object.entries(PARTICLE_PRESETS).map(([key, preset]) => (
                        <MenuItem key={key} value={key}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {particleIcons[key as ParticleEffectType]}
                            {preset.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {/* Emission Controls */}
                  <Typography variant="caption" color="text.secondary">
                    Emission Rate: {selectedSystemData.config.emitRate}
                  </Typography>
                  <Slider
                    value={selectedSystemData.config.emitRate}
                    onChange={(_, v) => updateSystemConfig(selectedSystemData.id, { emitRate: v as number })}
                    min={1}
                    max={1000}
                    size="small"
                  />
                  
                  {/* Lifetime */}
                  <Typography variant="caption" color="text.secondary">
                    Lifetime: {selectedSystemData.config.minLifeTime.toFixed(1)}s - {selectedSystemData.config.maxLifeTime.toFixed(1)}s
                  </Typography>
                  <Slider
                    value={[selectedSystemData.config.minLifeTime, selectedSystemData.config.maxLifeTime]}
                    onChange={(_, v) => {
                      const [min, max] = v as number[];
                      updateSystemConfig(selectedSystemData.id, {
                        minLifeTime: min,
                        maxLifeTime: max
                      });
                    }}
                    min={0.1}
                    max={15}
                    step={0.1}
                    size="small"
                  />
                  
                  {/* Size */}
                  <Typography variant="caption" color="text.secondary">
                    Size: {selectedSystemData.config.minSize.toFixed(2)} - {selectedSystemData.config.maxSize.toFixed(2)}
                  </Typography>
                  <Slider
                    value={[selectedSystemData.config.minSize, selectedSystemData.config.maxSize]}
                    onChange={(_, v) => {
                      const [min, max] = v as number[];
                      updateSystemConfig(selectedSystemData.id, {
                        minSize: min,
                        maxSize: max
                      });
                    }}
                    min={0.01}
                    max={5}
                    step={0.01}
                    size="small"
                  />
                  
                  {/* Emit Power */}
                  <Typography variant="caption" color="text.secondary">
                    Emit Power: {selectedSystemData.config.minEmitPower.toFixed(1)} - {selectedSystemData.config.maxEmitPower.toFixed(1)}
                  </Typography>
                  <Slider
                    value={[selectedSystemData.config.minEmitPower, selectedSystemData.config.maxEmitPower]}
                    onChange={(_, v) => {
                      const [min, max] = v as number[];
                      updateSystemConfig(selectedSystemData.id, {
                        minEmitPower: min,
                        maxEmitPower: max
                      });
                    }}
                    min={0}
                    max={30}
                    step={0.5}
                    size="small"
                  />
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  {/* Actions */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                    <Box>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<DuplicateIcon />}
                        onClick={() => duplicateSystem(selectedSystemData.id)}
                      >
                        Copy
                      </Button>
                    </Box>
                    <Box>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<ExportIcon />}
                        onClick={handleExport}
                      >
                        Export
                      </Button>
                    </Box>
                    <Box>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          removeSystem(selectedSystemData.id);
                          setActiveTab(0);
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </TabPanel>
          </Box>
        </Collapse>
      </Paper>
      
      {/* Add Effect Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Particle Effect</DialogTitle>
        <DialogContent>
          {Object.entries(presetCategories).map(([category, types]) => (
            <Box key={category} sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {category}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {types.map((type) => (
                  <Chip
                    key={type}
                    icon={particleIcons[type] as any}
                    label={PARTICLE_PRESETS[type].name}
                    onClick={() => handleAddEffect(type)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      
      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Particle Configuration</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={exportedConfig}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1, fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(exportedConfig);
            }}
          >
            Copy to Clipboard
          </Button>
          <Button onClick={() => setExportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ParticlePanel;
