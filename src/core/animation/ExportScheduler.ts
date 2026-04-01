export type ExportFormat = 'mp4' | 'mov' | 'gif' | 'webm' | 'png-sequence' | 'jpg-sequence';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'scheduled' | 'pending' | 'exporting' | 'uploading' | 'complete';
export type ExportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ExportJobStatus = ExportStatus;
export type ExportJobPriority = ExportPriority;

export interface BatchExportConfig {
  name?: string;
  format?: ExportFormat;
  resolution?: { width: number; height: number };
  width?: number;
  height?: number;
  fps?: number;
  quality?: number;
  startFrame?: number;
  endFrame?: number;
  outputPath?: string;
  includeAudio?: boolean;
  priority?: ExportPriority;
  duration?: number;
  presets?: string[];
  uploadToDrive?: boolean;
  driveConfig?: { userId: string; projectId?: string; projectName?: string };
}

export interface ExportJob {
  id: string;
  name: string;
  config: BatchExportConfig;
  status: ExportStatus;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  outputUrl?: string;
  priority?: ExportPriority;
  preset?: { platform?: string; label?: string };
  exportProgress?: { percentage: number; frame?: number; currentFrame?: number; totalFrames?: number };
  uploadProgress?: { percentage: number; bytesUploaded?: number; totalBytes?: number };
  scheduledTime?: Date;
  driveResult?: { webViewLink?: string; name?: string };
  result?: { url?: string; size?: number; filename?: string };
}

export interface ScheduledExport {
  id: string;
  name: string;
  config: BatchExportConfig;
  scheduledAt: string;
  recurrence?: 'daily' | 'weekly' | 'none';
}

export interface SchedulerState {
  queue: ExportJob[];
  history: ExportJob[];
  scheduled: ScheduledExport[];
  isProcessing: boolean;
  currentJobId: string | null;
  currentJob?: ExportJob | null;
  totalExported?: number;
  totalFailed?: number;
}

class ExportScheduler {
  private state: SchedulerState = {
    queue: [],
    history: [],
    scheduled: [],
    isProcessing: false,
    currentJobId: null,
  };

  getState(): SchedulerState {
    return { ...this.state };
  }

  addToQueue(nameOrJob: string | ExportJob, config?: BatchExportConfig): ExportJob {
    if (typeof nameOrJob === 'object') {
      this.state.queue.push(nameOrJob);
      return nameOrJob;
    }
    const job: ExportJob = {
      id: `job-${Date.now()}`,
      name: nameOrJob,
      config: config!,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.queue.push(job);
    return job;
  }

  cancelJob(jobId: string): void {
    const job = this.state.queue.find((j) => j.id === jobId);
    if (job) {
      job.status = 'cancelled';
      this.state.queue = this.state.queue.filter((j) => j.id !== jobId);
      this.state.history.push(job);
    }
  }

  getQueue(): ExportJob[] {
    return [...this.state.queue];
  }

  getHistory(): ExportJob[] {
    return [...this.state.history];
  }

  scheduleExport(name: string, config: BatchExportConfig, scheduledAt: Date): ScheduledExport {
    const scheduled: ScheduledExport = {
      id: `sched-${Date.now()}`,
      name,
      config,
      scheduledAt: scheduledAt.toISOString(),
      recurrence: 'none',
    };
    this.state.scheduled.push(scheduled);
    return scheduled;
  }

  removeScheduled(id: string): void {
    this.state.scheduled = this.state.scheduled.filter((s) => s.id !== id);
  }

  subscribe(callback: (state: SchedulerState) => void): () => void {
    const intervalId = setInterval(() => callback(this.getState()), 500);
    return () => clearInterval(intervalId);
  }

  setFrameRenderCallback(_callback: ((frame: number, frameIndex?: number) => void | Promise<void>) | null): void {
  }

  formatWaitTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${(seconds / 3600).toFixed(1)}t`;
  }

  getEstimatedWaitTime(_jobId: string): number {
    return 0;
  }

  createJobFromPreset(preset: string | { id?: string; format?: string; resolution?: { width: number; height: number }; fps?: number; quality?: number }, duration: number, options?: { priority?: ExportPriority; name?: string; uploadToDrive?: boolean; driveConfig?: { userId: string; projectId?: string; projectName?: string } }): ExportJob {
    if (typeof preset === 'string') {
      preset = { id: preset };
    }
    const config: BatchExportConfig = {
      format: (preset.format as ExportFormat) || 'mp4',
      resolution: preset.resolution || { width: 1920, height: 1080 },
      fps: preset.fps || 30,
      quality: preset.quality || 85,
      startFrame: 0,
      endFrame: Math.round(duration * (preset.fps || 30)),
      includeAudio: true,
      priority: options?.priority || 'normal',
      duration,
    };
    const job: ExportJob = {
      id: `job-${Date.now()}`,
      name: `Export ${duration}s`,
      config,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      priority: options?.priority || 'normal',
    };
    this.state.queue.push(job);
    return job;
  }

  addJobToQueue(job: ExportJob): void {
    this.state.queue.push(job);
  }

  scheduleJob(job: ExportJob, scheduledAt: Date): void {
    const scheduled: ScheduledExport = {
      id: `sched-${Date.now()}`,
      name: job.name,
      config: job.config,
      scheduledAt: scheduledAt.toISOString(),
      recurrence: 'none',
    };
    this.state.scheduled.push(scheduled);
  }

  scheduleJobWithDelay(job: ExportJob, delaySeconds: number): void {
    const scheduledAt = new Date(Date.now() + delaySeconds * 1000);
    this.scheduleJob(job, scheduledAt);
  }

  reorderJob(jobId: string, priority: ExportPriority): void {
    const job = this.state.queue.find((j) => j.id === jobId);
    if (job) {
      job.priority = priority;
    }
  }

  clearQueue(): void {
    const cancelled = this.state.queue.map((j) => ({ ...j, status: 'cancelled' as ExportStatus }));
    this.state.history.push(...cancelled);
    this.state.queue = [];
  }

  clearHistory(): void {
    this.state.history = [];
  }

  createBatchExport(duration: number, config: BatchExportConfig | { format: string; resolution?: { width: number; height: number }; fps: number; quality: number; [key: string]: unknown }): string[] {
    const batchConfig: BatchExportConfig = {
      format: (config.format as ExportFormat) || 'mp4',
      resolution: config.resolution,
      fps: config.fps,
      quality: config.quality,
      startFrame: 0,
      endFrame: Math.round(duration * (config.fps ?? 30)),
      includeAudio: true,
      priority: 'normal',
    };
    const job: ExportJob = {
      id: `job-${Date.now()}`,
      name: `Batch export ${Math.round(duration)}s`,
      config: batchConfig,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.queue.push(job);
    return [job.id];
  }
}

export const exportScheduler = new ExportScheduler();
export default exportScheduler;
