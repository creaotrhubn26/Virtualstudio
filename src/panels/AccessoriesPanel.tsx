/**
 * Accessories Panel
 * 
 * Unified UI for selecting and customizing all types of accessories:
 * - Facial features (noses, ears, mouths, eyebrows, facial hair)
 * - Head accessories (hats, hair, headbands, crowns, helmets)
 * - Body accessories (earrings, necklaces, bracelets, watches, bags)
 */

import React, { useState } from 'react';
import {
  logger } from '../core/services/logger';
import Grid from '@mui/material/GridLegacy';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Face, EmojiPeople, Watch, Add } from '@mui/icons-material';
import { useAppStore } from '../state/store';
import {
  FACIAL_FEATURES,
  FACIAL_FEATURES_BY_CATEGORY,
  FacialFeatureCategory,
} from '../core/data/facialFeaturesStyles';
import {
  HEAD_ACCESSORIES,
  HEAD_ACCESSORIES_BY_CATEGORY,
  HeadAccessoryCategory,
} from '../core/data/headAccessoriesStyles';
import {
  BODY_ACCESSORIES,
  BODY_ACCESSORIES_BY_CATEGORY,
  BodyAccessoryCategory,
} from '../core/data/bodyAccessoriesStyles';

const log = logger.module('AccessoriesPanel');

type AccessoryType = 'facial' | 'head' | 'body';

const FACIAL_CATEGORIES: { value: FacialFeatureCategory; label: string }[] = [
  { value: 'noses', label: 'Noses' },
  { value: 'ears', label: 'Ears' },
  { value: 'mouths', label: 'Mouths' },
  { value: 'eyebrows', label: 'Eyebrows' },
  { value: 'facial_hair', label: 'Facial Hair' },
];

const HEAD_CATEGORIES: { value: HeadAccessoryCategory; label: string }[] = [
  { value: 'hats', label: 'Hats' },
  { value: 'hair', label: 'Hair' },
  { value: 'headbands', label: 'Headbands' },
  { value: 'crowns', label: 'Crowns' },
  { value: 'helmets', label: 'Helmets' },
];

const BODY_CATEGORIES: { value: BodyAccessoryCategory; label: string }[] = [
  { value: 'earrings', label: 'Earrings' },
  { value: 'necklaces', label: 'Necklaces' },
  { value: 'bracelets', label: 'Bracelets' },
  { value: 'watches', label: 'Watches' },
  { value: 'bags', label: 'Bags' },
];

