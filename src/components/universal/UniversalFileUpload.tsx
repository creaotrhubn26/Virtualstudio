import { useCallback, useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  FolderOpen,
  CheckCircle,
} from '@mui/icons-material';

interface UniversalFileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onUploadComplete?: () => void;
  maxFiles?: number;
  allowedTypes?: 'all' | ('image' | 'video' | 'audio' | 'document')[];
  showFormatInfo?: boolean;
  enableGoogleDriveSync?: boolean;
  profession?: string;
  showStorageInfo?: boolean;
}

const ACCEPT_MAP: Record<string, string> = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  document: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt',
};

const resolveAccept = (allowedTypes?: UniversalFileUploadProps['allowedTypes']) => {
  if (!allowedTypes || allowedTypes === 'all') return undefined;
  return allowedTypes.map((t) => ACCEPT_MAP[t]).join(',');
};

export function UniversalFileUpload({
  onFilesSelected,
  onUploadComplete,
  maxFiles = 10,
  allowedTypes = 'all',
  showFormatInfo = false,
  enableGoogleDriveSync = false,
  profession,
  showStorageInfo = false,
}: UniversalFileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, maxFiles);
    onFilesSelected(files);
    onUploadComplete?.();
  }, [maxFiles, onFilesSelected, onUploadComplete]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  return (
    <Box
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      sx={{
        border: '2px dashed',
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        transition: 'all 0.2s ease',
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <CloudUpload color={isDragging ? 'primary' : 'action'} sx={{ fontSize: 40 }} />
        <Typography variant="subtitle1" fontWeight={600}>
          Drag and drop files here
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or choose files from your device
        </Typography>
        <Button
          variant="contained"
          startIcon={<FolderOpen />}
          onClick={() => inputRef.current?.click()}
        >
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={resolveAccept(allowedTypes)}
          multiple={maxFiles > 1}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.currentTarget.value = '';
          }}
          style={{ display: 'none' }}
        />

        {(showFormatInfo || showStorageInfo || enableGoogleDriveSync) && (
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
            {showFormatInfo && (
              <Chip label="Supported formats" size="small" variant="outlined" />
            )}
            {showStorageInfo && (
              <Chip label="Local storage" size="small" variant="outlined" />
            )}
            {enableGoogleDriveSync && (
              <Chip icon={<CheckCircle />} label="Drive sync ready" size="small" variant="outlined" />
            )}
            {profession && (
              <Chip label={profession.replace(/_/g, ' ')} size="small" variant="outlined" />
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export default UniversalFileUpload;
