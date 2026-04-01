/**
 * Split Sheet Comments
 * Threaded comments and discussions on split sheets
 */

import React, { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Stack,
  Avatar,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  CheckCircle as ResolvedIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';

interface Comment {
  id?: string;
  split_sheet_id: string;
  parent_comment_id?: string | null;
  user_id: string;
  user_name: string;
  user_email?: string | null;
  content: string;
  mentions?: string[];
  is_resolved?: boolean;
  created_at?: string;
  updated_at?: string;
  replies?: Comment[];
}

interface SplitSheetCommentsProps {
  splitSheetId: string;
}

export default function SplitSheetComments({
  splitSheetId
}: SplitSheetCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const brandColor = theme.palette.primary.main;
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['split-sheet-comments', splitSheetId],
    queryFn: async () => {
      const response = await apiRequest(`/api/split-sheets/${splitSheetId}/comments`);
      return response;
    }
  });

  const allComments: Comment[] = commentsData?.data || [];

  // Organize comments into threads
  const topLevelComments = allComments.filter(c => !c.parent_comment_id);
  const replies = allComments.filter(c => c.parent_comment_id);

  const getReplies = (commentId: string): Comment[] => {
    return replies.filter(r => r.parent_comment_id === commentId);
  };

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: async (data: { content: string; parent_comment_id?: string }) => {
      const response = await apiRequest(`/api/split-sheets/${splitSheetId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-comments', splitSheetId] });
      setNewComment('');
      setReplyingTo(null);
    }
  });

  // Update comment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await apiRequest(`/api/split-sheets/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-comments', splitSheetId] });
      setEditingComment(null);
      setEditContent('');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest(`/api/split-sheets/comments/${commentId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-comments', splitSheetId] });
    }
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ commentId, is_resolved }: { commentId: string; is_resolved: boolean }) => {
      const response = await apiRequest(`/api/split-sheets/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_resolved })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['split-sheet-comments', splitSheetId] });
    }
  });

  const handleSubmit = () => {
    if (newComment.trim()) {
      createMutation.mutate({
        content: newComment,
        parent_comment_id: replyingTo?.id
      });
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingComment?.id && editContent.trim()) {
      updateMutation.mutate({
        commentId: editingComment.id,
        content: editContent
      });
    }
  };

  const handleDelete = (comment: Comment) => {
    if (window.confirm('Er du sikker på at du vil slette denne kommentaren?')) {
      if (comment.id) {
        deleteMutation.mutate(comment.id);
      }
    }
  };

  const handleResolve = (comment: Comment) => {
    if (comment.id) {
      resolveMutation.mutate({
        commentId: comment.id,
        is_resolved: !comment.is_resolved
      });
    }
  };

  const renderComment = (comment: Comment, level: number = 0) => {
    const commentReplies = getReplies(comment.id || '');
    const isOwner = comment.user_id === user?.id;

    return (
      <Box key={comment.id} sx={{ ml: { xs: level * 2, sm: level * 3, md: level * 4 }, mb: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 } }}>
        <Card
          variant={level > 0 ? 'outlined' : 'elevation'}
          sx={{
            bgcolor: level > 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
            borderRadius: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
            border: level > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            boxShadow: level > 0 ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 } }}>
            <Stack direction="row" spacing={{ xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }} alignItems="flex-start">
              <Avatar
                sx={{
                  bgcolor: brandColor,
                  width: { xs: 36, sm: 40, md: 44, lg: 48, xl: 52 },
                  height: { xs: 36, sm: 40, md: 44, lg: 48, xl: 52 },
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' },
                }}
              >
                {comment.user_name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={{ xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 }}
                  alignItems="center"
                  sx={{ mb: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 } }}
                  flexWrap="wrap"
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                    }}
                  >
                    {comment.user_name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.813rem', lg: '0.875rem', xl: '0.938rem' },
                    }}
                  >
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleDateString('no-NO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''}
                  </Typography>
                  {comment.is_resolved && (
                    <Chip
                      icon={<ResolvedIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                      label="Løst"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{
                        fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.813rem', lg: '0.875rem', xl: '0.938rem' },
                        height: { xs: 24, sm: 26, md: 28, lg: 30, xl: 32 },
                      }}
                    />
                  )}
                </Stack>
                {editingComment?.id === comment.id ? (
                  <Box>
                    <TextField
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      sx={{
                        mb: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                        },
                      }}
                    />
                    <Stack direction="row" spacing={{ xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }}>
                      <Button
                        size="small"
                        onClick={handleSaveEdit}
                        variant="contained"
                        sx={{
                          bgcolor: brandColor,
                          '&:hover': { bgcolor: brandColor },
                          minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                          fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                        }}
                      >
                        Lagre
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingComment(null);
                          setEditContent('');
                        }}
                        sx={{
                          minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                          fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                        }}
                      >
                        Avbryt
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      mb: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
                      whiteSpace: 'pre-wrap',
                      fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                      lineHeight: 1.6,
                    }}
                  >
                    {comment.content}
                  </Typography>
                )}
                {!editingComment && (
                  <Stack
                    direction="row"
                    spacing={{ xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 }}
                    flexWrap="wrap"
                    sx={{ gap: { xs: 0.5, sm: 0.75, md: 1, lg: 1.25, xl: 1.5 } }}
                  >
                    <Button
                      size="small"
                      startIcon={<ReplyIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                      onClick={() => setReplyingTo(comment)}
                      sx={{
                        minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                        fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                        color: brandColor,
                      }}
                    >
                      Svar
                    </Button>
                    {isOwner && (
                      <>
                        <Button
                          size="small"
                          startIcon={<EditIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                          onClick={() => handleEdit(comment)}
                          sx={{
                            minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                            fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                            color: brandColor,
                          }}
                        >
                          Rediger
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                          onClick={() => handleDelete(comment)}
                          color="error"
                          sx={{
                            minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                            fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                          }}
                        >
                          Slett
                        </Button>
                      </>
                    )}
                    <Button
                      size="small"
                      startIcon={<ResolvedIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                      onClick={() => handleResolve(comment)}
                      color={comment.is_resolved ? 'success' : 'inherit'}
                      sx={{
                        minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                        fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                      }}
                    >
                      {comment.is_resolved ? 'Marker som uløst' : 'Marker som løst'}
                    </Button>
                  </Stack>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Replies */}
        {commentReplies.length > 0 && (
          <Box sx={{ mt: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }, ml: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}>
            {commentReplies.map(reply => renderComment(reply, level + 1))}
          </Box>
        )}

        {/* Reply form */}
        {replyingTo?.id === comment.id && (
          <Box sx={{ mt: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }, ml: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
                bgcolor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 } }}>
                <TextField
                  placeholder="Skriv et svar..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  sx={{
                    mb: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 },
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
                    },
                  }}
                />
                <Stack
                  direction="row"
                  spacing={{ xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }}
                  justifyContent="flex-end"
                >
                  <Button
                    size="small"
                    onClick={() => {
                      setReplyingTo(null);
                      setNewComment('');
                    }}
                    sx={{
                      minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                      fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                    }}
                  >
                    Avbryt
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SendIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || createMutation.isPending}
                    sx={{
                      bgcolor: brandColor,
                      '&:hover': { bgcolor: brandColor },
                      minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                      fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                    }}
                  >
                    Send
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
          fontSize: { xs: '1rem', sm: '1.063rem', md: '1.125rem', lg: '1.188rem', xl: '1.25rem' },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 },
          color: brandColor,
        }}
      >
        <CommentIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem', lg: '1.625rem', xl: '1.75rem' } }} />
        Kommentarer og diskusjoner
      </Typography>

      {/* New comment form */}
      <Card
        sx={{
          mb: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
          borderRadius: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 } }}>
          <TextField
            placeholder="Skriv en kommentar..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{
              mb: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 },
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.938rem', sm: '1rem', md: '1.063rem', lg: '1.125rem', xl: '1.188rem' },
              },
              '& .MuiInputLabel-root': {
                fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
              },
            }}
          />
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 }}
            justifyContent="flex-end"
            flexWrap="wrap"
            sx={{ gap: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 } }}
          >
            {replyingTo && (
              <Button
                size="small"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                sx={{
                  minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                  fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                }}
              >
                Avbryt svar
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SendIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem', lg: '1.25rem', xl: '1.375rem' } }} />}
              onClick={handleSubmit}
              disabled={!newComment.trim() || createMutation.isPending}
              sx={{
                bgcolor: brandColor,
                '&:hover': { bgcolor: brandColor },
                minHeight: { xs: 36, sm: 38, md: 40, lg: 42, xl: 44 },
                fontSize: { xs: '0.813rem', sm: '0.875rem', md: '0.938rem', lg: '1rem', xl: '1.063rem' },
                px: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
                py: { xs: 0.75, sm: 1, md: 1.25, lg: 1.5, xl: 1.75 },
              }}
            >
              {createMutation.isPending ? 'Sender...' : 'Send kommentar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Comments list */}
      {topLevelComments.length === 0 ? (
        <Card
          sx={{
            borderRadius: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CardContent
            sx={{
              textAlign: 'center',
              py: { xs: 3, sm: 3.5, md: 4, lg: 4.5, xl: 5 },
              px: { xs: 2, sm: 2.5, md: 3, lg: 3.5, xl: 4 },
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.875rem', sm: '0.938rem', md: '1rem', lg: '1.063rem', xl: '1.125rem' },
              }}
            >
              Ingen kommentarer ennå. Vær den første til å kommentere!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={{ xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 3.5 }}>
          {topLevelComments.map(comment => renderComment(comment))}
        </Stack>
      )}
    </Box>
  );
}


