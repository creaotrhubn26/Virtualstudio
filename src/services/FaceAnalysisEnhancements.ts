/**
 * FaceAnalysisEnhancements — type declarations
 *
 * Defines the data structures produced by the face-analysis pipeline
 * and consumed by FaceAnalysisOverlay.
 */

/** A single facial landmark point, normalised to 0-1 image coordinates. */
export interface FaceLandmarks {
  x: number;
  y: number;
  /** Depth relative to face plane (optional, 0 = on-plane). */
  z?: number;
  /** Index in the 68-point landmark model. */
  index?: number;
  /** Confidence of this landmark detection (0-1). */
  confidence?: number;
}

/** 3D head-pose angles in degrees, zero = looking straight at camera. */
export interface HeadPose {
  /** Horizontal rotation: positive = look right. */
  yaw: number;
  /** Vertical rotation: positive = look up. */
  pitch: number;
  /** In-plane tilt: positive = tilt right. */
  roll: number;
  /** Overall detection confidence (0-1). */
  confidence?: number;
}

/** Face bounding box in normalised 0-1 image coordinates. */
export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Full result returned by a single face-analysis frame. */
export interface FaceAnalysisResult {
  landmarks: FaceLandmarks[];
  headPose: HeadPose;
  boundingBox: FaceBoundingBox;
  /** Face ID for multi-face tracking. */
  faceId?: string;
  /** Overall detection confidence (0-1). */
  confidence: number;
}
