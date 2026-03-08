import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Paper,
  Alert,
  Divider,
} from '@mui/material';
import { Restore, Save } from '@mui/icons-material';
import { useCurrentStoryboard, useStoryboardStore, type Storyboard } from '../state/storyboardStore';

interface StoryboardVersion {
  id: string;
  storyboardId: string;
  createdAt: string;
  reason: 'auto' | 'manual';
  snapshot: Storyboard;
}

interface StoryboardVersionHistoryProps {
  storyboardId: string;
}

const storageKey = (storyboardId: string): string => `storyboard-versions:${storyboardId}`;

const loadVersions = (storyboardId: string): StoryboardVersion[] => {
  const raw = localStorage.getItem(storageKey(storyboardId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoryboardVersion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveVersions = (storyboardId: string, versions: StoryboardVersion[]): void => {
  localStorage.setItem(storageKey(storyboardId), JSON.stringify(versions));
};

const buildVersion = (storyboard: Storyboard, reason: 'auto' | 'manual'): StoryboardVersion => {
  return {
    id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storyboardId: storyboard.id,
    createdAt: new Date().toISOString(),
    reason,
    snapshot: JSON.parse(JSON.stringify(storyboard)) as Storyboard,
  };
};

export const StoryboardVersionHistory: React.FC<StoryboardVersionHistoryProps> = ({ storyboardId }) => {
  const currentStoryboard = useCurrentStoryboard();
  const [versions, setVersions] = useState<StoryboardVersion[]>(() => loadVersions(storyboardId));
  const [restoredVersionId, setRestoredVersionId] = useState<string | null>(null);

  const versionFingerprint = useMemo(() => {
    if (!currentStoryboard) {
      return '';
    }
    return `${currentStoryboard.updatedAt}-${currentStoryboard.frames.length}`;
  }, [currentStoryboard]);

  useEffect(() => {
    if (!currentStoryboard || currentStoryboard.id !== storyboardId) {
      return;
    }

    const current = loadVersions(storyboardId);
    const latest = current[0];
    const latestFingerprint = latest
      ? `${latest.snapshot.updatedAt}-${latest.snapshot.frames.length}`
      : '';

    if (versionFingerprint === latestFingerprint) {
      return;
    }

    const next = [buildVersion(currentStoryboard, 'auto'), ...current].slice(0, 25);
    setVersions(next);
    saveVersions(storyboardId, next);
  }, [storyboardId, currentStoryboard, versionFingerprint]);

  const handleManualSnapshot = (): void => {
    if (!currentStoryboard || currentStoryboard.id !== storyboardId) {
      return;
    }

    const next = [buildVersion(currentStoryboard, 'manual'), ...versions].slice(0, 25);
    setVersions(next);
    saveVersions(storyboardId, next);
  };

  const handleRestore = (version: StoryboardVersion): void => {
    useStoryboardStore.setState((state) => ({
      ...state,
      storyboards: state.storyboards.map((storyboard) =>
        storyboard.id === storyboardId
          ? {
              ...version.snapshot,
              updatedAt: new Date().toISOString(),
            }
          : storyboard,
      ),
      currentStoryboardId: storyboardId,
      selectedFrameId: null,
    }));

    setRestoredVersionId(version.id);
    setTimeout(() => setRestoredVersionId(null), 1500);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#151525' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
            Version History
          </Typography>
          <Button size="small" variant="outlined" startIcon={<Save />} onClick={handleManualSnapshot}>
            Snapshot
          </Button>
        </Stack>
      </Box>

      {restoredVersionId && (
        <Alert severity="success" sx={{ borderRadius: 0 }}>
          Version restored.
        </Alert>
      )}

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        <Stack spacing={1.25}>
          {versions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No versions saved yet.
            </Typography>
          )}

          {versions.map((version) => (
            <Paper key={version.id} elevation={0} sx={{ p: 1.25, bgcolor: '#1d1d32', border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                    {version.reason === 'manual' ? 'Manual snapshot' : 'Auto snapshot'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(version.createdAt).toLocaleString()}
                  </Typography>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  {version.snapshot.frames.length} frames
                </Typography>

                <Divider />
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Restore fontSize="small" />}
                  onClick={() => handleRestore(version)}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Restore this version
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default StoryboardVersionHistory;
