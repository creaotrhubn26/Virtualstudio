import React from 'react';
import {
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Alert,
  LinearProgress,
  Typography,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { Resource } from './types';

interface ResourceEditorProps {
  resource: Resource | null;
  onChange: (resource: Resource) => void;
  onFileUpload?: (file: File) => Promise<void>;
  loading?: boolean;
  isNew?: boolean;
}

export const ResourceEditor: React.FC<ResourceEditorProps> = ({
  resource,
  onChange,
  onFileUpload,
  loading = false,
  isNew = false,
}) => {
  if (!resource) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      await onFileUpload(file);
    }
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        fullWidth
        label="Navn"
        value={resource.name}
        onChange={(e) => onChange({ ...resource, name: e.target.value })}
        required
      />
      <TextField
        fullWidth
        label="Beskrivelse"
        value={resource.description || ''}
        onChange={(e) => onChange({ ...resource, description: e.target.value })}
        multiline
        rows={2}
      />
      <FormControl fullWidth>
        <InputLabel>Type</InputLabel>
        <Select
          value={resource.type}
          onChange={(e) => {
            onChange({ ...resource, type: e.target.value as 'file' | 'link' | 'document' });
          }}
          label="Type"
        >
          <MenuItem value="file">Fil</MenuItem>
          <MenuItem value="link">Lenke</MenuItem>
          <MenuItem value="document">Dokument</MenuItem>
        </Select>
      </FormControl>
      {resource.type === 'file' && (
        <Box>
          <input
            accept="*/*"
            style={{ display: 'none' }}
            id="resource-file-upload"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="resource-file-upload">
            <Button variant="outlined" component="span" startIcon={<CloudUpload />} fullWidth sx={{ mb: 2 }}>
              Last opp fil
            </Button>
          </label>
          {loading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Laster opp fil...
              </Typography>
            </Box>
          )}
          {resource.url && !loading && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Fil lastet opp: {resource.name}
              {resource.size && (
                <Typography variant="caption" display="block">
                  Størrelse: {(resource.size / (1024 * 1024)).toFixed(2)} MB
                </Typography>
              )}
            </Alert>
          )}
        </Box>
      )}
      <TextField
        fullWidth
        label={resource.type === 'link' ? 'URL' : resource.type === 'file' ? 'Fil URL (eller last opp fil over)' : 'URL'}
        value={resource.url}
        onChange={(e) => onChange({ ...resource, url: e.target.value })}
      />
      <TextField
        fullWidth
        label="Kategori (valgfritt)"
        value={resource.category || ''}
        onChange={(e) => onChange({ ...resource, category: e.target.value })}
      />
    </Stack>
  );
};


