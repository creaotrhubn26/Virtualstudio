/**
 * MultiviewSkeletonPanel
 *
 * 2×2 multiview grid med interaktivt skjelett-overlay for karakter-posering.
 * Bruker live skelettdata fra useSkeletalAnimationStore (Babylon.js rigs).
 *
 * Layout-modus:
 *   - '2x2'       — fire visninger i grid
 *   - 'single'    — én valgt visning fullskjerm
 *   - 'pip'       — én stor visning + tre mini i hjørnet
 *
 * Beinvalg og rotasjonsjusteringer synkroniseres direkte med live skeleton via
 * storySceneLoaderService.applyBoneOverridesToRig().
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Close,
  AccessibilityNew,
  CameraAlt,
  RestartAlt,
  GridView,
  Fullscreen,
  PictureInPicture,
} from '@mui/icons-material';
import { ALL_POSES, PosePreset, PoseData, BONE_NAMES } from '../core/animation/PoseLibrary';
import { StoryCharacterManifest } from '../data/scenarioPresets';
import { BoneInspectorSidebar } from './BoneInspectorSidebar';
import { useSkeletalAnimationStore } from '../services/skeletalAnimationService';
import { storySceneLoaderService } from '../services/storySceneLoaderService';

// ── Babylon SkeletonViewer integration helpers ────────────────────────────────
// We reference BABYLON from window.virtualStudio.scene rather than importing
// to avoid circular dependencies and keep the panel tree-shakeable.

function activateBabylonSkeletonViewers(enabled: boolean): void {
  const vs = (window as any).virtualStudio;
  if (!vs?.scene) return;
  const scene = vs.scene;

  // Dispose existing viewers first
  if (!enabled) {
    if ((window as any).__storySkeletonViewers) {
      ((window as any).__storySkeletonViewers as any[]).forEach((sv: any) => {
        try { sv.dispose?.(); } catch {}
      });
      (window as any).__storySkeletonViewers = [];
    }
    return;
  }

  const viewers: any[] = [];
  const BABYLON = (window as any).BABYLON;
  if (!BABYLON?.SkeletonViewer) return;

  scene.skeletons?.forEach((skeleton: any) => {
    try {
      const meshes = scene.meshes.filter((m: any) => m.skeleton === skeleton);
      if (meshes.length === 0) return;
      const sv = new BABYLON.SkeletonViewer(skeleton, meshes[0], scene, true, meshes[0].renderingGroupId + 1, {
        pauseAnimations: false,
        returnToRest: false,
        computeBonesUsingShaders: false,
        displayMode: BABYLON.SkeletonViewer.DISPLAY_LINES,
      });
      sv.isEnabled = true;
      viewers.push(sv);
    } catch (err) {
      console.warn('[SkeletonViewer] Could not create viewer for skeleton:', err);
    }
  });

  (window as any).__storySkeletonViewers = viewers;
  console.log(`[MultiviewPanel] SkeletonViewer: activated ${viewers.length} viewer(s)`);
}

// ============================================================================
// Types
// ============================================================================

export interface ActiveCharacterPose {
  characterId: string;
  label: string;
  avatarType: string;
  poseId: string;
  boneOverrides: Record<string, { x: number; y: number; z: number }>;
  rigId?: string;
}

type LayoutMode = '2x2' | 'single' | 'pip';

interface ViewConfig {
  id: string;
  labelNorsk: string;
  cameraAngle: 'front' | 'side-left' | 'three-quarter' | 'back';
}

const VIEWS: ViewConfig[] = [
  { id: 'front',        labelNorsk: 'Fremre',      cameraAngle: 'front'        },
  { id: 'side',         labelNorsk: 'Side',        cameraAngle: 'side-left'    },
  { id: 'threequarter', labelNorsk: 'Perspektiv',  cameraAngle: 'three-quarter'},
  { id: 'back',         labelNorsk: 'Bakfra',      cameraAngle: 'back'         },
];

// ============================================================================
// SVG Skeleton constants
// ============================================================================

const VW = 160;
const VH = 340;

interface Joint { id: string; boneName: string; x: number; y: number; }
interface SkeletonEdge { from: string; to: string; }

function getSkeletonJoints(view: ViewConfig['cameraAngle'], _pose: PoseData): Joint[] {
  const base: Joint[] = [
    { id: 'head',       boneName: BONE_NAMES.HEAD,           x: 80,  y: 28  },
    { id: 'neck',       boneName: BONE_NAMES.NECK,           x: 80,  y: 52  },
    { id: 'lshoulder',  boneName: BONE_NAMES.LEFT_SHOULDER,  x: 56,  y: 70  },
    { id: 'rshoulder',  boneName: BONE_NAMES.RIGHT_SHOULDER, x: 104, y: 70  },
    { id: 'lelbow',     boneName: BONE_NAMES.LEFT_ARM,       x: 44,  y: 108 },
    { id: 'relbow',     boneName: BONE_NAMES.RIGHT_ARM,      x: 116, y: 108 },
    { id: 'lwrist',     boneName: BONE_NAMES.LEFT_FOREARM,   x: 38,  y: 144 },
    { id: 'rwrist',     boneName: BONE_NAMES.RIGHT_FOREARM,  x: 122, y: 144 },
    { id: 'spine',      boneName: BONE_NAMES.SPINE,          x: 80,  y: 82  },
    { id: 'hips',       boneName: BONE_NAMES.HIPS,           x: 80,  y: 148 },
    { id: 'lhip',       boneName: BONE_NAMES.LEFT_UP_LEG,    x: 67,  y: 164 },
    { id: 'rhip',       boneName: BONE_NAMES.RIGHT_UP_LEG,   x: 93,  y: 164 },
    { id: 'lknee',      boneName: BONE_NAMES.LEFT_LEG,       x: 63,  y: 218 },
    { id: 'rknee',      boneName: BONE_NAMES.RIGHT_LEG,      x: 97,  y: 218 },
    { id: 'lankle',     boneName: BONE_NAMES.LEFT_FOOT,      x: 60,  y: 270 },
    { id: 'rankle',     boneName: BONE_NAMES.RIGHT_FOOT,     x: 100, y: 270 },
  ];

  if (view === 'side-left') {
    return base.map(j => ({ ...j, x: 80 + (j.x - 80) * 0.18 }));
  }
  if (view === 'back') {
    return base.map(j => ({ ...j, x: VW - j.x }));
  }
  if (view === 'three-quarter') {
    return base.map(j => ({ ...j, x: j.x + (j.x - 80) * 0.38 }));
  }
  return base;
}

const EDGES: SkeletonEdge[] = [
  { from: 'head',     to: 'neck'      },
  { from: 'neck',     to: 'lshoulder' },
  { from: 'neck',     to: 'rshoulder' },
  { from: 'lshoulder',to: 'lelbow'    },
  { from: 'rshoulder',to: 'relbow'    },
  { from: 'lelbow',   to: 'lwrist'    },
  { from: 'relbow',   to: 'rwrist'    },
  { from: 'neck',     to: 'spine'     },
  { from: 'spine',    to: 'hips'      },
  { from: 'hips',     to: 'lhip'      },
  { from: 'hips',     to: 'rhip'      },
  { from: 'lhip',     to: 'lknee'     },
  { from: 'rhip',     to: 'rknee'     },
  { from: 'lknee',    to: 'lankle'    },
  { from: 'rknee',    to: 'rankle'    },
];

const VIEW_BG: Record<ViewConfig['cameraAngle'], string> = {
  'front':         '#111827',
  'side-left':     '#1a1127',
  'three-quarter': '#112718',
  'back':          '#271118',
};

const VIEW_LABEL_COLOR: Record<ViewConfig['cameraAngle'], string> = {
  'front':         '#64b5f6',
  'side-left':     '#ce93d8',
  'three-quarter': '#80cbc4',
  'back':          '#f48fb1',
};

// ============================================================================
// Single skeleton viewport
// ============================================================================

interface SkeletonViewProps {
  view: ViewConfig;
  character: ActiveCharacterPose;
  selectedBone: string | null;
  onSelectBone: (boneName: string) => void;
  compact?: boolean;
  showSkeleton?: boolean;
}

const SkeletonView: React.FC<SkeletonViewProps> = ({
  view, character, selectedBone, onSelectBone, compact = false, showSkeleton = true,
}) => {
  const pose = useMemo(() => {
    const base = ALL_POSES.find(p => p.id === character.poseId)?.pose ?? {};
    return { ...base, ...character.boneOverrides };
  }, [character.poseId, character.boneOverrides]);

  const joints = useMemo(() => getSkeletonJoints(view.cameraAngle, pose), [view.cameraAngle, pose]);
  const jointMap = useMemo(() => {
    const m: Record<string, Joint> = {};
    joints.forEach(j => { m[j.id] = j; });
    return m;
  }, [joints]);

  const labelColor = VIEW_LABEL_COLOR[view.cameraAngle];

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: VIEW_BG[view.cameraAngle], overflow: 'hidden' }}>
      {/* Camera label */}
      <Box sx={{ position: 'absolute', top: 6, left: 8, zIndex: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CameraAlt sx={{ fontSize: compact ? 9 : 11, color: labelColor }} />
        <Typography sx={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: labelColor, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {view.labelNorsk}
        </Typography>
      </Box>

      {/* Live rig indicator */}
      {character.rigId && (
        <Box sx={{ position: 'absolute', top: 6, right: 8, zIndex: 2 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50' }} />
        </Box>
      )}

      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {/* Subtle grid */}
        <line x1={VW/2} y1={0} x2={VW/2} y2={VH} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        <line x1={0} y1={VH/2} x2={VW} y2={VH/2} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

        {/* Ground shadow */}
        <ellipse cx={VW/2} cy={VH - 16} rx={28} ry={5} fill="rgba(255,255,255,0.05)" />

        {/* Skeleton edges */}
        {showSkeleton && EDGES.map(edge => {
          const a = jointMap[edge.from];
          const b = jointMap[edge.to];
          if (!a || !b) return null;
          const isSel = selectedBone && (a.boneName === selectedBone || b.boneName === selectedBone);
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isSel ? '#ff9800' : 'rgba(255,255,255,0.6)'}
              strokeWidth={isSel ? 2.5 : 1.8}
              strokeLinecap="round"
            />
          );
        })}

        {/* Joints */}
        {showSkeleton && joints.map(joint => {
          const isSel = selectedBone === joint.boneName;
          const hasOverride = Boolean(character.boneOverrides[joint.boneName]);
          return (
            <g key={joint.id} style={{ cursor: 'pointer' }} onClick={() => onSelectBone(joint.boneName)}>
              <circle
                cx={joint.x} cy={joint.y}
                r={isSel ? 7 : hasOverride ? 5.5 : 4.5}
                fill={isSel ? '#ff9800' : hasOverride ? '#ffcc80' : '#fff'}
                stroke={isSel ? '#ff6d00' : 'rgba(255,255,255,0.25)'}
                strokeWidth={isSel ? 2 : 1}
                opacity={isSel ? 1 : 0.85}
              />
              {isSel && (
                <circle cx={joint.x} cy={joint.y} r={11} fill="none" stroke="#ff9800" strokeWidth={1.5} opacity={0.45} strokeDasharray="3 2" />
              )}
            </g>
          );
        })}

        {/* Head circle */}
        {showSkeleton && <circle
          cx={jointMap['head']?.x ?? 80}
          cy={jointMap['head']?.y ?? 17}
          r={compact ? 11 : 14}
          fill="none"
          stroke={selectedBone === BONE_NAMES.HEAD ? '#ff9800' : 'rgba(255,255,255,0.4)'}
          strokeWidth={selectedBone === BONE_NAMES.HEAD ? 2.5 : 1.5}
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectBone(BONE_NAMES.HEAD)}
        />}
      </svg>
    </Box>
  );
};

