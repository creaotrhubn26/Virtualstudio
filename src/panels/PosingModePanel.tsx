/**
 * PosingModePanel
 * Set.a.Light 3D-style posing interface with:
 *  - SVG body diagram with clickable joint nodes
 *  - Per-bone rotation sliders (X / Y / Z)
 *  - Pose preset library (from PoseLibrary.ts)
 *  - T-pose / A-pose / Reset controls
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  Tooltip,
  IconButton,
  Divider,
  Chip,
  Paper,
  Grid,
  ButtonBase,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  RestartAlt as ResetIcon,
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  AccessibilityNew as TposeIcon,
  DirectionsWalk as NeutralIcon,
  SelfImprovement as AIcon,
} from '@mui/icons-material';
import { ALL_POSES } from '../core/animation/PoseLibrary';
import type { PosePreset } from '../core/animation/PoseLibrary';

// ─── Joint definitions ────────────────────────────────────────────────────────
interface JointDef {
  id: string;           // matches HUMANOID_BONE_MAP key
  label: string;        // display label
  svgX: number;         // SVG body diagram x (0–160)
  svgY: number;         // SVG body diagram y (0–220)
}

const JOINTS: JointDef[] = [
  { id: 'head',          label: 'Hode',        svgX: 80,  svgY: 18  },
  { id: 'neck',          label: 'Nakke',       svgX: 80,  svgY: 38  },
  { id: 'chest',         label: 'Bryst',       svgX: 80,  svgY: 60  },
  { id: 'spine',         label: 'Rygg',        svgX: 80,  svgY: 78  },
  { id: 'hips',          label: 'Hofter',      svgX: 80,  svgY: 100 },
  // Left arm (viewer's right in front view)
  { id: 'leftShoulder',  label: 'V. Skulder',  svgX: 52,  svgY: 50  },
  { id: 'leftUpperArm',  label: 'V. Overarm',  svgX: 40,  svgY: 68  },
  { id: 'leftLowerArm',  label: 'V. Underarm', svgX: 32,  svgY: 88  },
  { id: 'leftHand',      label: 'V. Hånd',     svgX: 25,  svgY: 107 },
  // Right arm
  { id: 'rightShoulder', label: 'H. Skulder',  svgX: 108, svgY: 50  },
  { id: 'rightUpperArm', label: 'H. Overarm',  svgX: 120, svgY: 68  },
  { id: 'rightLowerArm', label: 'H. Underarm', svgX: 128, svgY: 88  },
  { id: 'rightHand',     label: 'H. Hånd',     svgX: 135, svgY: 107 },
  // Left leg
  { id: 'leftUpperLeg',  label: 'V. Lår',      svgX: 65,  svgY: 118 },
  { id: 'leftLowerLeg',  label: 'V. Legg',     svgX: 63,  svgY: 152 },
  { id: 'leftFoot',      label: 'V. Fot',      svgX: 60,  svgY: 182 },
  // Right leg
  { id: 'rightUpperLeg', label: 'H. Lår',      svgX: 95,  svgY: 118 },
  { id: 'rightLowerLeg', label: 'H. Legg',     svgX: 97,  svgY: 152 },
  { id: 'rightFoot',     label: 'H. Fot',      svgX: 100, svgY: 182 },
];

// ─── Rotation state ───────────────────────────────────────────────────────────
type BoneRotations = Record<string, { x: number; y: number; z: number }>;

const DEFAULT_ROT = { x: 0, y: 0, z: 0 };
const toDeg = (r: number) => Math.round((r * 180) / Math.PI);
const toRad = (d: number) => (d * Math.PI) / 180;

// ─── SVG Body Diagram ─────────────────────────────────────────────────────────
const BodyDiagram: React.FC<{
  selectedJoint: string | null;
  onSelectJoint: (id: string) => void;
}> = ({ selectedJoint, onSelectJoint }) => {
  const W = 160;
  const H = 220;
  const R = 7; // joint node radius

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxHeight: 220, userSelect: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Body silhouette ── */}
      {/* Head */}
      <circle cx={80} cy={14} r={13} fill="none" stroke="#555" strokeWidth={1.5} />
      {/* Neck */}
      <line x1={80} y1={27} x2={80} y2={40} stroke="#555" strokeWidth={1.5} />
      {/* Torso */}
      <path d="M52,48 Q80,44 108,48 L112,105 Q80,110 48,105 Z" fill="none" stroke="#555" strokeWidth={1.5} />
      {/* Left arm */}
      <line x1={52} y1={50} x2={40} y2={70} stroke="#555" strokeWidth={1.5} />
      <line x1={40} y1={70} x2={32} y2={90} stroke="#555" strokeWidth={1.5} />
      <line x1={32} y1={90} x2={25} y2={108} stroke="#555" strokeWidth={1.5} />
      {/* Right arm */}
      <line x1={108} y1={50} x2={120} y2={70} stroke="#555" strokeWidth={1.5} />
      <line x1={120} y1={70} x2={128} y2={90} stroke="#555" strokeWidth={1.5} />
      <line x1={128} y1={90} x2={135} y2={108} stroke="#555" strokeWidth={1.5} />
      {/* Left leg */}
      <line x1={68} y1={108} x2={65} y2={120} stroke="#555" strokeWidth={1.5} />
      <line x1={65} y1={120} x2={63} y2={155} stroke="#555" strokeWidth={1.5} />
      <line x1={63} y1={155} x2={58} y2={185} stroke="#555" strokeWidth={1.5} />
      {/* Right leg */}
      <line x1={92} y1={108} x2={95} y2={120} stroke="#555" strokeWidth={1.5} />
      <line x1={95} y1={120} x2={97} y2={155} stroke="#555" strokeWidth={1.5} />
      <line x1={97} y1={155} x2={102} y2={185} stroke="#555" strokeWidth={1.5} />

      {/* ── Joint nodes ── */}
      {JOINTS.map((j) => {
        const isSelected = selectedJoint === j.id;
        return (
          <g key={j.id} style={{ cursor: 'pointer' }} onClick={() => onSelectJoint(j.id)}>
            {/* Outer glow for selected */}
            {isSelected && (
              <circle
                cx={j.svgX}
                cy={j.svgY}
                r={R + 4}
                fill="rgba(255,152,0,0.15)"
                stroke="#ff9800"
                strokeWidth={1}
              />
            )}
            {/* Joint circle */}
            <circle
              cx={j.svgX}
              cy={j.svgY}
              r={R}
              fill={isSelected ? '#ff9800' : '#1a1a2e'}
              stroke={isSelected ? '#ffb74d' : '#00bcd4'}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {/* Rotation axis arrows for non-selected joints (match Set.a.Light style) */}
            {!isSelected && (
              <g fill="#00bcd4" opacity={0.7}>
                {/* Small arrows hinting at rotation */}
                <path
                  d={`M${j.svgX - R - 3},${j.svgY} l-3,-2 l0,4 Z`}
                  transform={`rotate(0,${j.svgX},${j.svgY})`}
                />
                <path
                  d={`M${j.svgX + R + 3},${j.svgY} l3,-2 l0,4 Z`}
                  transform={`rotate(180,${j.svgX},${j.svgY})`}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* ── Spine line overlay ── */}
      <line x1={80} y1={40} x2={80} y2={105} stroke="#333" strokeWidth={1} strokeDasharray="3,3" />
    </svg>
  );
};

// ─── Rotation axis slider ─────────────────────────────────────────────────────
const AxisSlider: React.FC<{
  axis: 'x' | 'y' | 'z';
  valueDeg: number;
  color: string;
  onChange: (deg: number) => void;
}> = ({ axis, valueDeg, color, onChange }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
    <Typography variant="caption" sx={{ color, fontWeight: 700, minWidth: 16, textTransform: 'uppercase' }}>
      {axis}
    </Typography>
    <Slider
      value={valueDeg}
      min={-180}
      max={180}
      step={1}
      onChange={(_, v) => onChange(v as number)}
      sx={{
        color,
        flexGrow: 1,
        '& .MuiSlider-thumb': { width: 12, height: 12 },
        '& .MuiSlider-rail': { opacity: 0.3 },
      }}
    />
    <Typography variant="caption" sx={{ color: '#aaa', minWidth: 36, textAlign: 'right' }}>
      {valueDeg > 0 ? '+' : ''}{valueDeg}°
    </Typography>
  </Box>
);

// ─── Stance icons ─────────────────────────────────────────────────────────────
const StanceButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <Tooltip title={label} placement="bottom">
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 0.75,
        borderRadius: 1,
        border: '1px solid',
        borderColor: active ? '#ff9800' : '#333',
        backgroundColor: active ? 'rgba(255,152,0,0.12)' : 'rgba(255,255,255,0.03)',
        color: active ? '#ff9800' : '#888',
        minWidth: 44,
        '&:hover': { borderColor: '#ff9800', color: '#ff9800' },
        transition: 'all 0.15s',
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontSize: 9, mt: 0.25 }}>{label}</Typography>
    </ButtonBase>
  </Tooltip>
);

