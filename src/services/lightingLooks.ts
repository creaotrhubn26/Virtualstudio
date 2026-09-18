/**
 * Lighting as a place, not as three stands.
 *
 * Someone making a training video in a kitchen does not want to position a key
 * and set a fill ratio. They want the kitchen to look like a kitchen. A look
 * is that: a named situation — a living room in the evening, a hospital
 * corridor, a street at night — that lights the subject the way that place
 * would, and can then be taken apart in the light panel by anyone who wants to.
 *
 * Two things keep this honest rather than decorative:
 *
 * A look is specified in stops, not in scene units. `keyStops` is how far the
 * look's key reading sits from the studio portrait key, and each fixture's
 * `stops` is its own level below that key. Doubling the numbers in one place
 * changes nothing about the relationships, which is what a lighting ratio is.
 *
 * The fixtures that do the work are real fixtures, gelled to the colour of the
 * place, standing where a gaffer would put them. The lamps and windows in the
 * catalogue are practicals: at their published output a ceiling pendant would
 * have to hang 60 cm from someone's face to key them. They appear in a look at
 * a low level, as the motivating source, which is exactly what they are on a
 * real set.
 */

import { getLightById } from '../data/lightFixtures';
import type { PolarPlacement } from './studioLocations';

export interface LookVec3 {
  x: number;
  y: number;
  z: number;
}

export interface LookFixture {
  /** Catalogue id, from `lightFixtures`. */
  fixture: string;
  /** What this light is on set, in the words used on set. */
  name: string;
  /**
   * Where it stands, said as an angle from the camera.
   *
   * A working light is placed the way lighting is written down — so many
   * degrees around from the lens, so many above the eye line, so far out —
   * because that is the instruction that survives a different room, a shorter
   * subject and a reframed shot. A coordinate survives none of them.
   */
  placement?: PolarPlacement;
  /**
   * Where it stands, metres, for a source that is a thing in the room.
   *
   * A lamp is on the table the table is on, and a candle does not move because
   * the camera did. Only `motivating` fixtures use this.
   */
  position?: LookVec3;
  /** What it points at, metres. Only for a fixture placed by position. */
  aim?: LookVec3;
  /**
   * The lamp in the room this fixture is.
   *
   * `pendant`, `window`, `oven`, `ceiling`, `candle`. When the room has built
   * one by that name, that is where this light goes — so the pendant hangs
   * over the table the room put a table at, rather than over whoever happens
   * to be standing at the origin. `position` is the fallback for a place with
   * no geometry of its own.
   */
  anchor?: string;
  /** Level below the look's key, in stops. The key itself is 0. */
  stops: number;
  /** Colour temperature it is gelled or set to, kelvin. */
  cct: number;
  /** Cone angle, degrees. Ignored by fixtures that are not spots. */
  beamDeg?: number;
  /** Spot falloff exponent; higher is a tighter hotspot. */
  exponent?: number;
  /** Shadow-map bias, for a fixture that needs one other than the default. */
  bias?: number;
  normalBias?: number;
  /**
   * A source that is meant to be seen — a lamp, a window, a candle.
   *
   * It stays exactly where it is put. A working light may be walked in or out
   * to make its level; a table candle cannot be moved two metres closer
   * because the level asks for it, so `stops` is a ceiling for these rather
   * than a reading to hit, and it burns at whatever it can give from there.
   */
  motivating?: boolean;
}

export type LookGroup = 'studio' | 'rom' | 'ute' | 'stemning';

export interface LightingLook {
  id: string;
  /** The place or situation, as someone would ask for it. */
  label: string;
  /** Plain explanation for anyone who does not know the term. */
  hint: string;
  group: LookGroup;
  /** The look's key reading, in stops from the studio portrait key. */
  keyStops: number;
  fixtures: LookFixture[];
}

/**
 * The studio portrait key, in scene illuminance units.
 *
 * This is the reading the hand-tuned default rig delivered, kept exactly so
 * that the default look is the rig that was there before and every other look
 * can be described as so many stops from it.
 */
export const STUDIO_KEY_ILLUMINANCE = 520 / 19.86;

/** The reading a look's key should give at the subject, in scene units. */
export function lookKeyIlluminance(look: LightingLook): number {
  return STUDIO_KEY_ILLUMINANCE * Math.pow(2, look.keyStops);
}

