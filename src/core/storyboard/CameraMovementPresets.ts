/**
 * CameraMovementPresets - Quick-access presets for common storyboard camera movements
 * 
 * Provides pre-configured arrow definitions for standard film camera movements.
 * Supports both preset library (quick access) and custom drawing mode.
 */

// =============================================================================
// Types
// =============================================================================

export type ArrowPathType = 'straight' | 'curved' | 'l-shape' | 'arc' | 'bidirectional' | 'dolly-zoom';

export type CameraMovementCategory = 'pan' | 'tilt' | 'dolly' | 'truck' | 'crane' | 'zoom' | 'orbit' | 'combination' | 'custom';

export interface CameraMovementPreset {
  id: string;
  name: string;
  nameNo: string; // Norwegian translation
  category: CameraMovementCategory;
  description: string;
  descriptionNo: string;
  
  // Arrow configuration
  pathType: ArrowPathType;
  direction: 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'cw' | 'ccw' | 'custom';
  
  // Visual properties
  icon: string; // Material icon name
  color: string;
  strokeWidth: number;
  arrowHeadSize: number;
  dashPattern?: number[]; // For animated arrows
  
  // Default label
  defaultLabel: string;
  defaultLabelNo: string;
  
  // Path definition (relative coordinates 0-1)
  defaultPath: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    controlPoints?: { x: number; y: number }[]; // For bezier curves
  };
  
  // For combination movements
  subMovements?: string[];
  
  // Keyboard shortcut
  shortcut?: string;
}

export interface CustomArrowGesture {
  points: { x: number; y: number; timestamp: number }[];
  detectedType: ArrowPathType;
  detectedMovement?: string;
  confidence: number;
  suggestedLabel?: string;
}

// =============================================================================
// Preset Definitions
// =============================================================================

