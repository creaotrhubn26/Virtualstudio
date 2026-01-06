import React from 'react';
import {
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Lesson, Module } from './types';

interface LessonEditorProps {
  lesson: Lesson | null;
  modules: Module[];
  onChange: (lesson: Lesson) => void;
  isNew?: boolean;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({ lesson, modules, onChange, isNew = false }) => {
  if (!lesson) return null;

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        fullWidth
        label="Tittel"
        value={lesson.title}
        onChange={(e) => onChange({ ...lesson, title: e.target.value })}
        required
      />
      <TextField
        fullWidth
        label="Beskrivelse"
        value={lesson.description}
        onChange={(e) => onChange({ ...lesson, description: e.target.value })}
        multiline
        rows={3}
      />
      <FormControl fullWidth>
        <InputLabel>Type</InputLabel>
        <Select
          value={lesson.type}
          onChange={(e) => {
            onChange({ ...lesson, type: e.target.value as 'video' | 'quiz' | 'text' | 'assignment' });
          }}
          label="Type"
        >
          <MenuItem value="video">Video</MenuItem>
          <MenuItem value="quiz">Quiz</MenuItem>
          <MenuItem value="text">Tekst</MenuItem>
          <MenuItem value="assignment">Oppgave</MenuItem>
        </Select>
      </FormControl>
      {lesson.type === 'video' && (
        <TextField
          fullWidth
          label="Video URL"
          value={lesson.videoUrl || ''}
          onChange={(e) => onChange({ ...lesson, videoUrl: e.target.value })}
        />
      )}
      <FormControl fullWidth>
        <InputLabel>Modul</InputLabel>
        <Select
          value={lesson.moduleId}
          onChange={(e) => onChange({ ...lesson, moduleId: e.target.value })}
          label="Modul"
        >
          {modules.map((module) => (
            <MenuItem key={module.id} value={module.id}>
              {module.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
};


















