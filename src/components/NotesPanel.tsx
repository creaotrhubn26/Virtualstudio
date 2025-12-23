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

export function NotesPanel({ onClose }: { onClose?: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Note['category']>('general');

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

  const buttonStyle = {
    minHeight: 48,
    fontSize: 14,
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '10px',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    '&:active': {
      transform: 'scale(0.97)',
    },
  };

  const isEditing = isCreating || editingNote;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(600px, 90vw)',
        maxHeight: '60vh',
        bgcolor: '#1e1e1e',
        border: '2px solid #333',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #333',
          bgcolor: '#252525',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotesIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
            Notater
          </Typography>
          <Chip
            label={`${notes.length}`}
            size="small"
            sx={{
              bgcolor: '#fbbf24',
              color: '#000',
              fontWeight: 700,
              fontSize: 12,
              height: 24,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isEditing && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
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
                '&:hover': { color: '#fff', bgcolor: '#333' },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Tittel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#2a2a2a',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#fbbf24' },
                },
                '& input::placeholder': { color: '#666' },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(Object.keys(CATEGORY_CONFIG) as Note['category'][]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                return (
                  <Button
                    key={cat}
                    variant={category === cat ? 'contained' : 'outlined'}
                    startIcon={<Icon sx={{ fontSize: 18 }} />}
                    onClick={() => setCategory(cat)}
                    sx={{
                      minHeight: 44,
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '8px',
                      bgcolor: category === cat ? config.color : 'transparent',
                      borderColor: category === cat ? config.color : '#444',
                      color: category === cat ? (cat === 'lighting' ? '#000' : '#fff') : '#aaa',
                      '&:hover': {
                        bgcolor: category === cat ? config.color : '#333',
                        borderColor: config.color,
                      },
                    }}
                  >
                    {config.label}
                  </Button>
                );
              })}
            </Box>

            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Skriv notatet ditt her..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#2a2a2a',
                  color: '#fff',
                  fontSize: 14,
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#555' },
                  '&.Mui-focused fieldset': { borderColor: '#fbbf24' },
                },
                '& textarea::placeholder': { color: '#666' },
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  ...buttonStyle,
                  borderColor: '#444',
                  color: '#aaa',
                  '&:hover': { borderColor: '#666', bgcolor: '#333' },
                }}
              >
                Avbryt
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
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
              py: 6,
              color: '#666',
            }}
          >
            <NotesIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography sx={{ fontSize: 14 }}>
              Ingen notater ennå
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#555', mt: 0.5 }}>
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
                      px: 2,
                      py: 1.5,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: '#2a2a2a' },
                    }}
                    onClick={() => handleEdit(note)}
                  >
                    <Icon sx={{ color: config.color, fontSize: 20, mr: 2 }} />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                            {note.title}
                          </Typography>
                          <Chip
                            label={config.label}
                            size="small"
                            sx={{
                              bgcolor: `${config.color}20`,
                              color: config.color,
                              fontSize: 10,
                              height: 20,
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
                                fontSize: 12,
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {note.content}
                            </Typography>
                          )}
                          <Typography sx={{ color: '#555', fontSize: 10, mt: 0.5 }}>
                            {formatDate(note.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(note);
                        }}
                        sx={{
                          color: '#666',
                          mr: 0.5,
                          '&:hover': { color: '#fbbf24', bgcolor: '#333' },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                        sx={{
                          color: '#666',
                          '&:hover': { color: '#ef4444', bgcolor: '#333' },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
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
  );
}

export default NotesPanel;
