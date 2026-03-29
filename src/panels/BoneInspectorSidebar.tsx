
import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  Stack,
  Divider,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { RestartAlt, AccessibilityNew, Visibility, VisibilityOff, Link as LinkIcon } from '@mui/icons-material';
import { ALL_POSES, PosePreset, BONE_NAMES } from '../core/animation/PoseLibrary';
import { ActiveCharacterPose, BoneOverride } from './MultiviewSkeletonPanel';
import { useSkeletalAnimationStore } from '../services/skeletalAnimationService';

// Bone groups for organized display

const BONE_GROUPS: { label: string; color: string; bones: Array<{ id: string; boneName: string; labelNorsk: string }> }[] = [
  {
    label: 'Hode & rygg',
    color: '#64b5f6',
    bones: [
      { id: 'head',   boneName: BONE_NAMES.HEAD,   labelNorsk: 'Hode'   },
      { id: 'neck',   boneName: BONE_NAMES.NECK,   labelNorsk: 'Nakke'  },
      { id: 'spine2', boneName: BONE_NAMES.SPINE2, labelNorsk: 'Rygg Ø' },
      { id: 'spine1', boneName: BONE_NAMES.SPINE1, labelNorsk: 'Rygg M' },
      { id: 'spine',  boneName: BONE_NAMES.SPINE,  labelNorsk: 'Rygg N' },
      { id: 'hips',   boneName: BONE_NAMES.HIPS,   labelNorsk: 'Hofte'  },
    ],
  },
  {
    label: 'Venstre arm',
    color: '#80cbc4',
    bones: [
      { id: 'lshoulder',  boneName: BONE_NAMES.LEFT_SHOULDER,  labelNorsk: 'V. Skulder'   },
      { id: 'larm',       boneName: BONE_NAMES.LEFT_ARM,       labelNorsk: 'V. Overarm'   },
      { id: 'lforearm',   boneName: BONE_NAMES.LEFT_FOREARM,   labelNorsk: 'V. Underarm'  },
      { id: 'lhand',      boneName: BONE_NAMES.LEFT_HAND,      labelNorsk: 'V. Hånd'      },
    ],
  },
  {
    label: 'Høyre arm',
    color: '#ce93d8',
    bones: [
      { id: 'rshoulder',  boneName: BONE_NAMES.RIGHT_SHOULDER,  labelNorsk: 'H. Skulder'   },
      { id: 'rarm',       boneName: BONE_NAMES.RIGHT_ARM,       labelNorsk: 'H. Overarm'   },
      { id: 'rforearm',   boneName: BONE_NAMES.RIGHT_FOREARM,   labelNorsk: 'H. Underarm'  },
      { id: 'rhand',      boneName: BONE_NAMES.RIGHT_HAND,      labelNorsk: 'H. Hånd'      },
    ],
  },
  {
    label: 'Venstre bein',
    color: '#ffcc80',
    bones: [
      { id: 'lupleg',  boneName: BONE_NAMES.LEFT_UP_LEG,   labelNorsk: 'V. Lår'      },
      { id: 'llegleg', boneName: BONE_NAMES.LEFT_LEG,      labelNorsk: 'V. Legg'     },
      { id: 'lfoot',   boneName: BONE_NAMES.LEFT_FOOT,     labelNorsk: 'V. Fot'      },
    ],
  },
  {
    label: 'Høyre bein',
    color: '#f48fb1',
    bones: [
      { id: 'rupleg',  boneName: BONE_NAMES.RIGHT_UP_LEG,  labelNorsk: 'H. Lår'      },
      { id: 'rlleg',   boneName: BONE_NAMES.RIGHT_LEG,     labelNorsk: 'H. Legg'     },
      { id: 'rfoot',   boneName: BONE_NAMES.RIGHT_FOOT,    labelNorsk: 'H. Fot'      },
    ],
  },
];

// Pose category labels in Norwegian

const POSE_CATEGORY_LABELS: Record<string, string> = {
  portrait:   'Portrett',
  fashion:    'Mote',
  commercial: 'Kommersiell',
  editorial:  'Redaksjonell',
  fitness:    'Fitness',
  dance:      'Dans',
};

const POSE_CATEGORY_COLORS: Record<string, string> = {
  portrait:   '#64b5f6',
  fashion:    '#ce93d8',
  commercial: '#80cbc4',
  editorial:  '#ffcc80',
  fitness:    '#f48fb1',
  dance:      '#ff9800',
};

// Scene-type relevance scoring — returns 6 most relevant poses for a scene

