/**
 * Backdrops Panel
 * 
 * UI for selecting and configuring backdrops/environments in the scene.
 * Dispatches events to VirtualStudio (Babylon.js) for backdrop loading.
 * 
 * Features:
 * - Category selection (studio, outdoor, indoor, abstract, green-screen, skybox, cyclorama)
 * - Backdrops grid with previews
 * - Environment map toggle
 * - Ambient lighting controls
 * - Scale controls
 * - Set backdrop functionality
 * - Remove backdrop functionality
 */

import React, { useState, useMemo } from 'react';
import {
  logger } from '../../core/services/logger';
import Grid from '@mui/material/Grid';

const log = logger.module('BackdropsPanel');
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Chip,
  Slider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Landscape,
  Add,
  Delete,
  ExpandMore,
  Tune,
  WbSunny,
} from '@mui/icons-material';
import { useAppStore } from '../state/store';
import {
  BACKDROP_DATABASE,
  BACKDROP_CATEGORIES,
  BackdropCategory,
  BackdropSpec,
  getBackdropsByCategory,
} from '../data/backdropDefinitions';

const ALL_BACKDROPS = BACKDROP_DATABASE;
const BACKDROPS_BY_CATEGORY: Record<BackdropCategory, BackdropSpec[]> = {
  bakgrunn: getBackdropsByCategory('bakgrunn'),
  diffuser: getBackdropsByCategory('diffuser'),
  reflektor: getBackdropsByCategory('reflektor'),
};

export const BackdropsPanel: React.FC = () => {  const { addNode, removeNode } = useAppStore();
  const nodes = useAppStore((s) => s.scene);

  // UI State
  const [activeCategory, setActiveCategory] = useState<BackdropCategory>('bakgrunn');
  const [selectedBackdrop, setSelectedBackdrop] = useState<string | null>(null);
  
  // Options State
  const [scale, setScale] = useState(1.0);
  const [applyEnvironmentMap, setApplyEnvironmentMap] = useState(true);
  const [applyAmbientLight, setApplyAmbientLight] = useState(true);
  const [receiveShadow, setReceiveShadow] = useState(true);
  const [enableLOD, setEnableLOD] = useState(true);

  // Get backdrops for active category
  const backdropItems = useMemo(() => {    if (!BACKDROPS_BY_CATEGORY || !BACKDROPS_BY_CATEGORY[activeCategory]) return [];
    return BACKDROPS_BY_CATEGORY[activeCategory] || [];
  }, [activeCategory]);

  // Check if backdrop exists in scene
  const currentBackdrop = useMemo(() => {    if (!nodes || !Array.isArray(nodes)) return undefined;
    return nodes.find(node => node.type === 'background');
  }, [nodes]);

  const handleSetBackdrop = () => {
    if (!selectedBackdrop) return;

    const backdrop = ALL_BACKDROPS.find(b => b.id === selectedBackdrop);
    if (!backdrop) return;

    // Remove existing backdrop if any
    if (currentBackdrop) {
      removeNode(currentBackdrop.id);
    }

    // Add backdrop node to scene
    const backdropId = `backdrop-${Date.now()}`;
    addNode({
      id: backdropId,
      type: 'background',
      name: `${backdrop.name} (${backdrop.category})`,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [scale, scale, scale],
      },
      visible: true,
      userData: {
        backdropId: selectedBackdrop,
        backdropScale: scale,
        applyEnvironmentMap,
        applyAmbientLight,
        receiveShadow,
        enableLOD,
      },
    });

    // Dispatch event to VirtualStudio (Babylon.js) to load the backdrop
    window.dispatchEvent(new CustomEvent('ch-load-backdrop', {
      detail: {
        backdropId: selectedBackdrop,
        category: backdrop.category,
        scale,
        applyEnvironmentMap,
        applyAmbientLight,
        receiveShadow,
      }
    }));

    log.debug('Backdrop set: ', {
      id: backdropId,
      backdrop: backdrop.name,
      environmentMap: applyEnvironmentMap,
      ambientLight: applyAmbientLight,
    });
  };

  const handleRemoveBackdrop = () => {
    if (currentBackdrop) {
      removeNode(currentBackdrop.id);
      // Dispatch event to VirtualStudio to remove the backdrop
      window.dispatchEvent(new CustomEvent('ch-remove-backdrop'));
      log.debug('Backdrop removed');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, backgroundColor: '#1e1e1e', color: '#fff' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Landscape />
        Backdrops Library
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Set backdrops and environments with automatic HDR environment maps and ambient lighting.
      </Typography>

      {currentBackdrop && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Current backdrop: <strong>{currentBackdrop.name}</strong>
        </Alert>
      )}

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onChange={(_, value) => setActiveCategory(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {BACKDROP_CATEGORIES.map(cat => (
          <Tab key={cat.key} value={cat.key} label={cat.label} />
        ))}
      </Tabs>

      {/* Backdrops Grid */}
      <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
        {backdropItems.length === 0 ? (
          <Alert severity="info">
            No backdrops available in this category yet.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {backdropItems.map((backdrop) => (
              <Grid size={{ xs: 12, sm: 6 }} key={backdrop.id}>
                <Card
                  sx={{
                    backgroundColor: selectedBackdrop === backdrop.id ? '#333' : '#2a2a2a', '&:hover': { backgroundColor: '#333' },
                    cursor: 'pointer',
                    border: selectedBackdrop === backdrop.id ? '2px solid #2196f3' : 'none'}}
                  onClick={() => setSelectedBackdrop(backdrop.id)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {backdrop.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {backdrop.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {backdrop.size && <Chip label={backdrop.size} size="small" />}
                      <Chip label={backdrop.category} size="small" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Options Accordion */}
      <Accordion defaultExpanded sx={{ backgroundColor: '#2a2a2a', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tune />
            Backdrop Options
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Scale */}
          <Typography variant="caption">Scale: {scale.toFixed(2)}</Typography>
          <Slider
            value={scale}
            onChange={(_, value) => setScale(value as number)}
            min={0.1}
            max={10}
            step={0.1}
            sx={{ mb: 2 }}
          />

          {/* Environment & Lighting Options */}
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WbSunny />
            Environment & Lighting
          </Typography>
          <FormControlLabel
            control={<Switch checked={applyEnvironmentMap} onChange={(e) => setApplyEnvironmentMap(e.target.checked)} />}
            label="Apply Environment Map (HDR)"
          />
          <FormControlLabel
            control={<Switch checked={applyAmbientLight} onChange={(e) => setApplyAmbientLight(e.target.checked)} />}
            label="Apply Ambient Lighting"
          />
          <FormControlLabel
            control={<Switch checked={receiveShadow} onChange={(e) => setReceiveShadow(e.target.checked)} />}
            label="Receive Shadows"
          />
          <FormControlLabel
            control={<Switch checked={enableLOD} onChange={(e) => setEnableLOD(e.target.checked)} />}
            label="Enable LOD"
          />
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box sx={{ display:'flex', gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<Add />}
          onClick={handleSetBackdrop}
          disabled={!selectedBackdrop}
        >
          Set Backdrop
        </Button>
        {currentBackdrop && (
          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<Delete />}
            onClick={handleRemoveBackdrop}
          >
            Remove
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default BackdropsPanel;

