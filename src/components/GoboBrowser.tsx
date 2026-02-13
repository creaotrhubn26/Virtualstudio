/**
 * GoboBrowser - Panel for browsing and applying gobo patterns
 * Supports both attaching to lights and placing as standalone assets
 */

import { useState, useEffect, type FC } from 'react';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PatternIcon from '@mui/icons-material/Pattern';

import { GOBO_PATTERNS, GoboDefinition, GoboPattern, getGobosByCategory } from '../data/goboDefinitions';
import { goboService } from '../core/services/goboService';

interface GoboBrowserProps {
  selectedLightId?: string;
  onClose?: () => void;
}

export const GoboBrowser: FC<GoboBrowserProps> = ({ selectedLightId, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGobo, setSelectedGobo] = useState<GoboDefinition | null>(null);
  const [goboOptions, setGoboOptions] = useState({
    size: 1.0,
    rotation: 0,
    intensity: 1.0,
  });
  const [attachMode, setAttachMode] = useState<'light' | 'standalone'>('light');
  const [dialogOpen, setDialogOpen] = useState(false);

  const categories = ['all', 'architectural', 'nature', 'abstract', 'custom'];

  const filteredGobos = GOBO_PATTERNS.filter(gobo => {
    const matchesSearch = gobo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         gobo.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         gobo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || gobo.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleGoboSelect = (gobo: GoboDefinition) => {
    setSelectedGobo(gobo);
    setGoboOptions({
      size: gobo.defaultSize,
      rotation: gobo.defaultRotation,
      intensity: 1.0,
    });
    setDialogOpen(true);
  };

  const handleApply = () => {
    if (!selectedGobo) return;

    if (attachMode === 'light' && selectedLightId) {
      // Attach to light
      window.dispatchEvent(new CustomEvent('ch-attach-gobo', {
        detail: {
          lightId: selectedLightId,
          goboId: selectedGobo.id,
          options: goboOptions,
        }
      }));
    } else {
      // Place as standalone
      window.dispatchEvent(new CustomEvent('ch-add-standalone-gobo', {
        detail: {
          goboId: selectedGobo.id,
          position: [0, 2, -5],
          options: goboOptions,
        }
      }));
    }

    setDialogOpen(false);
    setSelectedGobo(null);
    if (onClose) onClose();
  };

  const handleRemoveGobo = () => {
    if (selectedLightId) {
      window.dispatchEvent(new CustomEvent('ch-remove-gobo', {
        detail: { lightId: selectedLightId }
      }));
      if (onClose) onClose();
    }
  };

  // Check if selected light has a gobo
  const hasGobo = selectedLightId && goboService.getGoboAttachment(selectedLightId);

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0d1117' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PatternIcon /> Gobo Browser
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Søk gobo..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
        }}
        sx={{ mb: 2, bgcolor: '#1e1e1e', '& .MuiOutlinedInput-root': { color: '#fff' } }}
      />

      {/* Category filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <Chip
            key={cat}
            label={cat === 'all' ? 'Alle' : cat}
            onClick={() => setSelectedCategory(cat)}
            color={selectedCategory === cat ? 'primary' : 'default'}
            size="small"
            sx={{ bgcolor: selectedCategory === cat ? '#00d4ff' : '#1e1e1e', color: '#fff' }}
          />
        ))}
      </Box>

      {/* Remove gobo button if light has one */}
      {hasGobo && (
        <Button
          variant="outlined"
          color="error"
          fullWidth
          onClick={handleRemoveGobo}
          sx={{ mb: 2 }}
        >
          Fjern gobo fra lys
        </Button>
      )}

      {/* Gobo grid */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {filteredGobos.map(gobo => (
            <Grid item xs={6} sm={4} md={3} key={gobo.id}>
              <Card
                onClick={() => handleGoboSelect(gobo)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: '#1e1e1e',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: '#252525', transform: 'scale(1.02)' },
                }}
              >
                <Box
                  sx={{
                    height: 100,
                    bgcolor: '#000',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Pattern preview - simplified representation */}
                  <Box
                    sx={{
                      width: '80%',
                      height: '80%',
                      border: '2px solid #333',
                      borderRadius: '50%',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {gobo.pattern === 'window' && (
                      <Box sx={{ position: 'absolute', inset: '20%', border: '2px solid #fff' }}>
                        <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', bgcolor: '#fff' }} />
                        <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', bgcolor: '#fff' }} />
                      </Box>
                    )}
                    {gobo.pattern === 'blinds' && (
                      <>
                        {[0, 1, 2, 3, 4].map(i => (
                          <Box
                            key={i}
                            sx={{
                              position: 'absolute',
                              top: `${i * 20}%`,
                              left: 0,
                              right: 0,
                              height: '15%',
                              bgcolor: '#fff',
                            }}
                          />
                        ))}
                      </>
                    )}
                    {gobo.pattern === 'leaves' && (
                      <Box sx={{ position: 'absolute', inset: '10%', display: 'flex', flexWrap: 'wrap', gap: '5%' }}>
                        {[0, 1, 2, 3, 4, 5].map(i => (
                          <Box
                            key={i}
                            sx={{
                              width: '25%',
                              height: '25%',
                              borderRadius: '50%',
                              bgcolor: '#fff',
                              opacity: 0.7,
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    {gobo.pattern === 'dots' && (
                      <Box sx={{ position: 'absolute', inset: '10%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10%' }}>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <Box key={i} sx={{ width: '100%', aspectRatio: 1, borderRadius: '50%', bgcolor: '#fff' }} />
                        ))}
                      </Box>
                    )}
                    {gobo.pattern === 'lines' && (
                      <Box sx={{ position: 'absolute', inset: '10%', display: 'flex', flexDirection: 'column', gap: '8%' }}>
                        {[0, 1, 2, 3, 4].map(i => (
                          <Box key={i} sx={{ width: '100%', height: '12%', bgcolor: '#fff' }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff', display: 'block' }}>
                    {gobo.nameNo}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888', fontSize: '10px' }}>
                    {gobo.category}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Gobo options dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedGobo?.nameNo || 'Gobo Options'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Attach mode */}
            <FormControl fullWidth>
              <InputLabel>Plasseringsmodus</InputLabel>
              <Select
                value={attachMode}
                onChange={(e) => setAttachMode(e.target.value as 'light' | 'standalone')}
                label="Plasseringsmodus"
              >
                <MenuItem value="light" disabled={!selectedLightId}>
                  Fest til lys {selectedLightId ? `(${selectedLightId})` : '(Ingen valgt)'}
                </MenuItem>
                <MenuItem value="standalone">Plasser som egen gjenstand</MenuItem>
              </Select>
            </FormControl>

            {/* Size */}
            <Box>
              <Typography gutterBottom>Størrelse: {goboOptions.size.toFixed(2)}m</Typography>
              <Slider
                value={goboOptions.size}
                onChange={(_, value) => setGoboOptions({ ...goboOptions, size: value as number })}
                min={0.1}
                max={3.0}
                step={0.1}
              />
            </Box>

            {/* Rotation */}
            <Box>
              <Typography gutterBottom>Rotasjon: {goboOptions.rotation}°</Typography>
              <Slider
                value={goboOptions.rotation}
                onChange={(_, value) => setGoboOptions({ ...goboOptions, rotation: value as number })}
                min={0}
                max={360}
                step={1}
              />
            </Box>

            {/* Intensity */}
            <Box>
              <Typography gutterBottom>Intensitet: {goboOptions.intensity.toFixed(2)}</Typography>
              <Slider
                value={goboOptions.intensity}
                onChange={(_, value) => setGoboOptions({ ...goboOptions, intensity: value as number })}
                min={0}
                max={1}
                step={0.01}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Avbryt</Button>
          <Button onClick={handleApply} variant="contained" color="primary">
            {attachMode === 'light' ? 'Fest til lys' : 'Plasser'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoboBrowser;





















