import { logger } from './logger';
import { monitorRecordingManager, RecordingResult } from './monitorRecordingManager';

const log = logger.module('MultiCameraRecordingService');

export const RECORDING_QUALITY = {
  low: { width: 854, height: 480, bitrate: 2500000 },
  medium: { width: 1280, height: 720, bitrate: 5000000 },
  high: { width: 1920, height: 1080, bitrate: 10000000 },
  ultra: { width: 2560, height: 1440, bitrate: 20000000 },
};

export interface CameraRecording {
  cameraId: string;
  cameraName: string;
  duration: number;
  blob: Blob | null;
  isRecording: boolean;
}

interface RecordingState {
  isRecording: boolean;
  elapsedTime: number;
  recordings: Map<string, CameraRecording>;
  completedRecordings: RecordingResult[];
}

type StateCallback = (state: RecordingState) => void;

class MultiCameraRecordingService {
  private state: RecordingState = {
    isRecording: false,
    elapsedTime: 0,
    recordings: new Map(),
    completedRecordings: [],
  };
  
  private subscribers: Set<StateCallback> = new Set();
  private quality: keyof typeof RECORDING_QUALITY = 'high';
  private globalTimerInterval: number | null = null;
  private globalStartTime: number = 0;

  constructor() {
    monitorRecordingManager.onStateChange((presetId, isRecording, elapsed) => {
      this.handleRecordingStateChange(presetId, isRecording, elapsed);
    });

    monitorRecordingManager.onComplete((result) => {
      this.handleRecordingComplete(result);
    });

    monitorRecordingManager.onError((presetId, error) => {
      log.error('Recording error for', presetId, error);
      const rec = this.state.recordings.get(presetId);
      if (rec) {
        rec.isRecording = false;
        this.notify();
      }
    });
  }

  private handleRecordingStateChange(presetId: string, isRecording: boolean, elapsed: number): void {
    let rec = this.state.recordings.get(presetId);
    
    if (isRecording) {
      if (!rec) {
        rec = {
          cameraId: presetId,
          cameraName: this.formatCameraName(presetId),
          duration: elapsed,
          blob: null,
          isRecording: true,
        };
        this.state.recordings.set(presetId, rec);
      } else {
        rec.isRecording = true;
        rec.duration = elapsed;
      }
    } else if (rec) {
      rec.isRecording = false;
      rec.duration = elapsed;
    }
    
    this.state.isRecording = monitorRecordingManager.isAnyRecording();
    this.notify();
  }

  private handleRecordingComplete(result: RecordingResult): void {
    const rec = this.state.recordings.get(result.presetId);
    if (rec) {
      rec.blob = result.blob;
      rec.duration = result.duration;
      rec.isRecording = false;
    }
    
    this.state.completedRecordings.push(result);
    this.state.isRecording = monitorRecordingManager.isAnyRecording();
    this.notify();
    
    log.info('Recording completed:', result.presetId, result.duration, 'seconds');
  }

  private formatCameraName(presetId: string): string {
    const letter = presetId.replace('cam', '').toUpperCase();
    return `Kamera ${letter}`;
  }

  subscribe(callback: StateCallback): () => void {
    this.subscribers.add(callback);
    callback(this.getImmutableState());
    return () => this.subscribers.delete(callback);
  }

  private getImmutableState(): RecordingState {
    return {
      isRecording: this.state.isRecording,
      elapsedTime: this.state.elapsedTime,
      recordings: new Map(this.state.recordings),
      completedRecordings: [...this.state.completedRecordings],
    };
  }

  private notify() {
    const immutableState = this.getImmutableState();
    this.subscribers.forEach(cb => cb(immutableState));
  }

  setQuality(quality: keyof typeof RECORDING_QUALITY) {
    this.quality = quality;
    monitorRecordingManager.setQuality(quality);
    log.debug('Set recording quality:', quality);
  }

  async toggleRecording(cameraId: string): Promise<CameraRecording | boolean> {
    const isCurrentlyRecording = monitorRecordingManager.isRecording(cameraId);
    
    if (isCurrentlyRecording) {
      monitorRecordingManager.stopRecording(cameraId);
      const rec = this.state.recordings.get(cameraId);
      if (rec) {
        return rec;
      }
      return false;
    } else {
      const success = await monitorRecordingManager.startRecording(cameraId);
      return success;
    }
  }

  async startAllCameras(): Promise<void> {
    const presetIds = ['camA', 'camB', 'camC', 'camD', 'camE'];
    const availablePresets = presetIds.filter(id => 
      monitorRecordingManager.getMonitorCanvas(id) !== null
    );
    
    if (availablePresets.length === 0) {
      log.warn('No camera presets with active canvases available for recording');
      return;
    }
    
    this.state.isRecording = true;
    this.state.elapsedTime = 0;
    this.globalStartTime = Date.now();
    
    this.startGlobalTimer();
    
    await monitorRecordingManager.startAllRecordings(availablePresets);
    this.notify();
    
    log.info('Started recording all available cameras:', availablePresets);
  }

  async stopAllCameras(): Promise<CameraRecording[]> {
    monitorRecordingManager.stopAllRecordings();
    
    this.stopGlobalTimer();
    this.state.isRecording = false;
    
    const recordings: CameraRecording[] = [];
    this.state.recordings.forEach((rec) => {
      if (rec.blob) {
        recordings.push({ ...rec });
      }
    });
    
    this.notify();
    log.info('Stopped recording all cameras, got', recordings.length, 'files');
    return recordings;
  }

  private startGlobalTimer(): void {
    if (this.globalTimerInterval) return;
    
    this.globalTimerInterval = window.setInterval(() => {
      this.state.elapsedTime = Math.floor((Date.now() - this.globalStartTime) / 1000);
      this.notify();
    }, 1000);
  }

  private stopGlobalTimer(): void {
    if (this.globalTimerInterval) {
      clearInterval(this.globalTimerInterval);
      this.globalTimerInterval = null;
    }
  }

  downloadRecording(recording: CameraRecording) {
    if (!recording.blob) {
      log.warn('No blob available for download');
      return;
    }
    
    const result: RecordingResult = {
      presetId: recording.cameraId,
      blob: recording.blob,
      duration: recording.duration,
      filename: `${recording.cameraName}_${Date.now()}.webm`,
    };
    
    monitorRecordingManager.downloadRecording(result);
  }

  downloadResult(result: RecordingResult): void {
    monitorRecordingManager.downloadRecording(result);
  }

  getCompletedRecordings(): RecordingResult[] {
    return [...this.state.completedRecordings];
  }

  clearCompletedRecordings(): void {
    this.state.completedRecordings = [];
    this.notify();
  }

  isRecording(cameraId: string): boolean {
    return monitorRecordingManager.isRecording(cameraId);
  }

  isAnyRecording(): boolean {
    return monitorRecordingManager.isAnyRecording();
  }

  getState(): RecordingState {
    return this.getImmutableState();
  }
}

export const multiCameraRecordingService = new MultiCameraRecordingService();