/** What one fixture in a look should read at its aim point, in scene units. */
export function fixtureIlluminance(look: LightingLook, fixture: LookFixture): number {
  return lookKeyIlluminance(look) * Math.pow(2, -fixture.stops);
}

export const LIGHTING_LOOKS: LightingLook[] = [
  {
    id: 'studio-portrett',
    label: 'Studio · portrett',
    hint: 'Nøytralt hoved-, utfyllings- og kantlys. Utgangspunktet for å bedømme hud og materialer.',
    group: 'studio',
    keyStops: 0,
    fixtures: [
      {
        fixture: 'aputure-300d', name: 'Hovedlys · Softbox',
        placement: { azimuthDeg: 60.3, elevationDeg: 25.2, distance: 4.46 },
        stops: 0, cct: 5600, beamDeg: 60, exponent: 2, bias: 0.00004, normalBias: 0.003,
      },
      {
        fixture: 'aputure-300d', name: 'Utfylling · Softbox',
        placement: { azimuthDeg: -46.8, elevationDeg: 12.8, distance: 4.50 },
        // The classic portrait ratio, a little over one and a half stops.
        stops: Math.log2((520 / 19.86) / (178 / 20.24)), cct: 5600,
        beamDeg: 72, exponent: 1.5, bias: 0.00006, normalBias: 0.003,
      },
      {
        fixture: 'aputure-300d-strip', name: 'Kantlys · Stripbox',
        placement: { azimuthDeg: -144.5, elevationDeg: 30.2, distance: 4.97 },
        stops: -Math.log2((500 / 24.75) / (520 / 19.86)), cct: 5600,
        beamDeg: 36, exponent: 4,
      },
    ],
  },
  {
    id: 'studio-dramatisk',
    label: 'Studio · dramatisk',
    hint: 'Ett hardt lys fra siden og ingen utfylling. Halve ansiktet i skygge.',
    group: 'studio',
    keyStops: -0.5,
    fixtures: [
      {
        fixture: 'aputure-spotlight-mini', name: 'Hovedlys · Fresnel',
        placement: { azimuthDeg: 69.4, elevationDeg: 15.5, distance: 3.55 },
        stops: 0, cct: 5200, beamDeg: 28, exponent: 6, bias: 0.00004, normalBias: 0.003,
      },
      {
        fixture: 'aputure-300d-strip', name: 'Kantlys · bakfra',
        placement: { azimuthDeg: -143.7, elevationDeg: 27.1, distance: 4.18 },
        stops: 1.5, cct: 6000, beamDeg: 34, exponent: 4,
      },
    ],
  },
  {
    id: 'stue-kveld',
    label: 'Stue · kveld',
    hint: 'Varm lampe i hjørnet, litt kaldt lys fra TV-en. Sånn en stue ser ut etter mørkets frembrudd.',
    group: 'rom',
    keyStops: -2,
    fixtures: [
      {
        fixture: 'amaran-200x', name: 'Stålampe · motivert',
        placement: { azimuthDeg: 56.3, elevationDeg: 12.7, distance: 2.96 },
        stops: 0, cct: 2800, beamDeg: 66, exponent: 1.5, bias: 0.00006, normalBias: 0.003,
      },
      {
        fixture: 'practical-floor-lamp', name: 'Stålampe · synlig',
        position: { x: 2.7, y: 1.4, z: -1.9 }, aim: { x: 1.4, y: 0.9, z: -1.1 },
        stops: 3, cct: 2700, motivating: true,
      },
      {
        // A television's own output is a glow, not a light: playing it with a
        // small panel is what a gaffer does, and what keeps the source out of
        // the actor's lap.
        fixture: 'nanlite-mixpad-mix27c', name: 'TV · kald utfylling',
        placement: { azimuthDeg: -40.8, elevationDeg: -2.0, distance: 2.91 },
        stops: 2.5, cct: 6500, beamDeg: 120, exponent: 1,
      },
      {
        fixture: 'practical-pendant-warm', name: 'Takpendel · dempet',
        anchor: 'pendant',
        position: { x: 0, y: 2.6, z: 0.4 }, aim: { x: 0, y: 1, z: 0 },
        stops: 2, cct: 2400, motivating: true,
      },
    ],
  },
  {
    id: 'kjokken-morgen',
    label: 'Kjøkken · morgen',
    hint: 'Dagslys inn fra vinduet og kaldt lys i taket. Lyst og hverdagslig.',
    group: 'rom',
    keyStops: 0.5,
    fixtures: [
      {
        fixture: 'aputure-600d', name: 'Vindu · dagslys',
        placement: { azimuthDeg: 81.9, elevationDeg: 14.5, distance: 4.38 },
        stops: 0, cct: 5800, beamDeg: 80, exponent: 1.2, bias: 0.00005, normalBias: 0.003,
      },
      {
        fixture: 'window-daylight-emitter', name: 'Vindusflate · synlig',
        anchor: 'window',
        position: { x: 3.6, y: 1.8, z: 1.4 }, aim: { x: 1.2, y: 1.3, z: 0.4 },
        stops: 2.5, cct: 5600, motivating: true,
      },
      {
        fixture: 'practical-pendant-cool', name: 'Taklys · kjøkken',
        anchor: 'pendant',
        position: { x: 0, y: 2.7, z: 0 }, aim: { x: 0, y: 1, z: 0 },
        stops: 1.5, cct: 4000, motivating: true,
      },
      {
        fixture: 'litepanels-astra-3x', name: 'Bounce · skyggeside',
        placement: { azimuthDeg: -65.0, elevationDeg: 10.3, distance: 3.36 },
        stops: 2, cct: 5600, beamDeg: 115, exponent: 1,
      },
    ],
  },
  {
    id: 'kjokken-middag',
    label: 'Kjøkken · middag',
    hint: 'Varm pendel over bordet og kveldssol i vinduet. Passer matlaging og samtale rundt bordet.',
    group: 'rom',
    keyStops: -1,
    fixtures: [
      {
        fixture: 'godox-ml60ii', name: 'Over bordet · motivert',
        placement: { azimuthDeg: 34.0, elevationDeg: 55.0, distance: 1.70 },
        stops: 0, cct: 3000, beamDeg: 60, exponent: 2, bias: 0.00005, normalBias: 0.003,
      },
      {
        fixture: 'practical-pendant-warm', name: 'Pendel · synlig',
        anchor: 'pendant',
        position: { x: 0, y: 2.3, z: 0 }, aim: { x: 0, y: 1.1, z: 0 },
        stops: 2, cct: 2400, motivating: true,
      },
      {
        // The sun through the window does real work here, so a real head
        // plays it; the window itself is a surface, not a lamp.
        fixture: 'aputure-300d', name: 'Kveldssol · bakfra',
        placement: { azimuthDeg: -127.4, elevationDeg: 8.0, distance: 4.32 },
        stops: 1, cct: 3200, beamDeg: 45, exponent: 3,
      },
      {
        fixture: 'candle-light', name: 'Stearinlys · på bordet',
        anchor: 'candle',
        position: { x: 0.5, y: 0.95, z: -0.5 }, aim: { x: 0, y: 1.2, z: 0 },
        stops: 3.5, cct: 1900, motivating: true,
      },
    ],
  },
  {
    id: 'pizzeria-kveld',
    label: 'Pizzeria · kveld',
    hint: 'Varmt lys fra vedovnen, lave pendler over bordene og stearinlys. Lavt og gyllent.',
    group: 'rom',
    keyStops: -1.5,
    fixtures: [
      {
        // Motivated by the oven mouth: low, warm and coming from one side.
        fixture: 'aputure-300d', name: 'Ovnen · motivert',
        placement: { azimuthDeg: 121.6, elevationDeg: -0.9, distance: 3.05 },
        stops: 0, cct: 2400, beamDeg: 70, exponent: 1.6, bias: 0.00005, normalBias: 0.003,
      },
      {
        fixture: 'amaran-100x', name: 'Utfylling · varm',
        placement: { azimuthDeg: -61.7, elevationDeg: 13.3, distance: 3.03 },
        stops: 2, cct: 2900, beamDeg: 70, exponent: 1.4,
      },
      {
        fixture: 'aputure-300d-strip', name: 'Kantlys · bakfra',
        placement: { azimuthDeg: -146.3, elevationDeg: 22.6, distance: 3.12 },
        stops: 1.5, cct: 3000, beamDeg: 40, exponent: 3.5,
      },
      {
        fixture: 'practical-pendant-warm', name: 'Pendel · over bordet',
        anchor: 'pendant',
        position: { x: -0.3, y: 1.8, z: 0.4 }, aim: { x: 0, y: 1.1, z: 0 },
        stops: 2, cct: 2400, motivating: true,
      },
      {
        fixture: 'candle-light', name: 'Stearinlys · på bordet',
        anchor: 'candle',
        position: { x: -0.1, y: 0.95, z: 0.4 }, aim: { x: 0, y: 1.2, z: 0 },
        stops: 3.5, cct: 1900, motivating: true,
      },
    ],
  },
  {
    id: 'kontor',
    label: 'Kontor',
    hint: 'Lysstoffrør i taket, dagslys fra siden, lampe på pulten. Jevnt og nøkternt.',
    group: 'rom',
    keyStops: -0.5,
    fixtures: [
      {
        fixture: 'arri-skypanel-s60', name: 'Taklys · mykt',
        placement: { azimuthDeg: 29.7, elevationDeg: 46.5, distance: 2.34 },
        stops: 0, cct: 4300, beamDeg: 100, exponent: 1.1, bias: 0.00006, normalBias: 0.003,
      },
      {
        fixture: 'overhead-tube-fluorescent', name: 'Lysstoffrør · synlig',
        anchor: 'ceiling',
        position: { x: -1.2, y: 2.8, z: 0.8 }, aim: { x: 0, y: 1, z: 0 },
        stops: 1.5, cct: 4100, motivating: true,
      },
      {
        fixture: 'amaran-100x', name: 'Vindu · sidelys',
        placement: { azimuthDeg: 99.0, elevationDeg: 8.1, distance: 3.89 },
        stops: 1, cct: 5600, beamDeg: 70, exponent: 1.4,
      },
      {
        fixture: 'practical-desk-lamp', name: 'Skrivebordslampe',
        position: { x: 1.1, y: 1.1, z: -1 }, aim: { x: 0.3, y: 0.8, z: -0.4 },
        stops: 3, cct: 2900, motivating: true,
      },
    ],
  },
  {
    id: 'sykehus',
    label: 'Sykehus',
    hint: 'Flatt, kaldt og skyggefattig, slik et behandlingsrom faktisk er. Laget for opplæringsvideo.',
    group: 'rom',
    keyStops: 0.5,
    fixtures: [
      {
        fixture: 'arri-skypanel-s120', name: 'Taklys · flatt',
        placement: { azimuthDeg: 28.0, elevationDeg: 52.0, distance: 2.55 },
        stops: 0, cct: 4600, beamDeg: 110, exponent: 1, bias: 0.00006, normalBias: 0.003,
      },
      {
        fixture: 'litepanels-gemini-2x1', name: 'Sidelys · utfylling',
        placement: { azimuthDeg: -68.2, elevationDeg: 16.4, distance: 3.37 },
        // Barely a ratio at all: clinical light has almost no modelling.
        stops: 0.7, cct: 4600, beamDeg: 110, exponent: 1,
      },
      {
        fixture: 'overhead-tube-fluorescent', name: 'Lysstoffrør · synlig',
        anchor: 'ceiling',
        position: { x: 1.6, y: 2.9, z: 1.2 }, aim: { x: 0, y: 1, z: 0 },
        stops: 1.5, cct: 4100, motivating: true,
      },
    ],
  },
  {
    id: 'gate-natt',
    label: 'Gate · natt',
    hint: 'Byens gløs bakfra, neon fra siden, kaldt månelys. Våt asfalt-stemning.',
    group: 'ute',
    keyStops: -2.5,
    fixtures: [
      {
        fixture: 'aputure-300d', name: 'Gatelykt · motivert',
        placement: { azimuthDeg: 124.7, elevationDeg: 41.5, distance: 4.22 },
        stops: 0, cct: 2600, beamDeg: 50, exponent: 3, bias: 0.00004, normalBias: 0.003,
      },
      {
        fixture: 'neon-strip-rgb', name: 'Neon · sidelys',
        position: { x: -2.4, y: 1.7, z: -0.6 }, aim: { x: 0, y: 1.3, z: 0 },
        stops: 1.5, cct: 5000, motivating: true,
      },
      {
        fixture: 'arri-m18', name: 'Månelys · kant',
        placement: { azimuthDeg: -136.7, elevationDeg: 36.9, distance: 5.84 },
        stops: 1, cct: 6500, beamDeg: 44, exponent: 3,
      },
      {
        fixture: 'city-glow-ambient', name: 'Byens gløs',
        position: { x: 0, y: 3.4, z: 4.5 }, aim: { x: 0, y: 1.2, z: 0 },
        stops: 2.5, cct: 3800, motivating: true,
      },
    ],
  },
  {
    id: 'gyllen-time',
    label: 'Ute · gyllen time',
    hint: 'Lav sol bakfra og myk himmel som utfylling. Den siste timen før solnedgang.',
    group: 'ute',
    keyStops: 0,
    fixtures: [
      {
        fixture: 'arri-m18', name: 'Sol · lav og bakfra',
        placement: { azimuthDeg: -131.6, elevationDeg: 8.9, distance: 4.87 },
        stops: 0, cct: 3100, beamDeg: 30, exponent: 5, bias: 0.00004, normalBias: 0.003,
      },
      {
        fixture: 'arri-skypanel-s60', name: 'Himmel · utfylling',
        placement: { azimuthDeg: 42.7, elevationDeg: 20.2, distance: 3.77 },
        stops: 2, cct: 6000, beamDeg: 100, exponent: 1,
      },
      {
        fixture: 'window-golden-hour', name: 'Varm gløs · forgrunn',
        position: { x: -2, y: 1.2, z: 1.6 }, aim: { x: 0, y: 1, z: 0 },
        stops: 3, cct: 3200, motivating: true,
      },
    ],
  },
  {
    id: 'skrekk',
    label: 'Skrekk',
    hint: 'Ett hardt lys nedenfra, kaldt månelys bak, og ellers mørkt.',
    group: 'stemning',
    keyStops: -2,
    fixtures: [
      {
        fixture: 'dedolight-150', name: 'Underlys · hardt',
        placement: { azimuthDeg: 32.0, elevationDeg: -34.9, distance: 1.75 },
        stops: 0, cct: 4200, beamDeg: 22, exponent: 7, bias: 0.00003, normalBias: 0.002,
      },
      {
        fixture: 'arri-m18', name: 'Månelys · kant',
        placement: { azimuthDeg: -138.8, elevationDeg: 25.7, distance: 4.72 },
        stops: 0.5, cct: 6800, beamDeg: 40, exponent: 3,
      },
      {
        fixture: 'eldritch-glow', name: 'Gulv · sykelig gløs',
        position: { x: 1.8, y: 0.3, z: 1.6 }, aim: { x: 0, y: 0.8, z: 0 },
        stops: 3, cct: 4000, motivating: true,
      },
    ],
  },
  {
    id: 'action-natt',
    label: 'Action · natt',
    hint: 'Kald motlys-kant og varme praktiske lys. Bilscener og nattlige jakter.',
    group: 'stemning',
    keyStops: -1.5,
    fixtures: [
      {
        fixture: 'arri-m40', name: 'Motlys · kaldt',
        placement: { azimuthDeg: -144.2, elevationDeg: 20.9, distance: 4.75 },
        stops: 0, cct: 7000, beamDeg: 40, exponent: 4, bias: 0.00004, normalBias: 0.003,
      },
      {
        fixture: 'aputure-300d', name: 'Frontlys · varmt',
        placement: { azimuthDeg: 49.4, elevationDeg: 2.3, distance: 3.69 },
        stops: 1.5, cct: 2800, beamDeg: 55, exponent: 2, bias: 0.00005, normalBias: 0.003,
      },
      {
        fixture: 'neon-strip-rgb', name: 'Skilt · sidelys',
        position: { x: 2.2, y: 2, z: 2.2 }, aim: { x: 0, y: 1.3, z: 0 },
        stops: 2.5, cct: 5000, motivating: true,
      },
      {
        fixture: 'city-glow-ambient', name: 'Byens gløs',
        position: { x: 0, y: 3, z: -4.2 }, aim: { x: 0, y: 1.2, z: 0 },
        stops: 3, cct: 3800, motivating: true,
      },
    ],
  },
];

/** The look the studio starts in. */
export const DEFAULT_LOOK_ID = 'studio-portrett';

export function lookById(id: string): LightingLook | undefined {
  return LIGHTING_LOOKS.find(look => look.id === id);
}

/** Every fixture a look asks for exists in the catalogue. */
export function unknownFixtures(look: LightingLook): string[] {
  return look.fixtures.filter(f => !getLightById(f.fixture)).map(f => f.fixture);
}
