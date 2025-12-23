/**
 * Light Pattern Library
 * 
 * Browse and apply professional lighting patterns (Rembrandt, Loop, Butterfly, etc.)
 * with one click. Includes setup instructions and recommendations.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Close,
  Lightbulb,
  CheckCircle,
  Info,
  Star,
  TrendingUp,
  Search,
  PlayArrow,
  Visibility,
} from '@mui/icons-material';
import { apiRequest } from '@/lib/api';

interface LightPattern {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  lookDescription: string;
  whenToUse: string;
  difficultyLevel: string;
  lightSetup: any[];
  setupInstructions: string[];
  recommendedModifiers: string[];
  recommendedHdris: string[];
  recommendedBackgrounds: string[];
  subjectOrientation: string;
  subjectDistance: number;
  shadowRules: string;
  isFeatured: boolean;
  isBeginnerFriendly: boolean;
  usageCount: number;
  ratingAverage: number;
  ratingCount: number;
  thumbnailUrl?: string;
}

const LOCAL_PATTERNS: LightPattern[] = [
  {
    id: 'rembrandt',
    name: 'Rembrandt',
    slug: 'rembrandt',
    category: 'portrait',
    description: 'Klassisk portrettlys med trekant under øyet på skyggesiden',
    lookDescription: 'Dramatisk, kunstnerisk look med dype skygger',
    whenToUse: 'Portrett, karakterfoto, kunstneriske bilder',
    difficultyLevel: 'intermediate',
    lightSetup: [{ type: 'key', angle: 45, height: 1.5, power: 80 }],
    setupInstructions: ['Plasser hovedlys 45° til siden', 'Hev lyset over øyenivå', 'Se etter trekant under øyet'],
    recommendedModifiers: ['Softbox', 'Beauty Dish'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Mørk grå', 'Sort'],
    subjectOrientation: 'front',
    subjectDistance: 2,
    shadowRules: 'Triangle shadow under eye',
    isFeatured: true,
    isBeginnerFriendly: false,
    usageCount: 1250,
    ratingAverage: 4.8,
    ratingCount: 156
  },
  {
    id: 'butterfly',
    name: 'Butterfly / Paramount',
    slug: 'butterfly',
    category: 'beauty',
    description: 'Lys rett forfra ovenfra, skaper sommerfuglskygge under nesen',
    lookDescription: 'Glamorøs, flatterende look for skjønnhetsfoto',
    whenToUse: 'Beauty, fashion, glamour',
    difficultyLevel: 'beginner',
    lightSetup: [{ type: 'key', angle: 0, height: 2, power: 80 }],
    setupInstructions: ['Plasser lys rett over kamera', 'Senk til sommerfuglskygge vises under nesen'],
    recommendedModifiers: ['Beauty Dish', 'Paraply'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Hvit', 'Lys grå'],
    subjectOrientation: 'front',
    subjectDistance: 1.5,
    shadowRules: 'Butterfly shadow under nose',
    isFeatured: true,
    isBeginnerFriendly: true,
    usageCount: 980,
    ratingAverage: 4.6,
    ratingCount: 89
  },
  {
    id: 'split',
    name: 'Split Lighting',
    slug: 'split',
    category: 'dramatic',
    description: 'Lys fra 90° til siden, halverer ansiktet i lys og skygge',
    lookDescription: 'Svært dramatisk, mystisk look',
    whenToUse: 'Dramatiske portretter, film noir, karakterbilder',
    difficultyLevel: 'beginner',
    lightSetup: [{ type: 'key', angle: 90, height: 1.5, power: 100 }],
    setupInstructions: ['Plasser lys 90° til siden', 'Juster høyde til øyenivå'],
    recommendedModifiers: ['Fresnel', 'Barn doors'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Sort'],
    subjectOrientation: 'front',
    subjectDistance: 2,
    shadowRules: 'Half face in shadow',
    isFeatured: false,
    isBeginnerFriendly: true,
    usageCount: 567,
    ratingAverage: 4.4,
    ratingCount: 45
  },
  {
    id: 'loop',
    name: 'Loop Lighting',
    slug: 'loop',
    category: 'portrait',
    description: 'Lys 30-45° til siden, skaper løkkeformet skygge fra nesen',
    lookDescription: 'Naturlig, flatterende for de fleste ansikter',
    whenToUse: 'Allsidig portrettlys, bedriftsportretter',
    difficultyLevel: 'beginner',
    lightSetup: [{ type: 'key', angle: 30, height: 1.5, power: 70 }],
    setupInstructions: ['Plasser lys 30-45° til siden', 'Hev litt over øyenivå', 'Se etter løkkeskygge fra nesen'],
    recommendedModifiers: ['Softbox', 'Paraply'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Grå', 'Hvit'],
    subjectOrientation: 'front',
    subjectDistance: 2,
    shadowRules: 'Small loop shadow from nose',
    isFeatured: true,
    isBeginnerFriendly: true,
    usageCount: 1100,
    ratingAverage: 4.7,
    ratingCount: 134
  },
  {
    id: 'clamshell',
    name: 'Clamshell',
    slug: 'clamshell',
    category: 'beauty',
    description: 'To lys ovenfra og nedenfra, minimerer skygger',
    lookDescription: 'Skyggeløs, jevn belysning for beauty',
    whenToUse: 'Beauty, makeup, hudpleie',
    difficultyLevel: 'intermediate',
    lightSetup: [
      { type: 'key', angle: 0, height: 2, power: 80 },
      { type: 'fill', angle: 0, height: -0.5, power: 40 }
    ],
    setupInstructions: ['Plasser hovedlys over kamera', 'Legg til reflektor eller fill under', 'Balancer lysstyrke'],
    recommendedModifiers: ['Beauty Dish', 'Softbox', 'Reflektor'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Hvit'],
    subjectOrientation: 'front',
    subjectDistance: 1.5,
    shadowRules: 'Minimal shadows',
    isFeatured: false,
    isBeginnerFriendly: false,
    usageCount: 445,
    ratingAverage: 4.5,
    ratingCount: 67
  },
  {
    id: 'three-point',
    name: 'Three-Point Lighting',
    slug: 'three-point',
    category: 'interview',
    description: 'Klassisk oppsett med key, fill og rim/back light',
    lookDescription: 'Profesjonell, balansert belysning',
    whenToUse: 'Intervju, video, bedriftsportretter',
    difficultyLevel: 'intermediate',
    lightSetup: [
      { type: 'key', angle: 45, height: 1.5, power: 100 },
      { type: 'fill', angle: -30, height: 1.2, power: 50 },
      { type: 'rim', angle: 135, height: 1.8, power: 70 }
    ],
    setupInstructions: ['Plasser hovedlys 45° til siden', 'Legg til fill på motsatt side', 'Plasser rim light bak motiv'],
    recommendedModifiers: ['Softbox', 'Reflektor', 'Strip softbox'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Grå', 'Grønn skjerm'],
    subjectOrientation: 'front',
    subjectDistance: 2.5,
    shadowRules: 'Balanced shadows with rim separation',
    isFeatured: true,
    isBeginnerFriendly: false,
    usageCount: 2340,
    ratingAverage: 4.9,
    ratingCount: 289
  },
  {
    id: 'high-key',
    name: 'High-Key',
    slug: 'high-key',
    category: 'commercial',
    description: 'Lyst, skyggeløst oppsett med jevn belysning',
    lookDescription: 'Rent, lyst, optimistisk',
    whenToUse: 'Reklame, produktfoto, mote',
    difficultyLevel: 'advanced',
    lightSetup: [
      { type: 'key', angle: 0, height: 1.5, power: 80 },
      { type: 'fill', angle: -45, height: 1.2, power: 60 },
      { type: 'background', angle: 180, height: 1, power: 100 }
    ],
    setupInstructions: ['Bruk hvit bakgrunn', 'Lys opp bakgrunn separat', 'Balancer frontlys for flat belysning'],
    recommendedModifiers: ['Store softboxer', 'Reflektorer'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Hvit'],
    subjectOrientation: 'front',
    subjectDistance: 3,
    shadowRules: 'Minimal to no shadows',
    isFeatured: false,
    isBeginnerFriendly: false,
    usageCount: 678,
    ratingAverage: 4.3,
    ratingCount: 56
  },
  {
    id: 'low-key',
    name: 'Low-Key',
    slug: 'low-key',
    category: 'dramatic',
    description: 'Mørkt oppsett med høy kontrast og dype skygger',
    lookDescription: 'Dramatisk, mystisk, kunstnerisk',
    whenToUse: 'Kunstportretter, film noir, stemningsbilder',
    difficultyLevel: 'intermediate',
    lightSetup: [{ type: 'key', angle: 60, height: 1.5, power: 100 }],
    setupInstructions: ['Bruk mørk bakgrunn', 'Én hard lyskilde fra siden', 'Ingen fill light'],
    recommendedModifiers: ['Snoot', 'Grid', 'Barn doors'],
    recommendedHdris: [],
    recommendedBackgrounds: ['Sort'],
    subjectOrientation: 'front',
    subjectDistance: 2,
    shadowRules: 'Deep, defined shadows',
    isFeatured: true,
    isBeginnerFriendly: false,
    usageCount: 890,
    ratingAverage: 4.6,
    ratingCount: 112
  }
];

interface LightPatternLibraryProps {
  open: boolean;
  onClose: () => void;
  onApplyPattern: (pattern: LightPattern) => Promise<void>;
}

export const LightPatternLibrary: React.FC<LightPatternLibraryProps> = ({
  open,
  onClose,
  onApplyPattern,
}) => {
  const [patterns, setPatterns] = useState<LightPattern[]>([]);
  const [customPatterns, setCustomPatterns] = useState<LightPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<LightPattern | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Tabs
  const [tabValue, setTabValue] = useState(0); // 0 = Professional, 1 = Community, 2 = My Patterns

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    if (open) {
      fetchPatterns();
      fetchCustomPatterns();
    }
  }, [open, tabValue]);

  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{ patterns: LightPattern[] }>(
        '/api/virtual-studio/light-patterns',
        { method: 'GET' }
      );
      setPatterns(response.patterns);
    } catch (error) {
      console.error('Using local patterns (API not available)');
      setPatterns(LOCAL_PATTERNS);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomPatterns = async () => {
    setLoading(true);
    try {
      const myPatterns = tabValue === 2;
      const response = await apiRequest<{ patterns: LightPattern[] }>(
        `/api/virtual-studio/custom-patterns?myPatterns=${myPatterns}`,
        { method: 'GET' }
      );
      setCustomPatterns(response.patterns);
    } catch (error) {
      console.error('Using empty custom patterns (API not available)');
      setCustomPatterns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (pattern: LightPattern) => {
    setApplying(pattern.id);
    try {
      await onApplyPattern(pattern);
      onClose();
    } catch (error) {
      console.error('Error applying pattern:', error);
      alert('Failed to apply lighting pattern. Please try again.');
    } finally {
      setApplying(null);
    }
  };

  const handleViewDetails = (pattern: LightPattern) => {
    setSelectedPattern(pattern);
    setShowDetails(true);
  };

  const filterPatterns = (patternList: LightPattern[]) => {
    return patternList.filter(pattern => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!pattern.name.toLowerCase().includes(query) &&
            !pattern.description.toLowerCase().includes(query) &&
            !pattern.whenToUse?.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (categoryFilter !== 'all' && pattern.category !== categoryFilter) {
        return false;
      }

      if (difficultyFilter !== 'all' && pattern.difficultyLevel !== difficultyFilter) {
        return false;
      }

      return true;
    });
  };

  const filteredPatterns = filterPatterns(tabValue === 0 ? patterns : customPatterns);

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'success';
      case 'intermediate': return 'info';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  return (
    <>
      {/* Main Library Dialog */}
      <Dialog open={open && !showDetails} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lightbulb color="primary" />
              <Typography variant="h6">Lysmønster Bibliotek</Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            {/* Tabs: Professional / Community / My Patterns */}
            <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} variant="fullWidth">
              <Tab label="Profesjonelle Mønstre" />
              <Tab label="Fellesskap Mønstre" />
              <Tab label="Mine Mønstre" />
            </Tabs>

            {/* Header Info */}
            <Alert severity="info" icon={<Info />}>
              <Typography variant="body2">
                {tabValue === 0 && 'Bruk profesjonelle lysmønstre med ett klikk. Hvert mønster inkluderer oppsettinstruksjoner og anbefalinger.'}
                {tabValue === 1 && 'Bla gjennom mønstre laget av fellesskapet. Oppdag unike lysoppsett delt av andre skapere.'}
                {tabValue === 2 && 'Dine egne lysmønstre. Lag nye mønstre fra publiseringsdialogen.'}
              </Typography>
            </Alert>

            {/* Search and Filters */}
            <Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Søk mønstre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      )}}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Tabs
                    value={difficultyFilter}
                    onChange={(_, value) => setDifficultyFilter(value)}
                    variant="scrollable"
                  >
                    <Tab label="Alle" value="all" />
                    <Tab label="Nybegynner" value="beginner" />
                    <Tab label="Middels" value="intermediate" />
                    <Tab label="Avansert" value="advanced" />
                  </Tabs>
                </Grid>
              </Grid>
            </Box>

            {/* Loading State */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Patterns Grid */}
            {!loading && (
              <Grid container spacing={2}>
                {filteredPatterns.map((pattern) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pattern.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Thumbnail Image */}
                      {pattern.thumbnailUrl && (
                        <Box
                          sx={{
                            width: '100%',
                            height: 200,
                            bgcolor: '#1a1a1a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative'}}
                        >
                          <img
                            src={pattern.thumbnailUrl}
                            alt={pattern.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'}}
                          />
                          {/* Difficulty Badge Overlay */}
                          <Chip
                            label={pattern.difficultyLevel}
                            size="small"
                            color={
                              pattern.difficultyLevel === 'beginner'
                                ? 'success'
                                : pattern.difficultyLevel === 'intermediate'
                                ? 'warning'
                                : 'error'
                            }
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              textTransform: 'capitalize'}}
                          />
                        </Box>
                      )}

                      <CardContent sx={{ flexGrow: 1 }}>
                        {/* Badges */}
                        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }} flexWrap="wrap">
                          {pattern.isFeatured && (
                            <Chip label="Featured" size="small" color="primary" icon={<Star />} />
                          )}
                          {pattern.isBeginnerFriendly && (
                            <Chip label="Beginner Friendly" size="small" color="success" />
                          )}
                        </Stack>

                        {/* Name */}
                        <Typography variant="h6" gutterBottom>
                          {pattern.name}
                        </Typography>

                        {/* Look Description */}
                        <Typography variant="body2" color="primary" gutterBottom fontWeight="bold">
                          {pattern.lookDescription}
                        </Typography>

                        {/* Description */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {pattern.description.length > 100
                            ? `${pattern.description.substring(0, 100)}...`
                            : pattern.description}
                        </Typography>

                        {/* When to Use */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Best for:
                          </Typography>
                          <Typography variant="body2">
                            {pattern.whenToUse}
                          </Typography>
                        </Box>

                        {/* Difficulty */}
                        <Chip
                          label={pattern.difficultyLevel}
                          size="small"
                          color={getDifficultyColor(pattern.difficultyLevel) as any}
                        />

                        {/* Stats */}
                        {pattern.usageCount > 0 && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Used {pattern.usageCount} times
                          </Typography>
                        )}
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewDetails(pattern)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={applying === pattern.id ? <CircularProgress size={16} /> : <PlayArrow />}
                          onClick={() => handleApply(pattern)}
                          disabled={applying === pattern.id}
                        >
                          {applying === pattern.id ? 'Applying...' : 'Apply'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Empty State */}
            {!loading && filteredPatterns.length === 0 && (
              <Alert severity="info">
                No lighting patterns found matching your filters.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Pattern Details Dialog */}
      {selectedPattern && (
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{selectedPattern.name}</Typography>
              <IconButton onClick={() => setShowDetails(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={3}>
              {/* Look Description */}
              <Alert severity="info" icon={<Info />}>
                <Typography variant="body2" fontWeight="bold">
                  {selectedPattern.lookDescription}
                </Typography>
              </Alert>

              {/* Description */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPattern.description}
                </Typography>
              </Box>

              {/* When to Use */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  When to Use
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPattern.whenToUse}
                </Typography>
              </Box>

              <Divider />

              {/* Setup Instructions */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Setup Instructions
                </Typography>
                <List dense>
                  {selectedPattern.setupInstructions.map((instruction, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={instruction} />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Light Configuration */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Light Configuration
                </Typography>
                <List dense>
                  {selectedPattern.lightSetup.map((light, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Lightbulb color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${light.name} (${light.role})`}
                        secondary={`${light.modifier} ${light.modifierSize} • Power: ${Math.round(light.power * 100)}% • Angle: ${light.angle}° • Distance: ${light.distance}m`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Subject Orientation */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Subject Orientation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPattern.subjectOrientation}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Distance from camera: {selectedPattern.subjectDistance}m
                </Typography>
              </Box>

              {/* Shadow Rules */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Shadow Characteristics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPattern.shadowRules}
                </Typography>
              </Box>

              <Divider />

              {/* Recommendations */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recommended Equipment
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {selectedPattern.recommendedModifiers.map((modifier, index) => (
                    <Chip key={index} label={modifier} size="small" sx={{ mb: 1 }} />
                  ))}
                </Stack>
              </Box>

              {/* HDRI Recommendations */}
              {selectedPattern.recommendedHdris.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended HDRIs
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedPattern.recommendedHdris.map((hdri, index) => (
                      <Chip key={index} label={hdri} size="small" variant="outlined" sx={{ mb: 1 }} />
                    ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Note: HDRI will not change automatically, but these are suggested options
                  </Typography>
                </Box>
              )}

              {/* Background Recommendations */}
              {selectedPattern.recommendedBackgrounds.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Backgrounds
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedPattern.recommendedBackgrounds.map((bg, index) => (
                      <Chip key={index} label={bg} size="small" variant="outlined" sx={{ mb: 1 }} />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Difficulty */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Difficulty Level
                </Typography>
                <Chip
                  label={selectedPattern.difficultyLevel}
                  color={getDifficultyColor(selectedPattern.difficultyLevel) as any}
                />
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowDetails(false)}>
              Back to Library
            </Button>
            <Button
              variant="contained"
              startIcon={applying === selectedPattern.id ? <CircularProgress size={16} /> : <PlayArrow />}
              onClick={() => handleApply(selectedPattern)}
              disabled={applying === selectedPattern.id}
            >
              {applying === selectedPattern.id ? 'Applying...' : 'Apply This Pattern'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

