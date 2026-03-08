import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { ContentCopy, Link as LinkIcon } from '@mui/icons-material';

interface StoryboardSharingDialogProps {
  open: boolean;
  onClose: () => void;
  storyboardId: string;
  storyboardName: string;
}

const storageKeyFor = (storyboardId: string): string => `storyboard-sharing:${storyboardId}`;

export const StoryboardSharingDialog: React.FC<StoryboardSharingDialogProps> = ({
  open,
  onClose,
  storyboardId,
  storyboardName,
}) => {
  const [isPublic, setIsPublic] = useState<boolean>(() => {
    const raw = localStorage.getItem(storageKeyFor(storyboardId));
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { isPublic?: boolean };
      return parsed.isPublic === true;
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/storyboard/${encodeURIComponent(storyboardId)}?public=${isPublic ? '1' : '0'}`;
  }, [storyboardId, isPublic]);

  const persist = (nextIsPublic: boolean): void => {
    localStorage.setItem(
      storageKeyFor(storyboardId),
      JSON.stringify({
        storyboardId,
        storyboardName,
        isPublic: nextIsPublic,
        updatedAt: new Date().toISOString(),
      }),
    );
  };

  const handleTogglePublic = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    setIsPublic(checked);
    persist(checked);
  };

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Storyboard</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {storyboardName}
          </Typography>

          <FormControlLabel
            control={<Switch checked={isPublic} onChange={handleTogglePublic} />}
            label={isPublic ? 'Public link enabled' : 'Private (invite only)'}
          />

          <TextField
            fullWidth
            size="small"
            label="Share URL"
            value={shareUrl}
            InputProps={{ readOnly: true }}
          />

          {copied && <Alert severity="success">Share link copied.</Alert>}
          {!isPublic && (
            <Alert severity="warning">
              Public access is disabled. Link is available for manual sharing but marked private.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<ContentCopy />} onClick={handleCopy}>
          Copy Link
        </Button>
        <Button
          variant="outlined"
          startIcon={<LinkIcon />}
          onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}
        >
          Open Link
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoryboardSharingDialog;
