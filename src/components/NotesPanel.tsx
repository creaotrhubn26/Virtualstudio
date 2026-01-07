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
  CircularProgress,
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
import { noteApi } from '@/services/virtualStudioApiService';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Load notes from database (with localStorage fallback)
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const dbNotes = await noteApi.getAll();
        if (dbNotes.length > 0) {
          const mappedNotes: Note[] = dbNotes.map(n => ({
            id: n.id,
            title: n.title,
            content: n.content || '',
            category: (n.category as Note['category']) || 'general',
            timestamp: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
            sceneId: n.project_id || undefined,
          }));
          setNotes(mappedNotes);
        } else {
          // Fallback to localStorage
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              setNotes(JSON.parse(saved));
            } catch (e) {
              console.error('Failed to load notes from localStorage:', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load notes from database:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            setNotes(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to load notes from localStorage:', e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadNotes();
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

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);

    try {
      if (editingNote) {
        // Update existing note in database
        await noteApi.save({
          id: editingNote.id,
          title,
          content,
          category,
        });
        const updated = notes.map(n =>
          n.id === editingNote.id
            ? { ...n, title, content, category, timestamp: Date.now() }
            : n
        );
        saveNotes(updated);
      } else {
        // Create new note in database
        const newId = `note_${Date.now()}`;
        await noteApi.save({
          id: newId,
          title,
          content,
          category,
        });
        const newNote: Note = {
          id: newId,
          title,
          content,
          category,
          timestamp: Date.now(),
        };
        saveNotes([newNote, ...notes]);
      }
    } catch (error) {
      console.error('Failed to save note to database:', error);
      // Still update local state as fallback
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
    } finally {
      setIsSaving(false);
    }

    setIsCreating(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const handleDelete = async (id: string) => {
    try {
      await noteApi.delete(id);
    } catch (error) {
      console.error('Failed to delete note from database:', error);
    }
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

  // 6-tier responsive button style
  const buttonStyle = {
    minHeight: { xs: 44, sm: 46, md: 48, lg: 52, xl: 56 },
    fontSize: { xs: 13, sm: 14, md: 14, lg: 15, xl: 16 },
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: { xs: '10px', md: '12px', xl: '14px' },
    padding: { xs: '10px 16px', sm: '10px 18px', md: '12px 20px', lg: '12px 22px', xl: '14px 26px' },
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
          bottom: { xs: 65, sm: 75, md: 85, lg: 95, xl: 110 },
          left: '50%',
          // 6-tier responsive width
          width: {
            xs: 'calc(100vw - 24px)',
            sm: 'min(600px, 92vw)',
            md: 'min(700px, 88vw)',
            lg: 'min(800px, 85vw)',
            xl: 'min(900px, 80vw)',
          },
          maxHeight: { xs: '72vh', sm: '68vh', md: '65vh', lg: '62vh', xl: '58vh' },
          bgcolor: '#1e1e1e',
          border: { xs: '1px solid #333', md: '2px solid #333' },
          borderRadius: { xs: '14px', sm: '16px', md: '18px', xl: '20px' },
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
          p: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
          borderBottom: '1px solid #333',
          bgcolor: '#252525',
          gap: { xs: 1, sm: 1.5 },
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          <NotesIcon sx={{ color: '#fbbf24', fontSize: { xs: 22, sm: 24, md: 26, lg: 28, xl: 32 } }} />
          <Typography sx={{ 
            color: '#fff', 
            fontWeight: 600, 
            fontSize: { xs: 15, sm: 16, md: 17, lg: 18, xl: 20 } 
          }}>
            Notater
          </Typography>
          <Chip
            label={`${notes.length}`}
            size="small"
            sx={{
              bgcolor: '#fbbf24',
              color: '#000',
              fontWeight: 700,
              fontSize: { xs: 11, sm: 12, md: 13, xl: 14 },
              height: { xs: 24, sm: 26, md: 28, xl: 32 },
              px: { xs: 0.75, sm: 1 },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 } }}>
          {!isEditing && (
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: { xs: 18, sm: 19, md: 20, xl: 22 } }} />}
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
                minWidth: { xs: 44, sm: 46, md: 48, xl: 52 },
                minHeight: { xs: 44, sm: 46, md: 48, xl: 52 },
                '&:hover': { color: '#fff', bgcolor: '#333' },
                touchAction: 'manipulation',
              }}
            >
              <CloseIcon sx={{ fontSize: 24 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 } }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2, md: 2.5, lg: 3 } }}>
            <TextField
              fullWidth
              placeholder="Tittel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#2a2a2a',
                  color: '#fff',
                  fontSize: { xs: 15, sm: 16, md: 17, lg: 18, xl: 19 },
                  fontWeight: 600,
                  minHeight: { xs: 48, sm: 50, md: 52, lg: 56, xl: 60 },
                  borderRadius: { xs: '10px', md: '12px', xl: '14px' },
                  '& fieldset': { borderColor: '#444', borderWidth: 2 },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#fbbf24', borderWidth: 2 },
                },
                '& input': {
                  padding: { xs: '12px 12px', sm: '14px 14px', md: '16px 16px' },
                },
                '& input::placeholder': { color: '#666', fontSize: { xs: 15, sm: 16, md: 17, lg: 18 } },
              }}
            />

            {/* Category buttons - 6-tier responsive */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5 },
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
                    startIcon={<Icon sx={{ fontSize: { xs: 16, sm: 18, md: 19, lg: 20, xl: 22 } }} />}
                    onClick={() => setCategory(cat)}
                    sx={{
                      minHeight: { xs: 44, sm: 46, md: 48, lg: 52, xl: 56 },
                      fontSize: { xs: 12, sm: 13, md: 14, lg: 15, xl: 16 },
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: { xs: '8px', md: '10px', xl: '12px' },
                      padding: { xs: '8px 12px', sm: '10px 14px', md: '10px 16px', lg: '12px 18px', xl: '12px 20px' },
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

            {/* Rich text editor with 6-tier responsive height */}
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Skriv notatet ditt her..."
              minHeight={{ xs: 120, sm: 150, md: 180, lg: 220, xl: 260 }}
              accentColor="#fbbf24"
            />

            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, justifyContent: 'flex-end' }}>
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
                startIcon={<SaveIcon sx={{ fontSize: { xs: 18, sm: 19, md: 20, xl: 22 } }} />}
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
              py: { xs: 4, sm: 5, md: 6, lg: 7, xl: 8 },
              color: '#666',
            }}
          >
            <NotesIcon sx={{ fontSize: { xs: 48, sm: 52, md: 56, lg: 60, xl: 64 }, mb: { xs: 2, sm: 2.5, md: 3 }, opacity: 0.5 }} />
            <Typography sx={{ fontSize: { xs: 15, sm: 16, md: 17, lg: 18, xl: 20 }, fontWeight: 500 }}>
              Ingen notater ennå
            </Typography>
            <Typography sx={{ fontSize: { xs: 12, sm: 13, md: 14, xl: 15 }, color: '#555', mt: 1 }}>
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
