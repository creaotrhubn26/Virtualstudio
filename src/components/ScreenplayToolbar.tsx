import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  Movie as SceneIcon,
  Person as CharacterIcon,
  Chat as DialogueIcon,
  Notes as ActionIcon,
  ArrowForward as TransitionIcon,
  CenterFocusStrong as CenterIcon,
  Code as CodeIcon,
  Visibility as PreviewIcon,
  VisibilityOff as EditIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Numbers as PageIcon,
  Title as TitleIcon,
  FormatAlignCenter,
  TextFields,
  Settings as SettingsIcon,
  Search as SearchIcon,
  FindReplace as ReplaceIcon,
  Spellcheck as SpellcheckIcon,
  Speed as StatsIcon,
} from '@mui/icons-material';

type FountainElement = 
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'centered'
  | 'section'
  | 'page_break'
  | 'note';

interface ScreenplayToolbarProps {
  onInsertElement: (type: FountainElement) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleUnderline?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onTogglePreview?: () => void;
  onSearch?: () => void;
  onReplace?: () => void;
  onSpellcheck?: () => void;
  onStats?: () => void;
  isPreviewMode?: boolean;
  currentElement?: FountainElement | null;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  sceneCount?: number;
  cursorPosition?: { line: number; column: number };
  compact?: boolean;
}

