export interface VideoCamera {
  id: string;
  brand: string;
  model: string;
  resolution: string;
  frameRates: string[];
  codec: string[];
  mediaType: string;
  professions: string[];
  priceNOK?: number;
  descriptionNo?: string;
  logFormat?: string[];
}

export const VIDEO_CAMERA_DATABASE: VideoCamera[] = [
  // Sony Cinema Line
  { id: 'sony-fx6', brand: 'Sony', model: 'FX6', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XAVC-I', 'XAVC-L'], logFormat: ['S-Log2', 'S-Log3', 'S-Cinetone'], mediaType: 'CFexpress Type A', professions: ['videographer', 'director'], priceNOK: 52990, descriptionNo: 'Kompakt full-frame kino-kamera med fremragende lavlys' },
  { id: 'sony-fx3', brand: 'Sony', model: 'FX3', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XAVC-I', 'XAVC-L'], logFormat: ['S-Log2', 'S-Log3', 'S-Cinetone'], mediaType: 'CFexpress Type A', professions: ['videographer'], priceNOK: 35990, descriptionNo: 'Kompakt full-frame kinokamera for documentary og run-and-gun' },
  { id: 'sony-fx9', brand: 'Sony', model: 'FX9', resolution: '6K', frameRates: ['24', '25', '30', '50', '60'], codec: ['XAVC-I', 'XAVC-L', 'XAVC-HS'], logFormat: ['S-Log2', 'S-Log3'], mediaType: 'XQD / CFexpress Type A', professions: ['videographer', 'director'], priceNOK: 89990, descriptionNo: 'Profesjonell full-frame kinokamera med 6K-sensor' },
  { id: 'sony-fx30', brand: 'Sony', model: 'FX30', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XAVC-I', 'XAVC-L', 'XAVC-HS'], logFormat: ['S-Log2', 'S-Log3', 'S-Cinetone'], mediaType: 'CFexpress Type A', professions: ['videographer'], priceNOK: 18990, descriptionNo: 'Rimelig APS-C kinokamera med S-Log-støtte' },

  // Canon Cinema EOS
  { id: 'canon-c70', brand: 'Canon', model: 'EOS C70', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XF-AVC', 'MP4', 'RAW'], logFormat: ['Canon Log 2', 'Canon Log 3'], mediaType: 'SD', professions: ['videographer', 'director'], priceNOK: 34990, descriptionNo: 'Kompakt RF-mount kinokamera med intern RAW-opptak' },
  { id: 'canon-c300iii', brand: 'Canon', model: 'EOS C300 Mark III', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['XF-AVC', 'Cinema RAW Light'], logFormat: ['Canon Log 2', 'Canon Log 3'], mediaType: 'CFexpress Type B', professions: ['director', 'videographer'], priceNOK: 89990, descriptionNo: 'Profesjonell skulderrigg-kamera med Cinema RAW' },
  { id: 'canon-c700', brand: 'Canon', model: 'EOS C700', resolution: '5.9K', frameRates: ['24', '25', '30', '50', '60'], codec: ['Cinema RAW Light', 'XF-AVC'], logFormat: ['Canon Log 2', 'Canon Log 3'], mediaType: 'CFast 2.0', professions: ['director'], priceNOK: 189990, descriptionNo: 'High-end studio og EFP kinokamera' },
  { id: 'canon-c200', brand: 'Canon', model: 'EOS C200', resolution: '4K', frameRates: ['24', '25', '30', '50', '60'], codec: ['Cinema RAW Light', 'MP4'], logFormat: ['Canon Log 3'], mediaType: 'CFast 2.0', professions: ['videographer'], priceNOK: 42990, descriptionNo: 'Intern Cinema RAW Light-kamera med kompakt design' },

  // Blackmagic Design
  { id: 'blackmagic-6k', brand: 'Blackmagic', model: 'Pocket 6K Pro', resolution: '6K', frameRates: ['24', '25', '30', '50', '60'], codec: ['BRAW', 'ProRes'], logFormat: ['Blackmagic Film', 'Blackmagic Log'], mediaType: 'CFast', professions: ['videographer'], priceNOK: 19990, descriptionNo: 'Svært populær B-kamera og indie-filmkamera' },
  { id: 'blackmagic-4k', brand: 'Blackmagic', model: 'Pocket 4K', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['BRAW', 'ProRes'], logFormat: ['Blackmagic Film'], mediaType: 'SD / CFast', professions: ['videographer'], priceNOK: 11990, descriptionNo: 'Rimelig indie-filmkamera med Blackmagic RAW' },
  { id: 'blackmagic-ursa-12k', brand: 'Blackmagic', model: 'URSA Mini Pro 12K', resolution: '12K', frameRates: ['24', '25', '30', '60'], codec: ['BRAW'], logFormat: ['Blackmagic Film'], mediaType: 'CFast / SD', professions: ['director'], priceNOK: 74990, descriptionNo: 'Ultra-høy oppløsning filmkamera med 12K sensor' },
  { id: 'blackmagic-cinema-6k', brand: 'Blackmagic', model: 'Cinema 6K', resolution: '6K', frameRates: ['24', '25', '30', '50', '60', '90'], codec: ['BRAW'], logFormat: ['Blackmagic Film'], mediaType: 'CFexpress Type B', professions: ['videographer', 'director'], priceNOK: 22990, descriptionNo: 'Ny 6K cinema-kamera med global shutter-sensor' },

  // RED
  { id: 'red-komodo', brand: 'RED', model: 'Komodo 6K', resolution: '6K', frameRates: ['24', '25', '30', '40', '50', '60'], codec: ['REDCODE RAW'], logFormat: ['REDWideGamutRGB', 'Log3G10'], mediaType: 'CFast', professions: ['director', 'videographer'], priceNOK: 74990, descriptionNo: 'Kompakt RED 6K for B-kamera og drone-rig' },
  { id: 'red-v-raptor', brand: 'RED', model: 'V-RAPTOR 8K VV', resolution: '8K', frameRates: ['24', '25', '30', '48', '60', '120'], codec: ['REDCODE RAW'], logFormat: ['REDWideGamutRGB'], mediaType: 'VV-format', professions: ['director'], priceNOK: 249990, descriptionNo: 'High-end studio RED med 8K VV-sensor' },
  { id: 'red-dsmc3', brand: 'RED', model: 'DSMC3 RAPTOR 8K S35', resolution: '8K', frameRates: ['24', '25', '30', '60', '120'], codec: ['REDCODE RAW'], logFormat: ['REDWideGamutRGB'], mediaType: 'Komodo Media', professions: ['director'], priceNOK: 179990, descriptionNo: 'RED DSMC3-plattform med 8K S35-sensor' },

  // ARRI
  { id: 'arri-alexa35', brand: 'ARRI', model: 'Alexa 35', resolution: '4.6K', frameRates: ['24', '25', '30', '48', '60', '75'], codec: ['ARRIRAW', 'ProRes'], logFormat: ['Log C3'], mediaType: 'Codex Compact Drive', professions: ['director'], priceNOK: 799990, descriptionNo: 'Industristandardkamera for Hollywoodproduksjon' },
  { id: 'arri-mini-lf', brand: 'ARRI', model: 'ALEXA Mini LF', resolution: '4.5K', frameRates: ['24', '25', '30', '48', '60', '90'], codec: ['ARRIRAW', 'ProRes'], logFormat: ['Log C'], mediaType: 'Codex Compact Drive', professions: ['director'], priceNOK: 599990, descriptionNo: 'Kompakt large-format ARRI for handheld og steadicam' },

  // Nikon
  { id: 'nikon-z6iii-video', brand: 'Nikon', model: 'Z6 III (Video)', resolution: '6K RAW', frameRates: ['24', '25', '30', '60', '120'], codec: ['N-RAW', 'ProRes RAW', 'H.265'], logFormat: ['N-Log'], mediaType: 'CFexpress Type B', professions: ['videographer'], priceNOK: 29990, descriptionNo: 'Hybrid-kamera med intern 6K RAW-video og N-Log' },

  // Panasonic
  { id: 'panasonic-s5ii', brand: 'Panasonic', model: 'Lumix S5 II', resolution: '4K', frameRates: ['24', '25', '30', '50', '60', '120'], codec: ['H.265', 'All-I', 'MOV'], logFormat: ['V-Log'], mediaType: 'SD', professions: ['videographer'], priceNOK: 21990, descriptionNo: 'Hybridkamera med PDAF og V-Log' },
  { id: 'panasonic-gh7', brand: 'Panasonic', model: 'Lumix GH7', resolution: '5.7K', frameRates: ['24', '25', '30', '50', '60', '120', '240'], codec: ['ProRes RAW', 'Apple ProRes', 'H.265'], logFormat: ['V-Log L'], mediaType: 'SD', professions: ['videographer'], priceNOK: 19990, descriptionNo: 'MFT-kamera med intern Apple ProRes og ProRes RAW' },
];

export function getCamerasByProfession(profession: string): VideoCamera[] {
  return VIDEO_CAMERA_DATABASE.filter(cam => cam.professions.includes(profession));
}

export function getCamerasByResolution(resolution: string): VideoCamera[] {
  return VIDEO_CAMERA_DATABASE.filter(cam => cam.resolution.startsWith(resolution));
}

export function getLogFormatsByCamera(cameraId: string): string[] {
  const camera = VIDEO_CAMERA_DATABASE.find(c => c.id === cameraId);
  return camera?.logFormat || camera?.codec || [];
}

export function getCameraBrand(cameraId: string): string {
  const camera = VIDEO_CAMERA_DATABASE.find(c => c.id === cameraId);
  return camera?.brand || '';
}

export function getCameraById(id: string): VideoCamera | undefined {
  return VIDEO_CAMERA_DATABASE.find(c => c.id === id);
}

export function getCamerasByBrand(brand: string): VideoCamera[] {
  return VIDEO_CAMERA_DATABASE.filter(c => c.brand === brand);
}
