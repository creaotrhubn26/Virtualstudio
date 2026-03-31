/**
 * storyboardAnimations
 *
 * Shared CSS keyframe animations and timing constants for storyboard
 * components: FrameAnnotationOverlay, AnimatedFrameCard, AnimatedTimeline.
 */

import { keyframes } from '@mui/material/styles';

// ── Keyframe animations ───────────────────────────────────────────────────────

/** Scale in with spring overshoot */
export const scaleInSpring = keyframes`
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
  60%  { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
  80%  { transform: translate(-50%, -50%) scale(0.96); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
`;

/** Scale out with fade */
export const scaleOutFade = keyframes`
  0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
`;

/** Hover lift effect */
export const hoverLift = keyframes`
  0%   { transform: translateY(0); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  100% { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
`;

/** Click ripple */
export const ripple = keyframes`
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
`;

/** Approval pulse (green) */
export const approvalPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  70%  { box-shadow: 0 0 0 12px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

/** Revision shake */
export const revisionShake = keyframes`
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-6px); }
  40%     { transform: translateX(6px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
`;

/** Light rays radiating outward */
export const lightRays = keyframes`
  0%   { transform: scale(1); opacity: 0.6; }
  50%  { transform: scale(1.4); opacity: 0.2; }
  100% { transform: scale(1.8); opacity: 0; }
`;

/** Focus area breathing */
export const focusBreathe = keyframes`
  0%,100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.7; }
  50%     { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
`;

/** Glow pulse */
export const glowPulse = keyframes`
  0%,100% { box-shadow: 0 0 6px rgba(255,165,0,0.4); }
  50%     { box-shadow: 0 0 20px rgba(255,165,0,0.9); }
`;

/** Arrow / dash flow animation (stroke-dashoffset) */
export const arrowFlow = keyframes`
  0%   { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
`;

/** Subtle bounce */
export const subtleBounce = keyframes`
  0%,100% { transform: translateY(0); }
  40%     { transform: translateY(-6px); }
  60%     { transform: translateY(-3px); }
`;

/** Tooltip appear */
export const tooltipAppear = keyframes`
  0%   { transform: translateY(4px); opacity: 0; }
  100% { transform: translateY(0);   opacity: 1; }
`;

/** Lock wiggle (used on protected/locked frames) */
export const lockWiggle = keyframes`
  0%,100% { transform: rotate(0deg); }
  20%     { transform: rotate(-8deg); }
  40%     { transform: rotate(8deg); }
  60%     { transform: rotate(-5deg); }
  80%     { transform: rotate(5deg); }
`;

/** Duration stretch (timeline frame resize) */
export const durationStretch = keyframes`
  0%   { transform: scaleX(1); }
  50%  { transform: scaleX(1.03); }
  100% { transform: scaleX(1); }
`;

/** Stagger fade in (for list reveals) */
export const staggerFadeIn = keyframes`
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
`;

/** Fade in upward */
export const fadeInUp = keyframes`
  0%   { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
`;

/** Slide in from right */
export const slideInRight = keyframes`
  0%   { opacity: 0; transform: translateX(24px); }
  100% { opacity: 1; transform: translateX(0); }
`;

/** Slide out to left */
export const slideOutLeft = keyframes`
  0%   { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(-24px); }
`;

/** Pop in with spring */
export const popIn = keyframes`
  0%   { opacity: 0; transform: scale(0.6); }
  70%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
`;

/** Playhead pulse for timeline */
export const playheadPulse = keyframes`
  0%,100% { opacity: 1; }
  50%     { opacity: 0.5; }
`;

/** Card flip for frame transitions */
export const cardFlip = keyframes`
  0%   { transform: perspective(600px) rotateY(0deg); }
  50%  { transform: perspective(600px) rotateY(90deg); opacity: 0; }
  51%  { opacity: 0; }
  100% { transform: perspective(600px) rotateY(0deg); opacity: 1; }
`;

// ── Timing constants ──────────────────────────────────────────────────────────

export const animationDurations = {
  instant:  '80ms',
  fast:     '150ms',
  normal:   '250ms',
  slow:     '400ms',
  verySlow: '600ms',
} as const;

export const animationEasings = {
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn:  'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce:  'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
} as const;

/**
 * Returns a CSS delay string for stagger animations.
 * @param index  Zero-based index of the element.
 * @param baseMs Base delay per step in milliseconds (default 50).
 */
export function getStaggerDelay(index: number, baseMs = 50): string {
  return `${index * baseMs}ms`;
}
