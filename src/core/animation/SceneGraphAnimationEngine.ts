/**
 * SceneGraphAnimationEngine - Animation system for scene graph nodes
 * Provides keyframe-based animation with various easing functions
 */

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeOutBounce';

export const EASING_FUNCTIONS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export interface Keyframe {
  time: number;
  value: number | number[] | { x: number; y: number; z: number };
  easing?: EasingName;
  tangentIn?: number;
  tangentOut?: number;
}

export interface AnimationTrack {
  id: string;
  nodeId: string;
  type: 'position' | 'rotation' | 'scale' | 'lightPower' | 'lightColor' | 'colorTemperature' | 'focalLength' | 'aperture' | 'focusDistance' | string;
  property?: string;
  keyframes: Keyframe[];
  enabled: boolean;
}

export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  tracks: AnimationTrack[];
  loop: boolean;
  speed: number;
}

export interface SceneGraphNode {
  id: string;
  name: string;
  type: 'light' | 'camera' | 'mesh' | 'group';
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  children?: SceneGraphNode[];
  metadata?: Record<string, unknown>;
}

interface PlaybackState {
  clipId: string;
  currentTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
}

class SceneGraphAnimationEngine {
  private clips: Map<string, AnimationClip> = new Map();
  private nodes: Map<string, SceneGraphNode> = new Map();
  private playbackStates: Map<string, PlaybackState> = new Map();
  private listeners: Map<string, Set<(time: number) => void>> = new Map();
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  createClip(name: string, duration: number = 10): AnimationClip {
    const id = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clip: AnimationClip = {
      id,
      name,
      duration,
      tracks: [],
      loop: true,
      speed: 1,
    };
    this.clips.set(id, clip);
    return clip;
  }

  getClip(clipId: string): AnimationClip | undefined {
    return this.clips.get(clipId);
  }

  getAllClips(): AnimationClip[] {
    return Array.from(this.clips.values());
  }

  deleteClip(clipId: string): void {
    this.clips.delete(clipId);
    this.playbackStates.delete(clipId);
  }

