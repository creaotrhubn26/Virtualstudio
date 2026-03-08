// @ts-nocheck
// This file is in the unused directory and may have outdated imports
import {
  useTheming } from '../../../utils/theming-helper';
import Grid from '@mui/material/GridLegacy';
import React,
  { useState,
  useEffect } from 'react';
import { getAuthHeader } from '@/lib/google/impersonation';
import { useQuery,
  useQueryClient,
  useMutation } from '@tanstack/react-query';
import { 
  Box,
  Typography,
  Card as MuiCard,
  CardContent,
  Button,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  LibraryMusic,
  PlayArrow,
  Pause,
  Stop,
  VolumeUp,
  Equalizer,
  AddCircle as Add,
  Save
} from '@mui/icons-material';
import { apiRequest } from '@/lib/queryClient';
import { SoundBrowser } from '../SoundBrowser';
interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre: string;
  status: 'recording' | 'mixing' | 'mastering' | 'completed';
  bpm: number;
  key: string;
  notes: string;
  stemFiles: number
}

export default function SongFlowPlatform() {
  const queryClient = useQueryClient();
  
  // Theming system
  const theming = useTheming('photographer, ');

  // Create new track mutation
  const createTrackMutation = useMutation({
    mutationFn: async (trackData: any) => {
      const auth = await getAuthHeader();
      return apiRequest('/api/songflow-tracks', {
        headers: auth,
        method: 'POST',
        body: JSON.stringify({
          ...trackData,
          createdAt: new Date(),
          status: 'recording'
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/songflow-tracks'] });
      setShowNewTrackDialog(false);
      setNewTrack({ title: '', artist: '', genre: 'pop', bpm: 120, key: 'C' });
    }
  });

  const [activeTab, setActiveTab] = useState(0);
  const [showNewTrackDialog, setShowNewTrackDialog] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null); // Track ID for SoundBrowser credits
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    genre: 'pop',
    bpm: 120,
    key: 'C'
  });

  const handleCreateTrack = () => {
    if (!newTrack.title || !newTrack.artist) return;
    createTrackMutation.mutate(newTrack);
  };

  // Database connection for tracks
  const { data: tracksData = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['/api/songflow-tracks'],
    queryFn: async () => {
      const auth = await getAuthHeader();
      return apiRequest('/api/songflow-tracks', {
        headers: auth
      });
    },
    retry: false,
  });

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py:  3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ p:  3 }}>
      {/* Header */}
      <Box sx={{ mb:  4, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Box>
          <Typography variant="h4" sx={{  fontWeight: 600, display: 'flex', alignItems: 'center', gap:  2  }}>
            <LibraryMusic color="primary" />
            Song Flow Platform
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Musikkproduksjon og sporadministrasjon
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap:  2 }}>
          <Button variant="contained"
            startIcon={theming.getThemedIcon('add')}
            onClick={() => setShowNewTrackDialog(true)}
          >
            Nytt Spor
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb:  3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Aktive Spor" icon={theming.getThemedIcon('libraryMusic')} />
          <Tab label="Lydbibliotek" icon={theming.getThemedIcon('volumeUp')} />
        </Tabs>
      </Box>

      {/* Active Tracks Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {tracksLoading ? (
            <Grid xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center', p:  3 }}>
                <Typography>Laster tracks...</Typography>
              </Box>
            </Grid>
          ) : tracksData.length > 0 ? tracksData.map((track: Track) => (
            <Grid xs={12} key={track.id}>
              <MuiCard sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
          }}>
                <CardContent sx={theming.getThemedCardSx()}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap:  2 }}>
                        <IconButton 
                          sx={{ color: 'white'}}
                          onClick={() => {
                            // When track is clicked, select it for SoundBrowser credits
                            setSelectedTrackId(track.id);
                            // Switch to SoundBrowser tab to show credits
                            setActiveTab(1);
                          }}
                        >
                          {theming.getThemedIcon('play')}
                        </IconButton>
                        <Box>
                          <Typography variant="h6" sx={{  fontWeight: 600}}>
                            {track.title}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9}}>
                            {track.artist} • {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid xs={12} md={3}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap'}}>
                        <Chip 
                          label={track.status}
                          size="small" 
                          sx={{ bgcolor: 'rgba(25,255,255,0.2)', color: 'white'}}
                        />
                        <Chip 
                          label={`${track.bpm} BPM`}
                          size="small" 
                          sx={{ bgcolor: 'rgba(25,255,255,0.2)', color: 'white'}}
                        />
                        <Chip 
                          label={track.key}
                          size="small" 
                          sx={{ bgcolor: 'rgba(25,255,255,0.2)', color: 'white'}}
                        />
                      </Box>
                    </Grid>

                    <Grid xs={12} md={3}>
                      <Typography variant="caption" sx={{ opacity: 0.8}}>
                        {track.stemFiles} stem files
                      </Typography>
                    </Grid>

                    <Grid xs={12} md={2}>
                      <Box sx={{ display: 'flex', gap:  1 }}>
                        <IconButton size="small" sx={{ color: 'white'}}>
                          <Equalizer />
                        </IconButton>
                        <IconButton size="small" sx={{ color: 'white'}}>
                          {theming.getThemedIcon('volumeUp')}
                        </IconButton>
                      </Box>
                    </Grid>
                  </Grid>

                  {track.notes && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(25,255,255,0.1)', borderRadius:  1 }}>
                      <Typography variant="body2">
                        💭 {track.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </MuiCard>
            </Grid>
          )) : (
            <Grid xs={12}>
              <MuiCard>
                <CardContent sx={theming.getThemedCardSx()}>
                  <Typography variant="h6" align="center" color="text.secondary" sx={{ color: theming.colors.primary }}>
                    Ingen tracks funnet
                  </Typography>
                  <Typography variant="body2" align="center" color="text.secondary">
                    Tracks vil vises her når de er lagt til i systemet
                  </Typography>
                </CardContent>
              </MuiCard>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Sound Browser Tab */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ mb: 2 }}>
          {selectedTrackId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Viser krediteringer for valgt track. Klikk på en track i "Aktive Spor" for å se krediteringer.
            </Alert>
          )}
          <SoundBrowser songflowTrackId={selectedTrackId || undefined} />
        </Box>
      </TabPanel>


      {/* New Track Dialog */}
      <Dialog open={showNewTrackDialog} onClose={() => setShowNewTrackDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Opprett Nytt Spor</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt:  1 }}>
            <Grid xs={12}>
              <TextField
                label="Sporets tittel"
                fullWidth
                value={newTrack.title}
                onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                label="Artist"
                fullWidth
                value={newTrack.artist}
                onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
              />
            </Grid>
            <Grid xs={6}>
              <FormControl fullWidth>
                <InputLabel>Genre</InputLabel>
                <Select
                  value={newTrack.genre}
                  onChange={(e) => setNewTrack({ ...newTrack, genre: e.target.value })}
                >
                  <MenuItem value="pop">Pop</MenuItem>
                  <MenuItem value="electronic">Electronic</MenuItem>
                  <MenuItem value="hip-hop">Hip-Hop</MenuItem>
                  <MenuItem value="rock">Rock</MenuItem>
                  <MenuItem value="jazz">Jazz</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={3}>
              <TextField
                label="BPM"
                type="number"
                fullWidth
                value={newTrack.bpm}
                onChange={(e) => setNewTrack({ ...newTrack, bpm: parseInt(e.target.value, 10) || 120 })}
              />
            </Grid>
            <Grid xs={3}>
              <FormControl fullWidth>
                <InputLabel>Toneart</InputLabel>
                <Select
                  value={newTrack.key}
                  onChange={(e) => setNewTrack({ ...newTrack, key: e.target.value })}
                >
                  <MenuItem value="C">C</MenuItem>
                  <MenuItem value="C#">C#</MenuItem>
                  <MenuItem value="D">D</MenuItem>
                  <MenuItem value="D#">D#</MenuItem>
                  <MenuItem value="E">E</MenuItem>
                  <MenuItem value="F">F</MenuItem>
                  <MenuItem value="F#">F#</MenuItem>
                  <MenuItem value="G">G</MenuItem>
                  <MenuItem value="G#">G#</MenuItem>
                  <MenuItem value="A">A</MenuItem>
                  <MenuItem value="A#">A#</MenuItem>
                  <MenuItem value="B">B</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewTrackDialog(false)}>Avbryt</Button>
          <Button variant="contained" 
            onClick={handleCreateTrack}
            disabled={createTrackMutation.isPending || !newTrack.title || !newTrack.artist}
           sx={theming.getThemedButtonSx()}>
            {createTrackMutation.isPending ? 'Oppretter...' : 'Opprett Spor'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}