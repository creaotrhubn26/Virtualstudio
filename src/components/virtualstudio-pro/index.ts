/**
 * Virtual Studio Pro Components Export
 * All advanced virtual production features in one place
 */

// Real-time Collaboration
export { CollaborationPanel } from '../CollaborationPanel';
export { 
  useCollaborationStore,
  type Collaborator,
  type CollaboratorPresence,
  type ObjectLock,
  type ChatMessage 
} from '../../services/collaborationService';

// WebXR VR/AR Support
export { XRControlsPanel } from '../XRControlsPanel';
export { 
  useXRStore,
  type XRSessionState,
  type XRController
} from '../../services/xrService';

// Character Animation
export { CharacterAnimationPanel } from '../CharacterAnimationPanel';
export {
  useSkeletalAnimationStore,
  type CharacterRig,
  type AnimationClip,
  type BlendShape,
  type IKTarget,
  BLEND_SHAPE_PRESETS
} from '../../services/skeletalAnimationService';

// Live Streaming
export { LiveStreamingPanel } from '../LiveStreamingPanel';
export {
  useStreamingStore,
  STREAM_PRESETS,
  type StreamConfig,
  type StreamStats
} from '../../services/streamingService';

// Advanced Rendering
export { RenderingPanel } from '../RenderingPanel';
export {
  useRenderingStore,
  RENDERING_PRESETS,
  type RenderingPreset,
  type RenderingSettings
} from '../../services/renderingService';

// Industry Export
export { ExportPanel } from '../ExportPanel';
export {
  useExportStore,
  EXPORT_PRESETS,
  FORMAT_EXTENSIONS,
  type ExportFormat,
  type ExportSettings,
  type ExportJob
} from '../../services/exportService';

// Particle Systems
export { ParticlePanel } from '../ParticlePanel';
export {
  useParticleStore,
  PARTICLE_PRESETS,
  type ParticleEffectType,
  type ParticleConfig,
  type ActiveParticleSystem
} from '../../services/particleService';

// Spatial Audio
export { SpatialAudioPanel } from '../SpatialAudioPanel';
export {
  useSpatialAudioStore,
  REVERB_PRESETS,
  AMBIENCE_PRESETS,
  type AudioSource,
  type AudioZone,
  type ReverbPreset
} from '../../services/spatialAudioService';
