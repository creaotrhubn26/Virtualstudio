/**
 * Split Sheet Legal Documents
 * Generate legal agreements and contracts from split sheets
 */

import React, { useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Gavel as LegalIcon,
  Description as DocumentIcon,
  CheckCircle as CheckIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import type { SplitSheet, Contract } from './types';

interface SplitSheetLegalDocumentsProps {
  splitSheet: SplitSheet;
}

type DocumentType = 'split_sheet_agreement' | 'royalty_agreement' | 'collaboration_agreement' | 'custom';

interface GeneratedDocument {
  contract: Contract;
  documentContent: string;
  documentType: string;
  splitSheet: { id: string; title: string };
  contributorCount: number;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  split_sheet_agreement: 'Split Sheet-avtale',
  royalty_agreement: 'Royalty-avtale',
  collaboration_agreement: 'Samarbeidsavtale',
  custom: 'Tilpasset avtale'
};

export default function SplitSheetLegalDocuments({
  splitSheet
}: SplitSheetLegalDocumentsProps) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [documentType, setDocumentType] = useState<DocumentType>('split_sheet_agreement');
  const [includeClauses, setIncludeClauses] = useState({
    dispute_resolution: true,
    termination: true,
    assignment: true,
    governing_law: true
  });
  const [governingLaw, setGoverningLaw] = useState('norway');
  const [customClauses, setCustomClauses] = useState('');

  // Fetch existing documents for this split sheet
  const { data: existingDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['legal-documents', splitSheet.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/split-sheets/${splitSheet.id}/legal-documents`);
      return response.data || [];
    },
    enabled: !!splitSheet.id
  });

  const generateMutation = useMutation({
    mutationFn: async (data: {
      document_type: DocumentType;
      include_clauses: typeof includeClauses;
      governing_law: string;
      custom_clauses: string;
    }) => {
      const response = await apiRequest(`/api/split-sheets/${splitSheet.id}/legal-documents/generate`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response as { success: boolean; data: GeneratedDocument };
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Invalidate and refetch documents list
        queryClient.invalidateQueries({ queryKey: ['legal-documents', splitSheet.id] });
        
        // Show preview of generated document
        setPreviewContent(response.data.documentContent);
        setPreviewTitle(response.data.contract?.title || 'Generert dokument');
        setShowDialog(false);
        setShowPreviewDialog(true);
      }
    },
    onError: (error) => {
      console.error('Failed to generate document:', error);
      alert('Feil ved generering av dokument. Vennligst prøv igjen.');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      document_type: documentType,
      include_clauses: includeClauses,
      governing_law: governingLaw,
      custom_clauses: customClauses
    });
  };

  const handleViewDocument = (doc: Contract) => {
    setPreviewContent(doc.content || 'Ingen innhold tilgjengelig');
    setPreviewTitle(doc.title || 'Dokument');
    setShowPreviewDialog(true);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(previewContent).then(() => {
      alert('Innhold kopiert til utklippstavlen!');
    });
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([previewContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewTitle.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const documentTypes = [
    { value: 'split_sheet_agreement', label: 'Split Sheet-avtale' },
    { value: 'royalty_agreement', label: 'Royalty-avtale' },
    { value: 'collaboration_agreement', label: 'Samarbeidsavtale' },
    { value: 'custom', label: 'Tilpasset avtale' }
  ];

  return (
    <Box>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <LegalIcon sx={{ fontSize: 32, color: '#9f7aea' }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600}}>
                Juridiske dokumenter
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generer juridiske avtaler basert på split sheet
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<DocumentIcon />}
              onClick={() => setShowDialog(true)}
              sx={{ bgcolor: '#9f7aea' }}
            >
              Generer dokument
            </Button>
          </Stack>

          {/* Existing Documents List */}
          {isLoadingDocuments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : existingDocuments && existingDocuments.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Tidligere genererte dokumenter
              </Typography>
              <List dense>
                {existingDocuments.map((doc: Contract) => (
                  <ListItem
                    key={doc.id}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 0.5,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Vis dokument">
                          <IconButton size="small" onClick={() => handleViewDocument(doc)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                  >
                    <ListItemIcon>
                      <DocumentIcon fontSize="small" sx={{ color: '#9f7aea' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.title}
                      secondary={doc.created_at ? new Date(doc.created_at).toLocaleDateString('nb-NO') : ''}
                    />
                    <Chip
                      label={doc.status === 'draft' ? 'Utkast' : doc.status === 'signed' ? 'Signert' : doc.status}
                      size="small"
                      sx={{
                        mr: 4,
                        bgcolor: doc.status === 'signed' ? '#4caf50' : doc.status === 'draft' ? '#9e9e9e' : '#ff9800',
                        color: 'white'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Ingen juridiske dokumenter er generert ennå. Klikk "Generer dokument" for å opprette en avtale.
            </Alert>
          )}

          <Alert severity="warning" sx={{ mt: 2 }}>
            Viktig: Juridiske dokumenter genereres basert på split sheet-dataene. 
            Disse er maler og bør gjennomgås av en jurist før bruk.
          </Alert>
        </CardContent>
      </Card>

      {/* Generate Document Dialog */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Generer juridisk dokument</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              Dokumentet vil genereres basert på "{splitSheet.title}" med {splitSheet.contributors?.length || 0} bidragsytere.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Dokumenttype</InputLabel>
              <Select
                value={documentType}
                label="Dokumenttype"
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              >
                {documentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 600}}>
              Inkluder klausuler
            </Typography>
            <Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeClauses.dispute_resolution}
                    onChange={(e) => setIncludeClauses({
                      ...includeClauses,
                      dispute_resolution: e.target.checked
                    })}
                  />
                }
                label="Tvisteløsning"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeClauses.termination}
                    onChange={(e) => setIncludeClauses({
                      ...includeClauses,
                      termination: e.target.checked
                    })}
                  />
                }
                label="Oppsigelse"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeClauses.assignment}
                    onChange={(e) => setIncludeClauses({
                      ...includeClauses,
                      assignment: e.target.checked
                    })}
                  />
                }
                label="Overføring av rettigheter"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeClauses.governing_law}
                    onChange={(e) => setIncludeClauses({
                      ...includeClauses,
                      governing_law: e.target.checked
                    })}
                  />
                }
                label="Gjeldende lov"
              />
            </Stack>

            {includeClauses.governing_law && (
              <FormControl fullWidth>
                <InputLabel>Gjeldende lov</InputLabel>
                <Select
                  value={governingLaw}
                  label="Gjeldende lov"
                  onChange={(e) => setGoverningLaw(e.target.value)}
                >
                  <MenuItem value="norway">Norsk lov</MenuItem>
                  <MenuItem value="sweden">Svensk lov</MenuItem>
                  <MenuItem value="denmark">Dansk lov</MenuItem>
                  <MenuItem value="uk">UK law</MenuItem>
                  <MenuItem value="us">US law</MenuItem>
                </Select>
              </FormControl>
            )}

            <TextField
              label="Tilpassede klausuler (valgfritt)"
              value={customClauses}
              onChange={(e) => setCustomClauses(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="Legg til egendefinerte klausuler her..."
            />

            <Alert severity="warning">
              Viktig: Disse dokumentene er maler. Anbefaler å få dem gjennomgått av en jurist 
              før signering for å sikre at de passer din spesifikke situasjon.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Avbryt</Button>
          <Button
            variant="contained"
            startIcon={generateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <DocumentIcon />}
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            sx={{ bgcolor: '#9f7aea' }}
          >
            {generateMutation.isPending ? 'Genererer...' : 'Generer dokument'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{previewTitle}</Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Kopier innhold">
                <IconButton onClick={handleCopyContent}>
                  <CopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Last ned som Markdown">
                <IconButton onClick={handleDownloadMarkdown}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: '#fafafa',
              borderRadius: 2,
              maxHeight: '60vh',
              overflow: 'auto',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
              lineHeight: 1.6
            }}
          >
            {previewContent}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreviewDialog(false)}>Lukk</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadMarkdown}
            sx={{ bgcolor: '#9f7aea' }}
          >
            Last ned
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


