/**
 * Live Streaming Service
 * WebRTC-based live output, NDI emulation, and broadcast capabilities
 */

import { create } from 'zustand';

// Stream quality presets
export interface StreamQuality {
  name: string;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

export const STREAM_PRESETS: Record<string, StreamQuality> = {
  '720p30': { name: '720p 30fps', width: 1280, height: 720, frameRate: 30, bitrate: 2500000 },
  '720p60': { name: '720p 60fps', width: 1280, height: 720, frameRate: 60, bitrate: 4000000 },
  '1080p30': { name: '1080p 30fps', width: 1920, height: 1080, frameRate: 30, bitrate: 4500000 },
  '1080p60': { name: '1080p 60fps', width: 1920, height: 1080, frameRate: 60, bitrate: 7000000 },
  '4k30': { name: '4K 30fps', width: 3840, height: 2160, frameRate: 30, bitrate: 15000000 }
};

// Stream destinations
export type StreamDestination = 'rtmp' | 'webrtc' | 'ndi' | 'srt' | 'local';

export interface StreamConfig {
  destination: StreamDestination;
  url?: string;
  streamKey?: string;
  quality: StreamQuality;
  audioEnabled: boolean;
  audioSource: 'microphone' | 'system' | 'both' | 'none';
}

export interface StreamStats {
  isStreaming: boolean;
  duration: number;
  timecode: string;
  framesSent: number;
  bytesTransferred: number;
  currentBitrate: number;
  droppedFrames: number;
  latency: number;
  viewers: number;
}

export interface StreamingState {
  // Configuration
  config: StreamConfig;
  
  // Stream state
  isStreaming: boolean;
  isRecording: boolean;
  isPreviewing: boolean;
  
  // Stats
  stats: StreamStats;
  
  // MediaStream references
  canvasStream: MediaStream | null;
  audioStream: MediaStream | null;
  combinedStream: MediaStream | null;
  
  // Recorders
  mediaRecorder: MediaRecorder | null;
  recordedChunks: Blob[];
  
  // WebRTC
  peerConnections: Map<string, RTCPeerConnection>;
  signalingServer: WebSocket | null;
  
  // Actions
  setConfig: (config: Partial<StreamConfig>) => void;
  setQuality: (preset: string) => void;
  
  // Streaming
  startPreview: (canvas: HTMLCanvasElement) => Promise<void>;
  stopPreview: () => void;
  startStream: (canvas: HTMLCanvasElement) => Promise<void>;
  stopStream: () => void;
  
  // Recording
  startRecording: (canvas: HTMLCanvasElement) => Promise<void>;
  stopRecording: () => Promise<Blob>;
  
  // WebRTC specific
  connectToSignaling: (url: string) => Promise<void>;
  disconnectSignaling: () => void;
  
  // NDI emulation (via WebRTC to local server)
  startNDIOutput: (canvas: HTMLCanvasElement) => Promise<void>;
  stopNDIOutput: () => void;
}

// Generate timecode
const generateTimecode = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30); // 30fps timecode
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
};

