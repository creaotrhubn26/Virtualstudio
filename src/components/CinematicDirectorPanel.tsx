import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Movie,
  CameraAlt,
  Landscape,
} from '@mui/icons-material';
import { cinematicDirectorService, CinematicShot, CinematicState } from '../services/cinematicDirectorService';

interface CinematicDirectorPanelProps {
  sceneType?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  establishing: '#4ade80',
  movement: '#60a5fa',
  dramatic: '#f472b6',
  character: '#fb923c',
  product: '#a78bfa',
};

const CATEGORY_LABELS: Record<string, string> = {
  establishing: 'Etablering',
  movement: 'Bevegelse',
  dramatic: 'Dramatisk',
  character: 'Karakter',
  product: 'Produkt',
};

export const CinematicDirectorPanel: React.FC<CinematicDirectorPanelProps> = ({
  sceneType = 'all',
}) => {
  const [state, setState] = useState<CinematicState>(cinematicDirectorService.getState());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    return cinematicDirectorService.onStateChange(setState);
  }, []);

  const shots = cinematicDirectorService.getShotsForScene(sceneType);

  const categories = ['all', ...Array.from(new Set(shots.map((s) => s.category)))];

  const filteredShots = selectedCategory === 'all'
    ? shots
    : shots.filter((s) => s.category === selectedCategory);

  const handlePlay = (shot: CinematicShot) => {
    if (state.isPlaying && state.currentShotId === shot.id) {
      cinematicDirectorService.stop();
    } else {
      cinematicDirectorService.playShot(shot.id);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Movie sx={{ color: '#a78bfa', fontSize: 18 }} />
        <Typography sx={{ color: '#c4b5fd', fontWeight: 700, fontSize: 13 }}>
          Cinematisk Direktør
        </Typography>
        {state.isPlaying && (
          <Chip
            label="SPILLER"
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.3)',
              fontSize: 10,
              height: 20,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          />
        )}
      </Box>

      {/* Progress bar */}
      {state.isPlaying && (
        <Box sx={{ mb: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={state.progress * 100}
            sx={{
              height: 3,
              borderRadius: 2,
              bgcolor: 'rgba(167,139,250,0.15)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#a78bfa',
                borderRadius: 2,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.3 }}>
            <Typography sx={{ color: '#7c6dc4', fontSize: 10 }}>
              {shots.find((s) => s.id === state.currentShotId)?.name}
            </Typography>
            <Typography sx={{ color: '#7c6dc4', fontSize: 10, fontFamily: 'monospace' }}>
              {Math.round(state.progress * 100)}%
            </Typography>
          </Box>
        </Box>
      )}

      {/* Category filter */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat === 'all' ? 'Alle' : (CATEGORY_LABELS[cat] ?? cat)}
            size="small"
            onClick={() => setSelectedCategory(cat)}
            sx={{
              height: 22,
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
              bgcolor: selectedCategory === cat
                ? (cat === 'all' ? 'rgba(167,139,250,0.25)' : `${CATEGORY_COLORS[cat]}22`)
                : 'rgba(255,255,255,0.05)',
              color: selectedCategory === cat
                ? (cat === 'all' ? '#c4b5fd' : CATEGORY_COLORS[cat])
                : '#6b7280',
              border: selectedCategory === cat
                ? `1px solid ${cat === 'all' ? 'rgba(167,139,250,0.4)' : `${CATEGORY_COLORS[cat]}55`}`
                : '1px solid rgba(255,255,255,0.08)',
              '&:hover': { opacity: 0.85 },
            }}
          />
        ))}
      </Box>

      {/* Shot list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {filteredShots.map((shot) => {
          const isActive = state.currentShotId === shot.id;
          const catColor = CATEGORY_COLORS[shot.category] ?? '#9ca3af';

          return (
            <Box
              key={shot.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: '7px 10px',
                borderRadius: '9px',
                background: isActive
                  ? 'rgba(167,139,250,0.12)'
                  : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? '1px solid rgba(167,139,250,0.4)'
                  : '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}
            >
              <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{shot.icon}</Typography>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: isActive ? '#e9d5ff' : '#d1d5db',
                    fontSize: 12.5,
                    fontWeight: isActive ? 700 : 500,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {shot.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.2 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: catColor,
                      opacity: 0.7,
                    }}
                  />
                  <Typography sx={{ color: '#6b7280', fontSize: 10.5 }}>
                    {CATEGORY_LABELS[shot.category] ?? shot.category} · {shot.duration}s
                  </Typography>
                </Box>
              </Box>

              <Tooltip title={isActive ? 'Stopp' : shot.description} arrow>
                <IconButton
                  size="small"
                  onClick={() => handlePlay(shot)}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: isActive
                      ? 'rgba(239,68,68,0.2)'
                      : 'rgba(167,139,250,0.15)',
                    color: isActive ? '#f87171' : '#a78bfa',
                    border: isActive
                      ? '1px solid rgba(239,68,68,0.35)'
                      : '1px solid rgba(167,139,250,0.3)',
                    '&:hover': {
                      bgcolor: isActive
                        ? 'rgba(239,68,68,0.3)'
                        : 'rgba(167,139,250,0.28)',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.15s',
                  }}
                >
                  {isActive ? <Stop sx={{ fontSize: 14 }} /> : <PlayArrow sx={{ fontSize: 15 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
      </Box>

      {/* Stop all button */}
      {state.isPlaying && (
        <Box
          onClick={() => cinematicDirectorService.stop()}
          sx={{
            mt: 1.5,
            p: '8px',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            '&:hover': { background: 'rgba(239,68,68,0.2)' },
            transition: 'background 0.15s',
          }}
        >
          <Stop sx={{ color: '#f87171', fontSize: 16 }} />
          <Typography sx={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>
            Stopp animasjon
          </Typography>
        </Box>
      )}

      {/* Tip */}
      {!state.isPlaying && (
        <Box sx={{
          mt: 1.5,
          p: '8px 12px',
          borderRadius: '8px',
          bgcolor: 'rgba(167,139,250,0.04)',
          border: '1px solid rgba(167,139,250,0.1)',
        }}>
          <Typography sx={{ color: '#6b5e9e', fontSize: 10.5, lineHeight: 1.5 }}>
            💡 Klikk spill-knappen for å starte en kinematisk kamera-sekvens. 
            Last inn en scene-preset for å låse opp scene-spesifikke shots.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CinematicDirectorPanel;
