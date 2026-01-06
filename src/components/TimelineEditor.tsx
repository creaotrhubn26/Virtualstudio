import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Checkbox,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Flag as FlagIcon,
  Loop as LoopIcon,
  GridOn as GridIcon,
  SelectAll as SelectAllIcon,
} from '@mui/icons-material';
import { TimelineManager } from '../core/timeline/TimelineManager';
import { TimelineData, Keyframe } from '../core/models/sceneComposer';

interface TimelineEditorProps {
  timeline: TimelineData | undefined;
  onTimelineChange: (timeline: TimelineData) => void;
  onTimeUpdate?: (time: number) => void;
}

type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';

export function TimelineEditor({ timeline, onTimelineChange, onTimeUpdate }: TimelineEditorProps) {
  const [timelineManager] = useState(() => {
    const manager = new TimelineManager(timeline);
    return manager;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(timeline?.duration || 60);
  const [zoom, setZoom] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(duration);
  const [isLooping, setIsLooping] = useState(false);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set());
  const [copiedKeyframes, setCopiedKeyframes] = useState<Keyframe[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1); // seconds
  const [markers, setMarkers] = useState<Array<{ time: number; label: string; color: string }>>([]);
  const [regions, setRegions] = useState<Array<{ start: number; end: number; name: string; color: string }>>([]);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [newMarkerTime, setNewMarkerTime] = useState(0);
  const [newMarkerLabel, setNewMarkerLabel] = useState('');
  const [newRegionStart, setNewRegionStart] = useState(0);
  const [newRegionEnd, setNewRegionEnd] = useState(10);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionColor, setNewRegionColor] = useState('#00d4ff');
  const [easingDialogOpen, setEasingDialogOpen] = useState(false);
  const [selectedEasingKeyframes, setSelectedEasingKeyframes] = useState<Keyframe[]>([]);
  const [easingType, setEasingType] = useState<EasingType>('linear');

  const timelineRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);

  useEffect(() => {
    if (timeline) {
      timelineManager.setTimeline(timeline);
      setDuration(timeline.duration);
    }
  }, [timeline, timelineManager]);

  useEffect(() => {
    timelineManager.onUpdate((time) => {
      setCurrentTime(time);
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
    });

    timelineManager.onComplete(() => {
      setIsPlaying(false);
      if (isLooping) {
        timelineManager.seek(loopStart);
        timelineManager.play();
      }
    });

    return () => {
      timelineManager.dispose();
    };
  }, [timelineManager, onTimeUpdate, isLooping, loopStart]);

  const handlePlay = () => {
    if (isPlaying) {
      timelineManager.pause();
      setIsPlaying(false);
    } else {
      if (isLooping && currentTime >= loopEnd) {
        timelineManager.seek(loopStart);
      }
      timelineManager.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    timelineManager.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (time: number) => {
    const snappedTime = snapToGrid ? Math.round(time / gridSize) * gridSize : time;
    const clampedTime = Math.max(0, Math.min(snappedTime, duration));
    timelineManager.seek(clampedTime);
    setCurrentTime(clampedTime);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.5, 10));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.5, 0.1));
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // Note: TimelineManager doesn't support speed directly, would need to be implemented
  };

  const handleAddMarker = () => {
    if (newMarkerLabel.trim()) {
      setMarkers([...markers, { time: newMarkerTime, label: newMarkerLabel, color: '#00d4ff' }]);
      setMarkerDialogOpen(false);
      setNewMarkerLabel('');
    }
  };

  const handleAddRegion = () => {
    if (newRegionName.trim() && newRegionEnd > newRegionStart) {
      setRegions([...regions, {
        start: newRegionStart,
        end: newRegionEnd,
        name: newRegionName,
        color: newRegionColor,
      }]);
      setRegionDialogOpen(false);
      setNewRegionName('');
    }
  };

  const handleCopyKeyframes = () => {
    if (selectedKeyframes.size > 0 && timeline) {
      const keyframes = timeline.keyframes.filter(kf => {
        const key = `${kf.time}-${kf.targetId}-${kf.type}`;
        return selectedKeyframes.has(key);
      });
      setCopiedKeyframes(keyframes);
    }
  };

  const handlePasteKeyframes = () => {
    if (copiedKeyframes.length > 0 && timeline) {
      const newKeyframes = copiedKeyframes.map(kf => ({
        ...kf,
        time: currentTime + (kf.time - copiedKeyframes[0].time),
      }));
      const updatedTimeline: TimelineData = {
        ...timeline,
        keyframes: [...timeline.keyframes, ...newKeyframes],
      };
      onTimelineChange(updatedTimeline);
    }
  };

  const handleApplyEasing = () => {
    if (selectedEasingKeyframes.length > 0 && timeline) {
      // Apply easing to selected keyframes
      // This would need to be implemented in TimelineManager
      setEasingDialogOpen(false);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = percent * duration;
    handleSeek(time);
  };

  const handleTimelineDrag = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const time = percent * duration;
    handleSeek(time);
  }, [duration]);

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    handleTimelineClick(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleTimelineDrag(e);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    if (isDragging.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleTimelineDrag]);

  const snapTime = (time: number): number => {
    return snapToGrid ? Math.round(time / gridSize) * gridSize : time;
  };

  const timeToPosition = (time: number): number => {
    return (time / duration) * 100;
  };

  const positionToTime = (position: number): number => {
    return (position / 100) * duration;
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}>
      {/* Timeline Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
        <IconButton
          onClick={handlePlay}
          sx={{
            color: '#00d4ff',
            bgcolor: 'rgba(0,212,255,0.1)',
            '&:hover': { bgcolor: 'rgba(0,212,255,0.2)' },
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton
          onClick={handleStop}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <StopIcon />
        </IconButton>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        <IconButton onClick={handleZoomIn} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <ZoomInIcon />
        </IconButton>
        <IconButton onClick={handleZoomOut} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          <ZoomOutIcon />
        </IconButton>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Hastighet</InputLabel>
          <Select
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            label="Hastighet"
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            }}
          >
            <MenuItem value={0.25}>0.25x</MenuItem>
            <MenuItem value={0.5}>0.5x</MenuItem>
            <MenuItem value={1}>1x</MenuItem>
            <MenuItem value={2}>2x</MenuItem>
            <MenuItem value={4}>4x</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            checked={isLooping}
            onChange={(e) => setIsLooping(e.target.checked)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Loop
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Snap to Grid
          </Typography>
        </Box>

        <Button
          size="small"
          startIcon={<FlagIcon />}
          onClick={() => {
            setNewMarkerTime(currentTime);
            setMarkerDialogOpen(true);
          }}
          sx={{ color: '#00d4ff' }}
        >
          Marker
        </Button>

        <Button
          size="small"
          startIcon={<CopyIcon />}
          onClick={handleCopyKeyframes}
          disabled={selectedKeyframes.size === 0}
          sx={{ color: '#00d4ff' }}
        >
          Kopier
        </Button>

        <Button
          size="small"
          startIcon={<PasteIcon />}
          onClick={handlePasteKeyframes}
          disabled={copiedKeyframes.length === 0}
          sx={{ color: '#00d4ff' }}
        >
          Lim inn
        </Button>
      </Box>

      {/* Timeline Ruler */}
      <Box
        ref={timelineRef}
        sx={{
          position: 'relative',
          height: 200,
          bgcolor: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 1,
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseDown={handleTimelineMouseDown}
      >
        {/* Grid lines */}
        {snapToGrid && Array.from({ length: Math.ceil(duration / gridSize) + 1 }).map((_, i) => {
          const time = i * gridSize;
          const position = timeToPosition(time);
          return (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                left: `${position}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                bgcolor: 'rgba(255,255,255,0.1)',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {/* Regions */}
        {regions.map((region, i) => {
          const startPos = timeToPosition(region.start);
          const endPos = timeToPosition(region.end);
          const width = endPos - startPos;
          return (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                left: `${startPos}%`,
                top: 0,
                bottom: 0,
                width: `${width}%`,
                bgcolor: `${region.color}40`,
                borderLeft: `2px solid ${region.color}`,
                borderRight: `2px solid ${region.color}`,
                pointerEvents: 'none',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  color: region.color,
                  fontSize: '10px',
                }}
              >
                {region.name}
              </Typography>
            </Box>
          );
        })}

        {/* Markers */}
        {markers.map((marker, i) => {
          const position = timeToPosition(marker.time);
          return (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                left: `${position}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                bgcolor: marker.color,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  color: marker.color,
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {marker.label}
              </Typography>
            </Box>
          );
        })}

        {/* Keyframes */}
        {timeline?.keyframes.map((kf, i) => {
          const position = timeToPosition(kf.time);
          const key = `${kf.time}-${kf.targetId}-${kf.type}`;
          const isSelected = selectedKeyframes.has(key);
          return (
            <Box
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                const newSelected = new Set(selectedKeyframes);
                if (e.ctrlKey || e.metaKey) {
                  if (newSelected.has(key)) {
                    newSelected.delete(key);
                  } else {
                    newSelected.add(key);
                  }
                } else {
                  newSelected.clear();
                  newSelected.add(key);
                }
                setSelectedKeyframes(newSelected);
              }}
              sx={{
                position: 'absolute',
                left: `${position}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 12,
                height: 12,
                bgcolor: isSelected ? '#00d4ff' : '#ffb800',
                border: `2px solid ${isSelected ? '#00d4ff' : '#ffb800'}`,
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 20,
                '&:hover': {
                  transform: 'translate(-50%, -50%) scale(1.5)',
                },
              }}
            />
          );
        })}

        {/* Playhead */}
        <Box
          sx={{
            position: 'absolute',
            left: `${timeToPosition(currentTime)}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            bgcolor: '#00d4ff',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: 16,
              height: 16,
              bgcolor: '#00d4ff',
              borderRadius: '50%',
            }}
          />
        </Box>

        {/* Time labels */}
        {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => {
          const time = i * 5;
          const position = timeToPosition(time);
          return (
            <Typography
              key={i}
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 4,
                left: `${position}%`,
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '10px',
                pointerEvents: 'none',
              }}
            >
              {time}s
            </Typography>
          );
        })}
      </Box>

      {/* Current time display */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {currentTime.toFixed(2)}s / {duration}s
        </Typography>
        {isLooping && (
          <Typography variant="body2" sx={{ color: '#00d4ff' }}>
            Loop: {loopStart.toFixed(1)}s - {loopEnd.toFixed(1)}s
          </Typography>
        )}
      </Box>

      {/* Loop controls */}
      {isLooping && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 80 }}>
            Loop Start:
          </Typography>
          <Slider
            value={loopStart}
            onChange={(_, value) => {
              const newStart = Array.isArray(value) ? value[0] : value;
              setLoopStart(Math.min(newStart, loopEnd - 1));
            }}
            min={0}
            max={duration}
            step={0.1}
            sx={{ flex: 1 }}
          />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 80 }}>
            Loop End:
          </Typography>
          <Slider
            value={loopEnd}
            onChange={(_, value) => {
              const newEnd = Array.isArray(value) ? value[0] : value;
              setLoopEnd(Math.max(newEnd, loopStart + 1));
            }}
            min={0}
            max={duration}
            step={0.1}
            sx={{ flex: 1 }}
          />
        </Box>
      )}

      {/* Marker Dialog */}
      <Dialog
        open={markerDialogOpen}
        onClose={() => setMarkerDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Legg til Marker</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tid (sekunder)"
            type="number"
            fullWidth
            variant="outlined"
            value={newMarkerTime}
            onChange={(e) => setNewMarkerTime(Number(e.target.value))}
            sx={{
              mb: 2,
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
          <TextField
            margin="dense"
            label="Label"
            fullWidth
            variant="outlined"
            value={newMarkerLabel}
            onChange={(e) => setNewMarkerLabel(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkerDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Avbryt
          </Button>
          <Button
            onClick={handleAddMarker}
            variant="contained"
            sx={{ bgcolor: '#00d4ff', color: '#000' }}
          >
            Legg til
          </Button>
        </DialogActions>
      </Dialog>

      {/* Region Dialog */}
      <Dialog
        open={regionDialogOpen}
        onClose={() => setRegionDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1c2128',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>Legg til Region</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Navn"
            fullWidth
            variant="outlined"
            value={newRegionName}
            onChange={(e) => setNewRegionName(e.target.value)}
            sx={{
              mb: 2,
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
          <TextField
            margin="dense"
            label="Start (sekunder)"
            type="number"
            fullWidth
            variant="outlined"
            value={newRegionStart}
            onChange={(e) => setNewRegionStart(Number(e.target.value))}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
          <TextField
            margin="dense"
            label="Slutt (sekunder)"
            type="number"
            fullWidth
            variant="outlined"
            value={newRegionEnd}
            onChange={(e) => setNewRegionEnd(Number(e.target.value))}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
          <TextField
            margin="dense"
            label="Farge"
            type="color"
            fullWidth
            variant="outlined"
            value={newRegionColor}
            onChange={(e) => setNewRegionColor(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegionDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Avbryt
          </Button>
          <Button
            onClick={handleAddRegion}
            variant="contained"
            sx={{ bgcolor: '#00d4ff', color: '#000' }}
          >
            Legg til
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

