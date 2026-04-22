/**
 * Shared primitives for split App modules in src/apps/.
 *
 * Each app file owns its own lazy import of its underlying panel component
 * and its own Suspense boundary; this module just holds the loading fallback
 * and anything else genuinely shared across apps.
 */
import React from 'react';
import { Box, CircularProgress } from '@mui/material';

export const PanelLoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      minHeight: 200,
      color: '#00d4ff',
      bgcolor: 'rgba(0, 0, 0, 0.3)',
    }}
  >
    <CircularProgress size={40} color="inherit" />
  </Box>
);
