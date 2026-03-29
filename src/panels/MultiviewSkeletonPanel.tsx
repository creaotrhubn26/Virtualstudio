/**
 * MultiviewSkeletonPanel
 *
 * 2×2 multiview grid med interaktivt skjelett-overlay for karakter-posering.
 * Viser karakterer fra story-scener i fire vinkelvisninger:
 *   - Fremre (front)     — øverst til venstre
 *   - Sidevisning       — øverst til høyre
 *   - Perspektiv (3/4)  — nederst til venstre
 *   - Bakfra            — nederst til høyre
 *
 * Beinvalg og rotasjonsjusteringer gjøres via BoneInspectorSidebar.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Close,
  AccessibilityNew,
  CameraAlt,
  Fullscreen,
  FullscreenExit,
  RestartAlt,
} from '@mui/icons-material';
import { ALL_POSES, PosePreset, PoseData, BONE_NAMES } from '../core/animation/PoseLibrary';
import { StoryCharacterManifest } from '../data/scenarioPresets';
import { BoneInspectorSidebar } from './BoneInspectorSidebar';

// ============================================================================
// Types
// ============================================================================

export interface ActiveCharacterPose {
  characterId: string;
  label: string;
  avatarType: string;
  poseId: string;
  boneOverrides: Record<string, { x: number; y: number; z: number }>;
}

interface ViewConfig {
  id: string;
  label: string;
  labelNorsk: string;
  cameraAngle: 'front' | 'side-left' | 'three-quarter' | 'back';
  svgTransform: string;
}

const VIEWS: ViewConfig[] = [
  { id: 'front',       label: 'Front',       labelNorsk: 'Fremre',       cameraAngle: 'front',         svgTransform: 'scaleX(1)' },
  { id: 'side',        label: 'Side',        labelNorsk: 'Side',         cameraAngle: 'side-left',     svgTransform: 'rotate(0)' },
  { id: 'threequarter',label: '3/4',         labelNorsk: 'Perspektiv',   cameraAngle: 'three-quarter', svgTransform: 'rotate(0)' },
  { id: 'back',        label: 'Back',        labelNorsk: 'Bakfra',       cameraAngle: 'back',          svgTransform: 'scaleX(-1)' },
];

// Viewbox constants for the SVG skeleton
const VW = 160;
const VH = 340;

// ============================================================================
// SVG Skeleton Renderer
// ============================================================================

interface Joint {
  id: string;
  boneName: string;
  x: number;
  y: number;
}

interface SkeletonConnection {
  from: string;
  to: string;
}

function getSkeletonJoints(view: ViewConfig['cameraAngle'], pose: PoseData): Joint[] {
  const base: Joint[] = [
    { id: 'head',        boneName: BONE_NAMES.HEAD,            x: 80,  y: 30  },
    { id: 'neck',        boneName: BONE_NAMES.NECK,            x: 80,  y: 52  },
    { id: 'lshoulder',   boneName: BONE_NAMES.LEFT_SHOULDER,   x: 58,  y: 70  },
    { id: 'rshoulder',   boneName: BONE_NAMES.RIGHT_SHOULDER,  x: 102, y: 70  },
    { id: 'lelbow',      boneName: BONE_NAMES.LEFT_ARM,        x: 46,  y: 105 },
    { id: 'relbow',      boneName: BONE_NAMES.RIGHT_ARM,       x: 114, y: 105 },
    { id: 'lwrist',      boneName: BONE_NAMES.LEFT_FOREARM,    x: 40,  y: 140 },
    { id: 'rwrist',      boneName: BONE_NAMES.RIGHT_FOREARM,   x: 120, y: 140 },
    { id: 'spine',       boneName: BONE_NAMES.SPINE,           x: 80,  y: 80  },
    { id: 'hips',        boneName: BONE_NAMES.HIPS,            x: 80,  y: 145 },
    { id: 'lhip',        boneName: BONE_NAMES.LEFT_UP_LEG,     x: 68,  y: 160 },
    { id: 'rhip',        boneName: BONE_NAMES.RIGHT_UP_LEG,    x: 92,  y: 160 },
    { id: 'lknee',       boneName: BONE_NAMES.LEFT_LEG,        x: 65,  y: 215 },
    { id: 'rknee',       boneName: BONE_NAMES.RIGHT_LEG,       x: 95,  y: 215 },
    { id: 'lankle',      boneName: BONE_NAMES.LEFT_FOOT,       x: 62,  y: 268 },
    { id: 'rankle',      boneName: BONE_NAMES.RIGHT_FOOT,      x: 98,  y: 268 },
  ];

  // Apply view-specific mirroring/offset
  if (view === 'side-left') {
    return base.map(j => ({ ...j, x: 80 + (j.x - 80) * 0.15 }));
  }
  if (view === 'back') {
    return base.map(j => ({ ...j, x: VW - j.x }));
  }
  if (view === 'three-quarter') {
    return base.map(j => ({ ...j, x: j.x + (j.x - 80) * 0.4 }));
  }
  return base;
}

const CONNECTIONS: SkeletonConnection[] = [
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

interface SkeletonViewProps {
  view: ViewConfig;
  character: ActiveCharacterPose;
  selectedBone: string | null;
  onSelectBone: (boneName: string) => void;
  isExpanded?: boolean;
}

const SkeletonView: React.FC<SkeletonViewProps> = ({
  view, character, selectedBone, onSelectBone, isExpanded
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

  const viewBg: Record<ViewConfig['cameraAngle'], string> = {
    'front':         '#1a1f2e',
    'side-left':     '#1f1a2e',
    'three-quarter': '#1a2e1f',
    'back':          '#2e1a1f',
  };

  const viewLabelColor: Record<ViewConfig['cameraAngle'], string> = {
    'front':         '#64b5f6',
    'side-left':     '#ce93d8',
    'three-quarter': '#80cbc4',
    'back':          '#f48fb1',
  };

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: isExpanded ? '100%' : '50%',
      bgcolor: viewBg[view.cameraAngle],
      border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      <Box sx={{
        position: 'absolute',
        top: 6,
        left: 8,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}>
        <CameraAlt sx={{ fontSize: 11, color: viewLabelColor[view.cameraAngle] }} />
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: viewLabelColor[view.cameraAngle], letterSpacing: 1, textTransform: 'uppercase' }}>
          {view.labelNorsk}
        </Typography>
      </Box>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* Grid lines */}
        <line x1={VW / 2} y1={0} x2={VW / 2} y2={VH} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        <line x1={0} y1={VH / 2} x2={VW} y2={VH / 2} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

        {/* Ground indicator */}
        <ellipse cx={VW / 2} cy={VH - 18} rx={30} ry={5} fill="rgba(255,255,255,0.06)" />

        {/* Skeleton connections */}
        {CONNECTIONS.map(conn => {
          const a = jointMap[conn.from];
          const b = jointMap[conn.to];
          if (!a || !b) return null;
          const isSelected = selectedBone && (a.boneName === selectedBone || b.boneName === selectedBone);
          return (
            <line
              key={`${conn.from}-${conn.to}`}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke={isSelected ? '#ff9800' : 'rgba(255,255,255,0.55)'}
              strokeWidth={isSelected ? 2.5 : 1.8}
              strokeLinecap="round"
            />
          );
        })}

        {/* Joints */}
        {joints.map(joint => {
          const isSelected = selectedBone === joint.boneName;
          return (
            <g
              key={joint.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectBone(joint.boneName)}
            >
              <circle
                cx={joint.x}
                cy={joint.y}
                r={isSelected ? 7 : 4.5}
                fill={isSelected ? '#ff9800' : '#fff'}
                stroke={isSelected ? '#ff6d00' : 'rgba(255,255,255,0.3)'}
                strokeWidth={isSelected ? 2 : 1}
                opacity={isSelected ? 1 : 0.85}
              />
              {isSelected && (
                <circle
                  cx={joint.x}
                  cy={joint.y}
                  r={11}
                  fill="none"
                  stroke="#ff9800"
                  strokeWidth={1.5}
                  opacity={0.5}
                  strokeDasharray="3 2"
                />
              )}
            </g>
          );
        })}

        {/* Head circle */}
        <circle
          cx={jointMap['head']?.x ?? 80}
          cy={jointMap['head']?.y ?? 20}
          r={14}
          fill="none"
          stroke={selectedBone === BONE_NAMES.HEAD ? '#ff9800' : 'rgba(255,255,255,0.4)'}
          strokeWidth={selectedBone === BONE_NAMES.HEAD ? 2.5 : 1.5}
          style={{ cursor: 'pointer' }}
          onClick={() => onSelectBone(BONE_NAMES.HEAD)}
        />
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
  open, onClose, characters, sceneName
}) => {
  const [activeCharIdx, setActiveCharIdx] = useState(0);
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState<string | null>(null);
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

  const activeCharacter = characters[activeCharIdx];
  const activePoseState = activeCharacter ? poseStates[activeCharacter.id] : null;

  const handleBoneRotationChange = useCallback((boneName: string, axis: 'x' | 'y' | 'z', value: number) => {
    if (!activeCharacter) return;
    setPoseStates(prev => {
      const charState = prev[activeCharacter.id];
      const existing = charState.boneOverrides[boneName] ?? { x: 0, y: 0, z: 0 };
      return {
        ...prev,
        [activeCharacter.id]: {
          ...charState,
          boneOverrides: {
            ...charState.boneOverrides,
            [boneName]: { ...existing, [axis]: value },
          },
        },
      };
    });
  }, [activeCharacter]);

  const handlePoseChange = useCallback((poseId: string) => {
    if (!activeCharacter) return;
    setPoseStates(prev => ({
      ...prev,
      [activeCharacter.id]: {
        ...prev[activeCharacter.id],
        poseId,
        boneOverrides: {},
      },
    }));
  }, [activeCharacter]);

  const handleResetPose = useCallback(() => {
    if (!activeCharacter) return;
    setPoseStates(prev => ({
      ...prev,
      [activeCharacter.id]: {
        ...prev[activeCharacter.id],
        boneOverrides: {},
      },
    }));
    setSelectedBone(null);
  }, [activeCharacter]);

  if (!open) return null;

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 1400,
      display: 'flex',
      bgcolor: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(6px)',
    }}>
      {/* ── Left: 2×2 Multiview Grid ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: '#111827',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          minHeight: 52,
          flexShrink: 0,
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AccessibilityNew sx={{ color: '#ff9800', fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
              Multiview Skjelett
            </Typography>
            <Chip
              label={sceneName}
              size="small"
              sx={{ bgcolor: 'rgba(255,109,0,0.2)', color: '#ff9800', fontSize: 11, fontWeight: 600 }}
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {expandedView && (
              <Tooltip title="Tilbake til 2×2">
                <IconButton size="small" onClick={() => setExpandedView(null)} sx={{ color: '#fff' }}>
                  <FullscreenExit sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Tilbakestill pose">
              <IconButton size="small" onClick={handleResetPose} sx={{ color: '#ff9800' }}>
                <RestartAlt sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Character selector tabs */}
        {characters.length > 1 && (
          <Stack
            direction="row"
            spacing={0}
            sx={{
              bgcolor: '#0d1117',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
              overflowX: 'auto',
            }}
          >
            {characters.map((c, idx) => (
              <Box
                key={c.id}
                onClick={() => { setActiveCharIdx(idx); setSelectedBone(null); }}
                sx={{
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  borderBottom: activeCharIdx === idx ? '2px solid #ff9800' : '2px solid transparent',
                  bgcolor: activeCharIdx === idx ? 'rgba(255,152,0,0.1)' : 'transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}
              >
                <Typography sx={{
                  fontSize: 12,
                  fontWeight: activeCharIdx === idx ? 700 : 400,
                  color: activeCharIdx === idx ? '#ff9800' : 'rgba(255,255,255,0.6)',
                }}>
                  {c.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {/* 2×2 Grid */}
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', overflow: 'hidden' }}>
          {activePoseState && VIEWS.map(view => (
            <Box
              key={view.id}
              sx={{
                position: 'relative',
                display: expandedView && expandedView !== view.id ? 'none' : 'block',
                gridColumn: expandedView === view.id ? '1 / -1' : undefined,
                gridRow: expandedView === view.id ? '1 / -1' : undefined,
              }}
            >
              <SkeletonView
                view={view}
                character={activePoseState}
                selectedBone={selectedBone}
                onSelectBone={setSelectedBone}
                isExpanded={expandedView === view.id}
              />
              <Tooltip title={expandedView === view.id ? 'Minimer' : 'Utvid'}>
                <IconButton
                  size="small"
                  onClick={() => setExpandedView(expandedView === view.id ? null : view.id)}
                  sx={{
                    position: 'absolute',
                    bottom: 6,
                    right: 6,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'rgba(255,255,255,0.5)',
                    width: 22,
                    height: 22,
                    '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.8)' },
                  }}
                >
                  <Fullscreen sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right: Bone Inspector Sidebar ── */}
      <Box sx={{
        width: 280,
        flexShrink: 0,
        bgcolor: '#0d1117',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {activePoseState && (
          <BoneInspectorSidebar
            character={activePoseState}
            selectedBone={selectedBone}
            onSelectBone={setSelectedBone}
            onBoneRotationChange={handleBoneRotationChange}
            onPoseChange={handlePoseChange}
          />
        )}
      </Box>
    </Box>
  );
};

export default MultiviewSkeletonPanel;
