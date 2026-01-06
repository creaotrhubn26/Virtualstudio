/**
 * HLS Streaming Service
 * Handles adaptive bitrate streaming using HLS.js library
 */

interface HlsConfig {
  maxBufferLength?: number;
  maxMaxBufferLength?: number;
  startLevel?: number;
  autoStartLoad?: boolean;
  debug?: boolean;
}

interface HlsLevel {
  bitrate: number;
  width: number;
  height: number;
  name?: string;
}

interface HlsEvents {
  MANIFEST_PARSED: string;
  LEVEL_SWITCHED: string;
  ERROR: string;
  FRAG_LOADED: string;
}

interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  destroy(): void;
  startLoad(startPosition?: number): void;
  stopLoad(): void;
  currentLevel: number;
  levels: HlsLevel[];
  on(event: string, callback: (...args: unknown[]) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
}

interface HlsStatic {
  new(config?: HlsConfig): HlsInstance;
  isSupported(): boolean;
  Events: HlsEvents;
}

declare global {
  interface Window {
    Hls?: HlsStatic;
  }
}

export interface QualityLevel {
  index: number;
  label: string;
  bitrate: number;
  width: number;
  height: number;
}

export class HLSStreamingService {
  private hls: HlsInstance | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isInitialized = false;
  private qualityLevels: QualityLevel[] = [];
  private onQualityChange?: (level: QualityLevel) => void;
  private onError?: (error: string) => void;

  constructor() {
    this.loadHlsLibrary();
  }

  private async loadHlsLibrary(): Promise<void> {
    if (window.Hls) {
      this.isInitialized = true;
      return;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js';
      script.async = true;
      script.onload = () => { this.isInitialized = true; resolve(); };
      script.onerror = () => reject(new Error('Failed to load HLS.js'));
      document.head.appendChild(script);
    });
  }

  public async initialize(
    videoElement: HTMLVideoElement,
    hlsUrl: string,
    options?: { onQualityChange?: (level: QualityLevel) => void; onError?: (error: string) => void; }
  ): Promise<boolean> {
    this.videoElement = videoElement;
    this.onQualityChange = options?.onQualityChange;
    this.onError = options?.onError;

    if (!this.isInitialized) {
      try { await this.loadHlsLibrary(); } 
      catch { this.onError?.('Failed to load HLS library'); return false; }
    }

    const Hls = window.Hls;
    if (!Hls) { this.onError?.('HLS.js not available'); return false; }

    if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = hlsUrl;
      return true;
    }

    if (Hls.isSupported()) {
      this.hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60, startLevel: -1, autoStartLoad: true, debug: false });
      this.hls.loadSource(hlsUrl);
      this.hls.attachMedia(videoElement);
      this.setupEventListeners(Hls);
      return true;
    }

    this.onError?.('HLS is not supported'); 
    return false;
  }

  private setupEventListeners(Hls: HlsStatic): void {
    if (!this.hls) return;
    this.hls.on(Hls.Events.MANIFEST_PARSED, (...args: unknown[]) => {
      const data = args[1] as { levels: HlsLevel[] };
      this.qualityLevels = data.levels.map((l, i) => ({ index: i, label: `${l.height}p`, bitrate: l.bitrate, width: l.width, height: l.height }));
    });
    this.hls.on(Hls.Events.LEVEL_SWITCHED, (...args: unknown[]) => {
      const data = args[1] as { level: number };
      const level = this.qualityLevels[data.level];
      if (level && this.onQualityChange) this.onQualityChange(level);
    });
    this.hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
      const data = args[1] as { fatal: boolean; type: string; details: string };
      if (data.fatal) this.onError?.(`HLS Error: ${data.type} - ${data.details}`);
    });
  }

  public getQualityLevels(): QualityLevel[] { return this.qualityLevels; }
  public setQuality(levelIndex: number): void { if (this.hls) this.hls.currentLevel = levelIndex; }
  public setAutoQuality(): void { if (this.hls) this.hls.currentLevel = -1; }
  public getCurrentQuality(): QualityLevel | null {
    if (this.hls && this.hls.currentLevel >= 0) return this.qualityLevels[this.hls.currentLevel] || null;
    return null;
  }
  public destroy(): void {
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    this.videoElement = null;
    this.qualityLevels = [];
  }
  public isSupported(): boolean {
    const Hls = window.Hls;
    if (!Hls) return false;
    return Hls.isSupported() || document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
  }
}

