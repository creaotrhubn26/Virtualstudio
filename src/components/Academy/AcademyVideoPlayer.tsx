import React from 'react';
import HelpVideoPlayer from '../HelpVideoPlayer';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowBack, ArrowForward, Check } from '@mui/icons-material';

interface AcademyVideoPlayerProps {
  course: any;
  lesson: any;
  onLessonComplete?: () => void;
  onNextLesson?: () => void;
  onPreviousLesson?: () => void;
}

const AcademyVideoPlayer: React.FC<AcademyVideoPlayerProps> = ({
  course,
  lesson,
  onLessonComplete,
  onNextLesson,
  onPreviousLesson,
}) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {course?.title} — {lesson?.title}
      </Typography>
      <HelpVideoPlayer
        videoId={lesson?.id || ''}
        title={lesson?.title || ''}
        description={lesson?.description || ''}
        duration={lesson?.duration || '0:00'}
        videoUrl={lesson?.videoUrl}
        thumbnailUrl={lesson?.thumbnailUrl}
      />
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        {onPreviousLesson && (
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={onPreviousLesson}>
            Forrige leksjon
          </Button>
        )}
        {onLessonComplete && (
          <Button variant="contained" color="success" startIcon={<Check />} onClick={onLessonComplete}>
            Marker som fullført
          </Button>
        )}
        {onNextLesson && (
          <Button variant="outlined" endIcon={<ArrowForward />} onClick={onNextLesson}>
            Neste leksjon
          </Button>
        )}
      </Stack>
    </Box>
  );
};

export default AcademyVideoPlayer;
export { AcademyVideoPlayer };
