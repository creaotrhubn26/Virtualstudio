/**
 * Viewport utilities for R3F canvas access
 */

let activeCameraId: string | null = null;

export function setActiveCameraId(id: string | null) {
  activeCameraId = id;
}

export function getActiveCameraId(): string | null {
  return activeCameraId;
}

/**
 * Get the R3F (React Three Fiber) canvas element from the DOM
 */
export function getR3FCanvas(): HTMLCanvasElement | null {
  return document.querySelector('canvas');
}
