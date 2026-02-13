/**
 * Photography Education Data
 * 
 * Comprehensive data for the Photography Training Panel including:
 * - White Balance presets and color temperature
 * - Exposure triangle lessons
 * - Metering and focus modes
 * - Composition rules
 * - School photography tips
 * - Quiz questions
 * - Focal length guide
 * - Light angles and heights
 * - Distance guidelines
 * - Equipment setups
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WhiteBalancePreset {
  id: string;
  name: string;
  kelvin: number;
  icon: string;
  description: string;
  scenarios: string[];
}

export interface ColorTemperatureRange {
  name: string;
  min: number;
  max: number;
  color: string;
  examples: string[];
}

export interface ExposureLesson {
  id: string;
  title: string;
  icon: string;
  description: string;
  settings: {
    range: string;
    effect: string;
    tradeoff: string;
  };
  tips: string[];
  exercises: string[];
}

export interface MeteringMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  bestFor: string[];
}

export interface FocusMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  bestFor: string[];
}

export interface CompositionRule {
  id: string;
  name: string;
  icon: string;
  description: string;
  howTo: string[];
  examples: string[];
}

export interface SchoolPhotographySection {
  id: string;
  category: string;
  title: string;
  description: string;
  tips: string[];
}

export interface QuizQuestion {
  topic: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface FocalLengthEntry {
  id: string;
  name: string;
  range: string;
  fieldOfView: string;
  bestFor: string[];
  characteristics: string[];
  distortion: string;
  subjectDistance: string;
}

export interface LightAngle {
  id: string;
  name: string;
  angle: number;
  height: string;
  effect: string;
  bestFor: string[];
  avoid: string[];
}

export interface LightHeight {
  position: string;
  degrees: number;
  effect: string;
  catchlights: string;
}

export interface DistanceGuideline {
  id: string;
  scenario: string;
  subjectToBackground: {
    minimum: string;
    recommended: string;
    reason: string;
  };
  lightToSubject: {
    keyLight: string;
    fillLight: string;
    reason: string;
  };
  cameraToSubject: string;
  tips: string[];
}

export interface EquipmentSetup {
  id: string;
  name: string;
  equipment: string[];
  description: string;
  setup: {
    keyPosition: string;
    fillPosition: string;
    rimLight?: string;
  };
  bestFor: string[];
  limitations: string[];
  tips: string[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

export const WHITE_BALANCE_PRESETS: WhiteBalancePreset[] = [
  {
    id: 'daylight',
    name: 'Daylight',
    kelvin: 5500,
    icon: 'WbSunny',
    description: 'Standard daylight color temperature for sunny outdoor scenes.',
    scenarios: ['Outdoor sunny', 'Open shade', 'Golden hour'],
  },
  {
    id: 'cloudy',
    name: 'Cloudy',
    kelvin: 6500,
    icon: 'Cloud',
    description: 'Slightly warmer to compensate for the blue cast of overcast skies.',
    scenarios: ['Overcast day', 'Shaded areas', 'Window light'],
  },
  {
    id: 'shade',
    name: 'Shade',
    kelvin: 7500,
    icon: 'Park',
    description: 'Warm tone to counteract the blue light found in shaded areas.',
    scenarios: ['Under trees', 'North-facing windows', 'Open shade'],
  },
  {
    id: 'tungsten',
    name: 'Tungsten',
    kelvin: 3200,
    icon: 'Lightbulb',
    description: 'Cool compensation for warm indoor tungsten/incandescent lighting.',
    scenarios: ['Indoor bulbs', 'Warm indoor lighting', 'Evening home scenes'],
  },
  {
    id: 'fluorescent',
    name: 'Fluorescent',
    kelvin: 4000,
    icon: 'FlashlightOn',
    description: 'Corrects the greenish tint of fluorescent lighting.',
    scenarios: ['Office lighting', 'School gyms', 'Commercial spaces'],
  },
  {
    id: 'flash',
    name: 'Flash',
    kelvin: 5400,
    icon: 'FlashOn',
    description: 'Optimized for electronic flash/strobe units.',
    scenarios: ['Studio flash', 'On-camera flash', 'Speedlite'],
  },
  {
    id: 'custom',
    name: 'Custom/Auto',
    kelvin: 5000,
    icon: 'Tune',
    description: 'Let the camera decide or set manually using a gray card.',
    scenarios: ['Mixed lighting', 'Unusual light sources', 'Events'],
  },
  {
    id: 'auto',
    name: 'Auto WB',
    kelvin: 5200,
    icon: 'AutoMode',
    description: 'Camera automatically adjusts white balance based on scene analysis.',
    scenarios: ['Quick shooting', 'Changing conditions', 'Events'],
  },
];

export const COLOR_TEMPERATURE_SCALE: ColorTemperatureRange[] = [
  { name: 'Candle', min: 1500, max: 2000, color: '#ff6b00', examples: ['Candle light', 'Firelight'] },
  { name: 'Tungsten', min: 2000, max: 3500, color: '#ffa726', examples: ['Light bulbs', 'Sunrise/sunset'] },
  { name: 'Halogen', min: 3500, max: 4500, color: '#ffcc80', examples: ['Halogen lamps', 'Early morning'] },
  { name: 'Daylight', min: 4500, max: 6000, color: '#fff9c4', examples: ['Noon sun', 'Flash'] },
  { name: 'Cloudy', min: 6000, max: 7500, color: '#e3f2fd', examples: ['Overcast sky', 'Window light'] },
  { name: 'Shade', min: 7500, max: 10000, color: '#bbdefb', examples: ['Open shade', 'Blue sky'] },
  { name: 'Blue Sky', min: 10000, max: 12000, color: '#90caf9', examples: ['Deep blue sky', 'High altitude'] },
];

export const EXPOSURE_LESSONS: ExposureLesson[] = [
  {
    id: 'aperture',
    title: 'Aperture (f-stop)',
    icon: 'Aperture',
    description: 'Aperture controls how much light enters throught the lens by adjusting the diaphragm opening. A wider aperture (lower f-number) lets in more light and creates a shallower depth of field.',
    settings: {
      range: 'f/1.4 – f/22',
      effect: 'Controls depth of field (DOF)',
      tradeoff: 'Wide open = shallow DOF, more light; Stopped down = deep DOF, less light',
    },
    tips: [
      'Use f/1.4-f/2.8 for portraits with blurry backgrounds',
      'Use f/8-f/11 for sharp landscapes',
      'Use f/5.6 as a safe all-purpose setting',
      'Avoid f/16+ due to diffraction softening',
    ],
    exercises: [
      'Shoot the same subject at f/2.8, f/5.6, and f/11. Compare the background blur.',
      'Try a portrait at f/1.8 — notice how the eyes are sharp but ears may blur.',
    ],
  },
  {
    id: 'shutter_speed',
    title: 'Shutter Speed',
    icon: 'ShutterSpeed',
    description: 'Shutter speed controls how long the sensor is exposed to light. Faster speeds freeze motion while slower speeds create blur.',
    settings: {
      range: '1/8000s – 30s (Bulb)',
      effect: 'Controls motion rendering',
      tradeoff: 'Faster = freeze motion, less light; Slower = motion blur, more light',
    },
    tips: [
      'Use 1/250+ to freeze kids/sports',
      'Use 1/125 as a safe handheld minimum for 50mm',
      'Use tripod for anything slower than 1/60',
      'Reciprocal rule: minimum shutter speed = 1/(focal length)',
    ],
    exercises: [
      'Photograph running water at 1/500 and 1/15. Compare the effect.',
      'Try panning: use 1/30 and follow a moving subject.',
    ],
  },
  {
    id: 'iso',
    title: 'ISO (Sensitivity)',
    icon: 'Iso',
    description: 'ISO controls the sensor sensitivity to light. Higher ISO allows shooting in dimmer conditions but adds noise/grain.',
    settings: {
      range: 'ISO 100 – 12800+',
      effect: 'Controls sensor sensitivity',
      tradeoff: 'Higher ISO = brighter image, more noise; Lower ISO = cleaner image, needs more light',
    },
    tips: [
      'Use ISO 100-400 outdoors in good light',
      'Use ISO 800-1600 for indoor events',
      'Modern cameras handle ISO 3200+ well',
      'Always use the lowest ISO your situation allows',
    ],
    exercises: [
      'Take the same indoor shot at ISO 400, 1600, and 6400. Compare noise levels.',
      'In a dim room, find the minimum ISO that gives you a usable shutter speed.',
    ],
  },
];

export const METERING_MODES: MeteringMode[] = [
  {
    id: 'matrix',
    name: 'Matrix/Evaluative',
    icon: 'GridView',
    description: 'Evaluates the entire scene by dividing it into zones and calculating a balanced exposure.',
    bestFor: ['Landscapes', 'General shooting', 'Even lighting'],
  },
  {
    id: 'center',
    name: 'Center-Weighted',
    icon: 'CenterFocusStrong',
    description: 'Meters the whole frame but gives extra weight to the center area.',
    bestFor: ['Portraits', 'Backlit subjects', 'Consistent results'],
  },
  {
    id: 'spot',
    name: 'Spot Metering',
    icon: 'Adjust',
    description: 'Meters only a small area (2-5%) of the frame, typically at the focus point.',
    bestFor: ['Backlit subjects', 'Stage performances', 'High contrast scenes'],
  },
  {
    id: 'highlight',
    name: 'Highlight-Weighted',
    icon: 'Highlight',
    description: 'Prioritizes preserving highlight detail. Prevents blown-out whites.',
    bestFor: ['Weddings (white dress)', 'Bright scenes', 'Snow photography'],
  },
];

export const FOCUS_MODES: FocusMode[] = [
  {
    id: 'single',
    name: 'Single/One-Shot AF',
    icon: 'CenterFocusStrong',
    description: 'Focuses once when shutter is half-pressed and locks. Best for stationary subjects.',
    bestFor: ['Portraits', 'Still life', 'Landscapes', 'Architecture'],
  },
  {
    id: 'continuous',
    name: 'Continuous/AI Servo',
    icon: 'Timeline',
    description: 'Continuously adjusts focus while the shutter is half-pressed. Tracks moving subjects.',
    bestFor: ['Sports', 'Wildlife', 'Children playing', 'Action'],
  },
  {
    id: 'auto',
    name: 'Auto/AI Focus',
    icon: 'AutoMode',
    description: 'Camera decides between single and continuous based on subject movement.',
    bestFor: ['Events', 'Unpredictable subjects', 'General use'],
  },
  {
    id: 'manual',
    name: 'Manual Focus',
    icon: 'TouchApp',
    description: 'You control the focus ring manually. Essential for some specialized situations.',
    bestFor: ['Macro', 'Low light', 'Through glass', 'Video'],
  },
];

export const COMPOSITION_RULES: CompositionRule[] = [
  {
    id: 'rule_of_thirds',
    name: 'Rule of Thirds',
    icon: 'Grid3x3',
    description: 'Divide your frame into a 3×3 grid. Place key elements along the lines or at intersection points for a balanced, engaging composition.',
    howTo: [
      'Enable the grid overlay in your camera',
      'Place the subject\'s eyes on the upper third line',
      'Align horizons with the top or bottom grid line',
      'Put the main subject at a power point (intersection)',
    ],
    examples: ['Portraits', 'Landscapes', 'Street photography'],
  },
  {
    id: 'leading_lines',
    name: 'Leading Lines',
    icon: 'Timeline',
    description: 'Use natural lines in the scene (roads, fences, rivers) to guide the viewer\'s eye toward the main subject.',
    howTo: [
      'Find natural lines: paths, walls, shadows',
      'Position them to converge toward your subject',
      'Diagonal lines add energy; curved lines add elegance',
    ],
    examples: ['Architecture', 'Roads', 'Bridges', 'Hallways'],
  },
  {
    id: 'framing',
    name: 'Natural Framing',
    icon: 'CropFree',
    description: 'Use elements in the scene to create a frame within the frame, drawing attention to your subject.',
    howTo: [
      'Look for arches, doorways, windows, branches',
      'Use foreground elements to create depth',
      'The frame doesn\'t need to be complete',
    ],
    examples: ['Windows', 'Doorways', 'Tree branches', 'Architecture'],
  },
  {
    id: 'symmetry',
    name: 'Symmetry & Patterns',
    icon: 'ViewQuilt',
    description: 'Symmetry creates a sense of harmony and balance. Breaking a pattern adds interest and draws the eye.',
    howTo: [
      'Find reflections in water, glass, or polished surfaces',
      'Center your subject for perfect symmetry',
      'Break the pattern with a contrasting element',
    ],
    examples: ['Reflections', 'Architecture', 'Nature patterns'],
  },
  {
    id: 'depth',
    name: 'Foreground Interest',
    icon: 'Layers',
    description: 'Include interesting foreground elements to create a sense of depth and dimension in your images.',
    howTo: [
      'Get low and include ground-level elements',
      'Use a wide-angle lens to exaggerate perspective',
      'Layer foreground, mid-ground, background elements',
    ],
    examples: ['Landscapes', 'Travel', 'Environmental portraits'],
  },
  {
    id: 'negative_space',
    name: 'Negative Space',
    icon: 'Crop',
    description: 'Leave empty space around your subject to create minimalist, powerful compositions that let the subject breathe.',
    howTo: [
      'Simplify the background',
      'Give the subject space to "look into" or "move toward"',
      'Use negative space to convey isolation or freedom',
    ],
    examples: ['Minimalist portraits', 'Product photography', 'Fine art'],
  },
];

export const SCHOOL_PHOTOGRAPHY_TIPS: SchoolPhotographySection[] = [
  {
    id: 'camera_settings',
    category: 'technical',
    title: 'Camera Settings for Volume',
    description: 'Optimize your camera for fast, consistent school portrait sessions.',
    tips: [
      'Shoot in Manual mode for consistent exposures across all subjects',
      'Use f/5.6–f/8 for sharp focus across the face with some background separation',
      'Set shutter speed to at least 1/125s to freeze any movement',
      'ISO 200-400 with flash for clean images',
      'Shoot RAW+JPEG for flexibility in post-processing',
      'Use back-button focus to separate focus from shutter',
    ],
  },
  {
    id: 'lighting_setup',
    category: 'lighting',
    title: 'Lighting for School Portraits',
    description: 'Create flattering, consistent lighting that works for all skin tones.',
    tips: [
      'Use a large softbox (3-4ft) as key light at 45° angle, slightly above eye level',
      'Add a fill light or reflector on the opposite side at 1-2 stops less',
      'Use a white backdrop lit evenly to avoid shadows',
      'Test lighting on multiple skin tones before the session starts',
      'Keep lighting ratios low (2:1 or 3:1) for universally flattering results',
      'Set up a hair light if using dark backgrounds',
    ],
  },
  {
    id: 'workflow',
    category: 'workflow',
    title: 'Workflow & Efficiency',
    description: 'Process hundreds of students quickly while maintaining quality.',
    tips: [
      'Use a barcode/QR scanner system linked to student data',
      'Create a staging area where students can check hair/appearance',
      'Keep sessions to 30-60 seconds per student for class photos',
      'Have an assistant manage the queue and student positioning',
      'Review images periodically to catch any lighting drift',
      'Back up to two locations during the session',
    ],
  },
  {
    id: 'posing_basics',
    category: 'posing',
    title: 'Quick Posing Guide',
    description: 'Simple, repeatable poses that look great on everyone.',
    tips: [
      'Slight head tilt and genuine smile — avoid forcing expressions',
      'Turn shoulders slightly (not straight-on) for a slimming effect',
      'Eyes follow the nose — have them look slightly past the camera',
      'Chin slightly forward and down to avoid double-chin',
      'For groups: stagger heights, close gaps, angle bodies toward center',
      'Give simple, clear directions: "Turn your shoulders this way"',
    ],
  },
  {
    id: 'troubleshooting',
    category: 'technical',
    title: 'Common Issues & Fixes',
    description: 'Quick solutions for the most common school photography problems.',
    tips: [
      'Glasses glare: raise the light slightly or angle glasses down at nose',
      'Blinkers: take 2-3 shots quickly and use burst mode',
      'Harsh shadows: move key light closer for softer wrap-around light',
      'Inconsistent skin tones: shoot a gray card first, calibrate per room',
      'Shiny foreheads: keep blotting papers/powder available',
      'Flyaway hair: have a small fan and hairspray on set',
    ],
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    topic: 'white_balance',
    question: 'What color temperature (in Kelvin) represents standard daylight?',
    options: ['3200K', '4500K', '5500K', '7500K'],
    correctAnswer: 2,
    explanation: '5500K is considered standard daylight. Lower Kelvin values (3200K) represent warm tungsten light, while higher values (7500K+) represent cool shade light.',
  },
  {
    topic: 'aperture',
    question: 'Which aperture setting produces the shallowest depth of field?',
    options: ['f/1.4', 'f/5.6', 'f/11', 'f/22'],
    correctAnswer: 0,
    explanation: 'f/1.4 is the widest aperture listed, creating the shallowest depth of field. Lower f-numbers = wider aperture = shallower DOF.',
  },
  {
    topic: 'shutter_speed',
    question: 'What minimum shutter speed should you use to freeze a running child?',
    options: ['1/30', '1/60', '1/250', '1/1000'],
    correctAnswer: 2,
    explanation: '1/250s or faster is recommended to freeze the motion of a running child. For very fast sports, 1/1000 may be needed.',
  },
  {
    topic: 'iso',
    question: 'What is the main disadvantage of using very high ISO values?',
    options: ['Slower autofocus', 'Increased image noise/grain', 'Reduced color depth', 'Narrower dynamic range'],
    correctAnswer: 1,
    explanation: 'High ISO amplifies the sensor signal, which also amplifies noise, resulting in a grainy or speckled appearance in images.',
  },
  {
    topic: 'metering',
    question: 'Which metering mode is best for a backlit portrait?',
    options: ['Matrix/Evaluative', 'Center-Weighted', 'Spot Metering', 'Highlight-Weighted'],
    correctAnswer: 2,
    explanation: 'Spot metering measures only a small area (the subject\'s face), ensuring correct exposure regardless of the bright background.',
  },
  {
    topic: 'composition',
    question: 'In the Rule of Thirds, where should you ideally place a subject\'s eyes?',
    options: ['Center of the frame', 'Along the upper third line', 'In the bottom quarter', 'At the very edge'],
    correctAnswer: 1,
    explanation: 'Placing the eyes along the upper third line creates a natural, balanced composition that draws the viewer\'s attention.',
  },
  {
    topic: 'white_balance',
    question: 'What white balance preset would you use under fluorescent office lights?',
    options: ['Daylight (5500K)', 'Tungsten (3200K)', 'Fluorescent (~4000K)', 'Shade (7500K)'],
    correctAnswer: 2,
    explanation: 'The Fluorescent preset (~4000K) compensates for the greenish tint produced by fluorescent lighting.',
  },
  {
    topic: 'focal_length',
    question: 'Which focal length range is most recommended for flattering portraits?',
    options: ['14-24mm', '35-50mm', '85-135mm', '200-400mm'],
    correctAnswer: 2,
    explanation: '85-135mm provides the most natural facial compression, avoiding the distortion caused by wider lenses and giving pleasing bokeh.',
  },
  {
    topic: 'lighting',
    question: 'At what angle above eye level does the most flattering portrait light typically come from?',
    options: ['0° (eye level)', '15-45° above', '60-90° above', 'Below eye level'],
    correctAnswer: 1,
    explanation: '15-45° above eye level mimics natural sunlight and creates attractive catchlights while defining facial structure.',
  },
  {
    topic: 'school_photography',
    question: 'What aperture range is recommended for school portraits with consistent sharpness?',
    options: ['f/1.4-f/2', 'f/2.8-f/4', 'f/5.6-f/8', 'f/11-f/16'],
    correctAnswer: 2,
    explanation: 'f/5.6-f/8 ensures the entire face is sharp while still providing some background separation. Wider apertures risk soft ears/hair.',
  },
];

export const FOCAL_LENGTH_GUIDE: FocalLengthEntry[] = [
  {
    id: 'ultra_wide',
    name: 'Ultra Wide',
    range: '14-24mm',
    fieldOfView: '84°-114°',
    bestFor: ['Architecture', 'Real estate', 'Astrophotography', 'Dramatic landscapes'],
    characteristics: [
      'Extreme perspective exaggeration',
      'Barrel distortion at widest settings',
      'Deep depth of field even wide open',
      'Small subjects in frame',
    ],
    distortion: 'Significant barrel distortion, avoid for portraits',
    subjectDistance: 'Very close for immersive feel',
  },
  {
    id: 'wide',
    name: 'Wide Angle',
    range: '24-35mm',
    fieldOfView: '63°-84°',
    bestFor: ['Landscapes', 'Street photography', 'Environmental portraits', 'Group shots'],
    characteristics: [
      'Natural-looking perspective with slight exaggeration',
      'Good for storytelling and context',
      'Moderate distortion at edges',
      'Versatile general purpose range',
    ],
    distortion: 'Noticeable at 24mm, minimal at 35mm',
    subjectDistance: '3-8 feet for environmental context',
  },
  {
    id: 'normal',
    name: 'Normal/Standard',
    range: '40-60mm',
    fieldOfView: '40°-57°',
    bestFor: ['Street photography', 'Documentary', 'Everyday shooting', 'Full-body portraits'],
    characteristics: [
      'Closest to human eye perspective',
      'Minimal distortion',
      'Very versatile focal length',
      'Great for learning composition',
    ],
    distortion: 'Minimal, natural perspective',
    subjectDistance: '5-12 feet for natural framing',
  },
  {
    id: 'short_tele',
    name: 'Short Telephoto',
    range: '85-135mm',
    fieldOfView: '15°-28°',
    bestFor: ['Headshots', 'Fashion portraits', 'Wedding details', 'Candid photography'],
    characteristics: [
      'Most flattering facial compression',
      'Beautiful background blur (bokeh)',
      'Comfortable working distance for portraits',
      'Classic portrait focal length range',
    ],
    distortion: 'None — ideal facial proportions',
    subjectDistance: '6-15 feet for head/shoulders',
  },
  {
    id: 'telephoto',
    name: 'Telephoto',
    range: '200-400mm',
    fieldOfView: '5°-12°',
    bestFor: ['Sports', 'Wildlife', 'Compressed landscapes', 'Distant subjects'],
    characteristics: [
      'Strong background compression',
      'Isolates subjects from background',
      'Requires faster shutter speeds',
      'Tripod recommended',
    ],
    distortion: 'Very compressed perspective',
    subjectDistance: '20+ feet, reaches distant subjects',
  },
];

export const LIGHT_ANGLES: LightAngle[] = [
  {
    id: 'front',
    name: 'Front/Flat Light',
    angle: 0,
    height: 'Slightly above eye level',
    effect: 'Even, shadowless illumination. Minimizes texture and wrinkles.',
    bestFor: ['Beauty photography', 'Passport photos', 'Product shots'],
    avoid: ['Dramatic portraits', 'Artistic work'],
  },
  {
    id: 'loop',
    name: 'Loop Lighting',
    angle: 30,
    height: 'Above eye level at 30-45°',
    effect: 'Small shadow from nose creates a loop on opposite cheek. Flattering and natural.',
    bestFor: ['General portraits', 'School photos', 'Headshots'],
    avoid: ['Very round faces (widens face)'],
  },
  {
    id: 'rembrandt',
    name: 'Rembrandt Lighting',
    angle: 45,
    height: 'Above eye level at 45°',
    effect: 'Creates a triangle of light on the shadow-side cheek. Classic, dramatic look.',
    bestFor: ['Dramatic portraits', 'Male portraits', 'Artistic work'],
    avoid: ['Corporate headshots', 'Children'],
  },
  {
    id: 'split',
    name: 'Split Lighting',
    angle: 90,
    height: 'Eye level to slightly above',
    effect: 'Illuminates exactly half the face. Very dramatic and moody.',
    bestFor: ['Dramatic effect', 'Artistic portraits', 'Mystery/mood'],
    avoid: ['Commercial work', 'School photos', 'Groups'],
  },
  {
    id: 'rim',
    name: 'Rim/Backlight',
    angle: 135,
    height: 'Above and behind subject',
    effect: 'Creates a bright outline around subject, separating them from background.',
    bestFor: ['Hair light/separation', 'Silhouettes', 'Dramatic edge lighting'],
    avoid: ['As sole light source unless silhouette intended'],
  },
];

export const LIGHT_HEIGHTS: LightHeight[] = [
  { position: 'Below Face (Under)', degrees: -15, effect: 'Spooky, unnatural. Rarely used except for Halloween effects.', catchlights: 'Bottom of eyes' },
  { position: 'Eye Level', degrees: 0, effect: 'Flat, fashion-style lighting. Good for beauty work.', catchlights: 'Center of eyes' },
  { position: 'Slightly Above (15-30°)', degrees: 25, effect: 'Natural, mimics sun. Most universally flattering angle.', catchlights: 'Upper half of eyes — ideal' },
  { position: 'Classic Portrait (30-45°)', degrees: 40, effect: 'Defines cheekbones and jawline. Professional standard.', catchlights: 'Upper third of eyes' },
  { position: 'High Overhead (60°+)', degrees: 65, effect: 'Deep eye shadows, raccoon eyes. Use with fill.', catchlights: 'May be hidden by brow' },
];

export const DISTANCE_GUIDELINES: DistanceGuideline[] = [
  {
    id: 'headshot',
    scenario: 'Individual Headshot',
    subjectToBackground: {
      minimum: '3 feet',
      recommended: '5-8 feet',
      reason: 'Ensures clean background blur and prevents shadows on backdrop',
    },
    lightToSubject: {
      keyLight: '4-6 feet at 45°',
      fillLight: '5-8 feet on opposite side',
      reason: 'Close enough for soft light, far enough for even coverage',
    },
    cameraToSubject: '6-10 feet with 85-135mm',
    tips: [
      'The closer the light, the softer the shadow edges',
      'Move subject away from background for more blur',
      'Use a reflector for subtle fill instead of a second light',
    ],
  },
  {
    id: 'class_photo',
    scenario: 'Class/Group Photo',
    subjectToBackground: {
      minimum: '5 feet',
      recommended: '8-12 feet',
      reason: 'Needs extra space for even lighting across the group',
    },
    lightToSubject: {
      keyLight: '8-12 feet, raised high',
      fillLight: '10-15 feet, or large reflector',
      reason: 'Lights must cover the full width of the group evenly',
    },
    cameraToSubject: '15-25 feet at 35-50mm',
    tips: [
      'Use two large lights to cover the group width',
      'Stand on a ladder or use elevated position',
      'Stagger rows and angle people inward',
      'Take multiple shots — someone always blinks',
    ],
  },
  {
    id: 'full_length',
    scenario: 'Full-Length Portrait',
    subjectToBackground: {
      minimum: '4 feet',
      recommended: '6-10 feet',
      reason: 'Full-length shots need more background coverage',
    },
    lightToSubject: {
      keyLight: '6-8 feet at 45°, high',
      fillLight: '8-10 feet on opposite side',
      reason: 'Light must cover head to toe evenly',
    },
    cameraToSubject: '10-15 feet at 50-85mm',
    tips: [
      'Angle the light down to cover full body evenly',
      'Watch for hot spots on closest body parts',
      'Floor-to-ceiling backdrop needed',
    ],
  },
];

export const EQUIPMENT_SETUPS: EquipmentSetup[] = [
  {
    id: 'one_light_reflector',
    name: 'One Light + Reflector',
    equipment: ['1 Speedlight or strobe', 'Reflector/foam board'],
    description: 'The simplest professional setup. One main light with a reflector to fill shadows. Perfect for beginners.',
    setup: {
      keyPosition: '45° to subject at slightly above eye level with modifier (umbrella/softbox)',
      fillPosition: 'Reflector on opposite side, angled to bounce key light into shadows',
    },
    bestFor: ['Headshots', 'Simple portraits', 'Business photos'],
    limitations: [
      'Limited background separation without separate background light',
      'Lower light output for large groups',
      'Shadows may be noticeable in certain angles',
    ],
    tips: [
      'White reflector for subtle fill; silver for stronger fill',
      'Move reflector closer for more fill effect',
      'This setup can produce 90% of portrait styles',
    ],
  },
  {
    id: 'two_light',
    name: 'Two Light Setup',
    equipment: ['2 Strobes/speedlights', 'Softbox (key)', 'Umbrella (fill)'],
    description: 'Classic two-light portrait setup with key and fill lights for controlled, professional lighting.',
    setup: {
      keyPosition: '45° from subject at above eye level, large softbox',
      fillPosition: 'Opposite side, 1-2 stops lower than key light',
    },
    bestFor: ['School portraits', 'Corporate headshots', 'Event photography'],
    limitations: [
      'Requires more space for setup',
      'Two light stands needed',
      'More equipment to transport',
    ],
    tips: [
      'Set key light first, then add fill until shadows look right',
      'Use a light meter for consistent ratios',
      'Fill should be softer (larger modifier) than key',
    ],
  },
  {
    id: 'three_light',
    name: 'Three Light Studio',
    equipment: ['3 Strobes', 'Softbox', 'Umbrella/reflector', 'Grid/snoot (rim)'],
    description: 'Full studio setup with key, fill, and rim/hair light for complete control over lighting and separation.',
    setup: {
      keyPosition: 'Main light at 45°, slightly above eye level with softbox',
      fillPosition: 'Opposite side, 1-2 stops under key, umbrella or reflector',
      rimLight: 'Behind subject at 135° opposite to key, slightly above, with grid/snoot for control',
    },
    bestFor: ['Professional portraits', 'Yearbook photos', 'Commercial work'],
    limitations: [
      'Requires dedicated studio or large space',
      'More complex to set up and maintain consistently',
      'Higher equipment cost',
    ],
    tips: [
      'Set up in order: key → fill → rim',
      'The rim light should create a thin edge, not overwhelm',
      'Watch for rim light flare in the lens — use a flag if needed',
    ],
  },
  {
    id: 'natural_light',
    name: 'Natural Light Only',
    equipment: ['Large window', 'Reflector/white foam board'],
    description: 'Use window light as your key light for soft, beautiful images with no artificial lighting needed.',
    setup: {
      keyPosition: 'Subject facing large window at 45-90°',
      fillPosition: 'White reflector on shadow side to bounce window light',
    },
    bestFor: ['Maternity', 'Newborn', 'Casual portraits', 'Lifestyle sessions'],
    limitations: [
      'Dependent on time of day and weather',
      'Less control over light intensity and direction',
      'May need to move subject throughout the day as light changes',
    ],
    tips: [
      'Sheer curtains work as a natural diffuser',
      'Overcast days provide the most even, flattering window light',
      'North-facing windows give consistent light throughout the day',
    ],
  },
];

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Converts a Kelvin temperature to the approximate hex color it would cast.
 */
export function kelvinToHex(kelvin: number): string {
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
    b = temp <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    b = 255;
  }

  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

/**
 * Returns the color temperature range that a given Kelvin value falls into.
 */
export function getColorTemperatureRange(kelvin: number): ColorTemperatureRange | undefined {
  return COLOR_TEMPERATURE_SCALE.find(range => kelvin >= range.min && kelvin <= range.max);
}
