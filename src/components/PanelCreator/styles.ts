/**
 * Shared styles for PanelCreator components
 */

import { SxProps, Theme } from '@mui/material';

export const getTextFieldStyles = (isDesktop: boolean, isTablet: boolean): SxProps<Theme> => ({
  '& .MuiInputLabel-root': { 
    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
    lineHeight: isDesktop ? 1.6 : 1.5,
  },
  '& .MuiOutlinedInput-root': {
    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
    pointerEvents: 'auto',
    '& input': {
      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
      lineHeight: isDesktop ? 1.6 : 1.5,
      py: isDesktop ? 1.75 : isTablet ? 1.5 : 1.25,
      pointerEvents: 'auto',
    },
    '& textarea': {
      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
      lineHeight: isDesktop ? 1.6 : 1.5,
      py: isDesktop ? 1.75 : isTablet ? 1.5 : 1.25,
      pointerEvents: 'auto',
    },
  },
  '& .MuiFormHelperText-root': {
    fontSize: isDesktop ? '1rem' : isTablet ? '0.875rem' : '0.75rem',
    lineHeight: 1.5,
  },
});

export const getInputLabelStyles = (isDesktop: boolean, isTablet: boolean): SxProps<Theme> => ({
  fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
  lineHeight: isDesktop ? 1.6 : 1.5,
});

export const getSelectMenuProps = (isDesktop: boolean, isTablet: boolean) => ({
  container: document.body,
  disableScrollLock: true,
  disablePortal: false,
  sx: {
    zIndex: 100010,
  },
  PaperProps: {
    sx: {
      bgcolor: '#2a2a2a',
      maxHeight: { xs: '50vh', sm: '60vh', md: '70vh' },
      pointerEvents: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      mt: 0.5,
      '& .MuiMenuItem-root': {
        fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
        minHeight: isDesktop ? 56 : isTablet ? 48 : 44,
        py: isDesktop ? 1.75 : isTablet ? 1.25 : 1,
        lineHeight: isDesktop ? 1.6 : 1.5,
        pointerEvents: 'auto',
        '&:hover': {
          bgcolor: 'rgba(0,212,255,0.15)',
        },
        '&.Mui-selected': {
          bgcolor: 'rgba(0,212,255,0.25)',
          '&:hover': {
            bgcolor: 'rgba(0,212,255,0.35)',
          },
        },
      },
    },
  },
  MenuListProps: {
    sx: {
      pointerEvents: 'auto',
    },
  },
});














