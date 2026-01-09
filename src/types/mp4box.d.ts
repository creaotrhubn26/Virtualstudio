declare module 'mp4box' {
  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onError?: (error: Error) => void;
    onSamples?: (id: number, user: any, samples: MP4Sample[]) => void;
    onSegment?: (id: number, user: any, buffer: ArrayBuffer, sampleNumber: number) => void;
    appendBuffer(buffer: ArrayBuffer & { fileStart?: number }): number;
    start(): void;
    stop(): void;
    flush(): void;
    setExtractionOptions(trackId: number, user?: any, options?: { nbSamples?: number }): void;
    setSegmentOptions(trackId: number, user?: any, options?: { nbSamples?: number }): void;
    initializeSegmentation(): { id: number; user: any; buffer: ArrayBuffer }[];
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    isProgressive: boolean;
    isFragmented: boolean;
    brands: string[];
    created: Date;
    modified: Date;
    tracks: MP4Track[];
  }

  export interface MP4Track {
    id: number;
    type: string;
    codec: string;
    duration: number;
    timescale: number;
    nb_samples: number;
    video?: {
      width: number;
      height: number;
    };
    audio?: {
      sample_rate: number;
      channel_count: number;
    };
  }

  export interface MP4Sample {
    number: number;
    track_id: number;
    timescale: number;
    description_index: number;
    description: any;
    data: Uint8Array;
    size: number;
    duration: number;
    cts: number;
    dts: number;
    is_sync: boolean;
    is_leading: number;
    depends_on: number;
    is_depended_on: number;
    has_redundancy: number;
    degradation_priority: number;
    offset: number;
    subsamples: any;
  }

  export function createFile(): MP4File;
}
