/**
 * MultiviewSkeletonPanel
 *
 * Real 4-camera Babylon.js multiview panel for professional skeleton posing.
 *
 * Architecture:
 * - Creates 4 dedicated <canvas> elements and registers each with engine.registerView()
 * - Each view gets its own ArcRotateCamera (Front / Side-L / Perspective / Back)
 * - Cameras orbit around the active character's bounding sphere
 * - Babylon SkeletonViewer is activated on the shared scene for bone debug overlay
 * - SVG joint hit targets overlay each canvas for bone selection
 * - IK is wired via useSkeletalAnimationStore.enableIK()
 *
 * Layout modes:
 *   '2x2'    — four cameras in a 2×2 grid
 *   'single' — one camera fullscreen
 *   'pip'    — one large + three mini thumbnails
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
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
  /** Babylon ArcRotateCamera alpha (radians, horizontal orbit) */
  alpha: number;
  /** Babylon ArcRotateCamera beta (radians, vertical elevation) */
  beta: number;
  labelColor: string;
}

const VIEWS: ViewConfig[] = [
  { id: 'front',        labelNorsk: 'Fremre',     alpha: Math.PI,       beta: Math.PI / 2.2, labelColor: '#64b5f6' },
  { id: 'side',         labelNorsk: 'Side',       alpha: Math.PI / 2,   beta: Math.PI / 2.2, labelColor: '#ce93d8' },
  { id: 'threequarter', labelNorsk: 'Perspektiv', alpha: (3 * Math.PI) / 4, beta: Math.PI / 2.7, labelColor: '#80cbc4' },
  { id: 'back',         labelNorsk: 'Bakfra',     alpha: 0,             beta: Math.PI / 2.2, labelColor: '#f48fb1' },
];

// ============================================================================
// Babylon multiview management
// ============================================================================

interface BabylonView {
  viewId: string;
  camera: any;   // BABYLON.ArcRotateCamera
  view: any;     // engine.registerView() handle
}

let _registeredViews: BabylonView[] = [];

function disposeBabylonViews(): void {
  const vs = (window as any).virtualStudio;
  if (!vs?.engine) return;
  _registeredViews.forEach(({ view, camera }) => {
    try { vs.engine.unRegisterView?.(view.target); } catch {}
    try { camera.dispose?.(); } catch {}
  });
  _registeredViews = [];
}

function setupBabylonMultiviewCameras(
  canvases: HTMLCanvasElement[],
  targetPosition: { x: number; y: number; z: number },
  radius: number,
): void {
  disposeBabylonViews();

  const vs = (window as any).virtualStudio;
  if (!vs?.engine || !vs?.scene) {
    console.warn('[MultiviewPanel] virtualStudio engine/scene not available');
    return;
  }

  const engine: any = vs.engine;
  const scene: any = vs.scene;
  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.warn('[MultiviewPanel] BABYLON global not available');
    return;
  }

  const target = new BABYLON.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);

  VIEWS.forEach((viewCfg, idx) => {
    const canvas = canvases[idx];
    if (!canvas) return;

    const cam = new BABYLON.ArcRotateCamera(
      `multiview_cam_${viewCfg.id}`,
      viewCfg.alpha,
      viewCfg.beta,
      radius,
      target,
      scene,
    );
    cam.lowerRadiusLimit = radius * 0.3;
    cam.upperRadiusLimit = radius * 4;
    cam.wheelPrecision = 50;
    cam.pinchPrecision = 50;
    // Do NOT attach control to avoid interfering with main canvas
    // cam.attachControl(canvas, true);  // omitted intentionally

    let viewHandle: any = null;
    try {
      // engine.registerView returns an EngineView — each canvas gets a dedicated viewport
      viewHandle = engine.registerView(canvas, cam);
    } catch (err) {
      console.warn(`[MultiviewPanel] registerView failed for ${viewCfg.id}:`, err);
    }

    _registeredViews.push({ viewId: viewCfg.id, camera: cam, view: viewHandle });
    console.log(`[MultiviewPanel] Registered view: ${viewCfg.id} alpha=${viewCfg.alpha.toFixed(2)}`);
  });

  console.log(`[MultiviewPanel] ${_registeredViews.length}/${VIEWS.length} views registered`);
}

function activateBabylonSkeletonViewers(enabled: boolean): void {
  const vs = (window as any).virtualStudio;
  if (!vs?.scene) return;
  const scene = vs.scene;

  if ((window as any).__storySkeletonViewers) {
    ((window as any).__storySkeletonViewers as any[]).forEach((sv: any) => {
      try { sv.dispose?.(); } catch {}
    });
    (window as any).__storySkeletonViewers = [];
  }
  if (!enabled) return;

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON?.SkeletonViewer) return;

  const viewers: any[] = [];
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
      console.warn('[SkeletonViewer] Could not create viewer:', err);
    }
  });
  (window as any).__storySkeletonViewers = viewers;
  console.log(`[MultiviewPanel] SkeletonViewer: ${viewers.length} active`);
}

