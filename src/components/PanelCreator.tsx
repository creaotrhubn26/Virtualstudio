/**
 * Panel Creator Component
 * Allows users to create and manage custom panels easily
 */

import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Close,
  ExpandMore,
  Save,
  Visibility,
  VisibilityOff,
  Palette,
  Help,
  Note,
  Movie,
  Inventory,
  Timer,
  Lightbulb,
  CameraAlt,
  Person,
  Settings,
  Public,
  SmartToy,
  BarChart,
  People,
  Upload,
  RocketLaunch,
  CheckCircle,
  Refresh,
  Publish,
  Category,
  Functions,
  Tag,
  PersonOutline,
  Folder,
  LocalOffer,
  Label,
  Title,
  Description,
  Height,
  ToggleOn,
  Code,
  Apps,
  DragIndicator,
  History,
  Restore,
  AutoFixHigh,
  Backup,
  CloudDownload,
  CloudUpload,
  TheaterComedy,
  LocationOn,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getTemplatesByCategory,
  getTemplateById,
  applyTemplateVariables,
  PanelTemplate,
} from './PanelTemplates';
import { useToast, ToastProvider } from './ToastStack';
import Editor from '@monaco-editor/react';
// Import from new structure
import { 
  PanelConfig, 
  PublishData, 
  MarketplaceService, 
  FilterType, 
  FilterStatus,
  FormData,
  PanelCategory,
  PanelType,
} from './PanelCreator/types';
import { CREATORHUB_FUNCTIONS, MARKETPLACE_SERVICES } from './PanelCreator/constants';
import { panelCreatorTheme as darkTheme } from './PanelCreator/theme';
import { 
  generatePanelId, 
  generateFunctionContent, 
  generateServiceContent,
  createDefaultFormData,
  createPanelConfigFromForm,
  exportPanel as exportPanelUtil,
  exportAllPanels as exportAllPanelsUtil,
  importPanel as importPanelUtil,
  filterPanels as filterPanelsUtil,
  togglePanelVisibility,
  formatHTML,
} from './PanelCreator/utils/panelHelpers';
import {
  savePanelVersion,
  getPanelVersions,
  deletePanelVersions,
  PanelVersion,
} from './PanelCreator/utils/versionHistory';
import {
  createBackup,
  getBackups,
  restoreBackup,
  deleteBackup,
  IDBBackup,
} from './PanelCreator/utils/indexedDBBackup';
import { usePanelStorage } from './PanelCreator/hooks/usePanelStorage';
import { usePanelValidation } from './PanelCreator/hooks/usePanelValidation';
import { usePanelForm } from './PanelCreator/hooks/usePanelForm';
import { PanelPreview } from './PanelCreator/PanelPreview';
import { getTextFieldStyles, getInputLabelStyles, getSelectMenuProps } from './PanelCreator/styles';
import {
  consumeBufferedPanelVisibilityState,
  installBufferedPanelVisibilityEvents,
  markBufferedPanelReady,
} from '../services/panelOpenBuffer';

if (typeof window !== 'undefined') {
  installBufferedPanelVisibilityEvents('panelCreator', 'open-panel-creator');
}
// Sortable Panel Item Component
interface SortablePanelItemProps {
  panel: PanelConfig;
  isMobile: boolean;
  onEdit: (panel: PanelConfig) => void;
  onToggle: (panel: PanelConfig) => void;
  onExport: (panel: PanelConfig) => void;
  onDelete: (panelId: string) => void;
  onShowHistory?: (panel: PanelConfig) => void;
}

