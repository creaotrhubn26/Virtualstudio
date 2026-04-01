import { AnimationClip } from './SceneGraphAnimationEngine';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing';

export interface RecordingConfig {
  fps: number;
  maxDuration: number;
  captureTransforms: boolean;
  captureLights: boolean;
  captureCamera: boolean;
  autoStop: boolean;
  recordPosition: boolean;
  recordRotation: boolean;
  recordScale: boolean;
  sampleRate: number;
  simplifyKeyframes: boolean;
}

export interface RecordedKeyframe {
  time: number;
  nodeId: string;
  property: string;
  value: number | number[] | string;
}

export interface RecordingSession {
  id: string;
  nodeId: string;
  startTime: number;
  keyframes: RecordedKeyframe[];
  config: RecordingConfig;
}

export interface RecordingState {
  status: RecordingStatus;
  startTime: number | null;
  currentTime: number;
  keyframes: RecordedKeyframe[];
  config: RecordingConfig;
  isRecording: boolean;
  isPaused: boolean;
  activeSessions: string[];
  samplesRecorded: number;
}

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
  fps: 30,
  maxDuration: 60,
  captureTransforms: true,
  captureLights: true,
  captureCamera: true,
  autoStop: false,
  recordPosition: true,
  recordRotation: true,
  recordScale: false,
  sampleRate: 30,
  simplifyKeyframes: true,
};

class AnimationRecorder {
  private state: RecordingState = {
    status: 'idle',
    startTime: null,
    currentTime: 0,
    keyframes: [],
    config: DEFAULT_RECORDING_CONFIG,
    isRecording: false,
    isPaused: false,
    activeSessions: [],
    samplesRecorded: 0,
  };

  private sessions: Map<string, RecordingSession> = new Map();
  private subscribers: Array<(state: RecordingState) => void> = [];

  private notify(): void {
    const s = this.getState();
    this.subscribers.forEach((fn) => fn(s));
  }

  subscribe(callback: (state: RecordingState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((fn) => fn !== callback);
    };
  }

  getState(): RecordingState {
    return { ...this.state };
  }

  startRecording(nodeId: string, config: Partial<RecordingConfig> = {}): RecordingSession {
    const merged = { ...DEFAULT_RECORDING_CONFIG, ...config };
    const session: RecordingSession = {
      id: `session-${Date.now()}`,
      nodeId,
      startTime: performance.now(),
      keyframes: [],
      config: merged,
    };
    this.sessions.set(session.id, session);
    this.state = {
      ...this.state,
      status: 'recording',
      startTime: performance.now(),
      currentTime: 0,
      keyframes: [],
      config: merged,
      isRecording: true,
      isPaused: false,
      activeSessions: [...this.state.activeSessions, session.id],
      samplesRecorded: 0,
    };
    this.notify();
    return session;
  }

  stopRecording(sessionId?: string): RecordingSession | null {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      this.sessions.delete(sessionId);
      const activeSessions = this.state.activeSessions.filter((id) => id !== sessionId);
      this.state = {
        ...this.state,
        status: activeSessions.length === 0 ? 'idle' : 'recording',
        isRecording: activeSessions.length > 0,
        activeSessions,
        startTime: activeSessions.length === 0 ? null : this.state.startTime,
      };
      this.notify();
      return session ?? null;
    }
    this.state = {
      ...this.state,
      status: 'idle',
      startTime: null,
      isRecording: false,
      isPaused: false,
      activeSessions: [],
    };
    this.sessions.clear();
    this.notify();
    return null;
  }

  pauseRecording(_sessionId?: string): void {
    if (this.state.status === 'recording') {
      this.state = { ...this.state, status: 'paused', isPaused: true };
      this.notify();
    }
  }

  resumeRecording(_sessionId?: string): void {
    if (this.state.status === 'paused') {
      this.state = { ...this.state, status: 'recording', isPaused: false };
      this.notify();
    }
  }

  sessionToClip(session: RecordingSession): AnimationClip {
    return {
      id: `clip-${session.id}`,
      name: `Recording ${session.nodeId}`,
      duration: session.keyframes.length > 0
        ? session.keyframes[session.keyframes.length - 1].time
        : 0,
      loop: false,
      speed: 1,
      tracks: [
        {
          id: `track-${session.id}`,
          nodeId: session.nodeId,
          type: 'position',
          property: 'position',
          keyframes: session.keyframes.map((kf) => ({
            time: kf.time,
            value: typeof kf.value === 'number' ? kf.value : Array.isArray(kf.value) ? kf.value[0] ?? 0 : 0,
            easing: 'linear' as const,
          })),
          enabled: true,
        },
      ],
    };
  }

  recordKeyframe(nodeId: string, property: string, value: number | number[] | string): void {
    if (this.state.status !== 'recording' || !this.state.startTime) return;
    const time = (performance.now() - this.state.startTime) / 1000;
    const kf: RecordedKeyframe = { time, nodeId, property, value };
    this.state.keyframes.push(kf);
    this.state.currentTime = time;
    this.state.samplesRecorded += 1;
    this.notify();
  }

  isActivelyRecording(): boolean {
    return this.state.status === 'recording';
  }
}

export const animationRecorder = new AnimationRecorder();
export default animationRecorder;
