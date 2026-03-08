/**
 * FrameEditorPanel - Professional frame editing for storyboard
 * 
 * Features:
 * - Crop, Finetune, Filter, Annotate, Arrows mode tabs
 * - Linear-light color grading (exposure-based)
 * - Camera movement arrow presets + custom drawing
 * - Drag-to-reorder annotation layers
 * - iPad/Apple Pencil drawing mode
 * - Undo/redo
 * - Export annotated frame
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Popover,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  List,
  ListItemButton,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Card,
  CardActionArea,
  Collapse,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit,
  Timeline,
  ArrowForward,
  CropSquare,
  RadioButtonUnchecked,
  TextFields,
  PersonPin,
  Delete,
  Undo,
  Redo,
  Save,
  Clear,
  ColorLens,
  LineWeight,
  PanTool,
  Brush,
  AutoFixHigh,
  Create,
  TouchApp,
  Draw,
  Crop,
  Tune,
  FilterVintage,
  Gesture,
  Layers,
  KeyboardArrowUp,
  KeyboardArrowDown,
  VerticalAlignTop,
  VerticalAlignBottom,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  ExpandMore,
  ExpandLess,
  Check,
  NorthWest,
  SouthEast,
  RotateRight,
  ZoomIn,
  PanTool as PanIcon,
  North,
  South,
  East,
  West,
} from '@mui/icons-material';
import {
  FrameCanvasEngine,
  ToolType,
  DrawingStyle,
  DEFAULT_STYLE,
  MARKER_COLORS,
  CanvasState,
  CanvasObject,
} from '../core/storyboard/FrameCanvasEngine';
import {
  LinearColorPipeline,
  ColorGradeSettings,
  DEFAULT_COLOR_SETTINGS,
  COLOR_SLIDER_CONFIGS,
} from '../core/storyboard/LinearColorPipeline';
import {
  CAMERA_MOVEMENT_PRESETS,
  type CameraMovementCategory,
  CameraMovementPreset,
  getPresetsByCategory,
  getAllCategories,
  getCategoryDisplayName,
} from '../core/storyboard/CameraMovementPresets';
import {
  FILTER_PRESETS,
  type FilterCategory,
  FilterPreset,
  getFiltersByCategory,
  getAllFilterCategories,
  getCategoryDisplayName as getFilterCategoryName,
  applyFilterIntensity,
} from '../core/storyboard/FilterPresets';
import {
  useStoryboardStore,
  StoryboardFrame,
  FrameDrawingData,
} from '../state/storyboardStore';
import { FrameDrawingEditor } from '../components/FrameDrawingEditor';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
// =============================================================================
// Types
// =============================================================================

type EditorMode = 'crop' | 'finetune' | 'filter' | 'annotate' | 'arrows';

// =============================================================================
// Color Palette
// =============================================================================

const COLOR_PALETTE = [
  '#ff4444','#ff8844','#ffcc44','#44ff44','#44ffcc','#44ccff','#4488ff','#8844ff','#ff44ff','#ffffff','#cccccc','#888888','#444444','#000000',
];

// =============================================================================
// Mode Tab Icons
// =============================================================================

const MODE_ICONS: Record<EditorMode, React.ReactNode> = {
  crop: <Crop />,
  finetune: <Tune />,
  filter: <FilterVintage />,
  annotate: <Edit />,
  arrows: <Gesture />,
};

const MODE_LABELS: Record<EditorMode, { en: string; no: string }> = {
  crop: { en: 'Crop', no: 'Beskjær' },
  finetune: { en: 'Finetune', no: 'Finjuster' },
  filter: { en: 'Filter', no: 'Filter' },
  annotate: { en: 'Annotate', no: 'Annoter' },
  arrows: { en: 'Arrows', no: 'Piler' },
};

// =============================================================================
// Main Component
// =============================================================================

interface FrameEditorPanelProps {
  frame: StoryboardFrame;
  onSave?: (annotatedImageUrl: string) => void;
  onClose?: () => void;
}

export const FrameEditorPanel: React.FC<FrameEditorPanelProps> = ({
  frame,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FrameCanvasEngine | null>(null);
  const colorPipelineRef = useRef<LinearColorPipeline | null>(null);
  const device = useDeviceDetection();
  
  // Mode state
  const [editorMode, setEditorMode] = useState<EditorMode>('annotate');
  
  // Basic drawing state
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [currentStyle, setCurrentStyle] = useState<DrawingStyle>(DEFAULT_STYLE);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [markerLabel, setMarkerLabel] = useState('A');
  const [markerType, setMarkerType] = useState<keyof typeof MARKER_COLORS>('actor');
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Finetune state
  const [colorSettings, setColorSettings] = useState<ColorGradeSettings>({ ...DEFAULT_COLOR_SETTINGS });
  const [colorProcessedUrl, setColorProcessedUrl] = useState<string | null>(null);
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(null);
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [filterCategory, setFilterCategory] = useState<'all' | FilterCategory>('all');
  
  // Arrows state
  const [arrowMode, setArrowMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<CameraMovementPreset | null>(null);
  const [arrowCategory, setArrowCategory] = useState<'all' | CameraMovementCategory>('all');
  const [gestureTooltip, setGestureTooltip] = useState<string | null>(null);
  
  // Layers panel state
  const [layersPanelOpen, setLayersPanelOpen] = useState(true);
  const [layers, setLayers] = useState<CanvasObject[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [layerLocks, setLayerLocks] = useState<Record<string, boolean>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState(0);
  
  // Crop state
  const [cropRotation, setCropRotation] = useState(0);
  const [cropScale, setCropScale] = useState(100);
  
  // iPad Drawing Mode
  const [showPencilDrawing, setShowPencilDrawing] = useState(false);

  // Store
  const { updateFrame } = useStoryboardStore();

  // Initialize canvas engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new FrameCanvasEngine();
    engineRef.current = engine;

    // Initialize with frame image
    engine.initialize(
      canvasRef.current,
      frame.imageUrl,
      (_state: CanvasState) => {
        // Update undo/redo state
        setCanUndo(engine.canUndo());
        setCanRedo(engine.canRedo());
        // Update layers list
        setLayers(engine.getObjectsSortedByLayer());
      },
      (_objectId: string | null) => {
        // Handle selection
      }
    );

    // Set up gesture detection callback for custom arrows
    engine.setGestureCallback((gesture) => {
      if (gesture) {
        const label = gesture.suggestedLabel || `Detected: ${gesture.detectedType}`;
        setGestureTooltip(label);
        // Auto-clear after 3 seconds
        setTimeout(() => setGestureTooltip(null), 3000);
      } else {
        setGestureTooltip(null);
      }
    });

    // Load existing annotations if any
    if ((frame as any).canvasState) {
      engine.loadState((frame as any).canvasState);
      setLayers(engine.getObjectsSortedByLayer());
    }

    return () => {
      engine.destroy();
    };
  }, [frame.id, frame.imageUrl]);

  useEffect(() => {
    setLayerVisibility((prev) => {
      const next = { ...prev };
      layers.forEach((layer) => {
        if (next[layer.id] === undefined) next[layer.id] = true;
      });
      return next;
    });
    setLayerLocks((prev) => {
      const next = { ...prev };
      layers.forEach((layer) => {
        if (next[layer.id] === undefined) next[layer.id] = false;
      });
      return next;
    });
  }, [layers]);

  // Initialize color pipeline
  useEffect(() => {
    const pipeline = new LinearColorPipeline();
    colorPipelineRef.current = pipeline;
    
    if (frame.imageUrl) {
      pipeline.loadImage(frame.imageUrl).then(() => {
        // Load saved color settings if any
        if ((frame as any).colorGrade) {
          setColorSettings((frame as any).colorGrade);
          pipeline.setSettings((frame as any).colorGrade);
          setColorProcessedUrl(pipeline.toDataURL());
        }
        
        // Load saved filter if any
        if ((frame as any).filterId) {
          const savedFilter = FILTER_PRESETS.find(f => f.id === (frame as any).filterId);
          if (savedFilter) {
            setSelectedFilter(savedFilter);
            if ((frame as any).filterIntensity != null) {
              setFilterIntensity((frame as any).filterIntensity);
            }
          }
        }
      }).catch(err => {
        console.warn('Failed to load image for color pipeline:', err);
      });
    }
  }, [frame.imageUrl]);

  // Update color processing when settings change (finetune mode)
  useEffect(() => {
    if (!colorPipelineRef.current) return;
    
    // Only apply manual color settings in finetune mode
    if (editorMode === 'finetune') {
      colorPipelineRef.current.setSettings(colorSettings);
      setColorProcessedUrl(colorPipelineRef.current.toDataURL());
    }
  }, [colorSettings, editorMode]);

  // Apply filter when selected (filter mode)
  useEffect(() => {
    if (!colorPipelineRef.current) return;
    
    if (editorMode === 'filter' && selectedFilter) {
      const adjustedSettings = applyFilterIntensity(selectedFilter.settings, filterIntensity);
      colorPipelineRef.current.setSettings(adjustedSettings);
      setColorProcessedUrl(colorPipelineRef.current.toDataURL());
    } else if (editorMode === 'filter' && !selectedFilter) {
      // No filter selected - reset to original
      colorPipelineRef.current.reset();
      setColorProcessedUrl(colorPipelineRef.current.toDataURL());
    }
  }, [selectedFilter, filterIntensity, editorMode]);

  // Update engine when tool changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(currentTool);
    }
  }, [currentTool]);

  // Update engine when style changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setStyle(currentStyle);
    }
  }, [currentStyle]);

  // Configure engine based on editor mode
  useEffect(() => {
    if (!engineRef.current) return;
    
    switch (editorMode) {
      case 'annotate':
        // Reset to selection tool
        setCurrentTool('select');
        engineRef.current.setCustomArrowMode(false);
        break;
      case 'arrows':
        if (arrowMode === 'custom') {
          engineRef.current.setCustomArrowMode(true);
        } else {
          engineRef.current.setCustomArrowMode(false);
        }
        break;
      case 'crop':
      case 'finetune':
      case 'filter':
        // Disable drawing interactions
        setCurrentTool('select');
        engineRef.current.setCustomArrowMode(false);
        break;
    }
  }, [editorMode, arrowMode]);

  // Handle tool change
  const handleToolChange = (_: React.MouseEvent<HTMLElement>, newTool: ToolType | null) => {
    if (newTool) {
      setCurrentTool(newTool);
      
      // Special handling for text and marker tools
      if (newTool === 'text') {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          setPendingPosition({ x: rect.width / 2, y: rect.height / 2 });
        }
        setTextDialogOpen(true);
      } else if (newTool === 'marker') {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          setPendingPosition({ x: rect.width / 2, y: rect.height / 2 });
        }
        setMarkerDialogOpen(true);
      }
    }
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    setCurrentStyle((prev: DrawingStyle) => ({ ...prev, strokeColor: color }));
    setColorAnchor(null);
  };

  // Handle stroke width change
  const handleStrokeWidthChange = (_event: Event, value: number | number[]) => {
    setCurrentStyle((prev: DrawingStyle) => ({ ...prev, strokeWidth: value as number }));
  };

  // Handle undo
  const handleUndo = () => {
    if (engineRef.current?.undo()) {
      setCanUndo(engineRef.current.canUndo());
      setCanRedo(engineRef.current.canRedo());
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (engineRef.current?.redo()) {
      setCanUndo(engineRef.current.canUndo());
      setCanRedo(engineRef.current.canRedo());
    }
  };

  // Handle clear
  const handleClear = () => {
    engineRef.current?.clear();
    setCanUndo(engineRef.current?.canUndo() || false);
    setCanRedo(engineRef.current?.canRedo() || false);
  };

  // Handle delete selected
  const handleDelete = () => {
    engineRef.current?.deleteSelected();
    setCanUndo(engineRef.current?.canUndo() || false);
    setCanRedo(engineRef.current?.canRedo() || false);
  };

  // Handle add text
  const handleAddText = () => {
    if (!textInput.trim() || !canvasRef.current) return;
    
    // Add text at center of canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const position = pendingPosition || { x: rect.width / 2, y: rect.height / 2 };
    engineRef.current?.addText(
      position,
      textInput.trim()
    );
    
    setTextInput(', ');
    setTextDialogOpen(false);
    setCurrentTool('select');
    setPendingPosition(null);
  };

  // Handle add marker
  const handleAddMarker = () => {
    if (!canvasRef.current) return;
    
    // Add marker at center of canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const position = pendingPosition || { x: rect.width / 2, y: rect.height / 2 };
    engineRef.current?.addMarker(
      position,
      markerLabel,
      markerType
    );
    
    setMarkerDialogOpen(false);
    setCurrentTool('select');
    setPendingPosition(null);
  };

  // Handle color setting change (finetune mode)
  const handleColorSettingChange = (key: keyof ColorGradeSettings, value: number) => {
    setColorSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handle color reset
  const handleColorReset = () => {
    setColorSettings({ ...DEFAULT_COLOR_SETTINGS });
    colorPipelineRef.current?.reset();
  };

  // Handle filter selection
  const handleFilterSelect = (filter: FilterPreset | null) => {
    if (filter === null || selectedFilter?.id === filter.id) {
      setSelectedFilter(null);
      colorPipelineRef.current?.reset();
    } else {
      setSelectedFilter(filter);
    }
  };

  // Handle arrow preset selection
  const handleArrowPresetSelect = (preset: CameraMovementPreset) => {
    setSelectedPreset(preset);
    engineRef.current?.setArrowPreset(preset);
    setCurrentTool('arrow-preset' as ToolType);
  };

  // Handle custom arrow mode
  const handleCustomArrowMode = useCallback(() => {
    setArrowMode('custom');
    setSelectedPreset(null);
    engineRef.current?.setCustomArrowMode(true);
    setCurrentTool('arrow-custom' as ToolType);
  }, []);

  // Handle arrow preset hover (for animation preview)
  const handleArrowPresetHover = useCallback((preset: CameraMovementPreset) => {
    setGestureTooltip(`Preview: ${preset.name}`);
  }, []);

  // Handle arrow preset leave
  const handleArrowPresetLeave = useCallback(() => {
    setGestureTooltip(null);
  }, []);

  // Handle layer reorder
  const handleLayerMoveUp = (id: string) => {
    engineRef.current?.moveObjectUp(id);
    setLayers(engineRef.current?.getObjectsSortedByLayer() || []);
  };

  const handleLayerMoveDown = (id: string) => {
    engineRef.current?.moveObjectDown(id);
    setLayers(engineRef.current?.getObjectsSortedByLayer() || []);
  };

  const handleBringToFront = useCallback((id: string) => {
    engineRef.current?.bringToFront(id);
    setLayers(engineRef.current?.getObjectsSortedByLayer() || []);
  }, []);

  const handleSendToBack = useCallback((id: string) => {
    engineRef.current?.sendToBack(id);
    setLayers(engineRef.current?.getObjectsSortedByLayer() || []);
  }, []);

  // Get filtered arrow presets
  const filteredArrowPresets = useMemo(() => {
    return getPresetsByCategory(arrowCategory as any);
  }, [arrowCategory]);

  // Get filtered filter presets
  const filteredFilters = useMemo(() => {
    return getFiltersByCategory(filterCategory as any);
  }, [filterCategory]);

  const arrowCategories = useMemo<Array<'all' | CameraMovementCategory>>(
    () => ['all', ...getAllCategories()],
    []
  );
  const filterCategories = useMemo<Array<'all' | FilterCategory>>(
    () => ['all', ...getAllFilterCategories()],
    []
  );

  const nudgePending = useCallback((dx: number, dy: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPendingPosition((prev) => {
      const base = prev || { x: rect.width / 2, y: rect.height / 2 };
      return { x: base.x + dx, y: base.y + dy };
    });
  }, []);

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleLayerLock = useCallback((id: string) => {
    setLayerLocks((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Handle save
  const handleSave = () => {
    if (!engineRef.current) return;
    
    // Get annotated image
    const annotatedImageUrl = engineRef.current.toDataURL('jpeg', 0.9);
    
    // Save canvas state and color grading to frame
    const canvasState = engineRef.current.getState();
    updateFrame(frame.id, {
      // Store canvas state for future editing
      ...({ 
        canvasState,
        colorGrade: colorSettings,
        filterId: selectedFilter?.id ?? null,
        filterIntensity: selectedFilter ? filterIntensity : null,
      } as any),
    });
    
    onSave?.(annotatedImageUrl);
  };

  // Handle iPad Pencil drawing save
  const handlePencilDrawingSave = (drawingData: FrameDrawingData, imageDataUrl: string) => {
    updateFrame(frame.id, {
      imageUrl: imageDataUrl,
      drawingData,
      imageSource: 'drawn',
      updatedAt: new Date().toISOString(),
    });
    setShowPencilDrawing(false);
    onSave?.(imageDataUrl);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', bgcolor: '#0a0a12' }}>
      {/* iPad Drawing Mode */}
      {showPencilDrawing && (
        <FrameDrawingEditor
          frameId={frame.id}
          aspectRatio="16:9"
          initialImage={frame.imageUrl}
          mode="dialog"
          onSave={handlePencilDrawingSave}
          onCancel={() => setShowPencilDrawing(false)}
        />
      )}

      {/* Left Sidebar - Mode Selection */}
      <Paper
        elevation={0}
        sx={{
          width: 64,
          bgcolor: '#1a1a2e',
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          py: 1,
        }}
      >
        <Stack spacing={1} alignItems="center">
          {(['crop', 'finetune', 'filter', 'annotate', 'arrows'] as EditorMode[]).map((mode) => (
            <Tooltip key={mode} title={MODE_LABELS[mode].en} placement="right">
              <IconButton
                onClick={() => setEditorMode(mode)}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  bgcolor: editorMode === mode ? 'primary.main' : 'transparent',
                  color: editorMode === mode ? '#fff' : 'text.secondary',
                  '&:hover': {
                    bgcolor: editorMode === mode ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                {MODE_ICONS[mode]}
              </IconButton>
            </Tooltip>
          ))}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        {/* Undo/Redo at bottom */}
        <Stack spacing={0.5} alignItems="center">
          <Tooltip title="Undo" placement="right">
            <span>
              <IconButton onClick={handleUndo} disabled={!canUndo} size="small">
                <Undo fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo" placement="right">
            <span>
              <IconButton onClick={handleRedo} disabled={!canRedo} size="small">
                <Redo fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Toolbar - Mode-specific tools */}
        <Paper
          elevation={0}
          sx={{
            p: 1,
            bgcolor: '#1a1a2e',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Mode-specific toolbar content */}
            {editorMode === 'annotate' && (
              <>
                {/* Tool Selection */}
                <ToggleButtonGroup
                  value={currentTool}
                  exclusive
                  onChange={handleToolChange}
                  size="small"
                >
                  <ToggleButton value="select">
                    <Tooltip title="Select (V)"><PanTool fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="pen">
                    <Tooltip title="Pen (P)"><Brush fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="arrow">
                    <Tooltip title="Arrow (A)"><ArrowForward fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="rectangle">
                    <Tooltip title="Rectangle (R)"><CropSquare fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="circle">
                    <Tooltip title="Circle (C)"><RadioButtonUnchecked fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="text">
                    <Tooltip title="Text (T)"><TextFields fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="marker">
                    <Tooltip title="Marker (M)"><PersonPin fontSize="small" /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>

                <Divider orientation="vertical" flexItem />

                {/* Color Picker */}
                <Tooltip title="Color">
                  <IconButton
                    onClick={(e) => setColorAnchor(e.currentTarget)}
                    sx={{
                      bgcolor: currentStyle.strokeColor,
                      width: 32,
                      height: 32,
                      border: 2,
                      borderColor: '#fff',
                      '&:hover': { bgcolor: currentStyle.strokeColor },
                    }}
                  >
                    <ColorLens sx={{ color: '#fff', fontSize: 16 }} />
                  </IconButton>
                </Tooltip>

                {/* Stroke Width */}
                <Box sx={{ width: 100, px: 1 }}>
                  <Tooltip title="Stroke Width">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LineWeight fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Slider
                        value={currentStyle.strokeWidth}
                        onChange={handleStrokeWidthChange}
                        min={1}
                        max={20}
                        size="small"
                      />
                    </Stack>
                  </Tooltip>
                </Box>

                <Divider orientation="vertical" flexItem />

                <Tooltip title="Delete Selected">
                  <IconButton onClick={handleDelete} size="small">
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear All">
                  <IconButton onClick={handleClear} size="small" color="error">
                    <Clear fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {editorMode === 'arrows' && (
              <>
                {/* Preset vs Custom toggle */}
                <ToggleButtonGroup
                  value={arrowMode}
                  exclusive
                  onChange={(_, mode) => mode && setArrowMode(mode)}
                  size="small"
                >
                  <ToggleButton value="preset">
                    <Tooltip title="Use Presets"><Gesture fontSize="small" /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="custom">
                    <Tooltip title="Custom Draw"><Create fontSize="small" /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>

                {arrowMode === 'custom' && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="caption" color="text.secondary">
                      Draw arrow gesture - L-shapes and curves detected automatically
                    </Typography>
                    {gestureTooltip && (
                      <Chip
                        label={gestureTooltip}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </>
                )}

                {arrowMode === 'preset' && selectedPreset && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <Chip
                      label={selectedPreset.name}
                      onDelete={() => setSelectedPreset(null)}
                      sx={{ bgcolor: selectedPreset.color, color: '#fff' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Click and drag to place arrow
                    </Typography>
                  </>
                )}
              </>
            )}

            {editorMode === 'finetune' && (
              <>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Linear-Light Color Grading
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" onClick={handleColorReset} startIcon={<Clear />}>
                  Reset
                </Button>
              </>
            )}

            {editorMode === 'filter' && (
              <>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Filter Presets
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption">Intensity:</Typography>
                  <Slider
                    value={filterIntensity}
                    onChange={(_, val) => setFilterIntensity(val as number)}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ width: 100 }}
                  />
                  <Typography variant="caption">{filterIntensity}%</Typography>
                </Stack>
              </>
            )}

            {editorMode === 'crop' && (
              <>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Crop & Transform
                </Typography>
              </>
            )}

            <Box sx={{ flexGrow: 1 }} />

            {/* iPad Drawing Button */}
            {(device.isIPad || device.hasTouchScreen) && (
              <Tooltip title={device.hasPencilSupport ? 'Draw with Apple Pencil' : 'Touch Drawing'}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={device.hasPencilSupport ? <Create /> : <TouchApp />}
                  onClick={() => setShowPencilDrawing(true)}
                  sx={{
                    borderColor: '#8b5cf6',
                    color: '#8b5cf6',
                    '&:hover': { borderColor: '#7c3aed', bgcolor: 'rgba(139,92,246,0.1)' },
                  }}
                >
                  {device.hasPencilSupport ? 'Pencil' : 'Draw'}
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Quick Save">
              <Button size="small" variant="outlined" startIcon={<Save />} onClick={handleSave}>
                Save
              </Button>
            </Tooltip>

            {onClose && (
              <Tooltip title="Close editor">
                <IconButton size="small" onClick={onClose}>
                  <VisibilityOff fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title={advancedOpen ? 'Hide advanced tools' : 'Show advanced tools'}>
              <IconButton size="small" onClick={() => setAdvancedOpen((prev) => !prev)}>
                {advancedOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* Done Button */}
            <Button
              variant="contained"
              startIcon={<Check />}
              onClick={handleSave}
              size="small"
            >
              Done
            </Button>
          </Stack>
        </Paper>

        <Collapse in={advancedOpen}>
          <Card sx={{ mx: 1, mb: 1, bgcolor: '#141421', border: 1, borderColor: 'divider' }}>
            <CardActionArea onClick={() => setAdvancedOpen(true)}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5 }}>
                <Timeline fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Advanced Tools
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                {advancedOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </Stack>
            </CardActionArea>
            <Divider />
            <Tabs value={advancedTab} onChange={(_, v) => setAdvancedTab(v as number)} variant="fullWidth">
              <Tab label="Presets" />
              <Tab label="Filters" />
              <Tab label="Layers" />
              <Tab label="Layout" />
            </Tabs>

            {advancedTab === 0 && (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {CAMERA_MOVEMENT_PRESETS.length} presets available
                </Typography>
                <List dense>
                  {arrowCategories.map((cat) => (
                    <ListItem key={cat} disablePadding>
                      <ListItemButton onClick={() => setArrowCategory(cat)}>
                        <ListItemIcon>
                          <Timeline fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={cat === 'all' ? 'All Movements' : getCategoryDisplayName(cat)}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  {filteredArrowPresets.map((preset) => (
                    <Grid key={preset.id} size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ borderColor: preset.color }}>
                        <CardActionArea onClick={() => handleArrowPresetSelect(preset)}>
                          <Stack spacing={0.5} alignItems="center" sx={{ p: 1 }}>
                            <Typography variant="caption" sx={{ color: preset.color }}>
                              {preset.name}
                            </Typography>
                            <Button size="small" onClick={() => handleArrowPresetHover(preset)}>
                              Preview
                            </Button>
                          </Stack>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {advancedTab === 1 && (
              <Box sx={{ p: 1.5 }}>
                <List dense>
                  {filterCategories.map((cat) => (
                    <ListItem key={cat} disablePadding>
                      <ListItemButton onClick={() => setFilterCategory(cat)}>
                        <ListItemIcon>
                          <AutoFixHigh fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={cat === 'all' ? 'All Filters' : getFilterCategoryName(cat)}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  {filteredFilters.map((filter) => (
                    <Grid key={filter.id} size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ borderColor: selectedFilter?.id === filter.id ? 'primary.main' : 'divider' }}>
                        <CardActionArea onClick={() => handleFilterSelect(filter)}>
                          <Stack spacing={0.5} alignItems="center" sx={{ p: 1 }}>
                            <Typography variant="caption">{filter.name}</Typography>
                            <Chip size="small" label={filter.category} />
                          </Stack>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {advancedTab === 2 && (
              <Box sx={{ p: 1.5 }}>
                {layers.length === 0 && (
                  <Alert severity="info">No layers available yet.</Alert>
                )}
                <List dense>
                  {layers.map((layer) => (
                    <ListItem key={layer.id} disablePadding sx={{ opacity: layerVisibility[layer.id] === false ? 0.5 : 1 }}>
                      <ListItemButton onClick={() => setSelectedLayerId(layer.id)}>
                        <ListItemIcon>
                          {layerVisibility[layer.id] === false ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={layer.label || layer.text || layer.type}
                          secondary={layer.id === selectedLayerId ? 'Selected' : undefined}
                        />
                      </ListItemButton>
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => handleLayerMoveUp(layer.id)}>
                          <KeyboardArrowUp fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleLayerMoveDown(layer.id)}>
                          <KeyboardArrowDown fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleBringToFront(layer.id)}>
                          <VerticalAlignTop fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleSendToBack(layer.id)}>
                          <VerticalAlignBottom fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => toggleLayerVisibility(layer.id)}>
                          {layerVisibility[layer.id] === false ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                        <IconButton size="small" onClick={() => toggleLayerLock(layer.id)}>
                          {layerLocks[layer.id] ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {advancedTab === 3 && (
              <Box sx={{ p: 1.5 }}>
                {pendingPosition && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    Pending position: {Math.round(pendingPosition.x)}, {Math.round(pendingPosition.y)}
                  </Alert>
                )}
                <List dense>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setCropRotation((prev) => prev + 90)}>
                      <ListItemIcon>
                        <RotateRight fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Rotate 90" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setCropScale((prev) => Math.min(150, prev + 10))}>
                      <ListItemIcon>
                        <ZoomIn fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Zoom In" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setCropScale((prev) => Math.max(50, prev - 10))}>
                      <ListItemIcon>
                        <SouthEast fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Zoom Out" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => setCropScale(100)}>
                      <ListItemIcon>
                        <NorthWest fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Reset Zoom" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => {
                      if (!canvasRef.current) return;
                      const rect = canvasRef.current.getBoundingClientRect();
                      setPendingPosition({ x: rect.width / 2, y: rect.height / 2 });
                    }}>
                      <ListItemIcon>
                        <PanIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Center Pending Position" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => nudgePending(0, -10)}>
                      <ListItemIcon>
                        <North fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Nudge Up" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => nudgePending(0, 10)}>
                      <ListItemIcon>
                        <South fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Nudge Down" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => nudgePending(-10, 0)}>
                      <ListItemIcon>
                        <West fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Nudge Left" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => nudgePending(10, 0)}>
                      <ListItemIcon>
                        <East fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Nudge Right" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleCustomArrowMode}>
                      <ListItemIcon>
                        <Draw fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Custom Arrow Mode" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleColorReset}>
                      <ListItemIcon>
                        <AutoFixHigh fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Auto Enhance Reset" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding>
                    <ListItemButton onClick={handleSave}>
                      <ListItemIcon>
                        <Save fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Save Snapshot" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Box>
            )}
          </Card>
        </Collapse>

        {/* Main Workspace - Mode Panel + Canvas + Layers */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Mode-specific Side Panel */}
          {(editorMode === 'finetune' || editorMode === 'filter' || editorMode === 'arrows') && (
            <Paper
              elevation={0}
              sx={{
                width: 260,
                bgcolor: '#12121e',
                borderRight: 1,
                borderColor: 'divider',
                overflow: 'auto',
                p: 2,
              }}
            >
              {/* Finetune Panel - Color Sliders */}
              {editorMode === 'finetune' && (
                <Stack spacing={2}>
                  {COLOR_SLIDER_CONFIGS.map((config) => {
                    const value = colorSettings[config.key];
                    // Skip non-numeric values (e.g., toneCurve)
                    if (typeof value !== 'number') return null;
                    return (
                      <Box key={config.key}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {config.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.primary', fontFamily: 'monospace' }}>
                            {value.toFixed(config.step < 1 ? 2 : 0)}
                            {config.unit || ''}
                          </Typography>
                        </Stack>
                        <Slider
                          value={value}
                          onChange={(_, val) => handleColorSettingChange(config.key, val as number)}
                          min={config.min}
                          max={config.max}
                          step={config.step}
                          size="small"
                          sx={{
                            '& .MuiSlider-track': {
                              bgcolor: config.key === 'temperature' ? '#ffa726' :
                                       config.key === 'tint' ? '#ab47bc' :
                                       config.key === 'saturation' || config.key === 'vibrance' ? '#26a69a' :
                                       'primary.main'
                            }
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}

              {/* Filter Panel - Filter Grid */}
              {editorMode === 'filter' && (
                <Stack spacing={2}>
                  {/* Filter Categories */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {filterCategories.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat === 'all' ? 'All' : getFilterCategoryName(cat)}
                        size="small"
                        variant={filterCategory === cat ? 'filled' : 'outlined'}
                        onClick={() => setFilterCategory(cat)}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                  
                  {/* Filter Grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    {/* None option */}
                    <Paper
                      elevation={selectedFilter === null ? 4 : 1}
                      onClick={() => handleFilterSelect(null)}
                      sx={{
                        p: 1,
                        cursor: 'pointer',
                        border: selectedFilter === null ? 2 : 0,
                        borderColor: 'primary.main',
                        bgcolor: '#1a1a2e',
                        '&:hover': { bgcolor: '#252536' }
                      }}
                    >
                      <Typography variant="caption" sx={{ textAlign: 'center', display: 'block' }}>
                        None
                      </Typography>
                    </Paper>
                    
                    {filteredFilters.map((filter) => (
                        <Paper
                          key={filter.id}
                          elevation={selectedFilter?.id === filter.id ? 4 : 1}
                          onClick={() => handleFilterSelect(filter)}
                          sx={{
                            p: 1,
                            cursor: 'pointer',
                            border: selectedFilter?.id === filter.id ? 2 : 0,
                            borderColor: 'primary.main',
                            bgcolor: '#1a1a2e',
                            '&:hover': { bgcolor: '#252536' }
                          }}
                        >
                          <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', fontSize: '0.7rem' }}>
                            {filter.name}
                          </Typography>
                        </Paper>
                      ))}
                  </Box>
                </Stack>
              )}

              {/* Arrows Panel - Preset Grid */}
              {editorMode === 'arrows' && arrowMode === 'preset' && (
                <Stack spacing={2}>
                  {/* Arrow Categories */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {arrowCategories.map((cat) => (
                      <Chip
                        key={cat}
                        label={cat === 'all' ? 'All' : getCategoryDisplayName(cat)}
                        size="small"
                        variant={arrowCategory === cat ? 'filled' : 'outlined'}
                        onClick={() => setArrowCategory(cat)}
                        sx={{ fontSize: '0.65rem' }}
                      />
                    ))}
                  </Box>

                  {/* Arrow Preset Grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    {filteredArrowPresets.map((preset) => (
                        <Tooltip key={preset.id} title={preset.description} placement="right">
                          <Paper
                            elevation={selectedPreset?.id === preset.id ? 4 : 1}
                            onClick={() => handleArrowPresetSelect(preset)}
                            onMouseEnter={() => handleArrowPresetHover(preset)}
                            onMouseLeave={handleArrowPresetLeave}
                            sx={{
                              p: 1,
                              cursor: 'pointer',
                              border: selectedPreset?.id === preset.id ? 2 : 0,
                              borderColor: preset.color,
                              bgcolor: '#1a1a2e',
                              '&:hover': { bgcolor: '#252536' }
                            }}
                          >
                            <Stack alignItems="center" spacing={0.5}>
                              <Box sx={{ color: preset.color, fontSize: 24 }}>
                                {preset.category === 'pan' ? '↔' :
                                 preset.category === 'tilt' ? '↕' :
                                 preset.category === 'dolly' ? '⇄' :
                                 preset.category === 'truck' ? '⇆' :
                                 preset.category === 'crane' ? '⇅' :
                                 preset.category === 'zoom' ? '⊕' :
                                 preset.category === 'orbit' ? '↻' :
                                 '↗'}
                              </Box>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem', textAlign: 'center' }}>
                                {preset.name}
                              </Typography>
                            </Stack>
                          </Paper>
                        </Tooltip>
                      ))}
                  </Box>
                </Stack>
              )}

              {/* Custom Arrow Instructions */}
              {editorMode === 'arrows' && arrowMode === 'custom' && (
                <Stack spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Custom Arrow Drawing
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    Draw gestures on the canvas:
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      • <strong>Straight line</strong> → Pan/Truck arrow
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      • <strong>L-shape (90°)</strong> → Pan + Tilt combo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      • <strong>Curve</strong> → Arc/Orbit movement
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      • <strong>Zigzag</strong> → Handheld shake
                    </Typography>
                  </Stack>
                  <Divider />
                  <Typography variant="caption" color="text.secondary">
                    The gesture will be analyzed and converted to a labeled camera movement arrow.
                  </Typography>
                </Stack>
              )}
            </Paper>
          )}

          {/* Canvas Container */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              overflow: 'auto',
              bgcolor: '#0a0a12',
            }}
          >
            <Paper
              elevation={4}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
                borderRadius: 1,
                position: 'relative',
              }}
            >
              {/* Color-processed image overlay for finetune/filter modes */}
              {(editorMode === 'finetune' || editorMode === 'filter') && colorProcessedUrl && (
                <img
                  src={colorProcessedUrl}
                  alt="Color processed preview"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
              )}
              <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 200px)',
                  transform: editorMode === 'crop' ? `rotate(${cropRotation}deg) scale(${cropScale / 100})` : undefined,
                  transformOrigin: 'center center',
                  cursor: editorMode === 'arrows' && arrowMode === 'custom' ? 'crosshair' :
                          currentTool === 'select' ? 'default' : 'crosshair',
                  opacity: (editorMode === 'finetune' || editorMode === 'filter') && colorProcessedUrl ? 0 : 1,
                }}
              />
            </Paper>
          </Box>

          {/* Layers Panel (Right) */}
          {layersPanelOpen && (
            <Paper
              elevation={0}
              sx={{
                width: 200,
                bgcolor: '#12121e',
                borderLeft: 1,
                borderColor: 'divider',
                overflow: 'auto',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">Layers</Typography>
                <IconButton size="small" onClick={() => setLayersPanelOpen(false)}>
                  <Clear fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={0.5} sx={{ p: 1 }}>
                {layers.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                    No annotations yet
                  </Typography>
                )}
                {layers.map((layer, index) => (
                  <Paper
                    key={layer.id}
                    elevation={1}
                    sx={{
                      p: 1,
                      bgcolor: layer.selected ? 'primary.dark' : '#1a1a2e',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#252536' }
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: layer.style?.strokeColor || '#fff',
                        }}
                      />
                      <Typography variant="caption" sx={{ flex: 1, fontSize: '0.7rem' }}>
                        {layer.label || layer.text || layer.type}
                      </Typography>
                      <Stack direction="row" spacing={0}>
                        <IconButton
                          size="small"
                          onClick={() => handleLayerMoveUp(layer.id)}
                          disabled={index === 0}
                          sx={{ p: 0.25 }}
                        >
                          <Undo fontSize="inherit" sx={{ transform: 'rotate(90deg)', fontSize: 14 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleLayerMoveDown(layer.id)}
                          disabled={index === layers.length - 1}
                          sx={{ p: 0.25 }}
                        >
                          <Redo fontSize="inherit" sx={{ transform: 'rotate(90deg)', fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}
        </Box>

        {/* Footer */}
        <Paper
          elevation={0}
          sx={{
            p: 1,
            bgcolor: '#1a1a2e',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Frame {frame.index + 1}: {frame.title}
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Typography variant="caption" color="text.secondary">
              {frame.shotType} • {frame.cameraAngle}
            </Typography>
            {frame.sceneSnapshot && (
              <>
                <Divider orientation="vertical" flexItem />
                <Typography variant="caption" color="text.secondary">
                  f/{frame.sceneSnapshot.camera.aperture} • {frame.sceneSnapshot.camera.focalLength}mm
                </Typography>
              </>
            )}
            
            <Box sx={{ flexGrow: 1 }} />
            
            {/* Layers Toggle */}
            <Tooltip title="Toggle Layers Panel">
              <IconButton
                size="small"
                onClick={() => setLayersPanelOpen(!layersPanelOpen)}
                sx={{ color: layersPanelOpen ? 'primary.main' : 'text.secondary' }}
              >
                <Layers fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </Box>

      {/* Color Popover */}
      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {COLOR_PALETTE.map((color) => (
            <IconButton
              key={color}
              onClick={() => handleColorChange(color)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: color,
                border: currentStyle.strokeColor === color ? 2 : 1,
                borderColor: currentStyle.strokeColor === color ? 'primary.main' : '#555','&:hover': { bgcolor: color }}}
            />
          ))}
        </Box>
      </Popover>

      {/* Text Dialog */}
      <Dialog open={textDialogOpen} onClose={() => setTextDialogOpen(false)}>
        <DialogTitle>Add Text Annotation</DialogTitle>
        <DialogContent>
          {pendingPosition && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Placement: {Math.round(pendingPosition.x)}, {Math.round(pendingPosition.y)}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter annotation text..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddText} disabled={!textInput.trim()}>
            Add Text
          </Button>
        </DialogActions>
      </Dialog>

      {/* Marker Dialog */}
      <Dialog open={markerDialogOpen} onClose={() => setMarkerDialogOpen(false)}>
        <DialogTitle>Add Blocking Marker</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
            {pendingPosition && (
              <Alert severity="info">
                Placement: {Math.round(pendingPosition.x)}, {Math.round(pendingPosition.y)}
              </Alert>
            )}
            <TextField
              label="Label"
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value.slice(0, 2))}
              placeholder="A, B, 1, 2..."
              inputProps={{ maxLength: 2 }}
            />
            <Typography variant="subtitle2">Marker Type</Typography>
            <Stack direction="row" spacing={1}>
              {(Object.keys(MARKER_COLORS) as Array<keyof typeof MARKER_COLORS>).map((type: keyof typeof MARKER_COLORS) => {
                const typeLabel = typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : 'Marker';
                return (
                  <Tooltip key={type as React.Key} title={typeLabel}>
                    <IconButton
                      onClick={() => setMarkerType(type)}
                      sx={{
                        bgcolor: MARKER_COLORS[type],
                        border: markerType === type ? 3 : 1,
                        borderColor: markerType === type ? '#fff' : 'transparent','&:hover': { bgcolor: MARKER_COLORS[type] }}}
                    >
                      <PersonPin sx={{ color: '#fff' }} />
                    </IconButton>
                  </Tooltip>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkerDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMarker}>
            Add Marker
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FrameEditorPanel;

