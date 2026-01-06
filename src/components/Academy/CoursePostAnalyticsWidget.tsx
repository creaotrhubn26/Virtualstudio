import React from 'react';
import { Box, Typography, Card, CardContent, Stack, LinearProgress } from '@mui/material';
import { Analytics, TrendingUp, People, Visibility } from '@mui/icons-material';

interface CoursePostAnalyticsWidgetProps {
  courseId?: string;
  views?: number;
  enrollments?: number;
  completionRate?: number;
}

const CoursePostAnalyticsWidget: React.FC<CoursePostAnalyticsWidgetProps> = ({
  courseId,
  views = 0,
  enrollments = 0,
  completionRate = 0,
}) => {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Analytics color="primary" />
          <Typography variant="h6">Kursanalyse</Typography>
        </Stack>
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Visibility fontSize="small" color="action" />
              <Typography variant="body2">Visninger: {views}</Typography>
            </Stack>
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <People fontSize="small" color="action" />
              <Typography variant="body2">Påmeldinger: {enrollments}</Typography>
            </Stack>
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TrendingUp fontSize="small" color="action" />
              <Typography variant="body2">Fullføringsrate: {completionRate}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={completionRate} sx={{ mt: 1 }} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CoursePostAnalyticsWidget;
