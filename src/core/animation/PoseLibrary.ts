/**
 * Pose Library
 * Professional photography poses with per-bone rotation data
 * Bone names follow the Mixamo standard (used by most BabylonJS/GLB character rigs).
 */

// ---------------------------------------------------------------------------
// Bone name registry (Mixamo standard)
// ---------------------------------------------------------------------------
export const BONE_NAMES = {
  HIPS:             'mixamorigHips',
  SPINE:            'mixamorigSpine',
  SPINE1:           'mixamorigSpine1',
  SPINE2:           'mixamorigSpine2',
  NECK:             'mixamorigNeck',
  HEAD:             'mixamorigHead',
  LEFT_SHOULDER:    'mixamorigLeftShoulder',
  LEFT_ARM:         'mixamorigLeftArm',
  LEFT_FOREARM:     'mixamorigLeftForeArm',
  LEFT_HAND:        'mixamorigLeftHand',
  RIGHT_SHOULDER:   'mixamorigRightShoulder',
  RIGHT_ARM:        'mixamorigRightArm',
  RIGHT_FOREARM:    'mixamorigRightForeArm',
  RIGHT_HAND:       'mixamorigRightHand',
  LEFT_UP_LEG:      'mixamorigLeftUpLeg',
  LEFT_LEG:         'mixamorigLeftLeg',
  LEFT_FOOT:        'mixamorigLeftFoot',
  LEFT_TOE_BASE:    'mixamorigLeftToeBase',
  RIGHT_UP_LEG:     'mixamorigRightUpLeg',
  RIGHT_LEG:        'mixamorigRightLeg',
  RIGHT_FOOT:       'mixamorigRightFoot',
  RIGHT_TOE_BASE:   'mixamorigRightToeBase',
} as const;

export type BoneName = (typeof BONE_NAMES)[keyof typeof BONE_NAMES];

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** Local Euler rotation in radians (XYZ application order). */
export interface BoneRotation {
  x: number;
  y: number;
  z: number;
}

/** Map of bone name → local rotation override.  Bones not listed keep their rest-pose value. */
export type PoseData = Partial<Record<string, BoneRotation>>;

export interface PosePreset {
  id: string;
  name: string;
  description: string;
  category: 'portrait' | 'fashion' | 'commercial' | 'editorial' | 'fitness' | 'dance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pose: PoseData;
}

// ---------------------------------------------------------------------------
// Pose definitions
// Shorthand alias keeps the definitions readable.
// ---------------------------------------------------------------------------
const B = BONE_NAMES;

