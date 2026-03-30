export interface PhotoCamera {
  id: string;
  brand: string;
  model: string;
  megapixels: number;
  sensorSize: string;
  mediaType: string;
  professions: string[];
  maxFPS?: number;
  maxVideo?: string;
  priceNOK?: number;
  descriptionNo?: string;
}

export const PHOTO_CAMERA_DATABASE: PhotoCamera[] = [
  // Sony Full Frame
  { id: 'sony-a7r5', brand: 'Sony', model: 'A7R V', megapixels: 61, sensorSize: 'Full Frame', mediaType: 'CFexpress Type A', professions: ['photographer'], maxFPS: 8, maxVideo: '8K', priceNOK: 42990, descriptionNo: 'Toppmodell for studio og landskap med 61MP og AI-autofokus' },
  { id: 'sony-a7iv', brand: 'Sony', model: 'A7 IV', megapixels: 33, sensorSize: 'Full Frame', mediaType: 'CFexpress Type A', professions: ['photographer', 'videographer'], maxFPS: 10, maxVideo: '4K', priceNOK: 26990, descriptionNo: 'Allsidig hybridkamera for foto og video' },
  { id: 'sony-a7siii', brand: 'Sony', model: 'A7S III', megapixels: 12, sensorSize: 'Full Frame', mediaType: 'CFexpress Type A', professions: ['videographer'], maxFPS: 10, maxVideo: '4K 120p', priceNOK: 38990, descriptionNo: 'Videospesialist med enestående lav-lysfotografering' },
  { id: 'sony-a9iii', brand: 'Sony', model: 'A9 III', megapixels: 24, sensorSize: 'Full Frame', mediaType: 'CFexpress Type A', professions: ['photographer'], maxFPS: 120, maxVideo: '4K', priceNOK: 64990, descriptionNo: 'Verdens første global shutter kamera – 120 fps uten rolling shutter' },
  { id: 'sony-zve1', brand: 'Sony', model: 'ZV-E1', megapixels: 12, sensorSize: 'Full Frame', mediaType: 'SD', professions: ['videographer'], maxFPS: 60, maxVideo: '4K', priceNOK: 18990, descriptionNo: 'Kompakt vlogg-kamera med fullformat-sensor' },

  // Canon Full Frame
  { id: 'canon-r5', brand: 'Canon', model: 'EOS R5', megapixels: 45, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'], maxFPS: 12, maxVideo: '8K RAW', priceNOK: 44990, descriptionNo: 'Canons flaggskip med 8K RAW-opptak og 45MP' },
  { id: 'canon-r5c', brand: 'Canon', model: 'EOS R5 C', megapixels: 45, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['videographer', 'director'], maxFPS: 12, maxVideo: '8K RAW', priceNOK: 52990, descriptionNo: 'Cinema-hybridkamera med ventilert sensor for ubegrenset opptak' },
  { id: 'canon-r6ii', brand: 'Canon', model: 'EOS R6 II', megapixels: 24, sensorSize: 'Full Frame', mediaType: 'SD', professions: ['photographer'], maxFPS: 40, maxVideo: '4K 60p', priceNOK: 32990, descriptionNo: 'Rask sportslinse med 40 fps og eksepsjonell autofokus' },
  { id: 'canon-r3', brand: 'Canon', model: 'EOS R3', megapixels: 24, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer'], maxFPS: 30, maxVideo: '6K RAW', priceNOK: 79990, descriptionNo: 'Profesjonelt sports- og nyhetskamera med øyekontroll-AF' },
  { id: 'canon-r1', brand: 'Canon', model: 'EOS R1', megapixels: 24, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer'], maxFPS: 40, maxVideo: '6K RAW', priceNOK: 89990, descriptionNo: 'Canons ultrapro flaggskip for sport og nyheter 2024' },

  // Nikon Full Frame
  { id: 'nikon-z8', brand: 'Nikon', model: 'Z8', megapixels: 45, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'], maxFPS: 20, maxVideo: '8K RAW', priceNOK: 41990, descriptionNo: 'Kompakt flaggskip med intern 8K RAW' },
  { id: 'nikon-z9', brand: 'Nikon', model: 'Z9', megapixels: 45, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'], maxFPS: 20, maxVideo: '8K RAW', priceNOK: 59990, descriptionNo: 'Nikons toppmodell med stabelstakk-sensor og mekanisk lukker-fri' },
  { id: 'nikon-z6iii', brand: 'Nikon', model: 'Z6 III', megapixels: 24, sensorSize: 'Full Frame', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'], maxFPS: 20, maxVideo: '6K RAW', priceNOK: 29990, descriptionNo: 'Delvis stabel fullformat-sensor med RAW-videofunksjon' },

  // Medium Format
  { id: 'fuji-gfx100ii', brand: 'Fujifilm', model: 'GFX 100 II', megapixels: 102, sensorSize: 'Medium Format', mediaType: 'CFexpress Type B', professions: ['photographer'], maxFPS: 8, maxVideo: '4K', priceNOK: 89990, descriptionNo: '102MP mellomformatkamera med in-body stabilisering' },
  { id: 'fuji-gfx50sii', brand: 'Fujifilm', model: 'GFX 50S II', megapixels: 51, sensorSize: 'Medium Format', mediaType: 'SD', professions: ['photographer'], maxFPS: 3, maxVideo: '4K', priceNOK: 49990, descriptionNo: 'Tilgjengelig mellomformatkamera for kommersielt studio' },
  { id: 'hasselblad-x2d', brand: 'Hasselblad', model: 'X2D 100C', megapixels: 100, sensorSize: 'Medium Format', mediaType: 'CFexpress Type B', professions: ['photographer'], maxFPS: 3, priceNOK: 109990, descriptionNo: '100MP Hasselblad med 5-akse stabilisering' },

  // APS-C
  { id: 'fuji-xt5', brand: 'Fujifilm', model: 'X-T5', megapixels: 40, sensorSize: 'APS-C', mediaType: 'SD', professions: ['photographer'], maxFPS: 15, maxVideo: '6.2K', priceNOK: 18990, descriptionNo: '40MP APS-C kamera med kompakt kropp' },
  { id: 'fuji-xh2', brand: 'Fujifilm', model: 'X-H2', megapixels: 40, sensorSize: 'APS-C', mediaType: 'CFexpress Type B', professions: ['photographer', 'videographer'], maxFPS: 15, maxVideo: '8K', priceNOK: 21990, descriptionNo: 'APS-C flaggskip med 8K-video og 40MP' },
  { id: 'sony-a6700', brand: 'Sony', model: 'A6700', megapixels: 26, sensorSize: 'APS-C', mediaType: 'SD', professions: ['photographer', 'videographer'], maxFPS: 11, maxVideo: '4K 120p', priceNOK: 16990, descriptionNo: 'Kompakt APS-C med AI-autofokus og 4K 120p' },
  { id: 'canon-r7', brand: 'Canon', model: 'EOS R7', megapixels: 32, sensorSize: 'APS-C', mediaType: 'SD', professions: ['photographer'], maxFPS: 30, maxVideo: '4K 60p', priceNOK: 14990, descriptionNo: 'Rask APS-C med 30fps og utmerket autofokus' },
  { id: 'nikon-zfc', brand: 'Nikon', model: 'Z fc', megapixels: 20, sensorSize: 'APS-C', mediaType: 'SD', professions: ['photographer'], maxFPS: 11, maxVideo: '4K', priceNOK: 9990, descriptionNo: 'Retro-stilisert APS-C med moderne ytelse' },

  // Leica
  { id: 'leica-slii', brand: 'Leica', model: 'SL2', megapixels: 47, sensorSize: 'Full Frame', mediaType: 'SD', professions: ['photographer'], maxFPS: 20, maxVideo: '4K', priceNOK: 79990, descriptionNo: 'Tysk presisjonskamera for studio og landskap' },
  { id: 'leica-q3', brand: 'Leica', model: 'Q3', megapixels: 60, sensorSize: 'Full Frame', mediaType: 'SD', professions: ['photographer'], maxFPS: 15, maxVideo: '8K', priceNOK: 62990, descriptionNo: 'Kompakt fullformat med fast 28mm Summilux-linse' },
];

export function getPhotoCamerasByProfession(profession: string): PhotoCamera[] {
  return PHOTO_CAMERA_DATABASE.filter(cam => cam.professions.includes(profession));
}

export function getPhotoCamerasBySensorSize(sensorSize: string): PhotoCamera[] {
  return PHOTO_CAMERA_DATABASE.filter(cam => cam.sensorSize === sensorSize);
}

export function getPhotoCamerasBrand(brand: string): PhotoCamera[] {
  return PHOTO_CAMERA_DATABASE.filter(cam => cam.brand === brand);
}

export function getPhotoCameraBrand(cameraId: string): string {
  const camera = PHOTO_CAMERA_DATABASE.find(c => c.id === cameraId);
  return camera?.brand || '';
}

export function getPhotoCameraById(id: string): PhotoCamera | undefined {
  return PHOTO_CAMERA_DATABASE.find(c => c.id === id);
}
