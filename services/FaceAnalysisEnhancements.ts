/**
 * Face Analysis Enhancements
 * Camera adjustment, face-aware lighting, composition guides,
 * and recommended camera settings based on face analysis results.
 */

export interface FaceAnalysisResults {
  headpose?: { pitch: number; yaw: number; roll: number };
  landmarks?: Array<[number, number]>;
  parsing?: unknown;
  attributes?: number[];
}

export interface CameraAdjustment {
  position: [number, number, number];
  rotation: [number, number, number];
  focalLength?: number;
}

export interface LightingAdjustment {
  nodeId: string;
  power: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export interface CompositionGuides {
  eyeLine?: number;
  faceCenter?: { x: number; y: number };
  ruleOfThirds?: { x: number; y: number };
}

export interface RecommendedCameraSettings {
  focalLength?: number;
  aperture?: number;
  [key: string]: unknown;
}

/**
 * Calculate camera adjustment based on head pose
 */
export function calculateCameraAdjustment(
  headpose: { pitch: number; yaw: number; roll: number },
  currentCamera?: { position: number[]; rotation: number[] }
): CameraAdjustment {
  const base = currentCamera ?? { position: [0, 1.65, 2], rotation: [0, 0, 0] };
  const yawRad = (headpose.yaw * Math.PI) / 180;
  const pitchRad = (headpose.pitch * Math.PI) / 180;
  return {
    position: [
      base.position[0] - Math.sin(yawRad) * 0.3,
      base.position[1] - Math.sin(pitchRad) * 0.2,
      base.position[2],
    ],
    rotation: [
      base.rotation[0] + pitchRad * 0.1,
      base.rotation[1] + yawRad * 0.1,
      base.rotation[2],
    ],
  };
}

/**
 * Calculate face-aware lighting adjustments
 */
export function calculateFaceAwareLighting(
  results: FaceAnalysisResults,
  lightNodes: Array<{ id: string; light?: { power: number }; transform?: { position: number[]; rotation: number[] } }>
): LightingAdjustment[] {
  if (!results.headpose || !lightNodes.length) return [];
  return lightNodes.map((node) => ({
    nodeId: node.id,
    power: (node.light?.power ?? 1) * 1.05,
    position: (node.transform?.position as [number, number, number]) ?? [0, 2, 2],
    rotation: (node.transform?.rotation as [number, number, number]) ?? [0, 0, 0],
  }));
}

/**
 * Calculate composition guides from landmarks
 */
export function calculateCompositionGuides(
  landmarks: Array<[number, number]>
): CompositionGuides {
  if (!landmarks.length) return {};
  const xs = landmarks.map((l) => l[0]);
  const ys = landmarks.map((l) => l[1]);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  return {
    eyeLine: cy,
    faceCenter: { x: cx, y: cy },
    ruleOfThirds: { x: Math.round(cx * 3) / 3, y: Math.round(cy * 3) / 3 },
  };
}

/**
 * Apply camera adjustment to a scene node via store action
 */
export function applyCameraAdjustment(
  adjustment: CameraAdjustment,
  updateNode: (id: string, updates: Record<string, unknown>) => void,
  cameraNodeId?: string,
  cameraNode?: unknown
): void {
  if (!cameraNodeId) return;
  void cameraNode; // available for future per-node logic
  updateNode(cameraNodeId, {
    transform: {
      position: adjustment.position,
      rotation: adjustment.rotation,
      scale: [1, 1, 1],
    },
  });
}

/**
 * Apply lighting adjustments to scene light nodes
 */
export function applyLightingAdjustments(
  adjustments: LightingAdjustment[],
  updateNode: (id: string, updates: Record<string, unknown>) => void,
  lightNodes?: Array<{ id: string }> | unknown
): void {
  void lightNodes; // reserved for future per-node matching
  for (const adj of adjustments) {
    updateNode(adj.nodeId, {
      light: { power: adj.power },
      ...(adj.position ? { transform: { position: adj.position, rotation: adj.rotation ?? [0, 0, 0], scale: [1, 1, 1] } } : {}),
    });
  }
}

/**
 * Get recommended camera settings based on face attributes
 */
export function getRecommendedCameraSettings(
  attributes: number[]
): RecommendedCameraSettings {
  if (!attributes.length) return {};
  return {
    focalLength: 85,
    aperture: 2.8,
  };
}
