import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  Tooltip,
  Popover,
  Paper,
  Menu,
  Badge,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Save as SaveIcon,
  FolderOpen as FolderOpenIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Layers as LayersIcon,
  Timeline as TimelineIcon,
  PhotoLibrary as PhotoLibraryIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  CompareArrows as CompareIcon,
  DragIndicator as DragIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  Restore as RestoreIcon,
  Folder as FolderIcon,
  History as HistoryIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Wallpaper as WallpaperIcon,
} from '@mui/icons-material';
import { SceneComposition, SceneComparison } from '../core/models/sceneComposer';
import { sceneComposerService } from '../services/sceneComposerService';
import { sceneVersionService } from '../services/sceneVersionService';
import { sceneAutoSaveService } from '../services/sceneAutoSaveService';
import { SceneMetadataEditor } from './SceneMetadataEditor';
import { TimelineEditor } from './TimelineEditor';
import { LayerEditor } from './LayerEditor';
import { sceneValidationService } from '../services/sceneValidationService';
import { sceneOptimizationService } from '../services/sceneOptimizationService';
import { sceneAnalysisService } from '../services/sceneAnalysisService';
import { sceneVariationService } from '../services/sceneVariationService';
import { EnvironmentBrowser } from './EnvironmentBrowser';
import { MasterSequencer } from './MasterSequencer';
interface SceneComposerPanelProps {
  onClose?: () => void;
  onSaveScene?: (scene: SceneComposition) => void;
  onLoadScene?: (scene: SceneComposition) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

type SceneComposerTabKey =
  | 'scenes'
  | 'timeline'
  | 'layers'
  | 'environment'
  | 'export'
  | 'advanced'
  | 'sequence';

const SCENE_COMPOSER_TAB_INDEX: Record<SceneComposerTabKey, number> = {
  scenes: 0,
  timeline: 1,
  layers: 2,
  environment: 3,
  export: 4,
  advanced: 5,
  sequence: 6,
};

function resolveSceneComposerTabIndex(tab: unknown): number | null {
  if (typeof tab === 'number' && Number.isInteger(tab) && tab >= 0 && tab <= 6) {
    return tab;
  }

  if (typeof tab !== 'string') {
    return null;
  }

  const normalizedTab = tab.trim().toLowerCase() as SceneComposerTabKey;
  return SCENE_COMPOSER_TAB_INDEX[normalizedTab] ?? null;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scene-composer-tabpanel-${index}`}
      aria-labelledby={`scene-composer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

type SortOption = 'name' | 'createdAt' | 'updatedAt' | 'size';

export function SceneComposerPanel({ onClose, onSaveScene, onLoadScene }: SceneComposerPanelProps) {
  const [tabValue, setTabValue] = useState(0);
  const [scenes, setScenes] = useState<SceneComposition[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneComposition | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Phase 1 improvements state
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<HTMLElement | null>(null);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [comparisonScene1, setComparisonScene1] = useState<SceneComposition | null>(null);
  const [comparisonScene2, setComparisonScene2] = useState<SceneComposition | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  
  // Phase 2 improvements state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(sceneAutoSaveService.isEnabled());
  const [autoSaveInterval, setAutoSaveInterval] = useState(sceneAutoSaveService.getInterval());
  const [metadataEditorOpen, setMetadataEditorOpen] = useState(false);
  const [metadataScene, setMetadataScene] = useState<SceneComposition | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeScene1, setMergeScene1] = useState<SceneComposition | null>(null);
  const [mergeScene2, setMergeScene2] = useState<SceneComposition | null>(null);
  const [mergeName, setMergeName] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [backupRestoreDialogOpen, setBackupRestoreDialogOpen] = useState(false);
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [trashedScenes, setTrashedScenes] = useState<SceneComposition[]>([]);

  // Load scenes on mount
  useEffect(() => {
    loadScenes();
    // Initialize auto-save if enabled
    if (autoSaveEnabled) {
      sceneAutoSaveService.enable(autoSaveInterval);
    }
    return () => {
      sceneAutoSaveService.disable();
    };
  }, []);

  // Update auto-save when scene is saved
  useEffect(() => {
    if (autoSaveEnabled && selectedScene) {
      sceneAutoSaveService.updateScene(selectedScene);
    }
  }, [selectedScene, autoSaveEnabled]);

  useEffect(() => {
    const handleOpenSceneComposer = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: SceneComposerTabKey | number }>;
      const nextTabValue = resolveSceneComposerTabIndex(customEvent.detail?.tab);
      if (nextTabValue !== null) {
        setTabValue(nextTabValue);
      }
    };

    window.addEventListener('ch-open-scene-composer', handleOpenSceneComposer as EventListener);
    return () => {
      window.removeEventListener('ch-open-scene-composer', handleOpenSceneComposer as EventListener);
    };
  }, []);

  const loadScenes = () => {
    const allScenes = sceneComposerService.getAllScenes().filter(s => !s.deletedAt);
    // Calculate sizes for scenes that don't have it
    allScenes.forEach(scene => {
      if (!scene.size) {
        scene.size = sceneComposerService.calculateSceneSize(scene);
      }
    });
    setScenes(allScenes);
  };