export const ScreenplayToolbar: React.FC<ScreenplayToolbarProps> = ({
  onInsertElement,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onExport,
  onImport,
  onTogglePreview,
  onSearch,
  onReplace,
  onSpellcheck,
  onStats,
  isPreviewMode = false,
  currentElement,
  pageCount = 0,
  wordCount = 0,
  characterCount = 0,
  sceneCount = 0,
  cursorPosition,
  compact = false,
}) => {
  const [insertAnchor, setInsertAnchor] = React.useState<HTMLElement | null>(null);
  const [toolsAnchor, setToolsAnchor] = React.useState<HTMLElement | null>(null);

  const buttonStyle = {
    color: 'rgba(255,255,255,0.87)',
    '&:hover': { color: '#a78bfa', bgcolor: 'rgba(255,255,255,0.08)' },
    '&.Mui-disabled': { color: 'rgba(255,255,255,0.6)' },
  };

  const activeButtonStyle = {
    ...buttonStyle,
    color: '#a78bfa',
    bgcolor: 'rgba(167, 139, 250, 0.15)',
  };

  const elementLabels: Record<FountainElement, string> = {
    scene_heading: 'Scene Heading',
    action: 'Action',
    character: 'Character',
    dialogue: 'Dialogue',
    parenthetical: 'Parenthetical',
    transition: 'Transition',
    centered: 'Centered',
    section: 'Section',
    page_break: 'Page Break',
    note: 'Note',
  };

  const elementColors: Record<FountainElement, string> = {
    scene_heading: '#fbbf24',
    action: '#e5e5e5',
    character: '#60a5fa',
    dialogue: '#f5f5f5',
    parenthetical: '#a78bfa',
    transition: '#f472b6',
    centered: '#34d399',
    section: '#f97316',
    page_break: '#4b5563',
    note: '#9ca3af',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 0.5 : 1,
        p: compact ? 1 : 1.5,
        bgcolor: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexWrap: 'wrap',
      }}
    >
      {/* Insert Elements */}
      <Tooltip title="Sett inn element">
        <IconButton 
          size="small" 
          onClick={(e) => setInsertAnchor(e.currentTarget)}
          sx={{ ...buttonStyle, color: '#a78bfa' }}
        >
          <TextFields />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={insertAnchor}
        open={Boolean(insertAnchor)}
        onClose={() => setInsertAnchor(null)}
      >
        <MenuItem onClick={() => { onInsertElement('scene_heading'); setInsertAnchor(null); }}>
          <ListItemIcon><SceneIcon sx={{ color: '#fbbf24' }} /></ListItemIcon>
          <ListItemText primary="Scene Heading" secondary="INT./EXT. LOCATION - TIME" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('character'); setInsertAnchor(null); }}>
          <ListItemIcon><CharacterIcon sx={{ color: '#60a5fa' }} /></ListItemIcon>
          <ListItemText primary="Character" secondary="CHARACTER NAME" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('dialogue'); setInsertAnchor(null); }}>
          <ListItemIcon><DialogueIcon /></ListItemIcon>
          <ListItemText primary="Dialogue" secondary="Character's lines" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('parenthetical'); setInsertAnchor(null); }}>
          <ListItemIcon><FormatAlignCenter sx={{ color: '#a78bfa' }} /></ListItemIcon>
          <ListItemText primary="Parenthetical" secondary="(beat), (whispering)" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('action'); setInsertAnchor(null); }}>
          <ListItemIcon><ActionIcon /></ListItemIcon>
          <ListItemText primary="Action" secondary="Scene description" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('transition'); setInsertAnchor(null); }}>
          <ListItemIcon><TransitionIcon sx={{ color: '#f472b6' }} /></ListItemIcon>
          <ListItemText primary="Transition" secondary="CUT TO:, FADE OUT" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { onInsertElement('section'); setInsertAnchor(null); }}>
          <ListItemIcon><TitleIcon sx={{ color: '#f97316' }} /></ListItemIcon>
          <ListItemText primary="Section" secondary="# ACT ONE" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('centered'); setInsertAnchor(null); }}>
          <ListItemIcon><CenterIcon sx={{ color: '#34d399' }} /></ListItemIcon>
          <ListItemText primary="Centered" secondary=">TEXT<" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('page_break'); setInsertAnchor(null); }}>
          <ListItemIcon><PageIcon /></ListItemIcon>
          <ListItemText primary="Page Break" secondary="===" />
        </MenuItem>
        <MenuItem onClick={() => { onInsertElement('note'); setInsertAnchor(null); }}>
          <ListItemIcon><CodeIcon /></ListItemIcon>
          <ListItemText primary="Note" secondary="[[Note text]]" />
        </MenuItem>
      </Menu>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Quick Insert Buttons */}
      {!compact && (
        <>
          <Tooltip title="Scene Heading">
            <IconButton size="small" onClick={() => onInsertElement('scene_heading')} sx={buttonStyle}>
              <SceneIcon sx={{ color: '#fbbf24' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Character">
            <IconButton size="small" onClick={() => onInsertElement('character')} sx={buttonStyle}>
              <CharacterIcon sx={{ color: '#60a5fa' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dialogue">
            <IconButton size="small" onClick={() => onInsertElement('dialogue')} sx={buttonStyle}>
              <DialogueIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Parenthetical">
            <IconButton size="small" onClick={() => onInsertElement('parenthetical')} sx={buttonStyle}>
              <FormatAlignCenter sx={{ color: '#a78bfa' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Transition">
            <IconButton size="small" onClick={() => onInsertElement('transition')} sx={buttonStyle}>
              <TransitionIcon sx={{ color: '#f472b6' }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        </>
      )}

      {/* Text Formatting */}
      {onToggleBold && (
        <Tooltip title="Fet (**tekst**)">
          <IconButton size="small" onClick={onToggleBold} sx={buttonStyle}>
            <BoldIcon />
          </IconButton>
        </Tooltip>
      )}
      {onToggleItalic && (
        <Tooltip title="Kursiv (*tekst*)">
          <IconButton size="small" onClick={onToggleItalic} sx={buttonStyle}>
            <ItalicIcon />
          </IconButton>
        </Tooltip>
      )}
      {onToggleUnderline && (
        <Tooltip title="Understreket (_tekst_)">
          <IconButton size="small" onClick={onToggleUnderline} sx={buttonStyle}>
            <UnderlineIcon />
          </IconButton>
        </Tooltip>
      )}

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      {/* Undo/Redo */}
      <Tooltip title="Angre (Ctrl+Z)">
        <span>
          <IconButton size="small" onClick={onUndo} disabled={!canUndo} sx={buttonStyle}>
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Gjør om (Ctrl+Y)">
        <span>
          <IconButton size="small" onClick={onRedo} disabled={!canRedo} sx={buttonStyle}>
            <RedoIcon />
          </IconButton>
        </span>
      </Tooltip>

      {/* Tools Menu */}
      {!compact && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="Verktøy">
            <IconButton 
              size="small" 
              onClick={(e) => setToolsAnchor(e.currentTarget)}
              sx={buttonStyle}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={toolsAnchor}
            open={Boolean(toolsAnchor)}
            onClose={() => setToolsAnchor(null)}
          >
            {onSearch && (
              <MenuItem onClick={() => { onSearch(); setToolsAnchor(null); }}>
                <ListItemIcon><SearchIcon /></ListItemIcon>
                <ListItemText primary="Søk" secondary="Ctrl+F" />
              </MenuItem>
            )}
            {onReplace && (
              <MenuItem onClick={() => { onReplace(); setToolsAnchor(null); }}>
                <ListItemIcon><ReplaceIcon /></ListItemIcon>
                <ListItemText primary="Søk og erstatt" secondary="Ctrl+H" />
              </MenuItem>
            )}
            {onSpellcheck && (
              <MenuItem onClick={() => { onSpellcheck(); setToolsAnchor(null); }}>
                <ListItemIcon><SpellcheckIcon /></ListItemIcon>
                <ListItemText primary="Stavekontroll" />
              </MenuItem>
            )}
            {onStats && (
              <MenuItem onClick={() => { onStats(); setToolsAnchor(null); }}>
                <ListItemIcon><StatsIcon /></ListItemIcon>
                <ListItemText primary="Statistikk" />
              </MenuItem>
            )}
          </Menu>
        </>
      )}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Status */}
      <Stack direction="row" spacing={1} alignItems="center">
        {/* Current Element */}
        {currentElement && (
          <Chip
            size="small"
            label={elementLabels[currentElement]}
            sx={{
              bgcolor: `${elementColors[currentElement]}20`,
              color: elementColors[currentElement],
              fontSize: '0.65rem',
              height: 22,
            }}
          />
        )}

        {/* Cursor Position */}
        {cursorPosition && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            L{cursorPosition.line}:C{cursorPosition.column}
          </Typography>
        )}

        {!compact && (
          <>
            <Divider orientation="vertical" flexItem />

            {/* Stats */}
            <Tooltip title={`${sceneCount} scener`}>
              <Chip
                icon={<SceneIcon sx={{ fontSize: 14 }} />}
                label={sceneCount}
                size="small"
                variant="outlined"
                sx={{ height: 22, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
              />
            </Tooltip>
            <Tooltip title={`${pageCount} sider`}>
              <Chip
                icon={<PageIcon sx={{ fontSize: 14 }} />}
                label={pageCount}
                size="small"
                variant="outlined"
                sx={{ height: 22, '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' } }}
              />
            </Tooltip>
          </>
        )}
      </Stack>

      {/* Preview Toggle */}
      {onTogglePreview && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title={isPreviewMode ? 'Rediger' : 'Forhåndsvisning'}>
            <IconButton 
              size="small" 
              onClick={onTogglePreview}
              sx={isPreviewMode ? activeButtonStyle : buttonStyle}
            >
              {isPreviewMode ? <EditIcon /> : <PreviewIcon />}
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* Export */}
      {onExport && (
        <Tooltip title="Eksporter">
          <IconButton size="small" onClick={onExport} sx={buttonStyle}>
            <ExportIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Import */}
      {onImport && (
        <Tooltip title="Importer">
          <IconButton size="small" onClick={onImport} sx={buttonStyle}>
            <ImportIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ScreenplayToolbar;
