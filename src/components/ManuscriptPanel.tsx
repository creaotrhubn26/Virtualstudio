import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Stack,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  LinearProgress,
  Drawer,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Description as DescriptionIcon,
  Movie as MovieIcon,
  Theaters as SceneIcon,
  FormatListNumbered as FormatListNumberedIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
  AutoFixHigh as AutoFixHighIcon,
  MenuBook as MenuBookIcon,
  Timeline as TimelineIcon,
  DragIndicator as DragIcon,
  ViewModule as ViewModuleIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import { useToast } from './ToastStack';
import { Manuscript, SceneBreakdown, DialogueLine, ScriptRevision, Act, ManuscriptExport } from '../core/models/casting';
import { manuscriptService } from '../services/manuscriptService';
import { RichTextEditor } from './RichTextEditor';
import { ScriptDiffViewer } from './ScriptDiffViewer';
import { ShotDetailPanel } from './ShotDetailPanel';
import { TimelineView } from './TimelineView';
import { ProductionControlPanel } from './ProductionControlPanel';
import { DraggableSceneList } from './DraggableSceneList';
import { StoryboardIntegrationView } from './StoryboardIntegrationView';
import { ImportManuscriptDialog } from './ImportManuscriptDialog';

interface ManuscriptPanelProps {
  projectId: string;
  onManuscriptChange?: (manuscript: Manuscript) => void;
}

type ManuscriptTabValue = 'editor' | 'acts' | 'scenes' | 'characters' | 'dialogue' | 'breakdown' | 'revisions' | 'timeline' | 'production';