export const useStreamingStore = create<StreamingState>((set, get) => ({
  // Initial configuration
  config: {
    destination: 'local',
    quality: STREAM_PRESETS['1080p30'],
    audioEnabled: false,
    audioSource: 'none'
  },
  
  // Initial state
  isStreaming: false,
  isRecording: false,
  isPreviewing: false,
  
  stats: {
    isStreaming: false,
    duration: 0,
    timecode: '00:00:00:00',
    framesSent: 0,
    bytesTransferred: 0,
    currentBitrate: 0,
    droppedFrames: 0,
    latency: 0,
    viewers: 0
  },
  
  canvasStream: null,
  audioStream: null,
  combinedStream: null,
  mediaRecorder: null,
  recordedChunks: [],
  peerConnections: new Map(),
  signalingServer: null,
  
  setConfig: (newConfig: Partial<StreamConfig>) => {
    set((state) => ({
      config: { ...state.config, ...newConfig }
    }));
  },
  
  setQuality: (preset: string) => {
    const quality = STREAM_PRESETS[preset];
    if (quality) {
      set((state) => ({
        config: { ...state.config, quality }
      }));
    }
  },
  
  startPreview: async (canvas: HTMLCanvasElement) => {
    const { config } = get();
    
    try {
      // Capture canvas stream
      const canvasStream = canvas.captureStream(config.quality.frameRate);
      
      // Get audio if enabled
      let audioStream: MediaStream | null = null;
      if (config.audioEnabled && config.audioSource !== 'none') {
        try {
          if (config.audioSource === 'microphone' || config.audioSource === 'both') {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          // Note: System audio capture requires screen sharing permission
          if (config.audioSource === 'system' || config.audioSource === 'both') {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              video: false,
              audio: true
            });
            if (audioStream) {
              // Combine microphone and system audio
              displayStream.getAudioTracks().forEach(track => {
                audioStream!.addTrack(track);
              });
            } else {
              audioStream = displayStream;
            }
          }
        } catch (e) {
          console.warn('Audio capture failed:', e);
        }
      }
      
      // Combine streams
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      }
      
      set({
        canvasStream,
        audioStream,
        combinedStream,
        isPreviewing: true
      });
      
    } catch (error) {
      console.error('Failed to start preview:', error);
      throw error;
    }
  },
  
  stopPreview: () => {
    const { canvasStream, audioStream, combinedStream } = get();
    
    [canvasStream, audioStream, combinedStream].forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
    
    set({
      canvasStream: null,
      audioStream: null,
      combinedStream: null,
      isPreviewing: false
    });
  },
  
  startStream: async (canvas: HTMLCanvasElement) => {
    const { config, combinedStream, isPreviewing, startPreview, connectToSignaling } = get();
    
    // Start preview if not already
    if (!isPreviewing || !combinedStream) {
      await startPreview(canvas);
    }
    
    const stream = get().combinedStream;
    if (!stream) {
      throw new Error('No stream available');
    }
    
    // Start stats tracking
    const startTime = Date.now();
    let framesSent = 0;
    let bytesTransferred = 0;
    
    const statsInterval = setInterval(() => {
      const duration = (Date.now() - startTime) / 1000;
      set((state) => ({
        stats: {
          ...state.stats,
          duration,
          timecode: generateTimecode(duration),
          framesSent,
          bytesTransferred,
          currentBitrate: bytesTransferred / duration * 8,
          isStreaming: true
        }
      }));
    }, 1000);
    
    // Handle different destinations
    switch (config.destination) {
      case 'webrtc':
        if (config.url) {
          await connectToSignaling(config.url);
        }
        break;
        
      case 'rtmp':
        // RTMP requires a server-side relay
        // Send stream to backend which forwards to RTMP
        console.log('RTMP streaming requires backend relay');
        break;
        
      case 'ndi':
        // NDI emulation via local WebRTC server
        await get().startNDIOutput(canvas);
        break;
        
      case 'local':
      default:
        // Local preview only
        break;
    }
    
    set({ isStreaming: true });
    
    // Store cleanup function
    (window as any).__streamCleanup = () => {
      clearInterval(statsInterval);
    };
  },
  
  stopStream: () => {
    const { peerConnections, signalingServer, stopPreview, stopNDIOutput } = get();
    
    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    
    // Close signaling
    if (signalingServer) {
      signalingServer.close();
    }
    
    // Stop NDI
    stopNDIOutput();

    // Stop local preview if active
    stopPreview();
    
    // Cleanup
    if ((window as any).__streamCleanup) {
      (window as any).__streamCleanup();
    }
    
    set({
      isStreaming: false,
      peerConnections: new Map(),
      signalingServer: null,
      stats: {
        isStreaming: false,
        duration: 0,
        timecode: '00:00:00:00',
        framesSent: 0,
        bytesTransferred: 0,
        currentBitrate: 0,
        droppedFrames: 0,
        latency: 0,
        viewers: 0
      }
    });
  },
  
  startRecording: async (canvas: HTMLCanvasElement) => {
    const { config, combinedStream, isPreviewing, startPreview } = get();
    
    if (!isPreviewing || !combinedStream) {
      await startPreview(canvas);
    }
    
    const stream = get().combinedStream;
    if (!stream) {
      throw new Error('No stream available');
    }
    
    const chunks: Blob[] = [];
    
    // Determine codec support
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: config.quality.bitrate
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.start(1000); // Collect data every second
    
    set({
      mediaRecorder,
      recordedChunks: chunks,
      isRecording: true
    });
  },
  
  stopRecording: async (): Promise<Blob> => {
    const { mediaRecorder, recordedChunks } = get();
    
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        set({
          mediaRecorder: null,
          recordedChunks: [],
          isRecording: false
        });
        resolve(blob);
      };
      
      mediaRecorder.stop();
    });
  },
  
  connectToSignaling: async (url: string) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('Connected to signaling server');
        set({ signalingServer: ws });
        resolve(undefined);
      };
      
      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        const { peerConnections, combinedStream } = get();
        
        switch (message.type) {
          case 'viewer_joined':
            // Create peer connection for new viewer
            const pc = new RTCPeerConnection({
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            // Add tracks
            if (combinedStream) {
              combinedStream.getTracks().forEach(track => {
                pc.addTrack(track, combinedStream);
              });
            }
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                ws.send(JSON.stringify({
                  type: 'ice_candidate',
                  viewerId: message.viewerId,
                  candidate: event.candidate
                }));
              }
            };
            
            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            ws.send(JSON.stringify({
              type: 'offer',
              viewerId: message.viewerId,
              sdp: offer.sdp
            }));
            
            peerConnections.set(message.viewerId, pc);
            set({
              peerConnections: new Map(peerConnections),
              stats: { ...get().stats, viewers: peerConnections.size }
            });
            break;
            
          case 'answer':
            const answerPc = peerConnections.get(message.viewerId);
            if (answerPc) {
              await answerPc.setRemoteDescription({
                type: 'answer',
                sdp: message.sdp
              });
            }
            break;
            
          case 'ice_candidate':
            const icePc = peerConnections.get(message.viewerId);
            if (icePc) {
              await icePc.addIceCandidate(message.candidate);
            }
            break;
            
          case 'viewer_left':
            const leavingPc = peerConnections.get(message.viewerId);
            if (leavingPc) {
              leavingPc.close();
              peerConnections.delete(message.viewerId);
              set({
                peerConnections: new Map(peerConnections),
                stats: { ...get().stats, viewers: peerConnections.size }
              });
            }
            break;
        }
      };
      
      ws.onerror = (error) => {
        console.error('Signaling error:', error);
        reject(error);
      };
      
      ws.onclose = () => {
        console.log('Signaling connection closed');
        set({ signalingServer: null });
      };
    });
  },
  
  disconnectSignaling: () => {
    const { signalingServer } = get();
    if (signalingServer) {
      signalingServer.close();
      set({ signalingServer: null });
    }
  },
  
  startNDIOutput: async (canvas: HTMLCanvasElement) => {
    // NDI over WebRTC to a local bridge server
    // This requires an NDI bridge application running locally
    const { startPreview, connectToSignaling } = get();
    
    await startPreview(canvas);
    
    // Connect to local NDI bridge
    try {
      await connectToSignaling('ws://localhost:9000/ndi');
      console.log('Connected to NDI bridge');
    } catch (e) {
      console.warn('NDI bridge not available. Install NDI Bridge Server for NDI output.');
    }
  },
  
  stopNDIOutput: () => {
    const { disconnectSignaling } = get();
    disconnectSignaling();
  }
}));

// Utility: Generate shareable viewer URL
export const generateViewerUrl = (streamId: string): string => {
  return `${window.location.origin}/viewer/${streamId}`;
};

// Utility: Get supported codecs
export const getSupportedCodecs = (): string[] => {
  const codecs = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm;codecs=h264',
    'video/webm',
    'video/mp4'
  ];
  
  return codecs.filter(codec => MediaRecorder.isTypeSupported(codec));
};

export default useStreamingStore;
