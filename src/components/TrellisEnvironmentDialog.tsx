import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import LanguageIcon from '@mui/icons-material/Language';

interface TrellisModel {
  filename: string;
  url: string;
  size_kb: number;
}

interface TrellisEnvironmentDialogProps {
  open: boolean;
  onClose: () => void;
  onUseEnvironment: (glbPath: string) => void;
}

type JobStatus = 'idle' | 'uploading' | 'processing' | 'succeeded' | 'failed';

export const TrellisEnvironmentDialog: React.FC<TrellisEnvironmentDialogProps> = ({
  open,
  onClose,
  onUseEnvironment,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [replicateLogs, setReplicateLogs] = useState('');
  const [savedModels, setSavedModels] = useState<TrellisModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      loadSavedModels();
    }
    return () => stopPolling();
  }, [open]);

  const loadSavedModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch('/api/trellis/models');
      if (res.ok) {
        const data = await res.json();
        setSavedModels(data.models || []);
      }
    } catch {
      console.warn('[TRELLIS] Could not load saved models');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Velg et bilde (JPEG, PNG eller WebP).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('Bildet er for stort — maks 25 MB.');
      return;
    }
    setSelectedFile(file);
    setErrorMessage('');
    setStatus('idle');
    setResultPath(null);
    setReplicateLogs('');
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const startGeneration = async () => {
    if (!selectedFile) return;
    stopPolling();
    setStatus('uploading');
    setProgress(10);
    setStatusMessage('Laster opp bilde…');
    setErrorMessage('');
    setResultPath(null);
    setReplicateLogs('');

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('texture_size', '1024');
    formData.append('mesh_simplify', '0.95');
    formData.append('ss_steps', '20');
    formData.append('slat_steps', '20');

    try {
      const res = await fetch('/api/trellis/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus('failed');
        setErrorMessage(data.error || `HTTP ${res.status}`);
        return;
      }

      setJobId(data.job_id);
      setStatus('processing');
      setProgress(20);
      setStatusMessage('TRELLIS behandler bildet… (ca. 2–5 min)');
      startPolling(data.job_id);
    } catch (err) {
      setStatus('failed');
      setErrorMessage(String(err));
    }
  };

  const startPolling = (jid: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/trellis/status/${jid}`);
        const data = await res.json();
        if (data.logs) setReplicateLogs(data.logs);

        if (data.status === 'processing') {
          setProgress(prev => Math.min(prev + 3, 88));
          setStatusMessage('TRELLIS genererer 3D-miljø… dette tar 2–5 minutter');
        } else if (data.status === 'succeeded') {
          stopPolling();
          setProgress(90);
          setStatusMessage('Laster ned GLB…');
          await downloadModel(jid);
        } else if (data.status === 'failed') {
          stopPolling();
          setStatus('failed');
          setErrorMessage(data.error || 'Generering feilet på Replicate');
        }
      } catch {
        console.warn('[TRELLIS] Poll error');
      }
    }, 5000);
  };

  const downloadModel = async (jid: string) => {
    try {
      const res = await fetch(`/api/trellis/download/${jid}`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.path) {
        setStatus('succeeded');
        setProgress(100);
        setResultPath(data.path);
        setStatusMessage('3D-miljø er klart!');
        loadSavedModels();
      } else {
        setStatus('failed');
        setErrorMessage(data.error || 'Nedlasting av GLB feilet');
      }
    } catch (err) {
      setStatus('failed');
      setErrorMessage(String(err));
    }
  };

  const handleUseEnvironment = (path: string) => {
    onUseEnvironment(path);
    onClose();
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const resetState = () => {
    stopPolling();
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setJobId(null);
    setProgress(0);
    setStatusMessage('');
    setErrorMessage('');
    setResultPath(null);
    setReplicateLogs('');
  };

  const isRunning = status === 'uploading' || status === 'processing';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(145deg, #0d0d12 0%, #141420 100%)',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '16px',
          color: '#e8e8f0',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <ViewInArIcon sx={{ color: '#818cf8' }} />
        <Typography sx={{ color: '#c7d2fe', fontWeight: 700, fontSize: 17 }}>
          Bilde → 3D Miljø
        </Typography>
        <Chip
          label="TRELLIS · Replicate"
          size="small"
          icon={<LanguageIcon sx={{ fontSize: 13 }} />}
          sx={{
            ml: 1,
            bgcolor: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc',
            fontSize: 11,
          }}
        />
        <IconButton onClick={handleClose} sx={{ ml: 'auto', color: '#666' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography sx={{ color: '#888', fontSize: 13, mb: 2, lineHeight: 1.6 }}>
          Last opp et bilde av restauranten din og konverter det automatisk til et 3D-miljø (GLB-fil) ved hjelp av TRELLIS — en av de kraftigste bilde-til-3D-modellene. Tar ca. 2–5 minutter.
        </Typography>

        {/* Drop zone */}
        <Box
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isRunning && fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${dragOver ? '#818cf8' : previewUrl ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.25)'}`,
            borderRadius: '12px',
            p: 2,
            cursor: isRunning ? 'default' : 'pointer',
            display: 'flex',
            flexDirection: previewUrl ? 'row' : 'column',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            background: dragOver ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.03)',
            transition: 'all 0.2s',
            '&:hover': isRunning ? {} : { borderColor: '#818cf8', background: 'rgba(99,102,241,0.08)' },
          }}
        >
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} />
          {previewUrl ? (
            <>
              <Box
                component="img"
                src={previewUrl}
                alt="Preview"
                sx={{ width: 140, height: 100, objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: '#c7d2fe', fontWeight: 600, fontSize: 14 }}>
                  {selectedFile?.name}
                </Typography>
                <Typography sx={{ color: '#666', fontSize: 12 }}>
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                </Typography>
                {!isRunning && (
                  <Button
                    size="small"
                    onClick={e => { e.stopPropagation(); resetState(); }}
                    sx={{ mt: 0.5, color: '#888', fontSize: 11 }}
                  >
                    Bytt bilde
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <>
              <ImageIcon sx={{ fontSize: 40, color: 'rgba(99,102,241,0.4)' }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ color: '#a5b4fc', fontWeight: 600, mb: 0.5 }}>
                  Dra et restaurantbilde hit
                </Typography>
                <Typography sx={{ color: '#555', fontSize: 13 }}>
                  eller klikk for å velge fil · JPEG, PNG, WebP · maks 25 MB
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Error message */}
        {errorMessage && (
          <Alert
            severity="error"
            icon={<ErrorOutlineIcon />}
            sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Progress bar */}
        {(isRunning || status === 'succeeded') && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
              {isRunning && <CircularProgress size={14} sx={{ color: '#818cf8' }} />}
              {status === 'succeeded' && <CheckCircleIcon sx={{ color: '#4ade80', fontSize: 18 }} />}
              <Typography sx={{ color: status === 'succeeded' ? '#4ade80' : '#a5b4fc', fontSize: 13 }}>
                {statusMessage}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(99,102,241,0.15)',
                '& .MuiLinearProgress-bar': {
                  background: status === 'succeeded'
                    ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                    : 'linear-gradient(90deg, #818cf8, #6366f1)',
                },
              }}
            />
            {replicateLogs && (
              <Typography
                component="pre"
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: 'rgba(0,0,0,0.4)',
                  borderRadius: '6px',
                  fontSize: 10,
                  color: '#6b7280',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 80,
                }}
              >
                {replicateLogs}
              </Typography>
            )}
          </Box>
        )}

        {/* Result: Use as Environment button */}
        {status === 'succeeded' && resultPath && (
          <Button
            variant="contained"
            fullWidth
            startIcon={<ViewInArIcon />}
            onClick={() => handleUseEnvironment(resultPath)}
            sx={{
              mb: 2,
              py: 1.2,
              background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: '10px',
              '&:hover': { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' },
            }}
          >
            Bruk som miljø i scenen
          </Button>
        )}

        {/* Generate button */}
        {status !== 'succeeded' && (
          <Button
            variant="contained"
            fullWidth
            disabled={!selectedFile || isRunning}
            startIcon={isRunning ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <CloudUploadIcon />}
            onClick={startGeneration}
            sx={{
              mb: 3,
              py: 1.2,
              background: selectedFile && !isRunning
                ? 'linear-gradient(90deg, #4f46e5, #6366f1)'
                : 'rgba(99,102,241,0.2)',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: '10px',
              '&:hover': { background: 'linear-gradient(90deg, #6366f1, #818cf8)' },
              '&.Mui-disabled': { color: '#444' },
            }}
          >
            {isRunning ? 'Genererer… (2–5 min)' : 'Generer 3D-miljø'}
          </Button>
        )}

        {/* Previously generated models */}
        <Divider sx={{ borderColor: 'rgba(99,102,241,0.15)', mb: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ color: '#a5b4fc', fontWeight: 600, fontSize: 14 }}>
            Tidligere genererte miljøer
          </Typography>
          <IconButton size="small" onClick={loadSavedModels} sx={{ color: '#555' }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        {loadingModels ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} sx={{ color: '#818cf8' }} />
          </Box>
        ) : savedModels.length === 0 ? (
          <Typography sx={{ color: '#444', fontSize: 13, textAlign: 'center', py: 1 }}>
            Ingen lagrede miljøer ennå
          </Typography>
        ) : (
          <List dense disablePadding>
            {savedModels.map((m, i) => (
              <ListItem
                key={m.filename}
                sx={{
                  borderRadius: '8px',
                  mb: 0.5,
                  bgcolor: 'rgba(99,102,241,0.05)',
                  border: '1px solid rgba(99,102,241,0.12)',
                }}
              >
                <ViewInArIcon sx={{ color: '#818cf8', mr: 1.5, fontSize: 20 }} />
                <ListItemText
                  primary={
                    <Typography sx={{ color: '#c7d2fe', fontSize: 13, fontWeight: 500 }}>
                      {m.filename.replace(/^trellis_/, '').replace(/_[a-f0-9]{8}\.glb$/, '.glb')}
                    </Typography>
                  }
                  secondary={
                    <Typography sx={{ color: '#555', fontSize: 11 }}>
                      {m.size_kb >= 1024 ? `${(m.size_kb / 1024).toFixed(1)} MB` : `${m.size_kb} KB`}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Bruk som miljø">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleUseEnvironment(m.url)}
                      sx={{
                        borderColor: 'rgba(99,102,241,0.4)',
                        color: '#a5b4fc',
                        fontSize: 11,
                        py: 0.3,
                        '&:hover': { borderColor: '#818cf8', bgcolor: 'rgba(99,102,241,0.1)' },
                      }}
                    >
                      Bruk
                    </Button>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TrellisEnvironmentDialog;
