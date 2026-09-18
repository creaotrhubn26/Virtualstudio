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

/**
 * A place a person naturally stands in this room.
 *
 * Dragging a figure around with the keyboard and hoping is not how anybody
 * decides where someone should stand: in a kitchen you stand at the counter,
 * at the table, or by the window, and that is the whole list. A mark is that
 * list, written by the room that built the counter.
 *
 * It is also what makes WASD something you can avoid rather than something you
 * have to master.
 */
export interface StudioMark {
  id: string;
  /** Where to stand, as someone would say it. */
  label: string;
  /** Plain explanation of what the shot is from there. */
  hint: string;
  x: number;
  z: number;
  /**
   * Which way the person faces, in degrees.
   *
   * Zero faces the camera's usual place at negative z, and it turns the way a
   * compass does, so 90 faces along positive x.
   */
  facingDeg: number;
  /**
   * Another mark to turn towards, instead of a compass bearing.
   *
   * People in a room are not oriented to north; they are oriented to each
   * other. A waiter faces the table they are serving, two guests face each
   * other, the person at the pass faces whoever comes in. Without this a
   * staffed room is a set of individuals who happen to be standing near one
   * another, which is exactly how it looked.
   *
   * `facingDeg` stays as the fallback for when the other mark is empty.
   */
  facesMark?: string;
  /**
   * How far the head and shoulders turn from the body, in degrees.
   *
   * A person in conversation does not square up to whoever they are talking
   * to; a few degrees of offset is the difference between talking and
   * confronting.
   */
  turnDeg?: number;
  /** Sitting there rather than standing, for a chair or a bed. */
  seated?: boolean;
  /**
   * How high the seat at this mark is, in metres.
   *
   * The studio makes a portrait stool for a seated figure and raises it to
   * meet the body. A restaurant already has chairs, at their own height, and
   * putting a stool on top of one is not sitting down: when a mark names the
   * seat, the body comes down to the chair the room already built.
   */
  seatHeight?: number;
  /**
   * What the person at this mark is doing there.
   *
   * A mark said where somebody stands; it said nothing about who they are, so
   * a staffed restaurant came out as four identical people in identical
   * clothes waiting for instructions. A role is the other half: the baker at
   * the oven wears work clothes, the person at the pass is front of house, the
   * one at the table is a guest.
   */
  role?: StudioRole;
}

export type StudioRole = 'arbeid' | 'vert' | 'gjest' | 'fag';

/**
 * What a role wears, chosen from whatever the body's wardrobe actually has.
 *
 * The keywords match garment ids in the catalogue rather than naming files,
 * so a body with a different set of clothes still dresses as close to the role
 * as it can instead of arriving undressed.
 */
export const ROLE_WARDROBE: Record<StudioRole, string[]> = {
  // Kitchen, oven, workshop: the work suit if the body has one.
  arbeid: ['worksuit', 'sportsuit', 'casualsuit'],
  // Front of house: the smartest thing in the wardrobe.
  vert: ['elegantsuit', 'casualsuit'],
  // Somebody who came to eat.
  gjest: ['casualsuit', 'sportsuit'],
  // Clinical: plain and light.
  fag: ['sportsuit', 'casualsuit', 'elegantsuit'],
};

/**
 * Which way somebody at `mark` should be facing, in radians.
 *
 * Turning towards another mark when there is one, and to the mark's own
 * bearing when there is not — so a room with one person in it still faces
 * sensibly, and a room with a crew faces each other.
 */
export function facingFor(mark: StudioMark, marks: StudioMark[]): number {
  const towards = mark.facesMark ? marks.find(other => other.id === mark.facesMark) : undefined;
  const turn = ((mark.turnDeg ?? 0) * Math.PI) / 180;
  if (!towards) return (mark.facingDeg * Math.PI) / 180 + turn;

  // Zero faces the camera's usual place at negative z and turns like a
  // compass, so the bearing to the other person is measured the same way.
  const bearing = Math.atan2(towards.x - mark.x, -(towards.z - mark.z));
  return bearing + turn;
}

