import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Movie as MovieIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import { PanelLoadingFallback } from './shared';
import { CinematographyPattern } from '../core/services/cinematographyPatternsService';

const CinematographyPatternsPanel = lazy(() =>
  import('../components/CinematographyPatternsPanel').then((m) => ({
    default: m.CinematographyPatternsPanel,
  })),
);

const CinematographyPatternsApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openCinematographyPatterns', handleOpen);
    return () => window.removeEventListener('openCinematographyPatterns', handleOpen);
  }, []);

  const handleApplyPattern = async (pattern: CinematographyPattern) => {
    setApplyingId(pattern.id);
    await new Promise((resolve) => setTimeout(resolve, 300));
    window.dispatchEvent(new CustomEvent('applyLightPattern', { detail: pattern }));
    setApplyingId(null);
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="md"
      fullWidth
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' } as any}
      PaperProps={{
        sx: {
          bgcolor: '#1c2128',
          borderRadius: 3,
          border: '2px solid rgba(255,170,0,0.3)',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MovieIcon sx={{ color: '#ffaa00', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#ffaa00', fontWeight: 600 }}>
              Hollywood Lysmønstre
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#999', display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <CameraIcon sx={{ fontSize: 14 }} />
              Profesjonelle lysmønstre fra film og fotografi
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={() => setIsOpen(false)} sx={{ color: '#999' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Suspense fallback={<PanelLoadingFallback />}>
          <CinematographyPatternsPanel onApplyPattern={handleApplyPattern} />
        </Suspense>
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          p: 2,
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: '#666', display: 'flex', alignItems: 'center', gap: 1 }}
        >
          {applyingId ? (
            <>
              <CircularProgress size={14} sx={{ color: '#ffaa00' }} /> Bruker mønster...
            </>
          ) : (
            'Klikk "Apply Pattern" for å bruke et lysmønster'
          )}
        </Typography>
        <Button
          onClick={() => setIsOpen(false)}
          variant="outlined"
          sx={{ borderColor: '#555', color: '#999' }}
        >
          Lukk
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CinematographyPatternsApp;
