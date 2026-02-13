/**
 * Cinematography Patterns Panel
 * 
 * Browse and apply 22+ Hollywood lighting patterns
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Divider,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Movie as FilmIcon,
  Portrait as PortraitIcon,
  Lightbulb as LightIcon,
  Star as StarIcon,
  CheckCircle as ApplyIcon,
} from '@mui/icons-material';
import { cinematographyPatternsService, type CinematographyPattern } from '@/core/services/cinematographyPatternsService';

interface CinematographyPatternsPanelProps {
  onApplyPattern: (pattern: CinematographyPattern) => void;
}

export function CinematographyPatternsPanel({ onApplyPattern }: CinematographyPatternsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const allPatterns = useMemo(() => {
    return cinematographyPatternsService.getAllPatterns();
  }, []);

  const filteredPatterns = useMemo(() => {
    let patterns = allPatterns;

    if (selectedCategory !== 'all') {
      patterns = patterns.filter(p => p.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      patterns = patterns.filter(p => p.difficulty === selectedDifficulty);
    }

    return patterns;
  }, [allPatterns, selectedCategory, selectedDifficulty]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'portrait':
        return <PortraitIcon fontSize="small" />;
      case 'dramatic':
      case 'film-noir':
        return <FilmIcon fontSize="small" />;
      case 'beauty':
        return <StarIcon fontSize="small" />;
      default:
        return <LightIcon fontSize="small" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '#4CAF50';
      case 'intermediate':
        return '#FF9800';
      case 'advanced':
        return '#F44336';
      case 'expert':
        return '#9C27B0';
      default:
        return '#9E9E9E';
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'bright':
      case 'high-key':
        return '#FFF9C4';
      case 'neutral':
        return '#E0E0E0';
      case 'dramatic':
        return '#BCAAA4';
      case 'dark':
      case 'low-key':
        return '#616161';
      default:
        return '#E0E0E0';
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: '#1c2128', border: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff' }}>
          {filteredPatterns.length} lysmønstre tilgjengelig
        </Typography>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#888' }}>Kategori</InputLabel>
          <Select
            value={selectedCategory}
            label="Kategori"
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.05)', 
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <MenuItem value="all">Alle kategorier</MenuItem>
            <MenuItem value="portrait">Portrett</MenuItem>
            <MenuItem value="dramatic">Dramatisk</MenuItem>
            <MenuItem value="commercial">Kommersiell</MenuItem>
            <MenuItem value="film-noir">Film Noir</MenuItem>
            <MenuItem value="beauty">Beauty</MenuItem>
            <MenuItem value="interview">Intervju</MenuItem>
            <MenuItem value="product">Produkt</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#888' }}>Vanskelighetsgrad</InputLabel>
          <Select
            value={selectedDifficulty}
            label="Vanskelighetsgrad"
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.05)', 
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <MenuItem value="all">Alle nivåer</MenuItem>
            <MenuItem value="beginner">Nybegynner</MenuItem>
            <MenuItem value="intermediate">Middels</MenuItem>
            <MenuItem value="advanced">Avansert</MenuItem>
            <MenuItem value="expert">Ekspert</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Patterns Grid */}
      <Box sx={{ maxHeight: 500, overflowY: 'auto', pr: 1 }}>
        <Grid container spacing={2}>
          {filteredPatterns.map((pattern) => (
            <Grid size={{ xs: 12, md: 6 }} key={pattern.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.05)', 
                  borderColor: 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,170,0,0.3)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {pattern.thumbnail && (
                  <CardMedia
                    component="img"
                    height="120"
                    image={pattern.thumbnail}
                    alt={pattern.name}
                    sx={{
                      objectFit: 'cover',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}
                  />
                )}
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Box sx={{ color: '#ffaa00' }}>
                      {getCategoryIcon(pattern.category)}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, color: '#fff' }}>
                      {pattern.name}
                    </Typography>
                    <Chip
                      label={pattern.difficulty}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: getDifficultyColor(pattern.difficulty),
                        color: 'white'
                      }}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: '#aaa', lineHeight: 1.4 }}>
                    {pattern.description}
                  </Typography>

                  <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip
                      label={`${pattern.keyToFillRatio}:1 ratio`}
                      size="small"
                      sx={{ height: 20, fontSize: 9, bgcolor: 'rgba(255,255,255,0.1)', color: '#ccc' }}
                    />
                    <Chip
                      label={pattern.mood}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 9,
                        bgcolor: getMoodColor(pattern.mood),
                        color: '#333'
                      }}
                    />
                    <Chip
                      icon={<LightIcon sx={{ fontSize: 12 }} />}
                      label={`${pattern.lights.length} lys`}
                      size="small"
                      sx={{ height: 20, fontSize: 9, bgcolor: 'rgba(255,170,0,0.2)', color: '#ffaa00' }}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ display: 'block', fontSize: 10, color: '#777', fontStyle: 'italic' }}>
                    Brukt i: {pattern.usedIn.slice(0, 2).join(', ')}
                  </Typography>
                </CardContent>

                <CardActions sx={{ pt: 0, px: 2, pb: 1.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ApplyIcon />}
                    onClick={() => onApplyPattern(pattern)}
                    fullWidth
                    sx={{ 
                      textTransform: 'none', 
                      fontSize: 12,
                      bgcolor: '#ffaa00',
                      color: '#000',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: '#ffbb33'
                      }
                    }}
                  >
                    Bruk dette mønsteret
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Summary */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255,170,0,0.1)', borderRadius: 1, border: '1px solid rgba(255,170,0,0.2)' }}>
        <Typography variant="caption" sx={{ color: '#ffaa00', display: 'block', fontWeight: 600 }}>
          Forskningsbaserte lysmønstre
        </Typography>
        <Typography variant="caption" sx={{ color: '#aaa', display: 'block', fontSize: 10, mt: 0.5 }}>
          Alle mønstre basert på ASC-standarder, "Film Lighting" av Malkiewicz, og "Painting with Light" av Alton
        </Typography>
      </Box>
    </Paper>
  );
}

