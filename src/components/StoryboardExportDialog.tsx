import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { useCurrentStoryboard } from '../state/storyboardStore';

type ExportFormat = 'json' | 'csv' | 'html';

interface StoryboardExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const downloadTextFile = (filename: string, content: string, contentType: string): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const StoryboardExportDialog: React.FC<StoryboardExportDialogProps> = ({ open, onClose }) => {
  const storyboard = useCurrentStoryboard();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);

  const frameCount = storyboard?.frames.length ?? 0;
  const disabled = !storyboard || frameCount === 0 || isExporting;

  const exportSummary = useMemo(() => {
    if (!storyboard) {
      return 'No storyboard selected.';
    }

    const totalDuration = storyboard.frames.reduce((sum, frame) => sum + frame.duration, 0);
    return `${storyboard.name} · ${storyboard.frames.length} frames · ${totalDuration}s total`;
  }, [storyboard]);

  const exportStoryboard = async (): Promise<void> => {
    if (!storyboard) {
      return;
    }

    setIsExporting(true);
    try {
      const safeName = storyboard.name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();

      if (format === 'json') {
        const json = JSON.stringify(storyboard, null, 2);
        downloadTextFile(`${safeName}_storyboard.json`, json, 'application/json');
      }

      if (format === 'csv') {
        const header = [
          'index',
          'title',
          'shotType',
          'cameraAngle',
          'cameraMovement',
          'duration',
          'status',
          'description',
        ];

        const rows = storyboard.frames.map((frame) => {
          const values = [
            String(frame.index + 1),
            frame.title,
            frame.shotType,
            frame.cameraAngle,
            frame.cameraMovement,
            String(frame.duration),
            frame.status,
            frame.description || '',
          ];

          return values
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(',');
        });

        downloadTextFile(
          `${safeName}_storyboard.csv`,
          [header.join(','), ...rows].join('\n'),
          'text/csv;charset=utf-8',
        );
      }

      if (format === 'html') {
        const frameMarkup = storyboard.frames
          .map(
            (frame) => `
              <article class="frame">
                <img src="${frame.thumbnailUrl || frame.imageUrl || ''}" alt="${frame.title}" />
                <h3>${frame.index + 1}. ${frame.title}</h3>
                <p>${frame.shotType} · ${frame.cameraAngle} · ${frame.duration}s</p>
                <small>${frame.description || ''}</small>
              </article>
            `,
          )
          .join('');

        const html = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${storyboard.name} - Storyboard Export</title>
<style>
body { font-family: system-ui, sans-serif; background:#10121a; color:#f1f5f9; margin:0; padding:24px; }
h1 { margin:0 0 4px; }
p.meta { color:#94a3b8; margin:0 0 24px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
.frame { border:1px solid #334155; border-radius:8px; padding:12px; background:#111827; }
.frame img { width:100%; height:136px; object-fit:cover; border-radius:6px; background:#0f172a; }
.frame h3 { margin:10px 0 4px; font-size:14px; }
.frame p { margin:0 0 6px; color:#cbd5e1; font-size:12px; }
.frame small { color:#94a3b8; }
</style>
</head>
<body>
<h1>${storyboard.name}</h1>
<p class="meta">${frameCount} frames</p>
<section class="grid">${frameMarkup}</section>
</body>
</html>`;

        downloadTextFile(`${safeName}_storyboard.html`, html, 'text/html;charset=utf-8');
      }

      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !isExporting && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Export Storyboard</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">{exportSummary}</Alert>

          <FormControl fullWidth size="small">
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              label="Format"
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
              disabled={isExporting}
            >
              <MenuItem value="json">JSON (full data)</MenuItem>
              <MenuItem value="csv">CSV (shot sheet)</MenuItem>
              <MenuItem value="html">HTML (shareable view)</MenuItem>
            </Select>
          </FormControl>

          {!storyboard && (
            <Typography variant="body2" color="text.secondary">
              Select a storyboard first.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={exportStoryboard}
          disabled={disabled}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoryboardExportDialog;
