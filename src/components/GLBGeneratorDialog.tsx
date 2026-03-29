import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Stack,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Paper,
} from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { glbGeneratorService, type SavedModel } from '../services/glbGeneratorService';

interface GLBGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called when a model is ready to be added to the scene */
  onGenerated: (modelUrl: string, modelName: string) => void;
}

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export const GLBGeneratorDialog: React.FC<GLBGeneratorDialogProps> = ({
  open,
  onClose,
  onGenerated,
}) => {
  const [tab, setTab] = useState<'generate' | 'library'>('generate');

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Options
  const [removeBackground, setRemoveBackground] = useState(true);
  const [foregroundRatio, setForegroundRatio] = useState(0.85);

  // Generation state
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');

  // Library
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // Abort controller for cancellation
  const abortRef = useRef<AbortController | null>(null);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const models = await glbGeneratorService.listModels();
    setSavedModels(models);
    setLibraryLoading(false);
  }, []);

  useEffect(() => {
    if (open && tab === 'library') {
      loadLibrary();
    }
  }, [open, tab, loadLibrary]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
    }
  }, [open]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a JPEG, PNG or WebP image.');
      return;
    }
    setImageFile(file);
    setError(null);
    setPhase('idle');
    setResultUrl(null);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleGenerate = async () => {
    if (!imageFile) return;
    setPhase('processing');
    setProgress(0);
    setError(null);
    setResultUrl(null);

    abortRef.current = new AbortController();

    const result = await glbGeneratorService.generateAndWait(
      imageFile,
      { removeBackground, foregroundRatio },
      (pct, msg) => {
        setProgress(pct);
        setStatusMessage(msg);
      },
      abortRef.current.signal,
    );

    if (result.success && result.path) {
      setPhase('done');
      setResultUrl(result.path);
      setResultName(result.filename?.replace('.glb', '') ?? 'generated_model');
      setProgress(100);
      setStatusMessage('Ferdig!');
    } else {
      setPhase('error');
      setError(result.error ?? 'Generation failed');
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setPhase('idle');
    setProgress(0);
    setStatusMessage('');
  };

  const handleAddToScene = (url: string, name: string) => {
    onGenerated(url, name);
    onClose();
  };

  const handleReset = () => {
    setPhase('idle');
    setProgress(0);
    setStatusMessage('');
    setError(null);
    setResultUrl(null);
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const isGenerating = phase === 'processing' || phase === 'uploading';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <ViewInArIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" component="span">
          Image → 3D GLB Generator
        </Typography>
        <Chip label="TripoSR" size="small" color="primary" variant="outlined" sx={{ ml: 'auto' }} />
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
      >
        <Tab value="generate" label="Generate" />
        <Tab value="library" label="Library" onClick={loadLibrary} />
      </Tabs>

      <DialogContent sx={{ pt: 2 }}>
        {/* ── GENERATE TAB ── */}
        {tab === 'generate' && (
          <Stack spacing={2}>
            {/* API token warning */}
            <Alert severity="info" variant="outlined" sx={{ fontSize: 12 }}>
              Requires <strong>REPLICATE_API_TOKEN</strong> set in project Secrets.
              Get a free token at{' '}
              <a href="https://replicate.com" target="_blank" rel="noreferrer">
                replicate.com
              </a>
              .
            </Alert>

            {/* Image drop zone */}
            <Paper
              variant="outlined"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !imageFile && fileInputRef.current?.click()}
              sx={{
                position: 'relative',
                border: isDragging ? '2px dashed' : '2px dashed',
                borderColor: isDragging ? 'primary.main' : 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: imageFile ? 'default' : 'pointer',
                bgcolor: isDragging ? 'action.hover' : 'background.paper',
                transition: 'border-color 0.2s, background-color 0.2s',
                minHeight: 180,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {imagePreviewUrl ? (
                <>
                  <Box
                    component="img"
                    src={imagePreviewUrl}
                    alt="preview"
                    sx={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                  />
                  {!isGenerating && (
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'background.paper' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: 'center', color: 'text.secondary', p: 3 }}>
                  <CloudUploadIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" fontWeight={500}>
                    Drop an image here, or click to browse
                  </Typography>
                  <Typography variant="caption">
                    JPEG · PNG · WebP — max 20 MB
                  </Typography>
                </Box>
              )}
            </Paper>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            {/* Options */}
            {!isGenerating && phase !== 'done' && (
              <Stack spacing={1.5}>
                <Divider>
                  <Typography variant="caption" color="text.secondary">
                    Options
                  </Typography>
                </Divider>
                <FormControlLabel
                  control={
                    <Switch
                      checked={removeBackground}
                      onChange={(e) => setRemoveBackground(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Remove background automatically
                    </Typography>
                  }
                />
                {removeBackground && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Subject scale: {Math.round(foregroundRatio * 100)}%
                    </Typography>
                    <Slider
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      value={foregroundRatio}
                      onChange={(_, v) => setForegroundRatio(v as number)}
                      size="small"
                    />
                  </Box>
                )}
              </Stack>
            )}

            {/* Progress */}
            {isGenerating && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {statusMessage}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {progress}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  TripoSR typically takes 60–120 seconds on Replicate.
                </Typography>
              </Box>
            )}

            {/* Success state */}
            {phase === 'done' && resultUrl && (
              <Paper variant="outlined" sx={{ p: 2, borderColor: 'success.main', borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    GLB generert!
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => handleAddToScene(resultUrl, resultName)}
                    fullWidth
                  >
                    Legg til i scene
                  </Button>
                  <Tooltip title="Last ned GLB">
                    <IconButton
                      component="a"
                      href={resultUrl}
                      download={`${resultName}.glb`}
                      size="small"
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            )}

            {/* Error */}
            {(phase === 'error' || error) && (
              <Alert severity="error" action={
                <Button size="small" color="inherit" onClick={handleReset}>
                  Prøv igjen
                </Button>
              }>
                {error}
              </Alert>
            )}
          </Stack>
        )}

        {/* ── LIBRARY TAB ── */}
        {tab === 'library' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Previously generated models
              </Typography>
              <IconButton size="small" onClick={loadLibrary} disabled={libraryLoading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
            {savedModels.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                <ImageIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2">No models yet. Generate one first.</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {savedModels.map((m) => (
                  <ListItem
                    key={m.url}
                    divider
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                          {m.filename}
                        </Typography>
                      }
                      secondary={`${m.size_kb} KB`}
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Add to scene">
                          <IconButton
                            size="small"
                            onClick={() => handleAddToScene(m.url, m.filename.replace('.glb', ''))}
                          >
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            component="a"
                            href={m.url}
                            download={m.filename}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {isGenerating ? (
          <Button onClick={handleCancel} color="error">
            Avbryt
          </Button>
        ) : (
          <Button onClick={handleClose}>Lukk</Button>
        )}
        {tab === 'generate' && !isGenerating && phase !== 'done' && (
          <Button
            variant="contained"
            startIcon={<ViewInArIcon />}
            onClick={handleGenerate}
            disabled={!imageFile}
          >
            Generer 3D-modell
          </Button>
        )}
        {tab === 'generate' && phase === 'done' && (
          <Button variant="outlined" onClick={handleReset}>
            Generer ny
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GLBGeneratorDialog;
