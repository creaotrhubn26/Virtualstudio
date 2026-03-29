/**
 * GLB Generator Service
 * Frontend client for the TripoSR image-to-3D pipeline.
 */

export interface GenerateResult {
  success: boolean;
  job_id?: string;
  error?: string;
}

export interface StatusResult {
  success: boolean;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
  model_url?: string;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  path?: string;
  filename?: string;
  error?: string;
}

export interface SavedModel {
  filename: string;
  url: string;
  size_kb: number;
}

class GlbGeneratorService {
  private base = '/api/triposr';

  /**
   * Upload an image and start a TripoSR generation job.
   * Returns a job_id to poll with checkStatus().
   */
  async generateFromImage(
    imageFile: File,
    options: { removeBackground?: boolean; foregroundRatio?: number } = {},
  ): Promise<GenerateResult> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const params = new URLSearchParams();
    params.set('do_remove_background', String(options.removeBackground ?? true));
    params.set('foreground_ratio', String(options.foregroundRatio ?? 0.85));

    const response = await fetch(`${this.base}/generate?${params.toString()}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        detail = json.detail ?? json.error ?? detail;
      } catch {
        /* ignore */
      }
      return { success: false, error: detail };
    }

    return response.json();
  }

  /**
   * Poll the status of a running job.
   */
  async checkStatus(jobId: string): Promise<StatusResult> {
    const response = await fetch(`${this.base}/status/${jobId}`);
    if (!response.ok) {
      return { success: false, status: 'failed', error: `HTTP ${response.status}` };
    }
    return response.json();
  }

  /**
   * Download the finished GLB to the server and get a local URL.
   */
  async downloadModel(jobId: string): Promise<DownloadResult> {
    const response = await fetch(`${this.base}/download/${jobId}`, { method: 'POST' });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        detail = json.detail ?? json.error ?? detail;
      } catch {
        /* ignore */
      }
      return { success: false, error: detail };
    }
    return response.json();
  }

  /**
   * List all previously generated models stored on the server.
   */
  async listModels(): Promise<SavedModel[]> {
    try {
      const response = await fetch(`${this.base}/models`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Full pipeline: upload → wait → download. Calls onProgress with 0..100.
   */
  async generateAndWait(
    imageFile: File,
    options: { removeBackground?: boolean; foregroundRatio?: number } = {},
    onProgress?: (progress: number, message: string) => void,
    signal?: AbortSignal,
  ): Promise<DownloadResult> {
    onProgress?.(5, 'Sender bilde til TripoSR...');

    const genResult = await this.generateFromImage(imageFile, options);
    if (!genResult.success || !genResult.job_id) {
      return { success: false, error: genResult.error ?? 'Could not start generation' };
    }

    const jobId = genResult.job_id;
    onProgress?.(15, 'Genererer 3D-modell...');

    const maxAttempts = 120; // 10 minutes at 5s intervals
    for (let i = 0; i < maxAttempts; i++) {
      if (signal?.aborted) {
        return { success: false, error: 'Cancelled' };
      }

      await new Promise<void>((resolve) => setTimeout(resolve, 5000));

      if (signal?.aborted) {
        return { success: false, error: 'Cancelled' };
      }

      const status = await this.checkStatus(jobId);

      if (!status.success) {
        return { success: false, error: status.error ?? 'Status check failed' };
      }

      if (status.status === 'succeeded') {
        onProgress?.(90, 'Laster ned GLB-fil...');
        const dlResult = await this.downloadModel(jobId);
        if (dlResult.success) {
          onProgress?.(100, 'Ferdig!');
        }
        return dlResult;
      }

      if (status.status === 'failed') {
        return { success: false, error: status.error ?? 'Generation failed' };
      }

      // Still processing — rough progress estimate
      const approxProgress = Math.min(15 + Math.round((i / maxAttempts) * 70), 85);
      onProgress?.(approxProgress, 'Genererer 3D-modell...');
    }

    return { success: false, error: 'Timed out waiting for generation' };
  }
}

export const glbGeneratorService = new GlbGeneratorService();
