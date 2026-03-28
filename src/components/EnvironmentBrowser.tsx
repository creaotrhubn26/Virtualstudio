/**
 * EnvironmentBrowser - Panel for browsing and applying environment presets
 * Includes walls, floors, and complete environment configurations
 */

import {
  useState,
  useEffect,
  type FC,
  type ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import {
  Alert,
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CloseIcon from '@mui/icons-material/Close';

import { environmentService, EnvironmentState } from '../core/services/environmentService';
import { WALL_CATEGORIES, WALL_MATERIALS, WallMaterial, WallCategory } from '../data/wallDefinitions';
import { FLOOR_CATEGORIES, FLOOR_MATERIALS, FloorMaterial, FloorCategory } from '../data/floorDefinitions';
import { ENVIRONMENT_CATEGORIES, ENVIRONMENT_PRESETS, EnvironmentPreset, EnvironmentCategory } from '../data/environmentPresets';
import { ambientSoundsService } from '../services/AmbientSoundsService';
import { AIEnvironmentPlannerDialog } from './AIEnvironmentPlannerDialog';
import type { EnvironmentAssemblyValidationSummary } from '../services/environmentAssemblyValidation';
import type { EnvironmentPlanEvaluationSummary } from '../core/models/environmentPlan';
import { getEnvironmentEvaluationPresentation } from '../services/environmentEvaluationPresentation';
import type { EnvironmentPlanInsightPresentation } from '../services/environmentPlanInsightPresentation';
import {
  marketplaceEnvironmentService,
  type InstalledMarketplaceEnvironmentPackage,
} from '../services/marketplaceEnvironmentService';
import { marketplaceEnvironmentPackService } from '../services/marketplaceEnvironmentPackService';
import { marketplaceService } from '../services/marketplaceService';
import type { MarketplaceEnvironmentRegistryPublishMode } from '../services/marketplaceRegistryService';
import type { MarketplaceEnvironmentPackQualityReport } from '../core/models/marketplace';
interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%', overflow: 'auto' }}>
      {value === index && children}
    </div>
  );
}

