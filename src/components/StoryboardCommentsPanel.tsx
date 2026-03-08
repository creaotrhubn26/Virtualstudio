import React, { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Divider,
  Chip,
  Paper,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import type { StoryboardFrame } from '../state/storyboardStore';

interface StoryboardComment {
  id: string;
  storyboardId: string;
  frameId?: string;
  text: string;
  author: string;
  createdAt: string;
}

interface StoryboardCommentsPanelProps {
  storyboardId: string;
  frameId?: string;
  frame?: StoryboardFrame;
}

const getStorageKey = (storyboardId: string): string => `storyboard-comments:${storyboardId}`;

const readComments = (storyboardId: string): StoryboardComment[] => {
  const raw = localStorage.getItem(getStorageKey(storyboardId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoryboardComment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeComments = (storyboardId: string, comments: StoryboardComment[]): void => {
  localStorage.setItem(getStorageKey(storyboardId), JSON.stringify(comments));
};

export const StoryboardCommentsPanel: React.FC<StoryboardCommentsPanelProps> = ({
  storyboardId,
  frameId,
  frame,
}) => {
  const [commentText, setCommentText] = useState('');
  const [author, setAuthor] = useState('Studio User');
  const [comments, setComments] = useState<StoryboardComment[]>(() => readComments(storyboardId));

  const filteredComments = useMemo(() => {
    if (!frameId) {
      return comments;
    }

    return comments.filter((comment) => !comment.frameId || comment.frameId === frameId);
  }, [comments, frameId]);

  const addComment = (): void => {
    const text = commentText.trim();
    const commentAuthor = author.trim() || 'Studio User';
    if (!text) {
      return;
    }

    const nextComment: StoryboardComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      storyboardId,
      frameId,
      text,
      author: commentAuthor,
      createdAt: new Date().toISOString(),
    };

    const nextComments = [nextComment, ...comments];
    setComments(nextComments);
    writeComments(storyboardId, nextComments);
    setCommentText('');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#151525' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>
          Comments
        </Typography>
        {frame && (
          <Typography variant="caption" color="text.secondary">
            On frame: {frame.index + 1}. {frame.title}
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1}>
          <TextField
            size="small"
            label="Author"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
          <TextField
            size="small"
            multiline
            minRows={2}
            maxRows={5}
            label="Add comment"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
          />
          <Button variant="contained" size="small" startIcon={<Send />} onClick={addComment}>
            Post
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        <Stack spacing={1.25}>
          {filteredComments.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No comments yet.
            </Typography>
          )}

          {filteredComments.map((comment) => (
            <Paper key={comment.id} elevation={0} sx={{ p: 1.25, bgcolor: '#1d1d32', border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={0.6}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                    {comment.author}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(comment.createdAt).toLocaleString()}
                  </Typography>
                </Stack>

                {comment.frameId && (
                  <Chip label={`Frame ${comment.frameId}`} size="small" sx={{ width: 'fit-content', height: 18 }} />
                )}

                <Divider />
                <Typography variant="body2" sx={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {comment.text}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default StoryboardCommentsPanel;
