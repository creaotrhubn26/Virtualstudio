import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import { Schedule } from '@mui/icons-material';
import { useCurrentStoryboard, type StoryboardFrame } from '../state/storyboardStore';

interface StoryboardTimelineProps {
  onFrameClick?: (frame: StoryboardFrame) => void;
  onFrameDoubleClick?: (frame: StoryboardFrame) => void;
}

const getFallbackImage = (index: number): string => {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
      <rect width="320" height="180" fill="#12121a"/>
      <rect x="12" y="12" width="296" height="156" fill="none" stroke="#2a2a3a"/>
      <text x="160" y="95" fill="#5a5a6f" font-size="20" text-anchor="middle" font-family="sans-serif">Shot ${index + 1}</text>
    </svg>`,
  )}`;
};

export const StoryboardTimeline: React.FC<StoryboardTimelineProps> = ({
  onFrameClick,
  onFrameDoubleClick,
}) => {
  const storyboard = useCurrentStoryboard();

  if (!storyboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No storyboard selected.</Typography>
      </Box>
    );
  }

  if (storyboard.frames.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No frames available for timeline.</Typography>
      </Box>
    );
  }

  const totalDuration = storyboard.frames.reduce((sum, frame) => sum + frame.duration, 0);

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Stack spacing={1.5}>
        {storyboard.frames.map((frame) => {
          const widthPercent = Math.max(6, (frame.duration / Math.max(totalDuration, 1)) * 100);

          return (
            <Paper
              key={frame.id}
              elevation={0}
              onClick={() => onFrameClick?.(frame)}
              onDoubleClick={() => onFrameDoubleClick?.(frame)}
              sx={{
                p: 1,
                bgcolor: '#1a1a2a',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: '#1f1f33',
                },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  component="img"
                  src={frame.thumbnailUrl || frame.imageUrl || getFallbackImage(frame.index)}
                  alt={frame.title}
                  sx={{ width: 88, height: 50, objectFit: 'cover', borderRadius: 1, bgcolor: '#101018' }}
                />

                <Box sx={{ minWidth: 120, maxWidth: 260 }}>
                  <Typography variant="subtitle2" sx={{ color: '#fff' }} noWrap>
                    {frame.title}
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip label={frame.shotType} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {frame.cameraAngle}
                    </Typography>
                  </Stack>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      height: 18,
                      borderRadius: 1,
                      bgcolor: '#101018',
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        background:
                          'linear-gradient(90deg, rgba(0,212,255,0.9) 0%, rgba(0,212,255,0.4) 100%)',
                      }}
                    />
                  </Box>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 70, justifyContent: 'flex-end' }}>
                  <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {frame.duration}s
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

export default StoryboardTimeline;
