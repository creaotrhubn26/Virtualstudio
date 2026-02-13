/**
 * Export Panel
 * UI for scene export with format selection, presets, and progress tracking
 */

import { useState, useEffect, type FC, type ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Collapse,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  Tab,
  Tabs,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Save as SaveIcon,
  Image as ImageIcon,
  ViewInAr as ModelIcon,
  Movie as AnimationIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Web as WebIcon,
  SportsEsports as GameIcon,
  ThreeDRotation as PrintIcon,
  Apartment as ArchIcon,
  PhoneIphone as AppleIcon,
  MovieFilter as PixarIcon,
  Layers as CompositingIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { 
  useExportStore, 
  EXPORT_PRESETS, 
  ExportFormat,
  FORMAT_EXTENSIONS 
} from '../services/exportService';
import * as BABYLON from '@babylonjs/core';

interface ExportPanelProps {
  scene?: BABYLON.Scene | null;
}

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export const ExportPanel: FC<ExportPanelProps> = ({ scene }) => {
  const {
    settings,
    activePreset,
    currentJob,
    exportHistory,
    isExporting,
    initialize,
    updateSettings,
    applyPreset,
    exportScene,
    exportSelected,
    exportScreenshot,
    downloadBlob,
    estimateFileSize,
    clearHistory
  } = useExportStore();
  
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [exportName, setExportName] = useState('scene');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('glb');
  const [showSettings, setShowSettings] = useState(false);
  
  // Initialize when scene available
  useEffect(() => {
    if (scene) {
      initialize(scene);
    }
  }, [scene]);
  
  const handleExport = async () => {
    const blob = await exportScene(exportName, selectedFormat);
    if (blob) {
      const filename = `${exportName}${FORMAT_EXTENSIONS[selectedFormat]}`;
      downloadBlob(blob, filename);
    }
  };
  
  const handleExportSelected = async () => {
    const blob = await exportSelected(exportName, selectedFormat);
    if (blob) {
      const filename = `${exportName}-selected${FORMAT_EXTENSIONS[selectedFormat]}`;
      downloadBlob(blob, filename);
    }
  };
  
  const handleScreenshot = async () => {
    const blob = await exportScreenshot();
    if (blob) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      downloadBlob(blob, `screenshot-${timestamp}.png`);
    }
  };
  
  const presetIcons: Record<string, ReactNode> = {
    'web-ready': <WebIcon />,
    'unreal-engine': <GameIcon />,
    'unity': <GameIcon />,
    'pixar-usd': <PixarIcon />,
    'apple-ar': <AppleIcon />,
    'archviz': <ArchIcon />,
    '3d-print': <PrintIcon />,
    'compositing': <CompositingIcon />
  };
  
  const formatGroups = {
    '3D Models': ['glb', 'gltf', 'obj', 'stl', 'babylon'] as ExportFormat[],
    'USD Formats': ['usda', 'usdz'] as ExportFormat[],
    'Images': ['screenshot-png', 'screenshot-exr'] as ExportFormat[]
  };
  
  const formatSize = estimateFileSize(selectedFormat);
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 100,
        right: 16,
        width: 360,
        maxHeight: 'calc(100vh - 200px)',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 10001
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'warning.dark',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon />
          <Typography variant="subtitle1" fontWeight="bold">
            Export
          </Typography>
          {isExporting && (
            <Chip
              size="small"
              label="Exporting..."
              color="warning"
              sx={{ height: 20 }}
            />
          )}
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ maxHeight: 'calc(60vh - 60px)', overflow: 'auto' }}>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<SaveIcon />} label="Export" />
            <Tab icon={<ImageIcon />} label="Screenshot" />
            <Tab icon={<HistoryIcon />} label="History" />
          </Tabs>
          
          {/* Export Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 2 }}>
              {/* Export Name */}
              <TextField
                fullWidth
                size="small"
                label="Export Name"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              {/* Format Selection */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                  label="Format"
                >
                  {Object.entries(formatGroups).map(([group, formats]) => [
                    <MenuItem key={group} disabled sx={{ fontWeight: 'bold', opacity: 0.7 }}>
                      {group}
                    </MenuItem>,
                    ...formats.map(format => (
                      <MenuItem key={format} value={format} sx={{ pl: 3 }}>
                        {format.toUpperCase()} ({FORMAT_EXTENSIONS[format]})
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>
              
              {/* Estimated Size */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Estimated size: ~{(formatSize / 1024 / 1024).toFixed(2)} MB
              </Typography>
              
              {/* Quick Presets */}
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                Quick Presets
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                {Object.entries(EXPORT_PRESETS).slice(0, 4).map(([key, preset]) => (
                  <Tooltip key={key} title={preset.description}>
                    <Chip
                      icon={presetIcons[key] as any}
                      label={preset.name}
                      size="small"
                      onClick={() => {
                        applyPreset(key);
                        setSelectedFormat(preset.format);
                      }}
                      color={activePreset === key ? 'primary' : 'default'}
                      variant={activePreset === key ? 'filled' : 'outlined'}
                    />
                  </Tooltip>
                ))}
              </Box>
              
              {/* More Presets */}
              <Collapse in={showSettings}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                  {Object.entries(EXPORT_PRESETS).slice(4).map(([key, preset]) => (
                    <Tooltip key={key} title={preset.description}>
                      <Chip
                        icon={presetIcons[key] as any}
                        label={preset.name}
                        size="small"
                        onClick={() => {
                          applyPreset(key);
                          setSelectedFormat(preset.format);
                        }}
                        color={activePreset === key ? 'primary' : 'default'}
                        variant={activePreset === key ? 'filled' : 'outlined'}
                      />
                    </Tooltip>
                  ))}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Export Options */}
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Options
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.exportMaterials}
                      onChange={(e) => updateSettings({ exportMaterials: e.target.checked })}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Include Materials</Typography>}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.exportTextures}
                      onChange={(e) => updateSettings({ exportTextures: e.target.checked })}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Include Textures</Typography>}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.embedTextures}
                      onChange={(e) => updateSettings({ embedTextures: e.target.checked })}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Embed Textures</Typography>}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.exportAnimations}
                      onChange={(e) => updateSettings({ exportAnimations: e.target.checked })}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Include Animations</Typography>}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.includeHidden}
                      onChange={(e) => updateSettings({ includeHidden: e.target.checked })}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Include Hidden Objects</Typography>}
                />
                
                {/* Scale */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Scale: {settings.scale}x
                  </Typography>
                  <Slider
                    value={settings.scale}
                    onChange={(_, v) => updateSettings({ scale: v as number })}
                    min={0.01}
                    max={100}
                    step={0.01}
                    size="small"
                  />
                </Box>
              </Collapse>
              
              <Button
                size="small"
                onClick={() => setShowSettings(!showSettings)}
                sx={{ mb: 2 }}
              >
                {showSettings ? 'Less Options' : 'More Options'}
              </Button>
              
              {/* Export Progress */}
              {currentJob && currentJob.status === 'processing' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Exporting {currentJob.name}...
                  </Typography>
                  <LinearProgress variant="indeterminate" sx={{ mt: 0.5 }} />
                </Box>
              )}
              
              {currentJob && currentJob.status === 'completed' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Export completed! ({(currentJob.outputSize || 0 / 1024 / 1024).toFixed(2)} MB)
                </Alert>
              )}
              
              {currentJob && currentJob.status === 'failed' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Export failed: {currentJob.error}
                </Alert>
              )}
              
              {/* Export Buttons */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <Box>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    Export All
                  </Button>
                </Box>
                <Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ModelIcon />}
                    onClick={handleExportSelected}
                    disabled={isExporting}
                  >
                    Selected
                  </Button>
                </Box>
              </Box>
            </Box>
          </TabPanel>
          
          {/* Screenshot Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Capture high-quality screenshots of your scene
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                <Box>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Width"
                    value={settings.imageWidth}
                    onChange={(e) => updateSettings({ imageWidth: parseInt(e.target.value) })}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Height"
                    value={settings.imageHeight}
                    onChange={(e) => updateSettings({ imageHeight: parseInt(e.target.value) })}
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label="HD (1920x1080)"
                  size="small"
                  onClick={() => updateSettings({ imageWidth: 1920, imageHeight: 1080 })}
                />
                <Chip
                  label="4K (3840x2160)"
                  size="small"
                  onClick={() => updateSettings({ imageWidth: 3840, imageHeight: 2160 })}
                />
                <Chip
                  label="8K"
                  size="small"
                  onClick={() => updateSettings({ imageWidth: 7680, imageHeight: 4320 })}
                />
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.imageTransparent}
                    onChange={(e) => updateSettings({ imageTransparent: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Transparent Background</Typography>}
              />
              
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<ImageIcon />}
                onClick={handleScreenshot}
                disabled={isExporting}
                sx={{ mt: 2 }}
              >
                Capture Screenshot
              </Button>
            </Box>
          </TabPanel>
          
          {/* History Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 1 }}>
              {exportHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No export history yet
                </Typography>
              ) : (
                <>
                  <List dense>
                    {exportHistory.slice(0, 10).map((item) => (
                      <ListItem key={item.id}>
                        <ListItemIcon>
                          <SuccessIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${item.name}${FORMAT_EXTENSIONS[item.format]}`}
                          secondary={`${(item.fileSize / 1024).toFixed(1)} KB • ${new Date(item.timestamp).toLocaleTimeString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    fullWidth
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={clearHistory}
                    color="error"
                  >
                    Clear History
                  </Button>
                </>
              )}
            </Box>
          </TabPanel>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ExportPanel;
