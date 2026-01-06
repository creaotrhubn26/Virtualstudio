import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Notes as NotesIcon,
  PhotoCamera as CameraIcon,
  Lightbulb as LightIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { RichTextEditor } from './RichTextEditor';

interface Note {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'lighting' | 'camera' | 'model' | 'setup';
  timestamp: number;
  sceneId?: string;
}

const CATEGORY_CONFIG = {
  general: { label: 'Generelt', icon: NotesIcon, color: '#888' },
  lighting: { label: 'Lys', icon: LightIcon, color: '#fbbf24' },
  camera: { label: 'Kamera', icon: CameraIcon, color: '#00a8ff' },
  model: { label: 'Modell', icon: PersonIcon, color: '#10b981' },
  setup: { label: 'Oppsett', icon: SettingsIcon, color: '#8b5cf6' },
};

const STORAGE_KEY = 'virtualstudio_notes';

interface NotesPanelProps {
  onClose?: () => void;
  isClosing?: boolean;
}

export function NotesPanel({ onClose, isClosing = false }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Note['category']>('general');
  const [zIndex, setZIndex] = useState(10000);

  // Bring panel to front on mount
  useEffect(() => {
    const bringToFront = (window as any).bringPanelToFront;
    if (bringToFront) {
      bringToFront('notesPanel');
    }
  }, []);

  // Listen for z-index updates from other panels
  useEffect(() => {
    const handleBringToFront = (e: CustomEvent<{ panelId: string; zIndex: number }>) => {
      if (e.detail.panelId === 'notesPanel') {
        setZIndex(e.detail.zIndex);
      }
    };
    window.addEventListener('panel-bring-to-front', handleBringToFront as EventListener);
    return () => {
      window.removeEventListener('panel-bring-to-front', handleBringToFront as EventListener);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load notes:', e);
      }
    }
  }, []);

  const saveNotes = useCallback((updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
  }, []);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('general');
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsCreating(false);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    if (editingNote) {
      const updated = notes.map(n =>
        n.id === editingNote.id
          ? { ...n, title, content, category, timestamp: Date.now() }
          : n
      );
      saveNotes(updated);
    } else {
      const newNote: Note = {
        id: `note_${Date.now()}`,
        title,
        content,
        category,
        timestamp: Date.now(),
      };
      saveNotes([newNote, ...notes]);
    }

    setIsCreating(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const handleDelete = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
    if (editingNote?.id === id) {
      setEditingNote(null);
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Responsive button style for desktop and iPad
  const buttonStyle = {
    minHeight: { xs: 48, sm: 52, md: 56 },
    fontSize: { xs: 14, sm: 15, md: 16 },
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '12px',
    padding: { xs: '10px 18px', sm: '12px 20px', md: '12px 24px' },
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    '&:active': {
      transform: 'scale(0.97)',
    },
  };

  const isEditing = isCreating || editingNote;

  return (
    <>
      {/* Backdrop dimming */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.3)',
          zIndex: zIndex - 1,
          opacity: isClosing ? 0 : 1,
          transition: 'opacity 0.35s ease',
          pointerEvents: 'none',
        }}
      />
      <Box
        id="notesPanel"
        sx={{
          position: 'fixed',
          bottom: { xs: 70, sm: 80, md: 100 },
          left: '50%',
          // Responsive width: mobile -> tablet -> desktop
          width: {
            xs: 'calc(100vw - 32px)',
            sm: 'min(700px, 90vw)',
            md: 'min(800px, 85vw)',
          },
          maxHeight: { xs: '70vh', sm: '65vh', md: '60vh' },
          bgcolor: '#1e1e1e',
          border: '2px solid #333',
          borderRadius: { xs: 2, sm: 3 },
          zIndex: zIndex,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transformOrigin: 'bottom center',
          // macOS Genie-style animation
          '@keyframes genieOpen': {
            '0%': {
              opacity: 0,
              transform: 'translateX(-50%) scaleY(0.1) scaleX(0.5)',
              boxShadow: '0 0 0 rgba(0,0,0,0)',
            },
            '50%': {
              opacity: 1,
              transform: 'translateX(-50%) scaleY(0.6) scaleX(0.9)',
            },
            '80%': {
              transform: 'translateX(-50%) scaleY(1.02) scaleX(1.01)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateX(-50%) scaleY(1) scaleX(1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
          },
          '@keyframes genieClose': {
            '0%': {
              opacity: 1,
              transform: 'translateX(-50%) scaleY(1) scaleX(1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
            '30%': {
              transform: 'translateX(-50%) scaleY(0.8) scaleX(0.95)',
            },
            '100%': {
              opacity: 0,
              transform: 'translateX(-50%) scaleY(0.1) scaleX(0.5)',
              boxShadow: '0 0 0 rgba(0,0,0,0)',
            },
          },
          animation: isClosing
            ? 'genieClose 0.3s cubic-bezier(0.4, 0, 1, 1) forwards'
            : 'genieOpen 0.4s cubic-bezier(0, 0, 0.2, 1) forwards',
        }}
      >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3,
          borderBottom: '1px solid #333',
          bgcolor: '#252525',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <NotesIcon sx={{ color: '#fbbf24', fontSize: 28 }} />
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 18 }}>
            Notater
          </Typography>
          <Chip
            label={`${notes.length}`}
            size="small"
            sx={{
              bgcolor: '#fbbf24',
              color: '#000',
              fontWeight: 700,
              fontSize: 13,
              height: 28,
              px: 1,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {!isEditing && (
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 20 }} />}
              onClick={handleCreate}
              sx={{
                ...buttonStyle,
                bgcolor: '#fbbf24',
                color: '#000',
                '&:hover': { bgcolor: '#f59e0b' },
              }}
            >
              Ny notat
            </Button>
          )}
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{
                color: '#888',
                minWidth: 48,
                minHeight: 48,
                '&:hover': { color: '#fff', bgcolor: '#333' },
                touchAction: 'manipulation',
              }}
            >
              <CloseIcon sx={{ fontSize: 24 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 2, sm: 3 } }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
            <TextField
              fullWidth
              placeholder="Tittel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#2a2a2a',
                  color: '#fff',
                  fontSize: { xs: 16, sm: 18 },
                  fontWeight: 600,
                  minHeight: { xs: 52, sm: 56 },
                  '& fieldset': { borderColor: '#444', borderWidth: 2 },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#fbbf24', borderWidth: 2 },
                },
                '& input': {
                  padding: { xs: '14px 12px', sm: '16px 14px' },
                },
                '& input::placeholder': { color: '#666', fontSize: { xs: 16, sm: 18 } },
              }}
            />

            {/* Category buttons - responsive grid for iPad */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, sm: 1.5 },
                flexWrap: 'wrap',
              }}
            >
              {(Object.keys(CATEGORY_CONFIG) as Note['category'][]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                return (
                  <Button
                    key={cat}
                    variant={category === cat ? 'contained' : 'outlined'}
                    startIcon={<Icon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                    onClick={() => setCategory(cat)}
                    sx={{
                      minHeight: { xs: 48, sm: 52 },
                      fontSize: { xs: 14, sm: 15 },
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '10px',
                      padding: { xs: '10px 16px', sm: '12px 20px' },
                      bgcolor: category === cat ? config.color : 'transparent',
                      borderColor: category === cat ? config.color : '#444',
                      borderWidth: 2,
                      color: category === cat ? (cat === 'lighting' ? '#000' : '#fff') : '#aaa',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: category === cat ? config.color : '#333',
                        borderColor: config.color,
                      },
                      '&:active': {
                        transform: 'scale(0.97)',
                      },
                    }}
                  >
                    {config.label}
                  </Button>
                );
              })}
            </Box>

            {/* Rich text editor with responsive height */}
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Skriv notatet ditt her..."
              minHeight={{ xs: 150, sm: 200, md: 250 }}
              accentColor="#fbbf24"
            />

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  ...buttonStyle,
                  borderColor: '#444',
                  borderWidth: 2,
                  color: '#aaa',
                  '&:hover': { borderColor: '#666', bgcolor: '#333' },
                }}
              >
                Avbryt
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon sx={{ fontSize: 20 }} />}
                onClick={handleSave}
                disabled={!title.trim()}
                sx={{
                  ...buttonStyle,
                  bgcolor: '#10b981',
                  color: '#fff',
                  '&:hover': { bgcolor: '#059669' },
                  '&.Mui-disabled': { bgcolor: '#333', color: '#666' },
                }}
              >
                Lagre
              </Button>
            </Box>
          </Box>
        ) : notes.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              color: '#666',
            }}
          >
            <NotesIcon sx={{ fontSize: 64, mb: 3, opacity: 0.5 }} />
            <Typography sx={{ fontSize: 18, fontWeight: 500 }}>
              Ingen notater ennå
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#555', mt: 1 }}>
              Klikk "Ny notat" for å begynne
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notes.map((note, index) => {
              const config = CATEGORY_CONFIG[note.category];
              const Icon = config.icon;
              return (
                <React.Fragment key={note.id}>
                  {index > 0 && <Divider sx={{ borderColor: '#333' }} />}
                  <ListItem
                    sx={{
                      px: 3,
                      py: 2.5,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: 72,
                      touchAction: 'manipulation',
                      '&:hover': { bgcolor: '#2a2a2a' },
                      '&:active': { bgcolor: '#333' },
                    }}
                    onClick={() => handleEdit(note)}
                  >
                    <Icon sx={{ color: config.color, fontSize: 24, mr: 2.5 }} />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
                            {note.title}
                          </Typography>
                          <Chip
                            label={config.label}
                            size="small"
                            sx={{
                              bgcolor: `${config.color}20`,
                              color: config.color,
                              fontSize: 12,
                              height: 24,
                              px: 1,
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          {note.content && (
                            <Typography
                              sx={{
                                color: '#888',
                                fontSize: 14,
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.5,
                              }}
                            >
                              {note.content}
                            </Typography>
                          )}
                          <Typography sx={{ color: '#555', fontSize: 12, mt: 0.5 }}>
                            {formatDate(note.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(note);
                        }}
                        sx={{
                          color: '#666',
                          mr: 1,
                          minWidth: 48,
                          minHeight: 48,
                          touchAction: 'manipulation',
                          '&:hover': { color: '#fbbf24', bgcolor: '#333' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 22 }} />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                        sx={{
                          color: '#666',
                          minWidth: 48,
                          minHeight: 48,
                          touchAction: 'manipulation',
                          '&:hover': { color: '#ef4444', bgcolor: '#333' },
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 22 }} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
    </>
  );
}

export default NotesPanel;
