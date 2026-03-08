/**
 * Panel Preview Component
 * Displays a preview of how the panel will look
 */

import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { FormData as FormDataType } from './types';

interface PanelPreviewProps {
  formData: Partial<FormDataType>;
  isMobile: boolean;
  isTablet: boolean;
}

export const PanelPreview: React.FC<PanelPreviewProps> = React.memo(({ 
  formData, 
  isMobile, 
  isTablet 
}) => {
  return (
    <Box
      sx={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'transparent',
        minHeight: 300,
        maxHeight: 500,
        position: 'relative',
        // Simulate panel background
        background: 'linear-gradient(180deg, #1e1e24 0%, #1a1a1f 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '48px',
          background: 'linear-gradient(180deg, rgba(30,30,36,0.8) 0%, rgba(26,26,31,0.6) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1,
        },
      }}
    >
      {/* Simulated panel header */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          bgcolor: 'rgba(30,30,36,0.5)',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
            fontWeight: 600,
            color: '#fff',
          }}
        >
          {formData.title || 'Panel Forhåndsvisning'}
        </Typography>
      </Box>
      
      {/* Preview content area */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: 250,
          maxHeight: 450,
          overflow: 'auto',
          p: 2.5,
          // Apply custom-panel-content styles
          '& .custom-panel-content': {
            flex: 1,
            overflowY: 'auto',
            padding: 0,
            color: 'rgba(255, 255, 255, 0.9)',
            '& h1, & h2, & h3': {
              color: '#fff',
              marginTop: '24px',
              marginBottom: '16px',
              fontWeight: 600,
            },
            '& h1': {
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            },
            '& h2': {
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
            },
            '& h3': {
              fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
            },
            '& p': {
              marginBottom: '12px',
              lineHeight: 1.6,
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
            },
            '& ul, & ol': {
              marginLeft: '24px',
              marginBottom: '16px',
            },
            '& li': {
              marginBottom: '8px',
              lineHeight: 1.6,
            },
            '& code': {
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.9em',
            },
            '& pre': {
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '16px',
              borderRadius: '8px',
              overflowX: 'auto',
              marginBottom: '16px',
            },
            '& pre code': {
              background: 'none',
              padding: 0,
            },
            '& button': {
              background: '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              '&:hover': {
                background: '#00b8e6',
              },
            },
            '& input, & textarea': {
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              width: '100%',
              '&:focus': {
                outline: '2px solid #00d4ff',
                outlineOffset: '2px',
              },
            },
          },
        }}
      >
        {formData.content ? (
          <div 
            dangerouslySetInnerHTML={{ __html: formData.content }}
            style={{
              pointerEvents: 'none',
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
              color: 'rgba(255,255,255,0.87)',
            }}
          >
            <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
              Ingen innhold å forhåndsvise. Legg til HTML-innhold for å se forhåndsvisning.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
});

PanelPreview.displayName = 'PanelPreview';
