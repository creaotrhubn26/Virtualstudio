import { logger } from './logger';
import { RECORDING_QUALITY } from './multiCameraRecordingService';

const log = logger.module('MonitorRecordingManager');

export interface RecorderInstance {
  presetId: string;
  mediaRecorder: MediaRecorder;
  chunks: Blob[];
  startTime: number;
  isRecording: boolean;
}

export interface RecordingResult {
  presetId: string;
  blob: Blob;
  duration: number;
  filename: string;
}

type RecordingStateCallback = (presetId: string, isRecording: boolean, elapsed: number) => void;
type RecordingCompleteCallback = (result: RecordingResult) => void;
type RecordingErrorCallback = (presetId: string, error: Error) => void;

class MonitorRecordingManager {
  private recorders: Map<string, RecorderInstance> = new Map();
  private quality: keyof typeof RECORDING_QUALITY = 'high';
  private updateTimers: Map<string, number> = new Map();
  
  private stateCallbacks: Set<RecordingStateCallback> = new Set();
  private completeCallbacks: Set<RecordingCompleteCallback> = new Set();
  private errorCallbacks: Set<RecordingErrorCallback> = new Set();

  setQuality(quality: keyof typeof RECORDING_QUALITY): void {
    this.quality = quality;
    log.debug('Set recording quality:', quality, RECORDING_QUALITY[quality]);
  }

  onStateChange(callback: RecordingStateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  onComplete(callback: RecordingCompleteCallback): () => void {
    this.completeCallbacks.add(callback);
    return () => this.completeCallbacks.delete(callback);
  }

  onError(callback: RecordingErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  private notifyStateChange(presetId: string, isRecording: boolean, elapsed: number): void {
    this.stateCallbacks.forEach(cb => cb(presetId, isRecording, elapsed));
  }

  private notifyComplete(result: RecordingResult): void {
    this.completeCallbacks.forEach(cb => cb(result));
  }

  private notifyError(presetId: string, error: Error): void {
    this.errorCallbacks.forEach(cb => cb(presetId, error));
  }

  getMonitorCanvas(presetId: string): HTMLCanvasElement | null {
    return document.querySelector(`.monitor-canvas[data-preset="${presetId}"]`) as HTMLCanvasElement;
  }

  isRecording(presetId: string): boolean {
    return this.recorders.get(presetId)?.isRecording ?? false;
  }

  isAnyRecording(): boolean {
    for (const recorder of this.recorders.values()) {
      if (recorder.isRecording) return true;
    }
    return false;
  }

  getActiveRecordings(): string[] {
    const active: string[] = [];
    for (const [presetId, recorder] of this.recorders) {
      if (recorder.isRecording) active.push(presetId);
    }
    return active;
  }

  getElapsedTime(presetId: string): number {
    const recorder = this.recorders.get(presetId);
    if (!recorder || !recorder.isRecording) return 0;
    return Math.floor((Date.now() - recorder.startTime) / 1000);
  }

  async startRecording(presetId: string): Promise<boolean> {
    if (this.recorders.get(presetId)?.isRecording) {
      log.warn('Already recording:', presetId);
      return false;
    }

    const canvas = this.getMonitorCanvas(presetId);
    if (!canvas) {
      log.error('No monitor canvas found for preset:', presetId);
      this.notifyError(presetId, new Error(`No monitor canvas found for ${presetId}`));
      return false;
    }

    try {
      const qualitySettings = RECORDING_QUALITY[this.quality];
      const stream = canvas.captureStream(30);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm;codecs=vp8';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: qualitySettings.bitrate,
      });

      const recorderInstance: RecorderInstance = {
        presetId,
        mediaRecorder,
        chunks: [],
        startTime: Date.now(),
        isRecording: true,
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderInstance.chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        this.handleRecordingComplete(presetId);
      };

      mediaRecorder.onerror = (event) => {
        log.error('MediaRecorder error:', presetId, event);
        this.notifyError(presetId, new Error('MediaRecorder error'));
        recorderInstance.isRecording = false;
      };

      this.recorders.set(presetId, recorderInstance);
      mediaRecorder.start(100);

      this.startUpdateTimer(presetId);
      this.updateRecordingIndicator(presetId, true);
      this.notifyStateChange(presetId, true, 0);

      log.info('Started recording for preset:', presetId);
      return true;
    } catch (error) {
      log.error('Failed to start recording:', presetId, error);
      this.notifyError(presetId, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  stopRecording(presetId: string): void {
    const recorder = this.recorders.get(presetId);
    if (!recorder || !recorder.isRecording) {
      log.warn('Not recording:', presetId);
      return;
    }

    recorder.isRecording = false;
    this.stopUpdateTimer(presetId);
    this.updateRecordingIndicator(presetId, false);

    try {
      recorder.mediaRecorder.stop();
    } catch (error) {
      log.error('Error stopping MediaRecorder:', error);
    }

    log.info('Stopping recording for preset:', presetId);
  }

  private handleRecordingComplete(presetId: string): void {
    const recorder = this.recorders.get(presetId);
    if (!recorder) return;

    const duration = Math.floor((Date.now() - recorder.startTime) / 1000);
    const blob = new Blob(recorder.chunks, { type: 'video/webm' });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `creatorhub-${presetId}-${timestamp}.webm`;

    const result: RecordingResult = {
      presetId,
      blob,
      duration,
      filename,
    };

    this.notifyComplete(result);
    this.notifyStateChange(presetId, false, duration);

    recorder.chunks = [];

    log.info('Recording complete:', presetId, `${duration}s`, `${(blob.size / 1024 / 1024).toFixed(2)}MB`);
  }

  async startAllRecordings(presetIds: string[]): Promise<string[]> {
    const started: string[] = [];
    for (const presetId of presetIds) {
      const success = await this.startRecording(presetId);
      if (success) started.push(presetId);
    }
    log.info('Started recording for', started.length, 'cameras');
    return started;
  }

  stopAllRecordings(): void {
    for (const [presetId, recorder] of this.recorders) {
      if (recorder.isRecording) {
        this.stopRecording(presetId);
      }
    }
    log.info('Stopped all recordings');
  }

  private startUpdateTimer(presetId: string): void {
    const timerId = window.setInterval(() => {
      const elapsed = this.getElapsedTime(presetId);
      this.notifyStateChange(presetId, true, elapsed);
    }, 1000);
    this.updateTimers.set(presetId, timerId);
  }

  private stopUpdateTimer(presetId: string): void {
    const timerId = this.updateTimers.get(presetId);
    if (timerId) {
      clearInterval(timerId);
      this.updateTimers.delete(presetId);
    }
  }

  private updateRecordingIndicator(presetId: string, isRecording: boolean): void {
    const indicator = document.querySelector(`.monitor-recording-indicator[data-preset="${presetId}"]`) as HTMLElement;
    if (indicator) {
      indicator.style.display = isRecording ? 'block' : 'none';
    }

    window.dispatchEvent(new CustomEvent('monitor-recording-state-changed', {
      detail: { presetId, isRecording }
    }));
  }

  downloadRecording(result: RecordingResult): void {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log.info('Downloaded recording:', result.filename);
  }

  cleanup(): void {
    this.stopAllRecordings();
    this.recorders.clear();
    this.stateCallbacks.clear();
    this.completeCallbacks.clear();
    this.errorCallbacks.clear();
  }
}

export const monitorRecordingManager = new MonitorRecordingManager();
