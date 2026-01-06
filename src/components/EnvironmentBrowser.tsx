/**
 * EnvironmentBrowser - Panel for browsing and applying environment presets
 * Includes walls, floors, and complete environment configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CloseIcon from '@mui/icons-material/Close';

import { environmentService, EnvironmentState } from '../core/services/environmentService';
import { WALL_CATEGORIES, WALL_MATERIALS, WallMaterial, WallCategory } from '../data/wallDefinitions';
import { FLOOR_CATEGORIES, FLOOR_MATERIALS, FloorMaterial, FloorCategory } from '../data/floorDefinitions';
import { ENVIRONMENT_CATEGORIES, ENVIRONMENT_PRESETS, EnvironmentPreset, EnvironmentCategory } from '../data/environmentPresets';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%', overflow: 'auto' }}>
      {value === index && children}
    </div>
  );
}

// Material Card Component
const MaterialCard: React.FC<{
  material: WallMaterial | FloorMaterial;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ material, isSelected, onSelect }) => (
  <Card
    onClick={onSelect}
    sx={{
      cursor: 'pointer',
      border: isSelected ? '2px solid #00d4ff' : '2px solid transparent',
      bgcolor: '#1e1e1e',
      transition: 'all 0.2s',
      '&:hover': { bgcolor: '#252525', transform: 'scale(1.02)' },
    }}
  >
    <Box
      sx={{
        height: 60,
        bgcolor: material.color || '#333',
        position: 'relative',
        ...('gradientColors' in material && material.gradientColors && {
          background: `linear-gradient(135deg, ${material.gradientColors.join(', ')})`,
        }),
      }}
    >
      {material.emissive && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 20px ${material.emissive}`,
            opacity: material.emissiveIntensity || 0.5,
          }}
        />
      )}
    </Box>
    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff', display: 'block' }}>
        {material.nameNo}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
        {material.tags.slice(0, 2).map(tag => (
          <Chip key={tag} label={tag} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#333' }} />
        ))}
      </Box>
    </CardContent>
  </Card>
);

// Environment Preset Card
const PresetCard: React.FC<{
  preset: EnvironmentPreset;
  isActive: boolean;
  onApply: () => void;
}> = ({ preset, isActive, onApply }) => (
  <Card
    onClick={onApply}
    sx={{
      cursor: 'pointer',
      border: isActive ? '2px solid #7c3aed' : '2px solid transparent',
      bgcolor: '#1e1e1e',
      transition: 'all 0.2s',
      '&:hover': { bgcolor: '#252525' },
    }}
  >
    <CardContent sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
        {preset.nameNo}
      </Typography>
      <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
        {preset.descriptionNo}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {preset.moodTags.slice(0, 3).map(tag => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: preset.category === 'lovecraft' ? '#4a1a4a' : '#1a3a4a',
              color: '#fff',
            }}
          />
        ))}
      </Box>
    </CardContent>
  </Card>
);

export const EnvironmentBrowser: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallCategory, setSelectedWallCategory] = useState<WallCategory | 'all'>('all');
  const [selectedFloorCategory, setSelectedFloorCategory] = useState<FloorCategory | 'all'>('all');
  const [selectedEnvCategory, setSelectedEnvCategory] = useState<EnvironmentCategory | 'all'>('all');
  const [envState, setEnvState] = useState<EnvironmentState>(environmentService.getState());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    const unsubscribe = environmentService.subscribe(setEnvState);
    return unsubscribe;
  }, []);

  // Filter materials based on search and category
  const filteredWalls = WALL_MATERIALS.filter(w => {
    const matchesCategory = selectedWallCategory === 'all' || w.category === selectedWallCategory;
    const matchesSearch = !searchQuery ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredFloors = FLOOR_MATERIALS.filter(f => {
    const matchesCategory = selectedFloorCategory === 'all' || f.category === selectedFloorCategory;
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredPresets = [...ENVIRONMENT_PRESETS, ...environmentService.getCustomPresets()].filter(p => {
    const matchesCategory = selectedEnvCategory === 'all' || p.category === selectedEnvCategory;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSaveCustom = () => {
    if (customName.trim()) {
      environmentService.saveAsCustomPreset(customName.trim());
      setCustomName('');
      setSaveDialogOpen(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#141414', color: '#fff' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeIcon sx={{ color: '#7c3aed' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Miljø</Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Lagre som preset">
            <IconButton size="small" onClick={() => setSaveDialogOpen(true)}>
              <SaveIcon sx={{ color: '#888' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Søk materialer og presets..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#1e1e1e',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            },
          }}
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', minHeight: 40 }}
      >
        <Tab icon={<AutoAwesomeIcon />} label="Presets" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab icon={<WallpaperIcon />} label="Vegger" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab icon={<SquareFootIcon />} label="Gulv" sx={{ minHeight: 40, fontSize: 12 }} />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Presets Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label="Alle"
              size="small"
              onClick={() => setSelectedEnvCategory('all')}
              sx={{ bgcolor: selectedEnvCategory === 'all' ? '#7c3aed' : '#333' }}
            />
            {ENVIRONMENT_CATEGORIES.map(cat => (
              <Chip
                key={cat.id}
                label={`${cat.icon} ${cat.nameNo}`}
                size="small"
                onClick={() => setSelectedEnvCategory(cat.id)}
                sx={{ bgcolor: selectedEnvCategory === cat.id ? '#7c3aed' : '#333' }}
              />
            ))}
          </Box>

          {/* Presets Grid */}
          <Grid container spacing={1}>
            {filteredPresets.map(preset => (
              <Grid size={12} key={preset.id}>
                <PresetCard
                  preset={preset}
                  isActive={envState.activePresetId === preset.id}
                  onApply={() => environmentService.applyPreset(preset.id)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Walls Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Wall Visibility Controls */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#1e1e1e', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
              Synlighet
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['backWall', 'leftWall', 'rightWall', 'rearWall'].map(wallId => (
                <Chip
                  key={wallId}
                  label={wallId.replace('Wall', '')}
                  size="small"
                  icon={envState.walls[wallId as keyof typeof envState.walls].visible ?
                    <VisibilityIcon sx={{ fontSize: 14 }} /> :
                    <VisibilityOffIcon sx={{ fontSize: 14 }} />}
                  onClick={() => environmentService.toggleWall(wallId)}
                  sx={{
                    bgcolor: envState.walls[wallId as keyof typeof envState.walls].visible ? '#2a4a2a' : '#333',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label="Alle"
              size="small"
              onClick={() => setSelectedWallCategory('all')}
              sx={{ bgcolor: selectedWallCategory === 'all' ? '#00d4ff' : '#333' }}
            />
            {WALL_CATEGORIES.map(cat => (
              <Chip
                key={cat.id}
                label={`${cat.icon} ${cat.nameNo}`}
                size="small"
                onClick={() => setSelectedWallCategory(cat.id)}
                sx={{ bgcolor: selectedWallCategory === cat.id ? '#00d4ff' : '#333' }}
              />
            ))}
          </Box>

          {/* Walls Grid */}
          <Grid container spacing={1}>
            {filteredWalls.map(wall => (
              <Grid size={6} key={wall.id}>
                <MaterialCard
                  material={wall}
                  isSelected={Object.values(envState.walls).some(w => w.materialId === wall.id)}
                  onSelect={() => environmentService.setAllWallsMaterial(wall.id)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Floor Tab */}
        <TabPanel value={tabValue} index={2}>
          {/* Floor Controls */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#1e1e1e', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={envState.floor.visible}
                    onChange={() => environmentService.toggleFloor()}
                    size="small"
                  />
                }
                label="Gulv"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={envState.floor.gridVisible}
                    onChange={() => environmentService.toggleGrid()}
                    size="small"
                  />
                }
                label="Rutenett"
              />
            </Box>
          </Box>

          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label="Alle"
              size="small"
              onClick={() => setSelectedFloorCategory('all')}
              sx={{ bgcolor: selectedFloorCategory === 'all' ? '#00d4ff' : '#333' }}
            />
            {FLOOR_CATEGORIES.map(cat => (
              <Chip
                key={cat.id}
                label={`${cat.icon} ${cat.nameNo}`}
                size="small"
                onClick={() => setSelectedFloorCategory(cat.id)}
                sx={{ bgcolor: selectedFloorCategory === cat.id ? '#00d4ff' : '#333' }}
              />
            ))}
          </Box>

          {/* Floors Grid */}
          <Grid container spacing={1}>
            {filteredFloors.map(floor => (
              <Grid size={6} key={floor.id}>
                <MaterialCard
                  material={floor}
                  isSelected={envState.floor.materialId === floor.id}
                  onSelect={() => environmentService.setFloorMaterial(floor.id)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Box>

      {/* Save Custom Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Lagre som preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset navn"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Avbryt</Button>
          <Button variant="contained" onClick={handleSaveCustom}>Lagre</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

