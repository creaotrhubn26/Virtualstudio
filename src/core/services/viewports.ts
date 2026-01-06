let activeCameraId: string | null = null;

export function setActiveCameraId(id: string | null) {
  activeCameraId = id;
}

export function getActiveCameraId(): string | null {
  return activeCameraId;
}
