/**
 * Actor Mesh Panel (Babylon.js version)
 * 
 * React component for managing actor properties.
 * Actual mesh creation is handled by virtualActorService.
 */

import React, { useState, useCallback } from 'react';
import { Box, Typography, Slider } from '@mui/material';

interface ActorMeshPanelProps {
  actorId?: string;
  onParamsChange?: (params: { height: number; weight: number }) => void;
}

export function ActorMeshPanel({ actorId, onParamsChange }: ActorMeshPanelProps) {
  const [height, setHeight] = useState(0.5);
  const [weight, setWeight] = useState(0.5);

  const handleHeightChange = useCallback((_: Event, value: number | number[]) => {
    const newHeight = value as number;
    setHeight(newHeight);
    if (onParamsChange) {
      onParamsChange({ height: newHeight, weight });
    }
  }, [weight, onParamsChange]);

  const handleWeightChange = useCallback((_: Event, value: number | number[]) => {
    const newWeight = value as number;
    setWeight(newWeight);
    if (onParamsChange) {
      onParamsChange({ height, weight: newWeight });
    }
  }, [height, onParamsChange]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Aktor Egenskaper
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Hoyde: {(1.5 + height * 0.4).toFixed(2)}m
        </Typography>
        <Slider
          value={height}
          onChange={handleHeightChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Vekt: {Math.round(50 + weight * 50)}kg
        </Typography>
        <Slider
          value={weight}
          onChange={handleWeightChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
        />
      </Box>
    </Box>
  );
}

export default ActorMeshPanel;