export const ALL_POSES: PosePreset[] = [
  // ── PORTRAIT ──────────────────────────────────────────────────────────────
  {
    id: 'portrait_classic_stand',
    name: 'Classic Stand',
    description: 'Natural upright stance with arms relaxed at sides',
    category: 'portrait',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: 0.03, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.10, y: 0,     z: 0.15  },
      [B.RIGHT_ARM]:      { x: 0.10, y: 0,     z: -0.15 },
      [B.LEFT_FOREARM]:   { x: 0,    y: 0.10,  z: 0     },
      [B.RIGHT_FOREARM]:  { x: 0,    y: -0.10, z: 0     },
    },
  },
  {
    id: 'portrait_hands_on_hips',
    name: 'Hands on Hips',
    description: 'Confident stance with both hands resting on hips',
    category: 'portrait',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: 0.05, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0,    y: 0.30,  z: 0.70  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.50, z: 0.20  },
      [B.RIGHT_ARM]:      { x: 0,    y: -0.30, z: -0.70 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.50,  z: -0.20 },
    },
  },
  {
    id: 'portrait_cross_arms',
    name: 'Cross Arms',
    description: 'Arms crossed at chest — authoritative yet approachable',
    category: 'portrait',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: 0.05, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.50, y: 0.30,  z: 0.30  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -1.20, z: 0.20  },
      [B.RIGHT_ARM]:      { x: 0.50, y: -0.30, z: -0.30 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 1.20,  z: -0.20 },
    },
  },
  {
    id: 'portrait_over_shoulder',
    name: 'Over the Shoulder',
    description: 'Body turned away, glancing back over one shoulder',
    category: 'portrait',
    difficulty: 'intermediate',
    pose: {
      [B.HIPS]:           { x: 0,    y: -0.50, z: 0.05  },
      [B.SPINE]:          { x: 0.05, y: 0.30,  z: 0     },
      [B.SPINE2]:         { x: 0,    y: 0.40,  z: 0     },
      [B.HEAD]:           { x: 0.10, y: -0.70, z: 0     },
      [B.LEFT_ARM]:       { x: 0.20, y: 0.10,  z: 0.20  },
      [B.RIGHT_ARM]:      { x: 0.20, y: 0,     z: -0.30 },
    },
  },
  {
    id: 'portrait_contemplative',
    name: 'Contemplative',
    description: 'Thoughtful pose with one hand raised to chin',
    category: 'portrait',
    difficulty: 'intermediate',
    pose: {
      [B.SPINE]:          { x: 0.05, y: 0.10,  z: -0.05 },
      [B.HEAD]:           { x: 0.05, y: 0.15,  z: -0.05 },
      [B.RIGHT_ARM]:      { x: 0.40, y: 0.10,  z: -0.30 },
      [B.RIGHT_FOREARM]:  { x: 0.20, y: 0.80,  z: -0.20 },
      [B.LEFT_ARM]:       { x: 0.10, y: 0,     z: 0.20  },
    },
  },

  // ── FASHION ───────────────────────────────────────────────────────────────
  {
    id: 'fashion_power_stance',
    name: 'Power Stance',
    description: 'Wide, powerful stance projecting confidence on the runway',
    category: 'fashion',
    difficulty: 'beginner',
    pose: {
      [B.LEFT_UP_LEG]:    { x: 0,    y: 0,     z: 0.30  },
      [B.RIGHT_UP_LEG]:   { x: 0,    y: 0,     z: -0.30 },
      [B.LEFT_ARM]:       { x: 0,    y: 0,     z: 0.50  },
      [B.RIGHT_ARM]:      { x: 0,    y: 0,     z: -0.50 },
    },
  },
  {
    id: 'fashion_runway_walk',
    name: 'Runway Walk',
    description: 'Mid-stride catwalk pose with exaggerated hip swing',
    category: 'fashion',
    difficulty: 'intermediate',
    pose: {
      [B.HIPS]:           { x: 0.10, y: 0.15,  z: 0     },
      [B.SPINE]:          { x: -0.05,y: -0.15, z: 0     },
      [B.LEFT_UP_LEG]:    { x: -0.50,y: 0,     z: 0.05  },
      [B.LEFT_LEG]:       { x: 0.80, y: 0,     z: 0     },
      [B.RIGHT_UP_LEG]:   { x: 0.60, y: 0,     z: -0.05 },
      [B.RIGHT_LEG]:      { x: 0.10, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0,    y: -0.20, z: 0.30  },
      [B.RIGHT_ARM]:      { x: 0,    y: 0.20,  z: -0.40 },
    },
  },
  {
    id: 'fashion_hip_pop',
    name: 'Hip Pop',
    description: 'Exaggerated hip tilt with one arm raised — classic fashion editorial look',
    category: 'fashion',
    difficulty: 'intermediate',
    pose: {
      [B.HIPS]:           { x: 0,    y: 0,     z: 0.15  },
      [B.SPINE]:          { x: 0.05, y: 0,     z: -0.10 },
      [B.LEFT_UP_LEG]:    { x: 0,    y: 0,     z: 0.10  },
      [B.RIGHT_UP_LEG]:   { x: 0,    y: 0,     z: -0.05 },
      [B.LEFT_ARM]:       { x: 0,    y: 0.10,  z: 0.40  },
      [B.RIGHT_ARM]:      { x: 0,    y: -0.10, z: -0.60 },
    },
  },
  {
    id: 'fashion_editorial_lean',
    name: 'Editorial Lean',
    description: 'Bold forward lean with asymmetric arm placement',
    category: 'fashion',
    difficulty: 'advanced',
    pose: {
      [B.SPINE]:          { x: 0.30, y: 0.20,  z: 0     },
      [B.SPINE1]:         { x: 0.20, y: 0,     z: 0     },
      [B.SPINE2]:         { x: 0.15, y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.20,y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.30, y: 0.20,  z: 0.40  },
      [B.RIGHT_ARM]:      { x: 0.20, y: -0.20, z: -0.30 },
    },
  },

  // ── COMMERCIAL ────────────────────────────────────────────────────────────
  {
    id: 'commercial_welcoming',
    name: 'Welcoming',
    description: 'Open arms extended in a friendly, inviting gesture',
    category: 'commercial',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: -0.05,y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.05,y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0,    y: -0.30, z: 0.80  },
      [B.RIGHT_ARM]:      { x: 0,    y: 0.30,  z: -0.80 },
    },
  },
  {
    id: 'commercial_thumbs_up',
    name: 'Thumbs Up',
    description: 'Enthusiastic approval gesture with raised thumb',
    category: 'commercial',
    difficulty: 'beginner',
    pose: {
      [B.RIGHT_ARM]:      { x: 0.20, y: 0,     z: -0.50 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.30,  z: -0.20 },
      [B.RIGHT_HAND]:     { x: 0,    y: 0,     z: -0.30 },
    },
  },
  {
    id: 'commercial_pointing',
    name: 'Pointing',
    description: 'Directional pointing gesture drawing attention to a subject',
    category: 'commercial',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: 0,    y: 0.20,  z: 0     },
      [B.RIGHT_ARM]:      { x: 0,    y: 0.40,  z: -0.60 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: -0.30, z: 0     },
      [B.RIGHT_HAND]:     { x: 0,    y: 0.10,  z: 0.10  },
    },
  },

  // ── EDITORIAL ─────────────────────────────────────────────────────────────
  {
    id: 'editorial_dramatic_fall',
    name: 'Dramatic Fall',
    description: 'Dynamic falling-back pose for high-fashion editorial shots',
    category: 'editorial',
    difficulty: 'advanced',
    pose: {
      [B.HIPS]:           { x: 0.30, y: 0,     z: 0.20  },
      [B.SPINE]:          { x: 0.40, y: 0.10,  z: 0     },
      [B.SPINE1]:         { x: 0.30, y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.30,y: 0.20,  z: 0.10  },
      [B.LEFT_ARM]:       { x: -0.50,y: -0.30, z: 0.70  },
      [B.RIGHT_ARM]:      { x: -0.30,y: 0.50,  z: -0.80 },
    },
  },
  {
    id: 'editorial_wind_pose',
    name: 'Wind Pose',
    description: 'Flowing pose as if caught in a gust of wind',
    category: 'editorial',
    difficulty: 'intermediate',
    pose: {
      [B.SPINE]:          { x: -0.10,y: 0.20,  z: 0.10  },
      [B.HEAD]:           { x: 0.05, y: -0.30, z: 0.10  },
      [B.LEFT_ARM]:       { x: -0.50,y: -0.20, z: 0.60  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.50, z: 0     },
      [B.RIGHT_ARM]:      { x: -0.30,y: 0.30,  z: -0.40 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.30,  z: 0     },
    },
  },

  // ── FITNESS ───────────────────────────────────────────────────────────────
  {
    id: 'fitness_victory',
    name: 'Victory',
    description: 'Arms raised high in a triumphant victory celebration',
    category: 'fitness',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: -0.10,y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.15,y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: -0.70,y: 0,     z: 0.30  },
      [B.RIGHT_ARM]:      { x: -0.70,y: 0,     z: -0.30 },
    },
  },
  {
    id: 'fitness_power_pose',
    name: 'Power Pose',
    description: 'Flexing both arms to showcase muscle definition',
    category: 'fitness',
    difficulty: 'intermediate',
    pose: {
      [B.SPINE]:          { x: -0.08,y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0,    y: -0.30, z: 1.20  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -1.00, z: 0     },
      [B.RIGHT_ARM]:      { x: 0,    y: 0.30,  z: -1.20 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 1.00,  z: 0     },
    },
  },
  {
    id: 'fitness_sprint_start',
    name: 'Sprint Start',
    description: 'Athletic sprint start position — explosive and dynamic',
    category: 'fitness',
    difficulty: 'intermediate',
    pose: {
      [B.HIPS]:           { x: 0.40, y: 0,     z: 0     },
      [B.SPINE]:          { x: 0.30, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.60, y: 0,     z: 0.20  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.80, z: 0     },
      [B.RIGHT_ARM]:      { x: -0.50,y: 0,     z: -0.20 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.70,  z: 0     },
      [B.LEFT_UP_LEG]:    { x: -0.80,y: 0,     z: 0     },
      [B.LEFT_LEG]:       { x: 0.30, y: 0,     z: 0     },
      [B.RIGHT_UP_LEG]:   { x: 0.60, y: 0,     z: 0     },
      [B.RIGHT_LEG]:      { x: 0.50, y: 0,     z: 0     },
    },
  },

  // ── COMMERCIAL (story-scene additions) ────────────────────────────────────

  {
    id: 'commercial_seated_diner',
    name: 'Sittende (Restaurant)',
    description: 'Seated dining pose — relaxed upright posture at a table, one hand resting on surface',
    category: 'commercial',
    difficulty: 'beginner',
    pose: {
      [B.HIPS]:           { x: 1.30, y: 0,     z: 0     },  // hips flex for sitting
      [B.SPINE]:          { x: -0.05,y: 0,     z: 0     },
      [B.SPINE1]:         { x: -0.03,y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.10,y: 0,     z: 0     },
      [B.LEFT_UP_LEG]:    { x: -1.45,y: 0,     z: 0.05  },  // upper leg horizontal
      [B.LEFT_LEG]:       { x: 1.50, y: 0,     z: 0     },  // lower leg down
      [B.RIGHT_UP_LEG]:   { x: -1.45,y: 0,     z: -0.05 },
      [B.RIGHT_LEG]:      { x: 1.50, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.10, y: 0,     z: 0.30  },  // arm slightly down to table
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.50, z: 0     },  // forearm on table
      [B.RIGHT_ARM]:      { x: 0.10, y: 0,     z: -0.35 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.40,  z: 0     },
    },
  },
  {
    id: 'commercial_seated_interview',
    name: 'Sittende (Intervju)',
    description: 'Seated broadcast interview pose — professional upright, arms lightly folded or at rest',
    category: 'commercial',
    difficulty: 'beginner',
    pose: {
      [B.HIPS]:           { x: 1.30, y: 0,     z: 0     },
      [B.SPINE]:          { x: -0.10,y: 0,     z: 0     },
      [B.SPINE1]:         { x: -0.05,y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.10,y: 0.05,  z: 0     },
      [B.LEFT_UP_LEG]:    { x: -1.45,y: 0.10,  z: 0.05  },
      [B.LEFT_LEG]:       { x: 1.50, y: 0,     z: 0     },
      [B.RIGHT_UP_LEG]:   { x: -1.45,y: -0.10, z: -0.05 },
      [B.RIGHT_LEG]:      { x: 1.50, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.15, y: 0,     z: 0.25  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.30, z: 0.10  },
      [B.RIGHT_ARM]:      { x: 0.15, y: 0,     z: -0.30 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.25,  z: -0.10 },
    },
  },
  {
    id: 'portrait_overhead_lean',
    name: 'Fremoverlent (Overhead)',
    description: 'Leaning forward and downward — ideal for overhead product / food photography where stylist looks into frame',
    category: 'portrait',
    difficulty: 'beginner',
    pose: {
      [B.HIPS]:           { x: 0.20, y: 0,     z: 0     },
      [B.SPINE]:          { x: 0.40, y: 0,     z: 0     },
      [B.SPINE1]:         { x: 0.30, y: 0,     z: 0     },
      [B.HEAD]:           { x: 0.50, y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0.50, y: 0,     z: 0.20  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.20, z: 0.10  },
      [B.RIGHT_ARM]:      { x: 0.50, y: 0,     z: -0.20 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.20,  z: -0.10 },
    },
  },

  // ── DANCE ─────────────────────────────────────────────────────────────────
  {
    id: 'dance_ballet_first',
    name: 'Ballet First Position',
    description: "Heels together, feet turned outward — ballet's foundational stance",
    category: 'dance',
    difficulty: 'beginner',
    pose: {
      [B.SPINE]:          { x: -0.05,y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.10,y: 0,     z: 0     },
      [B.LEFT_UP_LEG]:    { x: 0,    y: 0.50,  z: 0.10  },
      [B.RIGHT_UP_LEG]:   { x: 0,    y: -0.50, z: -0.10 },
      [B.LEFT_ARM]:       { x: 0,    y: -0.20, z: 0.40  },
      [B.RIGHT_ARM]:      { x: 0,    y: 0.20,  z: -0.40 },
    },
  },
  {
    id: 'dance_jazz_hands',
    name: 'Jazz Hands',
    description: 'Expressive jazz dance pose with wide arms and fingers spread',
    category: 'dance',
    difficulty: 'intermediate',
    pose: {
      [B.HIPS]:           { x: 0,    y: 0,     z: 0.15  },
      [B.SPINE]:          { x: 0,    y: 0,     z: -0.10 },
      [B.HEAD]:           { x: -0.10,y: 0.20,  z: 0     },
      [B.LEFT_ARM]:       { x: 0,    y: -0.50, z: 1.00  },
      [B.LEFT_FOREARM]:   { x: 0,    y: -0.30, z: 0.20  },
      [B.RIGHT_ARM]:      { x: 0,    y: 0.50,  z: -1.00 },
      [B.RIGHT_FOREARM]:  { x: 0,    y: 0.30,  z: -0.20 },
    },
  },
  {
    id: 'dance_arabesque',
    name: 'Arabesque',
    description: 'Classical ballet arabesque with one leg extended behind',
    category: 'dance',
    difficulty: 'advanced',
    pose: {
      [B.SPINE]:          { x: -0.20,y: 0,     z: 0     },
      [B.HEAD]:           { x: -0.10,y: 0,     z: 0     },
      [B.LEFT_UP_LEG]:    { x: 0.20, y: 0,     z: 0.10  },
      [B.LEFT_LEG]:       { x: 0.10, y: 0,     z: 0     },
      [B.RIGHT_UP_LEG]:   { x: -1.20,y: 0,     z: 0     },
      [B.RIGHT_LEG]:      { x: -0.30,y: 0,     z: 0     },
      [B.LEFT_ARM]:       { x: 0,    y: 0,     z: 0.30  },
      [B.RIGHT_ARM]:      { x: 0,    y: -0.20, z: -0.50 },
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getPosesByCategory(category: PosePreset['category']): PosePreset[] {
  return ALL_POSES.filter((p) => p.category === category);
}
