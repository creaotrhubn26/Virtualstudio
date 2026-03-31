export type ExportFormat = 'mp4' | 'mov' | 'gif' | 'webm' | 'png-sequence' | 'jpg-sequence';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ExportPriority = 'low' | 'normal' | 'high';

export interface BatchExportConfig {
  format: ExportFormat;
  resolution: { width: number; height: number };
  fps: number;
  quality: number;
  startFrame: number;
  endFrame: number;
  outputPath?: string;
  includeAudio: boolean;
  priority: ExportPriority;
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

  addToQueue(name: string, config: BatchExportConfig): ExportJob {
    const job: ExportJob = {
      id: `job-${Date.now()}`,
      name,
      config,
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
}

export const exportScheduler = new ExportScheduler();
export default exportScheduler;
