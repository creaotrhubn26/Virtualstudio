/**
 * Split Sheet Legal References
 * Display and manage legal references linked to split sheets
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  useTheme,
  useMediaQuery,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as LegalIcon,
  Link as LinkIcon,
  Description as ContractIcon,
} from '@mui/icons-material';

interface SplitSheetLegalReferencesProps {
  splitSheetId: string;
  onAddToContract?: (referenceId: string) => void;
}

interface LegalReference {
  id: string;
  law_id: string;
  law_name: string;
  law_code?: string;
  chapter?: string;
  paragraph?: string;
  content: string;
  category: string;
  section_type?: string;
  relevance_score?: number;
  notes?: string;
}

export default function SplitSheetLegalReferences({
  splitSheetId,
  onAddToContract,
}: SplitSheetLegalReferencesProps) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const brandColor = theme.palette.primary.main;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLawId, setSelectedLawId] = useState('');

  // Fetch references
  const { data: referencesData } = useQuery({
    queryKey: ['split-sheet-legal-references', splitSheetId],
    queryFn: async () => {
      const response = await apiRequest(`/api/norwegian-laws/split-sheets/${splitSheetId}/legal-references`);
      return response;
    }
  });

  const references: LegalReference[] = referencesData?.data || [];

  // Search laws
  const { data: lawsData } = useQuery({
    queryKey: ['norwegian-laws-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { data: [] };
      const response = await apiRequest(`/api/norwegian-laws?query=${encodeURIComponent(searchQuery)}&limit=10`);
      return response;
    },
    enabled: showAddDialog && searchQuery.trim().length > 0
  });

  const laws = lawsData?.data || [];

  // Add reference mutation
  const addReferenceMutation = useMutation({
    mutationFn: async (lawId: string) => {
      await apiRequest(`/api/norwegian-laws/split-sheets/${splitSheetId}/legal-references`, {
        method: 'POST',
        body: JSON.stringify({ law_id: lawId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-legal-references', splitSheetId] });
      setShowAddDialog(false);
      setSearchQuery('');
      setSelectedLawId('');
    }
  });

  // Delete reference mutation
  const deleteReferenceMutation = useMutation({
    mutationFn: async (referenceId: string) => {
      await apiRequest(`/api/norwegian-laws/split-sheets/${splitSheetId}/legal-references/${referenceId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-legal-references', splitSheetId] });
    }
  });

  const handleAddReference = () => {
    if (!selectedLawId) {
      alert('Vennligst velg en lov');
      return;
    }
    addReferenceMutation.mutate(selectedLawId);
  };

  const handleDeleteReference = (referenceId: string) => {
    if (window.confirm('Er du sikker på at du vil fjerne denne referansen?')) {
      deleteReferenceMutation.mutate(referenceId);
    }
  };

  return (
    <Box>
      <Card
        sx={{
          borderRadius: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}
            flexWrap="wrap"
            gap={{ xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 },
                  fontSize: { xs: '1rem', sm: '1.063rem', md: '1.125rem', lg: '1.188rem', xl: '1.25rem' },
                  color: brandColor,
                  mb: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 },
                }}
              >
                <LegalIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' } }} />
                Juridiske referanser
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                }}
              >
                Norske lover og paragrafer knyttet til denne split sheet (fra Lovdata)
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setShowAddDialog(true)}
              sx={{
                borderColor: brandColor,
                color: brandColor,
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
              Legg til referanse
            </Button>
          </Stack>

          {references.length === 0 ? (
            <Alert severity="info">
              Ingen juridiske referanser. Legg til relevante lover og paragrafer for å dokumentere juridisk grunnlag.
            </Alert>
          ) : (
            <List>
              {references.map((ref, index) => (
                <React.Fragment key={ref.id || index}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={ref.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="body1" sx={{ fontWeight: 600}}>
                          {ref.law_name}
                        </Typography>
                        {ref.chapter && ref.paragraph && (
                          <Typography variant="body2" color="text.secondary">
                            {ref.chapter} {ref.paragraph}
                          </Typography>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Paragrafinnhold:
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {ref.content}
                          </Typography>
                        </Box>
                        {ref.notes && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Notater:
                            </Typography>
                            <Typography variant="body2">
                              {ref.notes}
                            </Typography>
                          </Box>
                        )}
                        {ref.relevance_score && (
                          <Chip
                            label={`Relevans: ${(ref.relevance_score * 100).toFixed(0)}%`}
                            size="small"
                            color={ref.relevance_score > 0.7 ? 'success' : ref.relevance_score > 0.4 ? 'warning' : 'default'}
                          />
                        )}
                        <Stack
                          direction="row"
                          spacing={{ xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 }}
                          justifyContent="flex-end"
                          flexWrap="wrap"
                          sx={{ gap: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 } }}
                        >
                          {onAddToContract && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ContractIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                              onClick={() => onAddToContract(ref.id)}
                              sx={{
                                borderColor: brandColor,
                                color: brandColor,
                                '&:hover': {
                                  borderColor: brandColor,
                                  bgcolor: 'rgba(0, 212, 255, 0.1)',
                                },
                                minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                                fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                              }}
                            >
                              Legg til i kontrakt
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteReference(ref.id)}
                            sx={{
                              minWidth: { xs: 44, sm: 46, md: 48, lg: 50, xl: 52 },
                              minHeight: { xs: 44, sm: 46, md: 48, lg: 50, xl: 52 },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.375rem', lg: '1.5rem', xl: '1.625rem' } }} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  {index < references.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Add Reference Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setSearchQuery('');
          setSelectedLawId('');
        }}
        maxWidth="md"
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.063rem', md: '1.125rem', lg: '1.188rem', xl: '1.25rem' },
              color: brandColor,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 },
            }}
          >
            <LegalIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' } }} />
            Legg til juridisk referanse (Lovdata)
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}>
          <Stack spacing={{ xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 }} sx={{ mt: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 } }}>
            <TextField
              label="Søk etter lov"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              placeholder="f.eks. 'Åndsverkloven', 'samarbeidsverk', 'opphavsrett'"
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
                  py: { xs: 1.5, sm: 1.25, md: 1, lg: 0.875, xl: 0.75 },
                  minHeight: { xs: 48, sm: 50, md: 52, lg: 54, xl: 56 },
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                },
              }}
            />

            {laws.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Søkeresultater:
                </Typography>
                <List>
                  {laws.map((law: any) => (
                    <ListItem
                      key={law.id}
                      button
                      selected={selectedLawId === law.id}
                      onClick={() => setSelectedLawId(law.id)}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body1" sx={{ fontWeight: 600}}>
                              {law.law_name}
                            </Typography>
                            {law.chapter && law.paragraph && (
                              <Typography variant="body2" color="text.secondary">
                                {law.chapter} {law.paragraph}
                              </Typography>
                            )}
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {law.content.substring(0, 150)}...
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {searchQuery.trim().length > 0 && laws.length === 0 && (
              <Alert severity="info">
                Ingen resultater funnet. Prøv et annet søkeord.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            pt: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
            gap: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
          }}
        >
          <Button
            onClick={() => {
              setShowAddDialog(false);
              setSearchQuery('');
              setSelectedLawId('');
            }}
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
            onClick={handleAddReference}
            disabled={!selectedLawId || addReferenceMutation.isPending}
            sx={{
              bgcolor: brandColor,
              '&:hover': { bgcolor: brandColor },
              minHeight: { xs: 44, sm: 46, md: 48, lg: 50, xl: 52 },
              fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
              px: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
              py: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
            }}
          >
            {addReferenceMutation.isPending ? 'Legger til...' : 'Legg til'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}























