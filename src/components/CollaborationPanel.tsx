/**
 * Collaboration Panel UI Component
 * Shows collaborators, chat, and presence indicators
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Fab
} from '@mui/material';
import {
  People as PeopleIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Circle as CircleIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useCollaborationStore, CollaboratorPresence, ChatMessage } from '../services/collaborationService';

interface CollaborationPanelProps {
  sceneId?: string;
  onCollaboratorSelect?: (collaboratorId: string) => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  sceneId,
  onCollaboratorSelect
}) => {
  const {
    isConnected,
    roomId,
    userId,
    userName,
    userColor,
    collaborators,
    objectLocks,
    chatMessages,
    unreadCount,
    connect,
    disconnect,
    sendChatMessage,
    markChatRead
  } = useCollaborationStore();
  
  const [showChat, setShowChat] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinUserName, setJoinUserName] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [expanded, setExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll chat
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);
  
  // Mark as read when chat is open
  useEffect(() => {
    if (showChat) {
      markChatRead();
    }
  }, [showChat, markChatRead]);
  
  const handleJoin = async () => {
    if (joinRoomId && joinUserName) {
      await connect(joinRoomId, joinUserName);
      setShowJoinDialog(false);
    }
  };
  
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput);
      setChatInput('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const copyRoomLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
  };
  
  const generateRoomId = () => {
    return `studio_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  };
  
  const collaboratorList = Array.from(collaborators.values());
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 100,
        right: 16,
        width: 320,
        maxHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        zIndex: 10001
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: isConnected ? 'success.dark' : 'grey.800',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon />
          <Typography variant="subtitle1" fontWeight="bold">
            Collaboration
          </Typography>
          {isConnected && (
            <Chip
              size="small"
              label={`${collaboratorList.length + 1} online`}
              color="success"
              sx={{ height: 20 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isConnected && (
            <Badge badgeContent={unreadCount} color="error">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChat(!showChat);
                }}
              >
                <ChatIcon fontSize="small" />
              </IconButton>
            </Badge>
          )}
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </Box>
      
      <Collapse in={expanded}>
        {!isConnected ? (
          /* Not Connected State */
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Start or join a collaboration session to work with others in real-time.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<ShareIcon />}
                onClick={() => {
                  setJoinRoomId(generateRoomId());
                  setJoinUserName('');
                  setShowJoinDialog(true);
                }}
              >
                Start New Session
              </Button>
              <Button
                variant="outlined"
                startIcon={<PeopleIcon />}
                onClick={() => {
                  setJoinRoomId('');
                  setJoinUserName('');
                  setShowJoinDialog(true);
                }}
              >
                Join Existing Session
              </Button>
            </Box>
          </Box>
        ) : (
          /* Connected State */
          <>
            {/* Room Info */}
            <Box sx={{ p: 1.5, bgcolor: 'grey.900' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Room: {roomId}
                </Typography>
                <Box>
                  <Tooltip title="Copy invite link">
                    <IconButton size="small" onClick={copyRoomLink}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Leave session">
                    <IconButton size="small" onClick={disconnect} color="error">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
            
            {/* Collaborators List */}
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {/* Current user */}
              <ListItem>
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <CircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                    }
                  >
                    <Avatar sx={{ bgcolor: userColor, width: 32, height: 32 }}>
                      {userName.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={`${userName} (You)`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              
              {/* Other collaborators */}
              {collaboratorList.map((collaborator) => (
                <ListItem key={collaborator.id}>
                  <ListItemButton onClick={() => onCollaboratorSelect?.(collaborator.id)}>
                    <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <CircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                      }
                    >
                      <Avatar sx={{ bgcolor: collaborator.color, width: 32, height: 32 }}>
                        {collaborator.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={collaborator.name}
                      secondary={collaborator.selectedObject ? `Editing: ${collaborator.selectedObject}` : null}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                  {collaborator.selectedObject && (
                    <LockIcon fontSize="small" sx={{ color: collaborator.color }} />
                  )}
                </ListItem>
              ))}
            </List>
            
            {/* Object Locks */}
            {objectLocks.size > 0 && (
              <>
                <Divider />
                <Box sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Locked Objects
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {Array.from(objectLocks.values()).map((lock) => (
                      <Chip
                        key={lock.objectId}
                        size="small"
                        icon={<LockIcon />}
                        label={`${lock.objectId.substring(0, 8)}... by ${lock.userName}`}
                        sx={{ fontSize: 10 }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}
            
            {/* Chat Section */}
            <Collapse in={showChat}>
              <Divider />
              <Box sx={{ height: 200, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                  {chatMessages.map((msg, idx) => (
                    <Box
                      key={msg.id || idx}
                      sx={{
                        mb: 1,
                        textAlign: msg.type === 'system' ? 'center' : 'left'
                      }}
                    >
                      {msg.type === 'system' ? (
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                          {msg.message}
                        </Typography>
                      ) : (
                        <>
                          <Typography variant="caption" color="primary" fontWeight="bold">
                            {msg.userName}
                          </Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {msg.message}
                          </Typography>
                        </>
                      )}
                    </Box>
                  ))}
                  <div ref={chatEndRef} />
                </Box>
                <Box sx={{ p: 1, display: 'flex', gap: 1, bgcolor: 'grey.900' }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
                  />
                  <IconButton size="small" onClick={handleSendMessage} color="primary">
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Collapse>
          </>
        )}
      </Collapse>
      
      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)}>
        <DialogTitle>
          {joinRoomId ? 'Start Collaboration Session' : 'Join Session'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Your Name"
            value={joinUserName}
            onChange={(e) => setJoinUserName(e.target.value)}
            margin="normal"
            autoFocus
          />
          <TextField
            fullWidth
            label="Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            margin="normal"
            helperText={joinRoomId ? 'Share this ID with collaborators' : 'Enter room ID to join'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJoinDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleJoin}
            disabled={!joinRoomId || !joinUserName}
          >
            {joinRoomId ? 'Start' : 'Join'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

// Floating indicator for collaborator cursors in 3D space
export const CollaboratorCursors: React.FC = () => {
  const { collaborators, userId } = useCollaborationStore();
  
  // This would render 3D cursor indicators in the scene
  // Implementation depends on 3D framework (Babylon.js/Three.js)
  
  return null; // 3D rendering handled by scene integration
};

export default CollaborationPanel;
