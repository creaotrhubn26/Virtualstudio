/**
 * Live Streaming Panel
 * UI for broadcast control, recording, and stream configuration
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Divider,
  Collapse,
  Chip,
  Switch,
  FormControlLabel,
  LinearProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
//
import {
  Videocam as StreamIcon,
  VideocamOff as StopStreamIcon,
  FiberManualRecord as RecordIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewersIcon,
  Speed as BitrateIcon,
  Timer as DurationIcon,
  SignalCellularAlt as QualityIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  Download as DownloadIcon,
  Tv as NDIIcon
} from '@mui/icons-material';
import { useStreamingStore, STREAM_PRESETS, StreamDestination, getSupportedCodecs } from '../services/streamingService';

interface LiveStreamingPanelProps {
  canvas?: HTMLCanvasElement | null;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

// Format duration as HH:MM:SS
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Format bytes
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// Format bitrate
const formatBitrate = (bps: number): string => {
  if (bps < 1000) return `${bps.toFixed(0)} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${(bps / 1000000).toFixed(1)} Mbps`;
};

export const LiveStreamingPanel: React.FC<LiveStreamingPanelProps> = ({
  canvas,
  onStreamStart,
  onStreamEnd
}) => {
  const {
    config,
    isStreaming,
    isRecording,
    isPreviewing,
    stats,
    setConfig,
    setQuality,
    startPreview,
    stopPreview,
    startStream,
    stopStream,
    startRecording,
    stopRecording
  } = useStreamingStore();
  
  const [expanded, setExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  
  const handleStartStream = async () => {
    if (!canvas) {
      setError('Canvas not available');
      return;
    }
    
    setError(null);
    try {
      await startStream(canvas);
      onStreamStart?.();
    } catch (e) {
      setError('Failed to start stream');
    }
  };
  
  const handleStopStream = () => {
    stopStream();
    onStreamEnd?.();
  };
  
  const handleStartRecording = async () => {
    if (!canvas) {
      setError('Canvas not available');
      return;
    }
    
    setError(null);
    try {
      await startRecording(canvas);
    } catch (e) {
      setError('Failed to start recording');
    }
  };
  
  const handleStopRecording = async () => {
    try {
      const blob = await stopRecording();
      setRecordingBlob(blob);
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to stop recording');
    }
  };
  
  const copyShareLink = () => {
    const link = `${window.location.origin}/live/${config.streamKey || 'default'}`;
    navigator.clipboard.writeText(link);
  };
  
  const supportedCodecs = getSupportedCodecs();
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 100,
        right: 16,
        width: 320,
        maxHeight: 'calc(100vh - 200px)',
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
          bgcolor: isStreaming ? 'error.dark' : isRecording ? 'warning.dark' : 'grey.800',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isStreaming ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'error.main',
                  animation: 'pulse 1s infinite'
                }}
              />
              <Typography variant="subtitle1" fontWeight="bold">LIVE</Typography>
            </Box>
          ) : (
            <>
              <StreamIcon />
              <Typography variant="subtitle1" fontWeight="bold">
                Live Streaming
              </Typography>
            </>
          )}
          {isRecording && !isStreaming && (
            <Chip
              size="small"
              icon={<RecordIcon />}
              label="REC"
              color="error"
              sx={{ height: 20 }}
            />
          )}
        </Box>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {/* Stream Stats (when streaming) */}
          {isStreaming && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.900', borderRadius: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DurationIcon fontSize="small" color="primary" />
                    <Typography variant="caption">{formatDuration(stats.duration)}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ViewersIcon fontSize="small" color="primary" />
                    <Typography variant="caption">{stats.viewers} viewers</Typography>
                  </Box>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BitrateIcon fontSize="small" color="primary" />
                    <Typography variant="caption">{formatBitrate(stats.currentBitrate)}</Typography>
                  </Box>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <QualityIcon fontSize="small" color="primary" />
                    <Typography variant="caption">{formatBytes(stats.bytesTransferred)}</Typography>
                  </Box>
                </Box>
              </Box>
              {stats.droppedFrames > 0 && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                  ⚠️ {stats.droppedFrames} dropped frames
                </Typography>
              )}
            </Box>
          )}
          
          {/* Main Controls */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {!isStreaming ? (
              <Button
                variant="contained"
                color="error"
                startIcon={<StreamIcon />}
                onClick={handleStartStream}
                disabled={!canvas}
                fullWidth
              >
                Go Live
              </Button>
            ) : (
              <Button
                variant="contained"
                color="inherit"
                startIcon={<StopStreamIcon />}
                onClick={handleStopStream}
                fullWidth
              >
                End Stream
              </Button>
            )}
          </Box>
          
          {/* Recording Controls */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {!isRecording ? (
              <Button
                variant="outlined"
                color="error"
                startIcon={<RecordIcon />}
                onClick={handleStartRecording}
                disabled={!canvas || isStreaming}
                fullWidth
              >
                Record
              </Button>
            ) : (
              <Button
                variant="contained"
                color="warning"
                startIcon={<StopIcon />}
                onClick={handleStopRecording}
                fullWidth
              >
                Stop Recording
              </Button>
            )}
          </Box>
          
          {/* Share Button */}
          {isStreaming && (
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={() => setShowShareDialog(true)}
              fullWidth
              sx={{ mb: 2 }}
            >
              Share Stream
            </Button>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Settings Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Typography variant="body2" fontWeight="medium">
              <SettingsIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Stream Settings
            </Typography>
            {showSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </Box>
          
          <Collapse in={showSettings}>
            <Box sx={{ mt: 2 }}>
              {/* Destination */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Destination</InputLabel>
                <Select
                  value={config.destination}
                  onChange={(e) => setConfig({ destination: e.target.value as StreamDestination })}
                  label="Destination"
                  disabled={isStreaming}
                >
                  <MenuItem value="local">Local Preview</MenuItem>
                  <MenuItem value="webrtc">WebRTC (Browser)</MenuItem>
                  <MenuItem value="rtmp">RTMP (YouTube/Twitch)</MenuItem>
                  <MenuItem value="ndi">NDI Output</MenuItem>
                  <MenuItem value="srt">SRT Protocol</MenuItem>
                </Select>
              </FormControl>
              
              {/* RTMP/SRT URL & Key */}
              {(config.destination === 'rtmp' || config.destination === 'srt') && (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label="Server URL"
                    value={streamUrl}
                    onChange={(e) => {
                      setStreamUrl(e.target.value);
                      setConfig({ url: e.target.value });
                    }}
                    placeholder="rtmp://live.twitch.tv/app"
                    disabled={isStreaming}
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Stream Key"
                    value={streamKey}
                    onChange={(e) => {
                      setStreamKey(e.target.value);
                      setConfig({ streamKey: e.target.value });
                    }}
                    type="password"
                    disabled={isStreaming}
                    sx={{ mb: 2 }}
                  />
                </>
              )}
              
              {/* NDI Info */}
              {config.destination === 'ndi' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    NDI output requires the NDI Bridge Server running locally on port 9000.
                  </Typography>
                </Alert>
              )}
              
              {/* Quality Preset */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={Object.keys(STREAM_PRESETS).find(
                    k => STREAM_PRESETS[k].width === config.quality.width &&
                         STREAM_PRESETS[k].frameRate === config.quality.frameRate
                  ) || '1080p30'}
                  onChange={(e) => setQuality(e.target.value)}
                  label="Quality"
                  disabled={isStreaming}
                >
                  {Object.entries(STREAM_PRESETS).map(([key, preset]) => (
                    <MenuItem key={key} value={key}>
                      {preset.name} ({formatBitrate(preset.bitrate)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Audio */}
              <FormControlLabel
                control={
                  <Switch
                    checked={config.audioEnabled}
                    onChange={(e) => setConfig({ audioEnabled: e.target.checked })}
                    disabled={isStreaming}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {config.audioEnabled ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                    <Typography variant="body2">Include Audio</Typography>
                  </Box>
                }
              />
              
              {config.audioEnabled && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Audio Source</InputLabel>
                  <Select
                    value={config.audioSource}
                    onChange={(e) => setConfig({ audioSource: e.target.value as any })}
                    label="Audio Source"
                    disabled={isStreaming}
                  >
                    <MenuItem value="microphone">Microphone</MenuItem>
                    <MenuItem value="system">System Audio</MenuItem>
                    <MenuItem value="both">Both</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {/* Codec Info */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Supported Codecs: {supportedCodecs.join(', ')}
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </Collapse>
      
      {/* Share Dialog */}
      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)}>
        <DialogTitle>Share Your Stream</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Share this link with viewers:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={`${window.location.origin}/live/${config.streamKey || 'default'}`}
              InputProps={{ readOnly: true }}
            />
            <IconButton onClick={copyShareLink}>
              <CopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Paper>
  );
};

export default LiveStreamingPanel;