export const AccessoriesPanel: React.FC = () => {
  const { addNode } = useAppStore();
  const nodes = useAppStore((s) => s.scene) || [];

  const [accessoryType, setAccessoryType] = useState<AccessoryType>('head');
  const [facialCategory, setFacialCategory] = useState<FacialFeatureCategory>('noses');
  const [headCategory, setHeadCategory] = useState<HeadAccessoryCategory>('hair');
  const [bodyCategory, setBodyCategory] = useState<BodyAccessoryCategory>('watches');
  const [selectedActor, setSelectedActor] = useState<string>('');
  const [customColor, setCustomColor] = useState({ hue: 25, saturation: 40, lightness: 70 });
  const [roughness, setRoughness] = useState(0.8);
  const [metalness, setMetalness] = useState(0);

  const actors = nodes.filter(n => n.type === 'avatar' || n.type === 'actor');

  const getCurrentItems = () => {
    switch (accessoryType) {
      case 'facial':
        return FACIAL_FEATURES_BY_CATEGORY[facialCategory] || [];
      case 'head':
        return HEAD_ACCESSORIES_BY_CATEGORY[headCategory] || [];
      case 'body':
        return BODY_ACCESSORIES_BY_CATEGORY[bodyCategory] || [];
      default:
        return [];
    }
  };

  const handleAddAccessory = (itemId: string) => {
    if (!selectedActor) {
      log.warn('No actor selected');
      return;
    }

    let item;
    let nodeType;
    switch (accessoryType) {
      case 'facial':
        item = FACIAL_FEATURES.find(f => f.id === itemId);
        nodeType = 'facial_feature';
        break;
      case 'head':
        item = HEAD_ACCESSORIES.find(h => h.id === itemId);
        nodeType = 'head_accessory';
        break;
      case 'body':
        item = BODY_ACCESSORIES.find(b => b.id === itemId);
        nodeType = 'body_accessory';
        break;
    }

    if (!item) return;

    addNode({
      id: `${itemId}_${Date.now()}`,
      name: item.name,
      type: 'mesh',
      visible: true,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      userData: {
        accessoryType: nodeType,
        accessoryId: itemId,
        parentActorId: selectedActor,
        color: customColor,
        roughness,
        metalness,
      },
    });

    log.info(`Added ${item.name} to actor`);
  };

  const currentItems = getCurrentItems();

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <EmojiPeople sx={{ mr: 1 }} />
        <Typography variant="h6">Accessories</Typography>
      </Box>

      {/* Actor Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Actor</InputLabel>
        <Select
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
          label="Select Actor"
          MenuProps={{ sx: { zIndex: 1400 } }}
        >
          {actors.map((actor) => (
            <MenuItem key={actor.id} value={actor.id}>
              {actor.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Accessory Type Toggle */}
      <ToggleButtonGroup
        value={accessoryType}
        exclusive
        onChange={(_, newValue) => newValue && setAccessoryType(newValue)}
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton value="facial">
          <Face sx={{ mr: 1 }} />
          Facial
        </ToggleButton>
        <ToggleButton value="head">
          <EmojiPeople sx={{ mr: 1 }} />
          Head
        </ToggleButton>
        <ToggleButton value="body">
          <Watch sx={{ mr: 1 }} />
          Body
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Category Tabs */}
      {accessoryType === 'facial' && (
        <Tabs
          value={facialCategory}
          onChange={(_, newValue) => setFacialCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {FACIAL_CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      )}
      {accessoryType === 'head' && (
        <Tabs
          value={headCategory}
          onChange={(_, newValue) => setHeadCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {HEAD_CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      )}
      {accessoryType === 'body' && (
        <Tabs
          value={bodyCategory}
          onChange={(_, newValue) => setBodyCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {BODY_CATEGORIES.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      )}

      {/* Color Customization */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Color (HSL)
        </Typography>
        <Box sx={{ px: 1 }}>
          <Typography variant="caption">Hue: {customColor.hue}°</Typography>
          <Slider
            value={customColor.hue}
            onChange={(_, v) => setCustomColor({ ...customColor, hue: v as number })}
            min={0}
            max={360}
            size="small"
          />
          <Typography variant="caption">Saturation: {customColor.saturation}%</Typography>
          <Slider
            value={customColor.saturation}
            onChange={(_, v) => setCustomColor({ ...customColor, saturation: v as number })}
            min={0}
            max={100}
            size="small"
          />
          <Typography variant="caption">Lightness: {customColor.lightness}%</Typography>
          <Slider
            value={customColor.lightness}
            onChange={(_, v) => setCustomColor({ ...customColor, lightness: v as number })}
            min={0}
            max={100}
            size="small"
          />
        </Box>
      </Box>

      {/* Material Customization */}
      <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Material
        </Typography>
        <Box sx={{ px: 1 }}>
          <Typography variant="caption">Roughness: {roughness.toFixed(2)}</Typography>
          <Slider
            value={roughness}
            onChange={(_, v) => setRoughness(v as number)}
            min={0}
            max={1}
            step={0.01}
            size="small"
          />
          <Typography variant="caption">Metalness: {metalness.toFixed(2)}</Typography>
          <Slider
            value={metalness}
            onChange={(_, v) => setMetalness(v as number)}
            min={0}
            max={1}
            step={0.01}
            size="small"
          />
        </Box>
      </Box>

      {/* Items Grid */}
      <Grid container spacing={2}>
        {currentItems.map((item) => (
          <Grid xs={12} sm={6} key={item.id}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {item.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
                {item.gender && (
                  <Typography variant="caption" color="text.secondary">
                    {item.gender}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddAccessory(item.id)}
                  disabled={!selectedActor}
                >
                  Add
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};