export const ManuscriptPanel: React.FC<ManuscriptPanelProps> = ({ projectId, onManuscriptChange }) => {
  const { showToast, showSuccess, showError, showWarning, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState<ManuscriptTabValue>('editor');
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [scenes, setScenes] = useState<SceneBreakdown[]>([]);
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);
  const [revisions, setRevisions] = useState<ScriptRevision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewManuscriptDialog, setShowNewManuscriptDialog] = useState(false);
  const [showSceneDialog, setShowSceneDialog] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneBreakdown | null>(null);
  const [autoBreakdownEnabled, setAutoBreakdownEnabled] = useState(true);
  
  // New production control states
  const [selectedScene, setSelectedScene] = useState<SceneBreakdown | null>(null);
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const [showProductionPanel, setShowProductionPanel] = useState(false);
  const [sceneViewMode, setSceneViewMode] = useState<'list' | 'drag' | 'storyboard'>('list');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // New manuscript form state
  const [newManuscript, setNewManuscript] = useState({
    title: '',
    subtitle: '',
    author: '',
    format: 'fountain' as 'fountain' | 'final-draft' | 'markdown',
  });

  // Load manuscripts on mount
  useEffect(() => {
    loadManuscripts();
  }, [projectId]);

  const loadManuscripts = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // const response = await manuscriptService.getManuscripts(projectId);
      // setManuscripts(response);
      
      // Placeholder for now
      setManuscripts([]);
      showInfo('Manuskripter lastet');
    } catch (error) {
      showError('Feil ved lasting av manuskripter');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScenes = async (manuscriptId: string) => {
    try {
      // TODO: Replace with actual API call
      // const response = await manuscriptService.getScenes(manuscriptId);
      // setScenes(response);
      setScenes([]);
    } catch (error) {
      showError('Feil ved lasting av scener');
      console.error(error);
    }
  };

  const loadActs = async (manuscriptId: string) => {
    try {
      const response = await manuscriptService.getActs(manuscriptId);
      setActs(response);
    } catch (error) {
      showError('Feil ved lasting av akter');
      console.error(error);
    }
  };

  const loadDialogue = async (manuscriptId: string) => {
    try {
      // TODO: Replace with actual API call
      // const response = await manuscriptService.getDialogue(manuscriptId);
      // setDialogueLines(response);
      setDialogueLines([]);
    } catch (error) {
      showError('Feil ved lasting av dialog');
      console.error(error);
    }
  };

  const loadRevisions = async (manuscriptId: string) => {
    try {
      // TODO: Replace with actual API call
      // const response = await manuscriptService.getRevisions(manuscriptId);
      // setRevisions(response);
      setRevisions([]);
    } catch (error) {
      showError('Feil ved lasting av revisjoner');
      console.error(error);
    }
  };

  const handleCreateManuscript = async () => {
    if (!newManuscript.title.trim()) {
      showWarning('Vennligst fyll inn tittel');
      return;
    }

    try {
      const manuscript: Manuscript = {
        id: `manuscript-${Date.now()}`,
        projectId,
        title: newManuscript.title,
        subtitle: newManuscript.subtitle,
        author: newManuscript.author,
        version: '1.0',
        format: newManuscript.format,
        content: '',
        pageCount: 0,
        wordCount: 0,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // TODO: Replace with actual API call
      // await manuscriptService.createManuscript(manuscript);
      
      setManuscripts([...manuscripts, manuscript]);
      setSelectedManuscript(manuscript);
      setShowNewManuscriptDialog(false);
      setNewManuscript({ title: '', subtitle: '', author: '', format: 'fountain' });
      showSuccess('Manuskript opprettet');
      
      if (onManuscriptChange) {
        onManuscriptChange(manuscript);
      }
    } catch (error) {
      showError('Feil ved opprettelse av manuskript');
      console.error(error);
    }
  };

  const handleSaveManuscript = async () => {
    if (!selectedManuscript) return;

    try {
      // TODO: Replace with actual API call
      // await manuscriptService.updateManuscript(selectedManuscript);
      
      showSuccess('Manuskript lagret');
      
      if (onManuscriptChange) {
        onManuscriptChange(selectedManuscript);
      }
    } catch (error) {
      showError('Feil ved lagring av manuskript');
      console.error(error);
    }
  };

  const handleAutoBreakdown = async () => {
    if (!selectedManuscript) return;

    setIsLoading(true);
    try {
      // Parse manuscript content and auto-generate scene breakdowns
      const content = selectedManuscript.content || '';
      const lines = content.split('\n');
      const autoScenes: SceneBreakdown[] = [];
      const autoDialogue: DialogueLine[] = [];
      
      let sceneNumber = 1;
      let currentScene: Partial<SceneBreakdown> | null = null;
      let currentCharacters: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Scene heading detection (INT. / EXT.)
        if (line.match(/^(INT\.|EXT\.)/i)) {
          // Save previous scene if exists
          if (currentScene) {
            autoScenes.push({
              ...currentScene,
              id: `scene-auto-${sceneNumber - 1}`,
              manuscriptId: selectedManuscript.id,
              sceneNumber: String(sceneNumber - 1),
              characters: currentCharacters,
              status: 'not-scheduled' as const,
            } as SceneBreakdown);
            currentCharacters = [];
          }

          // Parse new scene heading
          const parts = line.split('-').map(p => p.trim());
          const intExt = parts[0].startsWith('INT') ? 'INT' : 'EXT';
          const location = parts[0].replace(/^(INT\.|EXT\.)\s*/i, '');
          const timeRaw = parts[1] || 'DAY';
          const timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'CONTINUOUS' | 'LATER' | 'MORNING' | 'EVENING' = 
            ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER', 'MORNING', 'EVENING'].includes(timeRaw.toUpperCase()) 
              ? timeRaw.toUpperCase() as any 
              : 'DAY';

          currentScene = {
            sceneHeading: line,
            intExt,
            locationName: location,
            timeOfDay,
            estimatedDuration: 3,
          };
          sceneNumber++;
        }
        
        // Character name detection (ALL CAPS)
        else if (line === line.toUpperCase() && line.length > 0 && line.length < 30 && !line.match(/^(FADE|CUT)/)) {
          const characterName = line.replace(/\(.*\)/, '').trim();
          if (characterName && !currentCharacters.includes(characterName)) {
            currentCharacters.push(characterName);
          }
        }
        
        // Dialogue detection (after character name)
        else if (currentScene && line.length > 0 && i > 0) {
          const prevLine = lines[i - 1].trim();
          if (prevLine === prevLine.toUpperCase() && prevLine.length < 30) {
            const characterName = prevLine.replace(/\(.*\)/, '').trim();
            autoDialogue.push({
              id: `dialogue-auto-${autoDialogue.length + 1}`,
              sceneId: `scene-auto-${sceneNumber - 1}`,
              manuscriptId: selectedManuscript.id,
              characterName: characterName,
              dialogueText: line,
              dialogueType: 'dialogue' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Save last scene
      if (currentScene) {
        autoScenes.push({
          ...currentScene,
          id: `scene-auto-${sceneNumber - 1}`,
          manuscriptId: selectedManuscript.id,
          sceneNumber: String(sceneNumber - 1),
          characters: currentCharacters,
          status: 'not-scheduled' as const,
        } as SceneBreakdown);
      }

      // Extract unique characters (will be computed from dialogue)
      const uniqueCharacters = Array.from(new Set(currentCharacters));

      // Update state
      setScenes(autoScenes);
      setDialogueLines(autoDialogue);
      
      showSuccess(`Automatisk breakdown fullført: ${autoScenes.length} scener, ${uniqueCharacters.length} karakterer funnet`);
    } catch (error) {
      showError('Feil ved automatisk breakdown');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedManuscript) return;

    try {
      const exportData = await manuscriptService.exportManuscriptAsJSON(
        selectedManuscript,
        acts,
        scenes,
        characterList,
        dialogueLines,
        revisions
      );

      manuscriptService.downloadExportAsFile(
        exportData,
        `${selectedManuscript.title.replace(/\s+/g, '_')}_export.json`
      );

      showSuccess('Manuskript eksportert som JSON');
    } catch (error) {
      showError('Feil ved eksport');
      console.error(error);
    }
  };

  const handleImportComplete = async (exportData: ManuscriptExport) => {
    try {
      const restored = await manuscriptService.restoreFromExport(exportData);

      // Update state with imported data
      setSelectedManuscript(restored.manuscript);
      setActs(restored.acts);
      setScenes(restored.scenes);
      setDialogueLines(restored.dialogueLines);
      setRevisions(restored.revisions);

      // Add to manuscripts list
      setManuscripts([
        ...manuscripts.filter(m => m.id !== restored.manuscript.id),
        restored.manuscript,
      ]);

      showSuccess('Manuskript importert og klar for bruk');
    } catch (error) {
      showError('Feil ved import');
      console.error(error);
    }
  };

  const handleDeleteManuscript = async (manuscript: Manuscript) => {
    if (!confirm(`Er du sikker på at du vil slette "${manuscript.title}"?`)) return;

    try {
      // TODO: Replace with actual API call
      // await manuscriptService.deleteManuscript(manuscript.id);
      
      setManuscripts(manuscripts.filter(m => m.id !== manuscript.id));
      if (selectedManuscript?.id === manuscript.id) {
        setSelectedManuscript(null);
      }
      showSuccess('Manuskript slettet');
    } catch (error) {
      showError('Feil ved sletting av manuskript');
      console.error(error);
    }
  };

  const estimatedRuntime = useMemo(() => {
    if (!selectedManuscript) return 0;
    // Industry standard: 1 page ≈ 1 minute
    return selectedManuscript.pageCount;
  }, [selectedManuscript?.pageCount]);

  const characterList = useMemo(() => {
    // Extract unique characters from dialogue
    const characters = new Set<string>();
    dialogueLines.forEach(line => characters.add(line.characterName));
    return Array.from(characters).sort();
  }, [dialogueLines]);

  const sceneStats = useMemo(() => {
    const intScenes = scenes.filter(s => s.intExt === 'INT').length;
    const extScenes = scenes.filter(s => s.intExt === 'EXT').length;
    const dayScenes = scenes.filter(s => s.timeOfDay === 'DAY').length;
    const nightScenes = scenes.filter(s => s.timeOfDay === 'NIGHT').length;
    
    return { intScenes, extScenes, dayScenes, nightScenes, total: scenes.length };
  }, [scenes]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon />
            Manuskript & Script
          </Typography>
          
          <Stack direction="row" spacing={1}>
            {selectedManuscript && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<AutoFixHighIcon />}
                  onClick={handleAutoBreakdown}
                  disabled={isLoading}
                >
                  Auto Breakdown
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExport}
                  disabled={isLoading}
                  title="Eksporter hele manuskriptet med produksjondata som JSON"
                >
                  Eksporter
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveManuscript}
                  disabled={isLoading}
                >
                  Lagre
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => setShowImportDialog(true)}
              title="Importer manuskript fra tidligere eksport"
            >
              Importer
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewManuscriptDialog(true)}
            >
              Nytt Manuskript
            </Button>
          </Stack>
        </Stack>

        {/* Manuscript selector */}
        {manuscripts.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Velg Manuskript</InputLabel>
              <Select
                value={selectedManuscript?.id || ''}
                onChange={(e) => {
                  const manuscript = manuscripts.find(m => m.id === e.target.value);
                  setSelectedManuscript(manuscript || null);
                  if (manuscript) {
                    loadScenes(manuscript.id);
                    loadDialogue(manuscript.id);
                    loadRevisions(manuscript.id);
                  }
                }}
                label="Velg Manuskript"
              >
                {manuscripts.map(manuscript => (
                  <MenuItem key={manuscript.id} value={manuscript.id}>
                    {manuscript.title} - v{manuscript.version} ({manuscript.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Manuscript stats */}
        {selectedManuscript && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip icon={<DescriptionIcon />} label={`${selectedManuscript.pageCount} sider`} size="small" />
            <Chip icon={<ScheduleIcon />} label={`~${estimatedRuntime} min`} size="small" />
            <Chip icon={<SceneIcon />} label={`${sceneStats.total} scener`} size="small" />
            <Chip icon={<PersonIcon />} label={`${characterList.length} karakterer`} size="small" />
            <Chip 
              label={selectedManuscript.status.toUpperCase()} 
              size="small" 
              color={
                selectedManuscript.status === 'approved' ? 'success' : 
                selectedManuscript.status === 'shooting' ? 'primary' : 
                'default'
              }
            />
          </Box>
        )}
      </Box>

      {selectedManuscript ? (
        <>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Editor" value="editor" icon={<EditIcon />} iconPosition="start" />
            <Tab label="Akter" value="acts" icon={<MenuBookIcon />} iconPosition="start" />
            <Tab label="Scener" value="scenes" icon={<SceneIcon />} iconPosition="start" />
            <Tab label="Karakterer" value="characters" icon={<PersonIcon />} iconPosition="start" />
            <Tab label="Dialog" value="dialogue" icon={<ChatIcon />} iconPosition="start" />
            <Tab label="Breakdown" value="breakdown" icon={<AssessmentIcon />} iconPosition="start" />
            <Tab label="Revisjoner" value="revisions" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Timeline" value="timeline" icon={<TimelineIcon />} iconPosition="start" />
            <Tab label="Produksjon" value="production" icon={<ViewModuleIcon />} iconPosition="start" />
          </Tabs>

          {/* Tab content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <EditorTab
                manuscript={selectedManuscript}
                onContentChange={(content) => {
                  setSelectedManuscript({ ...selectedManuscript, content });
                }}
              />
            )}

            {/* Acts Tab */}
            {activeTab === 'acts' && (
              <ActsTab
                acts={acts}
                manuscriptId={selectedManuscript?.id || ''}
                onActsChange={setActs}
              />
            )}

            {/* Scenes Tab */}
            {activeTab === 'scenes' && (
              <ScenesTab
                scenes={scenes}
                viewMode={sceneViewMode}
                onViewModeChange={setSceneViewMode}
                onAddScene={() => {
                  setEditingScene(null);
                  setShowSceneDialog(true);
                }}
                onEditScene={(scene) => {
                  setEditingScene(scene);
                  setShowSceneDialog(true);
                }}
                onSelectScene={(scene) => {
                  setSelectedScene(scene);
                  setShowProductionPanel(true);
                }}
                onReorderScenes={setScenes}
                selectedScene={selectedScene || undefined}
              />
            )}

            {/* Characters Tab */}
            {activeTab === 'characters' && (
              <CharactersTab characters={characterList} dialogueLines={dialogueLines} />
            )}

            {/* Dialogue Tab */}
            {activeTab === 'dialogue' && (
              <DialogueTab dialogueLines={dialogueLines} scenes={scenes} />
            )}

            {/* Breakdown Tab */}
            {activeTab === 'breakdown' && (
              <BreakdownTab scenes={scenes} sceneStats={sceneStats} />
            )}

            {/* Revisions Tab */}
            {activeTab === 'revisions' && (
              <RevisionsTab revisions={revisions} manuscript={selectedManuscript} />
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <TimelineView
                scenes={scenes}
                onSceneSelect={(scene) => {
                  setSelectedScene(scene);
                  setShowProductionPanel(true);
                }}
                selectedScene={selectedScene || undefined}
              />
            )}

            {/* Production Tab */}
            {activeTab === 'production' && selectedScene && (
              <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
                <Box sx={{ flex: 1 }}>
                  <StoryboardIntegrationView
                    scene={selectedScene}
                    onUpdate={(updatedScene) => {
                      setScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s));
                      setSelectedScene(updatedScene);
                    }}
                  />
                </Box>
                <Box sx={{ width: 400 }}>
                  <ShotDetailPanel
                    scene={selectedScene}
                    onUpdate={(updatedScene) => {
                      setScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s));
                      setSelectedScene(updatedScene);
                    }}
                  />
                </Box>
              </Box>
            )}

            {activeTab === 'production' && !selectedScene && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body2" color="text.secondary">
                  Velg en scene fra Scener-tabben for å se produksjonsdetaljer
                </Typography>
              </Box>
            )}
          </Box>

          {/* Production Control Panel Drawer */}
          <Drawer
            anchor="right"
            open={showProductionPanel}
            onClose={() => setShowProductionPanel(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 400,
                p: 0,
              },
            }}
          >
            <ProductionControlPanel
              selectedScene={selectedScene || undefined}
              selectedShot={selectedShot || undefined}
              onClose={() => setShowProductionPanel(false)}
            />
          </Drawer>
        </>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <DescriptionIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary">
              Ingen manuskript valgt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Opprett et nytt manuskript for å komme i gang
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewManuscriptDialog(true)}
            >
              Opprett Manuskript
            </Button>
          </Stack>
        </Box>
      )}

      {/* New Manuscript Dialog */}
      <Dialog open={showNewManuscriptDialog} onClose={() => setShowNewManuscriptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nytt Manuskript</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tittel"
              fullWidth
              required
              value={newManuscript.title}
              onChange={(e) => setNewManuscript({ ...newManuscript, title: e.target.value })}
            />
            <TextField
              label="Undertittel"
              fullWidth
              value={newManuscript.subtitle}
              onChange={(e) => setNewManuscript({ ...newManuscript, subtitle: e.target.value })}
            />
            <TextField
              label="Forfatter"
              fullWidth
              value={newManuscript.author}
              onChange={(e) => setNewManuscript({ ...newManuscript, author: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={newManuscript.format}
                onChange={(e) => setNewManuscript({ ...newManuscript, format: e.target.value as any })}
                label="Format"
              >
                <MenuItem value="fountain">Fountain (anbefalt)</MenuItem>
                <MenuItem value="markdown">Markdown</MenuItem>
                <MenuItem value="final-draft">Final Draft</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewManuscriptDialog(false)}>Avbryt</Button>
          <Button onClick={handleCreateManuscript} variant="contained">Opprett</Button>
        </DialogActions>
      </Dialog>

      {/* Import Manuscript Dialog */}
      <ImportManuscriptDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </Box>
  );
};

// Sub-components for each tab
const EditorTab: React.FC<{ manuscript: Manuscript; onContentChange: (content: string) => void }> = ({
  manuscript,
  onContentChange,
}) => {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Skriv manuskriptet i {manuscript.format === 'fountain' ? 'Fountain' : manuscript.format} format.
          {manuscript.format === 'fountain' && ' Sceneoverskrifter starter med INT. eller EXT.'}
        </Typography>
      </Alert>
      <TextField
        fullWidth
        multiline
        rows={25}
        value={manuscript.content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={`Eksempel (Fountain format):

INT. APARTMENT - DAY

ANNA (30s, energisk) kommer inn med kaffekrus.

ANNA
Har du sett manuskriptet?

BJØRN (40s) ser opp fra datamaskinen.

BJØRN
(smilende)
Det ligger på bordet.

EXT. CITY STREET - NIGHT

Anna går raskt gjennom regnet.
`}
        sx={{
          fontFamily: 'Courier New, monospace',
          fontSize: '14px',
          '& .MuiInputBase-input': {
            lineHeight: 1.6,
          },
        }}
      />
    </Box>
  );
};

const ActsTab: React.FC<{
  acts: Act[];
  manuscriptId: string;
  onActsChange: (acts: Act[]) => void;
}> = ({ acts, manuscriptId, onActsChange }) => {
  const { showSuccess, showError } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAct, setEditingAct] = useState<Act | null>(null);
  const [formData, setFormData] = useState({
    actNumber: 1,
    title: '',
    description: '',
    pageStart: 1,
    pageEnd: 1,
    estimatedRuntime: 30,
    colorCode: '',
  });

  const handleCreate = () => {
    setEditingAct(null);
    setFormData({
      actNumber: acts.length + 1,
      title: '',
      description: '',
      pageStart: acts.length > 0 ? (acts[acts.length - 1].pageEnd || 0) + 1 : 1,
      pageEnd: 1,
      estimatedRuntime: 30,
      colorCode: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (act: Act) => {
    setEditingAct(act);
    setFormData({
      actNumber: act.actNumber,
      title: act.title || '',
      description: act.description || '',
      pageStart: act.pageStart || 1,
      pageEnd: act.pageEnd || 1,
      estimatedRuntime: act.estimatedRuntime || 30,
      colorCode: act.colorCode || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const act: Act = {
        id: editingAct?.id || `act-${Date.now()}`,
        manuscriptId,
        projectId: '', // Will be set by backend if needed
        actNumber: formData.actNumber,
        title: formData.title,
        description: formData.description,
        pageStart: formData.pageStart,
        pageEnd: formData.pageEnd,
        estimatedRuntime: formData.estimatedRuntime,
        colorCode: formData.colorCode,
        sortOrder: editingAct?.sortOrder || formData.actNumber,
        createdAt: editingAct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingAct) {
        await manuscriptService.updateAct(act);
        onActsChange(acts.map(a => a.id === act.id ? act : a));
        showSuccess('Akt oppdatert');
      } else {
        await manuscriptService.createAct(act);
        onActsChange([...acts, act]);
        showSuccess('Akt opprettet');
      }

      setShowDialog(false);
    } catch (error) {
      showError('Feil ved lagring av akt');
      console.error(error);
    }
  };

  const handleDelete = async (actId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne akten?')) return;

    try {
      await manuscriptService.deleteAct(actId, manuscriptId);
      onActsChange(acts.filter(a => a.id !== actId));
      showSuccess('Akt slettet');
    } catch (error) {
      showError('Feil ved sletting av akt');
      console.error(error);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Akter / Kapitler</Typography>
        <Button startIcon={<AddIcon />} variant="outlined" onClick={handleCreate}>
          Legg til Akt
        </Button>
      </Stack>

      {acts.length === 0 ? (
        <Alert severity="info">
          Ingen akter ennå. Opprett akter for å strukturere manuskriptet i kapitler eller akter.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Akt #</TableCell>
                <TableCell>Tittel</TableCell>
                <TableCell>Beskrivelse</TableCell>
                <TableCell>Sider</TableCell>
                <TableCell>Varighet</TableCell>
                <TableCell>Handlinger</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {acts.map((act) => (
                <TableRow key={act.id}>
                  <TableCell>{act.actNumber}</TableCell>
                  <TableCell>{act.title}</TableCell>
                  <TableCell>{act.description || '-'}</TableCell>
                  <TableCell>
                    {act.pageStart && act.pageEnd ? `${act.pageStart}-${act.pageEnd}` : '-'}
                  </TableCell>
                  <TableCell>{act.estimatedRuntime ? `${act.estimatedRuntime} min` : '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(act)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(act.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAct ? 'Rediger Akt' : 'Ny Akt'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Akt Nummer"
              type="number"
              value={formData.actNumber}
              onChange={(e) => setFormData({ ...formData, actNumber: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Tittel"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Beskrivelse"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Side"
                type="number"
                value={formData.pageStart}
                onChange={(e) => setFormData({ ...formData, pageStart: parseInt(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Slutt Side"
                type="number"
                value={formData.pageEnd}
                onChange={(e) => setFormData({ ...formData, pageEnd: parseInt(e.target.value) })}
                fullWidth
              />
            </Stack>
            <TextField
              label="Estimert Varighet (minutter)"
              type="number"
              value={formData.estimatedRuntime}
              onChange={(e) => setFormData({ ...formData, estimatedRuntime: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Fargekode (hex)"
              value={formData.colorCode}
              onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
              placeholder="#FF5733"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Avbryt</Button>
          <Button onClick={handleSave} variant="contained">
            {editingAct ? 'Oppdater' : 'Opprett'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ScenesTab: React.FC<{
  scenes: SceneBreakdown[];
  viewMode: 'list' | 'drag' | 'storyboard';
  onViewModeChange: (mode: 'list' | 'drag' | 'storyboard') => void;
  onAddScene: () => void;
  onEditScene: (scene: SceneBreakdown) => void;
  onSelectScene: (scene: SceneBreakdown) => void;
  onReorderScenes: (scenes: SceneBreakdown[]) => void;
  selectedScene?: SceneBreakdown;
}> = ({ scenes, viewMode, onViewModeChange, onAddScene, onEditScene, onSelectScene, onReorderScenes, selectedScene }) => {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Scene Breakdown</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button startIcon={<AddIcon />} variant="outlined" onClick={onAddScene}>
            Legg til Scene
          </Button>
          <Divider orientation="vertical" flexItem />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, mode) => mode && onViewModeChange(mode)}
            size="small"
          >
            <ToggleButton value="list">
              <FormatListNumberedIcon />
            </ToggleButton>
            <ToggleButton value="drag">
              <DragIcon />
            </ToggleButton>
            <ToggleButton value="storyboard">
              <ViewModuleIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {scenes.length === 0 ? (
        <Alert severity="info">
          Ingen scener ennå. Bruk "Auto Breakdown" for å generere scener fra manuskriptet.
        </Alert>
      ) : viewMode === 'drag' ? (
        <DraggableSceneList
          scenes={scenes}
          onReorder={onReorderScenes}
          onSceneSelect={onSelectScene}
          selectedScene={selectedScene}
        />
      ) : viewMode === 'storyboard' && selectedScene ? (
        <StoryboardIntegrationView
          scene={selectedScene}
          onUpdate={(updatedScene) => {
            onReorderScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s));
          }}
        />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Scene #</TableCell>
                <TableCell>Heading</TableCell>
                <TableCell>INT/EXT</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Pages</TableCell>
                <TableCell>Characters</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scenes.map((scene) => (
                <TableRow
                  key={scene.id}
                  hover
                  selected={selectedScene?.id === scene.id}
                  onClick={() => onSelectScene(scene)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{scene.sceneNumber}</TableCell>
                  <TableCell>{scene.sceneHeading}</TableCell>
                  <TableCell>{scene.intExt}</TableCell>
                  <TableCell>{scene.timeOfDay}</TableCell>
                  <TableCell>{scene.pageLength?.toFixed(2) || '-'}</TableCell>
                  <TableCell>{scene.characters.length}</TableCell>
                  <TableCell>
                    <Chip
                      label={scene.status}
                      size="small"
                      color={scene.status === 'completed' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => onEditScene(scene)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

const CharactersTab: React.FC<{ characters: string[]; dialogueLines: DialogueLine[] }> = ({
  characters,
  dialogueLines,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Karakterer ({characters.length})
      </Typography>

      {characters.length === 0 ? (
        <Alert severity="info">Ingen karakterer funnet i dialogen ennå.</Alert>
      ) : (
        <Grid container spacing={2}>
          {characters.map((character) => {
            const lines = dialogueLines.filter((l) => l.characterName === character);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={character}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{character}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lines.length} replikker
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

const DialogueTab: React.FC<{ dialogueLines: DialogueLine[]; scenes: SceneBreakdown[] }> = ({
  dialogueLines,
  scenes,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        All Dialog
      </Typography>

      {dialogueLines.length === 0 ? (
        <Alert severity="info">Ingen dialog funnet ennå.</Alert>
      ) : (
        <List>
          {dialogueLines.map((line, index) => {
            const scene = scenes.find((s) => s.id === line.sceneId);
            return (
              <React.Fragment key={line.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2">{line.characterName}</Typography>
                        {line.parenthetical && (
                          <Typography variant="caption" color="text.secondary">
                            {line.parenthetical}
                          </Typography>
                        )}
                      </Stack>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          {line.dialogueText}
                        </Typography>
                        {scene && (
                          <Typography variant="caption" color="text.secondary">
                            Scene {scene.sceneNumber}: {scene.sceneHeading}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Box>
  );
};

const BreakdownTab: React.FC<{ scenes: SceneBreakdown[]; sceneStats: any }> = ({ scenes, sceneStats }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Production Breakdown
      </Typography>

      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{sceneStats.total}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total Scenes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{sceneStats.intScenes}</Typography>
              <Typography variant="body2" color="text.secondary">
                INT Scenes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">{sceneStats.extScenes}</Typography>
              <Typography variant="body2" color="text.secondary">
                EXT Scenes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4">
                {sceneStats.dayScenes}/{sceneStats.nightScenes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Day/Night
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Breakdown details */}
      {scenes.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Scene</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Characters</TableCell>
                <TableCell>Props</TableCell>
                <TableCell>Special Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scenes.map((scene) => (
                <TableRow key={scene.id}>
                  <TableCell>{scene.sceneNumber}</TableCell>
                  <TableCell>{scene.locationName}</TableCell>
                  <TableCell>{scene.characters.length}</TableCell>
                  <TableCell>{scene.propsNeeded?.length || 0}</TableCell>
                  <TableCell>
                    {scene.specialEffects && <Chip label="VFX" size="small" sx={{ mr: 0.5 }} />}
                    {scene.stuntsNotes && <Chip label="Stunts" size="small" sx={{ mr: 0.5 }} />}
                    {scene.vehicles && scene.vehicles.length > 0 && <Chip label="Vehicles" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

const RevisionsTab: React.FC<{ revisions: ScriptRevision[]; manuscript: Manuscript }> = ({
  revisions,
  manuscript,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Script Revisjoner & Diff Viewer</Typography>
        <Typography variant="body2" color="text.secondary">
          Gjeldende versjon: {manuscript.version}
        </Typography>
      </Stack>

      {revisions.length === 0 ? (
        <Alert severity="info">Ingen revisjoner ennå. Opprett en revisjon for å sammenligne endringer.</Alert>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ScriptDiffViewer revisions={revisions} currentContent={manuscript.content} />
        </Box>
      )}
    </Box>
  );
};

export default ManuscriptPanel;
