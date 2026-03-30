import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  Slider,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  MovieFilter as MovieIcon,
} from '@mui/icons-material';
import { SceneComposition } from '../core/models/sceneComposer';

const CLIP_COLORS = [
  '#00d4ff', '#7c3aed', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#3b82f6', '#84cc16',
];

type TransitionType = 'cut' | 'fade' | 'dissolve';

interface SequenceClip {
  id: string;
  sceneId: string;
  sceneName: string;
  startTime: number;
  duration: number;
  transition: TransitionType;
  color: string;
}

interface MasterSequencerProps {
  scenes: SceneComposition[];
  onLoadScene?: (scene: SceneComposition) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${f}`;
}

function generateId(): string {
  return `clip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

export function MasterSequencer({ scenes, onLoadScene }: MasterSequencerProps) {
  const [clips, setClips] = useState<SequenceClip[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pxPerSecond, setPxPerSecond] = useState(60);
  const [dragOver, setDragOver] = useState(false);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartDuration, setResizeStartDuration] = useState(0);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const playheadRef = useRef(0);
  const clipsRef = useRef<SequenceClip[]>([]);
  const lastLoadedSceneRef = useRef<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  clipsRef.current = clips;
  playheadRef.current = playhead;

  const totalDuration = useMemo(
    () =>
      clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 10),
    [clips]
  );

  const stopPlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const tick = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const next = playheadRef.current + delta;
      const total = clipsRef.current.reduce(
        (m, c) => Math.max(m, c.startTime + c.duration),
        10
      );

      if (next >= total) {
        setPlayhead(total);
        stopPlayback();
        lastLoadedSceneRef.current = null;
        return;
      }

      setPlayhead(next);

      // Check if playhead crossed into a new clip
      const active = clipsRef.current.find(
        (c) => next >= c.startTime && next < c.startTime + c.duration
      );
      if (active && active.sceneId !== lastLoadedSceneRef.current) {
        lastLoadedSceneRef.current = active.sceneId;
        window.dispatchEvent(
          new CustomEvent('vs-sequence-load-scene', {
            detail: { sceneId: active.sceneId },
          })
        );
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [stopPlayback]
  );

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    lastTimeRef.current = 0;
    lastLoadedSceneRef.current = null;
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isPlaying, stopPlayback, tick]);

  const handleStop = useCallback(() => {
    stopPlayback();
    setPlayhead(0);
    lastLoadedSceneRef.current = null;
  }, [stopPlayback]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { sceneId } = (e as CustomEvent).detail || {};
      if (!sceneId || !onLoadScene) return;
      const found = scenes.find((s) => s.id === sceneId);
      if (found) onLoadScene(found);
    };
    window.addEventListener('vs-sequence-load-scene', handler);
    return () => window.removeEventListener('vs-sequence-load-scene', handler);
  }, [scenes, onLoadScene]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // ── Drag scene from left panel onto timeline ─────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent, sceneId: string, sceneName: string) => {
      e.dataTransfer.setData('sceneId', sceneId);
      e.dataTransfer.setData('sceneName', sceneName);
    },
    []
  );

  const handleTimelineDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const sceneId = e.dataTransfer.getData('sceneId');
      const sceneName = e.dataTransfer.getData('sceneName');
      if (!sceneId) return;

      const rect = timelineRef.current?.getBoundingClientRect();
      const offsetX = rect ? e.clientX - rect.left : 0;
      const dropTime = Math.max(0, offsetX / pxPerSecond);

      const color =
        CLIP_COLORS[
          clips.filter((c) => c.sceneId !== sceneId).length % CLIP_COLORS.length
        ] || CLIP_COLORS[0];

      const newClip: SequenceClip = {
        id: generateId(),
        sceneId,
        sceneName,
        startTime: Math.round(dropTime * 10) / 10,
        duration: 5,
        transition: 'cut',
        color,
      };
      setClips((prev) => [...prev, newClip].sort((a, b) => a.startTime - b.startTime));
    },
    [clips, pxPerSecond]
  );

  const handleAddScene = useCallback(
    (sceneId: string, sceneName: string) => {
      const last = [...clips].sort((a, b) => b.startTime + b.duration - (a.startTime + a.duration))[0];
      const start = last ? last.startTime + last.duration : 0;
      const color =
        CLIP_COLORS[clips.length % CLIP_COLORS.length];
      const newClip: SequenceClip = {
        id: generateId(),
        sceneId,
        sceneName,
        startTime: start,
        duration: 5,
        transition: 'cut',
        color,
      };
      setClips((prev) => [...prev, newClip]);
    },
    [clips]
  );

  const handleRemoveClip = useCallback((clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  }, []);

  const handleTransitionChange = useCallback(
    (clipId: string, transition: TransitionType) => {
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, transition } : c))
      );
    },
    []
  );

  // ── Resize (drag right edge) ───────────────────────────────────────────────
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, clipId: string, currentDuration: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingClipId(clipId);
      setResizeStartX(e.clientX);
      setResizeStartDuration(currentDuration);
    },
    []
  );

  useEffect(() => {
    if (!resizingClipId) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartX;
      const newDur = Math.max(1, resizeStartDuration + dx / pxPerSecond);
      setClips((prev) =>
        prev.map((c) =>
          c.id === resizingClipId
            ? { ...c, duration: Math.round(newDur * 10) / 10 }
            : c
        )
      );
    };
    const onUp = () => setResizingClipId(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingClipId, resizeStartX, resizeStartDuration, pxPerSecond]);

  // ── Playhead scrub ────────────────────────────────────────────────────────
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = Math.max(0, (e.clientX - rect.left) / pxPerSecond);
      setPlayhead(t);
    },
    [pxPerSecond]
  );

  // ── Ruler ticks ───────────────────────────────────────────────────────────
  const rulerTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = pxPerSecond >= 80 ? 1 : pxPerSecond >= 40 ? 2 : 5;
    for (let t = 0; t <= totalDuration + 5; t += step) ticks.push(t);
    return ticks;
  }, [totalDuration, pxPerSecond]);

  const timelineWidth = Math.max(600, (totalDuration + 5) * pxPerSecond);

  // ── Active clip highlight ─────────────────────────────────────────────────
  const activeClipId = useMemo(() => {
    return (
      clips.find(
        (c) => playhead >= c.startTime && playhead < c.startTime + c.duration
      )?.id ?? null
    );
  }, [clips, playhead]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      {/* ── Header controls ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, pt: 1, flexWrap: 'wrap' }}>
        <Tooltip title={isPlaying ? 'Pause' : 'Spill av sekvens'}>
          <IconButton
            onClick={handlePlay}
            size="small"
            sx={{
              bgcolor: isPlaying ? 'rgba(245,158,11,0.2)' : 'rgba(0,212,255,0.2)',
              color: isPlaying ? '#f59e0b' : '#00d4ff',
              '&:hover': { bgcolor: isPlaying ? 'rgba(245,158,11,0.35)' : 'rgba(0,212,255,0.35)' },
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Stop / Reset">
          <IconButton
            onClick={handleStop}
            size="small"
            sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}
          >
            <StopIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#00d4ff', minWidth: 70 }}>
          {formatTime(playhead)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          / {formatTime(totalDuration)}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* Zoom */}
        <Tooltip title="Zoom ut">
          <IconButton
            size="small"
            onClick={() => setPxPerSecond((z) => Math.max(20, z - 10))}
            sx={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Slider
          min={20}
          max={120}
          value={pxPerSecond}
          onChange={(_, v) => setPxPerSecond(v as number)}
          sx={{ width: 80, color: '#00d4ff' }}
          size="small"
        />
        <Tooltip title="Zoom inn">
          <IconButton
            size="small"
            onClick={() => setPxPerSecond((z) => Math.min(120, z + 10))}
            sx={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
          {clips.length} klipp
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>
        {/* ── Left: available scenes ──────────────────────────────────────── */}
        <Box
          sx={{
            width: 170,
            flexShrink: 0,
            bgcolor: 'rgba(0,0,0,0.3)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            overflowY: 'auto',
            p: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}>
            TILGJENGELIGE SCENER
          </Typography>
          {scenes.length === 0 && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
              Ingen lagrede scener ennå — lagre scener i Scener-fanen.
            </Typography>
          )}
          {scenes.map((scene, idx) => (
            <Box
              key={scene.id}
              draggable
              onDragStart={(e) => handleDragStart(e, scene.id, scene.name)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 0.5,
                px: 1,
                py: 0.75,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${CLIP_COLORS[idx % CLIP_COLORS.length]}`,
                cursor: 'grab',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <Box sx={{ overflow: 'hidden' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#fff',
                    display: 'block',
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 100,
                  }}
                >
                  {scene.name}
                </Typography>
              </Box>
              <Tooltip title="Legg til på tidslinjen">
                <IconButton
                  size="small"
                  onClick={() => handleAddScene(scene.id, scene.name)}
                  sx={{ color: CLIP_COLORS[idx % CLIP_COLORS.length], p: 0.25 }}
                >
                  <AddIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>

        {/* ── Right: timeline track area ─────────────────────────────────── */}
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Ruler */}
          <Box
            sx={{
              position: 'relative',
              height: 24,
              minWidth: timelineWidth,
              bgcolor: 'rgba(0,0,0,0.4)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            onClick={handleTimelineClick}
          >
            {rulerTicks.map((t) => (
              <Box
                key={t}
                sx={{
                  position: 'absolute',
                  left: t * pxPerSecond,
                  top: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ width: 1, height: 8, bgcolor: 'rgba(255,255,255,0.2)' }} />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1, mt: 0.25 }}
                >
                  {t}s
                </Typography>
              </Box>
            ))}
            {/* Playhead on ruler */}
            <Box
              sx={{
                position: 'absolute',
                left: playhead * pxPerSecond,
                top: 0,
                bottom: 0,
                width: 2,
                bgcolor: '#f59e0b',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          </Box>

          {/* Clip track */}
          <Box
            ref={timelineRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleTimelineDrop}
            onClick={handleTimelineClick}
            sx={{
              position: 'relative',
              height: 100,
              minWidth: timelineWidth,
              bgcolor: dragOver
                ? 'rgba(0,212,255,0.05)'
                : 'rgba(0,0,0,0.2)',
              border: dragOver
                ? '1px dashed rgba(0,212,255,0.5)'
                : '1px dashed rgba(255,255,255,0.05)',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {clips.length === 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
                  Dra scener hit eller klikk + ved siden av en scene
                </Typography>
              </Box>
            )}

            {/* Clips */}
            {clips.map((clip) => {
              const left = clip.startTime * pxPerSecond;
              const width = clip.duration * pxPerSecond;
              const isActive = clip.id === activeClipId;
              return (
                <Box
                  key={clip.id}
                  sx={{
                    position: 'absolute',
                    left,
                    top: 10,
                    width,
                    height: 70,
                    bgcolor: `${clip.color}22`,
                    border: `2px solid ${clip.color}${isActive ? 'ff' : '88'}`,
                    borderRadius: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isActive ? `0 0 10px ${clip.color}66` : 'none',
                    transition: 'box-shadow 0.2s',
                    cursor: 'default',
                    userSelect: 'none',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Clip header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.75, pt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                      <MovieIcon sx={{ fontSize: 10, color: clip.color, flexShrink: 0 }} />
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600, maxWidth: width - 50 }}
                      >
                        {clip.sceneName}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleRemoveClip(clip.id); }}
                      sx={{ color: 'rgba(255,255,255,0.4)', p: 0.1, '&:hover': { color: '#ef4444' } }}
                    >
                      <DeleteIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                  </Box>

                  {/* Duration display */}
                  <Box sx={{ px: 0.75, pb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                      {clip.duration.toFixed(1)}s
                    </Typography>
                  </Box>

                  {/* Resize handle (right edge) */}
                  <Box
                    onMouseDown={(e) => handleResizeMouseDown(e, clip.id, clip.duration)}
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 8,
                      cursor: 'ew-resize',
                      bgcolor: `${clip.color}44`,
                      '&:hover': { bgcolor: `${clip.color}99` },
                    }}
                  />
                </Box>
              );
            })}

            {/* Transition badges between clips */}
            {clips
              .slice()
              .sort((a, b) => a.startTime - b.startTime)
              .map((clip, idx, sorted) => {
                if (idx === 0) return null;
                const prev = sorted[idx - 1];
                const gapStart = prev.startTime + prev.duration;
                const x = gapStart * pxPerSecond - 2;
                return (
                  <Tooltip
                    key={`tr-${clip.id}`}
                    title={`Overgang: ${clip.transition}`}
                    placement="top"
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: x,
                        top: 22,
                        zIndex: 5,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={clip.transition}
                        onChange={(e) =>
                          handleTransitionChange(clip.id, e.target.value as TransitionType)
                        }
                        size="small"
                        variant="standard"
                        sx={{
                          fontSize: '0.55rem',
                          color: 'rgba(255,255,255,0.6)',
                          '& .MuiSelect-select': { py: 0, px: 0.5 },
                          '& .MuiSelect-icon': { display: 'none' },
                          minWidth: 48,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          borderRadius: 0.5,
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        <MenuItem value="cut">Kutt</MenuItem>
                        <MenuItem value="fade">Fade</MenuItem>
                        <MenuItem value="dissolve">Dissolve</MenuItem>
                      </Select>
                    </Box>
                  </Tooltip>
                );
              })}

            {/* Playhead line */}
            <Box
              sx={{
                position: 'absolute',
                left: playhead * pxPerSecond,
                top: 0,
                bottom: 0,
                width: 2,
                bgcolor: '#f59e0b',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -4,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid #f59e0b',
                }}
              />
            </Box>
          </Box>

          {/* Clip details row */}
          {clips.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                px: 1,
                py: 0.75,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                minHeight: 36,
              }}
            >
              {clips
                .slice()
                .sort((a, b) => a.startTime - b.startTime)
                .map((clip) => (
                  <Chip
                    key={clip.id}
                    label={`${clip.sceneName} · ${clip.startTime.toFixed(1)}s`}
                    size="small"
                    sx={{
                      bgcolor: `${clip.color}22`,
                      color: clip.color,
                      border: `1px solid ${clip.color}55`,
                      fontSize: '0.6rem',
                      height: 20,
                    }}
                  />
                ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Status bar */}
      <Box
        sx={{
          px: 2,
          py: 0.5,
          bgcolor: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
          {isPlaying ? '▶ Spiller av…' : '⏹ Klar'}
        </Typography>
        {activeClipId && (
          <Typography variant="caption" sx={{ color: '#00d4ff', fontSize: '0.65rem' }}>
            Aktiv scene: {clips.find((c) => c.id === activeClipId)?.sceneName}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>
          Total varighet: {formatTime(totalDuration)}
        </Typography>
      </Box>
    </Box>
  );
}