/** The garment a body owns that comes closest to a role. */
export function garmentForRole(role: StudioRole, available: string[]): string | undefined {
  for (const keyword of ROLE_WARDROBE[role]) {
    const match = available.find(id => id.includes(keyword));
    if (match) return match;
  }
  return available[0];
}

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
  /** Where a person stands in this room, if it has anywhere in particular. */
  marks?: StudioMark[];
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
    marks: [
      { id: 'benken', label: 'Ved benken', hint: 'Står og jobber ved kjøkkenbenken, med overskapene bak.', x: -0.3, z: 1.2, facingDeg: 180 , role: 'arbeid' },
      { id: 'bordet', label: 'Ved bordet', hint: 'Står ved enden av spisebordet, vendt mot kameraet.', x: 0, z: 0.15, facingDeg: 0 , role: 'gjest' },
      { id: 'sitter', label: 'Sitter ved bordet', hint: 'Sitter på stolen nærmest kameraet, vendt mot bordet.', x: -0.55, z: -1.5, facingDeg: 180, seated: true , role: 'gjest' , facesMark: 'bordet', turnDeg: 7 , seatHeight: 0.475 },
      { id: 'vinduet', label: 'Ved vinduet', hint: 'Står i dagslyset fra vinduet, halvprofil mot kameraet.', x: -1.7, z: 0.2, facingDeg: 70 , role: 'gjest' },
    ],
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
    marks: [
      { id: 'sengen', label: 'Ved sengen', hint: 'Står ved sengekanten, slik behandleren gjør.', x: 0.75, z: 0.5, facingDeg: 270 , role: 'fag' , facesMark: 'fotenden', turnDeg: 12 },
      { id: 'fotenden', label: 'Ved fotenden', hint: 'Står ved fotenden med hele sengen i bildet.', x: -0.1, z: -1.2, facingDeg: 0 , role: 'fag' , facesMark: 'sengen', turnDeg: -9 },
      { id: 'servanten', label: 'Ved servanten', hint: 'Står ved håndvasken — der en opplæringsvideo begynner.', x: 1.9, z: -1.3, facingDeg: 180 , role: 'fag' },
    ],
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
    marks: [
      { id: 'disken', label: 'Ved disken', hint: 'Står bak marmordisken med skiltet over.', x: -1.8, z: 1.4, facingDeg: 180 , role: 'vert' , facesMark: 'inngangen', turnDeg: 10 },
      { id: 'ovnen', label: 'Ved ovnen', hint: 'Står ved ovnsmunnen, med ilden på seg fra siden.', x: 1.15, z: 0.9, facingDeg: 225 , role: 'arbeid' },
      { id: 'bordet', label: 'Gjest ved bordet', hint: 'Sitter ved bordet under pendelen, med maten foran seg.', x: -0.3, z: -1.82, facingDeg: 0, seated: true, seatHeight: 0.485, role: 'gjest' , facesMark: 'gjest2', turnDeg: 6 },
      { id: 'gjest2', label: 'Gjest nummer to', hint: 'Sitter på motsatt side av samme bord, vendt mot den første.', x: -0.3, z: -0.38, facingDeg: 180, seated: true, seatHeight: 0.485, role: 'gjest' , facesMark: 'bordet', turnDeg: -5 },
      { id: 'servering', label: 'Servitør ved bordet', hint: 'Står ved bordet og setter fra seg pizzaen — bildet en meny trenger.', x: 0.52, z: -1.1, facingDeg: 270, role: 'vert' , facesMark: 'bordet', turnDeg: -8 },
      { id: 'inngangen', label: 'Ved inngangen', hint: 'Står fremme ved døra med hele lokalet bak.', x: 0.2, z: -2.2, facingDeg: 180 , role: 'gjest' , facesMark: 'disken', turnDeg: -7 },
    ],
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

/**
 * Where a fixture stands, said the way lighting is actually written down.
 *
 * A position in metres is a coordinate, not a lighting instruction: it belongs
 * to one room, one subject height and one camera angle, and it has to be
 * corrected the moment any of those change. An angle survives all three. "Key
 * 45 degrees camera left, 35 up, two and a half metres out" is the same
 * instruction in a studio and in a kitchen, on an adult and on a child, and it
 * can never land between the lens and the face because the angle says where it
 * is.
 */