// Material Card Component
const MaterialCard: FC<{
  material: WallMaterial | FloorMaterial;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ material, isSelected, onSelect }) => (
  <Card
    onClick={onSelect}
    sx={{
      cursor: 'pointer',
      border: isSelected ? '2px solid #00d4ff' : '2px solid transparent',
      bgcolor: '#1e1e1e',
      transition: 'all 0.2s',
      '&:hover': { bgcolor: '#252525', transform: 'scale(1.02)' },
    }}
  >
    <Box
      sx={{
        height: 60,
        bgcolor: material.color || '#333',
        position: 'relative',
        ...('gradientColors' in material && material.gradientColors && {
          background: `linear-gradient(135deg, ${material.gradientColors.join(', ')})`,
        }),
      }}
    >
      {material.emissive && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 20px ${material.emissive}`,
            opacity: material.emissiveIntensity || 0.5,
          }}
        />
      )}
    </Box>
    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff', display: 'block' }}>
        {material.nameNo}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
        {material.tags.slice(0, 2).map(tag => (
          <Chip key={tag} label={tag} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#333' }} />
        ))}
      </Box>
    </CardContent>
  </Card>
);

// Environment Preset Card
const PresetCard: FC<{
  preset: EnvironmentPreset;
  isActive: boolean;
  onApply: () => void;
}> = ({ preset, isActive, onApply }) => (
  <Card
    onClick={onApply}
    sx={{
      cursor: 'pointer',
      border: isActive ? '2px solid #7c3aed' : '2px solid transparent',
      bgcolor: '#1e1e1e',
      transition: 'all 0.2s',
      '&:hover': { bgcolor: '#252525' },
    }}
  >
    <CardContent sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
        {preset.nameNo}
      </Typography>
      <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
        {preset.descriptionNo}
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {preset.moodTags.slice(0, 3).map(tag => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              bgcolor: preset.category === 'lovecraft' ? '#4a1a4a' : '#1a3a4a',
              color: '#fff',
            }}
          />
        ))}
      </Box>
    </CardContent>
  </Card>
);

const MarketplaceEnvironmentCard: FC<{
  environmentPackage: InstalledMarketplaceEnvironmentPackage;
  onApply: () => void;
}> = ({ environmentPackage, onApply }) => (
  <Card
    data-testid={`marketplace-environment-package-${environmentPackage.packageId}`}
    sx={{
      border: '1px solid rgba(124,58,237,0.45)',
      bgcolor: 'rgba(30, 22, 46, 0.92)',
    }}
  >
    <CardContent sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <CardMedia
          component="img"
          image={environmentPackage.thumbnail}
          alt={environmentPackage.name}
          sx={{ width: 84, height: 60, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 0.75 }}>
            <Chip label="Marketplace" size="small" sx={{ bgcolor: '#7c3aed', color: '#fff' }} />
            {environmentPackage.environmentCategory && (
              <Chip label={environmentPackage.environmentCategory} size="small" sx={{ bgcolor: '#2d3748', color: '#e2e8f0' }} />
            )}
            {environmentPackage.familyId && (
              <Chip label={environmentPackage.familyId} size="small" sx={{ bgcolor: '#1f2937', color: '#cbd5e1' }} />
            )}
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fff' }}>
            {environmentPackage.name}
          </Typography>
          <Typography variant="caption" sx={{ color: '#a1a1aa', display: 'block', mb: 1 }}>
            {environmentPackage.summary || environmentPackage.description}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {environmentPackage.tags.slice(0, 4).map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#312e81', color: '#e0e7ff' }} />
              ))}
            </Box>
            <Button
              size="small"
              variant="contained"
              data-testid={`apply-marketplace-environment-package-${environmentPackage.packageId}`}
              onClick={onApply}
              sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
            >
              Bruk miljø
            </Button>
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

interface EnvironmentBrowserProps {
  isActive?: boolean;
}

export const EnvironmentBrowser: FC<EnvironmentBrowserProps> = ({
  isActive = true,
}) => {
  const AI_PLANNER_WELCOME_KEY = 'virtualstudio-ai-planner-welcome-seen';
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallCategory, setSelectedWallCategory] = useState<WallCategory | 'all'>('all');
  const [selectedFloorCategory, setSelectedFloorCategory] = useState<FloorCategory | 'all'>('all');
  const [selectedEnvCategory, setSelectedEnvCategory] = useState<EnvironmentCategory | 'all'>('all');
  const [envState, setEnvState] = useState<EnvironmentState>(environmentService.getState());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishName, setPublishName] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishTags, setPublishTags] = useState('');
  const [publishWarnings, setPublishWarnings] = useState<string[]>([]);
  const [publishBlockingIssues, setPublishBlockingIssues] = useState<string[]>([]);
  const [publishQualityReport, setPublishQualityReport] = useState<MarketplaceEnvironmentPackQualityReport | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<MarketplaceEnvironmentRegistryPublishMode>('save_copy');
  const [publishCanPublishShared, setPublishCanPublishShared] = useState(false);
  const [publishCanUpdateSource, setPublishCanUpdateSource] = useState(false);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [publishSourceProductName, setPublishSourceProductName] = useState<string | null>(null);
  const [marketplacePackages, setMarketplacePackages] = useState<InstalledMarketplaceEnvironmentPackage[]>(
    () => marketplaceEnvironmentService.getInstalledPackages(),
  );
  const [assemblyValidation, setAssemblyValidation] = useState<EnvironmentAssemblyValidationSummary | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return (window as Window & {
      __virtualStudioLastEnvironmentAssemblyValidation?: EnvironmentAssemblyValidationSummary;
    }).__virtualStudioLastEnvironmentAssemblyValidation ?? null;
  });
  const [environmentEvaluation, setEnvironmentEvaluation] = useState<EnvironmentPlanEvaluationSummary | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return (window as Window & {
      __virtualStudioLastEnvironmentEvaluation?: EnvironmentPlanEvaluationSummary;
    }).__virtualStudioLastEnvironmentEvaluation ?? null;
  });
  const [environmentInsights, setEnvironmentInsights] = useState<EnvironmentPlanInsightPresentation | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return (window as Window & {
      __virtualStudioLastEnvironmentPlanInsights?: EnvironmentPlanInsightPresentation;
    }).__virtualStudioLastEnvironmentPlanInsights ?? null;
  });

  useEffect(() => {
    const unsubscribe = environmentService.subscribe(setEnvState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    return marketplaceEnvironmentService.subscribe(setMarketplacePackages);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isActive) return;
    const hasSeenWelcome = window.sessionStorage.getItem(AI_PLANNER_WELCOME_KEY) === 'true';
    if (hasSeenWelcome) return;

    const timeoutId = window.setTimeout(() => {
      setAiPlannerOpen(true);
      window.sessionStorage.setItem(AI_PLANNER_WELCOME_KEY, 'true');
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isActive]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleValidationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<EnvironmentAssemblyValidationSummary>;
      setAssemblyValidation(customEvent.detail || null);
    };
    const handleEvaluationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<EnvironmentPlanEvaluationSummary>;
      setEnvironmentEvaluation(customEvent.detail || null);
    };
    const handleInsightsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<EnvironmentPlanInsightPresentation>;
      setEnvironmentInsights(customEvent.detail || null);
    };

    window.addEventListener('vs-environment-assembly-validation-updated', handleValidationUpdate as EventListener);
    window.addEventListener('vs-environment-evaluation-updated', handleEvaluationUpdate as EventListener);
    window.addEventListener('vs-environment-plan-insights-updated', handleInsightsUpdate as EventListener);
    return () => {
      window.removeEventListener('vs-environment-assembly-validation-updated', handleValidationUpdate as EventListener);
      window.removeEventListener('vs-environment-evaluation-updated', handleEvaluationUpdate as EventListener);
      window.removeEventListener('vs-environment-plan-insights-updated', handleInsightsUpdate as EventListener);
    };
  }, []);

  const environmentEvaluationPresentation = getEnvironmentEvaluationPresentation(environmentEvaluation);

  // Filter materials based on search and category
  const filteredWalls = WALL_MATERIALS.filter(w => {
    const matchesCategory = selectedWallCategory === 'all' || w.category === selectedWallCategory;
    const matchesSearch = !searchQuery ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredFloors = FLOOR_MATERIALS.filter(f => {
    const matchesCategory = selectedFloorCategory === 'all' || f.category === selectedFloorCategory;
    const matchesSearch = !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredPresets = [...ENVIRONMENT_PRESETS, ...environmentService.getCustomPresets()].filter(p => {
    const matchesCategory = selectedEnvCategory === 'all' || p.category === selectedEnvCategory;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredMarketplacePackages = marketplacePackages.filter((entry) => {
    const matchesCategory = selectedEnvCategory === 'all' || entry.environmentCategory === selectedEnvCategory;
    const lowerSearch = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery
      || entry.name.toLowerCase().includes(lowerSearch)
      || entry.description.toLowerCase().includes(lowerSearch)
      || (entry.summary || '').toLowerCase().includes(lowerSearch)
      || entry.tags.some((tag) => tag.toLowerCase().includes(lowerSearch));
    return matchesCategory && matchesSearch;
  });

  const handleSaveCustom = () => {
    if (customName.trim()) {
      environmentService.saveAsCustomPreset(customName.trim());
      setCustomName('');
      setSaveDialogOpen(false);
    }
  };

  const handleApplyPreset = (preset: EnvironmentPreset) => {
    environmentService.applyPreset(preset.id);
    
    // Load ambient sounds if available
    if (preset.ambientSounds && preset.ambientSounds.length > 0) {
      // Initialize service if not already done
      ambientSoundsService.initialize();
      // Load the soundscape
      ambientSoundsService.loadEnvironmentSounds(preset.ambientSounds);
    }
  };

  const handleOpenPublishDialog = async () => {
    setPublishLoading(true);
    setPublishFeedback(null);
    setPublishWarnings([]);
    setPublishBlockingIssues([]);
    try {
      const draft = await marketplaceEnvironmentPackService.buildDraft();
      setPublishName(draft.product.name);
      setPublishDescription(draft.product.description);
      setPublishTags(draft.product.tags.join(', '));
      setPublishWarnings(draft.qualityReport.warnings || draft.validation.warnings || []);
      setPublishBlockingIssues(draft.qualityReport.blockingIssues || draft.validation.blockingIssues || []);
      setPublishQualityReport(draft.qualityReport);
      setPublishMode(draft.publishMode);
      setPublishCanPublishShared(draft.publishContext.canPublishShared);
      setPublishCanUpdateSource(draft.publishContext.canUpdateSource);
      setPublishNotice(draft.publishContext.notice);
      setPublishSourceProductName(draft.publishContext.sourceProductName);
      setPublishDialogOpen(true);
    } catch (error) {
      setPublishFeedback(error instanceof Error ? error.message : 'Kunne ikke forberede miljøpakken.');
    } finally {
      setPublishLoading(false);
    }
  };

  const handlePublishEnvironmentPack = async () => {
    setPublishSubmitting(true);
    setPublishFeedback(null);
    try {
      const publishedProduct = await marketplaceService.publishCurrentEnvironmentPack({
        name: publishName,
        description: publishDescription,
        tags: publishTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        mode: publishMode,
      });
      setPublishDialogOpen(false);
      setPublishFeedback(`Publiserte miljøpakken "${publishedProduct.name}" til Marketplace.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vs-open-marketplace-panel'));
      }
    } catch (error) {
      setPublishFeedback(error instanceof Error ? error.message : 'Kunne ikke publisere miljøpakken.');
    } finally {
      setPublishSubmitting(false);
    }
  };

  const publishActionLabel = publishMode === 'update_shared'
    ? 'Oppdater delt pack'
    : publishMode === 'create_shared'
      ? 'Publiser delt pack'
      : 'Lagre egen kopi';

  return (
    <Box data-testid="environment-browser-panel" sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#141414', color: '#fff' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeIcon sx={{ color: '#7c3aed' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Miljø</Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="AI miljøplan">
            <IconButton size="small" onClick={() => setAiPlannerOpen(true)}>
              <AutoAwesomeIcon sx={{ color: '#7c3aed' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lagre som preset">
            <IconButton size="small" onClick={() => setSaveDialogOpen(true)}>
              <SaveIcon sx={{ color: '#888' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Publiser aktivt miljø som Marketplace-pack">
            <span>
              <IconButton
                size="small"
                data-testid="publish-environment-pack-button"
                onClick={() => { void handleOpenPublishDialog(); }}
                disabled={publishLoading}
              >
                <ColorLensIcon sx={{ color: '#f59e0b' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Søk materialer og presets..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#1e1e1e',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            },
          }}
        />

        {assemblyValidation && (
          <Alert
            severity={assemblyValidation.backendValidated && assemblyValidation.differences.length === 0 ? 'success' : assemblyValidation.backendValidated ? 'warning' : 'info'}
            sx={{ mt: 1.5, py: 0.75 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {assemblyValidation.backendValidated
                ? assemblyValidation.differences.length === 0
                  ? 'Siste AI-miljø ble backend-validert'
                  : 'Siste AI-miljø har assembly-avvik'
                : 'Siste AI-miljø brukte lokal assembly'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
              Props: {assemblyValidation.backendRuntimePropCount ?? assemblyValidation.localRuntimePropCount}
              {' · '}
              Relasjoner: {assemblyValidation.backendRelationshipCount ?? assemblyValidation.localRelationshipCount}
              {assemblyValidation.backendValidated && assemblyValidation.differences.length > 0
                ? ` · Avvik: ${assemblyValidation.differences.length}`
                : ''}
            </Typography>
          </Alert>
        )}

        {environmentEvaluationPresentation && (
          <Alert severity={environmentEvaluationPresentation.severity} sx={{ mt: 1.5, py: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {environmentEvaluationPresentation.title}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
              {environmentEvaluationPresentation.summary}
            </Typography>
          </Alert>
        )}

        {environmentInsights && (
          <Alert severity="info" sx={{ mt: 1.5, py: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              AI-retning: {environmentInsights.familyLabel}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
              {environmentInsights.summary}
            </Typography>
            {environmentInsights.validationModeLabel && (
              <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                Validering: {environmentInsights.validationModeLabel}
              </Typography>
            )}
            {environmentInsights.lightingDetails.slice(0, 2).map((detail) => (
              <Typography key={detail} variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                {detail}
              </Typography>
            ))}
          </Alert>
        )}

        {publishFeedback && (
          <Alert severity={publishFeedback.startsWith('Publiserte') ? 'success' : 'warning'} sx={{ mt: 1.5, py: 0.75 }}>
            <Typography variant="body2">{publishFeedback}</Typography>
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', minHeight: 40 }}
      >
        <Tab icon={<AutoAwesomeIcon />} label="Presets" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab icon={<WallpaperIcon />} label="Vegger" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab icon={<SquareFootIcon />} label="Gulv" sx={{ minHeight: 40, fontSize: 12 }} />
      </Tabs>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Presets Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label="Alle"
              size="small"
              onClick={() => setSelectedEnvCategory('all')}
              sx={{ bgcolor: selectedEnvCategory === 'all' ? '#7c3aed' : '#333' }}
            />
            {ENVIRONMENT_CATEGORIES.map(cat => (
              <Chip
                key={cat.id}
                label={`${cat.icon} ${cat.nameNo}`}
                size="small"
                onClick={() => setSelectedEnvCategory(cat.id)}
                sx={{ bgcolor: selectedEnvCategory === cat.id ? '#7c3aed' : '#333' }}
              />
            ))}
          </Box>

          {/* Presets Grid */}
          {filteredMarketplacePackages.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#c4b5fd', fontWeight: 700, letterSpacing: 0.2, display: 'block', mb: 1 }}>
                Installerte miljøpakker fra Marketplace
              </Typography>
              <Grid container spacing={1}>
                {filteredMarketplacePackages.map((entry) => (
                  <Grid size={12} key={entry.packageId}>
                    <MarketplaceEnvironmentCard
                      environmentPackage={entry}
                      onApply={() => {
                        void marketplaceEnvironmentService.applyInstalledPackage(entry.packageId);
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Grid container spacing={1}>
            {filteredPresets.map(preset => (
              <Grid size={12} key={preset.id}>
                <PresetCard
                  preset={preset}
                  isActive={envState.activePresetId === preset.id}
                  onApply={() => handleApplyPreset(preset)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Walls Tab */}
        <TabPanel value={tabValue} index={1}>
          {/* Wall Visibility Controls */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#1e1e1e', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
              Synlighet
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['backWall', 'leftWall', 'rightWall', 'rearWall'].map(wallId => (
                <Chip
                  key={wallId}
                  label={wallId.replace('Wall', '')}
                  size="small"
                  icon={envState.walls[wallId as keyof typeof envState.walls].visible ?
                    <VisibilityIcon sx={{ fontSize: 14 }} /> :
                    <VisibilityOffIcon sx={{ fontSize: 14 }} />}
                  onClick={() => environmentService.toggleWall(wallId)}
                  sx={{
                    bgcolor: envState.walls[wallId as keyof typeof envState.walls].visible ? '#2a4a2a' : '#333',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label="Alle"
              size="small"
              onClick={() => setSelectedWallCategory('all')}
              sx={{ bgcolor: selectedWallCategory === 'all' ? '#00d4ff' : '#333' }}
            />
            {WALL_CATEGORIES.map(cat => (
              <Chip
                key={cat.id}
                label={`${cat.icon} ${cat.nameNo}`}
                size="small"
                onClick={() => setSelectedWallCategory(cat.id)}
                sx={{ bgcolor: selectedWallCategory === cat.id ? '#00d4ff' : '#333' }}
              />
            ))}
          </Box>

          {/* Walls Grid */}
          <Grid container spacing={1}>
            {filteredWalls.map(wall => (
              <Grid size={6} key={wall.id}>
                <MaterialCard
                  material={wall}
                  isSelected={Object.values(envState.walls).some(w => w.materialId === wall.id)}
                  onSelect={() => environmentService.setAllWallsMaterial(wall.id)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Floor Tab */}
        <TabPanel value={tabValue} index={2}>
          {/* Floor Controls */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#1e1e1e', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={envState.floor.visible}
                    onChange={() => environmentService.toggleFloor()}
                    size="small"
                  />
                }
                label="Gulv"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={envState.floor.gridVisible}
                    onChange={() => environmentService.toggleGrid()}
                    size="small"
                  />
                }
                label="Rutenett"
              />
            </Box>
          </Box>

          {/* Category Filter */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            <Chip
              label="Alle"
              size="small"
              onClick={() => setSelectedFloorCategory('all')}
              sx={{ bgcolor: selectedFloorCategory === 'all' ? '#00d4ff' : '#333' }}
            />
            {FLOOR_CATEGORIES.map(cat => (
              <Chip
                key={cat.id}
                label={`${cat.icon} ${cat.nameNo}`}
                size="small"
                onClick={() => setSelectedFloorCategory(cat.id)}
                sx={{ bgcolor: selectedFloorCategory === cat.id ? '#00d4ff' : '#333' }}
              />
            ))}
          </Box>

          {/* Floors Grid */}
          <Grid container spacing={1}>
            {filteredFloors.map(floor => (
              <Grid size={6} key={floor.id}>
                <MaterialCard
                  material={floor}
                  isSelected={envState.floor.materialId === floor.id}
                  onSelect={() => environmentService.setFloorMaterial(floor.id)}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Box>

      {/* Save Custom Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Lagre som preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset navn"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Avbryt</Button>
          <Button variant="contained" onClick={handleSaveCustom}>Lagre</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={publishDialogOpen}
        onClose={() => !publishSubmitting && setPublishDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        data-testid="publish-environment-pack-dialog"
      >
        <DialogTitle>Publiser miljøpakke</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: '12px !important' }}>
          {publishBlockingIssues.length > 0 && (
            <Alert severity="warning">
              {publishBlockingIssues.join(' ')}
            </Alert>
          )}
          {publishWarnings.length > 0 && (
            <Alert severity="info">
              {publishWarnings.join(' ')}
            </Alert>
          )}
          {publishQualityReport && (
            <Alert severity={publishQualityReport.ready ? 'success' : 'warning'}>
              Kvalitetsrapport: {publishQualityReport.ready ? 'klar for release' : 'krever arbeid'}
              {typeof publishQualityReport.score === 'number' ? ` · score ${publishQualityReport.score.toFixed(2)}` : ''}
            </Alert>
          )}
          {publishNotice && (
            <Alert severity={publishMode === 'save_copy' ? 'info' : 'success'}>
              {publishNotice}
            </Alert>
          )}
          {publishCanPublishShared && (
            <FormControlLabel
              control={(
                <Switch
                  checked={publishMode !== 'save_copy'}
                  onChange={(_, checked) => {
                    if (checked) {
                      setPublishMode(publishCanUpdateSource ? 'update_shared' : 'create_shared');
                      if (
                        publishSourceProductName
                        && /\(kopi\)$/i.test(publishName.trim())
                      ) {
                        setPublishName(publishSourceProductName);
                      }
                    } else {
                      setPublishMode('save_copy');
                      if (
                        publishSourceProductName
                        && publishName.trim() === publishSourceProductName.trim()
                      ) {
                        setPublishName(`${publishSourceProductName} (kopi)`);
                      }
                    }
                  }}
                />
              )}
              label={
                publishCanUpdateSource
                  ? 'Oppdater den delte Marketplace-pakken'
                  : 'Publiser som delt Marketplace-pack'
              }
            />
          )}
          <TextField
            fullWidth
            label="Navn"
            value={publishName}
            onChange={(event) => setPublishName(event.target.value)}
          />
          <TextField
            fullWidth
            label="Beskrivelse"
            value={publishDescription}
            onChange={(event) => setPublishDescription(event.target.value)}
            multiline
            minRows={3}
          />
          <TextField
            fullWidth
            label="Tags"
            helperText="Kommaseparerte tags"
            value={publishTags}
            onChange={(event) => setPublishTags(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishDialogOpen(false)} disabled={publishSubmitting}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={() => { void handlePublishEnvironmentPack(); }}
            disabled={publishSubmitting || publishBlockingIssues.length > 0 || !publishName.trim()}
            data-testid="confirm-publish-environment-pack"
          >
            {publishActionLabel}
          </Button>
        </DialogActions>
      </Dialog>

      <AIEnvironmentPlannerDialog
        open={aiPlannerOpen}
        onClose={() => setAiPlannerOpen(false)}
      />
    </Box>
  );
};
