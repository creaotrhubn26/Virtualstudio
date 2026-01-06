/**
 * Split Sheet Export Component
 * Allows users to export split sheets in various formats for accounting software
 */

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  AccountBalance as SplitSheetIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';

interface SplitSheetExportProps {
  splitSheetId: string;
  splitSheetTitle: string;
  onExportComplete?: () => void;
}

export default function SplitSheetExport({
  splitSheetId,
  splitSheetTitle,
  onExportComplete,
}: SplitSheetExportProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const brandColor = theme.palette.primary.main;
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'excel' | 'accounting'>('csv');
  const [includeRevenue, setIncludeRevenue] = useState(true);
  const [includePayments, setIncludePayments] = useState(true);
  const [includeContributors, setIncludeContributors] = useState(true);
  const [accountingFormat, setAccountingFormat] = useState<'quickbooks' | 'xero' | 'norwegian'>('norwegian');

  const exportMutation = useMutation({
    mutationFn: async () => {
      let url = '';
      if (format === 'csv') {
        url = `/api/split-sheets/${splitSheetId}/export/csv`;
      } else if (format === 'excel') {
        url = `/api/split-sheets/${splitSheetId}/export/excel`;
      } else {
        url = `/api/split-sheets/${splitSheetId}/export/accounting?format=${accountingFormat}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to export split sheet ');

      if (format === 'csv') {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `split-sheet-${splitSheetId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else if (format === 'excel') {
        const data = await response.json();
        // Convert JSON to downloadable format
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `split-sheet-${splitSheetId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }

      return { success: true };
    },
    onSuccess: () => {
      setOpen(false);
      if (onExportComplete) onExportComplete();
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={() => setOpen(true)}
        sx={{
          color: brandColor,
          borderColor: brandColor,
          '&:hover': {
            borderColor: brandColor,
            bgcolor: 'rgba(0, 212, 255, 0.1)',
          },
          minHeight: { xs: 44, sm: 46, md: 48, lg: 50, xl: 52 },
          fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
          px: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
          py: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
        }}
      >
        Eksporter
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            bgcolor: 'rgba(26, 26, 26, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            pb: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 },
            }}
          >
            <SplitSheetIcon sx={{ color: brandColor, fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' } }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.063rem', md: '1.125rem', lg: '1.188rem', xl: '1.25rem' },
                color: brandColor,
              }}
            >
              Eksporter Split Sheet
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
              fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
            }}
          >
            {splitSheetTitle}
          </Typography>

          <FormControl
            fullWidth
            sx={{
              mb: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            }}
          >
            <InputLabel
              sx={{
                fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
              }}
            >
              Eksportformat
            </InputLabel>
            <Select
              value={format}
              label="Eksportformat"
              onChange={(e) => setFormat(e.target.value as any)}
              sx={{
                minHeight: { xs: 48, sm: 50, md: 52, lg: 54, xl: 56 },
                fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
              }}
            >
              <MenuItem value="csv">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 } }}>
                  <CsvIcon sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem', lg: '1.375rem', xl: '1.5rem' } }} />
                  CSV (Komma-separert)
                </Box>
              </MenuItem>
              <MenuItem value="excel">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 } }}>
                  <ExcelIcon sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem', lg: '1.375rem', xl: '1.5rem' } }} />
                  Excel/JSON
                </Box>
              </MenuItem>
              <MenuItem value="accounting">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 } }}>
                  <AccountBalanceIcon sx={{ fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem', lg: '1.375rem', xl: '1.5rem' } }} />
                  Regnskapsformat
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {format === 'accounting' && (
            <FormControl
              fullWidth
              sx={{
                mb: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
              }}
            >
              <InputLabel
                sx={{
                  fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                }}
              >
                Regnskapsformat
              </InputLabel>
              <Select
                value={accountingFormat}
                label="Regnskapsformat"
                onChange={(e) => setAccountingFormat(e.target.value as any)}
                sx={{
                  minHeight: { xs: 48, sm: 50, md: 52, lg: 54, xl: 56 },
                  fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
                }}
              >
                <MenuItem value="norwegian">Norsk Bokføring</MenuItem>
                <MenuItem value="quickbooks">QuickBooks</MenuItem>
                <MenuItem value="xero">Xero</MenuItem>
              </Select>
            </FormControl>
          )}

          <Divider sx={{ my: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }} />

          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
              mb: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
            }}
          >
            Inkluder data
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeContributors}
                  onChange={(e) => setIncludeContributors(e.target.checked)}
                  sx={{
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' },
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                  }}
                >
                  Bidragsytere og prosenter
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeRevenue}
                  onChange={(e) => setIncludeRevenue(e.target.checked)}
                  sx={{
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' },
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                  }}
                >
                  Inntektsdata
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includePayments}
                  onChange={(e) => setIncludePayments(e.target.checked)}
                  sx={{
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' },
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                  }}
                >
                  Betalinger
                </Typography>
              }
            />
          </FormGroup>

          {exportMutation.isError && (
            <Alert
              severity="error"
              sx={{
                mt: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
                borderRadius: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
                fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
              }}
            >
              Feil ved eksport: {(exportMutation.error as Error)?.message || 'Ukjent feil'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            pt: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
            gap: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
          }}
        >
          <Button
            onClick={() => setOpen(false)}
            sx={{
              minHeight: { xs: 44, sm: 46, md: 48, lg: 50, xl: 52 },
              fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
              px: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
              py: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
            }}
          >
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            startIcon={exportMutation.isPending ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <DownloadIcon />}
            sx={{
              bgcolor: brandColor,
              '&:hover': { bgcolor: brandColor },
              minHeight: { xs: 44, sm: 46, md: 48, lg: 50, xl: 52 },
              fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
              px: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
              py: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
            }}
          >
            {exportMutation.isPending ? 'Eksporterer...' : 'Eksporter'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}























