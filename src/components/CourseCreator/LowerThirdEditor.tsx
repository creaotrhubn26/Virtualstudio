import React from 'react';
import {
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Slider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { LowerThird } from './types';
import { formatTimecode, parseTimecode, formatTime } from './utils';

interface LowerThirdEditorProps {
  lowerThird: LowerThird | null;
  videoDuration: number;
  onChange: (lowerThird: LowerThird) => void;
  isNew?: boolean;
}

export const LowerThirdEditor: React.FC<LowerThirdEditorProps> = ({
  lowerThird,
  videoDuration,
  onChange,
  isNew = false,
}) => {
  if (!lowerThird) return null;

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      <TextField
        fullWidth
        label="Hovedtekst"
        value={lowerThird.mainText}
        onChange={(e) => onChange({ ...lowerThird, mainText: e.target.value })}
        required
      />
      <TextField
        fullWidth
        label="Undertekst (valgfritt)"
        value={lowerThird.subText || ''}
        onChange={(e) => onChange({ ...lowerThird, subText: e.target.value })}
      />
      <Stack direction="row" spacing={2}>
        <TextField
          fullWidth
          label="Start tid"
          value={formatTimecode(lowerThird.startTime)}
          onChange={(e) => {
            const seconds = parseTimecode(e.target.value);
            onChange({ ...lowerThird, startTime: seconds });
          }}
          helperText="Format: HH:MM:SS.mmm eller MM:SS"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    if (videoDuration > 0) {
                      onChange({ ...lowerThird, startTime: 0 });
                    }
                  }}
                >
                  <AccessTime fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          label="Slutt tid"
          value={formatTimecode(lowerThird.endTime)}
          onChange={(e) => {
            const seconds = parseTimecode(e.target.value);
            onChange({ ...lowerThird, endTime: seconds });
          }}
          helperText="Format: HH:MM:SS.mmm eller MM:SS"
        />
      </Stack>
      <Box>
        <Typography variant="body2" gutterBottom>
          Varighet: {formatTime(lowerThird.endTime - lowerThird.startTime)}
        </Typography>
        <Slider
          value={[lowerThird.startTime, lowerThird.endTime]}
          onChange={(_, newValue) => {
            if (Array.isArray(newValue)) {
              onChange({
                ...lowerThird,
                startTime: newValue[0],
                endTime: newValue[1],
              });
            }
          }}
          min={0}
          max={videoDuration || 100}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => formatTime(value)}
          step={0.1}
        />
      </Box>
      <FormControl fullWidth>
        <InputLabel>Posisjon</InputLabel>
        <Select
          value={lowerThird.position}
          onChange={(e) => {
            onChange({
              ...lowerThird,
              position: e.target.value as 'bottom-left' | 'bottom-center' | 'bottom-right',
            });
          }}
          label="Posisjon"
        >
          <MenuItem value="bottom-left">Nederst venstre</MenuItem>
          <MenuItem value="bottom-center">Nederst senter</MenuItem>
          <MenuItem value="bottom-right">Nederst høyre</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ pt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Stilinnstillinger
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Font størrelse"
            type="number"
            value={lowerThird.style.fontSize}
            onChange={(e) => {
              onChange({
                ...lowerThird,
                style: { ...lowerThird.style, fontSize: Number(e.target.value) },
              });
            }}
            inputProps={{ min: 8, max: 72, step: 1 }}
          />
          <FormControl fullWidth>
            <InputLabel>Font familie</InputLabel>
            <Select
              value={lowerThird.style.fontFamily}
              onChange={(e) => {
                onChange({
                  ...lowerThird,
                  style: { ...lowerThird.style, fontFamily: e.target.value },
                });
              }}
              label="Font familie"
            >
              <MenuItem value="Arial">Arial</MenuItem>
              <MenuItem value="Helvetica">Helvetica</MenuItem>
              <MenuItem value="Times New Roman">Times New Roman</MenuItem>
              <MenuItem value="Courier New">Courier New</MenuItem>
              <MenuItem value="Verdana">Verdana</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Tekst farge"
            type="color"
            value={lowerThird.style.textColor}
            onChange={(e) => {
              onChange({
                ...lowerThird,
                style: { ...lowerThird.style, textColor: e.target.value },
              });
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Bakgrunn farge"
            type="color"
            value={lowerThird.style.backgroundColor}
            onChange={(e) => {
              onChange({
                ...lowerThird,
                style: { ...lowerThird.style, backgroundColor: e.target.value },
              });
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Opacity: {Math.round(lowerThird.style.opacity * 100)}%
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption">0%</Typography>
            <Slider
              value={lowerThird.style.opacity}
              onChange={(_, newValue) => {
                onChange({
                  ...lowerThird,
                  style: { ...lowerThird.style, opacity: newValue as number },
                });
              }}
              min={0}
              max={1}
              step={0.1}
              sx={{ flex: 1 }}
            />
            <Typography variant="caption">100%</Typography>
          </Stack>
        </Box>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Animasjon</InputLabel>
          <Select
            value={lowerThird.style.animation}
            onChange={(e) => {
              onChange({
                ...lowerThird,
                style: {
                  ...lowerThird.style,
                  animation: e.target.value as 'fade' | 'slide' | 'none',
                },
              });
            }}
            label="Animasjon"
          >
            <MenuItem value="fade">Fade</MenuItem>
            <MenuItem value="slide">Slide</MenuItem>
            <MenuItem value="none">Ingen</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Preview */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          Forhåndsvisning
        </Typography>
        <Box
          sx={{
            position: 'relative',
            height: 100,
            bgcolor: 'background.paper',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent:
              lowerThird.position === 'bottom-left'
                ? 'flex-start'
                : lowerThird.position === 'bottom-right'
                ? 'flex-end'
                : 'center',
            p: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: lowerThird.style.backgroundColor,
              color: lowerThird.style.textColor,
              p: 1.5,
              borderRadius: 1,
              opacity: lowerThird.style.opacity,
              fontSize: `${lowerThird.style.fontSize}px`,
              fontFamily: lowerThird.style.fontFamily,
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              {lowerThird.mainText || 'Hovedtekst'}
            </Typography>
            {lowerThird.subText && (
              <Typography variant="caption">{lowerThird.subText}</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Stack>
  );
};


















