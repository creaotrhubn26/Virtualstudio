export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
export type AnimationTimingFunction = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | string;

export interface AnimationConfig {
  duration: number;
  easing: AnimationTimingFunction;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: AnimationDirection;
  fillMode?: AnimationFillMode;
}

export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  xslow: 600,
} as const;

export const ANIMATION_EASINGS = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enter: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

export const KEYFRAMES = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideInUp: {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideOutDown: {
    from: { transform: 'translateY(0)', opacity: 1 },
    to: { transform: 'translateY(20px)', opacity: 0 },
  },
  scaleIn: {
    from: { transform: 'scale(0.9)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  shimmer: {
    from: { backgroundPosition: '-200% 0' },
    to: { backgroundPosition: '200% 0' },
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
} as const;

export function buildAnimation(
  keyframeName: keyof typeof KEYFRAMES,
  config: AnimationConfig,
): string {
  const { duration, easing, delay = 0, iterations = 1, direction = 'normal', fillMode = 'both' } = config;
  return `${keyframeName} ${duration}ms ${easing} ${delay}ms ${iterations} ${direction} ${fillMode}`;
}

export const transitionPresets = {
  smooth: `all ${ANIMATION_DURATIONS.normal}ms ${ANIMATION_EASINGS.default}`,
  fast: `all ${ANIMATION_DURATIONS.fast}ms ${ANIMATION_EASINGS.default}`,
  spring: `all ${ANIMATION_DURATIONS.slow}ms ${ANIMATION_EASINGS.spring}`,
  opacity: `opacity ${ANIMATION_DURATIONS.normal}ms ${ANIMATION_EASINGS.default}`,
  transform: `transform ${ANIMATION_DURATIONS.normal}ms ${ANIMATION_EASINGS.default}`,
  color: `color ${ANIMATION_DURATIONS.fast}ms ${ANIMATION_EASINGS.default}, background-color ${ANIMATION_DURATIONS.fast}ms ${ANIMATION_EASINGS.default}`,
} as const;

export const animations = {
  fadeIn: {
    animation: `fadeIn ${ANIMATION_DURATIONS.normal}ms ${ANIMATION_EASINGS.enter} both`,
  },
  slideIn: {
    animation: `slideInUp ${ANIMATION_DURATIONS.normal}ms ${ANIMATION_EASINGS.enter} both`,
  },
  pulse: {
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  shimmer: {
    animation: 'shimmer 1.5s linear infinite',
  },
  spin: {
    animation: `spin ${ANIMATION_DURATIONS.slow}ms ${ANIMATION_EASINGS.default} infinite`,
  },
} as const;