  registerNode(node: SceneGraphNode): void {
    this.nodes.set(node.id, node);
  }

  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  getNode(nodeId: string): SceneGraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): SceneGraphNode[] {
    return Array.from(this.nodes.values());
  }

  addTrack(clipId: string, track: Omit<AnimationTrack, 'id'>): AnimationTrack | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    const fullTrack: AnimationTrack = {
      ...track,
      id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    clip.tracks.push(fullTrack);
    return fullTrack;
  }

  removeTrack(clipId: string, trackId: string): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;
    clip.tracks = clip.tracks.filter((t) => t.id !== trackId);
  }

  getTrack(clipId: string, trackId: string): AnimationTrack | undefined {
    const clip = this.clips.get(clipId);
    return clip?.tracks.find((t) => t.id === trackId);
  }

  addKeyframe(clipId: string, trackId: string, keyframe: Keyframe): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;

    const existingIndex = track.keyframes.findIndex(
      (kf) => Math.abs(kf.time - keyframe.time) < 0.01
    );

    if (existingIndex !== -1) {
      track.keyframes[existingIndex] = keyframe;
    } else {
      track.keyframes.push(keyframe);
      track.keyframes.sort((a, b) => a.time - b.time);
    }
  }

  removeKeyframe(clipId: string, trackId: string, time: number): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;
    track.keyframes = track.keyframes.filter((kf) => Math.abs(kf.time - time) >= 0.01);
  }

  moveKeyframe(clipId: string, trackId: string, oldTime: number, newTime: number): void {
    const track = this.getTrack(clipId, trackId);
    if (!track) return;

    const keyframe = track.keyframes.find((kf) => Math.abs(kf.time - oldTime) < 0.01);
    if (keyframe) {
      keyframe.time = Math.max(0, newTime);
      track.keyframes.sort((a, b) => a.time - b.time);
    }
  }

  play(clipId: string): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;

    let state = this.playbackStates.get(clipId);
    if (!state) {
      state = {
        clipId,
        currentTime: 0,
        isPlaying: true,
        isPaused: false,
        speed: clip.speed,
      };
      this.playbackStates.set(clipId, state);
    } else {
      state.isPlaying = true;
      state.isPaused = false;
    }

    this.startAnimationLoop();
  }

  pause(clipId: string): void {
    const state = this.playbackStates.get(clipId);
    if (state) {
      state.isPaused = true;
    }
  }

  stop(clipId: string): void {
    const state = this.playbackStates.get(clipId);
    if (state) {
      state.isPlaying = false;
      state.isPaused = false;
      state.currentTime = 0;
    }
  }

  setTime(time: number, clipId?: string): void {
    if (clipId) {
      const state = this.playbackStates.get(clipId);
      if (state) {
        state.currentTime = time;
        this.evaluateClip(clipId, time);
        this.notifyListeners(clipId, time);
      }
    } else {
      this.playbackStates.forEach((state) => {
        state.currentTime = time;
        this.evaluateClip(state.clipId, time);
        this.notifyListeners(state.clipId, time);
      });
    }
  }

  getTime(clipId: string): number {
    return this.playbackStates.get(clipId)?.currentTime ?? 0;
  }

  onTimeUpdate(clipId: string, callback: (time: number) => void): () => void {
    if (!this.listeners.has(clipId)) {
      this.listeners.set(clipId, new Set());
    }
    this.listeners.get(clipId)!.add(callback);

    return () => {
      this.listeners.get(clipId)?.delete(callback);
    };
  }

  private notifyListeners(clipId: string, time: number): void {
    this.listeners.get(clipId)?.forEach((cb) => cb(time));
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      const delta = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;

      let anyPlaying = false;

      this.playbackStates.forEach((state) => {
        if (state.isPlaying && !state.isPaused) {
          anyPlaying = true;
          const clip = this.clips.get(state.clipId);
          if (!clip) return;

          state.currentTime += delta * state.speed;

          if (state.currentTime >= clip.duration) {
            if (clip.loop) {
              state.currentTime = state.currentTime % clip.duration;
            } else {
              state.currentTime = clip.duration;
              state.isPlaying = false;
            }
          }

          this.evaluateClip(state.clipId, state.currentTime);
          this.notifyListeners(state.clipId, state.currentTime);
        }
      });

      if (anyPlaying) {
        this.animationFrameId = requestAnimationFrame(loop);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private evaluateClip(clipId: string, time: number): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;

    for (const track of clip.tracks) {
      if (!track.enabled) continue;

      const value = this.interpolateValue(track, time);
      if (value !== undefined) {
        this.applyValue(track.nodeId, track.type, track.property, value);
      }
    }
  }

  private interpolateValue(
    track: AnimationTrack,
    time: number
  ): number | { x: number; y: number; z: number } | undefined {
    const keyframes = track.keyframes;
    if (keyframes.length === 0) return undefined;
    if (keyframes.length === 1) return keyframes[0].value as number;

    if (time <= keyframes[0].time) return keyframes[0].value as number;
    if (time >= keyframes[keyframes.length - 1].time)
      return keyframes[keyframes.length - 1].value as number;

    let prevKf = keyframes[0];
    let nextKf = keyframes[1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time < keyframes[i + 1].time) {
        prevKf = keyframes[i];
        nextKf = keyframes[i + 1];
        break;
      }
    }

    const t = (time - prevKf.time) / (nextKf.time - prevKf.time);
    const easingFn = EASING_FUNCTIONS[nextKf.easing || 'linear'];
    const easedT = easingFn(t);

    if (typeof prevKf.value === 'number' && typeof nextKf.value === 'number') {
      return prevKf.value + (nextKf.value - prevKf.value) * easedT;
    }

    if (
      typeof prevKf.value === 'object' &&
      'x' in prevKf.value &&
      typeof nextKf.value === 'object' &&
      'x' in nextKf.value
    ) {
      return {
        x: prevKf.value.x + (nextKf.value.x - prevKf.value.x) * easedT,
        y: prevKf.value.y + (nextKf.value.y - prevKf.value.y) * easedT,
        z: prevKf.value.z + (nextKf.value.z - prevKf.value.z) * easedT,
      };
    }

    return undefined;
  }

  private applyValue(
    nodeId: string,
    type: string,
    property: string | undefined,
    value: number | { x: number; y: number; z: number }
  ): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    switch (type) {
      case 'position':
        if (typeof value === 'object' && 'x' in value) {
          node.position = value;
        }
        break;
      case 'rotation':
        if (typeof value === 'object' && 'x' in value) {
          node.rotation = value;
        }
        break;
      case 'scale':
        if (typeof value === 'object' && 'x' in value) {
          node.scale = value;
        }
        break;
      default:
        if (property && node.metadata) {
          (node.metadata as Record<string, unknown>)[property] = value;
        }
        break;
    }
  }

  getInterpolatedValue(
    clipId: string,
    trackId: string,
    time: number
  ): number | { x: number; y: number; z: number } | undefined {
    const track = this.getTrack(clipId, trackId);
    if (!track) return undefined;
    return this.interpolateValue(track, time);
  }
}

export const sceneGraphAnimationEngine = new SceneGraphAnimationEngine();
export default sceneGraphAnimationEngine;
