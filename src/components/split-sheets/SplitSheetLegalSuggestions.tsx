/**
 * Split Sheet Legal Suggestions
 * Display AI-generated legal suggestions based on split sheet content
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
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Lightbulb as SuggestionIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Description as ContractIcon,
} from '@mui/icons-material';

interface SplitSheetLegalSuggestionsProps {
  splitSheetId: string;
  onApplyToContract?: (suggestionId: string) => void;
}

interface LegalSuggestion {
  id: string;
  law_id: string;
  law_name: string;
  law_code?: string;
  chapter?: string;
  paragraph?: string;
  content: string;
  suggestion_type: 'compliance_warning' | 'recommendation' | 'requirement' | 'best_practice';
  title: string;
  description: string;
  explanation?: string;
  section_type?: string;
  confidence_score: number;
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed';
}

export default function SplitSheetLegalSuggestions({
  splitSheetId,
  onApplyToContract,
}: SplitSheetLegalSuggestionsProps) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const brandColor = theme.palette.primary.main;
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | false>(false);

  // Fetch suggestions
  const { data: suggestionsData, isLoading, refetch } = useQuery({
    queryKey: ['split-sheet-legal-suggestions', splitSheetId],
    queryFn: async () => {
      const response = await apiRequest(`/api/norwegian-laws/split-sheets/${splitSheetId}/legal-suggestions`);
      return response;
    }
  });

  const suggestions: LegalSuggestion[] = suggestionsData?.data || [];

  // Update suggestion status mutation
  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ suggestionId, status }: { suggestionId: string; status: string }) => {
      await apiRequest(`/api/norwegian-laws/split-sheets/legal-suggestions/${suggestionId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-legal-suggestions', splitSheetId] });
    }
  });

  const handleUpdateStatus = (suggestionId: string, status: 'accepted' | 'rejected' | 'dismissed') => {
    updateSuggestionMutation.mutate({ suggestionId, status });
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'compliance_warning':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'requirement':
        return <WarningIcon sx={{ color: '#f44336' }} />;
      case 'recommendation':
        return <InfoIcon sx={{ color: '#2196f3' }} />;
      case 'best_practice':
        return <SuggestionIcon sx={{ color: '#4caf50' }} />;
      default:
        return <InfoIcon />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'compliance_warning':
        return 'warning';
      case 'requirement':
        return 'error';
      case 'recommendation':
        return 'info';
      case 'best_practice':
        return 'success';
      default:
        return 'default';
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

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
                <SuggestionIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' } }} />
                Juridiske forslag
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                }}
              >
                AI-genererte forslag basert på split sheet-innhold og norsk lov
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => refetch()}
              disabled={isLoading}
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
              Oppdater forslag
            </Button>
          </Stack>

          {isLoading ? (
            <Box sx={{ py: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Genererer juridiske forslag...
              </Typography>
            </Box>
          ) : pendingSuggestions.length === 0 ? (
            <Alert severity="success">
              Ingen utestående juridiske forslag. Split sheet ser ut til å være i samsvar med norsk lov.
            </Alert>
          ) : (
            <List>
              {pendingSuggestions.map((suggestion, index) => (
                <React.Fragment key={suggestion.id || index}>
                  <Accordion
                    expanded={expandedSuggestion === suggestion.id}
                    onChange={(_event: React.SyntheticEvent, isExpanded: boolean) => setExpandedSuggestion(isExpanded ? suggestion.id : false)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getSuggestionIcon(suggestion.suggestion_type)}
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body1" sx={{ fontWeight: 600}}>
                              {suggestion.title}
                            </Typography>
                            <Chip
                              label={suggestion.suggestion_type === 'compliance_warning' ? 'Advarsel' :
                                     suggestion.suggestion_type === 'requirement' ? 'Krav' :
                                     suggestion.suggestion_type === 'recommendation' ? 'Anbefaling' : 'Beste praksis'}
                              size="small"
                              color={getSuggestionColor(suggestion.suggestion_type) as any}
                              variant="outlined"
                            />
                            <Chip
                              label={`${(suggestion.confidence_score * 100).toFixed(0)}% sikkerhet`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {suggestion.description}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {suggestion.explanation && (
                          <Alert severity={getSuggestionColor(suggestion.suggestion_type) as any}>
                            <Typography variant="subtitle2" gutterBottom>
                              Forklaring:
                            </Typography>
                            <Typography variant="body2">
                              {suggestion.explanation}
                            </Typography>
                          </Alert>
                        )}

                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Relatert lov:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600}}>
                            {suggestion.law_name}
                            {suggestion.chapter && suggestion.paragraph && ` - ${suggestion.chapter} ${suggestion.paragraph}`}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                            {suggestion.content}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={{ xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 }}
                          justifyContent="flex-end"
                          flexWrap="wrap"
                          sx={{ gap: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 } }}
                        >
                          {onApplyToContract && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ContractIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                              onClick={() => onApplyToContract(suggestion.id)}
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
                              Anvend i kontrakt
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                            onClick={() => handleUpdateStatus(suggestion.id, 'rejected')}
                            disabled={updateSuggestionMutation.isPending}
                            sx={{
                              minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                              fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                            }}
                          >
                            Avvis
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleUpdateStatus(suggestion.id, 'dismissed')}
                            disabled={updateSuggestionMutation.isPending}
                            sx={{
                              minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                              fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                            }}
                          >
                            Ignorer
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AcceptIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                            onClick={() => handleUpdateStatus(suggestion.id, 'accepted')}
                            disabled={updateSuggestionMutation.isPending}
                            sx={{
                              bgcolor: '#4caf50',
                              '&:hover': { bgcolor: '#45a049' },
                              minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                              fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                            }}
                          >
                            Godta
                          </Button>
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  {index < pendingSuggestions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}





