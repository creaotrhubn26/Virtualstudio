import React from 'react';
import CourseCreatorSidebar from '../CourseCreatorSidebar';
import { Box, Button, Typography, Stack } from '@mui/material';
import { Save, Close } from '@mui/icons-material';

interface CourseCreatorProps {
  onSave?: () => void;
  onCancel?: () => void;
}

const CourseCreator: React.FC<CourseCreatorProps> = ({ onSave, onCancel }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Opprett nytt kurs
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Bruk skjemaet nedenfor for å opprette et nytt kurs.
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        {onSave && (
          <Button variant="contained" startIcon={<Save />} onClick={onSave}>
            Lagre kurs
          </Button>
        )}
        {onCancel && (
          <Button variant="outlined" startIcon={<Close />} onClick={onCancel}>
            Avbryt
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default CourseCreator;
export { CourseCreator, CourseCreatorSidebar };
