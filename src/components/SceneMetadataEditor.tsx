import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  Typography,
  Autocomplete,
} from '@mui/material';
import { SceneComposition } from '../core/models/sceneComposer';
import { sceneComposerService } from '../services/sceneComposerService';

interface SceneMetadataEditorProps {
  open: boolean;
  scene: SceneComposition | null;
  onClose: () => void;
  onSave: (scene: SceneComposition) => void;
}

export function SceneMetadataEditor({ open, scene, onClose, onSave }: SceneMetadataEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  React.useEffect(() => {
    if (scene) {
      setName(scene.name);
      setDescription(scene.description || '');
      setTags(scene.tags || []);
    }
  }, [scene]);

  const handleSave = () => {
    if (!scene || !name.trim()) return;

    const updated: SceneComposition = {
      ...scene,
      name,
      description,
      tags,
      updatedAt: new Date().toISOString(),
    };

    sceneComposerService.saveScene(updated);
    onSave(updated);
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  if (!scene) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1c2128',
          color: '#fff',
        },
      }}
    >
      <DialogTitle>Rediger Metadata</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Scene-navn"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          label="Beskrivelse"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: '#00d4ff' },
            },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.87)' },
          }}
        />
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255,255,255,0.87)' }}>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {tags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                sx={{
                  bgcolor: 'rgba(0,212,255,0.2)',
                  color: '#00d4ff',
                }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Legg til tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                },
              }}
            />
            <Button
              variant="outlined"
              onClick={handleAddTag}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
              }}
            >
              Legg til
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.87)' }}>
          Avbryt
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim()}
          sx={{
            bgcolor: '#00d4ff',
            color: '#000',
            '&:hover': { bgcolor: '#00b8e6' },
            '&:disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.87)' },
          }}
        >
          Lagre
        </Button>
      </DialogActions>
    </Dialog>
  );
}

