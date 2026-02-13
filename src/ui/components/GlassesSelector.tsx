import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { GlassesOptions } from '../../core/models/GlassesModel';

interface GlassesSelectorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  options: Partial<GlassesOptions>;
  onOptionsChange: (options: Partial<GlassesOptions>) => void;
}

export const GlassesSelector: React.FC<GlassesSelectorProps> = ({
  enabled,
  onEnabledChange,
  options,
  onOptionsChange,
}) => {
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            color="primary"
          />
        }
        label="Aktiver Briller"
      />

      {enabled && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Innfatningsstil</InputLabel>
            <Select
              value={options.frameStyle || 'rectangular'}
              label="Innfatningsstil"
              onChange={(e) =>
                onOptionsChange({ ...options, frameStyle: e.target.value as GlassesOptions['frameStyle'] })
              }
              MenuProps={{ sx: { zIndex: 1400 } }}
            >
              <MenuItem value="rectangular">Rektangulær</MenuItem>
              <MenuItem value="round">Rund</MenuItem>
              <MenuItem value="aviator">Aviator</MenuItem>
              <MenuItem value="cat-eye">Cat-Eye</MenuItem>
              <MenuItem value="rimless">Kantløs</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Linsetype</InputLabel>
            <Select
              value={options.lensType || 'clear'}
              label="Linsetype"
              onChange={(e) =>
                onOptionsChange({ ...options, lensType: e.target.value as GlassesOptions['lensType'] })
              }
              MenuProps={{ sx: { zIndex: 1400 } }}
            >
              <MenuItem value="clear">Klar</MenuItem>
              <MenuItem value="tinted">Tonet</MenuItem>
              <MenuItem value="mirror">Speil</MenuItem>
              <MenuItem value="gradient">Gradient</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Materiale</InputLabel>
            <Select
              value={options.frameMaterial || 'plastic'}
              label="Materiale"
              onChange={(e) =>
                onOptionsChange({ ...options, frameMaterial: e.target.value as GlassesOptions['frameMaterial'] })
              }
              MenuProps={{ sx: { zIndex: 1400 } }}
            >
              <MenuItem value="plastic">Plast</MenuItem>
              <MenuItem value="metal">Metall</MenuItem>
              <MenuItem value="titanium">Titan</MenuItem>
              <MenuItem value="acetate">Acetat</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            type="color"
            label="Innfatningsfarge"
            value={options.frameColor || '#1a1a1a'}
            onChange={(e) => onOptionsChange({ ...options, frameColor: e.target.value })}
            sx={{ mb: 2 }}
          />
        </Box>
      )}
    </Box>
  );
};