function getCharacterCenter(rigId: string | undefined): { x: number; y: number; z: number; radius: number } {
  const fallback = { x: 0, y: 0.9, z: 0, radius: 2.5 };
  if (!rigId) return fallback;

  const { rigs } = useSkeletalAnimationStore.getState();
  const rig = rigs.get(rigId);
  if (!rig?.mesh) return fallback;

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) return fallback;

  try {
    const mesh: any = rig.mesh;
    mesh.computeWorldMatrix(true);
    const info = mesh.getHierarchyBoundingVectors(true);
    const min = info.min;
    const max = info.max;
    const cx = (min.x + max.x) / 2;
    const cy = (min.y + max.y) / 2;
    const cz = (min.z + max.z) / 2;
    const dx = max.x - min.x;
    const dy = max.y - min.y;
    const dz = max.z - min.z;
    const radius = Math.max(dx, dy, dz) * 1.4;
    return { x: cx, y: cy, z: cz, radius };
  } catch {
    return fallback;
  }
}

// ============================================================================
// SVG skeleton constants (overlaid on canvas for bone click-selection)
// ============================================================================

const VW = 160;
const VH = 300;

interface Joint { id: string; boneName: string; x: number; y: number; }
interface SkeletonEdge { from: string; to: string; }

function getSkeletonJoints(viewIdx: number): Joint[] {
  const base: Joint[] = [
    { id: 'head',       boneName: BONE_NAMES.HEAD,           x: 80,  y: 28  },
    { id: 'neck',       boneName: BONE_NAMES.NECK,           x: 80,  y: 50  },
    { id: 'lshoulder',  boneName: BONE_NAMES.LEFT_SHOULDER,  x: 54,  y: 68  },
    { id: 'rshoulder',  boneName: BONE_NAMES.RIGHT_SHOULDER, x: 106, y: 68  },
    { id: 'lelbow',     boneName: BONE_NAMES.LEFT_ARM,       x: 42,  y: 104 },
    { id: 'relbow',     boneName: BONE_NAMES.RIGHT_ARM,      x: 118, y: 104 },
    { id: 'lwrist',     boneName: BONE_NAMES.LEFT_FOREARM,   x: 36,  y: 138 },
    { id: 'rwrist',     boneName: BONE_NAMES.RIGHT_FOREARM,  x: 124, y: 138 },
    { id: 'spine',      boneName: BONE_NAMES.SPINE,          x: 80,  y: 80  },
    { id: 'hips',       boneName: BONE_NAMES.HIPS,           x: 80,  y: 144 },
    { id: 'lhip',       boneName: BONE_NAMES.LEFT_UP_LEG,    x: 66,  y: 160 },
    { id: 'rhip',       boneName: BONE_NAMES.RIGHT_UP_LEG,   x: 94,  y: 160 },
    { id: 'lknee',      boneName: BONE_NAMES.LEFT_LEG,       x: 61,  y: 210 },
    { id: 'rknee',      boneName: BONE_NAMES.RIGHT_LEG,      x: 99,  y: 210 },
    { id: 'lankle',     boneName: BONE_NAMES.LEFT_FOOT,      x: 58,  y: 258 },
    { id: 'rankle',     boneName: BONE_NAMES.RIGHT_FOOT,     x: 102, y: 258 },
  ];
  if (viewIdx === 1) return base.map(j => ({ ...j, x: 80 + (j.x - 80) * 0.14 }));
  if (viewIdx === 3) return base.map(j => ({ ...j, x: VW - j.x }));
  if (viewIdx === 2) return base.map(j => ({ ...j, x: j.x + (j.x - 80) * 0.36 }));
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

// ============================================================================
// BabylonViewport component — real Babylon canvas + SVG joint overlay
// ============================================================================

interface BabylonViewportProps {
  viewIdx: number;
  view: ViewConfig;
  character: ActiveCharacterPose;
  selectedBone: string | null;
  onSelectBone: (boneName: string) => void;
  compact?: boolean;
  showSkeleton: boolean;
  canvasRef: React.Ref<HTMLCanvasElement>;
}

const BabylonViewport: React.FC<BabylonViewportProps> = ({
  viewIdx, view, character, selectedBone, onSelectBone, compact = false, showSkeleton, canvasRef,
}) => {
  const joints = useMemo(() => getSkeletonJoints(viewIdx), [viewIdx]);
  const jointMap = useMemo(() => {
    const m: Record<string, Joint> = {};
    joints.forEach(j => { m[j.id] = j; });
    return m;
  }, [joints]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#0a0d12', overflow: 'hidden' }}>
      {/* Real Babylon canvas — engine.registerView() renders into this */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />

      {/* Camera label overlay */}
      <Box sx={{ position: 'absolute', top: 6, left: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: 0.5, pointerEvents: 'none' }}>
        <CameraAlt sx={{ fontSize: compact ? 9 : 11, color: view.labelColor }} />
        <Typography sx={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: view.labelColor, letterSpacing: 0.8, textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          {view.labelNorsk}
        </Typography>
      </Box>

      {/* Live rig indicator */}
      {character.rigId && (
        <Box sx={{ position: 'absolute', top: 6, right: 8, zIndex: 10, pointerEvents: 'none' }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4caf50', boxShadow: '0 0 6px #4caf50' }} />
        </Box>
      )}

      {/* SVG skeleton joint overlay for click-based bone selection */}
      {showSkeleton && (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}
        >
          {/* Subtle edges (selection hint only, real skeleton drawn by Babylon SkeletonViewer) */}
          {EDGES.map(edge => {
            const a = jointMap[edge.from];
            const b = jointMap[edge.to];
            if (!a || !b) return null;
            const isSel = selectedBone && (a.boneName === selectedBone || b.boneName === selectedBone);
            if (!isSel) return null;
            return (
              <line key={`${edge.from}-${edge.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#ff9800" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
            );
          })}

          {/* Clickable joint handles */}
          {joints.map(joint => {
            const isSel = selectedBone === joint.boneName;
            const hasOverride = Boolean(character.boneOverrides[joint.boneName]);
            return (
              <g key={joint.id} style={{ cursor: 'pointer', pointerEvents: 'all' }} onClick={() => onSelectBone(joint.boneName)}>
                <circle cx={joint.x} cy={joint.y} r={isSel ? 8 : 6} fill="transparent" />
                {(isSel || hasOverride) && (
                  <circle
                    cx={joint.x} cy={joint.y}
                    r={isSel ? 7 : 5}
                    fill={isSel ? 'rgba(255,152,0,0.7)' : 'rgba(255,204,128,0.5)'}
                    stroke={isSel ? '#ff6d00' : '#ffcc80'}
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                )}
                {isSel && (
                  <circle cx={joint.x} cy={joint.y} r={11} fill="none" stroke="#ff9800" strokeWidth={1.5} opacity={0.5} strokeDasharray="3 2" />
                )}
              </g>
            );
          })}

          {/* Head outline */}
          <g style={{ cursor: 'pointer', pointerEvents: 'all' }} onClick={() => onSelectBone(BONE_NAMES.HEAD)}>
            <circle cx={jointMap['head']?.x ?? 80} cy={jointMap['head']?.y ?? 17} r={compact ? 10 : 13}
              fill="transparent"
              stroke={selectedBone === BONE_NAMES.HEAD ? '#ff9800' : 'transparent'}
              strokeWidth={2}
            />
          </g>
        </svg>
      )}
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

  const { rigs } = useSkeletalAnimationStore();

  // Canvas refs for 4 Babylon views
  const canvasRef0 = useRef<HTMLCanvasElement>(null);
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const canvasRef3 = useRef<HTMLCanvasElement>(null);
  const canvasRefs = [canvasRef0, canvasRef1, canvasRef2, canvasRef3];

  // ── Setup / teardown Babylon multiview cameras ─────────────────────────────
  useEffect(() => {
    if (!open) {
      disposeBabylonViews();
      activateBabylonSkeletonViewers(false);
      return;
    }

    // Give React a tick to mount canvases, then set up views
    const timer = setTimeout(() => {
      const activeChar = characters[activeCharIdx];
      const rigId = activeChar ? poseStates[activeChar.id]?.rigId : undefined;
      const center = getCharacterCenter(rigId);

      const canvases = canvasRefs.map(r => r.current).filter(Boolean) as HTMLCanvasElement[];
      if (canvases.length === 4) {
        setupBabylonMultiviewCameras(canvases, center, center.radius);
      } else {
        console.warn(`[MultiviewPanel] Only ${canvases.length}/4 canvases mounted`);
      }

      if (skeletonOverlayEnabled) {
        activateBabylonSkeletonViewers(true);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      disposeBabylonViews();
      activateBabylonSkeletonViewers(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-activate skeleton viewers when toggled
  useEffect(() => {
    if (!open) return;
    activateBabylonSkeletonViewers(skeletonOverlayEnabled);
  }, [open, skeletonOverlayEnabled, rigs.size]);

  // Re-point cameras when active character changes
  useEffect(() => {
    if (!open || _registeredViews.length === 0) return;
    const activeChar = characters[activeCharIdx];
    const rigId = activeChar ? poseStates[activeChar.id]?.rigId : undefined;
    const center = getCharacterCenter(rigId);
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON) return;
    const newTarget = new BABYLON.Vector3(center.x, center.y, center.z);
    _registeredViews.forEach(({ camera }) => {
      try {
        camera.target = newTarget;
        camera.radius = center.radius;
      } catch {}
    });
  }, [open, activeCharIdx, poseStates, characters]);

  // Listen for deterministic storyRigId → rigId mapping
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

  // Fallback: attach loaded rigs by index if storyRigId not matched
  useEffect(() => {
    const rigEntries = Array.from(rigs.entries());
    setPoseStates(prev => {
      const updated = { ...prev };
      characters.forEach((c, idx) => {
        if (!updated[c.id]?.rigId && rigEntries[idx]) {
          updated[c.id] = { ...updated[c.id], rigId: rigEntries[idx][0] };
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
      const updated = { ...prev, [activeCharacter.id]: { ...charState, poseId, boneOverrides: {} } };
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
      if (charState.rigId) {
        const { resetAllBones } = useSkeletalAnimationStore.getState();
        resetAllBones(charState.rigId);
      }
      return { ...prev, [activeCharacter.id]: { ...charState, boneOverrides: {} } };
    });
    setSelectedBone(null);
  }, [activeCharacter]);

  if (!open) return null;

  const singleViewConfig = VIEWS.find(v => v.id === singleViewId) ?? VIEWS[0];
  const singleViewIdx = VIEWS.findIndex(v => v.id === singleViewId);

  // ── Render viewport cell ─────────────────────────────────────────────────
  const renderViewportCell = (viewIdx: number, compact = false) => {
    if (!activePoseState) return null;
    const view = VIEWS[viewIdx];
    return (
      <BabylonViewport
        key={view.id}
        viewIdx={viewIdx}
        view={view}
        character={activePoseState}
        selectedBone={selectedBone}
        onSelectBone={setSelectedBone}
        compact={compact}
        showSkeleton={skeletonOverlayEnabled}
        canvasRef={canvasRefs[viewIdx]}
      />
    );
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 1400,
      display: 'flex',
      bgcolor: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* ── Left: Viewport area ─────────────────────────────────────────── */}
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
            {rigs.size > 0 && (
              <Chip label={`${rigs.size} rig(s) aktiv`} size="small" sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', fontSize: 10 }} />
            )}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              value={layoutMode}
              exclusive
              onChange={(_, v) => v && setLayoutMode(v as LayoutMode)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.12)', py: 0.4, px: 0.8 },
                '& .Mui-selected': { color: '#ff9800', bgcolor: 'rgba(255,152,0,0.12) !important' },
              }}
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
        <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

          {/* 2×2 mode — all 4 Babylon canvases active */}
          {layoutMode === '2x2' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '100%' }}>
              {VIEWS.map((view, idx) => (
                <Box key={view.id} sx={{ border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
                  {renderViewportCell(idx)}
                  <Tooltip title="Enkeltvisning">
                    <IconButton
                      size="small"
                      onClick={() => { setSingleViewId(view.id); setLayoutMode('single'); }}
                      sx={{ position: 'absolute', bottom: 5, right: 5, zIndex: 20, bgcolor: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.4)', width: 20, height: 20, '&:hover': { color: '#fff' } }}
                    >
                      <Fullscreen sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}

          {/* Single mode — one camera fullscreen */}
          {layoutMode === 'single' && (
            <Box sx={{ height: '100%', position: 'relative' }}>
              {renderViewportCell(singleViewIdx)}
              <Box sx={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1, zIndex: 20 }}>
                {VIEWS.map(v => (
                  <Box
                    key={v.id}
                    onClick={() => setSingleViewId(v.id)}
                    sx={{
                      px: 1.2, py: 0.4, borderRadius: '6px', cursor: 'pointer', fontSize: 10,
                      fontWeight: v.id === singleViewId ? 700 : 400,
                      bgcolor: v.id === singleViewId ? 'rgba(255,152,0,0.25)' : 'rgba(0,0,0,0.7)',
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

          {/* PiP mode — one large + 3 mini thumbnails */}
          {layoutMode === 'pip' && (
            <Box sx={{ height: '100%', position: 'relative' }}>
              {renderViewportCell(singleViewIdx)}
              <Box sx={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 1, zIndex: 20 }}>
                {VIEWS.filter(v => v.id !== singleViewId).map((v, i) => {
                  const pipIdx = VIEWS.findIndex(x => x.id === v.id);
                  return (
                    <Box
                      key={v.id}
                      onClick={() => setSingleViewId(v.id)}
                      sx={{ width: 100, height: 80, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', '&:hover': { borderColor: '#ff9800' } }}
                    >
                      {renderViewportCell(pipIdx, true)}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Right: Bone Inspector Sidebar ─────────────────────────────────── */}
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
