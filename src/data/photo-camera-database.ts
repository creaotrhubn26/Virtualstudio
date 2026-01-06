export interface PhotoCamera {
  id: string;
  brand: string;
  model: string;
  megapixels: number;
  sensorSize: string;
  mediaType: string;
  professions: string[];
}

export const PHOTO_CAMERA_DATABASE: PhotoCamera[] = [
  { id: 'sony-a7r5', brand: 'Sony', model: 'A7R V', megapixels: 61, sensorSize: 'Full Frame', mediaType: 'CFexpress Type A', professions: ['photographer'] },
  { id: 'sony-a7iv', brand: 'Sony', model: 'A7 IV', megapixels: 33, sensorSize: 'Full Frame', mediaType: 'CFexpress Type A', professions: ['photographer', 'videographer'] },
  { id: 'canon-r5', brand: 'Canon', model: 'EOS R5', megapixels: 45, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'] },
  { id: 'canon-r6ii', brand: 'Canon', model: 'EOS R6 II', megapixels: 24, sensorSize: 'Full Frame', mediaType: 'SD', professions: ['photographer'] },
  { id: 'nikon-z8', brand: 'Nikon', model: 'Z8', megapixels: 45, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'] },
  { id: 'fuji-gfx100ii', brand: 'Fujifilm', model: 'GFX 100 II', megapixels: 102, sensorSize: 'Medium Format', mediaType: 'CFexpress Type B', professions: ['photographer'] },
];

export function getPhotoCamerasByProfession(profession: string): PhotoCamera[] {
  return PHOTO_CAMERA_DATABASE.filter(cam => cam.professions.includes(profession));
}

export function getPhotoCameraBrand(cameraId: string): string {
  const camera = PHOTO_CAMERA_DATABASE.find(c => c.id === cameraId);
  return camera?.brand || '';
}
