/**
 * Avatar Generator Panel
 * 
 * Upload an image to generate a 3D avatar using Meta SAM 3D Body.
 * The generated GLB mesh can be loaded directly into the Babylon.js scene.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  LinearProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Person,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface AvatarGeneratorPanelProps {
  open: boolean;
  onClose: () => void;
  onAvatarGenerated: (glbUrl: string, metadata: any) => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export const AvatarGeneratorPanel: React.FC<AvatarGeneratorPanelProps> = ({
  open,
  onClose,
  onAvatarGenerated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Vennligst velg en bildefil');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('idle');
      setErrorMessage(null);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('idle');
      setErrorMessage(null);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setStatus('uploading');
    setProgress(10);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setStatus('processing');
      setProgress(30);

      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Generering feilet');
      }

      const result = await response.json();
      setProgress(100);
      setStatus('success');
      setGeneratedMetadata(result.metadata);

      onAvatarGenerated(result.glb_url, result.metadata);

    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'En feil oppstod under generering');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setGeneratedMetadata(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ color: '#00d4ff' }} />
            <Typography variant="h6">Avatar Generator</Typography>
            <Chip label="SAM 3D" size="small" color="primary" variant="outlined" />
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info" icon={<Person />}>
            <Typography variant="body2">
              Last opp et bilde av en person for å generere en 3D-avatar.
              Avataren kan brukes som modell i lysoppsettet ditt.
            </Typography>
          </Alert>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          <Box
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              border: '2px dashed',
              borderColor: previewUrl ? '#00d4ff' : 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: 'rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                borderColor: '#00d4ff',
                bgcolor: 'rgba(0,212,255,0.05)',
              },
            }}
          >
            {previewUrl ? (
              <Box sx={{ position: 'relative', width: '100%', maxHeight: 300 }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 280,
                    objectFit: 'contain',
                    borderRadius: 8,
                  }}
                />
              </Box>
            ) : (
              <>
                <CloudUpload sx={{ fontSize: 48, color: 'rgba(255,255,255,0.4)', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Klikk eller dra et bilde hit
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                  JPG, PNG, WebP (maks 10MB)
                </Typography>
              </>
            )}
          </Box>

          {status !== 'idle' && status !== 'error' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {status === 'uploading' && 'Laster opp bilde...'}
                  {status === 'processing' && 'Genererer 3D-avatar...'}
                  {status === 'success' && 'Avatar generert!'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(0,0,0,0.3)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: status === 'success' ? '#4caf50' : '#00d4ff',
                  },
                }}
              />
            </Box>
          )}

          {status === 'success' && generatedMetadata && (
            <Alert severity="success" icon={<CheckCircle />}>
              <Typography variant="body2">
                Avatar generert! {generatedMetadata.type === 'placeholder' 
                  ? 'Placeholder-mannequin opprettet.' 
                  : `${generatedMetadata.vertices} vertices, ${generatedMetadata.faces} faces.`}
              </Typography>
              {generatedMetadata.note && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                  {generatedMetadata.note}
                </Typography>
              )}
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" icon={<ErrorIcon />}>
              <Typography variant="body2">{errorMessage}</Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {status === 'success' ? (
          <>
            <Button onClick={handleReset} color="inherit">
              Ny Avatar
            </Button>
            <Button onClick={onClose} variant="contained" color="primary">
              Lukk
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">
              Avbryt
            </Button>
            <Button
              onClick={handleGenerate}
              variant="contained"
              color="primary"
              disabled={!selectedFile || status === 'uploading' || status === 'processing'}
              startIcon={<Person />}
            >
              Generer Avatar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AvatarGeneratorPanel;
