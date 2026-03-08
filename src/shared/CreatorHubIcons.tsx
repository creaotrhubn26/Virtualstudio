import React from 'react';
import {
  School,
  VideoLibrary,
  Person,
  People,
  Route,
  WorkspacePremium,
  Quiz,
  Bookmark,
  Note,
  Create,
} from '@mui/icons-material';

export const CourseIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <School sx={sx} />
);

export const LessonIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <VideoLibrary sx={sx} />
);

export const VideoPlayerIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <VideoLibrary sx={sx} />
);

export const InstructorIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Person sx={sx} />
);

export const StudentIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <People sx={sx} />
);

export const LearningPathIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Route sx={sx} />
);

export const CertificateIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <WorkspacePremium sx={sx} />
);

export const QuizIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Quiz sx={sx} />
);

export const BookmarkIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Bookmark sx={sx} />
);

export const NoteIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Note sx={sx} />
);

export const ContentCreationIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <Create sx={sx} />
);