const SCENE_POSE_AFFINITY: Record<string, string[]> = {
  restaurant:  ['commercial_welcoming', 'portrait_classic_stand', 'commercial_pointing', 'portrait_relaxed', 'fashion_editorial_lean', 'commercial_arms_crossed'],
  produktfoto: ['commercial_pointing', 'commercial_welcoming', 'portrait_power', 'fashion_power_stance', 'editorial_dynamic_1', 'commercial_arms_crossed'],
  video:       ['fashion_power_stance', 'portrait_classic_stand', 'commercial_welcoming', 'portrait_power', 'commercial_pointing', 'fashion_editorial_lean'],
  portrett:    ['portrait_classic_stand', 'portrait_relaxed', 'portrait_power', 'fashion_editorial_lean', 'commercial_welcoming', 'fashion_power_stance'],
  mote:        ['fashion_power_stance', 'fashion_editorial_lean', 'editorial_dynamic_1', 'portrait_power', 'dance_open_arms', 'fashion_s_curve'],
};

function getRelevantPoses(sceneType: string): string[] {
  for (const [key, ids] of Object.entries(SCENE_POSE_AFFINITY)) {
    if (sceneType.toLowerCase().includes(key)) return ids;
  }
  return Object.values(SCENE_POSE_AFFINITY)[0];
}

// Bone rotation value display helper

function toDeg(rad: number): string {
  return (rad * (180 / Math.PI)).toFixed(1) + '°';
}

// Component

interface BoneInspectorSidebarProps {
  character: ActiveCharacterPose;
  selectedBone: string | null;
  onSelectBone: (boneName: string) => void;
  onBoneRotationChange: (boneName: string, axis: 'x' | 'y' | 'z', value: number) => void;
  onBonePositionChange?: (boneName: string, axis: 'x' | 'y' | 'z', value: number) => void;
  onPoseChange: (poseId: string) => void;
  skeletonOverlayEnabled?: boolean;
  onSkeletonOverlayToggle?: (enabled: boolean) => void;
  ikEnabled?: boolean;
  onIkToggle?: (enabled: boolean) => void;
  sceneType?: string;
}

