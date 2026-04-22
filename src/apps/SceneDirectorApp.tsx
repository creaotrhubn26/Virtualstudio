/**
 * SceneDirectorApp — minimal UI for the script → scene pipeline.
 *
 * A standalone island: give it a container (#sceneDirectorRoot) and it
 * renders a small form where the user describes one scene beat, clicks
 * "Generer scene", and either previews the resulting assembly or applies
 * it directly to the live Babylon scene.
 *
 * For v1 we skip Fountain parsing entirely — the form fields map 1:1 to
 * the Scene Director's `BeatInput` contract. A future iteration can wire
 * this to ScreenplayEditor so the whole script becomes a sequence of
 * scenes.
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  directFromBeat,
  getDirectorStatus,
  type BeatInput,
  type DirectorStatus,
  type SceneAssembly,
} from '../services/sceneDirectorClient';
import { applySceneAssembly } from '../services/applySceneAssembly';
import { PanelLoadingFallback } from './shared';

const INT_EXT_OPTIONS = ['INT', 'EXT'] as const;
const TIME_OPTIONS = ['DAY', 'DUSK', 'MAGIC HOUR', 'NIGHT', 'DAWN'] as const;
const MOOD_OPTIONS = [
  '', // auto
  'tense',
  'romantic',
  'horror',
  'comedic',
  'melancholy',
  'grand',
  'cozy',
] as const;

const SceneDirectorApp: React.FC = () => {
  const [location, setLocation] = useState('Cozy café');
  const [intExt, setIntExt] = useState<'INT' | 'EXT'>('INT');
  const [timeOfDay, setTimeOfDay] = useState<string>('DAY');
  const [charactersCSV, setCharactersCSV] = useState('Anna');
  const [action, setAction] = useState(
    'Anna sits alone at a window table, stirring her coffee slowly.',
  );
  const [dialogue, setDialogue] = useState('');
  const [mood, setMood] = useState<string>('');

  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assembly, setAssembly] = useState<SceneAssembly | null>(null);
  const [applyStatus, setApplyStatus] = useState<string | null>(null);
  const [status, setStatus] = useState<DirectorStatus | null>(null);

  // Expose a window event-based toggle so anyone can open the panel from
  // anywhere (e.g. a toolbar button in ScreenplayEditor's parent).
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handleToggle = () => setVisible((prev) => !prev);
    window.addEventListener('toggle-scene-director', handleToggle);
    return () => window.removeEventListener('toggle-scene-director', handleToggle);
  }, []);

  useEffect(() => {
    getDirectorStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!visible) return null;

  const onReferenceUpload = (file: File | null) => {
    if (!file) {
      setReferenceImage(null);
      setReferenceFileName(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Referansebilde er for stort (maks 5 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReferenceImage(reader.result);
        setReferenceFileName(file.name);
        setError(null);
      }
    };
    reader.onerror = () => setError('Klarte ikke å lese filen');
    reader.readAsDataURL(file);
  };

  const buildBeat = (): BeatInput => ({
    location,
    intExt,
    timeOfDay,
    characters: charactersCSV
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    action,
    dialogue,
    mood: mood || undefined,
    language: 'en',
    referenceImageBase64: referenceImage ?? undefined,
  });

  const onGenerate = async () => {
    setLoading(true);
    setError(null);
    setAssembly(null);
    setApplyStatus(null);
    try {
      const result = await directFromBeat(buildBeat());
      setAssembly(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const onApply = async () => {
    if (!assembly) return;
    setApplyStatus('Applying to scene…');
    try {
      const result = await applySceneAssembly(assembly);
      const placed = result.placedLights.length;
      const warn = result.warnings.length ? ` (${result.warnings.length} warnings)` : '';
      setApplyStatus(
        `Applied — ${placed} lights placed, camera ${result.camera ? 'set' : 'skipped'}${warn}`,
      );
      if (result.warnings.length) {
        // eslint-disable-next-line no-console
        console.warn('[SceneDirector] warnings:', result.warnings);
      }
    } catch (err) {
      setApplyStatus(
        `Apply failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <Suspense fallback={<PanelLoadingFallback />}>
      <Paper
        elevation={6}
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          width: 440,
          maxHeight: 'calc(100vh - 120px)',
          overflow: 'auto',
          zIndex: 1200,
          bgcolor: 'rgba(28, 33, 40, 0.98)',
          color: '#fff',
          border: '2px solid rgba(0, 212, 255, 0.4)',
          borderRadius: 2,
          p: 2,
        }}
      >
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#00d4ff' }}>
              Scene Director
            </Typography>
            <Chip
              label={
                status
                  ? status.aiBootstrap === 'claude'
                    ? `Claude · ${status.claudeDirectorModel ?? ''}`
                    : 'Rules (no Claude key)'
                  : 'AI orchestrator'
              }
              size="small"
              sx={{
                bgcolor:
                  status?.aiBootstrap === 'claude'
                    ? 'rgba(183, 116, 255, 0.2)'
                    : 'rgba(0, 212, 255, 0.2)',
                color:
                  status?.aiBootstrap === 'claude' ? '#b774ff' : '#00d4ff',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: '#999' }}>
            Skriv én scene-beat. AI velger shot, linse, lys-mønster, modifikatorer.
            {status?.visionSupported && ' Last opp referansebilde for stil-bias.'}
          </Typography>

          <TextField
            label="Location"
            size="small"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
            InputLabelProps={{ sx: { color: '#aaa' } }}
            InputProps={{ sx: { color: '#fff' } }}
          />
          <Stack direction="row" spacing={1}>
            <TextField
              select
              label="INT/EXT"
              size="small"
              value={intExt}
              onChange={(e) => setIntExt(e.target.value as 'INT' | 'EXT')}
              sx={{ flex: 1 }}
              InputLabelProps={{ sx: { color: '#aaa' } }}
              InputProps={{ sx: { color: '#fff' } }}
            >
              {INT_EXT_OPTIONS.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Time"
              size="small"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              sx={{ flex: 1 }}
              InputLabelProps={{ sx: { color: '#aaa' } }}
              InputProps={{ sx: { color: '#fff' } }}
            >
              {TIME_OPTIONS.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Characters (comma-separated)"
            size="small"
            value={charactersCSV}
            onChange={(e) => setCharactersCSV(e.target.value)}
            fullWidth
            InputLabelProps={{ sx: { color: '#aaa' } }}
            InputProps={{ sx: { color: '#fff' } }}
          />
          <TextField
            label="Action"
            size="small"
            multiline
            minRows={2}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            fullWidth
            InputLabelProps={{ sx: { color: '#aaa' } }}
            InputProps={{ sx: { color: '#fff' } }}
          />
          <TextField
            label="Dialogue (optional)"
            size="small"
            multiline
            minRows={1}
            value={dialogue}
            onChange={(e) => setDialogue(e.target.value)}
            fullWidth
            InputLabelProps={{ sx: { color: '#aaa' } }}
            InputProps={{ sx: { color: '#fff' } }}
          />
          <TextField
            select
            label="Mood (auto if empty)"
            size="small"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            InputLabelProps={{ sx: { color: '#aaa' } }}
            InputProps={{ sx: { color: '#fff' } }}
          >
            {MOOD_OPTIONS.map((v) => (
              <MenuItem key={v} value={v}>
                {v || '(auto)'}
              </MenuItem>
            ))}
          </TextField>

          {status?.visionSupported && (
            <Box>
              <Button
                variant="outlined"
                component="label"
                size="small"
                sx={{ borderColor: '#b774ff', color: '#b774ff', textTransform: 'none' }}
              >
                {referenceFileName
                  ? `📷 ${referenceFileName}`
                  : 'Last opp referansebilde (valgfritt, Claude Vision)'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => onReferenceUpload(e.target.files?.[0] ?? null)}
                />
              </Button>
              {referenceImage && (
                <Button
                  size="small"
                  onClick={() => onReferenceUpload(null)}
                  sx={{ ml: 1, color: '#aaa', textTransform: 'none' }}
                >
                  Fjern
                </Button>
              )}
            </Box>
          )}

          <Button
            variant="contained"
            onClick={onGenerate}
            disabled={loading}
            sx={{ bgcolor: '#00d4ff', color: '#000', '&:hover': { bgcolor: '#00b8e0' } }}
          >
            {loading ? <CircularProgress size={18} sx={{ color: '#000' }} /> : 'Generer scene'}
          </Button>

          {error && <Alert severity="error">{error}</Alert>}

          {assembly && (
            <>
              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
              {assembly.referenceAnalysis && (
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'rgba(183, 116, 255, 0.08)',
                    border: '1px solid rgba(183, 116, 255, 0.3)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#b774ff', fontWeight: 600 }}>
                    Claude Vision på referansebilde
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ddd', mt: 0.5 }}>
                    {assembly.referenceAnalysis.rawCaption}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#aaa', display: 'block', mt: 0.5 }}>
                    Pattern: {assembly.referenceAnalysis.lightingPattern} ·
                    Palette: {assembly.referenceAnalysis.colorPalette} ·
                    Tid: {assembly.referenceAnalysis.timeOfDayGuess}
                  </Typography>
                </Box>
              )}
              <Typography variant="subtitle2" sx={{ color: '#00d4ff' }}>
                Director's call
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <b>Shot:</b> {assembly.shot.type}, {assembly.shot.focalLengthMm} mm
                  f/{assembly.shot.apertureF}, {assembly.shot.angle}
                </Typography>
                <Typography variant="body2">
                  <b>Lighting:</b> {assembly.lighting.pattern} — ratio{' '}
                  {assembly.lighting.keyToFillRatio},{' '}
                  {assembly.lighting.colorTempKelvin} K
                </Typography>
                <Typography variant="body2" sx={{ color: '#aaa' }}>
                  <b>Sources:</b>{' '}
                  {assembly.lighting.sources
                    .map((s) => `${s.role}:${s.modifier}`)
                    .join(', ')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#777' }}>
                  {assembly.shot.rationale}
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                onClick={onApply}
                sx={{ borderColor: '#00d4ff', color: '#00d4ff' }}
              >
                Apply til Babylon-scenen
              </Button>
              {applyStatus && (
                <Alert
                  severity={applyStatus.startsWith('Apply failed') ? 'error' : 'success'}
                  sx={{ fontSize: '0.85rem' }}
                >
                  {applyStatus}
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </Suspense>
  );
};

export default SceneDirectorApp;