  // Filtered and sorted scenes
  const filteredScenes = useMemo(() => {
    let filtered = sceneComposerService.filterScenes(scenes, {
      searchQuery,
      tags: filterTags.length > 0 ? filterTags : undefined,
      favoritesOnly: showFavoritesOnly,
    });
    return sceneComposerService.sortScenes(filtered, sortBy);
  }, [scenes, searchQuery, filterTags, showFavoritesOnly, sortBy]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    scenes.forEach(scene => {
      scene.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [scenes]);

  const handleSaveClick = () => {
    setSceneName('');
    setSceneDescription('');
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (!sceneName.trim()) return;

    setIsSaving(true);
    try {
      if (onSaveScene) {
        // Capture environment state
        const environment = sceneComposerService.captureEnvironmentState();
        
        // Capture gobo state
        const gobos = sceneComposerService.captureGoboState();
        
        const tempScene: SceneComposition = {
          id: sceneComposerService.generateSceneId(),
          name: sceneName,
          description: sceneDescription,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cameras: [],
          lights: [],
          actors: [],
          props: [],
          cameraSettings: {
            aperture: 2.8,
            shutter: '1/125',
            iso: 100,
            focalLength: 35,
            nd: 0,
          },
          layers: [],
          tags: [],
          isFavorite: false,
          order: scenes.length,
          environment: environment, // Include environment state
          gobos: gobos.length > 0 ? gobos : undefined, // Include gobo state
        };
        await onSaveScene(tempScene);
        loadScenes();
      }
      setSaveDialogOpen(false);
    } catch (error) {
      console.error('Error saving scene:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadScene = (scene: SceneComposition) => {
    if (onLoadScene) {
      onLoadScene(scene);
    }
    
    // Restore environment if present
    if (scene.environment) {
      sceneComposerService.restoreEnvironment(scene.environment);
    }
    
    // Restore gobos if present
    if (scene.gobos && scene.gobos.length > 0) {
      sceneComposerService.restoreGobos(scene.gobos);
    }
  };

  const handleDeleteScene = (id: string) => {
    if (window.confirm('Er du sikker på at du vil slette denne scenen?')) {
      sceneComposerService.moveToTrash(id);
      loadScenes();
      if (selectedScene?.id === id) {
        setSelectedScene(null);
      }
      selectedScenes.delete(id);
      setSelectedScenes(new Set(selectedScenes));
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sceneComposerService.toggleFavorite(id);
    loadScenes();
  };

  const handleDuplicateScene = (id: string) => {
    const duplicated = sceneComposerService.duplicateScene(id);
    if (duplicated) {
      loadScenes();
    }
  };

  const handleExportScene = (scene: SceneComposition) => {
    try {
      sceneComposerService.downloadScene(scene);
    } catch (error) {
      console.error('Error exporting scene:', error);
      alert('Kunne ikke eksportere scene');
    }
  };

  const handleImportScene = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const scene = await sceneComposerService.importSceneFromFile(file);
      await sceneComposerService.saveScene(scene);
      loadScenes();
    } catch (error) {
      console.error('Error importing scene:', error);
      alert('Kunne ikke importere scene');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleBulkDelete = () => {
    if (selectedScenes.size === 0) return;
    if (window.confirm(`Er du sikker på at du vil slette ${selectedScenes.size} scener?`)) {
      selectedScenes.forEach(id => {
        sceneComposerService.moveToTrash(id);
      });
      setSelectedScenes(new Set());
      loadScenes();
    }
  };

  const handleBulkExport = () => {
    selectedScenes.forEach(id => {
      const scene = sceneComposerService.loadScene(id);
      if (scene) {
        handleExportScene(scene);
      }
    });
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedScenes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedScenes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedScenes.size === filteredScenes.length) {
      setSelectedScenes(new Set());
    } else {
      setSelectedScenes(new Set(filteredScenes.map(s => s.id)));
    }
  };

  const handleCompareScenes = (scene1: SceneComposition, scene2: SceneComposition) => {
    setComparisonScene1(scene1);
    setComparisonScene2(scene2);
    setComparisonDialogOpen(true);
  };

  const calculateDifferences = (scene1: SceneComposition, scene2: SceneComposition): SceneComparison['differences'] => {
    return {
      cameras: {
        added: scene2.cameras.filter(c2 => !scene1.cameras.some(c1 => c1.id === c2.id)).map(c => c.id),
        removed: scene1.cameras.filter(c1 => !scene2.cameras.some(c2 => c2.id === c1.id)).map(c => c.id),
        modified: scene1.cameras.filter(c1 => {
          const c2 = scene2.cameras.find(c => c.id === c1.id);
          return c2 && JSON.stringify(c1) !== JSON.stringify(c2);
        }).map(c => c.id),
      },
      lights: {
        added: scene2.lights.filter(l2 => !scene1.lights.some(l1 => l1.id === l2.id)).map(l => l.id),
        removed: scene1.lights.filter(l1 => !scene2.lights.some(l2 => l2.id === l1.id)).map(l => l.id),
        modified: scene1.lights.filter(l1 => {
          const l2 = scene2.lights.find(l => l.id === l1.id);
          return l2 && JSON.stringify(l1) !== JSON.stringify(l2);
        }).map(l => l.id),
      },
      actors: {
        added: scene2.actors.filter(a2 => !scene1.actors.some(a1 => a1.id === a2.id)).map(a => a.id),
        removed: scene1.actors.filter(a1 => !scene2.actors.some(a2 => a2.id === a1.id)).map(a => a.id),
        modified: scene1.actors.filter(a1 => {
          const a2 = scene2.actors.find(a => a.id === a1.id);
          return a2 && JSON.stringify(a1) !== JSON.stringify(a2);
        }).map(a => a.id),
      },
      props: {
        added: scene2.props.filter(p2 => !scene1.props.some(p1 => p1.id === p2.id)).map(p => p.id),
        removed: scene1.props.filter(p1 => !scene2.props.some(p2 => p2.id === p1.id)).map(p => p.id),
        modified: scene1.props.filter(p1 => {
          const p2 = scene2.props.find(p => p.id === p1.id);
          return p2 && JSON.stringify(p1) !== JSON.stringify(p2);
        }).map(p => p.id),
      },
      settings: {
        changed: Object.keys(scene1.cameraSettings).filter(key => {
          return (scene1.cameraSettings as any)[key] !== (scene2.cameraSettings as any)[key];
        }),
      },
      environment: {
        walls: {
          added: (scene2.environment?.walls || []).filter(w2 => !(scene1.environment?.walls || []).some(w1 => w1.id === w2.id)).map(w => w.id),
          removed: (scene1.environment?.walls || []).filter(w1 => !(scene2.environment?.walls || []).some(w2 => w2.id === w1.id)).map(w => w.id),
          modified: (scene1.environment?.walls || []).filter(w1 => {
            const w2 = (scene2.environment?.walls || []).find(w => w.id === w1.id);
            return w2 && JSON.stringify(w1) !== JSON.stringify(w2);
          }).map(w => w.id),
        },
        floors: {
          added: (scene2.environment?.floors || []).filter(f2 => !(scene1.environment?.floors || []).some(f1 => f1.id === f2.id)).map(f => f.id),
          removed: (scene1.environment?.floors || []).filter(f1 => !(scene2.environment?.floors || []).some(f2 => f2.id === f1.id)).map(f => f.id),
          modified: (scene1.environment?.floors || []).filter(f1 => {
            const f2 = (scene2.environment?.floors || []).find(f => f.id === f1.id);
            return f2 && JSON.stringify(f1) !== JSON.stringify(f2);
          }).map(f => f.id),
        },
        atmosphere: {
          changed: scene1.environment?.atmosphere && scene2.environment?.atmosphere
            ? Object.keys(scene1.environment.atmosphere).filter(key => {
                return (scene1.environment!.atmosphere as any)[key] !== (scene2.environment!.atmosphere as any)[key];
              })
            : [],
        },
      },
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    setDraggedSceneId(sceneId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault();
    if (!draggedSceneId || draggedSceneId === targetSceneId) return;

    const draggedScene = scenes.find(s => s.id === draggedSceneId);
    const targetScene = scenes.find(s => s.id === targetSceneId);
    if (draggedScene && targetScene) {
      const tempOrder = draggedScene.order || 0;
      draggedScene.order = targetScene.order || 0;
      targetScene.order = tempOrder;
      sceneComposerService.saveScene(draggedScene);
      sceneComposerService.saveScene(targetScene);
      loadScenes();
    }
    setDraggedSceneId(null);
  };

  // Phase 2 handler functions
  const handleToggleAutoSave = () => {
    const newEnabled = !autoSaveEnabled;
    setAutoSaveEnabled(newEnabled);
    if (newEnabled) {
      sceneAutoSaveService.enable(autoSaveInterval);
    } else {
      sceneAutoSaveService.disable();
    }
  };

  const handleAutoSaveIntervalChange = (interval: number) => {
    setAutoSaveInterval(interval);
    sceneAutoSaveService.setInterval(interval);
  };

  const handleOpenMetadataEditor = (scene: SceneComposition) => {
    setMetadataScene(scene);
    setMetadataEditorOpen(true);
  };

  const handleSaveMetadata = (updatedScene: SceneComposition) => {
    loadScenes();
    if (selectedScene?.id === updatedScene.id) {
      setSelectedScene(updatedScene);
    }
  };

  const handleOpenMergeDialog = (scene1: SceneComposition, scene2?: SceneComposition) => {
    setMergeScene1(scene1);
    setMergeScene2(scene2 || null);
    setMergeName(`${scene1.name} + ${scene2?.name || 'Scene'}`);
    setMergeDialogOpen(true);
  };

  const handleMergeScenes = () => {
    if (!mergeScene1 || !mergeScene2 || !mergeName.trim()) return;
    const merged = sceneComposerService.mergeScenes(mergeScene1.id, mergeScene2.id, mergeName);
    if (merged) {
      loadScenes();
      setMergeDialogOpen(false);
      alert(`Scener slått sammen: ${merged.name}`);
    }
  };

  const handleSaveAsTemplate = (scene: SceneComposition) => {
    setMetadataScene(scene);
    setTemplateName(`${scene.name} Template`);
    setTemplateDialogOpen(true);
  };

  const handleConfirmTemplate = () => {
    if (!metadataScene || !templateName.trim()) return;
    sceneComposerService.saveAsTemplate(metadataScene.id, templateName);
    setTemplateDialogOpen(false);
    alert(`Template lagret: ${templateName}`);
  };

  const handleShareScene = (scene: SceneComposition) => {
    const link = sceneComposerService.exportAsShareableLink(scene);
    setShareLink(link);
    setShareDialogOpen(true);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link kopiert til utklippstavle!');
  };

  const handleBackupScenes = () => {
    try {
      sceneComposerService.backupScenes();
      alert('Backup fullført!');
    } catch (error) {
      console.error('Error backing up scenes:', error);
      alert('Kunne ikke lage backup');
    }
  };

  const handleRestoreFromBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await sceneComposerService.restoreFromBackup(file);
      alert(`Gjenopprettet ${result.restored} scener. ${result.errors} feil.`);
      loadScenes();
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Kunne ikke gjenopprette backup');
    } finally {
      event.target.value = '';
    }
  };

  const handleOpenTrash = () => {
    const trashed = sceneComposerService.getTrashedScenes();
    setTrashedScenes(trashed);
    setTrashDialogOpen(true);
  };

  const handleRestoreFromTrash = (id: string) => {
    sceneComposerService.restoreFromTrash(id);
    loadScenes();
    setTrashedScenes(sceneComposerService.getTrashedScenes());
  };

  const handlePermanentlyDelete = (id: string) => {
    if (window.confirm('Er du sikker på at du vil permanent slette denne scenen? Dette kan ikke angres.')) {
      sceneComposerService.permanentlyDelete(id);
      loadScenes();
      setTrashedScenes(sceneComposerService.getTrashedScenes());
    }
  };

  const handleOpenVersionHistory = (scene: SceneComposition) => {
    setMetadataScene(scene);
    setVersionHistoryOpen(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
      <Tabs
        value={tabValue}
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: '48px',
          '& .MuiTab-root': {
            minHeight: '48px',
            fontSize: '14px',
            textTransform: 'none',
            color: 'rgba(255,255,255,0.87)',
            '&.Mui-selected': {
              color: '#00d4ff',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#00d4ff',
          },
        }}
      >
        <Tab icon={<PhotoLibraryIcon />} iconPosition="start" label="Scener" />
        <Tab icon={<TimelineIcon />} iconPosition="start" label="Timeline" />
        <Tab icon={<LayersIcon />} iconPosition="start" label="Layers" />
        <Tab icon={<WallpaperIcon />} iconPosition="start" label="Miljø" />
        <Tab icon={<FileDownloadIcon />} iconPosition="start" label="Eksport" />
        <Tab icon={<LayersIcon />} iconPosition="start" label="Avansert" />
        <Tab icon={<TimelineIcon />} iconPosition="start" label="Sekvens" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Scener Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Toolbar with search, sort, filter */}
          <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveClick}
                sx={{
                  bgcolor: '#00d4ff',
                  color: '#000',
                  '&:hover': { bgcolor: '#00b8e6' },
                  minHeight: '44px',
                  fontSize: '14px',
                }}
              >
                Lagre Scene
              </Button>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={loadScenes}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#fff',
                  '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                  minHeight: '44px',
                  fontSize: '14px',
                }}
              >
                Oppdater
              </Button>
              
              {/* Phase 2: Auto-save toggle */}
              <Tooltip title={`Auto-save: ${autoSaveEnabled ? 'På' : 'Av'} (${autoSaveInterval / 1000}s)`}>
                <Button
                  variant={autoSaveEnabled ? 'contained' : 'outlined'}
                  onClick={handleToggleAutoSave}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: autoSaveEnabled ? '#000' : '#fff',
                    bgcolor: autoSaveEnabled ? '#10b981' : 'transparent',
                    '&:hover': { borderColor: '#10b981', bgcolor: autoSaveEnabled ? '#10b981' : 'rgba(16,185,129,0.1)' },
                    minHeight: '44px',
                    fontSize: '14px',
                  }}
                >
                  Auto-save
                </Button>
              </Tooltip>

              {/* Phase 2: Backup button */}
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleBackupScenes}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#fff',
                  '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                  minHeight: '44px',
                  fontSize: '14px',
                }}
              >
                Backup
              </Button>

              {/* Phase 2: Trash button */}
              <Button
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={handleOpenTrash}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: '#fff',
                  '&:hover': { borderColor: '#ff4444', bgcolor: 'rgba(255,68,68,0.1)' },
                  minHeight: '44px',
                  fontSize: '14px',
                }}
              >
                Papirkurv
              </Button>
              
              {selectedScenes.size > 0 && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                    {selectedScenes.size} valgt
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                    sx={{ color: '#ff4444' }}
                  >
                    Slett
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleBulkExport}
                    sx={{ color: '#00d4ff' }}
                  >
                    Eksporter
                  </Button>
                </>
              )}
            </Box>

            {/* Search and filters */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="Søk scener..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.87)', mr: 1 }} />,
                }}
                sx={{
                  flex: 1,
                  minWidth: '200px',
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: '#00d4ff' },
                  },
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Sorter</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  label="Sorter"
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' },
                  }}
                >
                  <MenuItem value="name">Navn</MenuItem>
                  <MenuItem value="createdAt">Opprettet</MenuItem>
                  <MenuItem value="updatedAt">Oppdatert</MenuItem>
                  <MenuItem value="size">Størrelse</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant={showFavoritesOnly ? 'contained' : 'outlined'}
                startIcon={<StarIcon />}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: showFavoritesOnly ? '#000' : '#fff',
                  bgcolor: showFavoritesOnly ? '#ffb800' : 'transparent',
                  '&:hover': { borderColor: '#ffb800', bgcolor: showFavoritesOnly ? '#ffb800' : 'rgba(255,184,0,0.1)' },
                }}
              >
                Favoritter
              </Button>
            </Box>

            {/* Tags filter */}
            {allTags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mr: 1 }}>
                  Tags:
                </Typography>
                {allTags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => {
                      if (filterTags.includes(tag)) {
                        setFilterTags(filterTags.filter(t => t !== tag));
                      } else {
                        setFilterTags([...filterTags, tag]);
                      }
                    }}
                    sx={{
                      bgcolor: filterTags.includes(tag) ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                      color: filterTags.includes(tag) ? '#000' : '#fff',
                      cursor: 'pointer',
                    }}
                  />
                ))}
                {filterTags.length > 0 && (
                  <Button
                    size="small"
                    onClick={() => setFilterTags([])}
                    sx={{ color: 'rgba(255,255,255,0.87)' }}
                  >
                    Nullstill
                  </Button>
                )}
              </Box>
            )}
          </Box>

          {filteredScenes.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                color: 'rgba(255,255,255,0.87)',
              }}
            >
              <PhotoLibraryIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                {scenes.length === 0 ? 'Ingen scener lagret' : 'Ingen scener matcher filter'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {scenes.length === 0 ? 'Lagre din første scene for å komme i gang' : 'Prøv å endre søk eller filter'}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select all checkbox */}
              <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={selectedScenes.size === filteredScenes.length && filteredScenes.length > 0}
                  indeterminate={selectedScenes.size > 0 && selectedScenes.size < filteredScenes.length}
                  onChange={handleSelectAll}
                  sx={{ color: 'rgba(255,255,255,0.87)' }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                  Velg alle ({filteredScenes.length} scener)
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {filteredScenes.map((scene, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={scene.id}>
                    <Card
                      draggable
                      onDragStart={(e) => handleDragStart(e, scene.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, scene.id)}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.05)',
                        border: selectedScene?.id === scene.id ? '2px solid #00d4ff' : 
                                selectedScenes.has(scene.id) ? '2px solid #ffb800' : 
                                '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        '&:hover': {
                          borderColor: '#00d4ff',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => setSelectedScene(scene)}
                      onMouseEnter={(e) => {
                        setHoveredScene(scene.id);
                        setPreviewAnchor(e.currentTarget);
                      }}
                      onMouseLeave={() => {
                        setHoveredScene(null);
                        setPreviewAnchor(null);
                      }}
                    >
                      {/* Favorite star */}
                      <IconButton
                        size="small"
                        onClick={(e) => handleToggleFavorite(scene.id, e)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 10,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: scene.isFavorite ? '#ffb800' : 'rgba(255,255,255,0.7)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        }}
                      >
                        {scene.isFavorite ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>

                      {/* Selection checkbox */}
                      <Checkbox
                        checked={selectedScenes.has(scene.id)}
                        onClick={(e) => handleToggleSelect(scene.id, e)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          zIndex: 10,
                          color: 'rgba(255,255,255,0.87)',
                          '&.Mui-checked': { color: '#ffb800' },
                        }}
                      />

                      {/* Drag handle */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 40,
                          zIndex: 10,
                          color: 'rgba(255,255,255,0.87)',
                          cursor: 'grab',
                          '&:active': { cursor: 'grabbing' },
                        }}
                      >
                        <DragIcon fontSize="small" />
                      </Box>

                      {/* Thumbnail - larger size (320x180) */}
                      {scene.thumbnail ? (
                        <CardMedia
                          component="img"
                          height="180"
                          image={scene.thumbnail}
                          alt={scene.name}
                          sx={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 180,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          <PhotoLibraryIcon sx={{ fontSize: 48 }} />
                        </Box>
                      )}

                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1, fontSize: '16px', color: '#fff' }}>
                          {scene.name}
                        </Typography>
                        {scene.description && (
                          <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.87)', fontSize: '12px' }}>
                            {scene.description}
                          </Typography>
                        )}
                        
                        {/* Tags as chips */}
                        {scene.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                            {scene.tags.slice(0, 3).map(tag => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(0,212,255,0.2)',
                                  color: '#00d4ff',
                                  fontSize: '10px',
                                  height: '20px',
                                }}
                              />
                            ))}
                            {scene.tags.length > 3 && (
                              <Chip
                                label={`+${scene.tags.length - 3}`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.1)',
                                  color: 'rgba(255,255,255,0.87)',
                                  fontSize: '10px',
                                  height: '20px',
                                }}
                              />
                            )}
                          </Box>
                        )}

                        {/* Statistics */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={`${scene.cameras.length} kameraer`}
                            size="small"
                            sx={{ bgcolor: 'rgba(0,212,255,0.2)', color: '#00d4ff', fontSize: '11px' }}
                          />
                          <Chip
                            label={`${scene.lights.length} lys`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,184,0,0.2)', color: '#ffb800', fontSize: '11px' }}
                          />
                          <Chip
                            label={`${scene.actors.length + scene.props.length} objekter`}
                            size="small"
                            sx={{ bgcolor: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '11px' }}
                          />
                          {scene.environment && (scene.environment.walls.length > 0 || scene.environment.floors.length > 0) && (
                            <Chip
                              label={`${scene.environment.walls.length + scene.environment.floors.length} miljø`}
                              size="small"
                              sx={{ bgcolor: 'rgba(142,68,173,0.2)', color: '#8e44ad', fontSize: '11px' }}
                            />
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.87)', fontSize: '11px' }}>
                            {formatDate(scene.updatedAt)}
                          </Typography>
                          {scene.size && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.87)', fontSize: '11px' }}>
                              {formatSize(scene.size)}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button
                            size="small"
                            startIcon={<FolderOpenIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadScene(scene);
                            }}
                            sx={{
                              fontSize: '12px',
                              color: '#00d4ff',
                              '&:hover': { bgcolor: 'rgba(0,212,255,0.1)' },
                            }}
                          >
                            Last
                          </Button>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportScene(scene);
                            }}
                            sx={{
                              fontSize: '12px',
                              color: '#fff',
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                            }}
                          >
                            Eksporter
                          </Button>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuAnchor({ x: e.clientX, y: e.clientY, sceneId: scene.id });
                            }}
                            sx={{ color: 'rgba(255,255,255,0.87)', ml: 'auto' }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </TabPanel>

        {/* Timeline Tab */}
        <TabPanel value={tabValue} index={1}>
          {selectedScene?.timeline ? (
            <TimelineEditor
              timeline={selectedScene.timeline}
              onTimelineChange={(updatedTimeline) => {
                if (selectedScene) {
                  const updated: SceneComposition = {
                    ...selectedScene,
                    timeline: updatedTimeline,
                    updatedAt: new Date().toISOString(),
                  };
                  sceneComposerService.saveScene(updated);
                  loadScenes();
                  setSelectedScene(updated);
                }
              }}
              onTimeUpdate={(time) => {
                // Update scene based on timeline time
                // This would trigger updates to the 3D scene
              }}
            />
          ) : (
            <Box sx={{ p: 2, textAlign: 'center', color: 'rgba(255,255,255,0.87)' }}>
              <TimelineIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Ingen scene valgt
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Velg en scene fra Scener-fanen for å redigere timeline
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* Layers Tab */}
        <TabPanel value={tabValue} index={2}>
          {selectedScene ? (
            <LayerEditor
              layers={selectedScene.layers || []}
              onLayersChange={(updatedLayers) => {
                if (selectedScene) {
                  const updated: SceneComposition = {
                    ...selectedScene,
                    layers: updatedLayers,
                    updatedAt: new Date().toISOString(),
                  };
                  sceneComposerService.saveScene(updated);
                  loadScenes();
                  setSelectedScene(updated);
                }
              }}
            />
          ) : (
            <Box sx={{ p: 2, textAlign: 'center', color: 'rgba(255,255,255,0.87)' }}>
              <LayersIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Ingen scene valgt
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Velg en scene fra Scener-fanen for å redigere layers
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* Miljø Tab */}
        <TabPanel value={tabValue} index={3}>
          <EnvironmentBrowser isActive={tabValue === 3} />
        </TabPanel>

        {/* Eksport Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
              Eksporter/Importer Scene
            </Typography>
            <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Auto-save Settings */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, color: 'rgba(255,255,255,0.9)' }}>
                Auto-save Innstillinger
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Switch
                  checked={autoSaveEnabled}
                  onChange={handleToggleAutoSave}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#10b981',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#10b981',
                    },
                  }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                  Auto-save: {autoSaveEnabled ? 'På' : 'Av'}
                </Typography>
              </Box>
              {autoSaveEnabled && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.87)' }}>Auto-save Intervall</InputLabel>
                  <Select
                    value={autoSaveInterval}
                    onChange={(e) => handleAutoSaveIntervalChange(Number(e.target.value))}
                    label="Auto-save Intervall"
                    sx={{
                      color: '#fff',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    }}
                  >
                    <MenuItem value={30000}>30 sekunder</MenuItem>
                    <MenuItem value={60000}>1 minutt</MenuItem>
                    <MenuItem value={120000}>2 minutter</MenuItem>
                    <MenuItem value={300000}>5 minutter</MenuItem>
                    <MenuItem value={600000}>10 minutter</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            {/* Backup/Restore */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Backup og Gjenoppretting
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.87)' }}>
                Lag backup av alle scener eller gjenopprett fra en tidligere backup.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleBackupScenes}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                    minHeight: '44px',
                  }}
                >
                  Lag Backup
                </Button>
                <input
                  accept=".json"
                  style={{ display: 'none' }}
                  id="restore-backup-file"
                  type="file"
                  onChange={handleRestoreFromBackup}
                />
                <label htmlFor="restore-backup-file">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: '#fff',
                      '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                      minHeight: '44px',
                    }}
                  >
                    Gjenopprett fra Backup
                  </Button>
                </label>
              </Box>
            </Box>

            <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Eksporter Scene
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.87)' }}>
                Velg en scene fra Scener-fanen og klikk på "Eksporter" for å laste ned som JSON-fil.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                Importer Scene
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.87)' }}>
                Last opp en JSON-fil for å importere en scene.
              </Typography>
              <input
                accept=".json"
                style={{ display: 'none' }}
                id="import-scene-file"
                type="file"
                onChange={handleImportScene}
              />
              <label htmlFor="import-scene-file">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                    minHeight: '44px',
                  }}
                >
                  Velg Fil
                </Button>
              </label>
              {isLoading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                </Box>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Avansert Tab */}
        <TabPanel value={tabValue} index={5}>
          {selectedScene ? (
            <Box>
              {/* Validation */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                  Validering
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const issues = sceneValidationService.validateScene(selectedScene);
                    const summary = sceneValidationService.getValidationSummary(issues);
                    alert(`Validering fullført:\n${summary.errors} feil\n${summary.warnings} advarsler\n${summary.info} info`);
                  }}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    mb: 2,
                    '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                  }}
                >
                  Valider Scene
                </Button>
              </Box>

              {/* Optimization */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                  Optimalisering
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const result = sceneOptimizationService.optimizeScene(selectedScene);
                    if (result.changes.length > 0) {
                      if (window.confirm(`Optimalisering funnet:\n${result.changes.join('\n')}\n\nYtelsesgevinst: ${result.performanceGain}%\n\nVil du lagre den optimaliserte scenen?`)) {
                        sceneComposerService.saveScene(result.optimized);
                        loadScenes();
                        setSelectedScene(result.optimized);
                      }
                    } else {
                      alert('Ingen optimaliseringer funnet');
                    }
                  }}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    mb: 2,
                    '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                  }}
                >
                  Optimaliser Scene
                </Button>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                  Kompleksitetsscore: {sceneOptimizationService.getComplexityScore(selectedScene)}
                </Typography>
              </Box>

              {/* Analysis */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                  Analyse
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const analysis = sceneAnalysisService.analyzeScene(selectedScene);
                    const report = `
Komposisjon:
- Rule of Thirds: ${(analysis.composition.ruleOfThirds * 100).toFixed(0)}%
- Symmetri: ${(analysis.composition.symmetry * 100).toFixed(0)}%
- Balanse: ${(analysis.composition.balance * 100).toFixed(0)}%

Lys:
- Total intensitet: ${analysis.lighting.totalIntensity.toFixed(1)}
- Gjennomsnittlig CCT: ${analysis.lighting.averageCCT.toFixed(0)}K
- Distribusjon: ${analysis.lighting.distribution}

Kamera:
- Gjennomsnittlig FOV: ${analysis.camera.averageFov.toFixed(1)}°
- Dekning: ${(analysis.camera.coverage * 100).toFixed(0)}%

Anbefalinger:
${analysis.recommendations.length > 0 ? analysis.recommendations.map(r => `- ${r}`).join('\n') : 'Ingen'}
                    `.trim();
                    alert(report);
                  }}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    mb: 2,
                    '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                  }}
                >
                  Analyser Scene
                </Button>
              </Box>

              {/* Variations */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                  Variasjoner (A/B Testing)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {(['A', 'B', 'C', 'D', 'E'] as const).map(variant => (
                    <Button
                      key={variant}
                      variant="outlined"
                      onClick={() => {
                        const variation = sceneVariationService.createVariation(selectedScene, variant, {
                          cameras: true,
                          lights: true,
                          actors: true,
                          props: true,
                          settings: true,
                        });
                        alert(`Variasjon ${variant} opprettet: ${variation.name}`);
                      }}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: '#fff',
                        '&:hover': { borderColor: '#00d4ff', bgcolor: 'rgba(0,212,255,0.1)' },
                      }}
                    >
                      Variant {variant}
                    </Button>
                  ))}
                </Box>
                {(() => {
                  const variations = sceneVariationService.getVariations(selectedScene.id);
                  return variations.length > 0 ? (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.87)' }}>
                        Eksisterende variasjoner:
                      </Typography>
                      {variations.map(variation => (
                        <Chip
                          key={variation.id}
                          label={variation.name}
                          onClick={() => {
                            const updated = sceneVariationService.applyVariation(selectedScene, variation);
                            sceneComposerService.saveScene(updated);
                            loadScenes();
                            setSelectedScene(updated);
                            alert(`Variasjon ${variation.variant} anvendt`);
                          }}
                          sx={{
                            mr: 1,
                            mb: 1,
                            bgcolor: 'rgba(0,212,255,0.2)',
                            color: '#00d4ff',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Box>
                  ) : null;
                })()}
              </Box>
            </Box>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center', color: 'rgba(255,255,255,0.87)' }}>
              <LayersIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Ingen scene valgt
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Velg en scene fra Scener-fanen for å bruke avanserte funksjoner
              </Typography>
            </Box>
          )}
        </TabPanel>

        {/* Sekvens Tab — Master Sequencer */}
        <TabPanel value={tabValue} index={6}>
          <Box sx={{ height: 480, display: 'flex', flexDirection: 'column' }}>
            <MasterSequencer
              scenes={scenes.filter((s) => !s.deletedAt)}
              onLoadScene={(scene) => {
                if (onLoadScene) onLoadScene(scene);
              }}
            />
          </Box>
        </TabPanel>
      </Box>

      {/* Hover Preview Popover */}
      <Popover
        open={hoveredScene !== null && previewAnchor !== null}
        anchorEl={previewAnchor}
        onClose={() => {
          setHoveredScene(null);
          setPreviewAnchor(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          pointerEvents: 'none',
        }}
      >
        {hoveredScene && (() => {
          const scene = scenes.find(s => s.id === hoveredScene);
          if (!scene) return null;
          return (
            <Paper sx={{ p: 2, maxWidth: 400, bgcolor: '#1c2128' }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#fff' }}>
                {scene.name}
              </Typography>
              {scene.thumbnail && (
                <Box
                  component="img"
                  src={scene.thumbnail}
                  alt={scene.name}
                  sx={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mb: 1,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', mb: 1 }}>
                {scene.description || 'Ingen beskrivelse'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${scene.cameras.length} kameraer`} size="small" />
                <Chip label={`${scene.lights.length} lys`} size="small" />
                <Chip label={`${scene.actors.length + scene.props.length} objekter`} size="small" />
              </Box>
            </Paper>
          );
        })()}
      </Popover>

      {/* Context Menu */}
      <Menu
        open={contextMenuAnchor !== null}
        onClose={() => setContextMenuAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenuAnchor
            ? { top: contextMenuAnchor.y, left: contextMenuAnchor.x }
            : undefined
        }
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        {contextMenuAnchor && (() => {
          const scene = scenes.find(s => s.id === contextMenuAnchor.sceneId);
          if (!scene) return null;
          return (
            <>
              <MenuItem
                onClick={() => {
                  handleDuplicateScene(scene.id);
                  setContextMenuAnchor(null);
                }}
              >
                <FolderOpenIcon sx={{ mr: 1 }} /> Dupliser
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenMetadataEditor(scene);
                  setContextMenuAnchor(null);
                }}
              >
                <FolderIcon sx={{ mr: 1 }} /> Rediger Metadata
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleSaveAsTemplate(scene);
                  setContextMenuAnchor(null);
                }}
              >
                <SaveIcon sx={{ mr: 1 }} /> Lagre som Template
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleShareScene(scene);
                  setContextMenuAnchor(null);
                }}
              >
                <UploadIcon sx={{ mr: 1 }} /> Del Scene
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleOpenVersionHistory(scene);
                  setContextMenuAnchor(null);
                }}
              >
                <HistoryIcon sx={{ mr: 1 }} /> Versjonshistorikk
              </MenuItem>
              <MenuItem
                onClick={() => {
                  if (selectedScene && selectedScene.id !== scene.id) {
                    handleOpenMergeDialog(scene, selectedScene);
                  }
                  setContextMenuAnchor(null);
                }}
                disabled={!selectedScene || selectedScene.id === scene.id}
              >
                <CompareIcon sx={{ mr: 1 }} /> Slå sammen
              </MenuItem>
              <MenuItem
                onClick={() => {
                  if (selectedScene && selectedScene.id !== scene.id) {
                    handleCompareScenes(selectedScene, scene);
                  }
                  setContextMenuAnchor(null);
                }}
                disabled={!selectedScene || selectedScene.id === scene.id}
              >
                <CompareIcon sx={{ mr: 1 }} /> Sammenlign
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <MenuItem
                onClick={() => {
                  handleDeleteScene(scene.id);
                  setContextMenuAnchor(null);
                }}
                sx={{ color: '#ff4444' }}
              >
                <DeleteIcon sx={{ mr: 1 }} /> Slett
              </MenuItem>
            </>
          );
        })()}
      </Menu>

      {/* Comparison Dialog */}
      <Dialog
        open={comparisonDialogOpen}
        onClose={() => setComparisonDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Sammenlign Scener</DialogTitle>
        <DialogContent>
          {comparisonScene1 && comparisonScene2 && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
                    {comparisonScene1.name}
                  </Typography>
                  {comparisonScene1.thumbnail && (
                    <Box
                      component="img"
                      src={comparisonScene1.thumbnail}
                      alt={comparisonScene1.name}
                      sx={{
                        width: '100%',
                        maxHeight: 300,
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 2,
                      }}
                    />
                  )}
                </Grid>
                <Grid size={6}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
                    {comparisonScene2.name}
                  </Typography>
                  {comparisonScene2.thumbnail && (
                    <Box
                      component="img"
                      src={comparisonScene2.thumbnail}
                      alt={comparisonScene2.name}
                      sx={{
                        width: '100%',
                        maxHeight: 300,
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 2,
                      }}
                    />
                  )}
                </Grid>
              </Grid>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Typography variant="h6" sx={{ mb: 2 }}>
                Endringer
              </Typography>
              {(() => {
                const diff = calculateDifferences(comparisonScene1, comparisonScene2);
                return (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Kameraer: {diff.cameras.added.length} lagt til, {diff.cameras.removed.length} fjernet, {diff.cameras.modified.length} endret
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Lys: {diff.lights.added.length} lagt til, {diff.lights.removed.length} fjernet, {diff.lights.modified.length} endret
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Aktører: {diff.actors.added.length} lagt til, {diff.actors.removed.length} fjernet, {diff.actors.modified.length} endret
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Props: {diff.props.added.length} lagt til, {diff.props.removed.length} fjernet, {diff.props.modified.length} endret
                    </Typography>
                    <Typography variant="body2">
                      Innstillinger: {diff.settings.changed.length} endret
                    </Typography>
                  </Box>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComparisonDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.87)' }}>
            Lukk
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Versjonshistorikk - {metadataScene?.name}</DialogTitle>
        <DialogContent>
          {metadataScene ? (() => {
            const versions = sceneVersionService.getVersions(metadataScene.id);
            return versions.length > 0 ? (
              <List>
                {versions.map(version => (
                  <ListItem
                    key={version.id}
                    sx={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    <ListItemText
                      primary={`Versjon ${version.version}`}
                      secondary={version.changes || formatDate(version.createdAt)}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        onClick={() => {
                          const restored = sceneVersionService.restoreToVersion(metadataScene, version.version);
                          if (restored && onLoadScene) {
                            onLoadScene(restored);
                            alert(`Gjenopprettet til versjon ${version.version}`);
                          }
                        }}
                        sx={{ color: '#00d4ff' }}
                      >
                        Gjenopprett
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
                Ingen versjoner lagret for denne scenen
              </Typography>
            );
          })() : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionHistoryOpen(false)} sx={{ color: 'rgba(255,255,255,0.87)' }}>
            Lukk
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Slå sammen scener</DialogTitle>
        <DialogContent>
          {mergeScene1 && mergeScene2 && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.87)' }}>
                Slår sammen "{mergeScene1.name}" og "{mergeScene2.name}"
              </Typography>
              <TextField
                autoFocus
                margin="dense"
                label="Navn på sammenslått scene"
                fullWidth
                variant="outlined"
                value={mergeName}
                onChange={(e) => setMergeName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: '#00d4ff' },
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.87)' }}>
            Avbryt
          </Button>
          <Button
            onClick={handleMergeScenes}
            variant="contained"
            disabled={!mergeName.trim()}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              '&:hover': { bgcolor: '#00b8e6' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' },
            }}
          >
            Slå sammen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Lagre som Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template-navn"
            fullWidth
            variant="outlined"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: '#00d4ff' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.87)' }}>
            Avbryt
          </Button>
          <Button
            onClick={handleConfirmTemplate}
            variant="contained"
            disabled={!templateName.trim()}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              '&:hover': { bgcolor: '#00b8e6' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' },
            }}
          >
            Lagre Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Del Scene</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.87)' }}>
            Kopier denne linken for å dele scenen:
          </Typography>
          <TextField
            fullWidth
            value={shareLink}
            inputProps={{ readOnly: true }}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyShareLink} variant="contained" sx={{ bgcolor: '#00d4ff', color: '#000' }}>
            Kopier Link
          </Button>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.87)' }}>
            Lukk
          </Button>
        </DialogActions>
      </Dialog>

      {/* Trash Dialog */}
      <Dialog
        open={trashDialogOpen}
        onClose={() => setTrashDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Papirkurv</DialogTitle>
        <DialogContent>
          {trashedScenes.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)' }}>
              Papirkurven er tom
            </Typography>
          ) : (
            <List>
              {trashedScenes.map(scene => (
                <ListItem
                  key={scene.id}
                  sx={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={scene.name}
                    secondary={formatDate(scene.deletedAt || scene.updatedAt)}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      startIcon={<RestoreIcon />}
                      onClick={() => handleRestoreFromTrash(scene.id)}
                      sx={{ color: '#00d4ff', mr: 1 }}
                    >
                      Gjenopprett
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handlePermanentlyDelete(scene.id)}
                      sx={{ color: '#ff4444' }}
                    >
                      Slett permanent
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrashDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.87)' }}>
            Lukk
          </Button>
        </DialogActions>
      </Dialog>

      {/* Metadata Editor */}
      <SceneMetadataEditor
        open={metadataEditorOpen}
        scene={metadataScene}
        onClose={() => {
          setMetadataEditorOpen(false);
          setMetadataScene(null);
        }}
        onSave={handleSaveMetadata}
      />

      {/* Save Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Lagre Scene</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Scene-navn"
            fullWidth
            variant="outlined"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            sx={{
              mb: 2,
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: '#00d4ff' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
            }}
          />
          <TextField
            margin="dense"
            label="Beskrivelse (valgfritt)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: '#00d4ff' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSaveDialogOpen(false)}
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            disabled={!sceneName.trim() || isSaving}
            sx={{
              bgcolor: '#00d4ff',
              color: '#000',
              '&:hover': { bgcolor: '#00b8e6' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' },
            }}
          >
            {isSaving ? 'Lagrer...' : 'Lagre'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
