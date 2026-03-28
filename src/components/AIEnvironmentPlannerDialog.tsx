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
import type { EnvironmentAssemblyValidationSummary } from '../services/environmentAssemblyValidation';
import {
  extractBrandPaletteOptionsFromFile,
  type BrandPaletteOption,
} from '../services/brandPaletteService';
import {
  getBrandDirectionPresetById,
  getBrandDirectionPresets,
} from '../services/brandDirectionService';
import {
  buildBrandReferenceFromProfile,
  clearStoredBrandProfile,
  getStoredBrandProfile,
  hasMeaningfulBrandProfile,
  saveStoredBrandProfile,
  type StoredBrandProfile,
} from '../services/brandProfileService';
import { getEnvironmentEvaluationPresentation } from '../services/environmentEvaluationPresentation';
import { getEnvironmentPlanInsightPresentation } from '../services/environmentPlanInsightPresentation';
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
  brandName?: string;
  brandNotes?: string;
  brandLogoImage?: AIPlannerReferenceImageSeed | null;
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
  brandName: string;
  brandNotes: string;
  brandLogoName: string | null;
  selectedBrandPaletteId: string;
  selectedBrandDirectionId: string;
  storedBrandProfileName: string | null;
  resultConcept: string | null;
  hasResult: boolean;
  appliedCount: number;
  skippedCount: number;
  backendValidated: boolean;
  assemblyDifferenceCount: number;
  requestCount: number;
  lastTestApiError: string | null;
};

type AIPlannerTestApi = {
  seedDraft: (draft: AIPlannerTestDraft) => Promise<AIPlannerTestSnapshot>;
  generate: () => Promise<AIPlannerTestSnapshot>;
  startApply: () => Promise<AIPlannerTestSnapshot>;
  apply: () => Promise<AIPlannerTestSnapshot>;
  clearBrandInputs: () => Promise<AIPlannerTestSnapshot>;
  useStoredBrandProfile: () => Promise<AIPlannerTestSnapshot>;
  clearStoredBrandProfile: () => Promise<AIPlannerTestSnapshot>;
  getSnapshot: () => AIPlannerTestSnapshot;
};

type AIPlannerTestWindow = Window & {
  __virtualStudioAiPlannerTestApi?: AIPlannerTestApi;
  __virtualStudioEnvironmentPlannerRequests?: unknown[];
  __virtualStudioAiPlannerTestApiError?: string | null;
};

const EXAMPLE_BRIEFS = [
  'Pizza-reklame med varm italiensk pizzeria-følelse',
  'Eksklusiv beauty-shoot med luksuriøs editorial stemning',
  'Podcast-sett med myke materialer og koselig lys',
  'Teknologi-lansering med futuristisk, ren produktscene',
];

function getAssemblyValidationAlertState(
  summary: EnvironmentAssemblyValidationSummary | null | undefined,
): {
  severity: 'success' | 'warning' | 'info';
  title: string;
  details: string[];
} | null {
  if (!summary) {
    return null;
  }

  if (summary.backendValidated && summary.differences.length === 0) {
    return {
      severity: 'success',
      title: 'Scenegraph validert i backend',
      details: [
        `${summary.backendRuntimePropCount ?? summary.localRuntimePropCount} props kontrollert`,
        `${summary.backendRelationshipCount ?? summary.localRelationshipCount} relasjoner kontrollert`,
      ],
    };
  }

  if (summary.backendValidated) {
    return {
      severity: 'warning',
      title: 'Backend fant avvik i assembly',
      details: summary.differences,
    };
  }

  return {
    severity: 'info',
    title: 'Brukte lokal assembly',
    details: ['Backend-validering var ikke tilgjengelig akkurat nå.'],
  };
}

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
  brandName: string;
  brandNotes: string;
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
  if (input.brandName.trim()) sections.push(`Brand / kunde: ${input.brandName.trim()}.`);
  if (input.brandNotes.trim()) sections.push(`Branding-notater: ${input.brandNotes.trim()}.`);

  if (input.worldModelProvider === 'genie') {
    if (input.geniePrompt.trim()) sections.push(`Genie world prompt: ${input.geniePrompt.trim()}.`);
    if (input.genieNotes.trim()) sections.push(`Bevar disse Genie-kvalitetene: ${input.genieNotes.trim()}.`);
  }

  return sections.join('\n');
}

