import { create } from 'zustand';

export type EasingFunction = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';

export interface Keyframe {
  id: string;
  time: number;
  value: number | number[] | Record<string, number>;
  easing: EasingFunction;
}

export interface AnimationTrack {
  id: string;
  name: string;
  property: string;
  targetId: string;
  keyframes: Keyframe[];
  color?: string;
  muted?: boolean;
  locked?: boolean;
}

interface AnimationState {
  tracks: AnimationTrack[];
  currentFrame: number;
  totalFrames: number;
  fps: number;
  isPlaying: boolean;
  isLooping: boolean;
  isRecording: boolean;
  selectedKeyframe: string | null;
  selectedTrack: string | null;
  zoom: number;
  scrollLeft: number;

  // Actions
  setCurrentFrame: (frame: number) => void;
  setTotalFrames: (frames: number) => void;
  setFps: (fps: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggleLoop: () => void;
  toggleRecording: () => void;
  addTrack: (track: AnimationTrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<AnimationTrack>) => void;
  addKeyframe: (trackId: string, keyframe: Keyframe) => void;
  removeKeyframe: (trackId: string, keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, updates: Partial<Keyframe>) => void;
  selectKeyframe: (keyframeId: string | null) => void;
  selectTrack: (trackId: string | null) => void;
  setZoom: (zoom: number) => void;
  setScrollLeft: (scrollLeft: number) => void;
}

export const useAnimationStore = create<AnimationState>((set, get) => ({
  tracks: [],
  currentFrame: 0,
  totalFrames: 300,
  fps: 30,
  isPlaying: false,
  isLooping: true,
  isRecording: false,
  selectedKeyframe: null,
  selectedTrack: null,
  zoom: 1,
  scrollLeft: 0,

  setCurrentFrame: (frame) => set({ currentFrame: Math.max(0, Math.min(frame, get().totalFrames)) }),
  setTotalFrames: (frames) => set({ totalFrames: Math.max(1, frames) }),
  setFps: (fps) => set({ fps: Math.max(1, Math.min(120, fps)) }),
  
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentFrame: 0 }),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  toggleRecording: () => set((state) => ({ isRecording: !state.isRecording })),

  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  removeTrack: (trackId) => set((state) => ({
    tracks: state.tracks.filter((t) => t.id !== trackId),
    selectedTrack: state.selectedTrack === trackId ? null : state.selectedTrack,
  })),
  updateTrack: (trackId, updates) => set((state) => ({
    tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
  })),

  addKeyframe: (trackId, keyframe) => set((state) => ({
    tracks: state.tracks.map((t) =>
      t.id === trackId ? { ...t, keyframes: [...t.keyframes, keyframe].sort((a, b) => a.time - b.time) } : t
    ),
  })),
  removeKeyframe: (trackId, keyframeId) => set((state) => ({
    tracks: state.tracks.map((t) =>
      t.id === trackId ? { ...t, keyframes: t.keyframes.filter((k) => k.id !== keyframeId) } : t
    ),
    selectedKeyframe: state.selectedKeyframe === keyframeId ? null : state.selectedKeyframe,
  })),
  updateKeyframe: (keyframeId, updates) => set((state) => ({
    tracks: state.tracks.map((t) => ({
      ...t,
      keyframes: t.keyframes.map((k) => (k.id === keyframeId ? { ...k, ...updates } : k)),
    })),
  })),

  selectKeyframe: (keyframeId) => set({ selectedKeyframe: keyframeId }),
  selectTrack: (trackId) => set({ selectedTrack: trackId }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
  setScrollLeft: (scrollLeft) => set({ scrollLeft: Math.max(0, scrollLeft) }),
}));