export const BoneInspectorSidebar: React.FC<BoneInspectorSidebarProps> = ({
  character,
  selectedBone,
  onSelectBone,
  onBoneRotationChange,
  onBonePositionChange,
  onPoseChange,
  skeletonOverlayEnabled = true,
  onSkeletonOverlayToggle,
  ikEnabled = false,
  onIkToggle,
  sceneType = 'portrett',
}) => {
  const [showAllPoses, setShowAllPoses] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<'rotation' | 'position'>('rotation');

  const selectedBoneData = useMemo(() => {
    for (const group of BONE_GROUPS) {
      const found = group.bones.find(b => b.boneName === selectedBone);
      if (found) return { ...found, groupColor: group.color };
    }
    return null;
  }, [selectedBone]);

  const currentRotation = useMemo(() => {
    if (!selectedBone) return { x: 0, y: 0, z: 0 };
    const base = ALL_POSES.find(p => p.id === character.poseId)?.pose[selectedBone] ?? { x: 0, y: 0, z: 0 };
    const override = character.boneOverrides[selectedBone];
    return override ?? base;
  }, [selectedBone, character.poseId, character.boneOverrides]);

  const relevantPoseIds = useMemo(() => getRelevantPoses(sceneType), [sceneType]);

  const posesByCategory = useMemo(() => {
    const map: Record<string, PosePreset[]> = {};
    ALL_POSES.forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, []);

  const relevantPoses = useMemo(() =>
    ALL_POSES.filter(p => relevantPoseIds.includes(p.id)),
    [relevantPoseIds],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AccessibilityNew sx={{ fontSize: 16, color: '#ff9800' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {character.label}
          </Typography>
          {character.rigId && (
            <Chip label="Live rig" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', fontSize: 9, height: 16 }} />
          )}
        </Stack>
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.3 }}>
          {character.avatarType} · {ALL_POSES.find(p => p.id === character.poseId)?.name ?? character.poseId}
        </Typography>

        {/* Overlay & IK toggles */}
        <Stack direction="row" sx={{ mt: 1.2, gap: 0.5 }}>
          <Tooltip title={skeletonOverlayEnabled ? 'Skjul skjelettovertrekk' : 'Vis skjelettovertrekk'}>
            <Box
              onClick={() => onSkeletonOverlayToggle?.(!skeletonOverlayEnabled)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '6px', cursor: 'pointer',
                bgcolor: skeletonOverlayEnabled ? 'rgba(100,181,246,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${skeletonOverlayEnabled ? '#64b5f6' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              {skeletonOverlayEnabled
                ? <Visibility sx={{ fontSize: 12, color: '#64b5f6' }} />
                : <VisibilityOff sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }} />}
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: skeletonOverlayEnabled ? '#64b5f6' : 'rgba(255,255,255,0.35)' }}>
                Skjelett
              </Typography>
            </Box>
          </Tooltip>

          <Tooltip title={ikEnabled ? 'Deaktiver IK' : 'Aktiver IK (invers kinematikk)'}>
            <Box
              onClick={() => {
                const next = !ikEnabled;
                onIkToggle?.(next);
                // Wire to live skeleton IK system if rig is available
                if (character.rigId) {
                  const IK_CHAIN_NAMES = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
                  const { enableIK: enableIKFn } = useSkeletalAnimationStore.getState();
                  IK_CHAIN_NAMES.forEach(chain => enableIKFn(character.rigId!, chain, next));
                }
              }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.3, borderRadius: '6px', cursor: 'pointer',
                bgcolor: ikEnabled ? 'rgba(206,147,216,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${ikEnabled ? '#ce93d8' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <LinkIcon sx={{ fontSize: 12, color: ikEnabled ? '#ce93d8' : 'rgba(255,255,255,0.3)' }} />
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: ikEnabled ? '#ce93d8' : 'rgba(255,255,255,0.35)' }}>
                IK {ikEnabled ? 'På' : 'Av'}
              </Typography>
            </Box>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 } }}>

        {/* ── Bone rotation inspector ── */}
        {selectedBoneData && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
              <Chip
                label={selectedBoneData.labelNorsk}
                size="small"
                sx={{ bgcolor: `${selectedBoneData.groupColor}25`, color: selectedBoneData.groupColor, fontWeight: 700, fontSize: 11 }}
              />
              <Tooltip title="Tilbakestill dette bein">
                <Box
                  onClick={() => {
                    if (selectedBone) {
                      const base = ALL_POSES.find(p => p.id === character.poseId)?.pose[selectedBone];
                      onBoneRotationChange(selectedBone, 'x', base?.x ?? 0);
                      onBoneRotationChange(selectedBone, 'y', base?.y ?? 0);
                      onBoneRotationChange(selectedBone, 'z', base?.z ?? 0);
                      onBonePositionChange?.(selectedBone, 'x', 0);
                      onBonePositionChange?.(selectedBone, 'y', 0);
                      onBonePositionChange?.(selectedBone, 'z', 0);
                    }
                  }}
                  sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ff9800' }, display: 'flex', alignItems: 'center' }}
                >
                  <RestartAlt sx={{ fontSize: 16 }} />
                </Box>
              </Tooltip>
            </Box>

            {/* Mode toggle: Rotation / Position */}
            <Box sx={{ display: 'flex', mb: 1.5, borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(['rotation', 'position'] as const).map(mode => (
                <Box
                  key={mode}
                  onClick={() => setInspectorMode(mode)}
                  sx={{
                    flex: 1, textAlign: 'center', py: 0.5, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    bgcolor: inspectorMode === mode ? (mode === 'rotation' ? 'rgba(255,152,0,0.2)' : 'rgba(33,150,243,0.2)') : 'transparent',
                    color: inspectorMode === mode ? (mode === 'rotation' ? '#ff9800' : '#2196f3') : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'rotation' ? 'Rotasjon' : 'Posisjon'}
                </Box>
              ))}
            </Box>

            {/* Rotation sliders */}
            {inspectorMode === 'rotation' && (['x', 'y', 'z'] as const).map(axis => (
              <Box key={axis} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {axis.toUpperCase()}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#ff9800', fontWeight: 700 }}>
                    {toDeg(currentRotation[axis] ?? 0)}
                  </Typography>
                </Box>
                <Slider
                  size="small"
                  value={currentRotation[axis] ?? 0}
                  min={-Math.PI}
                  max={Math.PI}
                  step={0.01}
                  onChange={(_, val) => selectedBone && onBoneRotationChange(selectedBone, axis, val as number)}
                  sx={{
                    color: axis === 'x' ? '#f44336' : axis === 'y' ? '#4caf50' : '#2196f3',
                    height: 4,
                    '& .MuiSlider-thumb': { width: 12, height: 12 },
                    '& .MuiSlider-rail': { opacity: 0.2 },
                  }}
                />
              </Box>
            ))}

            {/* Position sliders — offset from rig-pose default (metres) */}
            {inspectorMode === 'position' && (['x', 'y', 'z'] as const).map(axis => {
              const boneOverride: BoneOverride | undefined = selectedBone ? character.boneOverrides[selectedBone] : undefined;
              const posKey: keyof BoneOverride = axis === 'x' ? 'pos_x' : axis === 'y' ? 'pos_y' : 'pos_z';
              const posOverride: number = boneOverride?.[posKey] ?? 0;
              return (
                <Box key={axis} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {axis.toUpperCase()}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#2196f3', fontWeight: 700 }}>
                      {posOverride.toFixed(3)} m
                    </Typography>
                  </Box>
                  <Slider
                    size="small"
                    value={posOverride}
                    min={-0.5}
                    max={0.5}
                    step={0.005}
                    onChange={(_, val) => selectedBone && onBonePositionChange?.(selectedBone, axis, val as number)}
                    sx={{
                      color: axis === 'x' ? '#f44336' : axis === 'y' ? '#4caf50' : '#2196f3',
                      height: 4,
                      '& .MuiSlider-thumb': { width: 12, height: 12 },
                      '& .MuiSlider-rail': { opacity: 0.2 },
                    }}
                  />
                </Box>
              );
            })}

            {ikEnabled && (
              <Box sx={{ bgcolor: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.3)', borderRadius: '6px', p: 1.2, mb: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#ce93d8', fontWeight: 600 }}>
                  IK aktiv — beinvinkel styres automatisk
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', mt: 0.3 }}>
                  Dra endemålet i viewportene for naturlig posering
                </Typography>
              </Box>
            )}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 1 }} />
          </Box>
        )}

        {/* ── Bone list ── */}
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', px: 0.5, mb: 1 }}>
            Velg bein
          </Typography>
          {BONE_GROUPS.map(group => (
            <Box key={group.label} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 10, color: group.color, fontWeight: 700, px: 0.5, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {group.label}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {group.bones.map(bone => {
                  const isSelected = selectedBone === bone.boneName;
                  const hasOverride = Boolean(character.boneOverrides[bone.boneName]);
                  return (
                    <Box
                      key={bone.id}
                      onClick={() => onSelectBone(bone.boneName)}
                      sx={{
                        px: 1.2, py: 0.4, borderRadius: '6px', cursor: 'pointer', fontSize: 11,
                        fontWeight: isSelected ? 700 : 400,
                        bgcolor: isSelected ? `${group.color}30` : 'rgba(255,255,255,0.05)',
                        color: isSelected ? group.color : 'rgba(255,255,255,0.65)',
                        border: `1px solid ${isSelected ? group.color : 'transparent'}`,
                        transition: 'all 0.12s ease',
                        position: 'relative',
                        '&:hover': { bgcolor: `${group.color}20`, color: group.color },
                        ...(hasOverride && !isSelected && {
                          '&::after': {
                            content: '""', position: 'absolute', top: 3, right: 3,
                            width: 5, height: 5, borderRadius: '50%', bgcolor: '#ff9800',
                          },
                        }),
                      }}
                    >
                      {bone.labelNorsk}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 1.5 }} />

        {/* ── Pose library ── */}
        <Box sx={{ px: 1.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Posebibliotek
            </Typography>
            <Box
              onClick={() => setShowAllPoses(v => !v)}
              sx={{ fontSize: 10, color: '#ff9800', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              {showAllPoses ? 'Relevante' : 'Alle'}
            </Box>
          </Box>

          {!showAllPoses ? (
            /* Relevant poses for this scene type */
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', px: 0.5, mb: 0.5 }}>
                Anbefalt for denne scenen
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                {relevantPoses.length > 0 ? relevantPoses.map(pose => (
                  <PoseButton key={pose.id} pose={pose} isActive={character.poseId === pose.id} onSelect={onPoseChange} />
                )) : (
                  ALL_POSES.slice(0, 6).map(pose => (
                    <PoseButton key={pose.id} pose={pose} isActive={character.poseId === pose.id} onSelect={onPoseChange} />
                  ))
                )}
              </Box>
            </Box>
          ) : (
            /* All poses grouped by category */
            Object.entries(posesByCategory).map(([category, poses]) => (
              <Box key={category} sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: 10, color: POSE_CATEGORY_COLORS[category] ?? '#fff', fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {POSE_CATEGORY_LABELS[category] ?? category}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {poses.map(pose => (
                    <PoseButton key={pose.id} pose={pose} isActive={character.poseId === pose.id} onSelect={onPoseChange} categoryColor={POSE_CATEGORY_COLORS[category]} />
                  ))}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ── Small reusable PoseButton ─────────────────────────────────────────────────

const PoseButton: React.FC<{
  pose: PosePreset;
  isActive: boolean;
  onSelect: (id: string) => void;
  categoryColor?: string;
}> = ({ pose, isActive, onSelect, categoryColor = '#ff9800' }) => (
  <Box
    onClick={() => onSelect(pose.id)}
    sx={{
      px: 1.5, py: 0.7, borderRadius: '6px', cursor: 'pointer',
      bgcolor: isActive ? `${categoryColor}20` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isActive ? categoryColor : 'transparent'}`,
      transition: 'all 0.12s ease',
      '&:hover': { bgcolor: `${categoryColor}15` },
    }}
  >
    <Typography sx={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? categoryColor : 'rgba(255,255,255,0.75)' }}>
      {pose.name}
    </Typography>
    {pose.description && (
      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mt: 0.2 }}>
        {pose.description}
      </Typography>
    )}
  </Box>
);

export default BoneInspectorSidebar;