function buildEffectiveBrandNotes(baseNotes: string, applicationTargets?: string[], directionUsageNote?: string | null): string | undefined {
  const targets = applicationTargets && applicationTargets.length > 0
    ? applicationTargets
    : ['signage', 'wardrobe', 'packaging', 'interior_details'];
  const defaultDirective = `Apply the brand consistently across ${targets.map((target) => target.replace(/_/g, ' ')).join(', ')}.`;
  return [baseNotes.trim(), directionUsageNote || '', defaultDirective].filter(Boolean).join(' ').trim() || undefined;
}

function waitForPlannerUiTurn(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => resolve());
    }, 0);
  });
}

async function waitForPlannerCondition(
  condition: () => boolean,
  timeoutMs = 10_000,
): Promise<void> {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  while (true) {
    if (condition()) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if ((now - startTime) >= timeoutMs) {
      throw new Error('Timed out while waiting for planner test condition');
    }

    await waitForPlannerUiTurn();
  }
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
  const brandLogoInputRef = useRef<HTMLInputElement | null>(null);
  const latestRequestIdRef = useRef(0);
  const lastSignatureRef = useRef('');
  const brandingHydratedRef = useRef(false);
  const plannerStateRef = useRef({
    brief: '',
    subjectFocus: '',
    mood: '',
    sceneTalent: '',
    shotIntent: '',
    mustHaveElements: '',
    brandName: '',
    brandNotes: '',
    brandLogoFile: null as File | null,
    selectedTemplateId: '',
    worldModelProvider: 'none' as WorldModelProvider,
    geniePrompt: '',
    genieNotes: '',
    referenceFiles: [] as File[],
  });
  const resultRef = useRef<EnvironmentPlanResponse | null>(null);
  const plannerUiStateRef = useRef({
    open: false,
    loading: false,
    applyLoading: false,
    applyResult: null as EnvironmentPlanApplyResult | null,
    storedBrandProfileName: null as string | null,
    selectedBrandPaletteId: '',
    selectedBrandDirectionId: '',
  });

  const [brief, setBrief] = useState('');
  const [subjectFocus, setSubjectFocus] = useState('');
  const [mood, setMood] = useState('');
  const [sceneTalent, setSceneTalent] = useState('');
  const [shotIntent, setShotIntent] = useState('');
  const [mustHaveElements, setMustHaveElements] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandNotes, setBrandNotes] = useState('');
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandPaletteOptions, setBrandPaletteOptions] = useState<BrandPaletteOption[]>([]);
  const [selectedBrandPaletteId, setSelectedBrandPaletteId] = useState<string>('');
  const [selectedBrandDirectionId, setSelectedBrandDirectionId] = useState<string>('trattoria-warm');
  const [brandPaletteLoading, setBrandPaletteLoading] = useState(false);
  const [brandLogoDataUrl, setBrandLogoDataUrl] = useState<string | null>(null);
  const [storedBrandProfile, setStoredBrandProfile] = useState<StoredBrandProfile | null>(null);
  const [brandProfileLoading, setBrandProfileLoading] = useState(false);
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
    brandName,
    brandNotes,
    brandLogoFile,
    selectedTemplateId,
    worldModelProvider,
    geniePrompt,
    genieNotes,
    referenceFiles,
  };
  resultRef.current = result;
  plannerUiStateRef.current = {
    open,
    loading,
    applyLoading,
    applyResult,
    storedBrandProfileName: storedBrandProfile?.brandName || null,
    selectedBrandPaletteId,
    selectedBrandDirectionId,
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setBrandProfileLoading(true);
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
    void getStoredBrandProfile()
      .then(async (profile) => {
        if (cancelled) return;
        setStoredBrandProfile(profile);

        if (
          profile
          && !brandingHydratedRef.current
          && !hasMeaningfulBrandProfile({
            brandName,
            brandNotes,
            logoImage: brandLogoDataUrl,
            selectedPaletteColors: selectedBrandPalette?.colors,
          })
        ) {
          brandingHydratedRef.current = true;
          await applyStoredBrandProfileToForm(profile);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBrandProfileLoading(false);
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

  const selectedBrandPalette = useMemo(
    () => brandPaletteOptions.find((option) => option.id === selectedBrandPaletteId) || brandPaletteOptions[0] || null,
    [brandPaletteOptions, selectedBrandPaletteId],
  );
  const brandDirectionOptions = useMemo(
    () => getBrandDirectionPresets(),
    [],
  );
  const selectedBrandDirection = useMemo(
    () => getBrandDirectionPresetById(selectedBrandDirectionId) || brandDirectionOptions[0] || null,
    [brandDirectionOptions, selectedBrandDirectionId],
  );

  useEffect(() => {
    if (!open) return;

    const hasProfile = hasMeaningfulBrandProfile({
      brandName,
      brandNotes,
      logoImage: brandLogoDataUrl,
      selectedPaletteColors: selectedBrandPalette?.colors,
    });
    if (!hasProfile) return;

    const timeoutId = window.setTimeout(() => {
      void saveStoredBrandProfile({
        brandName,
        brandNotes,
        logoName: brandLogoFile?.name ?? null,
        logoImage: brandLogoDataUrl,
        paletteOptions: brandPaletteOptions,
        selectedPaletteId: selectedBrandPalette?.id || '',
        selectedPaletteColors: selectedBrandPalette?.colors || [],
        applicationTargets: selectedBrandDirection?.applicationTargets || undefined,
        selectedDirectionId: selectedBrandDirection?.id || '',
        uniformPolicy: selectedBrandDirection?.uniformPolicy || null,
        signageStyle: selectedBrandDirection?.signageStyle || null,
        packagingStyle: selectedBrandDirection?.packagingStyle || null,
        interiorStyle: selectedBrandDirection?.interiorStyle || null,
      }).then((savedProfile) => {
        setStoredBrandProfile(savedProfile);
      }).catch(() => {
        // Keep editing flow seamless even if persistence fails
      });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [
    brandLogoDataUrl,
    brandLogoFile?.name,
    brandName,
    brandNotes,
    brandPaletteOptions,
    open,
    selectedBrandDirection,
    selectedBrandPalette,
  ]);

  useEffect(() => {
    let cancelled = false;

    if (!brandLogoFile) {
      setBrandPaletteLoading(false);
      setBrandLogoDataUrl(null);
      return () => {
        cancelled = true;
      };
    }

    setBrandPaletteLoading(true);
    void Promise.all([
      extractBrandPaletteOptionsFromFile(brandLogoFile),
      environmentPlannerService.fileToDataUrl(brandLogoFile),
    ])
      .then(([options, dataUrl]) => {
        if (cancelled) return;
        setBrandPaletteOptions(options);
        setSelectedBrandPaletteId((current) => current || options[0]?.id || '');
        setBrandLogoDataUrl(dataUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setBrandLogoDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) {
          setBrandPaletteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [brandLogoFile]);

  const compositePrompt = useMemo(
    () => buildCompositePrompt({
      brief,
      subjectFocus,
      mood,
      sceneTalent,
      shotIntent,
      mustHaveElements,
      brandName,
      brandNotes,
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
      brandName,
      brandNotes,
      selectedTemplate,
      worldModelProvider,
      geniePrompt,
      genieNotes,
    ],
  );

  const requestSignature = useMemo(
    () => JSON.stringify({
      compositePrompt,
      brandName,
      brandNotes,
      brandLogoName: brandLogoFile?.name ?? null,
      selectedBrandPalette: selectedBrandPalette?.colors ?? null,
      selectedTemplateId,
      worldModelProvider,
      geniePrompt,
      genieNotes,
      files: selectedFileNames,
    }),
    [
      brandLogoFile?.name,
      brandName,
      brandNotes,
      compositePrompt,
      genieNotes,
      geniePrompt,
      selectedBrandPalette,
      selectedFileNames,
      selectedTemplateId,
      worldModelProvider,
    ],
  );

  const hasEnoughInput = compositePrompt.trim().length > 0 || referenceFiles.length > 0;

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files || []);
    setReferenceFiles(files);
  };

  const handleBrandLogoChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    setBrandLogoFile(file);
  };

  const applyStoredBrandProfileToForm = async (profile: StoredBrandProfile): Promise<void> => {
    setBrandName(profile.brandName);
    setBrandNotes(profile.brandNotes);
    setBrandPaletteOptions(profile.paletteOptions || []);
    setSelectedBrandPaletteId(profile.selectedPaletteId || profile.paletteOptions?.[0]?.id || '');
    setSelectedBrandDirectionId(profile.selectedDirectionId || getBrandDirectionPresets()[0]?.id || 'trattoria-warm');
    setBrandLogoDataUrl(profile.logoImage || null);
    if (profile.logoImage && profile.logoName) {
      const restoredFile = await dataUrlToFile({
        name: profile.logoName,
        dataUrl: profile.logoImage,
      });
      setBrandLogoFile(restoredFile);
    } else {
      setBrandLogoFile(null);
    }
  };

  const handleUseStoredBrandProfile = async (): Promise<void> => {
    if (!storedBrandProfile) return;
    await applyStoredBrandProfileToForm(storedBrandProfile);
    setResult(null);
    setApplyResult(null);
    setError(null);
    lastSignatureRef.current = '';
  };

  const handleClearStoredBrandProfile = async (): Promise<void> => {
    await clearStoredBrandProfile();
    setStoredBrandProfile(null);
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
      brandName: currentState.brandName,
      brandNotes: currentState.brandNotes,
      selectedTemplateName: selectedTemplateForState?.nameNo ?? '',
      worldModelProvider: currentState.worldModelProvider,
      geniePrompt: currentState.geniePrompt,
      genieNotes: currentState.genieNotes,
    });
    const currentRequestSignature = JSON.stringify({
      compositePrompt: currentCompositePrompt,
      brandName: currentState.brandName,
      brandNotes: currentState.brandNotes,
      brandLogoName: currentState.brandLogoFile?.name ?? null,
      selectedBrandPalette: selectedBrandPalette?.colors ?? null,
      selectedBrandDirectionId: selectedBrandDirection?.id ?? null,
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
      const brandLogoImage = currentInputs.brandLogoFile
        ? await environmentPlannerService.fileToDataUrl(currentInputs.brandLogoFile)
        : undefined;
      const currentBrandReference = hasMeaningfulBrandProfile({
        brandName: currentInputs.brandName,
        brandNotes: currentInputs.brandNotes,
        logoImage: brandLogoImage || brandLogoDataUrl,
        selectedPaletteColors: selectedBrandPalette?.colors,
      })
        ? {
          brandName: currentInputs.brandName.trim() || undefined,
          usageNotes: buildEffectiveBrandNotes(
            currentInputs.brandNotes,
            selectedBrandDirection?.applicationTargets,
            selectedBrandDirection?.usageNote,
          ),
          logoImage: brandLogoImage || brandLogoDataUrl || undefined,
          palette: selectedBrandPalette?.colors,
          applicationTargets: selectedBrandDirection?.applicationTargets,
          uniformPolicy: selectedBrandDirection?.uniformPolicy,
          signageStyle: selectedBrandDirection?.signageStyle,
          packagingStyle: selectedBrandDirection?.packagingStyle,
          interiorStyle: selectedBrandDirection?.interiorStyle,
          directionId: selectedBrandDirection?.id,
        }
        : undefined;
      const resolvedBrandReference = currentBrandReference || buildBrandReferenceFromProfile(storedBrandProfile);
      const currentRoomShell = environmentService.getState().roomShell;
      const response = await environmentPlannerService.generatePlan({
        prompt: currentInputs.compositePrompt,
        referenceImages,
        roomConstraints: {
          currentShell: `${currentRoomShell.type} ${currentRoomShell.width}x${currentRoomShell.depth}x${currentRoomShell.height}m, ${currentRoomShell.openCeiling ? 'open ceiling' : 'closed ceiling'}`,
          supportsParametricGeometry: true,
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
        brandReference: resolvedBrandReference,
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
    const runTestApiTask = (task: () => Promise<void> | void): void => {
      plannerWindow.__virtualStudioAiPlannerTestApiError = null;
      void Promise.resolve()
        .then(task)
        .catch((taskError) => {
          const message = taskError instanceof Error
            ? taskError.message
            : 'AI planner test task failed';
          plannerWindow.__virtualStudioAiPlannerTestApiError = message;
          setError(message);
          setLoading(false);
          setApplyLoading(false);
        });
    };
    const buildSnapshot = (): AIPlannerTestSnapshot => {
      const currentInputs = getCurrentPlannerInputs();
      const currentUiState = plannerUiStateRef.current;
      return {
        open: currentUiState.open,
        loading: currentUiState.loading,
        applyLoading: currentUiState.applyLoading,
        hasEnoughInput: currentInputs.hasEnoughInput,
        brief: currentInputs.brief,
        worldModelProvider: currentInputs.worldModelProvider,
        selectedTemplateId: currentInputs.selectedTemplateId,
        selectedFileNames: currentInputs.selectedFileNames,
        brandName: currentInputs.brandName,
        brandNotes: currentInputs.brandNotes,
        brandLogoName: currentInputs.brandLogoFile?.name ?? null,
        selectedBrandPaletteId: currentUiState.selectedBrandPaletteId,
        selectedBrandDirectionId: currentUiState.selectedBrandDirectionId,
        storedBrandProfileName: currentUiState.storedBrandProfileName,
        resultConcept: resultRef.current?.plan.concept ?? null,
        hasResult: Boolean(resultRef.current),
        appliedCount: currentUiState.applyResult?.applied.length ?? 0,
        skippedCount: currentUiState.applyResult?.skipped.length ?? 0,
        backendValidated: Boolean(currentUiState.applyResult?.assemblyValidation?.backendValidated),
        assemblyDifferenceCount: currentUiState.applyResult?.assemblyValidation?.differences.length ?? 0,
        requestCount: plannerWindow.__virtualStudioEnvironmentPlannerRequests?.length ?? 0,
        lastTestApiError: plannerWindow.__virtualStudioAiPlannerTestApiError ?? null,
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
        if (draft.brandName !== undefined) setBrandName(draft.brandName);
        if (draft.brandNotes !== undefined) setBrandNotes(draft.brandNotes);
        if (draft.selectedTemplateId !== undefined) setSelectedTemplateId(draft.selectedTemplateId);
        if (draft.worldModelProvider !== undefined) setWorldModelProvider(draft.worldModelProvider);
        if (draft.geniePrompt !== undefined) setGeniePrompt(draft.geniePrompt);
        if (draft.genieNotes !== undefined) setGenieNotes(draft.genieNotes);
        if (draft.brandLogoImage !== undefined) {
          if (draft.brandLogoImage) {
            const brandFile = await dataUrlToFile(draft.brandLogoImage);
            setBrandLogoFile(brandFile);
            setBrandLogoDataUrl(draft.brandLogoImage.dataUrl);
            try {
              const paletteOptions = await extractBrandPaletteOptionsFromFile(brandFile);
              setBrandPaletteOptions(paletteOptions);
              setSelectedBrandPaletteId(paletteOptions[0]?.id || '');
            } catch {
              setBrandPaletteOptions([]);
              setSelectedBrandPaletteId('');
            }
          } else {
            setBrandLogoFile(null);
            setBrandLogoDataUrl(null);
            setBrandPaletteOptions([]);
            setSelectedBrandPaletteId('');
          }
        }
        if (draft.referenceImages !== undefined) {
          const files = await Promise.all(draft.referenceImages.map(dataUrlToFile));
          setReferenceFiles(files);
        }

        setResult(null);
        setApplyResult(null);
        setError(null);
        lastSignatureRef.current = '';
        plannerWindow.__virtualStudioAiPlannerTestApiError = null;
        await waitForPlannerCondition(() => {
          const snapshot = buildSnapshot();
          const brandReady = draft.brandLogoImage === undefined
            || snapshot.brandLogoName === draft.brandLogoImage?.name
            || draft.brandLogoImage === null;
          const refsReady = draft.referenceImages === undefined
            || snapshot.selectedFileNames.length === draft.referenceImages.length;
          return snapshot.brief === (draft.brief ?? snapshot.brief)
            && brandReady
            && refsReady;
        });
        return buildSnapshot();
      },
      generate: async () => {
        const initialSnapshot = buildSnapshot();
        runTestApiTask(() => triggerGeneration(true));
        await waitForPlannerCondition(() => {
          const nextSnapshot = buildSnapshot();
          return nextSnapshot.loading
            || nextSnapshot.hasResult
            || nextSnapshot.requestCount !== initialSnapshot.requestCount
            || Boolean(nextSnapshot.lastTestApiError);
        }, 60_000);
        await waitForPlannerCondition(() => {
          const nextSnapshot = buildSnapshot();
          if (nextSnapshot.loading) {
            return false;
          }
          return nextSnapshot.hasResult
            || Boolean(nextSnapshot.lastTestApiError);
        }, 60_000);
        return buildSnapshot();
      },
      apply: async () => {
        plannerWindow.__virtualStudioAiPlannerTestApiError = null;
        await handleApply();
        await waitForPlannerUiTurn();
        await waitForPlannerUiTurn();
        await waitForPlannerCondition(() => {
          const nextSnapshot = buildSnapshot();
          return !nextSnapshot.applyLoading;
        }, 180_000);
        return buildSnapshot();
      },
      startApply: async () => {
        runTestApiTask(() => handleApply());
        await waitForPlannerUiTurn();
        await waitForPlannerUiTurn();
        return buildSnapshot();
      },
      clearBrandInputs: async () => {
        setBrandName('');
        setBrandNotes('');
        setBrandLogoFile(null);
        setBrandPaletteOptions([]);
        setSelectedBrandPaletteId('');
        setSelectedBrandDirectionId(getBrandDirectionPresets()[0]?.id || 'trattoria-warm');
        setBrandLogoDataUrl(null);
        setResult(null);
        setApplyResult(null);
        setError(null);
        lastSignatureRef.current = '';
        await waitForPlannerUiTurn();
        await waitForPlannerUiTurn();
        return buildSnapshot();
      },
      useStoredBrandProfile: async () => {
        await handleUseStoredBrandProfile();
        await waitForPlannerUiTurn();
        await waitForPlannerUiTurn();
        return buildSnapshot();
      },
      clearStoredBrandProfile: async () => {
        await handleClearStoredBrandProfile();
        await waitForPlannerUiTurn();
        await waitForPlannerUiTurn();
        return buildSnapshot();
      },
      getSnapshot: () => buildSnapshot(),
    };

    return () => {
      delete plannerWindow.__virtualStudioAiPlannerTestApi;
    };
  }, [
    applyLoading,
    applyResult,
    loading,
    open,
    result,
    storedBrandProfile,
    brief,
    brandName,
    brandNotes,
    brandLogoFile?.name,
    requestSignature,
    selectedBrandDirectionId,
    selectedBrandPaletteId,
    selectedFileNames,
    selectedTemplateId,
    worldModelProvider,
  ]);

  const planInsights = result ? getEnvironmentPlanInsightPresentation(result.plan, applyResult?.evaluation) : null;

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

          <Stack spacing={1.25}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Branding
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Valgfritt. Last opp logo hvis du vil at AI skal foreslå palett, skilting og branded uniformer på karakterene.
            </Typography>
            {(brandProfileLoading || storedBrandProfile) && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {brandProfileLoading && <CircularProgress size={16} />}
                {storedBrandProfile && (
                  <>
                    <Chip
                      size="small"
                      color="secondary"
                      variant="outlined"
                      label={`Lagret brandprofil: ${storedBrandProfile.brandName || 'Uten navn'}`}
                    />
                    <Button variant="text" onClick={() => void handleUseStoredBrandProfile()}>
                      Bruk lagret profil
                    </Button>
                    <Button variant="text" color="inherit" onClick={() => void handleClearStoredBrandProfile()}>
                      Fjern lagret profil
                    </Button>
                  </>
                )}
              </Stack>
            )}
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
                label="Brand / kunde"
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Luigi's Pizza, kundens kampanje, intern brand"
                fullWidth
              />
              <TextField
                label="Branding-notater"
                value={brandNotes}
                onChange={(event) => setBrandNotes(event.target.value)}
                placeholder="Farger, tone, uniform, skilt, emballasje"
                fullWidth
              />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => brandLogoInputRef.current?.click()}
              >
                Last opp logo
              </Button>
              <input
                ref={brandLogoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleBrandLogoChange}
              />
              {brandLogoFile && (
                <Chip size="small" color="secondary" variant="outlined" label={`Logo: ${brandLogoFile.name}`} />
              )}
            </Stack>
            {brandPaletteOptions.length > 0 && (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">
                    Velg paletten AI skal bruke på lokale, skilt og uniformer.
                  </Typography>
                  {brandPaletteLoading && <CircularProgress size={16} />}
                  {storedBrandProfile && selectedBrandPalette && (
                    <Chip size="small" variant="outlined" label={`Aktiv: ${selectedBrandPalette.label}`} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {brandPaletteOptions.map((option) => {
                    const isSelected = selectedBrandPalette?.id === option.id;
                    return (
                      <Button
                        key={option.id}
                        variant={isSelected ? 'contained' : 'outlined'}
                        color={isSelected ? 'primary' : 'inherit'}
                        onClick={() => setSelectedBrandPaletteId(option.id)}
                        sx={{
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                          px: 1.5,
                          py: 1,
                          minWidth: 180,
                          textTransform: 'none',
                        }}
                      >
                        <Stack spacing={0.75} alignItems="flex-start">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {option.label}
                          </Typography>
                          <Typography variant="caption" color={isSelected ? 'inherit' : 'text.secondary'}>
                            {option.description}
                          </Typography>
                          <Stack direction="row" spacing={0.75}>
                            {option.colors.map((color) => (
                              <Box
                                key={`${option.id}-${color}`}
                                sx={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '50%',
                                  bgcolor: color,
                                  border: '1px solid rgba(255,255,255,0.4)',
                                  boxShadow: '0 0 0 1px rgba(15,23,42,0.18)',
                                }}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      </Button>
                    );
                  })}
                </Stack>
              </Stack>
            )}
            {(brandPaletteOptions.length > 0 || storedBrandProfile) && (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2" color="text.secondary">
                    Velg hvordan brandet skal slå ut i scene, packaging og uniformer.
                  </Typography>
                  {selectedBrandDirection && (
                    <Chip size="small" variant="outlined" label={`Look: ${selectedBrandDirection.label}`} />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {brandDirectionOptions.map((direction) => {
                    const isSelected = selectedBrandDirection?.id === direction.id;
                    return (
                      <Button
                        key={direction.id}
                        variant={isSelected ? 'contained' : 'outlined'}
                        color={isSelected ? 'secondary' : 'inherit'}
                        onClick={() => setSelectedBrandDirectionId(direction.id)}
                        sx={{
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                          px: 1.5,
                          py: 1,
                          minWidth: 210,
                          textTransform: 'none',
                        }}
                      >
                        <Stack spacing={0.75} alignItems="flex-start">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {direction.label}
                          </Typography>
                          <Typography variant="caption" color={isSelected ? 'inherit' : 'text.secondary'}>
                            {direction.description}
                          </Typography>
                          <Typography variant="caption" color={isSelected ? 'inherit' : 'text.secondary'}>
                            {direction.signageStyle} / {direction.packagingStyle} / {direction.uniformPolicy}
                          </Typography>
                        </Stack>
                      </Button>
                    );
                  })}
                </Stack>
              </Stack>
            )}
          </Stack>

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

              {result.plan.characters.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Karakterer AI vil sette inn
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {result.plan.characters.map((character) => (
                      <Chip
                        key={`${character.name}-${character.role}`}
                        size="small"
                        color={character.priority === 'high' ? 'secondary' : 'default'}
                        variant="outlined"
                        label={[
                          `${character.name} · ${character.role}`,
                          character.appearance?.skinTone ? `hud ${character.appearance.skinTone}` : null,
                          character.appearance?.hairStyle ? `hår ${character.appearance.hairStyle}` : null,
                        ].filter(Boolean).join(' · ')}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {result.plan.branding?.enabled && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Branding og palett
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {result.plan.branding.brandName && (
                      <Chip size="small" color="secondary" label={result.plan.branding.brandName} />
                    )}
                    {result.plan.branding.signageText && (
                      <Chip size="small" variant="outlined" label={`Skilt: ${result.plan.branding.signageText}`} />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {result.plan.branding.palette.map((color) => (
                      <Chip
                        key={color}
                        size="small"
                        label={color}
                        sx={{
                          bgcolor: color,
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.24)',
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {planInsights && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    AI kreative valg
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Chip size="small" color="info" label={`Familie: ${planInsights.familyLabel}`} />
                    {planInsights.validationModeLabel && (
                      <Chip size="small" variant="outlined" label={planInsights.validationModeLabel} />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 0.75 }}>
                    {planInsights.summary}
                  </Typography>
                  <Stack spacing={0.5}>
                    {planInsights.lightingDetails.map((detail) => (
                      <Typography key={detail} variant="caption" sx={{ display: 'block' }}>
                        {detail}
                      </Typography>
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
                <Stack spacing={1.25}>
                  <Alert severity={applyResult.skipped.length > 0 ? 'warning' : 'success'}>
                    Anvendt: {applyResult.applied.join(', ') || 'ingenting'}
                    {applyResult.skipped.length > 0 ? ` | Hoppet over: ${applyResult.skipped.join(', ')}` : ''}
                  </Alert>

                  {(() => {
                    const validationState = getAssemblyValidationAlertState(applyResult.assemblyValidation);
                    if (!validationState) {
                      return null;
                    }

                    return (
                      <Alert severity={validationState.severity}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {validationState.title}
                          </Typography>
                          {validationState.details.map((detail) => (
                            <Typography key={detail} variant="caption" sx={{ display: 'block' }}>
                              {detail}
                            </Typography>
                          ))}
                        </Stack>
                      </Alert>
                    );
                  })()}

                  {(() => {
                    const evaluationState = getEnvironmentEvaluationPresentation(applyResult.evaluation);
                    if (!evaluationState) {
                      return null;
                    }

                    return (
                      <Alert severity={evaluationState.severity}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {evaluationState.title}
                          </Typography>
                          <Typography variant="caption">
                            {evaluationState.summary}
                          </Typography>
                          {evaluationState.details.map((detail) => (
                            <Typography key={detail} variant="caption" sx={{ display: 'block' }}>
                              {detail}
                            </Typography>
                          ))}
                        </Stack>
                      </Alert>
                    );
                  })()}

                  {applyResult.refinement?.attempted && (
                    <Alert severity={applyResult.refinement.accepted ? 'info' : applyResult.refinement.reverted ? 'warning' : 'info'}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {applyResult.refinement.accepted
                            ? 'AI finjusterte scenen etter preview-sjekk'
                            : applyResult.refinement.reverted
                              ? 'AI testet en finjustering, men beholdt originalscenen'
                              : 'AI vurderte auto-justering'}
                        </Typography>
                        {typeof applyResult.refinement.initialScore === 'number' && typeof applyResult.refinement.finalScore === 'number' && (
                          <Typography variant="caption">
                            Score: {Math.round(applyResult.refinement.initialScore * 100)}% til {Math.round(applyResult.refinement.finalScore * 100)}%
                          </Typography>
                        )}
                        {typeof applyResult.refinement.attemptedIterations === 'number' && applyResult.refinement.attemptedIterations > 0 && (
                          <Typography variant="caption">
                            Iterasjoner: {applyResult.refinement.attemptedIterations}
                          </Typography>
                        )}
                        {applyResult.refinement.changes.map((detail) => (
                          <Typography key={detail} variant="caption" sx={{ display: 'block' }}>
                            {detail}
                          </Typography>
                        ))}
                      </Stack>
                    </Alert>
                  )}
                </Stack>
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
