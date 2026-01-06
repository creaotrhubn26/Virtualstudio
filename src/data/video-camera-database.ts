export interface VideoCamera {
  id: string;
  brand: string;
  model: string;
  resolution: string;
  frameRates: string[];
  codec: string[];
  mediaType: string;
  professions: string[];
}

export const VIDEO_CAMERA_DATABASE: VideoCamera[] = [
  { id: 'sony-fx6', brand: 'Sony', model: 'FX6', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XAVC-I', 'XAVC-L'], mediaType: 'CFexpress Type A', professions: ['videographer', 'director'] },
  { id: 'sony-fx3', brand: 'Sony', model: 'FX3', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XAVC-I', 'XAVC-L'], mediaType: 'CFexpress Type A', professions: ['videographer'] },
  { id: 'canon-c70', brand: 'Canon', model: 'EOS C70', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XF-AVC', 'MP4'], mediaType: 'SD', professions: ['videographer', 'director'] },
  { id: 'blackmagic-6k', brand: 'Blackmagic', model: 'Pocket 6K Pro', resolution: '6K', frameRates: ['24', '25', '30', '50', '60'], codec: ['BRAW', 'ProRes'], mediaType: 'CFast', professions: ['videographer'] },
  { id: 'red-komodo', brand: 'RED', model: 'Komodo 6K', resolution: '6K', frameRates: ['24', '25', '30', '40', '50', '60'], codec: ['REDCODE RAW'], mediaType: 'CFast', professions: ['director', 'videographer'] },
];

export function getCamerasByProfession(profession: string): VideoCamera[] {
  return VIDEO_CAMERA_DATABASE.filter(cam => cam.professions.includes(profession));
}

export function getLogFormatsByCamera(cameraId: string): string[] {
  const camera = VIDEO_CAMERA_DATABASE.find(c => c.id === cameraId);
  return camera?.codec || [];
}

export function getCameraBrand(cameraId: string): string {
  const camera = VIDEO_CAMERA_DATABASE.find(c => c.id === cameraId);
  return camera?.brand || '';
}
