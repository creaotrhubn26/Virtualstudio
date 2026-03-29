/**
 * BoneInspectorSidebar
 *
 * Beinselektor og rotasjonsjustering for multiview skjelett-panelet.
 * Gir brukeren muligheten til å:
 *   - Velge et bein fra en kategorisert liste
 *   - Justere X/Y/Z-rotasjon med slidere
 *   - Velge en ferdig pose fra posebiblioteket
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Slider,
  Stack,
  Divider,
  Chip,
  Button,
  ButtonGroup,
  Tooltip,
} from '@mui/material';
import { RestartAlt, AccessibilityNew } from '@mui/icons-material';
import { ALL_POSES, PosePreset, BONE_NAMES } from '../core/animation/PoseLibrary';
import { ActiveCharacterPose } from './MultiviewSkeletonPanel';

// ============================================================================
// Bone groups for organized display
// ============================================================================

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

// ============================================================================
// Pose category labels in Norwegian
// ============================================================================

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

// ============================================================================
// Bone rotation value display helper
// ============================================================================

function toDeg(rad: number): string {
  return (rad * (180 / Math.PI)).toFixed(1) + '°';
}

// ============================================================================
// Component
// ============================================================================

interface BoneInspectorSidebarProps {
  character: ActiveCharacterPose;
  selectedBone: string | null;
  onSelectBone: (boneName: string) => void;
  onBoneRotationChange: (boneName: string, axis: 'x' | 'y' | 'z', value: number) => void;
  onPoseChange: (poseId: string) => void;
}

export const BoneInspectorSidebar: React.FC<BoneInspectorSidebarProps> = ({
  character,
  selectedBone,
  onSelectBone,
  onBoneRotationChange,
  onPoseChange,
}) => {
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

  const posesByCategory = useMemo(() => {
    const map: Record<string, PosePreset[]> = {};
    ALL_POSES.forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AccessibilityNew sx={{ fontSize: 16, color: '#ff9800' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {character.label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', mt: 0.3 }}>
          {character.avatarType} · {ALL_POSES.find(p => p.id === character.poseId)?.name ?? character.poseId}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 } }}>

        {/* ── Bone rotation inspector ── */}
        {selectedBoneData && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
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
                    }
                  }}
                  sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ff9800' }, display: 'flex', alignItems: 'center' }}
                >
                  <RestartAlt sx={{ fontSize: 16 }} />
                </Box>
              </Tooltip>
            </Box>

            {(['x', 'y', 'z'] as const).map(axis => (
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
                        px: 1.2,
                        py: 0.4,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: isSelected ? 700 : 400,
                        bgcolor: isSelected ? `${group.color}30` : 'rgba(255,255,255,0.05)',
                        color: isSelected ? group.color : 'rgba(255,255,255,0.65)',
                        border: `1px solid ${isSelected ? group.color : 'transparent'}`,
                        transition: 'all 0.12s ease',
                        position: 'relative',
                        '&:hover': { bgcolor: `${group.color}20`, color: group.color },
                        ...(hasOverride && !isSelected && {
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: '#ff9800',
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
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
            Posebibliotek
          </Typography>
          {Object.entries(posesByCategory).map(([category, poses]) => (
            <Box key={category} sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: 10, color: POSE_CATEGORY_COLORS[category] ?? '#fff', fontWeight: 700, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {POSE_CATEGORY_LABELS[category] ?? category}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                {poses.map(pose => {
                  const isActive = character.poseId === pose.id;
                  return (
                    <Box
                      key={pose.id}
                      onClick={() => onPoseChange(pose.id)}
                      sx={{
                        px: 1.5,
                        py: 0.7,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        bgcolor: isActive ? `${POSE_CATEGORY_COLORS[category] ?? '#ff9800'}20` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? POSE_CATEGORY_COLORS[category] ?? '#ff9800' : 'transparent'}`,
                        transition: 'all 0.12s ease',
                        '&:hover': { bgcolor: `${POSE_CATEGORY_COLORS[category] ?? '#ff9800'}15` },
                      }}
                    >
                      <Typography sx={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? (POSE_CATEGORY_COLORS[category] ?? '#ff9800') : 'rgba(255,255,255,0.75)',
                      }}>
                        {pose.name}
                      </Typography>
                      {pose.description && (
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', mt: 0.2 }}>
                          {pose.description}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default BoneInspectorSidebar;
