import {
  useState,
  useEffect,
  type DragEvent } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Switch,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  DragIndicator as DragIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { LayerManager } from '../core/layers/LayerManager';
import { Layer } from '../core/models/sceneComposer';

interface LayerEditorProps {
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
}

export function LayerEditor({ layers, onLayersChange }: LayerEditorProps) {
  const [layerManager] = useState(() => new LayerManager());
  const [searchQuery, setSearchQuery] = useState('');
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#00d4ff');
  const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  useEffect(() => {
    if (layers.length > 0) {
      layerManager.loadLayers(layers);
    }
  }, []);

  useEffect(() => {
    const currentLayers = layerManager.getLayers();
    if (JSON.stringify(currentLayers) !== JSON.stringify(layers)) {
      onLayersChange(currentLayers);
    }
  }, [layerManager, layers, onLayersChange]);

  const handleAddLayer = () => {
    if (!newLayerName.trim()) return;
    const layer = layerManager.addLayer(newLayerName, newLayerColor);
    onLayersChange(layerManager.getLayers());
    setNewLayerName('');
  };

  const handleDeleteLayer = (id: string) => {
    if (window.confirm('Er du sikker på at du vil slette dette laget?')) {
      layerManager.removeLayer(id);
      onLayersChange(layerManager.getLayers());
    }
  };

  const handleToggleVisibility = (id: string) => {
    const layer = layerManager.getLayer(id);
    if (layer) {
      layerManager.setLayerVisible(id, !layer.visible);
      onLayersChange(layerManager.getLayers());
    }
  };

  const handleToggleLock = (id: string) => {
    const layer = layerManager.getLayer(id);
    if (layer) {
      layerManager.setLayerLocked(id, !layer.locked);
      onLayersChange(layerManager.getLayers());
    }
  };

  const handleToggleAllVisibility = () => {
    const allVisible = layers.every(l => l.visible);
    layers.forEach(layer => {
      layerManager.setLayerVisible(layer.id, !allVisible);
    });
    onLayersChange(layerManager.getLayers());
  };

  const handleToggleAllLock = () => {
    const allLocked = layers.every(l => l.locked);
    layers.forEach(layer => {
      layerManager.setLayerLocked(layer.id, !allLocked);
    });
    onLayersChange(layerManager.getLayers());
  };

  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
    layerManager.updateLayer(id, updates);
    onLayersChange(layerManager.getLayers());
  };

  const handleDragStart = (e: DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent, targetLayerId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetLayerId) return;

    const draggedIndex = layers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = layers.findIndex(l => l.id === targetLayerId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      layerManager.reorderLayer(draggedLayerId, targetIndex);
      onLayersChange(layerManager.getLayers());
    }
    setDraggedLayerId(null);
  };

  const filteredLayers = layers.filter(layer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return layer.name.toLowerCase().includes(query) ||
           layer.nodeIds.some(id => id.toLowerCase().includes(query));
  });

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Søk layers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.87)', mr: 1 }} />,
          }}
          sx={{
            flex: 1,
            minWidth: '200px',
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            },
          }}
        />
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          onClick={handleToggleAllVisibility}
          sx={{
            borderColor: 'rgba(255,255,255,0.3)',
            color: '#fff',
            '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
          }}
        >
          {layers.every(l => l.visible) ? 'Skjul alle' : 'Vis alle'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<LockIcon />}
          onClick={handleToggleAllLock}
          sx={{
            borderColor: 'rgba(255,255,255,0.3)',
            color: '#fff',
            '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
          }}
        >
          {layers.every(l => l.locked) ? 'Lås opp alle' : 'Lås alle'}
        </Button>
      </Box>

      {/* Add new layer */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Nytt lag-navn"
          value={newLayerName}
          onChange={(e) => setNewLayerName(e.target.value)}
          size="small"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddLayer();
            }
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            },
          }}
        />
        <input
          type="color"
          value={newLayerColor}
          onChange={(e) => setNewLayerColor(e.target.value)}
          style={{
            width: '40px',
            height: '40px',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddLayer}
          disabled={!newLayerName.trim()}
          sx={{
            bgcolor: '#00d4ff',
            color: '#000',
            '&:hover': { bgcolor: '#00b8e6' },
            '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' },
          }}
        >
          Legg til
        </Button>
      </Box>

      {/* Layers list */}
      {filteredLayers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.87)' }}>
          <LayersIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {searchQuery ? 'Ingen layers matcher søket' : 'Ingen layers'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {searchQuery ? 'Prøv et annet søkeord' : 'Legg til ditt første lag'}
          </Typography>
        </Box>
      ) : (
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {filteredLayers.map((layer, index) => (
            <ListItem
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layer.id)}
              sx={{
                bgcolor: selectedLayer?.id === layer.id ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(0,212,255,0.15)',
                  borderColor: '#00d4ff',
                },
              }}
              onClick={() => {
                setSelectedLayer(layer);
                setEditDialogOpen(true);
              }}
            >
              <DragIcon sx={{ color: 'rgba(255,255,255,0.87)', mr: 1, cursor: 'grab' }} />
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: layer.color,
                  borderRadius: '50%',
                  mr: 2,
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              />
              <ListItemText
                primary={layer.name}
                secondary={`${layer.nodeIds.length} objekter`}
                sx={{
                  '& .MuiListItemText-primary': { color: '#fff' },
                  '& .MuiListItemText-secondary': { color: 'rgba(255,255,255,0.87)' },
                }}
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {layer.opacity !== undefined && layer.opacity < 1 && (
                    <Chip
                      label={`${Math.round(layer.opacity * 100)}%`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '10px',
                      }}
                    />
                  )}
                  {layer.blendingMode && layer.blendingMode !== 'normal' && (
                    <Chip
                      label={layer.blendingMode}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(0,212,255,0.2)',
                        color: '#00d4ff',
                        fontSize: '10px',
                      }}
                    />
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(layer.id);
                    }}
                    sx={{ color: layer.visible ? '#00d4ff' : 'rgba(255,255,255,0.5)' }}
                  >
                    {layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLock(layer.id);
                    }}
                    sx={{ color: layer.locked ? '#ffb800' : 'rgba(255,255,255,0.5)' }}
                  >
                    {layer.locked ? <LockIcon /> : <LockOpenIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayer(layer.id);
                    }}
                    sx={{ color: '#ff4444' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Edit Layer Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedLayer(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Rediger Lag</DialogTitle>
        <DialogContent>
          {selectedLayer && (
            <Box>
              <TextField
                autoFocus
                margin="dense"
                label="Navn"
                fullWidth
                variant="outlined"
                value={selectedLayer.name}
                onChange={(e) => {
                  const updated = { ...selectedLayer, name: e.target.value };
                  setSelectedLayer(updated);
                }}
                sx={{
                  mb: 2,
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                }}
              />
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', minWidth: 100 }}>
                  Farge:
                </Typography>
                <input
                  type="color"
                  value={selectedLayer.color}
                  onChange={(e) => {
                    const updated = { ...selectedLayer, color: e.target.value };
                    setSelectedLayer(updated);
                  }}
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.87)' }}>
                  Opacity: {Math.round((selectedLayer.opacity || 1) * 100)}%
                </Typography>
                <Slider
                  value={selectedLayer.opacity || 1}
                  onChange={(_, value) => {
                    const updated = { ...selectedLayer, opacity: Array.isArray(value) ? value[0] : value };
                    setSelectedLayer(updated);
                  }}
                  min={0}
                  max={1}
                  step={0.01}
                  sx={{ color: '#00d4ff' }}
                />
              </Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Blending Mode</InputLabel>
                <Select
                  value={selectedLayer.blendingMode || 'normal'}
                  onChange={(e) => {
                    const updated = { ...selectedLayer, blendingMode: e.target.value as any };
                    setSelectedLayer(updated);
                  }}
                  label="Blending Mode"
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="overlay">Overlay</MenuItem>
                  <MenuItem value="multiply">Multiply</MenuItem>
                  <MenuItem value="screen">Screen</MenuItem>
                  <MenuItem value="add">Add</MenuItem>
                  <MenuItem value="subtract">Subtract</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={selectedLayer.visible}
                    onChange={(e) => {
                      const updated = { ...selectedLayer, visible: e.target.checked };
                      setSelectedLayer(updated);
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#00d4ff',
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                    Synlig
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={selectedLayer.locked}
                    onChange={(e) => {
                      const updated = { ...selectedLayer, locked: e.target.checked };
                      setSelectedLayer(updated);
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#ffb800',
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                    Låst
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedLayer(null);
            }}
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            Avbryt
          </Button>
          <Button
            onClick={() => {
              if (selectedLayer) {
                handleUpdateLayer(selectedLayer.id, selectedLayer);
                setEditDialogOpen(false);
                setSelectedLayer(null);
              }
            }}
            variant="contained"
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              '&:hover': { bgcolor: '#00b8e6' },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

