export interface PreviewAnimation {
  name: string;
  duration: string;
  timing: string;
  keyframes: string;
}

export interface MoodAnimation {
  speed: number;
  amplitude: number;
}

export const PREVIEW_ANIMATIONS: Record<string, PreviewAnimation> = {
  idle: {
    name: 'actor-idle',
    duration: '3s',
    timing: 'ease-in-out',
    keyframes: `@keyframes actor-idle {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }`,
  },
  breathe: {
    name: 'actor-breathe',
    duration: '4s',
    timing: 'ease-in-out',
    keyframes: `@keyframes actor-breathe {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(1.03); }
    }`,
  },
  sway: {
    name: 'actor-sway',
    duration: '5s',
    timing: 'ease-in-out',
    keyframes: `@keyframes actor-sway {
      0%, 100% { transform: rotate(0deg); }
      33% { transform: rotate(-2deg); }
      66% { transform: rotate(2deg); }
    }`,
  },
  tense: {
    name: 'actor-tense',
    duration: '1.5s',
    timing: 'ease-in-out',
    keyframes: `@keyframes actor-tense {
      0%, 100% { transform: translateX(0) scaleX(1); }
      25% { transform: translateX(-2px) scaleX(0.98); }
      75% { transform: translateX(2px) scaleX(1.02); }
    }`,
  },
};

const GENRE_ANIMATION_MAP: Record<string, string> = {
  'horror': 'tense',
  'cosmic-horror': 'tense',
  'action': 'sway',
  'sci-fi': 'breathe',
  'film-noir': 'idle',
};

const MOOD_MAP: Record<string, MoodAnimation> = {
  'intense': { speed: 1.5, amplitude: 1.3 },
  'relaxed': { speed: 0.7, amplitude: 0.6 },
  'anxious': { speed: 2.0, amplitude: 1.8 },
  'confident': { speed: 1.0, amplitude: 1.0 },
  'mysterious': { speed: 0.8, amplitude: 0.7 },
};

export function getPreviewAnimation(genre?: string): PreviewAnimation {
  const key = genre ? (GENRE_ANIMATION_MAP[genre] ?? 'idle') : 'idle';
  return PREVIEW_ANIMATIONS[key] ?? PREVIEW_ANIMATIONS['idle'];
}

export function getMoodAnimation(mood?: string): MoodAnimation {
  return mood ? (MOOD_MAP[mood] ?? { speed: 1.0, amplitude: 1.0 }) : { speed: 1.0, amplitude: 1.0 };
}
