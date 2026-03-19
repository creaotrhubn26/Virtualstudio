import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { EnvironmentPlanApplyResult } from '../services/environmentPlannerService';
import { environmentPlannerService } from '../services/environmentPlannerService';
import { environmentService } from '../core/services/environmentService';
import {
  getEnvironmentById,
  type EnvironmentPreset,
} from '../data/environmentPresets';
import type {
  EnvironmentPlanResponse,
  EnvironmentPlannerStatus,
  WorldModelProvider,
} from '../core/models/environmentPlan';

interface AIEnvironmentPlannerDialogProps {
  open: boolean;
  onClose: () => void;
}

type AIPlannerReferenceImageSeed = {
  name: string;
  dataUrl: string;
};

type AIPlannerTestDraft = {
  brief?: string;
  subjectFocus?: string;
  mood?: string;
  sceneTalent?: string;
  shotIntent?: string;
  mustHaveElements?: string;
  selectedTemplateId?: string;
  worldModelProvider?: WorldModelProvider;
  geniePrompt?: string;
  genieNotes?: string;
  referenceImages?: AIPlannerReferenceImageSeed[];
};

type AIPlannerTestSnapshot = {
  open: boolean;
  loading: boolean;
  applyLoading: boolean;
  hasEnoughInput: boolean;
  brief: string;
  worldModelProvider: WorldModelProvider;
  selectedTemplateId: string;
  selectedFileNames: string[];
  resultConcept: string | null;
  hasResult: boolean;
  appliedCount: number;
  skippedCount: number;
  requestCount: number;
};

type AIPlannerTestApi = {
  seedDraft: (draft: AIPlannerTestDraft) => Promise<AIPlannerTestSnapshot>;
  generate: () => Promise<AIPlannerTestSnapshot>;
  apply: () => Promise<AIPlannerTestSnapshot>;
  getSnapshot: () => AIPlannerTestSnapshot;
};

type AIPlannerTestWindow = Window & {
  __virtualStudioAiPlannerTestApi?: AIPlannerTestApi;
  __virtualStudioEnvironmentPlannerRequests?: unknown[];
};

const EXAMPLE_BRIEFS = [
  'Pizza-reklame med varm italiensk pizzeria-følelse',
  'Eksklusiv beauty-shoot med luksuriøs editorial stemning',
  'Podcast-sett med myke materialer og koselig lys',
  'Teknologi-lansering med futuristisk, ren produktscene',
];

const WRITING_HINTS = [
  'Hva skal vi vise eller selge?',
  'Hvilken stemning skal rommet ha?',
  'Hvem eller hva skal være i scenen?',
  'Hvilken type bilde eller shot trenger du?',
];

const STARTER_TEMPLATE_IDS = [
  'studio-classic-white',
  'studio-dark-dramatic',
  'cinematic-blade-runner',
  'cinematic-kubrick',
  'urban-industrial-loft',
  'urban-neon-arcade',
];

const STARTER_TEMPLATES: EnvironmentPreset[] = STARTER_TEMPLATE_IDS
  .map(id => getEnvironmentById(id))
  .filter((preset): preset is EnvironmentPreset => Boolean(preset));

function buildCompositePrompt(input: {
  brief: string;
  subjectFocus: string;
  mood: string;
  sceneTalent: string;
  shotIntent: string;
  mustHaveElements: string;
  selectedTemplateName: string;
  worldModelProvider: WorldModelProvider;
  geniePrompt: string;
  genieNotes: string;
}): string {
  const sections: string[] = [];

  if (input.brief.trim()) sections.push(input.brief.trim());
  if (input.selectedTemplateName.trim()) {
    sections.push(`Start gjerne fra eksisterende template/preset: ${input.selectedTemplateName.trim()}.`);
  }
  if (input.subjectFocus.trim()) sections.push(`Fokus i scenen: ${input.subjectFocus.trim()}.`);
  if (input.mood.trim()) sections.push(`Ønsket stemning: ${input.mood.trim()}.`);
  if (input.sceneTalent.trim()) sections.push(`I scenen skal vi ha: ${input.sceneTalent.trim()}.`);
  if (input.shotIntent.trim()) sections.push(`Shot / bruk: ${input.shotIntent.trim()}.`);
  if (input.mustHaveElements.trim()) sections.push(`Må-ha elementer: ${input.mustHaveElements.trim()}.`);

  if (input.worldModelProvider === 'genie') {
    if (input.geniePrompt.trim()) sections.push(`Genie world prompt: ${input.geniePrompt.trim()}.`);
    if (input.genieNotes.trim()) sections.push(`Bevar disse Genie-kvalitetene: ${input.genieNotes.trim()}.`);
  }

  return sections.join('\n');
}