export const CAMERA_MOVEMENT_PRESETS: CameraMovementPreset[] = [
  // === PAN ===
  {
    id: 'pan-left',
    name: 'Pan Left',
    nameNo: 'Panorer venstre',
    category: 'pan',
    description: 'Horizontal rotation of camera to the left',
    descriptionNo: 'Horisontal rotasjon av kamera til venstre',
    pathType: 'straight',
    direction: 'left',
    icon: 'arrow_back',
    color: '#2196F3',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'PAN L',
    defaultLabelNo: 'PANORER V',
    defaultPath: {
      start: { x: 0.7, y: 0.5 },
      end: { x: 0.3, y: 0.5 },
    },
    shortcut: 'P L',
  },
  {
    id: 'pan-right',
    name: 'Pan Right',
    nameNo: 'Panorer høyre',
    category: 'pan',
    description: 'Horizontal rotation of camera to the right',
    descriptionNo: 'Horisontal rotasjon av kamera til høyre',
    pathType: 'straight',
    direction: 'right',
    icon: 'arrow_forward',
    color: '#2196F3',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'PAN R',
    defaultLabelNo: 'PANORER H',
    defaultPath: {
      start: { x: 0.3, y: 0.5 },
      end: { x: 0.7, y: 0.5 },
    },
    shortcut: 'P R',
  },

  // === TILT ===
  {
    id: 'tilt-up',
    name: 'Tilt Up',
    nameNo: 'Tilt opp',
    category: 'tilt',
    description: 'Vertical rotation of camera upward',
    descriptionNo: 'Vertikal rotasjon av kamera oppover',
    pathType: 'straight',
    direction: 'up',
    icon: 'arrow_upward',
    color: '#4CAF50',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'TILT UP',
    defaultLabelNo: 'TILT OPP',
    defaultPath: {
      start: { x: 0.5, y: 0.7 },
      end: { x: 0.5, y: 0.3 },
    },
    shortcut: 'T U',
  },
  {
    id: 'tilt-down',
    name: 'Tilt Down',
    nameNo: 'Tilt ned',
    category: 'tilt',
    description: 'Vertical rotation of camera downward',
    descriptionNo: 'Vertikal rotasjon av kamera nedover',
    pathType: 'straight',
    direction: 'down',
    icon: 'arrow_downward',
    color: '#4CAF50',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'TILT DOWN',
    defaultLabelNo: 'TILT NED',
    defaultPath: {
      start: { x: 0.5, y: 0.3 },
      end: { x: 0.5, y: 0.7 },
    },
    shortcut: 'T D',
  },

  // === DOLLY ===
  {
    id: 'dolly-in',
    name: 'Dolly In',
    nameNo: 'Dolly inn',
    category: 'dolly',
    description: 'Camera physically moves toward subject',
    descriptionNo: 'Kamera beveger seg fysisk mot motivet',
    pathType: 'straight',
    direction: 'in',
    icon: 'zoom_in_map',
    color: '#FF9800',
    strokeWidth: 4,
    arrowHeadSize: 14,
    defaultLabel: 'DOLLY IN',
    defaultLabelNo: 'DOLLY INN',
    defaultPath: {
      start: { x: 0.2, y: 0.8 },
      end: { x: 0.5, y: 0.5 },
    },
    shortcut: 'D I',
  },
  {
    id: 'dolly-out',
    name: 'Dolly Out',
    nameNo: 'Dolly ut',
    category: 'dolly',
    description: 'Camera physically moves away from subject',
    descriptionNo: 'Kamera beveger seg fysisk bort fra motivet',
    pathType: 'straight',
    direction: 'out',
    icon: 'zoom_out_map',
    color: '#FF9800',
    strokeWidth: 4,
    arrowHeadSize: 14,
    defaultLabel: 'DOLLY OUT',
    defaultLabelNo: 'DOLLY UT',
    defaultPath: {
      start: { x: 0.5, y: 0.5 },
      end: { x: 0.2, y: 0.8 },
    },
    shortcut: 'D O',
  },

  // === TRUCK ===
  {
    id: 'truck-left',
    name: 'Truck Left',
    nameNo: 'Truck venstre',
    category: 'truck',
    description: 'Camera moves laterally to the left',
    descriptionNo: 'Kamera beveger seg sideveis til venstre',
    pathType: 'straight',
    direction: 'left',
    icon: 'west',
    color: '#9C27B0',
    strokeWidth: 3,
    arrowHeadSize: 12,
    dashPattern: [8, 4],
    defaultLabel: 'TRUCK L',
    defaultLabelNo: 'TRUCK V',
    defaultPath: {
      start: { x: 0.7, y: 0.5 },
      end: { x: 0.3, y: 0.5 },
    },
    shortcut: 'K L',
  },
  {
    id: 'truck-right',
    name: 'Truck Right',
    nameNo: 'Truck høyre',
    category: 'truck',
    description: 'Camera moves laterally to the right',
    descriptionNo: 'Kamera beveger seg sideveis til høyre',
    pathType: 'straight',
    direction: 'right',
    icon: 'east',
    color: '#9C27B0',
    strokeWidth: 3,
    arrowHeadSize: 12,
    dashPattern: [8, 4],
    defaultLabel: 'TRUCK R',
    defaultLabelNo: 'TRUCK H',
    defaultPath: {
      start: { x: 0.3, y: 0.5 },
      end: { x: 0.7, y: 0.5 },
    },
    shortcut: 'K R',
  },

  // === CRANE ===
  {
    id: 'crane-up',
    name: 'Crane Up',
    nameNo: 'Kran opp',
    category: 'crane',
    description: 'Camera rises vertically on crane/jib',
    descriptionNo: 'Kamera løftes vertikalt på kran',
    pathType: 'straight',
    direction: 'up',
    icon: 'trending_up',
    color: '#E91E63',
    strokeWidth: 4,
    arrowHeadSize: 14,
    dashPattern: [12, 4],
    defaultLabel: 'CRANE UP',
    defaultLabelNo: 'KRAN OPP',
    defaultPath: {
      start: { x: 0.5, y: 0.8 },
      end: { x: 0.5, y: 0.2 },
    },
    shortcut: 'C U',
  },
  {
    id: 'crane-down',
    name: 'Crane Down',
    nameNo: 'Kran ned',
    category: 'crane',
    description: 'Camera lowers vertically on crane/jib',
    descriptionNo: 'Kamera senkes vertikalt på kran',
    pathType: 'straight',
    direction: 'down',
    icon: 'trending_down',
    color: '#E91E63',
    strokeWidth: 4,
    arrowHeadSize: 14,
    dashPattern: [12, 4],
    defaultLabel: 'CRANE DOWN',
    defaultLabelNo: 'KRAN NED',
    defaultPath: {
      start: { x: 0.5, y: 0.2 },
      end: { x: 0.5, y: 0.8 },
    },
    shortcut: 'C D',
  },

  // === ZOOM ===
  {
    id: 'zoom-in',
    name: 'Zoom In',
    nameNo: 'Zoom inn',
    category: 'zoom',
    description: 'Lens zooms in (optical, camera stationary)',
    descriptionNo: 'Linse zoomer inn (optisk, kamera stasjonært)',
    pathType: 'dolly-zoom',
    direction: 'in',
    icon: 'zoom_in',
    color: '#00BCD4',
    strokeWidth: 3,
    arrowHeadSize: 10,
    defaultLabel: 'ZOOM IN',
    defaultLabelNo: 'ZOOM INN',
    defaultPath: {
      start: { x: 0.3, y: 0.3 },
      end: { x: 0.5, y: 0.5 },
      controlPoints: [
        { x: 0.7, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 0.3, y: 0.7 },
      ],
    },
    shortcut: 'Z I',
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    nameNo: 'Zoom ut',
    category: 'zoom',
    description: 'Lens zooms out (optical, camera stationary)',
    descriptionNo: 'Linse zoomer ut (optisk, kamera stasjonært)',
    pathType: 'dolly-zoom',
    direction: 'out',
    icon: 'zoom_out',
    color: '#00BCD4',
    strokeWidth: 3,
    arrowHeadSize: 10,
    defaultLabel: 'ZOOM OUT',
    defaultLabelNo: 'ZOOM UT',
    defaultPath: {
      start: { x: 0.5, y: 0.5 },
      end: { x: 0.3, y: 0.3 },
      controlPoints: [
        { x: 0.7, y: 0.3 },
        { x: 0.7, y: 0.7 },
        { x: 0.3, y: 0.7 },
      ],
    },
    shortcut: 'Z O',
  },

  // === ORBIT ===
  {
    id: 'orbit-cw',
    name: 'Orbit Clockwise',
    nameNo: 'Orbit med klokken',
    category: 'orbit',
    description: 'Camera orbits around subject clockwise',
    descriptionNo: 'Kamera sirkler rundt motivet med klokken',
    pathType: 'arc',
    direction: 'cw',
    icon: 'rotate_right',
    color: '#795548',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'ORBIT CW',
    defaultLabelNo: 'ORBIT MK',
    defaultPath: {
      start: { x: 0.2, y: 0.5 },
      end: { x: 0.8, y: 0.5 },
      controlPoints: [{ x: 0.5, y: 0.2 }],
    },
    shortcut: 'O R',
  },
  {
    id: 'orbit-ccw',
    name: 'Orbit Counter-Clockwise',
    nameNo: 'Orbit mot klokken',
    category: 'orbit',
    description: 'Camera orbits around subject counter-clockwise',
    descriptionNo: 'Kamera sirkler rundt motivet mot klokken',
    pathType: 'arc',
    direction: 'ccw',
    icon: 'rotate_left',
    color: '#795548',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'ORBIT CCW',
    defaultLabelNo: 'ORBIT MK',
    defaultPath: {
      start: { x: 0.8, y: 0.5 },
      end: { x: 0.2, y: 0.5 },
      controlPoints: [{ x: 0.5, y: 0.2 }],
    },
    shortcut: 'O L',
  },

  // === COMBINATION MOVEMENTS ===
  {
    id: 'pan-tilt-right-up',
    name: 'Pan Right + Tilt Up',
    nameNo: 'Panorer høyre + Tilt opp',
    category: 'combination',
    description: 'Combined pan right and tilt up (L-shape)',
    descriptionNo: 'Kombinert panorering høyre og tilt opp (L-form)',
    pathType: 'l-shape',
    direction: 'custom',
    icon: 'call_made',
    color: '#607D8B',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'PAN R + TILT UP',
    defaultLabelNo: 'PANORER H + TILT OPP',
    defaultPath: {
      start: { x: 0.3, y: 0.7 },
      end: { x: 0.7, y: 0.3 },
      controlPoints: [{ x: 0.7, y: 0.7 }], // Corner point
    },
    subMovements: ['pan-right', 'tilt-up'],
    shortcut: 'P T',
  },
  {
    id: 'pan-tilt-left-down',
    name: 'Pan Left + Tilt Down',
    nameNo: 'Panorer venstre + Tilt ned',
    category: 'combination',
    description: 'Combined pan left and tilt down (L-shape)',
    descriptionNo: 'Kombinert panorering venstre og tilt ned (L-form)',
    pathType: 'l-shape',
    direction: 'custom',
    icon: 'call_received',
    color: '#607D8B',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'PAN L + TILT DOWN',
    defaultLabelNo: 'PANORER V + TILT NED',
    defaultPath: {
      start: { x: 0.7, y: 0.3 },
      end: { x: 0.3, y: 0.7 },
      controlPoints: [{ x: 0.3, y: 0.3 }],
    },
    subMovements: ['pan-left', 'tilt-down'],
  },
  {
    id: 'dolly-zoom-vertigo',
    name: 'Dolly Zoom (Vertigo)',
    nameNo: 'Dolly Zoom (Vertigo)',
    category: 'combination',
    description: 'Dolly in while zooming out (or vice versa) - creates vertigo effect',
    descriptionNo: 'Dolly inn mens du zoomer ut (eller omvendt) - skaper vertigo-effekt',
    pathType: 'bidirectional',
    direction: 'custom',
    icon: 'open_with',
    color: '#F44336',
    strokeWidth: 4,
    arrowHeadSize: 14,
    defaultLabel: 'DOLLY ZOOM',
    defaultLabelNo: 'DOLLY ZOOM',
    defaultPath: {
      start: { x: 0.3, y: 0.5 },
      end: { x: 0.7, y: 0.5 },
    },
    subMovements: ['dolly-in', 'zoom-out'],
    shortcut: 'D Z',
  },
  {
    id: 'push-in-arc',
    name: 'Push In Arc',
    nameNo: 'Bue inn',
    category: 'combination',
    description: 'Camera pushes in while arcing around subject',
    descriptionNo: 'Kamera skyves inn mens det sirkler rundt motivet',
    pathType: 'curved',
    direction: 'custom',
    icon: 'redo',
    color: '#673AB7',
    strokeWidth: 3,
    arrowHeadSize: 12,
    defaultLabel: 'PUSH IN ARC',
    defaultLabelNo: 'BUE INN',
    defaultPath: {
      start: { x: 0.2, y: 0.7 },
      end: { x: 0.5, y: 0.3 },
      controlPoints: [{ x: 0.1, y: 0.3 }],
    },
    subMovements: ['dolly-in', 'orbit-ccw'],
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get preset by ID
 */
export function getPresetById(id: string): CameraMovementPreset | undefined {
  return CAMERA_MOVEMENT_PRESETS.find(p => p.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: CameraMovementCategory): CameraMovementPreset[] {
  return CAMERA_MOVEMENT_PRESETS.filter(p => p.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): CameraMovementCategory[] {
  return ['pan', 'tilt', 'dolly', 'truck', 'crane', 'zoom', 'orbit', 'combination'];
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: CameraMovementCategory, norwegian = false): string {
  const names: Record<CameraMovementCategory, { en: string; no: string }> = {
    pan: { en: 'Pan', no: 'Panorer' },
    tilt: { en: 'Tilt', no: 'Tilt' },
    dolly: { en: 'Dolly', no: 'Dolly' },
    truck: { en: 'Truck', no: 'Truck' },
    crane: { en: 'Crane', no: 'Kran' },
    zoom: { en: 'Zoom', no: 'Zoom' },
    orbit: { en: 'Orbit', no: 'Orbit' },
    combination: { en: 'Combination', no: 'Kombinasjon' },
    custom: { en: 'Custom', no: 'Egendefinert' },
  };
  return norwegian ? names[category].no : names[category].en;
}

/**
 * Detect arrow type from gesture points
 * Returns detected type, confidence, and suggested movement label
 */
export function detectArrowGesture(points: { x: number; y: number }[]): CustomArrowGesture {
  if (points.length < 3) {
    return {
      points: points.map(p => ({ ...p, timestamp: Date.now() })),
      detectedType: 'straight',
      confidence: 0.5,
    };
  }

  // Calculate angles between segments
  const angles: number[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    let angleDiff = Math.abs(angle2 - angle1) * (180 / Math.PI);
    
    // Normalize to 0-180
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    angles.push(angleDiff);
  }

  // Find maximum angle change
  const maxAngle = Math.max(...angles);
  const maxAngleIndex = angles.indexOf(maxAngle);

  // Calculate overall direction
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  // Detect L-shape (sharp angle > 60°)
  if (maxAngle > 60) {
    const cornerPoint = points[maxAngleIndex + 1];
    
    // Determine first and second leg directions
    const leg1Dx = cornerPoint.x - startPoint.x;
    const leg1Dy = cornerPoint.y - startPoint.y;
    const leg2Dx = endPoint.x - cornerPoint.x;
    const leg2Dy = endPoint.y - cornerPoint.y;
    
    let movement1 = '';
    let movement2 = '';
    
    // First leg
    if (Math.abs(leg1Dx) > Math.abs(leg1Dy)) {
      movement1 = leg1Dx > 0 ? 'PAN R' : 'PAN L';
    } else {
      movement1 = leg1Dy > 0 ? 'TILT DOWN' : 'TILT UP';
    }
    
    // Second leg
    if (Math.abs(leg2Dx) > Math.abs(leg2Dy)) {
      movement2 = leg2Dx > 0 ? 'PAN R' : 'PAN L';
    } else {
      movement2 = leg2Dy > 0 ? 'TILT DOWN' : 'TILT UP';
    }
    
    return {
      points: points.map(p => ({ ...p, timestamp: Date.now() })),
      detectedType: 'l-shape',
      detectedMovement: `${movement1} + ${movement2}`,
      confidence: maxAngle > 75 ? 0.9 : 0.7,
      suggestedLabel: `${movement1} + ${movement2}`,
    };
  }

  // Detect curved path (cumulative angle changes > 30°)
  const cumulativeAngle = angles.reduce((sum, a) => sum + a, 0);
  if (cumulativeAngle > 30 && maxAngle < 60) {
    const isClockwise = detectCurveDirection(points);
    return {
      points: points.map(p => ({ ...p, timestamp: Date.now() })),
      detectedType: 'curved',
      detectedMovement: isClockwise ? 'ARC CW' : 'ARC CCW',
      confidence: 0.75,
      suggestedLabel: isClockwise ? 'ORBIT CW' : 'ORBIT CCW',
    };
  }

  // Detect arc (single smooth curve)
  if (cumulativeAngle > 15 && cumulativeAngle <= 30) {
    return {
      points: points.map(p => ({ ...p, timestamp: Date.now() })),
      detectedType: 'arc',
      confidence: 0.7,
    };
  }

  // Default: straight arrow
  let suggestedLabel = '';
  if (Math.abs(dx) > Math.abs(dy) * 2) {
    suggestedLabel = dx > 0 ? 'PAN R' : 'PAN L';
  } else if (Math.abs(dy) > Math.abs(dx) * 2) {
    suggestedLabel = dy > 0 ? 'TILT DOWN' : 'TILT UP';
  } else if (Math.abs(dx) > Math.abs(dy)) {
    // Diagonal - could be dolly
    suggestedLabel = dx > 0 ? (dy > 0 ? 'DOLLY OUT' : 'DOLLY IN') : (dy > 0 ? 'TRUCK L' : 'TRUCK R');
  }

  return {
    points: points.map(p => ({ ...p, timestamp: Date.now() })),
    detectedType: 'straight',
    detectedMovement: suggestedLabel,
    confidence: 0.85,
    suggestedLabel,
  };
}

/**
 * Detect if a curve is clockwise or counter-clockwise
 */
function detectCurveDirection(points: { x: number; y: number }[]): boolean {
  // Calculate signed area (shoelace formula)
  let signedArea = 0;
  for (let i = 0; i < points.length - 1; i++) {
    signedArea += (points[i + 1].x - points[i].x) * (points[i + 1].y + points[i].y);
  }
  return signedArea > 0; // Positive = clockwise
}

/**
 * Scale preset path to canvas dimensions
 */
export function scalePresetToCanvas(
  preset: CameraMovementPreset,
  canvasWidth: number,
  canvasHeight: number,
  margin = 0.1
): {
  start: { x: number; y: number };
  end: { x: number; y: number };
  controlPoints?: { x: number; y: number }[];
} {
  const effectiveWidth = canvasWidth * (1 - 2 * margin);
  const effectiveHeight = canvasHeight * (1 - 2 * margin);
  const offsetX = canvasWidth * margin;
  const offsetY = canvasHeight * margin;

  const scalePoint = (p: { x: number; y: number }) => ({
    x: offsetX + p.x * effectiveWidth,
    y: offsetY + p.y * effectiveHeight,
  });

  return {
    start: scalePoint(preset.defaultPath.start),
    end: scalePoint(preset.defaultPath.end),
    controlPoints: preset.defaultPath.controlPoints?.map(scalePoint),
  };
}

export default CAMERA_MOVEMENT_PRESETS;
