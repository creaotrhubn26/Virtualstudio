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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Person,
  CheckCircle,
  Error as ErrorIcon,
  Save,
} from '@mui/icons-material';

interface AvatarGeneratorPanelProps {
  open: boolean;
  onClose: () => void;
  onAvatarGenerated: (glbUrl: string, metadata: any) => void;
}

type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const AVATAR_CATEGORIES = [
  { id: 'voksen', label: 'Voksen' },
  { id: 'ungdom', label: 'Ungdom' },
  { id: 'barn', label: 'Barn' },
  { id: 'eldre', label: 'Eldre' },
  { id: 'atlet', label: 'Atlet' },
  { id: 'modell', label: 'Modell' },
  { id: 'annet', label: 'Annet' },
];

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
  const [avatarName, setAvatarName] = useState<string>('');
  const [avatarCategory, setAvatarCategory] = useState<string>('voksen');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [faceAnalysis, setFaceAnalysis] = useState<{
    gender?: string;
    gender_confidence?: number;
    age_range?: string;
    age_confidence?: number;
    category?: string;
  } | null>(null);
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
    setFaceAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      setStatus('processing');
      setProgress(30);

      const response = await fetch('/api/generate-avatar-with-analysis', {
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
      setGeneratedUrl(result.glb_url);

      if (result.face_analysis) {
        setFaceAnalysis(result.face_analysis);
        if (result.face_analysis.category) {
          setAvatarCategory(result.face_analysis.category);
        }
        const genderLabel = result.face_analysis.gender === 'Mann' ? 'Mann' : 'Kvinne';
        const categoryLabel = result.face_analysis.category === 'barn' ? 'Barn' : 
                             result.face_analysis.category === 'ungdom' ? 'Ungdom' : 'Voksen';
        if (!avatarName) {
          setAvatarName(`${genderLabel} (${categoryLabel})`);
        }
      } else if (!avatarName) {
        setAvatarName(`Avatar ${new Date().toLocaleDateString('nb-NO')}`);
      }

    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'En feil oppstod under generering');
    }
  };

  const handleAddToScene = () => {
    if (generatedUrl) {
      onAvatarGenerated(generatedUrl, {
        ...generatedMetadata,
        name: avatarName,
        category: avatarCategory,
      });
      onClose();
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    setGeneratedMetadata(null);
    setGeneratedUrl(null);
    setAvatarName('');
    setFaceAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ color: '#00d4ff', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Avatar Generator</Typography>
            <Chip label="SAM 3D" size="small" color="primary" variant="outlined" />
          </Box>
          <IconButton 
            onClick={onClose} 
            sx={{ 
              minWidth: 48, 
              minHeight: 48,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
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

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
              Tidligere genererte avatarer:
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                onAvatarGenerated('/api/avatar/fda04469-af36-46ec-a5c1-7ae7257ca77d.glb', { name: 'Mimi', category: 'voksen' });
                onClose();
              }}
              sx={{ minHeight: 40 }}
            >
              Last Mimi
            </Button>
          </Box>

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
            <>
              <Alert severity="success" icon={<CheckCircle />}>
                <Typography variant="body2">
                  Avatar generert! {generatedMetadata.type === 'placeholder' 
                    ? 'Placeholder-mannequin opprettet.' 
                    : `${generatedMetadata.vertices} vertices, ${generatedMetadata.faces} faces.`}
                </Typography>
              </Alert>

              {faceAnalysis && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(0,212,255,0.1)', 
                  borderRadius: 2, 
                  border: '1px solid rgba(0,212,255,0.3)' 
                }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#00d4ff' }}>
                    Automatisk gjenkjenning
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`Kjønn: ${faceAnalysis.gender}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ minHeight: 32 }}
                    />
                    <Chip 
                      label={`Alder: ${faceAnalysis.age_range} år`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ minHeight: 32 }}
                    />
                    <Chip 
                      label={`Kategori: ${faceAnalysis.category === 'barn' ? 'Barn' : 
                             faceAnalysis.category === 'ungdom' ? 'Ungdom' : 'Voksen'}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ minHeight: 32 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Konfidens: kjønn {Math.round((faceAnalysis.gender_confidence || 0) * 100)}%, 
                    alder {Math.round((faceAnalysis.age_confidence || 0) * 100)}%
                  </Typography>
                </Box>
              )}
              
              <TextField
                fullWidth
                label="Navn på avatar"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder="F.eks. Kunde A, Modell 1"
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    bgcolor: 'rgba(0,0,0,0.2)',
                    minHeight: 48,
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '1rem',
                    py: 1.5,
                  }
                }}
              />
              
              <FormControl fullWidth>
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={avatarCategory}
                  label="Kategori"
                  onChange={(e) => setAvatarCategory(e.target.value)}
                  sx={{ 
                    bgcolor: 'rgba(0,0,0,0.2)',
                    minHeight: 48,
                    '& .MuiSelect-select': {
                      py: 1.5,
                    }
                  }}
                >
                  {AVATAR_CATEGORIES.map((cat) => (
                    <MenuItem 
                      key={cat.id} 
                      value={cat.id}
                      sx={{ minHeight: 44, fontSize: '1rem' }}
                    >
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {errorMessage && (
            <Alert severity="error" icon={<ErrorIcon />}>
              <Typography variant="body2">{errorMessage}</Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1.5 }}>
        {status === 'success' ? (
          <>
            <Button 
              onClick={handleReset} 
              color="inherit"
              sx={{ 
                minHeight: 48, 
                px: 3,
                fontSize: '0.95rem'
              }}
            >
              Ny Avatar
            </Button>
            <Button
              onClick={handleAddToScene}
              variant="contained"
              color="primary"
              startIcon={<Save />}
              disabled={!avatarName.trim()}
              sx={{ 
                minHeight: 48, 
                px: 3,
                fontSize: '0.95rem'
              }}
            >
              Legg til i scene
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={onClose} 
              color="inherit"
              sx={{ 
                minHeight: 48, 
                px: 3,
                fontSize: '0.95rem'
              }}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleGenerate}
              variant="contained"
              color="primary"
              disabled={!selectedFile || status === 'uploading' || status === 'processing'}
              startIcon={<Person />}
              sx={{ 
                minHeight: 48, 
                px: 3,
                fontSize: '0.95rem'
              }}
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