export interface PolarPlacement {
  /**
   * Degrees around the subject from the camera axis. Positive is camera left
   * as the camera sees it; 0 is dead front, 180 is directly behind.
   */
  azimuthDeg: number;
  /** Degrees above the subject's eye line. Negative is from below. */
  elevationDeg: number;
  /** Metres from the subject. */
  distance: number;
}

export interface SubjectStand {
  /** Where the subject is on the floor. */
  x: number;
  z: number;
  /** The height the light is aimed at: the eye line. */
  eyeHeight: number;
}

/**
 * Resolve a placement against the subject and the camera.
 *
 * The camera's own bearing is what "camera left" is measured from, so turning
 * the camera around the subject carries the whole rig with it — which is what
 * a photographer means when they say the key is at 45 degrees.
 */
export function resolvePlacement(
  placement: PolarPlacement,
  subject: SubjectStand,
  camera: { x: number; z: number },
): { position: { x: number; y: number; z: number }; aim: { x: number; y: number; z: number } } {
  const cameraBearing = Math.atan2(camera.z - subject.z, camera.x - subject.x);
  const bearing = cameraBearing + (placement.azimuthDeg * Math.PI) / 180;
  const elevation = (placement.elevationDeg * Math.PI) / 180;

  const ground = Math.max(0.2, placement.distance) * Math.cos(elevation);
  const rise = Math.max(0.2, placement.distance) * Math.sin(elevation);

  return {
    position: {
      x: subject.x + Math.cos(bearing) * ground,
      y: Math.max(0.12, subject.eyeHeight + rise),
      z: subject.z + Math.sin(bearing) * ground,
    },
    aim: { x: subject.x, y: subject.eyeHeight, z: subject.z },
  };
}

/**
 * Swing a fixture out of the camera's line of sight to the subject.
 *
 * Walking a light in to fit a small room keeps its direction, and in a kitchen
 * that direction can put a metre-wide softbox between the lens and the face.
 * No gaffer has ever done that. The fixture is turned around the subject,
 * keeping its distance and its height, until it is clear of the shot by at
 * least `minAngleDeg`; it turns the shorter way, so a key stays on the side of
 * the face it was written for.
 */
export function clearOfCamera(
  position: { x: number; y: number; z: number },
  aim: { x: number; y: number; z: number },
  camera: { x: number; y: number; z: number },
  minAngleDeg = 25,
): { x: number; y: number; z: number } {
  const toLight = { x: position.x - aim.x, z: position.z - aim.z };
  const toCamera = { x: camera.x - aim.x, z: camera.z - aim.z };
  const lightLen = Math.hypot(toLight.x, toLight.z);
  const cameraLen = Math.hypot(toCamera.x, toCamera.z);
  // A light directly overhead has no direction to swing, and a camera on top
  // of the subject gives nothing to swing away from.
  if (lightLen < 1e-6 || cameraLen < 1e-6) return position;

  const lightAngle = Math.atan2(toLight.z, toLight.x);
  const cameraAngle = Math.atan2(toCamera.z, toCamera.x);
  let difference = lightAngle - cameraAngle;
  while (difference > Math.PI) difference -= 2 * Math.PI;
  while (difference < -Math.PI) difference += 2 * Math.PI;

  const minimum = (minAngleDeg * Math.PI) / 180;
  if (Math.abs(difference) >= minimum) return position;

  // Away from the camera axis, the way it was already leaning. A fixture dead
  // on the axis goes left, which is where a key usually lives.
  const away = difference === 0 ? 1 : Math.sign(difference);
  const turned = cameraAngle + away * minimum;
  return {
    x: aim.x + Math.cos(turned) * lightLen,
    y: position.y,
    z: aim.z + Math.sin(turned) * lightLen,
  };
}

/** A location asking for a look that does not exist would arrive unlit. */
export function unknownLooks(): string[] {
  return STUDIO_LOCATIONS.filter(location => !lookById(location.look)).map(location => location.look);
}
