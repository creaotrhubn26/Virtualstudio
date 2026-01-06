import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Grid,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Description as DescriptionIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { Consent, ConsentType, Candidate } from '../core/models/casting';
import { consentService } from '../services/consentService';
import { castingService } from '../services/castingService';

interface ConsentManagementPanelProps {
  projectId: string;
  candidateId: string;
  onUpdate?: () => void;
}

export function ConsentManagementPanel({ projectId, candidateId, onUpdate }: ConsentManagementPanelProps) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [status, setStatus] = useState<{
    total: number;
    signed: number;
    pending: number;
    missing: string[];
  }>({ total: 0, signed: 0, pending: 0, missing: [] });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState<Consent | null>(null);
  const [formData, setFormData] = useState<Partial<Consent>>({
    type: 'photo_release',
    signed: false,
    notes: '',
  });

  // Load consents and candidate when projectId or candidateId changes
  useEffect(() => {
    const loadData = async () => {
      if (projectId && candidateId) {
        try {
          const [loadedConsents, candidates] = await Promise.all([
            consentService.getConsents(projectId, candidateId),
            castingService.getCandidates(projectId),
          ]);
          setConsents(Array.isArray(loadedConsents) ? loadedConsents : []);
          const foundCandidate = candidates.find(c => c.id === candidateId);
          setCandidate(foundCandidate || null);
          
          // Update status
          const loadedStatus = await consentService.getConsentStatus(projectId, candidateId);
          setStatus(loadedStatus);
        } catch (error) {
          console.error('Error loading consent data:', error);
          setConsents([]);
          setCandidate(null);
        }
      }
    };
    loadData();
  }, [projectId, candidateId]);

  const consentTypes: ConsentType[] = [
    'photo_release',
    'video_release',
    'audio_release',
    'location_release',
    'minor_consent',
    'other',
  ];

  const getTypeLabel = (type: ConsentType): string => {
    const labels: Record<ConsentType, string> = {
      photo_release: 'Foto-samtykke',
      video_release: 'Video-samtykke',
      audio_release: 'Lyd-samtykke',
      location_release: 'Lokasjon-samtykke',
      minor_consent: 'Mindreårig-samtykke',
      other: 'Annet',
    };
    return labels[type] || type;
  };

  const handleOpenDialog = (consent?: Consent) => {
    if (consent) {
      setEditingConsent(consent);
      setFormData(consent);
    } else {
      setEditingConsent(null);
      setFormData({
        type: 'photo_release',
        signed: false,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConsent(null);
    setFormData({
      type: 'photo_release',
      signed: false,
      notes: '',
    });
  };

  const handleSave = () => {
    const consent: Consent = editingConsent
      ? {
          ...editingConsent,
          ...formData,
          updatedAt: new Date().toISOString(),
        } as Consent
      : {
          id: `consent-${Date.now()}`,
          candidateId,
          type: formData.type || 'photo_release',
          signed: formData.signed || false,
          date: formData.signed ? new Date().toISOString() : undefined,
          document: formData.document,
          notes: formData.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    consentService.updateConsent(projectId, candidateId, consent);
    setConsents(consentService.getConsents(projectId, candidateId));
    handleCloseDialog();
    if (onUpdate) onUpdate();
  };

  const handleDelete = async (consentId: string) => {
    if (window.confirm('Er du sikker på at du vil slette dette samtykket?')) {
      try {
        await consentService.deleteConsent(projectId, candidateId, consentId);
        const [loadedConsents, loadedStatus] = await Promise.all([
          consentService.getConsents(projectId, candidateId),
          consentService.getConsentStatus(projectId, candidateId),
        ]);
        setConsents(Array.isArray(loadedConsents) ? loadedConsents : []);
        setStatus(loadedStatus);
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error deleting consent:', error);
      }
    }
  };

  const handleSign = async (consentId: string) => {
    try {
      await consentService.signConsent(projectId, candidateId, consentId);
      const [loadedConsents, loadedStatus] = await Promise.all([
        consentService.getConsents(projectId, candidateId),
        consentService.getConsentStatus(projectId, candidateId),
      ]);
      setConsents(Array.isArray(loadedConsents) ? loadedConsents : []);
      setStatus(loadedStatus);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error signing consent:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {candidate && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
            Samtykker for {candidate.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={`Totalt: ${status.total}`}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            />
            <Chip
              label={`Signert: ${status.signed}`}
              size="small"
              sx={{
                bgcolor: '#10b981',
                color: '#000',
                fontWeight: 600,
              }}
            />
            <Chip
              label={`Venter: ${status.pending}`}
              size="small"
              sx={{
                bgcolor: '#ffb800',
                color: '#000',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
          Samtykker ({consents.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            bgcolor: '#00d4ff',
            color: '#000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#00b8e6' },
          }}
        >
          Legg til samtykke
        </Button>
      </Box>

      {consents.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <DescriptionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="body1">Ingen samtykker ennå</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Legg til samtykker for å spore dokumentasjon
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {consents.map((consent) => (
            <Grid item xs={12} sm={6} md={4} key={consent.id}>
              <Card
                sx={{
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  '&:hover': { borderColor: consent.signed ? '#10b981' : '#00d4ff' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ color: '#fff', mb: 0.5 }}>
                        {getTypeLabel(consent.type)}
                      </Typography>
                      <Chip
                        icon={consent.signed ? <CheckCircleIcon /> : <CancelIcon />}
                        label={consent.signed ? 'Signert' : 'Ikke signert'}
                        size="small"
                        sx={{
                          bgcolor: consent.signed ? '#10b981' : '#ffb800',
                          color: '#000',
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Box>
                      {!consent.signed && (
                        <IconButton
                          size="small"
                          onClick={() => handleSign(consent.id)}
                          sx={{ color: '#10b981' }}
                          title="Merk som signert"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(consent)}
                        sx={{ color: '#00d4ff' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(consent.id)}
                        sx={{ color: '#ff4444' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {consent.date && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
                      Signert: {new Date(consent.date).toLocaleDateString('no-NO')}
                    </Typography>
                  )}

                  {consent.notes && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', mt: 1 }}>
                      {consent.notes}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit/Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {editingConsent ? 'Rediger samtykke' : 'Nytt samtykke'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Type</InputLabel>
              <Select
                value={formData.type || 'photo_release'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ConsentType })}
                label="Type"
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                }}
              >
                {consentTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getTypeLabel(type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.signed || false}
                  onChange={(e) => setFormData({ ...formData, signed: e.target.checked })}
                  sx={{
                    color: '#00d4ff',
                    '&.Mui-checked': { color: '#00d4ff' },
                  }}
                />
              }
              label="Signert"
              sx={{ color: 'rgba(255,255,255,0.7)' }}
            />

            {formData.signed && !editingConsent?.date && (
              <TextField
                label="Signeringsdato"
                fullWidth
                type="date"
                value={formData.date ? formData.date.split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
              />
            )}

            <TextField
              label="Dokument URL (valgfritt)"
              fullWidth
              value={formData.document || ''}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              placeholder="URL til signert dokument"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              }}
            />

            <TextField
              label="Notater"
              fullWidth
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={<SaveIcon />}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              fontWeight: 600,
              '&:hover': { bgcolor: '#00b8e6' },
            }}
          >
            Lagre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}





