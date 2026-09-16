/**
 * The place the scene is in.
 *
 * A look could already light a subject the way a kitchen lights one, but there
 * was no kitchen: the frame behind the figure stayed an industrial studio. For
 * a training video that is the difference between a scene and a lighting test.
 *
 * A location pairs geometry with the lighting that belongs to it, so one
 * button gives both. Neither half is locked afterwards — the room is ordinary
 * scene geometry and the look leaves ordinary fixtures on stands, so anyone
 * who wants to relight the kitchen at night simply picks another look.
 */

import type { StudioRoomType } from '../core/rendering/StudioRoom';
import { lookById } from './lightingLooks';

export interface StudioLocation {
  id: string;
  /** The place, as someone would ask for it. */
  label: string;
  /** Plain explanation, for a button that has to explain itself. */
  hint: string;
  /** Which room the studio builds. */
  room: StudioRoomType;
  furnishings: boolean;
  practicals: boolean;
  /** The look it is lit with on arrival. */
  look: string;
  /**
   * The room's inside, in metres from the origin, or absent for open ground.
   *
   * A look is written for a studio with room to back a light into. In a 5.4 m
   * kitchen the same key stands through the wall, so a place that has walls
   * says where they are and the rig is walked in until it is inside them.
   */
  bounds?: { halfWidth: number; halfDepth: number; height: number };
}

export const STUDIO_LOCATIONS: StudioLocation[] = [
  {
    id: 'studio',
    label: 'Studio',
    hint: 'Industristudioet på 16 × 17 m, med syklorama, møbler og romlys.',
    room: 'industrial',
    furnishings: true,
    practicals: true,
    look: 'studio-portrett',
  },
  {
    id: 'kjokken',
    label: 'Kjøkken',
    hint: 'Kjøkken på 5,4 × 4,6 m med benk, vindu og spisebord. Dagslys fra venstre.',
    room: 'kitchen',
    furnishings: true,
    practicals: true,
    look: 'kjokken-morgen',
    bounds: { halfWidth: 2.7, halfDepth: 2.3, height: 2.5 },
  },
  {
    id: 'sykehusrom',
    label: 'Sykehusrom',
    hint: 'Behandlingsrom på 5 × 5 m med seng, dryppstativ og skjerm. Flatt taklys.',
    room: 'hospital',
    furnishings: true,
    practicals: true,
    look: 'sykehus',
    bounds: { halfWidth: 2.5, halfDepth: 2.5, height: 2.7 },
  },
  {
    id: 'pizzeria',
    label: 'Pizzeria',
    hint: 'Restaurant på 7 × 6 m med vedovn som brenner, marmordisk og bord under pendler.',
    room: 'pizzeria',
    furnishings: true,
    practicals: true,
    look: 'pizzeria-kveld',
    bounds: { halfWidth: 3.5, halfDepth: 3, height: 3 },
  },
  {
    id: 'tomt',
    label: 'Åpent område',
    hint: 'Ingen vegger. Bare gulvet og lyset, for å bedømme en figur uten omgivelser.',
    room: 'none',
    furnishings: false,
    practicals: false,
    look: 'studio-portrett',
  },
];

/** Where the studio opens. */
export const DEFAULT_LOCATION_ID = 'studio';

export function locationById(id: string): StudioLocation | undefined {
  return STUDIO_LOCATIONS.find(location => location.id === id);
}

/** The location whose room this state is showing, if any names it. */
export function locationForRoom(room: StudioRoomType): StudioLocation | undefined {
  return STUDIO_LOCATIONS.find(location => location.room === room);
}

/**
 * A stand position walked in until it is inside the room.
 *
 * The direction from the aim point is kept, so the modelling and the shadow
 * angle a look was written for survive; only the distance changes. A margin
 * keeps the stand off the wall rather than embedded in it.
 */
export function insideRoom(
  position: { x: number; y: number; z: number },
  aim: { x: number; y: number; z: number },
  bounds: { halfWidth: number; halfDepth: number; height: number },
  margin = 0.35,
): { x: number; y: number; z: number } {
  const limitX = Math.max(0.2, bounds.halfWidth - margin);
  const limitZ = Math.max(0.2, bounds.halfDepth - margin);
  const limitY = Math.max(0.4, bounds.height - margin);

  const dx = position.x - aim.x, dy = position.y - aim.y, dz = position.z - aim.z;
  // How far along the line from the aim point the first wall is met. The aim
  // point is inside the room by construction, so every ratio is positive.
  let scale = 1;
  if (Math.abs(position.x) > limitX && dx !== 0) {
    scale = Math.min(scale, (Math.sign(dx) * limitX - aim.x) / dx);
  }
  if (Math.abs(position.z) > limitZ && dz !== 0) {
    scale = Math.min(scale, (Math.sign(dz) * limitZ - aim.z) / dz);
  }
  if (position.y > limitY && dy !== 0) {
    scale = Math.min(scale, (limitY - aim.y) / dy);
  }
  scale = Math.max(0, Math.min(1, scale));

  return {
    x: aim.x + dx * scale,
    y: Math.max(0.15, aim.y + dy * scale),
    z: aim.z + dz * scale,
  };
}

/** A location asking for a look that does not exist would arrive unlit. */
export function unknownLooks(): string[] {
  return STUDIO_LOCATIONS.filter(location => !lookById(location.look)).map(location => location.look);
}