function waitForPlannerUiTurn(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => resolve());
    }, 0);
  });
}

async function dataUrlToFile(reference: AIPlannerReferenceImageSeed): Promise<File> {
  const response = await fetch(reference.dataUrl);
  const blob = await response.blob();
  const fileType = blob.type || 'application/octet-stream';
  return new File([blob], reference.name, { type: fileType });
}

export const AIEnvironmentPlannerDialog: FC<AIEnvironmentPlannerDialogProps> = ({
  open,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestRequestIdRef = useRef(0);
  const lastSignatureRef = useRef('');
  const plannerStateRef = useRef({
    brief: '',
    subjectFocus: '',
    mood: '',
    sceneTalent: '',
    shotIntent: '',
    mustHaveElements: '',
    selectedTemplateId: '',
    worldModelProvider: 'none' as WorldModelProvider,
    geniePrompt: '',
    genieNotes: '',
    referenceFiles: [] as File[],
  });
  const resultRef = useRef<EnvironmentPlanResponse | null>(null);

  const [brief, setBrief] = useState('');
  const [subjectFocus, setSubjectFocus] = useState('');
  const [mood, setMood] = useState('');
  const [sceneTalent, setSceneTalent] = useState('');
  const [shotIntent, setShotIntent] = useState('');
  const [mustHaveElements, setMustHaveElements] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [worldModelProvider, setWorldModelProvider] = useState<WorldModelProvider>('none');
  const [geniePrompt, setGeniePrompt] = useState('');
  const [genieNotes, setGenieNotes] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<EnvironmentPlannerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnvironmentPlanResponse | null>(null);
  const [applyResult, setApplyResult] = useState<EnvironmentPlanApplyResult | null>(null);

  plannerStateRef.current = {
    brief,
    subjectFocus,
    mood,
    sceneTalent,
    shotIntent,
    mustHaveElements,
    selectedTemplateId,
    worldModelProvider,
    geniePrompt,
    genieNotes,
    referenceFiles,
  };
  resultRef.current = result;

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void environmentPlannerService.getStatus()
      .then((nextStatus) => {
        if (!cancelled) setStatus(nextStatus);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            enabled: false,
            provider: 'fallback',
            model: 'fallback',
            hasVisionSupport: false,
            supportedWorldModelProviders: ['none', 'manual', 'genie'],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedFileNames = useMemo(
    () => referenceFiles.map(file => file.name),
    [referenceFiles],
  );

  const selectedTemplate = useMemo(
    () => (selectedTemplateId ? getEnvironmentById(selectedTemplateId) ?? null : null),
    [selectedTemplateId],
  );

  const compositePrompt = useMemo(
    () => buildCompositePrompt({
      brief,
      subjectFocus,
      mood,
      sceneTalent,
      shotIntent,
      mustHaveElements,
      selectedTemplateName: selectedTemplate?.nameNo ?? '',
      worldModelProvider,
      geniePrompt,
      genieNotes,
    }),
    [
      brief,
      subjectFocus,
      mood,
      sceneTalent,
      shotIntent,
      mustHaveElements,
      selectedTemplate,
      worldModelProvider,
      geniePrompt,
      genieNotes,
    ],
  );

  const requestSignature = useMemo(
    () => JSON.stringify({
      compositePrompt,
      selectedTemplateId,
      worldModelProvider,
      geniePrompt,
      genieNotes,
      files: selectedFileNames,
    }),
    [compositePrompt, genieNotes, geniePrompt, selectedFileNames, selectedTemplateId, worldModelProvider],
  );

  const hasEnoughInput = compositePrompt.trim().length > 0 || referenceFiles.length > 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files || []);
    setReferenceFiles(files);
  };

  const getCurrentPlannerInputs = () => {
    const currentState = plannerStateRef.current;
    const selectedTemplateForState = currentState.selectedTemplateId
      ? getEnvironmentById(currentState.selectedTemplateId) ?? null
      : null;
    const selectedFileNamesForState = currentState.referenceFiles.map(file => file.name);
    const currentCompositePrompt = buildCompositePrompt({
      brief: currentState.brief,
      subjectFocus: currentState.subjectFocus,
      mood: currentState.mood,
      sceneTalent: currentState.sceneTalent,
      shotIntent: currentState.shotIntent,
      mustHaveElements: currentState.mustHaveElements,
      selectedTemplateName: selectedTemplateForState?.nameNo ?? '',
      worldModelProvider: currentState.worldModelProvider,
      geniePrompt: currentState.geniePrompt,
      genieNotes: currentState.genieNotes,
    });
    const currentRequestSignature = JSON.stringify({
      compositePrompt: currentCompositePrompt,
      selectedTemplateId: currentState.selectedTemplateId,
      worldModelProvider: currentState.worldModelProvider,
      geniePrompt: currentState.geniePrompt,
      genieNotes: currentState.genieNotes,
      files: selectedFileNamesForState,
    });
    const currentHasEnoughInput = currentCompositePrompt.trim().length > 0 || currentState.referenceFiles.length > 0;

    return {
      ...currentState,
      selectedTemplate: selectedTemplateForState,
      selectedFileNames: selectedFileNamesForState,
      compositePrompt: currentCompositePrompt,
      requestSignature: currentRequestSignature,
      hasEnoughInput: currentHasEnoughInput,
    };
  };

  const triggerGeneration = async (manual = false): Promise<void> => {
    const currentInputs = getCurrentPlannerInputs();

    if (!currentInputs.hasEnoughInput) {
      startTransition(() => {
        setResult(null);
        setError(null);
      });
      return;
    }

    if (!manual && currentInputs.requestSignature === lastSignatureRef.current) {
      return;
    }

    lastSignatureRef.current = currentInputs.requestSignature;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setLoading(true);
    setHasAutoStarted(true);
    setError(null);
    setApplyResult(null);

    try {
      const referenceImages = await environmentPlannerService.filesToDataUrls(currentInputs.referenceFiles);
      const response = await environmentPlannerService.generatePlan({
        prompt: currentInputs.compositePrompt,
        referenceImages,
        roomConstraints: {
          currentShell: '20x20 studio with four walls and one floor',
          supportsParametricGeometry: false,
          supportsPresetMaterials: true,
        },
        preferredPresetId: currentInputs.selectedTemplateId || undefined,
        worldModelProvider: currentInputs.worldModelProvider,
        worldModelReference: currentInputs.worldModelProvider === 'genie'
          ? {
            provider: 'genie',
            mode: 'world_sketch',
            prompt: currentInputs.geniePrompt || currentInputs.compositePrompt,
            notes: currentInputs.genieNotes,
            importedImageCount: currentInputs.referenceFiles.length,
            previewLabels: currentInputs.selectedFileNames,
          }
          : undefined,
      });

      if (requestId !== latestRequestIdRef.current) return;

      startTransition(() => {
        setResult(response);
        setError(null);
      });
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) return;
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'Kunne ikke generere miljøplan');
      });
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!hasEnoughInput) {
      setLoading(false);
      setHasAutoStarted(false);
      setResult(null);
      setError(null);
      lastSignatureRef.current = '';
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void triggerGeneration(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [open, hasEnoughInput, requestSignature]);

  const handleApply = async (): Promise<void> => {
    const currentResult = resultRef.current;
    if (!currentResult) return;
    setApplyLoading(true);
    setError(null);
    try {
      const nextApplyResult = await environmentPlannerService.applyPlanToCurrentStudio(currentResult.plan);
      setApplyResult(nextApplyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke anvende miljøplanen');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleUseExample = (value: string): void => {
    setBrief(value);
  };

  const handleSelectTemplate = (preset: EnvironmentPreset): void => {
    setSelectedTemplateId((current) => current === preset.id ? '' : preset.id);
    if (!brief.trim()) {
      setBrief(preset.descriptionNo);
    }
  };

  const handleApplyTemplateDirectly = (): void => {
    if (!selectedTemplate) return;
    environmentService.applyPreset(selectedTemplate.id);
    setApplyResult({
      applied: [`Template: ${selectedTemplate.nameNo}`],
      skipped: [],
    });
  };

  const uploadLabel = worldModelProvider === 'genie'
    ? 'Legg til Genie-screenshots'
    : 'Legg til referansebilder';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const plannerWindow = window as AIPlannerTestWindow;
    const buildSnapshot = (): AIPlannerTestSnapshot => {
      const currentInputs = getCurrentPlannerInputs();
      return {
        open,
        loading,
        applyLoading,
        hasEnoughInput: currentInputs.hasEnoughInput,
        brief: currentInputs.brief,
        worldModelProvider: currentInputs.worldModelProvider,
        selectedTemplateId: currentInputs.selectedTemplateId,
        selectedFileNames: currentInputs.selectedFileNames,
        resultConcept: resultRef.current?.plan.concept ?? null,
        hasResult: Boolean(resultRef.current),
        appliedCount: applyResult?.applied.length ?? 0,
        skippedCount: applyResult?.skipped.length ?? 0,
        requestCount: plannerWindow.__virtualStudioEnvironmentPlannerRequests?.length ?? 0,
      };
    };

    plannerWindow.__virtualStudioAiPlannerTestApi = {
      seedDraft: async (draft) => {
        if (draft.brief !== undefined) setBrief(draft.brief);
        if (draft.subjectFocus !== undefined) setSubjectFocus(draft.subjectFocus);
        if (draft.mood !== undefined) setMood(draft.mood);
        if (draft.sceneTalent !== undefined) setSceneTalent(draft.sceneTalent);
        if (draft.shotIntent !== undefined) setShotIntent(draft.shotIntent);
        if (draft.mustHaveElements !== undefined) setMustHaveElements(draft.mustHaveElements);
        if (draft.selectedTemplateId !== undefined) setSelectedTemplateId(draft.selectedTemplateId);
        if (draft.worldModelProvider !== undefined) setWorldModelProvider(draft.worldModelProvider);
        if (draft.geniePrompt !== undefined) setGeniePrompt(draft.geniePrompt);
        if (draft.genieNotes !== undefined) setGenieNotes(draft.genieNotes);
        if (draft.referenceImages !== undefined) {
          const files = await Promise.all(draft.referenceImages.map(dataUrlToFile));
          setReferenceFiles(files);
        }

        setResult(null);
        setApplyResult(null);
        setError(null);
        lastSignatureRef.current = '';
        await waitForPlannerUiTurn();
        await waitForPlannerUiTurn();
        return buildSnapshot();
      },
      generate: async () => {
        await triggerGeneration(true);
        return buildSnapshot();
      },
      apply: async () => {
        await handleApply();
        return buildSnapshot();
      },
      getSnapshot: () => buildSnapshot(),
    };

    return () => {
      delete plannerWindow.__virtualStudioAiPlannerTestApi;
    };
  }, [applyLoading, applyResult, loading, open, result]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Sett Opp Scene</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Beskriv scenen kort, så jobber AI i bakgrunnen og bygger et miljøforslag mens du skriver. Du trenger ikke å treffe perfekt med en gang.
          </Typography>

          <Alert severity="info">
            Skriv gjerne litt om hva du lager, hvilken stemning du vil ha, hvem eller hva som skal være i scenen, og hvilken type bilde eller shot du trenger.
          </Alert>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {WRITING_HINTS.map((hint) => (
              <Chip key={hint} size="small" variant="outlined" label={hint} />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {EXAMPLE_BRIEFS.map((example) => (
              <Chip
                key={example}
                size="small"
                clickable
                color="primary"
                variant="outlined"
                label={example}
                onClick={() => handleUseExample(example)}
              />
            ))}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Start fra template hvis du vil
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI kan godt starte fra en eksisterende template og tilpasse den videre mens du skriver.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {STARTER_TEMPLATES.map((preset) => (
                <Chip
                  key={preset.id}
                  size="small"
                  clickable
                  color={selectedTemplateId === preset.id ? 'primary' : 'default'}
                  variant={selectedTemplateId === preset.id ? 'filled' : 'outlined'}
                  label={preset.nameNo}
                  onClick={() => handleSelectTemplate(preset)}
                />
              ))}
            </Stack>
            {selectedTemplate && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={`Template-base: ${selectedTemplate.nameNo}`}
                />
                <Button variant="text" onClick={handleApplyTemplateDirectly}>
                  Bruk template direkte
                </Button>
              </Stack>
            )}
          </Stack>

          <TextField
            label="Kort scene-brief"
            multiline
            minRows={3}
            autoFocus
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Eksempel: varmt pizza-reklamemiljø med italiensk pizzeria-følelse, plass til talent og hero shots av produktet."
            fullWidth
          />

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
              },
            }}
          >
            <TextField
              label="Hva skal filmes eller vises?"
              value={subjectFocus}
              onChange={(event) => setSubjectFocus(event.target.value)}
              placeholder="Produkt, kampanje, intervju, scene"
              fullWidth
            />
            <TextField
              label="Hvilken stemning vil du ha?"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              placeholder="Varm, luksuriøs, mørk, futuristisk"
              fullWidth
            />
            <TextField
              label="Hvem eller hva skal være i scenen?"
              value={sceneTalent}
              onChange={(event) => setSceneTalent(event.target.value)}
              placeholder="Talent, møbler, produktbord, rekvisitter"
              fullWidth
            />
            <TextField
              label="Hvilken type shot trenger du?"
              value={shotIntent}
              onChange={(event) => setShotIntent(event.target.value)}
              placeholder="Hero shot, nærbilde, helscene, intervju"
              fullWidth
            />
          </Box>

          <TextField
            label="Må-ha elementer i environment"
            value={mustHaveElements}
            onChange={(event) => setMustHaveElements(event.target.value)}
            placeholder="For eksempel ovn, menybrett, neon-skilt, vinduer, lounge-møbler"
            fullWidth
          />

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Ekstra referanse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valgfritt. Bruk dette hvis du vil importere lookdev fra Genie eller vanlige referansebilder.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                clickable
                color={worldModelProvider === 'none' ? 'primary' : 'default'}
                variant={worldModelProvider === 'none' ? 'filled' : 'outlined'}
                label="Ingen ekstra referanse"
                onClick={() => setWorldModelProvider('none')}
              />
              <Chip
                clickable
                color={worldModelProvider === 'genie' ? 'primary' : 'default'}
                variant={worldModelProvider === 'genie' ? 'filled' : 'outlined'}
                label="Genie import"
                onClick={() => setWorldModelProvider('genie')}
              />
            </Stack>
          </Stack>

          {worldModelProvider === 'genie' && (
            <Stack spacing={1.5}>
              <Alert severity="warning">
                Genie brukes her som world-sketch og lookdev-referanse. Studioet bygger fortsatt en strukturert plan i egen scenegraph.
              </Alert>
              <TextField
                label="Genie-prompt eller world-sketch"
                value={geniePrompt}
                onChange={(event) => setGeniePrompt(event.target.value)}
                placeholder="Hva var prompten eller ideen du brukte i Genie?"
                fullWidth
              />
              <TextField
                label="Hva vil du bevare fra Genie-verdenen?"
                value={genieNotes}
                onChange={(event) => setGenieNotes(event.target.value)}
                placeholder="For eksempel: varme murvegger, dybde bak produktet, høylys i tåke, skilt i bakgrunnen"
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          )}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadLabel}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFileChange}
            />
            {selectedFileNames.map((name) => (
              <Chip key={name} size="small" label={name} />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {status && (
              <Chip
                size="small"
                color={status.enabled ? 'success' : 'default'}
                label={status.enabled ? `Live AI: ${status.model}` : 'Fallback-planlegger'}
              />
            )}
            {status && (
              <Chip
                size="small"
                variant="outlined"
                label={status.hasVisionSupport ? 'Bildeforståelse aktiv' : 'Bildeforståelse begrenset'}
              />
            )}
            {worldModelProvider === 'genie' && (
              <Chip size="small" color="secondary" variant="outlined" label="Genie import aktiv" />
            )}
            {loading && (
              <Chip
                size="small"
                color="warning"
                icon={<CircularProgress size={14} />}
                label="AI jobber i bakgrunnen"
              />
            )}
          </Stack>

          <Box>
            <Button
              variant="text"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
              disabled={loading || !hasEnoughInput}
              onClick={() => void triggerGeneration(true)}
            >
              Oppdater forslag nå
            </Button>
          </Box>

          {hasEnoughInput && !result && loading && (
            <Alert severity="info">
              AI bygger et første miljøforslag i bakgrunnen.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Stack spacing={2}>
              {result.warning && <Alert severity="warning">{result.warning}</Alert>}

              <Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  <Chip
                    size="small"
                    color={result.usedFallback ? 'warning' : 'primary'}
                    label={result.usedFallback ? 'Fallback brukt' : `Provider: ${result.provider}`}
                  />
                  {result.plan.recommendedPresetId && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Template: ${result.plan.recommendedPresetId}`}
                    />
                  )}
                  <Chip size="small" variant="outlined" label={result.plan.source} />
                  {result.plan.worldModel?.provider && result.plan.worldModel.provider !== 'none' && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`World model: ${result.plan.worldModel.provider}`}
                    />
                  )}
                </Stack>

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {result.plan.concept}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.plan.summary}
                </Typography>
              </Box>

              {result.plan.worldModel?.provider && result.plan.worldModel.provider !== 'none' && (
                <Alert severity="info">
                  {result.plan.worldModel.summary}
                  {result.plan.worldModel.notes ? ` | Notater: ${result.plan.worldModel.notes}` : ''}
                </Alert>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Shell og buildability
                </Typography>
                <Typography variant="body2">
                  Type: {result.plan.roomShell.type} | {result.plan.roomShell.width}m x {result.plan.roomShell.depth}m x {result.plan.roomShell.height}m
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kompatibilitet: {Math.round(result.plan.compatibility.confidence * 100)}%
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Materialer som kan brukes nå
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {result.plan.surfaces.map((surface) => (
                    <Chip
                      key={`${surface.target}-${surface.materialId}`}
                      size="small"
                      label={`${surface.target}: ${surface.materialId}`}
                    />
                  ))}
                </Stack>
              </Box>

              {result.plan.props.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    3D-objekter AI vil bygge
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {result.plan.props.map((prop) => (
                      <Chip
                        key={`${prop.name}-${prop.placementHint ?? 'default'}`}
                        size="small"
                        color={prop.priority === 'high' ? 'primary' : 'default'}
                        variant="outlined"
                        label={prop.placementHint ? `${prop.name} (${prop.placementHint})` : prop.name}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Neste byggesteg
                </Typography>
                <Stack spacing={0.5}>
                  {result.plan.assemblySteps.map((step) => (
                    <Typography key={step} variant="body2">
                      - {step}
                    </Typography>
                  ))}
                </Stack>
              </Box>

              {result.plan.compatibility.gaps.length > 0 && (
                <Alert severity="info">
                  {result.plan.compatibility.gaps.join(' | ')}
                </Alert>
              )}

              <Box>
                <Button
                  variant="contained"
                  onClick={() => void handleApply()}
                  disabled={loading || applyLoading}
                  startIcon={applyLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {applyLoading ? 'Bygger miljøet...' : 'Bruk dette miljøet'}
                </Button>
              </Box>

              {applyResult && (
                <Alert severity={applyResult.skipped.length > 0 ? 'warning' : 'success'}>
                  Anvendt: {applyResult.applied.join(', ') || 'ingenting'}
                  {applyResult.skipped.length > 0 ? ` | Hoppet over: ${applyResult.skipped.join(', ')}` : ''}
                </Alert>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Lukk</Button>
      </DialogActions>
    </Dialog>
  );
};
