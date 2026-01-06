import React from 'react';
import { Box, Typography, Card, CardContent, Stack, Chip } from '@mui/material';
import { Schedule } from '@mui/icons-material';

interface ScheduledPostsWidgetProps {
  posts?: any[];
}

const ScheduledPostsWidget: React.FC<ScheduledPostsWidgetProps> = ({ posts = [] }) => {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Schedule color="primary" />
          <Typography variant="h6">Planlagte Innlegg</Typography>
        </Stack>
        {posts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Ingen planlagte innlegg
          </Typography>
        ) : (
          <Stack spacing={1}>
            {posts.map((post, index) => (
              <Box key={index} sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">{post.title}</Typography>
                <Chip label={post.scheduledDate} size="small" sx={{ mt: 0.5 }} />
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduledPostsWidget;
