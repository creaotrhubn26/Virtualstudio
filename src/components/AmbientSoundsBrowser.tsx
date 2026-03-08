/**
 * Ambient Sounds Browser
 * UI for managing environmental audio and soundscapes
 */

import {
  useState,
  useEffect,
  type FC } from 'react';
import Grid from '@mui/material/Grid';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

import {
  ambientSoundsService,
  AMBIENT_SOUNDS,
  SoundCategory,
  AmbientSoundDefinition,
} from '../services/AmbientSoundsService';

const SoundCard: FC<{
  sound: AmbientSoundDefinition;
  isPlaying: boolean;
  onToggle: () => void;
}> = ({ sound, isPlaying, onToggle }) => {
  const getCategoryColor = (category: SoundCategory) => {
    switch (category) {
      case 'urban': return '#00d4ff';
      case 'industrial': return '#ff6600';
      case 'weather': return '#4488ff';
      case 'nature': return '#44ff44';
      case 'horror': return '#ff0066';
      case 'scifi': return '#ff00ff';
      default: return '#888';
    }
  };

  return (
    <Card
      sx={{
        bgcolor: '#1e1e1e',
        border: isPlaying ? `2px solid ${getCategoryColor(sound.category)}` : '2px solid transparent',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: '#252525' },
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MusicNoteIcon sx={{ color: getCategoryColor(sound.category), fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', flex: 1 }}>
            {sound.nameNo}
          </Typography>
          <IconButton
            size="small"
            onClick={onToggle}
            sx={{ color: isPlaying ? '#00ff00' : '#888' }}
          >
            {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={sound.category}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: getCategoryColor(sound.category),
              color: '#fff',
            }}
          />
          {sound.loop && (
            <Chip
              label="Loop"
              size="small"
              sx={{ height: 18, fontSize: 10, bgcolor: '#333' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const AmbientSoundsBrowser: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | 'all'>('all');
  const [activeSounds, setActiveSounds] = useState<string[]>([]);
  const [masterVolume, setMasterVolume] = useState(1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Update active sounds list
    const interval = setInterval(() => {
      setActiveSounds(ambientSoundsService.getActiveSounds());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const categories: { value: SoundCategory | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'Alle', color: '#888' },
    { value: 'urban', label: 'Urban', color: '#00d4ff' },
    { value: 'industrial', label: 'Industriell', color: '#ff6600' },
    { value: 'weather', label: 'Vær', color: '#4488ff' },
    { value: 'nature', label: 'Natur', color: '#44ff44' },
    { value: 'horror', label: 'Skrekk', color: '#ff0066' },
    { value: 'scifi', label: 'Sci-Fi', color: '#ff00ff' },
    { value: 'interior', label: 'Interiør', color: '#ffaa00' },
    { value: 'ambient', label: 'Ambient', color: '#aaaaaa' },
  ];

  const filteredSounds = AMBIENT_SOUNDS.filter(s => {
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleToggleSound = (soundId: string) => {
    if (!initialized) {
      ambientSoundsService.initialize();
      setInitialized(true);
    }

    if (activeSounds.includes(soundId)) {
      ambientSoundsService.stopSound(soundId);
    } else {
      ambientSoundsService.playSound(soundId);
    }
  };

  const handleStopAll = () => {
    ambientSoundsService.stopAllSounds();
  };

  const handleVolumeChange = (_: Event, value: number | number[]) => {
    const vol = value as number;
    setMasterVolume(vol);
    ambientSoundsService.setMasterVolume(vol);
  };

  // Load soundscape for urban environments
  const handleLoadUrbanSoundscape = () => {
    if (!initialized) {
      ambientSoundsService.initialize();
      setInitialized(true);
    }
    ambientSoundsService.setSoundscape([
      'traffic-distant',
      'city-ambient',
      'rain-light',
      'neon-hum',
    ]);
  };

  const handleLoadIndustrialSoundscape = () => {
    if (!initialized) {
      ambientSoundsService.initialize();
      setInitialized(true);
    }
    ambientSoundsService.setSoundscape([
      'hvac-hum',
      'machinery-distant',
      'fluorescent-buzz',
    ]);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#141414', color: '#fff' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <VolumeUpIcon sx={{ color: '#00d4ff' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Ambient lyder</Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Stopp alle lyder">
            <IconButton size="small" onClick={handleStopAll}>
              <DeleteSweepIcon sx={{ color: '#ff4444' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Master Volume */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <VolumeUpIcon sx={{ color: '#888', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: '#888' }}>
              Hovedvolum ({Math.round(masterVolume * 100)}%)
            </Typography>
          </Box>
          <Slider
            value={masterVolume}
            onChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.05}
            sx={{
              color: '#00d4ff',
              '& .MuiSlider-thumb': { width: 12, height: 12 },
            }}
          />
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Søk lyder..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#1e1e1e',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            },
          }}
        />
      </Box>

      {/* Quick Soundscapes */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
          Hurtig-soundscapes
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleLoadUrbanSoundscape}
            sx={{ borderColor: '#00d4ff', color: '#00d4ff', fontSize: 11 }}
          >
            Urban natt
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleLoadIndustrialSoundscape}
            sx={{ borderColor: '#ff6600', color: '#ff6600', fontSize: 11 }}
          >
            Industriell
          </Button>
        </Box>
      </Box>

      {/* Category Chips */}
      <Box sx={{ p: 1, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 0.5, flexWrap: 'wrap', overflowX: 'auto' }}>
        {categories.map(cat => (
          <Chip
            key={cat.value}
            label={cat.label}
            size="small"
            onClick={() => setSelectedCategory(cat.value)}
            sx={{
              bgcolor: selectedCategory === cat.value ? cat.color : '#252525',
              color: '#fff',
              '&:hover': { bgcolor: selectedCategory === cat.value ? cat.color : '#303030' },
            }}
          />
        ))}
      </Box>

      {/* Currently Playing */}
      {activeSounds.length > 0 && (
        <Box sx={{ p: 1.5, bgcolor: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="caption" sx={{ color: '#888', mb: 0.5, display: 'block' }}>
            Spiller nå ({activeSounds.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {activeSounds.map(soundId => {
              const sound = AMBIENT_SOUNDS.find(s => s.id === soundId);
              return sound ? (
                <Chip
                  key={soundId}
                  label={sound.nameNo}
                  size="small"
                  onDelete={() => handleToggleSound(soundId)}
                  sx={{ bgcolor: '#1e1e1e', color: '#00ff00' }}
                />
              ) : null;
            })}
          </Box>
        </Box>
      )}

      {/* Sound List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Grid container spacing={1}>
          {filteredSounds.map(sound => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={sound.id}>
              <SoundCard
                sound={sound}
                isPlaying={activeSounds.includes(sound.id)}
                onToggle={() => handleToggleSound(sound.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default AmbientSoundsBrowser;