// ─── Category group colors ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  portrait: '#64b5f6',
  fashion: '#f06292',
  commercial: '#81c784',
  editorial: '#ba68c8',
  fitness: '#ff8a65',
  dance: '#4dd0e1',
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
export const PosingModePanel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<string | null>(null);
  const [boneRotations, setBoneRotations] = useState<BoneRotations>({});
  const [activeStance, setActiveStance] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const [charLabel, setCharLabel] = useState<string | null>(null);
  const [skeletonAvailable, setSkeletonAvailable] = useState<boolean | null>(null);

  // Listen for the POSERING button toggle
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { enabled?: boolean } | undefined;
      const nowEnabled = detail?.enabled ?? false;
      setVisible(nowEnabled);
      if (nowEnabled) {
        // Reset info state then ask main.ts which character is targeted
        setCharLabel(null);
        setSkeletonAvailable(null);
        window.dispatchEvent(new CustomEvent('ch-posing-request-info'));
      }
    };
    window.addEventListener('ch-posing-mode', handler);
    return () => window.removeEventListener('ch-posing-mode', handler);
  }, []);

  // Receive character info from main.ts
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { available: boolean; modelLabel: string | null };
      setSkeletonAvailable(detail.available);
      setCharLabel(detail.modelLabel);
    };
    window.addEventListener('ch-posing-character-info', handler);
    return () => window.removeEventListener('ch-posing-character-info', handler);
  }, []);

  // Receive no-skeleton error feedback
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reason: string; modelLabel?: string };
      setSkeletonAvailable(false);
      if (detail.modelLabel) setCharLabel(detail.modelLabel);
    };
    window.addEventListener('ch-posing-no-skeleton', handler);
    return () => window.removeEventListener('ch-posing-no-skeleton', handler);
  }, []);

  if (!visible) return null;

  const getRotation = (boneId: string) => boneRotations[boneId] ?? DEFAULT_ROT;

  // Dispatch bone rotation to main.ts
  const dispatchRotation = useCallback((boneId: string, rot: { x: number; y: number; z: number }) => {
    window.dispatchEvent(new CustomEvent('ch-rotate-bone', {
      detail: { boneName: boneId, rotation: rot },
    }));
  }, []);

  const handleAxisChange = useCallback(
    (axis: 'x' | 'y' | 'z', deg: number) => {
      if (!selectedJoint) return;
      const prev = boneRotations[selectedJoint] ?? DEFAULT_ROT;
      const updated = { ...prev, [axis]: toRad(deg) };
      setBoneRotations((s) => ({ ...s, [selectedJoint]: updated }));
      dispatchRotation(selectedJoint, updated);
    },
    [selectedJoint, boneRotations, dispatchRotation],
  );

  // Stance buttons
  const applyTpose = useCallback(() => {
    const reset: BoneRotations = {};
    JOINTS.forEach((j) => { reset[j.id] = DEFAULT_ROT; });
    setBoneRotations(reset);
    setActiveStance('t-pose');
    setActivePreset(null);
    window.dispatchEvent(new CustomEvent('ch-pose-t-pose'));
  }, []);

  const applyApose = useCallback(() => {
    const apose: BoneRotations = {
      leftUpperArm:  { x: 0, y: 0, z: toRad(-45) },
      rightUpperArm: { x: 0, y: 0, z: toRad(45)  },
      leftLowerArm:  DEFAULT_ROT,
      rightLowerArm: DEFAULT_ROT,
    };
    setBoneRotations(apose);
    setActiveStance('a-pose');
    setActivePreset(null);
    window.dispatchEvent(new CustomEvent('ch-pose-a-pose'));
  }, []);

  const applyNeutral = useCallback(() => {
    const neutral: BoneRotations = {
      leftUpperArm:  { x: 0, y: 0, z: toRad(-15) },
      rightUpperArm: { x: 0, y: 0, z: toRad(15)  },
      leftLowerArm:  { x: 0, y: toRad(10), z: 0 },
      rightLowerArm: { x: 0, y: toRad(-10), z: 0 },
      leftUpperLeg:  { x: toRad(5), y: toRad(-3), z: 0 },
      rightUpperLeg: { x: toRad(5), y: toRad(3), z: 0 },
    };
    setBoneRotations(neutral);
    setActiveStance('neutral');
    setActivePreset(null);
    window.dispatchEvent(new CustomEvent('ch-pose-neutral'));
  }, []);

  const resetAll = useCallback(() => {
    setBoneRotations({});
    setActiveStance(null);
    setActivePreset(null);
    setSelectedJoint(null);
    window.dispatchEvent(new CustomEvent('ch-pose-reset-all'));
  }, []);

  // Apply a full pose preset
  const applyPreset = useCallback((preset: PosePreset) => {
    // Convert PoseLibrary bone names to our humanoid keys
    const newRotations: BoneRotations = {};
    Object.entries(preset.pose).forEach(([boneName, rot]) => {
      if (!rot) return;
      // Map Mixamo bone names to humanoid keys
      const humanoidKey = mixamoToHumanoidKey(boneName);
      newRotations[humanoidKey] = rot;
    });
    setBoneRotations(newRotations);
    setActivePreset(preset.id);
    setActiveStance(null);
    window.dispatchEvent(new CustomEvent('ch-apply-pose', {
      detail: { poseId: preset.id },
    }));
  }, []);

  // Listen for external pose reset (from other panels)
  useEffect(() => {
    const handler = () => {
      setBoneRotations({});
      setActivePreset(null);
      setActiveStance(null);
      setSelectedJoint(null);
    };
    window.addEventListener('ch-pose-reset-all', handler);
    return () => window.removeEventListener('ch-pose-reset-all', handler);
  }, []);

  const selectedJointDef = JOINTS.find((j) => j.id === selectedJoint);
  const rot = selectedJoint ? getRotation(selectedJoint) : null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 56,
        right: 0,
        width: 280,
        height: 'calc(100vh - 56px)',
        bgcolor: '#0e0e18',
        borderLeft: '1px solid #222',
        zIndex: 350,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.6)',
      }}
    >
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: '1px solid #222' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, letterSpacing: 0.5 }}>
            Poseringmodus
          </Typography>
          <Tooltip title="Klikk på et ledd for å justere rotasjon">
            <IconButton size="small" onClick={() => setHelpOpen((v) => !v)} sx={{ color: '#666' }}>
              <HelpIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Active character indicator */}
        {charLabel && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            <Box
              sx={{
                width: 7, height: 7, borderRadius: '50%',
                bgcolor: skeletonAvailable === false ? '#ef5350' : skeletonAvailable ? '#66bb6a' : '#ffa726',
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ color: '#aaa', lineHeight: 1.3 }} noWrap>
              {charLabel}
            </Typography>
          </Box>
        )}

        {/* No-skeleton / no-character warning */}
        {skeletonAvailable === false && (
          <Box sx={{ mt: 0.75, px: 1, py: 0.5, bgcolor: 'rgba(239,83,80,0.1)', borderRadius: 1, border: '1px solid rgba(239,83,80,0.3)' }}>
            <Typography variant="caption" sx={{ color: '#ef9a9a', display: 'block' }}>
              {charLabel
                ? `"${charLabel}" har ingen rigg/skeleton. Last inn en humanoid-karakter (Mixamo, ReadyPlayerMe, SAM) for å bruke posering.`
                : 'Ingen karakter funnet i scenen. Last inn en humanoid-karakter for å bruke posering.'}
            </Typography>
          </Box>
        )}

        {skeletonAvailable === null && visible && (
          <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
            Laster karakterinfo…
          </Typography>
        )}

        {helpOpen && (
          <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>
            Klikk på et ledd i diagrammet for å velge det. Bruk sliderene nedenfor for å rotere. Virker på alle humanoid avatarer (Mixamo, ReadyPlayerMe, egne modeller).
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* ── Stance buttons ── */}
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
          <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
            Grunnstilling
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <StanceButton
              icon={<TposeIcon sx={{ fontSize: 20 }} />}
              label="T-pose"
              active={activeStance === 't-pose'}
              onClick={applyTpose}
            />
            <StanceButton
              icon={<NeutralIcon sx={{ fontSize: 20 }} />}
              label="Nøytral"
              active={activeStance === 'neutral'}
              onClick={applyNeutral}
            />
            <StanceButton
              icon={<AIcon sx={{ fontSize: 20 }} />}
              label="A-pose"
              active={activeStance === 'a-pose'}
              onClick={applyApose}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Nullstill alle ledd">
              <IconButton
                size="small"
                onClick={resetAll}
                sx={{ color: '#666', border: '1px solid #333', borderRadius: 1 }}
              >
                <ResetIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ borderColor: '#1e1e1e' }} />

        {/* ── Body diagram ── */}
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#666', mb: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
            Ledddiagram
          </Typography>
          <BodyDiagram
            selectedJoint={selectedJoint}
            onSelectJoint={(id) => setSelectedJoint((prev) => (prev === id ? null : id))}
          />
        </Box>

        {/* ── Joint rotation controls ── */}
        <Box
          sx={{
            mx: 1.5,
            mb: 1.5,
            p: 1.5,
            borderRadius: 1,
            backgroundColor: selectedJoint ? 'rgba(255,152,0,0.07)' : 'rgba(255,255,255,0.03)',
            border: '1px solid',
            borderColor: selectedJoint ? 'rgba(255,152,0,0.3)' : '#222',
            minHeight: 90,
            transition: 'all 0.2s',
          }}
        >
          {selectedJoint && selectedJointDef && rot ? (
            <>
              <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 700, mb: 1, display: 'block' }}>
                {selectedJointDef.label} — Rotasjon
              </Typography>
              <AxisSlider axis="x" valueDeg={toDeg(rot.x)} color="#ef5350" onChange={(d) => handleAxisChange('x', d)} />
              <AxisSlider axis="y" valueDeg={toDeg(rot.y)} color="#66bb6a" onChange={(d) => handleAxisChange('y', d)} />
              <AxisSlider axis="z" valueDeg={toDeg(rot.z)} color="#42a5f5" onChange={(d) => handleAxisChange('z', d)} />
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 70 }}>
              <Typography variant="caption" sx={{ color: '#555', textAlign: 'center' }}>
                Klikk et ledd i diagrammet<br />for å justere rotasjon
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ borderColor: '#1e1e1e' }} />

        {/* ── Pose preset library ── */}
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
          <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
            Posebibliotek
          </Typography>

          {(['portrait', 'fashion', 'commercial', 'editorial', 'fitness', 'dance'] as const).map((cat) => {
            const poses = ALL_POSES.filter((p) => p.category === cat);
            if (poses.length === 0) return null;
            const catColor = CATEGORY_COLORS[cat] ?? '#888';

            return (
              <Accordion
                key={cat}
                disableGutters
                defaultExpanded={cat === 'portrait'}
                sx={{
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  mb: 0.25,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ fontSize: 14, color: '#555' }} />}
                  sx={{ minHeight: 32, px: 0, py: 0, '& .MuiAccordionSummary-content': { m: 0 } }}
                >
                  <Chip
                    label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      backgroundColor: `${catColor}22`,
                      color: catColor,
                      border: `1px solid ${catColor}55`,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#555', ml: 0.75, alignSelf: 'center' }}>
                    {poses.length} poser
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0.5, pb: 0 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {poses.map((preset) => (
                      <ButtonBase
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          textAlign: 'left',
                          p: 0.75,
                          borderRadius: 0.75,
                          border: '1px solid',
                          borderColor: activePreset === preset.id ? catColor : '#222',
                          backgroundColor: activePreset === preset.id ? `${catColor}14` : 'rgba(255,255,255,0.02)',
                          '&:hover': { borderColor: catColor, backgroundColor: `${catColor}0e` },
                          transition: 'all 0.15s',
                          width: '100%',
                        }}
                      >
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="caption" sx={{ color: activePreset === preset.id ? catColor : '#ccc', fontWeight: 600, display: 'block' }}>
                            {preset.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666', fontSize: 10, display: 'block', mt: 0.25 }}>
                            {preset.description}
                          </Typography>
                        </Box>
                        <Chip
                          label={diffLabel(preset.difficulty)}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 9,
                            backgroundColor: diffColor(preset.difficulty) + '22',
                            color: diffColor(preset.difficulty),
                            border: 'none',
                            ml: 0.5,
                            mt: 0.25,
                            flexShrink: 0,
                          }}
                        />
                      </ButtonBase>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </Box>
    </Box>
    </Box>
  );
};

// ─── Helper functions ─────────────────────────────────────────────────────────
function diffColor(d: string): string {
  if (d === 'beginner') return '#66bb6a';
  if (d === 'advanced') return '#ef5350';
  return '#ffa726';
}

function diffLabel(d: string): string {
  if (d === 'beginner') return 'Enkel';
  if (d === 'advanced') return 'Avansert';
  return 'Middels';
}

/** Map PoseLibrary mixamorigXxx bone names → HUMANOID_BONE_MAP keys */
function mixamoToHumanoidKey(mixamoName: string): string {
  const map: Record<string, string> = {
    mixamorigHips:           'hips',
    mixamorigSpine:          'spine',
    mixamorigSpine1:         'chest',
    mixamorigSpine2:         'chest',
    mixamorigNeck:           'neck',
    mixamorigHead:           'head',
    mixamorigLeftShoulder:   'leftShoulder',
    mixamorigLeftArm:        'leftUpperArm',
    mixamorigLeftForeArm:    'leftLowerArm',
    mixamorigLeftHand:       'leftHand',
    mixamorigRightShoulder:  'rightShoulder',
    mixamorigRightArm:       'rightUpperArm',
    mixamorigRightForeArm:   'rightLowerArm',
    mixamorigRightHand:      'rightHand',
    mixamorigLeftUpLeg:      'leftUpperLeg',
    mixamorigLeftLeg:        'leftLowerLeg',
    mixamorigLeftFoot:       'leftFoot',
    mixamorigRightUpLeg:     'rightUpperLeg',
    mixamorigRightLeg:       'rightLowerLeg',
    mixamorigRightFoot:      'rightFoot',
  };
  return map[mixamoName] ?? mixamoName;
}

// ─── Standalone app wrapper for panel system ──────────────────────────────────
export const PosingModePanelApp: React.FC = () => <PosingModePanel />;
