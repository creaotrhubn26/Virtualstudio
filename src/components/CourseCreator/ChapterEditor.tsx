import React from 'react';
import {
  Stack,
  TextField,
  Box,
  Typography,
  Slider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { VideoChapter } from './types';
import { formatTimecode, parseTimecode, formatTime } from './utils';

interface ChapterEditorProps {
  chapter: VideoChapter | null;
  videoDuration: number;
  chapters: VideoChapter[];
  onChange: (chapter: VideoChapter) => void;
  isNew?: boolean;
}

export const ChapterEditor: React.FC<ChapterEditorProps> = ({
  chapter,
  videoDuration,
  chapters,
  onChange,
  isNew = false,
}) => {
  if (!chapter) return null;

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        fullWidth
        label="Tittel"
        value={chapter.title}
        onChange={(e) => onChange({ ...chapter, title: e.target.value })}
        required
      />
      <TextField
        fullWidth
        label="Beskrivelse (valgfritt)"
        value={chapter.description || ''}
        onChange={(e) => onChange({ ...chapter, description: e.target.value })}
        multiline
        rows={2}
      />
      <TextField
        fullWidth
        label="Timestamp"
        value={formatTimecode(chapter.timestamp)}
        onChange={(e) => {
          const seconds = parseTimecode(e.target.value);
          onChange({ ...chapter, timestamp: seconds });
        }}
        helperText="Format: HH:MM:SS.mmm eller MM:SS - Tidspunkt i videoen hvor kapitel starter"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => {
                  if (videoDuration > 0) {
                    const sortedChapters = [...chapters]
                      .filter((ch) => ch.id !== chapter.id)
                      .sort((a, b) => a.timestamp - b.timestamp);
                    const lastChapter = sortedChapters[sortedChapters.length - 1];
                    const nextTimestamp = lastChapter ? lastChapter.timestamp + 10 : 0;
                    onChange({ ...chapter, timestamp: nextTimestamp });
                  }
                }}
              >
                <AccessTime fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {videoDuration > 0 && (
        <Box>
          <Typography variant="body2" gutterBottom>
            Posisjon: {formatTime(chapter.timestamp)} / {formatTime(videoDuration)}
          </Typography>
          <Slider
            value={chapter.timestamp}
            onChange={(_, newValue) => {
              onChange({ ...chapter, timestamp: newValue as number });
            }}
            min={0}
            max={videoDuration}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatTime(value)}
            step={0.1}
          />
        </Box>
      )}
    </Stack>
  );
};


