import { useState, useRef, type FC, type ChangeEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Typography,
  Alert,
  Stack,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  VideoLibrary as VideoLibraryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface MediaUploadProps {
  candidateId: string;
  candidateName: string;
  onUploadComplete?: (mediaUrl: string, type: 'photo' | 'reference') => void;
  onError?: (error: string) => void;
}

export const CandidateMediaUpload: FC<MediaUploadProps> = ({
  candidateId,
  candidateName,
  onUploadComplete,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'reference'>('photo');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime'];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];

    if (!allValidTypes.includes(file.type)) {
      setErrorMessage('Kun bilder (JPEG, PNG, WebP) og video (MP4, MOV) er tillatt');
      onError?.(errorMessage);
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Filstørrelsen må være mindre enn 50 MB');
      onError?.(errorMessage);
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('candidateId', candidateId);
      formData.append('type', mediaType);

      // Simulate upload progress (in production, use XMLHttpRequest for real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 30;
        });
      }, 200);

      // Upload file
      const response = await fetch('/api/casting/media/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setUploadProgress(100);
      setUploadStatus('success');

      // Call callback with media URL
      onUploadComplete?.(result.mediaUrl || result.url, mediaType);

      // Close dialog after success
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'Opplastingen mislyktes';
      setErrorMessage(message);
      setUploadStatus('error');
      onError?.(message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setMediaType('photo');
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Upload Button */}
      <Tooltip title={`Last opp bilde eller video for ${candidateName}`}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudUploadIcon />}
          onClick={() => setIsOpen(true)}
          sx={{
            color: '#9c27b0',
            borderColor: 'rgba(156, 39, 176, 0.5)',
            '&:hover': {
              bgcolor: 'rgba(156, 39, 176, 0.1)',
              borderColor: '#9c27b0',
            },
          }}
        >
          Last opp media
        </Button>
      </Tooltip>

      {/* Upload Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => !isUploading && setIsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Last opp media for {candidateName}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Media Type Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={mediaType === 'photo' ? 'contained' : 'outlined'}
                startIcon={<ImageIcon />}
                onClick={() => {
                  setMediaType('photo');
                  fileInputRef.current?.click();
                }}
                sx={{
                  bgcolor: mediaType === 'photo' ? '#9c27b0' : 'transparent',
                  borderColor: mediaType === 'photo' ? '#9c27b0' : 'rgba(156, 39, 176, 0.5)',
                  color: mediaType === 'photo' ? '#fff' : '#9c27b0',
                }}
              >
                Profilbilde
              </Button>

              <Button
                variant={mediaType === 'reference' ? 'contained' : 'outlined'}
                startIcon={<VideoLibraryIcon />}
                onClick={() => {
                  setMediaType('reference');
                  fileInputRef.current?.click();
                }}
                sx={{
                  bgcolor: mediaType === 'reference' ? '#9c27b0' : 'transparent',
                  borderColor: mediaType === 'reference' ? '#9c27b0' : 'rgba(156, 39, 176, 0.5)',
                  color: mediaType === 'reference' ? '#fff' : '#9c27b0',
                }}
              >
                Referansemateriale
              </Button>
            </Box>

            {/* Selected File Info */}
            {selectedFile && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.05)' }}>
                <Stack spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Valgt fil:
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Type: {mediaType === 'photo' ? 'Profilbilde' : 'Referansemateriale'}
                  </Typography>
                </Stack>
              </Paper>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">
                    Laster opp...
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {Math.round(uploadProgress)}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}

            {/* Status Messages */}
            {uploadStatus === 'success' && (
              <Alert
                severity="success"
                icon={<CheckCircleIcon />}
                sx={{ bgcolor: 'rgba(52, 211, 153, 0.1)' }}
              >
                Opplastingen var vellykket!
              </Alert>
            )}

            {uploadStatus === 'error' && (
              <Alert
                severity="error"
                icon={<ErrorIcon />}
                sx={{ bgcolor: 'rgba(244, 63, 94, 0.1)' }}
              >
                {errorMessage || 'Opplastingen mislyktes'}
              </Alert>
            )}

            {/* Info Text */}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Tillatte formater: JPEG, PNG, WebP (bilder) og MP4, MOV (video).
              Maksimal filstørrelse: 50 MB.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setIsOpen(false);
              resetForm();
            }}
            disabled={isUploading}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            variant="contained"
            sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
          >
            {isUploading ? 'Laster opp...' : 'Last opp'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CandidateMediaUpload;
