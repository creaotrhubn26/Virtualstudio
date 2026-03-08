/**
 * Prop Mesh Component (Babylon.js version)
 * 
 * React component for managing prop properties and state.
 * Actual mesh creation is handled by propRenderingService.
 */

import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { PROP_DEFINITIONS, PropDefinition } from '../core/data/propDefinitions';

interface PropMeshPanelProps {
  propId?: string;
  onPropChange?: (prop: PropDefinition) => void;
  onScaleChange?: (scale: number) => void;
}

export function PropMeshPanel({ propId, onPropChange, onScaleChange }: PropMeshPanelProps) {
  const [selectedProp, setSelectedProp] = React.useState<string>(propId || '');
  const [scale, setScale] = React.useState<number>(1.0);

  const handlePropSelect = useCallback((event: SelectChangeEvent<string>) => {
    const id = event.target.value;
    setSelectedProp(id);
    const prop = PROP_DEFINITIONS.find(p => p.id === id);
    if (prop && onPropChange) {
      onPropChange(prop);
    }
  }, [onPropChange]);

  const handleScaleChange = useCallback((_: Event, value: number | number[]) => {
    const newScale = value as number;
    setScale(newScale);
    if (onScaleChange) {
      onScaleChange(newScale);
    }
  }, [onScaleChange]);

  const categories = [...new Set(PROP_DEFINITIONS.map(p => p.category))];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Rekvisitt Innstillinger
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Velg Rekvisitt</InputLabel>
        <Select
          value={selectedProp}
          onChange={handlePropSelect}
          label="Velg Rekvisitt"
        >
          {categories.map(category => [
            <MenuItem key={`cat-${category}`} disabled sx={{ fontWeight: 'bold', opacity: 1 }}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </MenuItem>,
            ...PROP_DEFINITIONS
              .filter(p => p.category === category)
              .map(prop => (
                <MenuItem key={prop.id} value={prop.id} sx={{ pl: 3 }}>
                  {prop.name}
                </MenuItem>
              ))
          ])}
        </Select>
      </FormControl>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Skala: {scale.toFixed(2)}x
        </Typography>
        <Slider
          value={scale}
          onChange={handleScaleChange}
          min={0.1}
          max={3.0}
          step={0.1}
          size="small"
        />
      </Box>
    </Box>
  );
}

export default PropMeshPanel;
