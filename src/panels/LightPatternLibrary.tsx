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
import Grid from '@mui/material/Grid';
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
    ratingCount: 156,
    thumbnailUrl: '/pattern-thumbnails/rembrandt_lighting_pattern_diagram.png'
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
    ratingCount: 89,
    thumbnailUrl: '/pattern-thumbnails/butterfly_lighting_pattern_diagram.png'
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
    ratingCount: 45,
    thumbnailUrl: '/pattern-thumbnails/split_lighting_pattern_diagram.png'
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
    ratingCount: 134,
    thumbnailUrl: '/pattern-thumbnails/loop_lighting_pattern_diagram.png'
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
    ratingCount: 67,
    thumbnailUrl: '/pattern-thumbnails/clamshell_lighting_pattern_diagram.png'
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
    ratingCount: 289,
    thumbnailUrl: '/pattern-thumbnails/three-point_lighting_diagram.png'
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
    ratingCount: 56,
    thumbnailUrl: '/pattern-thumbnails/high-key_lighting_diagram.png'
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
    ratingCount: 112,
    thumbnailUrl: '/pattern-thumbnails/film_noir_lighting_diagram.png'
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
      <Dialog 
        open={open && !showDetails} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            borderRadius: 3,
            border: '2px solid rgba(0,212,255,0.3)',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Lightbulb sx={{ color: '#00d4ff', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#00d4ff', fontWeight: 600 }}>
                  Fotomønstre Bibliotek
                </Typography>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  Profesjonelle lysoppsett for portrett og studio
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: '#999' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#1c2128', borderColor: 'rgba(255,255,255,0.1)' }}>
          <Stack spacing={3}>
            {/* Tabs: Professional / Community / My Patterns */}
            <Tabs 
              value={tabValue} 
              onChange={(_, value) => setTabValue(value)} 
              variant="fullWidth"
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                '& .MuiTab-root': { color: '#888' },
                '& .Mui-selected': { color: '#00d4ff' },
                '& .MuiTabs-indicator': { bgcolor: '#00d4ff' }
              }}
            >
              <Tab label="Profesjonelle Mønstre" />
              <Tab label="Fellesskap Mønstre" />
              <Tab label="Mine Mønstre" />
            </Tabs>

            {/* Header Info */}
            <Alert 
              severity="info" 
              icon={<Info sx={{ color: '#00d4ff' }} />}
              sx={{ 
                bgcolor: 'rgba(0,212,255,0.1)', 
                border: '1px solid rgba(0,212,255,0.2)',
                '& .MuiAlert-message': { color: '#ccc' }
              }}
            >
              <Typography variant="body2">
                {tabValue === 0 && 'Bruk profesjonelle lysmønstre med ett klikk. Hvert mønster inkluderer oppsettinstruksjoner og anbefalinger.'}
                {tabValue === 1 && 'Bla gjennom mønstre laget av fellesskapet. Oppdag unike lysoppsett delt av andre skapere.'}
                {tabValue === 2 && 'Dine egne lysmønstre. Lag nye mønstre fra publiseringsdialogen.'}
              </Typography>
            </Alert>

            {/* Search and Filters */}
            <Box>
              <Grid container spacing={2} alignItems="center">
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
                          <Search sx={{ color: '#666' }} />
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(0,212,255,0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                      },
                      '& .MuiInputBase-input': { color: '#fff' }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Tabs
                    value={difficultyFilter}
                    onChange={(_, value) => setDifficultyFilter(value)}
                    variant="scrollable"
                    sx={{
                      '& .MuiTab-root': { color: '#888', minWidth: 80 },
                      '& .Mui-selected': { color: '#00d4ff' },
                      '& .MuiTabs-indicator': { bgcolor: '#00d4ff' }
                    }}
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
                    <Card sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)',
                        borderColor: 'rgba(0,212,255,0.3)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
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
                            <Chip label="Anbefalt" size="small" color="primary" icon={<Star />} />
                          )}
                          {pattern.isBeginnerFriendly && (
                            <Chip label="Nybegynnervennlig" size="small" color="success" />
                          )}
                        </Stack>

                        {/* Name */}
                        <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
                          {pattern.name}
                        </Typography>

                        {/* Look Description */}
                        <Typography variant="body2" sx={{ color: '#00d4ff', mb: 1 }} fontWeight="bold">
                          {pattern.lookDescription}
                        </Typography>

                        {/* Description */}
                        <Typography variant="body2" sx={{ color: '#aaa', mb: 2 }}>
                          {pattern.description.length > 100
                            ? `${pattern.description.substring(0, 100)}...`
                            : pattern.description}
                        </Typography>

                        {/* When to Use */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#888' }} display="block" gutterBottom>
                            Beste for:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#ccc' }}>
                            {pattern.whenToUse}
                          </Typography>
                        </Box>

                        {/* Difficulty */}
                        <Chip
                          label={pattern.difficultyLevel}
                          size="small"
                          color={getDifficultyColor(pattern.difficultyLevel) as any}
                          sx={{ textTransform: 'capitalize' }}
                        />

                        {/* Stats */}
                        {pattern.usageCount > 0 && (
                          <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                            Brukt {pattern.usageCount} ganger
                          </Typography>
                        )}
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewDetails(pattern)}
                          sx={{ color: '#888' }}
                        >
                          Detaljer
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={applying === pattern.id ? <CircularProgress size={16} /> : <PlayArrow />}
                          onClick={() => handleApply(pattern)}
                          disabled={applying === pattern.id}
                          sx={{
                            bgcolor: '#00d4ff',
                            color: '#000',
                            fontWeight: 600,
                            '&:hover': { bgcolor: '#33ddff' }
                          }}
                        >
                          {applying === pattern.id ? 'Bruker...' : 'Bruk'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Empty State */}
            {!loading && filteredPatterns.length === 0 && (
              <Alert 
                severity="info"
                sx={{ 
                  bgcolor: 'rgba(0,212,255,0.1)', 
                  border: '1px solid rgba(0,212,255,0.2)',
                  '& .MuiAlert-message': { color: '#ccc' }
                }}
              >
                Ingen lysmønstre funnet med disse filtrene.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderColor: '#555', color: '#999' }}>
            Lukk
          </Button>
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

