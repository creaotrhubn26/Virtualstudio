import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
} from '@mui/material';
import { Download, Visibility } from '@mui/icons-material';
import { lightDiagramGenerator, DiagramLight } from '../core/services/lightDiagramGenerator';

interface LightDiagramPanelProps {
  lights: DiagramLight[];
  onExport?: (format: 'svg' | 'png' | 'pdf') => void;
}

export const LightDiagramPanel: React.FC<LightDiagramPanelProps> = ({
  lights,
  onExport,
}) => {
  const [exportFormat, setExportFormat] = useState<'svg' | 'png' | 'pdf'>('png');
  const [preview, setPreview] = useState<string | null>(null);

  const defaultSubject = { position: [0, 0, 0] as [number, number, number], label: 'Motiv' };
  const defaultCamera = { position: [0, 1.5, 3] as [number, number, number], focalLength: 50 };

  const handleGeneratePreview = () => {
    const diagram = lightDiagramGenerator.generate(lights, defaultSubject, defaultCamera);
    const svg = lightDiagramGenerator.toSVG(diagram);
    setPreview(svg);
  };

  const handleExport = async () => {
    try {
      const diagram = lightDiagramGenerator.generate(lights, defaultSubject, defaultCamera);
      let blob: Blob;

      if (exportFormat === 'svg') {
        const svg = lightDiagramGenerator.toSVG(diagram);
        blob = new Blob([svg], { type: 'image/svg+xml' });
      } else {
        blob = await lightDiagramGenerator.export(diagram, exportFormat);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lysdiagram.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(exportFormat);
      }
    } catch (error) {
      console.warn('Export failed:', error);
    }
  };

  return (
    <Box sx={{ p: 2, bgcolor: '#1a1a1a', color: '#ffffff', minHeight: '100%' }}>
      <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
        Lysdiagram
      </Typography>

      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#aaaaaa' }}>Eksportformat</InputLabel>
          <Select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'svg' | 'png' | 'pdf')}
            MenuProps={{ sx: { zIndex: 1400 } }}
            sx={{
              color: '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
            }}
          >
            <MenuItem value="svg">SVG</MenuItem>
            <MenuItem value="png">PNG</MenuItem>
            <MenuItem value="pdf">PDF</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={handleGeneratePreview}
            sx={{ color: '#ffffff', borderColor: '#444', '&:hover': { borderColor: '#666' } }}
          >
            Forhåndsvis
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{ bgcolor: '#4a9eff', color: '#ffffff', '&:hover': { bgcolor: '#3a8eef' } }}
          >
            Eksporter
          </Button>
        </Box>
      </Box>

      {preview && (
        <Paper sx={{ p: 2, bgcolor: '#2a2a2a', mt: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#aaaaaa', mb: 1 }}>
            Forhåndsvisning
          </Typography>
          <Box
            dangerouslySetInnerHTML={{ __html: preview }}
            sx={{ maxWidth: '100%', overflow: 'auto' }}
          />
        </Paper>
      )}
    </Box>
  );
};
