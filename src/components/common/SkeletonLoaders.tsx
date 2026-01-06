import React from 'react';
import { Box, Skeleton, Card, CardContent, Stack } from '@mui/material';

export const CourseCardSkeleton: React.FC = () => (
  <Card sx={{ height: '100%', bgcolor: 'rgba(255,255,255,0.05)' }}>
    <Skeleton variant="rectangular" height={160} animation="wave" />
    <CardContent>
      <Skeleton variant="text" width="80%" height={24} />
      <Skeleton variant="text" width="60%" height={20} />
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={80} height={24} />
      </Box>
    </CardContent>
  </Card>
);

export const CommunicationItemSkeleton: React.FC = () => (
  <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
    <Stack direction="row" spacing={2} alignItems="center">
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
    </Stack>
  </Box>
);

export const ListItemSkeleton: React.FC = () => (
  <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <Stack direction="row" spacing={2} alignItems="center">
      <Skeleton variant="rounded" width={24} height={24} />
      <Skeleton variant="text" width="60%" height={20} />
    </Stack>
  </Box>
);

export const ModuleCardSkeleton: React.FC = () => (
  <Card sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Skeleton variant="circular" width={48} height={48} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="50%" height={24} />
          <Skeleton variant="text" width="80%" height={16} />
        </Box>
        <Skeleton variant="rounded" width={100} height={36} />
      </Stack>
    </CardContent>
  </Card>
);

export const VideoPlayerSkeleton: React.FC = () => (
  <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
    <Skeleton
      variant="rectangular"
      sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      animation="wave"
    />
  </Box>
);

export const DashboardSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
    <Stack direction="row" spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={32} />
          </CardContent>
        </Card>
      ))}
    </Stack>
  </Box>
);
