/**
 * Spell Check Panel
 * 
 * A panel for reviewing and managing spelling errors in screenplay documents.
 * Supports Norwegian and English with screenplay-specific term recognition.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Stack,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  Collapse,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Spellcheck as SpellcheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  MoreVert as MoreVertIcon,
  AutoFixHigh as AutoFixIcon,
  MenuBook as DictionaryIcon,
  Person as PersonIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import {
  spellCheckService,
  SpellingError,
  SpellCheckResult,
  DictionaryWord,
} from '../../services/spellCheckService';

interface SpellCheckPanelProps {
  content: string;
  onGoToLine?: (lineNumber: number, column?: number) => void;
  onReplaceWord?: (lineNumber: number, columnStart: number, columnEnd: number, newWord: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const SpellCheckPanel: React.FC<SpellCheckPanelProps> = ({
  content,
  onGoToLine,
  onReplaceWord,
  isOpen = true,
  onClose,
}) => {
  const [result, setResult] = useState<SpellCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<SpellingError | null>(null);
  const [customWord, setCustomWord] = useState('');
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictionary, setDictionary] = useState<DictionaryWord[]>([]);
  const [stats, setStats] = useState(spellCheckService.getStats());
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Run spell check
  const runSpellCheck = useCallback(async () => {
    setLoading(true);
    try {
      const checkResult = await spellCheckService.checkDocument(content);
      setResult(checkResult);
      setStats(spellCheckService.getStats());
    } catch (e) {
      console.error('Spell check failed:', e);
    } finally {
      setLoading(false);
    }
  }, [content]);

  // Load dictionary
  const loadDictionary = useCallback(() => {
    setDictionary(spellCheckService.getCustomDictionary());
    setStats(spellCheckService.getStats());
  }, []);

  // Initial spell check
  useEffect(() => {
    if (isOpen && content) {
      runSpellCheck();
    }
  }, [isOpen, content, runSpellCheck]);

  // Load dictionary when showing
  useEffect(() => {
    if (showDictionary) {
      loadDictionary();
    }
  }, [showDictionary, loadDictionary]);

  // Handle clicking on an error
  const handleErrorClick = (error: SpellingError) => {
    setSelectedError(error);
    if (onGoToLine) {
      onGoToLine(error.lineNumber, error.columnStart);
    }
  };

  // Handle ignoring a word (add to dictionary)
  const handleIgnoreWord = (word: string, source: 'user' | 'character' | 'location' = 'user') => {
    spellCheckService.addToDictionary(word, 'both', source);
    // Remove this word from results
    if (result) {
      setResult({
        ...result,
        errors: result.errors.filter((e: SpellingError) => e.word.toLowerCase() !== word.toLowerCase()),
        ignoredWords: result.ignoredWords + 1,
        customDictionaryHits: result.customDictionaryHits + 1,
      });
    }
    loadDictionary();
  };

  // Handle replacing a word
  const handleReplaceWord = (error: SpellingError, newWord: string) => {
    if (onReplaceWord) {
      onReplaceWord(error.lineNumber, error.columnStart, error.columnEnd, newWord);
      // Remove from results
      if (result) {
        setResult({
          ...result,
          errors: result.errors.filter((e: SpellingError) => e !== error),
        });
      }
    }
  };

  // Handle removing word from dictionary
  const handleRemoveFromDictionary = (word: string) => {
    spellCheckService.removeFromDictionary(word);
    loadDictionary();
  };

  // Handle adding custom word
  const handleAddCustomWord = () => {
    if (customWord.trim()) {
      spellCheckService.addToDictionary(customWord.trim());
      setCustomWord('');
      loadDictionary();
    }
  };

  // Handle export
  const handleExport = () => {
    const json = spellCheckService.exportDictionary();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenplay-dictionary.json';
    a.click();
    URL.revokeObjectURL(url);
    setMenuAnchor(null);
  };

  // Handle import
  const handleImport = () => {
    if (importText.trim()) {
      const result = spellCheckService.importDictionary(importText);
      alert(`Imported ${result.imported} words, skipped ${result.skipped} duplicates`);
      setImportDialogOpen(false);
      setImportText('');
      loadDictionary();
    }
  };

  // Get error type color
  const getErrorTypeColor = (type: SpellingError['type']) => {
    switch (type) {
      case 'spelling': return 'error';
      case 'case': return 'warning';
      case 'unknown': return 'info';
      default: return 'default';
    }
  };

  // Get source icon
  const getSourceIcon = (source: DictionaryWord['source']) => {
    switch (source) {
      case 'character': return <PersonIcon fontSize="small" />;
      case 'location': return <PlaceIcon fontSize="small" />;
      case 'screenplay': return <AutoFixIcon fontSize="small" />;
      default: return <DictionaryIcon fontSize="small" />;
    }
  };

  if (!isOpen) return null;

  return (
    <Paper
      sx={{
        position: 'absolute',
        right: 16,
        top: 16,
        bottom: 16,
        width: 360,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1000,
      }}
      elevation={4}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <SpellcheckIcon />
        <Typography variant="h6" sx={{ flex: 1 }}>
          Stavekontroll
        </Typography>
        <Tooltip title="Oppdater">
          <IconButton
            size="small"
            onClick={runSpellCheck}
            disabled={loading}
            sx={{ color: 'inherit' }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Mer">
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ color: 'inherit' }}
          >
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleExport}>
          <DownloadIcon sx={{ mr: 1 }} /> Eksporter ordbok
        </MenuItem>
        <MenuItem onClick={() => { setImportDialogOpen(true); setMenuAnchor(null); }}>
          <UploadIcon sx={{ mr: 1 }} /> Importer ordbok
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setShowDictionary(!showDictionary); setMenuAnchor(null); }}>
          <DictionaryIcon sx={{ mr: 1 }} /> {showDictionary ? 'Skjul' : 'Vis'} ordbok
        </MenuItem>
      </Menu>

      {/* Stats */}
      {result && (
        <Box sx={{ p: 2, bgcolor: 'grey.100' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={`${result.errors.length} feil`}
              color={result.errors.length > 0 ? 'error' : 'success'}
            />
            <Chip size="small" label={`${result.totalWords} ord`} variant="outlined" />
            <Chip size="small" label={`${result.ignoredWords} ignorert`} variant="outlined" />
            <Chip size="small" label={`${stats.customWords} i ordbok`} variant="outlined" />
          </Stack>
        </Box>
      )}

      {/* Dictionary Section */}
      <Collapse in={showDictionary}>
        <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Egen ordbok ({dictionary.length} ord)
          </Typography>
          
          {/* Add word */}
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              placeholder="Legg til ord..."
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomWord()}
              sx={{ flex: 1 }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleAddCustomWord}
              disabled={!customWord.trim()}
            >
              <AddIcon />
            </Button>
          </Stack>
          
          {/* Dictionary list */}
          <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
            {dictionary.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Ingen egne ord lagt til ennå
              </Typography>
            ) : (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {dictionary.slice(0, 20).map((word) => (
                  <Chip
                    key={word.word}
                    label={word.word}
                    size="small"
                    icon={getSourceIcon(word.source)}
                    onDelete={() => handleRemoveFromDictionary(word.word)}
                    variant="outlined"
                  />
                ))}
                {dictionary.length > 20 && (
                  <Chip
                    label={`+${dictionary.length - 20} flere`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Collapse>

      {/* Errors List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : result?.errors.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main">
              Ingen stavefeil funnet!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dokumentet ser bra ut.
            </Typography>
          </Box>
        ) : (
          <List dense>
            {result?.errors.map((error: SpellingError, index: number) => (
              <React.Fragment key={`${error.lineNumber}-${error.columnStart}-${index}`}>
                <ListItemButton
                  selected={selectedError === error}
                  onClick={() => handleErrorClick(error)}
                  sx={{
                    borderLeft: 4,
                    borderColor: `${getErrorTypeColor(error.type)}.main`,
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          component="span"
                          sx={{
                            textDecoration: 'underline wavy',
                            textDecorationColor: 'error.main',
                            fontWeight: 'bold',
                          }}
                        >
                          {error.word}
                        </Typography>
                        <Chip
                          size="small"
                          label={`Linje ${error.lineNumber}`}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                        <Box component="span" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 }}>
                          {error.context}
                        </Box>
                      </Typography>
                    }
                  />
                </ListItemButton>
                
                {/* Suggestions and actions when selected */}
                <Collapse in={selectedError === error}>
                  <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
                    {error.suggestions.length > 0 && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          Forslag:
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, mb: 1 }} flexWrap="wrap" useFlexGap>
                          {error.suggestions.map((suggestion: string) => (
                            <Chip
                              key={suggestion}
                              label={suggestion}
                              size="small"
                              color="primary"
                              variant="outlined"
                              onClick={() => handleReplaceWord(error, suggestion)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Stack>
                      </>
                    )}
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleIgnoreWord(error.word)}
                      >
                        Legg til i ordbok
                      </Button>
                      <Button
                        size="small"
                        startIcon={<PersonIcon />}
                        onClick={() => handleIgnoreWord(error.word, 'character')}
                      >
                        Karakternavn
                      </Button>
                    </Stack>
                  </Box>
                </Collapse>
                
                {index < (result?.errors.length || 0) - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importer ordbok</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lim inn JSON fra en eksportert ordbok:
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder='{"customWords": [...], "projectTerms": [...]}'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Avbryt</Button>
          <Button onClick={handleImport} variant="contained" disabled={!importText.trim()}>
            Importer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SpellCheckPanel;
