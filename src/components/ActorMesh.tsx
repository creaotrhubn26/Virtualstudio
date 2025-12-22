/**
 * Actor Mesh Panel (Babylon.js version)
 * 
 * React component for managing actor properties.
 * Uses Zustand store to propagate changes to Babylon.js scene.
 */

import React, { useCallback, useEffect } from 'react';
import { Box, Typography, Slider } from '@mui/material';
import { useAppStore } from '../state/store';

const SKIN_TONES = ['#FFDAB9', '#F0C19F', '#D4A574', '#8D5524', '#4A2C2A'];

interface ActorMeshPanelProps {
  actorId?: string;
}

export function ActorMeshPanel({ actorId }: ActorMeshPanelProps) {
  const { actorParams, setActorParams } = useAppStore();

  const handleHeightChange = useCallback((_: Event, value: number | number[]) => {
    const newHeight = value as number;
    setActorParams({ height: newHeight });
  }, [setActorParams]);

  const handleWeightChange = useCallback((_: Event, value: number | number[]) => {
    const newWeight = value as number;
    setActorParams({ weight: newWeight });
  }, [setActorParams]);

  const handleSkinToneChange = useCallback((color: string) => {
    setActorParams({ skinTone: color });
  }, [setActorParams]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ch-actor-params-changed', {
      detail: { actorParams }
    }));
  }, [actorParams]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Aktor Egenskaper
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Hoyde: {(1.5 + actorParams.height * 0.4).toFixed(2)}m
        </Typography>
        <Slider
          value={actorParams.height}
          onChange={handleHeightChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Vekt: {Math.round(50 + actorParams.weight * 50)}kg
        </Typography>
        <Slider
          value={actorParams.weight}
          onChange={handleWeightChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Hudtone
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {SKIN_TONES.map((color) => (
            <Box
              key={color}
              onClick={() => handleSkinToneChange(color)}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: color,
                cursor: 'pointer',
                border: actorParams.skinTone === color ? '3px solid #3b82f6' : '2px solid #333',
                '&:hover': { transform: 'scale(1.1)' },
                transition: 'transform 0.1s',
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default ActorMeshPanel;