// ============================================================================
// Main Panel
// ============================================================================

interface MultiviewSkeletonPanelProps {
  open: boolean;
  onClose: () => void;
  characters: StoryCharacterManifest[];
  sceneName: string;
}

export const MultiviewSkeletonPanel: React.FC<MultiviewSkeletonPanelProps> = ({
  open, onClose, characters, sceneName,
}) => {
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('2x2');
  const [singleViewId, setSingleViewId] = useState<string>('front');
  const [skeletonOverlayEnabled, setSkeletonOverlayEnabled] = useState(true);
  const [poseStates, setPoseStates] = useState<Record<string, ActiveCharacterPose>>(() => {
    const init: Record<string, ActiveCharacterPose> = {};
    characters.forEach(c => {
      init[c.id] = {
        characterId: c.id,
        label: c.label,
        avatarType: c.avatarType,
        poseId: c.poseId,
        boneOverrides: {},
      };
    });
    return init;
  });

  const { rigs, activeRigId } = useSkeletalAnimationStore();

  // Activate/deactivate Babylon SkeletonViewer on the main scene canvas
  useEffect(() => {
    if (!open) {
      activateBabylonSkeletonViewers(false);
      return;
    }
    // Slight delay so rigs are fully ready
    const timer = setTimeout(() => activateBabylonSkeletonViewers(skeletonOverlayEnabled), 500);
    return () => {
      clearTimeout(timer);
      activateBabylonSkeletonViewers(false);
    };
  }, [open, skeletonOverlayEnabled, rigs.size]);

  // Listen for deterministic storyRigId → rigId mapping events
  useEffect(() => {
    const onRigReady = (e: Event) => {
      const { storyRigId, rigId } = (e as CustomEvent).detail;
      setPoseStates(prev => {
        if (!prev[storyRigId]) return prev;
        return { ...prev, [storyRigId]: { ...prev[storyRigId], rigId } };
      });
    };
    window.addEventListener('ch-story-rig-ready', onRigReady);
    return () => window.removeEventListener('ch-story-rig-ready', onRigReady);
  }, []);

  // Fallback: attach loaded rigs to characters by index order for non-story rigs
  useEffect(() => {
    const rigEntries = Array.from(rigs.entries());
    setPoseStates(prev => {
      const updated = { ...prev };
      characters.forEach((c, idx) => {
        // Only update if not already set by storyRigId event
        if (!updated[c.id]?.rigId && rigEntries[idx]) {
          const [rigId] = rigEntries[idx];
          updated[c.id] = { ...updated[c.id], rigId };
        }
      });
      return updated;
    });
  }, [rigs, characters]);

  const activeCharacter = characters[activeCharIdx];
  const activePoseState = activeCharacter ? poseStates[activeCharacter.id] : null;

  const handleBoneRotationChange = useCallback((boneName: string, axis: 'x' | 'y' | 'z', value: number) => {
    if (!activeCharacter) return;
    setPoseStates(prev => {
      const charState = prev[activeCharacter.id];
      const existing = charState.boneOverrides[boneName] ?? { x: 0, y: 0, z: 0 };
      const updated = {
        ...prev,
        [activeCharacter.id]: {
          ...charState,
          boneOverrides: {
            ...charState.boneOverrides,
            [boneName]: { ...existing, [axis]: value },
          },
        },
      };
      // Push to live rig if connected
      if (charState.rigId) {
        const newOverrides = updated[activeCharacter.id].boneOverrides;
        storySceneLoaderService.applyBoneOverridesToRig(charState.rigId, { [boneName]: newOverrides[boneName] });
      }
      return updated;
    });
  }, [activeCharacter]);

  const handlePoseChange = useCallback((poseId: string) => {
    if (!activeCharacter) return;
    setPoseStates(prev => {
      const charState = prev[activeCharacter.id];
      const updated = {
        ...prev,
        [activeCharacter.id]: { ...charState, poseId, boneOverrides: {} },
      };
      // Push pose to live rig
      if (charState.rigId) {
        storySceneLoaderService.applyPoseToRig(charState.rigId, poseId);
      }
      return updated;
    });
  }, [activeCharacter]);

  const handleResetPose = useCallback(() => {
    if (!activeCharacter) return;
    setPoseStates(prev => {
      const charState = prev[activeCharacter.id];
      const updated = { ...prev, [activeCharacter.id]: { ...charState, boneOverrides: {} } };
      if (charState.rigId) {
        const { resetAllBones } = useSkeletalAnimationStore.getState();
        resetAllBones(charState.rigId);
      }
      return updated;
    });
    setSelectedBone(null);
  }, [activeCharacter]);

  if (!open) return null;

  const singleView = VIEWS.find(v => v.id === singleViewId) ?? VIEWS[0];

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1400,
      display: 'flex',
      bgcolor: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* ── Left: Viewport(s) ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1, bgcolor: '#0d1117',
          borderBottom: '1px solid rgba(255,255,255,0.07)', minHeight: 52, flexShrink: 0,
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AccessibilityNew sx={{ color: '#ff9800', fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
              Multiview Skjelett
            </Typography>
            <Chip label={sceneName} size="small" sx={{ bgcolor: 'rgba(255,109,0,0.2)', color: '#ff9800', fontSize: 11, fontWeight: 600 }} />
            {Array.from(rigs.values()).length > 0 && (
              <Chip label={`${rigs.size} rig(s) aktiv`} size="small" sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', fontSize: 10 }} />
            )}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {/* Layout mode switcher */}
            <ToggleButtonGroup
              value={layoutMode}
              exclusive
              onChange={(_, v) => v && setLayoutMode(v as LayoutMode)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.12)', py: 0.4, px: 0.8 }, '& .Mui-selected': { color: '#ff9800', bgcolor: 'rgba(255,152,0,0.12) !important' } }}
            >
              <ToggleButton value="2x2"><Tooltip title="2×2 Grid"><GridView sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
              <ToggleButton value="single"><Tooltip title="Enkeltvisning"><Fullscreen sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
              <ToggleButton value="pip"><Tooltip title="PiP"><PictureInPicture sx={{ fontSize: 16 }} /></Tooltip></ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Tilbakestill pose">
              <IconButton size="small" onClick={handleResetPose} sx={{ color: '#ff9800' }}>
                <RestartAlt sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Character selector tabs */}
        {characters.length > 1 && (
          <Stack direction="row" sx={{ bgcolor: '#0a0e15', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, overflowX: 'auto' }}>
            {characters.map((c, idx) => (
              <Box
                key={c.id}
                onClick={() => { setActiveCharIdx(idx); setSelectedBone(null); }}
                sx={{
                  px: 2, py: 0.9, cursor: 'pointer', whiteSpace: 'nowrap',
                  borderBottom: activeCharIdx === idx ? '2px solid #ff9800' : '2px solid transparent',
                  bgcolor: activeCharIdx === idx ? 'rgba(255,152,0,0.08)' : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography sx={{ fontSize: 12, fontWeight: activeCharIdx === idx ? 700 : 400, color: activeCharIdx === idx ? '#ff9800' : 'rgba(255,255,255,0.55)' }}>
                    {c.label}
                  </Typography>
                  {poseStates[c.id]?.rigId && (
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#4caf50' }} />
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {/* Viewport area */}
        {activePoseState && (
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {/* 2×2 mode */}
            {layoutMode === '2x2' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%' }}>
                {VIEWS.map(view => (
                  <Box key={view.id} sx={{ border: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
                    <SkeletonView view={view} character={activePoseState} selectedBone={selectedBone} onSelectBone={setSelectedBone} showSkeleton={skeletonOverlayEnabled} />
                    <Tooltip title="Enkeltvisning">
                      <IconButton
                        size="small"
                        onClick={() => { setSingleViewId(view.id); setLayoutMode('single'); }}
                        sx={{ position: 'absolute', bottom: 5, right: 5, bgcolor: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.4)', width: 20, height: 20, '&:hover': { color: '#fff' } }}
                      >
                        <Fullscreen sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}

            {/* Single mode */}
            {layoutMode === 'single' && (
              <Box sx={{ height: '100%', position: 'relative' }}>
                <SkeletonView view={singleView} character={activePoseState} selectedBone={selectedBone} onSelectBone={setSelectedBone} showSkeleton={skeletonOverlayEnabled} />
                {/* Mini view picker at bottom */}
                <Box sx={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1 }}>
                  {VIEWS.map(v => (
                    <Box
                      key={v.id}
                      onClick={() => setSingleViewId(v.id)}
                      sx={{
                        px: 1.2, py: 0.4, borderRadius: '6px', cursor: 'pointer', fontSize: 10, fontWeight: v.id === singleViewId ? 700 : 400,
                        bgcolor: v.id === singleViewId ? 'rgba(255,152,0,0.25)' : 'rgba(0,0,0,0.6)',
                        color: v.id === singleViewId ? '#ff9800' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${v.id === singleViewId ? '#ff9800' : 'transparent'}`,
                      }}
                    >
                      {v.labelNorsk}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* PiP mode: large primary + 3 mini overlays */}
            {layoutMode === 'pip' && (
              <Box sx={{ height: '100%', position: 'relative' }}>
                <SkeletonView view={VIEWS.find(v => v.id === singleViewId) ?? VIEWS[0]} character={activePoseState} selectedBone={selectedBone} onSelectBone={setSelectedBone} showSkeleton={skeletonOverlayEnabled} />
                <Box sx={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {VIEWS.filter(v => v.id !== singleViewId).map(v => (
                    <Box
                      key={v.id}
                      onClick={() => setSingleViewId(v.id)}
                      sx={{ width: 100, height: 80, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', '&:hover': { borderColor: '#ff9800' } }}
                    >
                      <SkeletonView view={v} character={activePoseState} selectedBone={selectedBone} onSelectBone={setSelectedBone} compact showSkeleton={skeletonOverlayEnabled} />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Right: Bone Inspector Sidebar ── */}
      <Box sx={{ width: 280, flexShrink: 0, bgcolor: '#0a0e15', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activePoseState && (
          <BoneInspectorSidebar
            character={activePoseState}
            selectedBone={selectedBone}
            onSelectBone={setSelectedBone}
            onBoneRotationChange={handleBoneRotationChange}
            onPoseChange={handlePoseChange}
            skeletonOverlayEnabled={skeletonOverlayEnabled}
            onSkeletonOverlayToggle={setSkeletonOverlayEnabled}
            sceneType={sceneName}
          />
        )}
      </Box>
    </Box>
  );
};

export default MultiviewSkeletonPanel;