const SortablePanelItem: React.FC<SortablePanelItemProps> = ({
  panel,
  isMobile,
  onEdit,
  onToggle,
  onExport,
  onDelete,
  onShowHistory,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit(panel)}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.05)',
          transform: 'translateX(4px)',
        },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          mr: 1,
          color: 'rgba(255,255,255,0.87)',
          '&:active': {
            cursor: 'grabbing',
          },
          '&:hover': {
            color: 'rgba(255,255,255,0.8)',
          },
        }}
      >
        <DragIndicator />
      </Box>
      <ListItemText
        primary={
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
              fontWeight: 500,
              color: '#fff',
            }}
          >
            {panel.title}
          </Typography>
        }
        secondary={
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              color: 'rgba(255,255,255,0.87)',
              mt: 0.5,
            }}
          >
            {panel.description || panel.name}
          </Typography>
        }
      />
      <ListItemSecondaryAction>
        <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }}>
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(panel);
            }}
            title={panel.enabled ? 'Åpne panel' : 'Panel er deaktivert'}
            sx={{
              minWidth: { xs: 44, sm: 40, md: 36 },
              minHeight: { xs: 44, sm: 40, md: 36 },
              color: panel.enabled ? 'success.main' : 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            {panel.enabled ? <Visibility /> : <VisibilityOff />}
          </IconButton>
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(panel);
            }}
            title="Rediger panel"
            sx={{
              minWidth: { xs: 44, sm: 40, md: 36 },
              minHeight: { xs: 44, sm: 40, md: 36 },
              color: 'primary.main',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(33, 150, 243, 0.1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            <Edit />
          </IconButton>
          {onShowHistory && (
            <IconButton
              size={isMobile ? 'medium' : 'small'}
              onClick={(e) => {
                e.stopPropagation();
                onShowHistory(panel);
              }}
              title="Vis versjonshistorikk"
              sx={{
                minWidth: { xs: 44, sm: 40, md: 36 },
                minHeight: { xs: 44, sm: 40, md: 36 },
                color: 'warning.main',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 152, 0, 0.1)',
                  transform: 'scale(1.1)',
                },
              }}
            >
              <History />
            </IconButton>
          )}
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            onClick={(e) => {
              e.stopPropagation();
              onExport(panel);
            }}
            title="Eksporter panel"
            sx={{
              minWidth: { xs: 44, sm: 40, md: 36 },
              minHeight: { xs: 44, sm: 40, md: 36 },
              color: 'secondary.main',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(88, 166, 255, 0.1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            <Upload />
          </IconButton>
          <IconButton
            size={isMobile ? 'medium' : 'small'}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(panel.id);
            }}
            title="Slett panel"
            color="error"
            sx={{
              minWidth: { xs: 44, sm: 40, md: 36 },
              minHeight: { xs: 44, sm: 40, md: 36 },
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                transform: 'scale(1.1)',
              },
            }}
          >
            <Delete />
          </IconButton>
        </Stack>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

const PanelCreatorContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  // Use style utilities
  const textFieldStyles = getTextFieldStyles(isDesktop, isTablet);
  const inputLabelStyles = getInputLabelStyles(isDesktop, isTablet);
  const selectMenuProps = getSelectMenuProps(isDesktop, isTablet);
  
  // Use custom hooks for state management
  const {
    panels,
    marketplaceServices,
    loading: loadingPanels,
    savePanels,
    installService,
    loadMarketplaceServices: loadServices,
  } = usePanelStorage();

  const [open, setOpen] = useState(false);
  const [showPanelList, setShowPanelList] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishData, setPublishData] = useState<PublishData>({
    version: '1.0.0',
    author: '',
    category: 'service',
    tags: '',
    price: 0,
    makePublic: true,
  });
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryPanel, setVersionHistoryPanel] = useState<PanelConfig | null>(null);
  const [versionHistory, setVersionHistory] = useState<PanelVersion[]>([]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backups, setBackups] = useState<IDBBackup[]>([]);

  // Use form hook
  const {
    formData,
    editingPanel,
    validationErrors,
    resetForm,
    initializeFormForEdit,
    handleTypeChange,
    handleFunctionSelect,
    handleServiceSelect,
    updateFormField,
    setFieldError,
    clearValidationErrors,
    setFormData,
  } = usePanelForm(() => setOpen(false), () => setOpen(false));

  // Use validation hook
  const { validateForm: validateFormHook } = usePanelValidation(formData, panels, editingPanel);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure panels have order values (only on initial load)
  useEffect(() => {
    const initializePanelOrders = async () => {
      if (panels.length > 0) {
        const panelsWithoutOrder = panels.filter(p => p.order === undefined);
        if (panelsWithoutOrder.length > 0) {
          const maxOrder = Math.max(...panels.map(p => p.order ?? -1), -1);
          const updatedPanels = panels.map((p, index) => {
            if (p.order === undefined) {
              return { ...p, order: maxOrder + index + 1 };
            }
            return p;
          });
          await savePanels(updatedPanels);
        }
      }
    };
    initializePanelOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Sort panels by order
  const sortedPanels = [...panels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Handle drag end for panel reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedPanels.findIndex(p => p.id === active.id);
      const newIndex = sortedPanels.findIndex(p => p.id === over.id);
      
      const reorderedPanels = arrayMove(sortedPanels, oldIndex, newIndex);
      
      // Update order values
      const updatedPanels = reorderedPanels.map((panel, index) => ({
        ...panel,
        order: index,
      }));
      
      await savePanels(updatedPanels);
      showSuccess('Panelrekkefølge oppdatert');
    }
  };

  // Listen for open-panel-creator event
  useEffect(() => {
    // Panels and services are loaded by usePanelStorage hook
    // Load marketplace services (could be from API)
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleOpenPanelCreator = () => {
      console.log('Panel Creator: open-panel-creator event received');
      // Show panel list
      setShowPanelList(true);
      // Reset form when opening
      resetForm();
      console.log('Panel Creator: Setting open to true');
      setOpen(true);
      console.log('Panel Creator: open state set');
    };

    const pendingIsOpen = consumeBufferedPanelVisibilityState('panelCreator');
    if (pendingIsOpen) {
      handleOpenPanelCreator();
    }

    markBufferedPanelReady('panelCreator', true);
    window.addEventListener('open-panel-creator', handleOpenPanelCreator);
    return () => {
      markBufferedPanelReady('panelCreator', false);
      window.removeEventListener('open-panel-creator', handleOpenPanelCreator);
    };
  }, []);

  const loadMarketplaceServices = async () => {
    setLoadingServices(true);
    try {
      // In a real implementation, this would fetch from marketplace API
      // For now, we use the default list
      // const services = await marketplaceService.getProducts({ category: 'plugin' });
      // setMarketplaceServices(services);
    } catch (e) {
      console.error('Error loading marketplace services:', e);
    } finally {
      setLoadingServices(false);
    }
  };

  // savePanels, updatePanelsInDOM are now provided by usePanelStorage hook

  // updatePanelsInDOM and setupPanelFunctionality are now provided by usePanelStorage hook

  // generatePanelId is now imported from utils

  const handleCreateNew = () => {
    resetForm(); // Use hook function
    setOpen(true);
  };

  // handleTypeChange is now from usePanelForm hook

  // handleFunctionSelect is now from usePanelForm hook

  // handleTemplateSelect removed - duplicate definition

  // handleServiceSelect and installService are now handled via hooks, but we need to wrap installService
  const handleServiceSelectWithInstall = (serviceId: string) => {
    const service = marketplaceServices.find(s => s.id === serviceId);
    if (service) {
      if (!service.installed) {
        showInfo(`Installerer ${service.name}...`);
        if (installService(serviceId)) {
          showSuccess(`${service.name} er nå installert!`);
        }
        // After installation, update form data
        setTimeout(() => {
          handleServiceSelect(serviceId);
        }, 100);
        return;
      }
      handleServiceSelect(serviceId);
    }
  };

  // generateFunctionContent is now imported from utils - removing local duplicate
  // generateFunctionContent is now imported from utils - removing duplicate local function
  // Removed generateFunctionContentLocal - use generateFunctionContent from utils instead

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const templates = getTemplatesByCategory(formData.type || 'function');
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        content: template.html,
        name: template.name.toLowerCase().replace(/\s+/g, '-'),
        title: template.name,
        description: template.description,
      });
    }
  };

  // generateServiceContent is now imported from utils

  // Removed duplicate generateServiceContent - use imported version from utils

  const handleEdit = (panel: PanelConfig) => {
    initializeFormForEdit(panel); // Use hook function
    // Check if content matches a template
    const templates = getTemplatesByCategory(panel.type || 'function');
    const matchedTemplate = templates.find(t => {
      // Simple check: if content contains template-specific classes
      return panel.content.includes(t.html.split('class="')[1]?.split('"')[0] || '');
    });
    if (matchedTemplate) {
      setSelectedTemplate(matchedTemplate.id);
    } else {
      setSelectedTemplate('');
    }
    setOpen(true);
  };

  const handleDelete = async (panelId: string) => {
    const panelToDelete = panels.find(p => p.id === panelId);
    if (!panelToDelete) return;
    
    // Delete version history for this panel
    deletePanelVersions(panelId);
    
    // Use a more user-friendly confirmation approach
    // For now, we'll show a warning and proceed, but in a real app you might want a confirmation dialog
    const newPanels = panels.filter(p => p.id !== panelId);
    await savePanels(newPanels);
    
    // Remove from DOM
    const panelElement = document.getElementById(panelId);
    if (panelElement) {
      panelElement.remove();
    }
    
    showSuccess(`Panel "${panelToDelete.title}" er slettet`);
  };

  const handleShowVersionHistory = (panel: PanelConfig) => {
    setVersionHistoryPanel(panel);
    const versions = getPanelVersions(panel.id);
    setVersionHistory(versions);
    setShowVersionHistory(true);
  };

  const handleRestoreVersion = async (version: PanelVersion) => {
    if (!versionHistoryPanel) return;
    
    const restoredPanel = version.data;
    const newPanels = panels.map(p => 
      p.id === versionHistoryPanel.id 
        ? { ...restoredPanel, order: p.order } 
        : p
    );
    
    // Save as new version
    savePanelVersion(versionHistoryPanel, `Gjenopprettet fra versjon ${version.version}`);
    
    await savePanels(newPanels);
    setShowVersionHistory(false);
    showSuccess(`Panel gjenopprettet til versjon ${version.version}`);
  };

  // Validation is now handled by usePanelValidation hook
  const validateForm = () => {
    const result = validateFormHook();
    if (!result.isValid) {
      // Update validation errors in form hook if needed
      Object.keys(result.errors).forEach(key => {
        setFieldError(key, result.errors[key]);
      });
    }
    return result.isValid;
  };

  // Export panel function - using utility
  const exportPanel = (panel: PanelConfig) => {
    try {
      exportPanelUtil(panel);
      showSuccess(`Panel "${panel.title}" eksportert`);
    } catch (error) {
      showError('Kunne ikke eksportere panel');
      console.error('Export error:', error);
    }
  };

  // Export all panels - using utility
  const exportAllPanels = () => {
    try {
      exportAllPanelsUtil(panels);
      showSuccess(`${panels.length} paneler eksportert`);
    } catch (error) {
      showError('Kunne ikke eksportere paneler');
      console.error('Export error:', error);
    }
  };

  // Import panel function - using utility
  const handleImportPanel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importPanelUtil(file);
      
      // Check if panel already exists
      const existingPanel = panels.find(p => p.id === imported.id);
      if (existingPanel) {
        showWarning(`Panel med ID "${imported.id}" eksisterer allerede. Vil du erstatte det?`);
        // For now, just add with new ID
        const newId = `${imported.id}_imported_${Date.now()}`;
        imported.id = newId;
        imported.name = `${imported.name}_imported`;
      }

      // Add to panels
      const newPanels = [...panels, imported];
      savePanels(newPanels);
      showSuccess(`Panel "${imported.title}" importert`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Kunne ikke importere panel. Sjekk at filen er gyldig JSON.');
      console.error('Import error:', error);
    }
    // Reset input
    event.target.value = '';
  };

  // Filter panels using utility function (use sorted panels)
  const filteredPanels = filterPanelsUtil(sortedPanels, searchQuery, filterType, filterStatus, filterPosition, filterCategory !== 'all' ? filterCategory : undefined, undefined);

  const handleSave = async () => {
    // Validate form
    if (!validateForm()) {
      showError('Vennligst fiks valideringsfeilene før du lagrer');
      return;
    }

    const newPanel = createPanelConfigFromForm(formData as ReturnType<typeof createDefaultFormData>, editingPanel);

    let newPanels: PanelConfig[];
    if (editingPanel) {
      // Save version before updating
      savePanelVersion(editingPanel, 'Oppdatering via Panel Creator');
      // Update existing panel, preserve order
      newPanels = panels.map(p => p.id === editingPanel.id ? { ...newPanel, order: p.order } : p);
    } else {
      // Add new panel with order at the end
      const maxOrder = sortedPanels.length > 0 
        ? Math.max(...sortedPanels.map(p => p.order ?? 0), -1)
        : -1;
      newPanels = [...sortedPanels, { ...newPanel, order: maxOrder + 1 }];
      // Save initial version
      savePanelVersion({ ...newPanel, order: maxOrder + 1 }, 'Opprettet via Panel Creator');
    }

    await savePanels(newPanels);
    setOpen(false);
    resetForm();
    showSuccess(editingPanel ? 'Panel oppdatert!' : 'Panel opprettet!');
  };

  const handlePublishToMarketplace = () => {
    if (!publishData.author) {
      showError('Forfatter er påkrevd for å publisere til Marketplace');
      return;
    }

    // Update formData with publish data
    const updatedFormData = {
      ...formData,
      version: publishData.version,
      author: publishData.author,
      category: publishData.category,
      tags: publishData.tags.split(',').map(t => t.trim()).filter(t => t),
      publishedToMarketplace: true,
      marketplaceId: formData.marketplaceId || `marketplace_${Date.now()}`,
    };

    setFormData(updatedFormData);
    setShowPublishDialog(false);

    // In a real implementation, this would call a marketplace API
    // For now, we just update the local state
    showSuccess(`Panel "${formData.title}" er nå publisert til Marketplace!`);
  };

  const handleTogglePanel = (panel: PanelConfig) => {
    const wasOpen = togglePanelVisibility(panel);
    if (wasOpen) {
      showInfo(`Panel "${panel.title}" er åpnet`);
    } else {
      showInfo(`Panel "${panel.title}" er lukket`);
    }
  };

  return (
    <Box
      data-testid="panel-creator-shell"
      data-dialog-open={open ? 'true' : 'false'}
      data-panel-list-open={showPanelList ? 'true' : 'false'}
      sx={{ display: 'contents' }}
    >
      {/* Floating Action Button to open Panel Creator */}
      {!showPanelList && (
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setShowPanelList(true);
            handleCreateNew();
          }}
          sx={{
            position: 'fixed',
            bottom: { xs: 20, sm: 24, md: 28 },
            right: { xs: 20, sm: 24, md: 28 },
            zIndex: 9999,
            bgcolor: '#00d4ff',
            color: '#000',
            fontWeight: 600,
            fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
            minHeight: { xs: 48, sm: 52, md: 56 },
            px: { xs: 2, sm: 2.5, md: 3 },
            boxShadow: '0 4px 12px rgba(0,212,255,0.4)',
            borderRadius: { xs: 2, sm: 2.5, md: 3 },
            textTransform: 'none',
            '&:hover': {
              bgcolor: '#00b8e6',
              boxShadow: '0 6px 16px rgba(0,212,255,0.5)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isMobile ? 'Panel' : '++ Add New Panel'}
        </Button>
      )}

      {/* Panel List - Responsive */}
      {showPanelList && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 100, md: 140 },
            right: { xs: 16, sm: 20, md: 20 },
            left: { xs: 16, sm: 'auto', md: 'auto' },
            width: { xs: 'calc(100vw - 32px)', sm: 400, md: 450, lg: 500 },
            maxWidth: { xs: '100%', sm: '90vw', md: 500 },
            maxHeight: { xs: '70vh', sm: '65vh', md: '60vh' },
            overflow: 'auto',
            zIndex: 10000,
            p: { xs: 1.5, sm: 2, md: 2.5 },
            bgcolor: '#1c2128',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05)',
            borderRadius: { xs: 2, sm: 2, md: 3 },
            backdropFilter: 'blur(10px)',
            // Touch-friendly scrolling for iPad
            WebkitOverflowScrolling: 'touch',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography 
              variant="h6" 
              sx={{
                fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem', lg: '1.75rem' },
                fontWeight: { xs: 500, sm: 600, md: 600 },
                lineHeight: { xs: 1.4, sm: 1.5, md: 1.6 },
                color: '#fff',
              }}
            >
              Mine Paneler ({filteredPanels.length}/{panels.length})
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                onClick={handleCreateNew}
                title="Opprett nytt panel"
                sx={{
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(0,212,255,0.1)' },
                }}
              >
                <Add />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setShowPanelList(false)}
                title="Lukk panel-liste"
                sx={{
                  color: 'rgba(255,255,255,0.87)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <Close />
              </IconButton>
              <IconButton
                size="small"
                onClick={async () => {
                  try {
                    const versionCount = panels.reduce((sum, p) => sum + getPanelVersions(p.id).length, 0);
                    await createBackup(panels, versionCount, `Manuell backup - ${new Date().toLocaleString('nb-NO')}`);
                    showSuccess('Backup opprettet!');
                    // Refresh backups list if dialog is open
                    if (showBackupDialog) {
                      const updatedBackups = await getBackups();
                      setBackups(updatedBackups);
                    }
                  } catch (error) {
                    showError('Kunne ikke opprette backup');
                    console.error('Backup error:', error);
                  }
                }}
                title="Opprett backup"
                sx={{
                  color: 'success.main',
                  '&:hover': { bgcolor: 'rgba(76,175,80,0.1)' },
                }}
              >
                <Backup />
              </IconButton>
              <IconButton
                size="small"
                onClick={async () => {
                  try {
                    const backupList = await getBackups();
                    setBackups(backupList);
                    setShowBackupDialog(true);
                  } catch (error) {
                    showError('Kunne ikke laste backups');
                    console.error('Load backups error:', error);
                  }
                }}
                title="Vis backups"
                sx={{
                  color: 'info.main',
                  '&:hover': { bgcolor: 'rgba(33,150,243,0.1)' },
                }}
              >
                <CloudDownload />
              </IconButton>
              <IconButton
                size="small"
                onClick={exportAllPanels}
                title="Eksporter alle paneler"
                sx={{
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(0,212,255,0.1)' },
                }}
              >
                <Upload />
              </IconButton>
              <input
                accept=".json"
                style={{ display: 'none' }}
                id="import-panel-input"
                type="file"
                onChange={handleImportPanel}
              />
              <label htmlFor="import-panel-input">
                <IconButton
                  component="span"
                  size="small"
                  title="Importer panel"
                  sx={{
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(0,212,255,0.1)' },
                  }}
                >
                  <Upload sx={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              </label>
            </Stack>
          </Box>

          {/* Search and Filter */}
          {panels.length > 0 && (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Søk paneler..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <Apps sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.03)',
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                  },
                }}
              />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="Type"
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                />
                <Chip
                  label={filterType === 'all' ? 'Alle' : filterType === 'function' ? 'Funksjon' : 'Tjeneste'}
                  size="small"
                  onClick={() => setFilterType(filterType === 'all' ? 'function' : filterType === 'function' ? 'service' : 'all')}
                  color={filterType !== 'all' ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label={filterStatus === 'all' ? 'Alle' : filterStatus === 'enabled' ? 'Aktive' : 'Deaktiverte'}
                  size="small"
                  onClick={() => setFilterStatus(filterStatus === 'all' ? 'enabled' : filterStatus === 'enabled' ? 'disabled' : 'all')}
                  color={filterStatus !== 'all' ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label={filterPosition === 'all' ? 'Alle posisjoner' : filterPosition}
                  size="small"
                  onClick={() => {
                    const positions = ['all', 'bottom', 'left', 'right', 'top'];
                    const currentIndex = positions.indexOf(filterPosition);
                    setFilterPosition(positions[(currentIndex + 1) % positions.length]);
                  }}
                  color={filterPosition !== 'all' ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label={filterCategory === 'all' ? 'Alle kategorier' : filterCategory === 'production' ? 'Produksjon' : filterCategory === 'planning' ? 'Planlegging' : filterCategory === 'tools' ? 'Verktøy' : filterCategory === 'communication' ? 'Kommunikasjon' : filterCategory === 'analytics' ? 'Analytikk' : filterCategory === 'custom' ? 'Tilpasset' : 'Annet'}
                  size="small"
                  onClick={() => {
                    const categories: (string | PanelCategory)[] = ['all', 'production', 'planning', 'tools', 'communication', 'analytics', 'custom', 'other'];
                    const currentIndex = categories.indexOf(filterCategory);
                    setFilterCategory(categories[(currentIndex + 1) % categories.length] as string);
                  }}
                  color={filterCategory !== 'all' ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer' }}
                />
              </Stack>
            </Stack>
          )}
          
          {panels.length === 0 ? (
            <Typography color="text.secondary">
              Ingen paneler ennå. Klikk "++ Add New Panel" for å lage et.
            </Typography>
          ) : filteredPanels.length === 0 ? (
            <Typography color="text.secondary">
              Ingen paneler matcher søkekriteriene.
            </Typography>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredPanels.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <List>
                  {filteredPanels.map((panel) => (
                    <React.Fragment key={panel.id}>
                      <SortablePanelItem
                        panel={panel}
                        isMobile={isMobile}
                        onEdit={handleEdit}
                        onToggle={handleTogglePanel}
                        onExport={exportPanel}
                        onDelete={handleDelete}
                        onShowHistory={handleShowVersionHistory}
                      />
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </SortableContext>
            </DndContext>
          )}
        </Paper>
      )}

      {/* Create/Edit Dialog - Responsive */}
      <Dialog
        open={open}
        onClose={() => {
          console.log('Panel Creator Dialog: onClose called');
          setOpen(false);
        }}
        fullScreen={isMobile}
        maxWidth={isDesktop ? 'lg' : isTablet ? 'md' : 'sm'}
        fullWidth
        container={() => document.body}
        PaperProps={{
          'data-testid': 'panel-creator-dialog',
          sx: {
            bgcolor: '#1c2128',
            backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
            borderRadius: { xs: 0, sm: 2, md: 3 },
            border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.1)' },
            maxHeight: { 
              xs: '100vh', 
              sm: isLandscape ? '90vh' : '85vh',
              md: '80vh',
              lg: '75vh'
            },
            m: { xs: 0, sm: 2, md: 3, lg: 4 },
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
            '@media (min-width: 1024px) and (max-width: 1366px) and (orientation: landscape)': {
              maxWidth: '90vw',
              maxHeight: '85vh',
              m: 2,
            },
            '@media (min-width: 1400px)': {
              maxWidth: '1200px',
            },
          }
        }}
        sx={{
          zIndex: 100000,
          '& .MuiDialog-container': {
            zIndex: 100000,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          '& .MuiDialog-paper': {
            position: 'relative',
            zIndex: 100001,
            margin: 'auto',
          },
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            willChange: 'opacity',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.875rem', lg: '2rem' },
            fontWeight: { xs: 500, sm: 600, md: 600 },
            p: { xs: 2, sm: 2.5, md: 3 },
            pb: { xs: 1.5, sm: 2 },
            lineHeight: { xs: 1.4, sm: 1.5, md: 1.6 },
            color: '#fff',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(0,212,255,0.1) 100%)',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            },
          }}
        >
          {editingPanel ? 'Rediger Panel' : 'Nytt Panel'}
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ 
              position: 'absolute', 
              right: { xs: 8, sm: 12, md: 16 }, 
              top: { xs: 8, sm: 12, md: 16 },
              minWidth: { xs: 40, sm: 44, md: 48 },
              minHeight: { xs: 40, sm: 44, md: 48 },
              color: 'rgba(255,255,255,0.87)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                transform: 'rotate(90deg) scale(1.1)',
              },
              '&:focus-visible': {
                outline: '3px solid rgba(0,212,255,0.5)',
                outlineOffset: '2px',
              },
            }}
            aria-label="Lukk"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            bgcolor: 'transparent',
            pointerEvents: 'auto',
            overflow: 'visible',
            // Touch-friendly scrolling
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              width: { xs: 8, sm: 10, md: 12 },
            },
            '&::-webkit-scrollbar-track': {
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 6,
            },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 6,
              bgcolor: 'rgba(255,255,255,0.2)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.6)',
              },
            },
          }}
        >
          <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mt: { xs: 0.5, sm: 1 } }}>
            {/* Panel Type Selection */}
            <FormControl fullWidth sx={{ overflow: 'visible', pointerEvents: 'auto' }}>
              <InputLabel sx={{ ...inputLabelStyles, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Category sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                Panel Type
              </InputLabel>
              <Select
                value={formData.type || 'function'}
                onChange={(e) => handleTypeChange(e.target.value as PanelType)}
                label="Panel Type"
                variant="outlined"
                MenuProps={selectMenuProps}
                sx={{
                  fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                  pointerEvents: 'auto',
                  '& .MuiSelect-select': {
                    py: isDesktop ? 2 : isTablet ? 1.5 : 1.25,
                    lineHeight: isDesktop ? 1.6 : 1.5,
                    pointerEvents: 'auto',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00d4ff',
                    borderWidth: '2px',
                  },
                }}
              >
                <MenuItem value="function">CreatorHub Virtual Studio Funksjon</MenuItem>
                <MenuItem value="service">Tjeneste</MenuItem>
              </Select>
            </FormControl>

            {/* Function Selection */}
            {formData.type === 'function' && (
              <FormControl fullWidth sx={{ overflow: 'visible', pointerEvents: 'auto' }}>
                <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Functions sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                  Velg Funksjon
                </InputLabel>
                <Select
                  value={formData.functionId || ''}
                  onChange={(e) => handleFunctionSelect(e.target.value)}
                  label="Velg Funksjon"
                  variant="outlined"
                  MenuProps={selectMenuProps}
                  sx={{
                    fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                    pointerEvents: 'auto',
                    '& .MuiSelect-select': {
                      py: isDesktop ? 2 : isTablet ? 1.5 : 1.25,
                      lineHeight: isDesktop ? 1.6 : 1.5,
                      pointerEvents: 'auto',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00d4ff',
                      borderWidth: '2px',
                    },
                  }}
                >
                  {CREATORHUB_FUNCTIONS.map(func => {
                    const IconComponent = func.icon;
                    return (
                      <MenuItem key={func.id} value={func.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <IconComponent sx={{ fontSize: { xs: 20, sm: 22, md: 24 }, color: 'primary.main', flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{func.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {func.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}

            {/* Service Creation */}
            {formData.type === 'service' && (
              <Box>
                <Box sx={{ p: 2, bgcolor: 'info.dark', borderRadius: 1, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RocketLaunch sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                    Opprett ny tjeneste for Marketplace
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dette panelet vil bli en tjeneste som kan publiseres til Marketplace for andre brukere å installere.
                    Fyll ut informasjonen nedenfor og publiser tjenesten når den er klar.
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  label="Versjon"
                  value={formData.version || '1.0.0'}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                  helperText="Semantisk versjonering (f.eks. 1.0.0)"
                  InputProps={{
                    startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <Tag sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2, ...textFieldStyles }}
                />

                <TextField
                  fullWidth
                  label="Forfatter"
                  value={formData.author || ''}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Ditt navn eller organisasjon"
                  helperText="Navnet som vises i Marketplace"
                  InputProps={{
                    startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <PersonOutline sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2, ...textFieldStyles }}
                />

                <FormControl fullWidth sx={{ mb: 2, overflow: 'visible', pointerEvents: 'auto' }}>
                  <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Folder sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                    Kategori
                  </InputLabel>
                  <Select
                    value={formData.category || 'service'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'plugin' | 'service' | 'integration' })}
                    label="Kategori"
                    variant="outlined"
                    MenuProps={selectMenuProps}
                    sx={{
                      fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                      pointerEvents: 'auto',
                      '& .MuiSelect-select': {
                        py: isDesktop ? 2 : isTablet ? 1.5 : 1.25,
                        lineHeight: isDesktop ? 1.6 : 1.5,
                        pointerEvents: 'auto',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#00d4ff',
                        borderWidth: '2px',
                      },
                    }}
                  >
                    <MenuItem value="service">Tjeneste</MenuItem>
                    <MenuItem value="plugin">Plugin</MenuItem>
                    <MenuItem value="integration">Integrasjon</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Tags (kommaseparert)"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setFormData({ ...formData, tags });
                  }}
                  placeholder="f.eks. casting, planning, tools"
                  helperText="Tags som hjelper brukere finne tjenesten"
                  InputProps={{
                    startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <LocalOffer sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2, ...textFieldStyles }}
                />

                {formData.publishedToMarketplace && (
                  <Box sx={{ p: 2, bgcolor: 'success.dark', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'success.main' }} />
                      Publisert til Marketplace
                      {formData.marketplaceId && (
                        <Chip label={`ID: ${formData.marketplaceId}`} size="small" />
                      )}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  color={formData.publishedToMarketplace ? 'secondary' : 'primary'}
                  onClick={() => {
                    if (formData.publishedToMarketplace) {
                      setPublishData({
                        version: formData.version || '1.0.0',
                        author: formData.author || '',
                        category: formData.category || 'service',
                        tags: formData.tags?.join(', ') || '',
                        price: 0,
                        makePublic: true,
                      });
                      setShowPublishDialog(true);
                    } else {
                      // First time publishing
                      if (!formData.author) {
                        showWarning('Vennligst fyll ut forfatter før du publiserer.');
                        return;
                      }
                      setPublishData({
                        version: formData.version || '1.0.0',
                        author: formData.author || '',
                        category: formData.category || 'service',
                        tags: formData.tags?.join(', ') || '',
                        price: 0,
                        makePublic: true,
                      });
                      setShowPublishDialog(true);
                    }
                  }}
                  sx={{ mb: 2 }}
                >
                  {formData.publishedToMarketplace ? (
                    <>
                      <Refresh sx={{ mr: 1 }} />
                      Oppdater i Marketplace
                    </>
                  ) : (
                    <>
                      <Publish sx={{ mr: 1 }} />
                      Publiser til Marketplace
                    </>
                  )}
                </Button>
              </Box>
            )}

            <Divider />

            <TextField
              fullWidth
              label="Navn (intern)"
              value={formData.name || ''}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (validationErrors.name) {
                  setFieldError('name', '');
                }
              }}
              placeholder="f.eks. My Custom Panel"
              helperText={validationErrors.name || "Brukes internt for identifikasjon"}
              error={!!validationErrors.name}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <Code sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={textFieldStyles}
            />

            <TextField
              fullWidth
              label="Tittel"
              value={formData.title || ''}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (validationErrors.title) {
                  setFieldError('title', '');
                }
              }}
              placeholder="f.eks. Min Tilpassede Panel"
              helperText={validationErrors.title || "Vises i panel-header"}
              error={!!validationErrors.title}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <Title sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={textFieldStyles}
            />

            <TextField
              fullWidth
              label="Beskrivelse"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Kort beskrivelse av panelet"
              multiline
              rows={isMobile ? 2 : isTablet ? 3 : 4}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <Description sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={textFieldStyles}
            />

            {/* Category and Tags - Available for all panel types */}
            <FormControl fullWidth sx={{ overflow: 'visible', pointerEvents: 'auto' }}>
              <InputLabel sx={{ ...inputLabelStyles, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Folder sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                Kategori
              </InputLabel>
              <Select
                value={formData.category || 'custom'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as PanelCategory })}
                label="Kategori"
                variant="outlined"
                MenuProps={selectMenuProps}
                sx={{
                  fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                  pointerEvents: 'auto',
                  '& .MuiSelect-select': {
                    py: isDesktop ? 2 : isTablet ? 1.5 : 1.25,
                    lineHeight: isDesktop ? 1.6 : 1.5,
                    pointerEvents: 'auto',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00d4ff',
                    borderWidth: '2px',
                  },
                }}
              >
                <MenuItem value="production">Produksjon</MenuItem>
                <MenuItem value="planning">Planlegging</MenuItem>
                <MenuItem value="tools">Verktøy</MenuItem>
                <MenuItem value="communication">Kommunikasjon</MenuItem>
                <MenuItem value="analytics">Analytikk</MenuItem>
                <MenuItem value="custom">Tilpasset</MenuItem>
                <MenuItem value="other">Annet</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Tags (kommaseparert)"
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                setFormData({ ...formData, tags });
              }}
              placeholder="f.eks. casting, planning, tools"
              helperText="Tags som hjelper deg organisere og finne paneler"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <LocalOffer sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={textFieldStyles}
            />

            <FormControl fullWidth sx={{ overflow: 'visible', pointerEvents: 'auto' }}>
              <InputLabel sx={{ ...inputLabelStyles, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                Posisjon
              </InputLabel>
              <Select
                value={formData.position || 'bottom'}
                onChange={(e) => setFormData({ ...formData, position: e.target.value as 'bottom' | 'left' | 'right' | 'top' })}
                label="Posisjon"
                variant="outlined"
                MenuProps={selectMenuProps}
                sx={{
                  fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  borderRadius: 1,
                  pointerEvents: 'auto',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00d4ff',
                    borderWidth: '2px',
                  },
                  '& .MuiSelect-select': {
                    py: isDesktop ? 2 : isTablet ? 1.5 : 1.25,
                    lineHeight: isDesktop ? 1.6 : 1.5,
                    pointerEvents: 'auto',
                  },
                }}
              >
                <MenuItem value="bottom">Bunn</MenuItem>
                <MenuItem value="left">Venstre</MenuItem>
                <MenuItem value="right">Høyre</MenuItem>
                <MenuItem value="top">Topp</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Standard Høyde (px)"
              value={formData.defaultHeight || 400}
              onChange={(e) => setFormData({ ...formData, defaultHeight: parseInt(e.target.value) || 400 })}
              helperText="Standard høyde når panelet åpnes"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                    <Height sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={textFieldStyles}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled ?? true}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#00d4ff',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#00d4ff',
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToggleOn sx={{ fontSize: { xs: 18, sm: 20, md: 22 }, color: 'text.secondary' }} />
                  <Typography sx={{ 
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                    color: '#fff',
                  }}>
                    Aktiver panel
                  </Typography>
                </Box>
              }
              sx={{
                borderRadius: 1,
                p: 1.5,
                bgcolor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            />

            {/* Template Selector */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Palette />}
                onClick={() => setShowTemplateSelector(true)}
                fullWidth
                sx={{ mb: 2 }}
              >
                Velg Template
              </Button>
              
              {selectedTemplate && (
                <Chip
                  label={`Template: ${getTemplateById(selectedTemplate, formData.type || 'function')?.name || selectedTemplate}`}
                  onDelete={() => {
                    setSelectedTemplate('');
                    setFormData({ ...formData, content: '' });
                  }}
                  color="primary"
                  sx={{ mb: 2 }}
                />
              )}
            </Box>

            <Accordion
              sx={{
                bgcolor: 'rgba(255,255,255,0.02)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)',
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMore sx={{ color: 'rgba(255,255,255,0.87)' }} />}
                sx={{
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                  '&.Mui-expanded': {
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                  },
                }}
              >
                <Typography sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                  fontWeight: 500,
                  color: '#fff',
                }}>
                  Innhold (HTML)
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 2 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      HTML-kode for panel-innholdet. Du kan bruke CSS-klasser fra styles.css eller velge en template.
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AutoFixHigh />}
                      onClick={() => {
                        if (formData.content) {
                          const formatted = formatHTML(formData.content);
                          setFormData({ ...formData, content: formatted });
                          showInfo('HTML formatert');
                        }
                      }}
                      disabled={!formData.content}
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        minHeight: { xs: 32, sm: 36 },
                        px: { xs: 1, sm: 1.5 },
                      }}
                    >
                      Formater
                    </Button>
                  </Box>
                  {validationErrors.content && (
                    <Typography variant="caption" color="error" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {validationErrors.content}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      border: validationErrors.content 
                        ? '1px solid #d32f2f' 
                        : '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: validationErrors.content ? '#d32f2f' : 'rgba(255,255,255,0.3)',
                      },
                      '&:focus-within': {
                        borderColor: validationErrors.content ? '#d32f2f' : '#00d4ff',
                        borderWidth: '2px',
                      },
                    }}
                  >
                    <Editor
                      height={isMobile ? '300px' : isTablet ? '400px' : '450px'}
                      defaultLanguage="html"
                      value={formData.content || ''}
                      onChange={(value) => {
                        setFormData({ ...formData, content: value || '' });
                        if (validationErrors.content) {
                          setFieldError('content', '');
                        }
                      }}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: isMobile ? 12 : isTablet ? 13 : 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        automaticLayout: true,
                        tabSize: 2,
                        insertSpaces: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        suggest: {
                          showKeywords: true,
                          showSnippets: true,
                        },
                        quickSuggestions: {
                          other: true,
                          comments: false,
                          strings: true,
                        },
                        acceptSuggestionOnEnter: 'on',
                        tabCompletion: 'on',
                      }}
                      loading={
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: isMobile ? '300px' : isTablet ? '400px' : '450px',
                            bgcolor: 'rgba(0,0,0,0.3)',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Laster editor...
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Preview Accordion */}
            <Accordion
              sx={{
                bgcolor: 'rgba(255,255,255,0.02)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)',
                '&:before': {
                  display: 'none',
                },
                '&.Mui-expanded': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMore sx={{ color: 'rgba(255,255,255,0.87)' }} />}
                sx={{
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                  '&.Mui-expanded': {
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                  },
                }}
              >
                <Typography sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                  fontWeight: 500,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}>
                  <Visibility sx={{ fontSize: { xs: 18, sm: 20, md: 22 } }} />
                  Forhåndsvisning
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 2 }}>
                <Box
                  sx={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'transparent',
                    minHeight: 300,
                    maxHeight: 500,
                    position: 'relative',
                    // Simulate panel background
                    background: 'linear-gradient(180deg, #1e1e24 0%, #1a1a1f 100%)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '48px',
                      background: 'linear-gradient(180deg, rgba(30,30,36,0.8) 0%, rgba(26,26,31,0.6) 100%)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      zIndex: 1,
                    },
                  }}
                >
                  {/* Simulated panel header */}
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 2,
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      bgcolor: 'rgba(30,30,36,0.5)',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                        fontWeight: 600,
                        color: '#fff',
                      }}
                    >
                      {formData.title || 'Panel Forhåndsvisning'}
                    </Typography>
                  </Box>
                  
                  {/* Preview content area */}
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      minHeight: 250,
                      maxHeight: 450,
                      overflow: 'auto',
                      p: 2.5,
                      // Apply custom-panel-content styles
                      '& .custom-panel-content': {
                        flex: 1,
                        overflowY: 'auto',
                        padding: 0,
                        color: 'rgba(255, 255, 255, 0.9)',
                        '& h1, & h2, & h3': {
                          color: '#fff',
                          marginTop: '24px',
                          marginBottom: '16px',
                          fontWeight: 600,
                        },
                        '& h1': {
                          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                        },
                        '& h2': {
                          fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                        },
                        '& h3': {
                          fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                        },
                        '& p': {
                          marginBottom: '12px',
                          lineHeight: 1.6,
                          fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                        },
                        '& ul, & ol': {
                          marginLeft: '24px',
                          marginBottom: '16px',
                        },
                        '& li': {
                          marginBottom: '8px',
                          lineHeight: 1.6,
                        },
                        '& code': {
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: "'Courier New', monospace",
                          fontSize: '0.9em',
                        },
                        '& pre': {
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '16px',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          marginBottom: '16px',
                        },
                        '& pre code': {
                          background: 'none',
                          padding: 0,
                        },
                        '& button': {
                          background: '#00d4ff',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          '&:hover': {
                            background: '#00b8e6',
                          },
                        },
                        '& input, & textarea': {
                          background: 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          width: '100%',
                          '&:focus': {
                            outline: '2px solid #00d4ff',
                            outlineOffset: '2px',
                          },
                        },
                      },
                    }}
                  >
                    {formData.content ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: formData.content }}
                        style={{
                          pointerEvents: 'none',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 200,
                          color: 'rgba(255,255,255,0.87)',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                          Ingen innhold å forhåndsvise. Legg til HTML-innhold for å se forhåndsvisning.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Dette er en forhåndsvisning av hvordan panelet vil se ut. Interaktive elementer er deaktivert.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Box sx={{ 
              p: 2.5, 
              bgcolor: 'rgba(139,92,246,0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(139,92,246,0.2)',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(0,212,255,0.1) 100%)',
            }}>
              <Typography variant="caption" sx={{ 
                color: 'rgba(255,255,255,0.8)',
                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                lineHeight: 1.6,
                '& strong': {
                  color: '#8b5cf6',
                  fontWeight: 600,
                },
              }}>
                <strong>Tips:</strong> Du kan bruke HTML og CSS for å tilpasse panelet. 
                Se styles.css for tilgjengelige CSS-klasser.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            pt: { xs: 1.5, sm: 2 },
            gap: { xs: 1, sm: 1.5 },
            borderTop: '1px solid rgba(255,255,255,0.1)',
            bgcolor: 'rgba(0,0,0,0.2)',
          }}
        >
          <Button 
            onClick={() => setOpen(false)}
            variant="outlined"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem' },
              fontWeight: { xs: 400, sm: 500, md: 500 },
              minHeight: { xs: 44, sm: 48, md: 52, lg: 56 },
              px: { xs: 2, sm: 2.5, md: 3, lg: 3.5 },
              lineHeight: { xs: 1.4, sm: 1.5, md: 1.6 },
              borderColor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.4)',
                bgcolor: 'rgba(255,255,255,0.05)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Avbryt
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!formData.name || !formData.title}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem' },
              fontWeight: { xs: 500, sm: 600, md: 600 },
              minHeight: { xs: 44, sm: 48, md: 52, lg: 56 },
              px: { xs: 2, sm: 2.5, md: 3, lg: 3.5 },
              lineHeight: { xs: 1.4, sm: 1.5, md: 1.6 },
              bgcolor: '#00d4ff',
              color: '#000',
              boxShadow: '0 4px 12px rgba(0,212,255,0.3)',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: '#00b8e6',
                boxShadow: '0 6px 16px rgba(0,212,255,0.4)',
                transform: 'translateY(-2px)',
              },
              '&:disabled': {
                bgcolor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
              },
            }}
          >
            {editingPanel ? 'Oppdater' : 'Opprett'} Panel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Selector Dialog - Responsive */}
      <Dialog
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        fullScreen={isMobile}
        maxWidth={isDesktop ? 'lg' : isTablet ? 'md' : 'sm'}
        fullWidth
        container={() => document.body}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
            borderRadius: { xs: 0, sm: 2, md: 3 },
            border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.1)' },
            maxHeight: { 
              xs: '100vh', 
              sm: isLandscape ? '90vh' : '85vh',
              md: '80vh',
            },
            m: { xs: 0, sm: 2, md: 3 },
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            zIndex: 100001,
            position: 'relative',
          }
        }}
        sx={{
          zIndex: 100000,
          '& .MuiDialog-container': {
            zIndex: 100000,
          },
          '& .MuiDialog-paper': {
            zIndex: 100001,
          },
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle>
          Velg Template
          <IconButton
            onClick={() => setShowTemplateSelector(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Velg en forhåndsdefinert template for å raskt opprette panelet ditt.
          </Typography>
          
          <Grid container spacing={2}>
            {getTemplatesByCategory(formData.type || 'function').map((template) => (
              <Grid xs={12} sm={6} key={template.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: selectedTemplate === template.id ? '2px solid #00d4ff' : '1px solid rgba(255,255,255,0.1)',
                    '&:hover': {
                      borderColor: '#00d4ff',
                      bgcolor: 'rgba(0,212,255,0.05)',
                    },
                  }}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {template.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  {template.thumbnail && (
                    <Box
                      component="img"
                      src={template.thumbnail}
                      alt={template.name}
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        mb: 1,
                      }}
                    />
                  )}
                  <Chip
                    label={template.category === 'function' ? 'Funksjon' : 'Tjeneste'}
                    size="small"
                    color={template.category === 'function' ? 'primary' : 'secondary'}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateSelector(false)}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedTemplate) {
                handleTemplateSelect(selectedTemplate);
                setShowTemplateSelector(false);
              }
            }}
            disabled={!selectedTemplate}
          >
            Bruk Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Publish to Marketplace Dialog - Responsive */}
      <Dialog
        open={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        fullScreen={isMobile}
        maxWidth={isDesktop ? 'md' : 'sm'}
        fullWidth
        container={() => document.body}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
            borderRadius: { xs: 0, sm: 2, md: 3 },
            border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.1)' },
            maxHeight: { 
              xs: '100vh', 
              sm: isLandscape ? '90vh' : '85vh',
              md: '80vh',
            },
            m: { xs: 0, sm: 2, md: 3 },
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            zIndex: 100001,
            position: 'relative',
          }
        }}
        sx={{
          zIndex: 100000,
          '& .MuiDialog-container': {
            zIndex: 100000,
          },
          '& .MuiDialog-paper': {
            zIndex: 100001,
          },
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle>
          Publiser tjeneste til Marketplace
          <IconButton
            onClick={() => setShowPublishDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Publiser tjenesten din til Marketplace slik at andre brukere kan installere og bruke den.
            </Typography>

            <TextField
              fullWidth
              label="Tjeneste Navn"
              value={formData.title || ''}
              disabled
              helperText="Dette er tittelen på tjenesten"
            />

            <TextField
              fullWidth
              label="Beskrivelse"
              value={formData.description || ''}
              disabled
              helperText="Beskrivelsen av tjenesten"
            />

            <TextField
              fullWidth
              label="Versjon"
              value={publishData.version || '1.0.0'}
              onChange={(e) => setPublishData({ ...publishData, version: e.target.value })}
              helperText="Semantisk versjonering"
            />

            <TextField
              fullWidth
              label="Forfatter"
              value={publishData.author || ''}
              onChange={(e) => setPublishData({ ...publishData, author: e.target.value })}
              required
            />

            <FormControl fullWidth sx={{ overflow: 'visible', pointerEvents: 'auto' }}>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={publishData.category}
                onChange={(e) => setPublishData({ ...publishData, category: e.target.value as 'plugin' | 'service' | 'integration' })}
                label="Kategori"
                variant="outlined"
                MenuProps={selectMenuProps}
                sx={{
                  fontSize: isDesktop ? '1.25rem' : isTablet ? '1rem' : '0.875rem',
                  pointerEvents: 'auto',
                  '& .MuiSelect-select': {
                    py: isDesktop ? 2 : isTablet ? 1.5 : 1.25,
                    lineHeight: isDesktop ? 1.6 : 1.5,
                    pointerEvents: 'auto',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#00d4ff',
                    borderWidth: '2px',
                  },
                }}
              >
                <MenuItem value="service">Tjeneste</MenuItem>
                <MenuItem value="plugin">Plugin</MenuItem>
                <MenuItem value="integration">Integrasjon</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Tags (kommaseparert)"
              value={publishData.tags || ''}
              onChange={(e) => setPublishData({ ...publishData, tags: e.target.value })}
              placeholder="f.eks. casting, planning, tools"
              helperText="Tags som hjelper brukere finne tjenesten"
            />

            <TextField
              fullWidth
              type="number"
              label="Pris (NOK)"
              value={publishData.price || 0}
              onChange={(e) => setPublishData({ ...publishData, price: parseFloat(e.target.value) || 0 })}
              helperText="0 for gratis tjeneste"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={publishData.makePublic}
                  onChange={(e) => setPublishData({ ...publishData, makePublic: e.target.checked })}
                />
              }
              label="Gjør tjenesten offentlig tilgjengelig"
            />

            <Box sx={{ p: 2, bgcolor: 'warning.dark', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>⚠️ Viktig:</strong> Når du publiserer tjenesten, vil den bli tilgjengelig for alle brukere i Marketplace.
                Sørg for at innholdet er klart og testet før publisering.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPublishDialog(false)}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={handlePublishToMarketplace}
            disabled={!publishData.author}
          >
            {formData.publishedToMarketplace ? 'Oppdater' : 'Publiser'} til Marketplace
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        fullScreen={isMobile}
        maxWidth={isDesktop ? 'md' : 'sm'}
        fullWidth
        container={() => document.body}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
            borderRadius: { xs: 0, sm: 2, md: 3 },
            border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.1)' },
            maxHeight: { 
              xs: '100vh', 
              sm: isLandscape ? '90vh' : '85vh',
              md: '80vh',
            },
            m: { xs: 0, sm: 2, md: 3 },
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            zIndex: 100001,
            position: 'relative',
          }
        }}
        sx={{
          zIndex: 100000,
          '& .MuiDialog-container': {
            zIndex: 100000,
          },
          '& .MuiDialog-paper': {
            zIndex: 100001,
          },
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History />
            <Typography>Versjonshistorikk: {versionHistoryPanel?.title}</Typography>
          </Box>
          <IconButton
            onClick={() => setShowVersionHistory(false)}
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {versionHistory.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Ingen versjonshistorikk for dette panelet.
            </Typography>
          ) : (
            <List>
              {versionHistory.map((version) => (
                <ListItem
                  key={version.id}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Versjon {version.version}
                        </Typography>
                        <Chip
                          label={version.version === Math.max(...versionHistory.map(v => v.version)) ? 'Nåværende' : 'Tidligere'}
                          size="small"
                          color={version.version === Math.max(...versionHistory.map(v => v.version)) ? 'primary' : 'default'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(version.timestamp).toLocaleString('nb-NO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </Typography>
                        {version.comment && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {version.comment}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => handleRestoreVersion(version)}
                      disabled={version.version === Math.max(...versionHistory.map(v => v.version))}
                      title="Gjenopprett denne versjonen"
                      sx={{
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'rgba(0,212,255,0.1)',
                        },
                        '&:disabled': {
                          color: 'rgba(255,255,255,0.6)',
                        },
                      }}
                    >
                      <Restore />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVersionHistory(false)}>Lukk</Button>
        </DialogActions>
      </Dialog>

      {/* Backup Management Dialog */}
      <Dialog
        open={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
        fullScreen={isMobile}
        maxWidth={isDesktop ? 'md' : 'sm'}
        fullWidth
        container={() => document.body}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            backgroundImage: 'linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(0,212,255,0.05) 100%)',
            borderRadius: { xs: 0, sm: 2, md: 3 },
            border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.1)' },
            maxHeight: { 
              xs: '100vh', 
              sm: isLandscape ? '90vh' : '85vh',
              md: '80vh',
            },
            m: { xs: 0, sm: 2, md: 3 },
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            zIndex: 100001,
            position: 'relative',
          }
        }}
        sx={{
          zIndex: 100000,
          '& .MuiDialog-container': {
            zIndex: 100000,
          },
          '& .MuiDialog-paper': {
            zIndex: 100001,
          },
          '& .MuiBackdrop-root': {
            zIndex: 99998,
            bgcolor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Backup />
            <Typography>Backup-håndtering</Typography>
          </Box>
          <IconButton
            onClick={() => setShowBackupDialog(false)}
            sx={{ color: 'rgba(255,255,255,0.87)' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Opprett manuelle backups eller gjenopprett fra tidligere backups.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Backup />}
                onClick={async () => {
                  try {
                    const versionCount = panels.reduce((sum, p) => sum + getPanelVersions(p.id).length, 0);
                    await createBackup(panels, versionCount, `Manuell backup - ${new Date().toLocaleString('nb-NO')}`);
                    showSuccess('Backup opprettet!');
                    const updatedBackups = await getBackups();
                    setBackups(updatedBackups);
                  } catch (error) {
                    showError('Kunne ikke opprette backup');
                    console.error('Backup error:', error);
                  }
                }}
                sx={{ minWidth: 140 }}
              >
                Opprett backup
              </Button>
            </Box>

            {backups.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Ingen backups tilgjengelig. Opprett en backup for å sikkerhetskopiere paneler.
              </Typography>
            ) : (
              <List>
                {backups.map((backup) => (
                  <ListItem
                    key={backup.id}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.05)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            Backup fra {new Date(backup.timestamp).toLocaleString('nb-NO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {backup.panels.length} paneler, {backup.versionCount} versjoner
                          </Typography>
                          {backup.comment && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {backup.comment}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          onClick={async () => {
                            try {
                              const restored = await restoreBackup(backup.id);
                              await savePanels(restored.panels);
                              setShowBackupDialog(false);
                              showSuccess(`Backup gjenopprettet! ${restored.panels.length} paneler lastet.`);
                            } catch (error) {
                              showError('Kunne ikke gjenopprette backup');
                              console.error('Restore error:', error);
                            }
                          }}
                          title="Gjenopprett denne backupen"
                          sx={{
                            color: 'primary.main',
                            '&:hover': {
                              bgcolor: 'rgba(0,212,255,0.1)',
                            },
                          }}
                        >
                          <Restore />
                        </IconButton>
                        <IconButton
                          onClick={async () => {
                            try {
                              await deleteBackup(backup.id);
                              showSuccess('Backup slettet');
                              const updatedBackups = await getBackups();
                              setBackups(updatedBackups);
                            } catch (error) {
                              showError('Kunne ikke slette backup');
                              console.error('Delete backup error:', error);
                            }
                          }}
                          title="Slett backup"
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              bgcolor: 'rgba(244,67,54,0.1)',
                            },
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBackupDialog(false)}>Lukk</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const PanelCreator: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ToastProvider>
        <PanelCreatorContent />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default PanelCreator;
