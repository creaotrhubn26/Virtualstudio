import React from 'react';
import {
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { Module } from './types';

interface ModuleEditorProps {
  module: Module | null;
  onChange: (module: Module) => void;
  isNew?: boolean;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, onChange, isNew = false }) => {
  if (!module) return null;

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        fullWidth
        label="Tittel"
        value={module.title}
        onChange={(e) => onChange({ ...module, title: e.target.value })}
        required
      />
      <TextField
        fullWidth
        label="Beskrivelse"
        value={module.description}
        onChange={(e) => onChange({ ...module, description: e.target.value })}
        multiline
        rows={3}
      />
      <FormControlLabel
        control={
          <Switch
            checked={module.isLocked || false}
            onChange={(e) => onChange({ ...module, isLocked: e.target.checked })}
          />
        }
        label="Låst (krever fullføring av forrige modul)"
      />
      <FormControl fullWidth>
        <InputLabel>Fullførings krav</InputLabel>
        <Select
          value={module.completionRequirement || 'all'}
          onChange={(e) => {
            onChange({
              ...module,
              completionRequirement: e.target.value as 'all' | 'any' | number,
            });
          }}
          label="Fullførings krav"
        >
          <MenuItem value="all">Alle leksjoner må fullføres</MenuItem>
          <MenuItem value="any">Minst én leksjon må fullføres</MenuItem>
          <MenuItem value={1}>1 leksjon må fullføres</MenuItem>
          <MenuItem value={2}>2 leksjoner må fullføres</MenuItem>
          <MenuItem value={3}>3 leksjoner må fullføres</MenuItem>
          <MenuItem value={4}>4 leksjoner må fullføres</MenuItem>
          <MenuItem value={5}>5 leksjoner må fullføres</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="caption" color="text.secondary">
        Definerer hvor mange leksjoner som må fullføres før modulen anses som fullført
      </Typography>
    </Stack>
  );
};


