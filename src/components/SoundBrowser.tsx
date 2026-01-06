/**
 * Sound Browser Panel
 * Browse, search, and play sounds from the sound library
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  InputBase,
  IconButton,
  Chip,
  Slider,
  Tooltip,
  Button,
  Divider,
  Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeMute';
import LoopIcon from '@mui/icons-material/Loop';
import CloudIcon from '@mui/icons-material/Cloud';
import NightlightIcon from '@mui/icons-material/Nightlight';
import MovieIcon from '@mui/icons-material/Movie';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { SplitSheet } from './split-sheets/types';
import { ROLE_DISPLAY_NAMES } from './split-sheets/types';
import {
  SOUND_LIBRARY,
  SOUND_CATEGORIES,
  SoundCategory,
  SoundDefinition,
  getSoundsByCategory,
  searchSounds,
} from '../data/soundDefinitions';
import { audioService } from '../core/services/audioService';

const CATEGORY_ICONS: Record<SoundCategory, React.ReactNode> = {
  environment: <CloudIcon />,
  atmosphere: <NightlightIcon />,
  production: <MovieIcon />,
  practical: <MeetingRoomIcon />,
  ambience: <GraphicEqIcon />,
  music: <MusicNoteIcon />,
  ui: <TouchAppIcon />,
};

const MOOD_COLORS: Record<string, string> = {
  dark: '#4a1f4a',
  mysterious: '#1f3a4a',
  tense: '#4a2f1f',
  calm: '#1f4a2f',
  epic: '#4a3a1f',
  warm: '#4a321f',
  cold: '#1f2f4a',
};

interface PlayingSound {
  instanceId: string;
  definitionId: string;
  isPaused: boolean;
}

interface SoundBrowserProps {
  songflowTrackId?: string; // Optional SongFlow track ID for credits context
}

export function SoundBrowser({ songflowTrackId }: SoundBrowserProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSounds, setPlayingSounds] = useState<PlayingSound[]>([]);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['environment']));

  // Fetch split sheet data if songflowTrackId is provided (for credits/attribution)
  const { data: splitSheetData } = useQuery({
    queryKey: ['split-sheet-by-songflow-track', songflowTrackId],
    queryFn: async () => {
      if (!songflowTrackId) return null;
      const response = await apiRequest(`/api/split-sheets/by-songflow-track/${songflowTrackId}`);
      return response?.data as SplitSheet | null;
    },
    enabled: !!songflowTrackId,
  });

  // Filter sounds based on category and search
  const filteredSounds = useMemo(() => {
    let sounds = selectedCategory === 'all' 
      ? SOUND_LIBRARY 
      : getSoundsByCategory(selectedCategory);
    
    if (searchQuery.trim()) {
      const searchResults = searchSounds(searchQuery);
      sounds = sounds.filter(s => searchResults.some(r => r.id === s.id));
    }
    
    return sounds;
  }, [selectedCategory, searchQuery]);

  // Group sounds by subcategory
  const groupedSounds = useMemo(() => {
    const groups: Record<string, SoundDefinition[]> = {};
    filteredSounds.forEach(sound => {
      const key = `${sound.category}-${sound.subcategory}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(sound);
    });
    return groups;
  }, [filteredSounds]);

  const handlePlaySound = useCallback((sound: SoundDefinition) => {
    const existingIndex = playingSounds.findIndex(p => p.definitionId === sound.id);
    
    if (existingIndex >= 0) {
      // Toggle pause/resume
      const existing = playingSounds[existingIndex];
      if (existing.isPaused) {
        audioService.resumeSound(existing.instanceId);
        setPlayingSounds(prev => prev.map((p, i) => 
          i === existingIndex ? { ...p, isPaused: false } : p
        ));
      } else {
        audioService.pauseSound(existing.instanceId);
        setPlayingSounds(prev => prev.map((p, i) => 
          i === existingIndex ? { ...p, isPaused: true } : p
        ));
      }
    } else {
      // Play new sound
      const instanceId = audioService.playSound(sound.id, {
        volume: masterVolume,
        loop: sound.loop,
      });
      
      if (instanceId) {
        setPlayingSounds(prev => [...prev, {
          instanceId,
          definitionId: sound.id,
          isPaused: false,
        }]);
        
        // Remove from list when sound ends (for non-looping)
        if (!sound.loop) {
          setTimeout(() => {
            setPlayingSounds(prev => 
              prev.filter(p => p.instanceId !== instanceId)
            );
          }, sound.duration * 1000 + 500);
        }
      }
    }
  }, [playingSounds, masterVolume]);

  const handleStopSound = useCallback((definitionId: string) => {
    const playing = playingSounds.find(p => p.definitionId === definitionId);
    if (playing) {
      audioService.stopSound(playing.instanceId);
      setPlayingSounds(prev => prev.filter(p => p.definitionId !== definitionId));
    }
  }, [playingSounds]);

  const handleStopAll = useCallback(() => {
    audioService.stopAllSounds();
    setPlayingSounds([]);
  }, []);

  const handleMasterVolumeChange = useCallback((_: Event, value: number | number[]) => {
    const vol = value as number;
    setMasterVolume(vol);
    audioService.setMasterVolume(vol);
  }, []);

  const handleToggleMute = useCallback(() => {
    const newMuted = audioService.toggleMute();
    setIsMuted(newMuted);
  }, []);

  const toggleCategory = useCallback((key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isPlaying = useCallback((definitionId: string): boolean => {
    const playing = playingSounds.find(p => p.definitionId === definitionId);
    return playing !== undefined && !playing.isPaused;
  }, [playingSounds]);

  const isPaused = useCallback((definitionId: string): boolean => {
    const playing = playingSounds.find(p => p.definitionId === definitionId);
    return playing?.isPaused ?? false;
  }, [playingSounds]);

  return (
    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'transparent', color: '#fff' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 2,
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(147,51,234,0.15) 100%)',
        borderRadius: '14px',
        px: 2.5,
        py: 1.5,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
          boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
        }}>
          <GraphicEqIcon sx={{ fontSize: 24, color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>
            Lydbibliotek
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {SOUND_LIBRARY.length} lyder tilgjengelig
          </Typography>
        </Box>
      </Box>

      {/* Credits Section (when songflowTrackId is provided) - Shows name, role, and external links for exposure */}
      {songflowTrackId && splitSheetData && splitSheetData.contributors && splitSheetData.contributors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Card sx={{ bgcolor: '#1e1e1e', border: '1px solid #333', borderRadius: '10px' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon sx={{ color: '#7c3aed', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', fontSize: 16 }}>
                  Krediteringer & Eksponering
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                {splitSheetData.contributors.map((contributor, index) => (
                  <Box
                    key={contributor.id || index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      bgcolor: '#2a2a2a',
                      borderRadius: '8px',
                      border: '1px solid #444',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: '#7c3aed',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        {contributor.name ? contributor.name.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                          {contributor.name}
                        </Typography>
                        {contributor.role && (
                          <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>
                            <Chip
                              label={ROLE_DISPLAY_NAMES[contributor.role] || contributor.role}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: '#333',
                                color: '#aaa',
                              }}
                            />
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {contributor.custom_fields?.spotify_url && (
                        <Tooltip title="Spotify-profil">
                          <Link
                            href={contributor.custom_fields.spotify_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#1db954',
                              '&:hover': { color: '#1ed760' },
                            }}
                          >
                            <LanguageIcon sx={{ fontSize: 20 }} />
                            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                          </Link>
                        </Tooltip>
                      )}
                      {contributor.custom_fields?.instagram && (
                        <Tooltip title="Instagram">
                          <Link
                            href={`https://instagram.com/${contributor.custom_fields.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#E4405F',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            <LanguageIcon sx={{ fontSize: 20 }} />
                            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                          </Link>
                        </Tooltip>
                      )}
                      {contributor.custom_fields?.twitter && (
                        <Tooltip title="Twitter/X">
                          <Link
                            href={`https://twitter.com/${contributor.custom_fields.twitter.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#1DA1F2',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            <LanguageIcon sx={{ fontSize: 20 }} />
                            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                          </Link>
                        </Tooltip>
                      )}
                      {contributor.custom_fields?.facebook && (
                        <Tooltip title="Facebook">
                          <Link
                            href={contributor.custom_fields.facebook.startsWith('http') 
                              ? contributor.custom_fields.facebook 
                              : `https://facebook.com/${contributor.custom_fields.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#1877F2',
                              '&:hover': { opacity: 0.8 },
                            }}
                          >
                            <LanguageIcon sx={{ fontSize: 20 }} />
                            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
                          </Link>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Master Controls */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        p: 1.5,
        bgcolor: '#1e1e1e',
        borderRadius: '10px',
        border: '1px solid #333',
      }}>
        <IconButton onClick={handleToggleMute} size="small" sx={{ color: isMuted ? '#f44336' : '#7c3aed' }}>
          {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
        <Slider
          value={masterVolume}
          onChange={handleMasterVolumeChange}
          min={0}
          max={1}
          step={0.05}
          sx={{
            flex: 1,
            color: '#7c3aed',
            '& .MuiSlider-thumb': { width: 16, height: 16 },
          }}
        />
        <Typography variant="caption" sx={{ color: '#888', minWidth: 40 }}>
          {Math.round(masterVolume * 100)}%
        </Typography>
        {playingSounds.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleStopAll}
            startIcon={<StopIcon />}
            sx={{
              borderColor: '#f44336',
              color: '#f44336',
              fontSize: 12,
              '&:hover': { borderColor: '#d32f2f', bgcolor: 'rgba(244,67,54,0.1)' },
            }}
          >
            Stopp alle
          </Button>
        )}
      </Box>

      {/* Search */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#2a2a2a',
        borderRadius: '10px',
        px: 2,
        py: 0.5,
        mb: 2,
        border: '1px solid #444',
      }}>
        <SearchIcon sx={{ color: '#888', fontSize: 20, mr: 1 }} />
        <InputBase
          placeholder="Sok etter lyder..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            color: '#fff',
            fontSize: 14,
            flex: 1,
            '& input::placeholder': { color: '#666', opacity: 1 },
          }}
        />
      </Box>

      {/* Category Tabs */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          label="Alle"
          onClick={() => setSelectedCategory('all')}
          sx={{
            bgcolor: selectedCategory === 'all' ? '#7c3aed' : '#2a2a2a',
            color: '#fff',
            fontWeight: selectedCategory === 'all' ? 600 : 400,
            '&:hover': { bgcolor: selectedCategory === 'all' ? '#6d28d9' : '#3a3a3a' },
          }}
        />
        {SOUND_CATEGORIES.map(cat => (
          <Chip
            key={cat.id}
            icon={<Box sx={{ display: 'flex', color: 'inherit', ml: 1 }}>{CATEGORY_ICONS[cat.id]}</Box>}
            label={cat.nameNo}
            onClick={() => setSelectedCategory(cat.id)}
            sx={{
              bgcolor: selectedCategory === cat.id ? '#7c3aed' : '#2a2a2a',
              color: '#fff',
              fontWeight: selectedCategory === cat.id ? 600 : 400,
              '&:hover': { bgcolor: selectedCategory === cat.id ? '#6d28d9' : '#3a3a3a' },
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        ))}
      </Box>

      <Divider sx={{ borderColor: '#333', mb: 2 }} />

      {/* Sound List */}
      <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
        {Object.entries(groupedSounds).map(([key, sounds]) => {
          const [category, subcategory] = key.split('-');
          const isExpanded = expandedCategories.has(key);

          return (
            <Box key={key} sx={{ mb: 1 }}>
              <Box
                onClick={() => toggleCategory(key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: '#1e1e1e',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#252525' },
                }}
              >
                <Box sx={{ color: '#7c3aed' }}>{CATEGORY_ICONS[category as SoundCategory]}</Box>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#fff' }}>
                  {subcategory}
                </Typography>
                <Chip label={sounds.length} size="small" sx={{ bgcolor: '#333', color: '#888', height: 20 }} />
                {isExpanded ? <ExpandLessIcon sx={{ color: '#666' }} /> : <ExpandMoreIcon sx={{ color: '#666' }} />}
              </Box>

              <Collapse in={isExpanded}>
                <Box sx={{ pl: 2, pt: 1 }}>
                  {sounds.map(sound => (
                    <SoundCard
                      key={sound.id}
                      sound={sound}
                      isPlaying={isPlaying(sound.id)}
                      isPaused={isPaused(sound.id)}
                      onPlay={() => handlePlaySound(sound)}
                      onStop={() => handleStopSound(sound.id)}
                    />
                  ))}
                </Box>
              </Collapse>
            </Box>
          );
        })}

        {filteredSounds.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4, color: '#888' }}>
            <Typography variant="body2">Ingen lyder funnet</Typography>
            <Typography variant="caption">Prov et annet sok</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// Individual Sound Card Component
interface SoundCardProps {
  sound: SoundDefinition;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onStop: () => void;
}

function SoundCard({ sound, isPlaying, isPaused, onPlay, onStop }: SoundCardProps) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        mb: 1,
        bgcolor: isPlaying ? 'rgba(124,58,237,0.15)' : '#2a2a2a',
        borderRadius: '8px',
        border: isPlaying ? '1px solid #7c3aed' : '1px solid transparent',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: isPlaying ? 'rgba(124,58,237,0.2)' : '#333',
          borderColor: isPlaying ? '#9333ea' : '#444',
        },
      }}
    >
      {/* Play/Pause Button */}
      <IconButton
        onClick={onPlay}
        size="small"
        sx={{
          bgcolor: isPlaying ? '#7c3aed' : '#444',
          color: '#fff',
          width: 36,
          height: 36,
          '&:hover': { bgcolor: isPlaying ? '#6d28d9' : '#555' },
        }}
      >
        {isPlaying && !isPaused ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>

      {/* Sound Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sound.nameNo}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#888' }}>
            {formatDuration(sound.duration)}
          </Typography>
          {sound.loop && (
            <Tooltip title="Looper">
              <LoopIcon sx={{ fontSize: 14, color: '#666' }} />
            </Tooltip>
          )}
          {sound.spatial && (
            <Tooltip title="3D-lyd">
              <VolumeUpIcon sx={{ fontSize: 14, color: '#666' }} />
            </Tooltip>
          )}
          {sound.moodTags?.map(mood => (
            <Chip
              key={mood}
              label={mood}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: MOOD_COLORS[mood] || '#333',
                color: '#fff',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Stop Button (when playing) */}
      {(isPlaying || isPaused) && (
        <IconButton
          onClick={onStop}
          size="small"
          sx={{
            color: '#f44336',
            '&:hover': { bgcolor: 'rgba(244,67,54,0.1)' },
          }}
        >
          <StopIcon fontSize="small" />
        </IconButton>
      )}

      {/* Add to Scene Button */}
      <Tooltip title="Legg til i scene">
        <IconButton
          size="small"
          sx={{
            color: '#666',
            '&:hover': { color: '#7c3aed', bgcolor: 'rgba(124,58,237,0.1)' },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default SoundBrowser;

