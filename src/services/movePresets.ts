import {
  AnimationCue,
  AnimationTrack,
  Vec3Value,
} from './sceneAnimation';

/**
 * Named moves, in the words a film crew already uses.
 *
 * Nobody should have to write keyframes to push the camera in or make a bulb
 * fail. A move is chosen by name — "dolly inn", "lyset svikter" — and becomes
 * an ordinary cue: the same tracks, on the same timeline, editable afterwards
 * by anyone who wants to. The simple way in and the detailed one are the same
 * thing underneath, so nothing has to be rebuilt to go from one to the other.
 *
 * Every preset is pure: it reads where things are now and returns a cue. That
 * makes the whole vocabulary testable without a scene.
 */

export interface CameraPose {
  position: Vec3Value;
  /** What the camera is pointed at. */
  target: Vec3Value;
}

export interface MoveRequest {
  /** Where the cue sits on the scene's clock, in seconds. */
  start: number;
  /** How long the move takes, in seconds. */
  duration: number;
  /** Distinguishes this cue from others of the same kind. */
  id: string;
}

export interface CameraMoveContext extends MoveRequest {
  camera: CameraPose;
  /** The id a track uses to address the camera. */
  cameraNodeId: string;
}

export interface LightMoveContext extends MoveRequest {
  lightNodeId: string;
  /** The fixture's output now, as a fraction of its own full power. */
  intensity: number;
  /** Its colour now, red green blue, each 0 to 1. */
  color: Vec3Value;
}

const add = (a: Vec3Value, b: Vec3Value): Vec3Value => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const subtract = (a: Vec3Value, b: Vec3Value): Vec3Value => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3Value, k: number): Vec3Value => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const length = (a: Vec3Value): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);

function unit(a: Vec3Value, fallback: Vec3Value = { x: 0, y: 0, z: 1 }): Vec3Value {
  const len = length(a);
  return len > 1e-9 ? scale(a, 1 / len) : { ...fallback };
}

/** Rotate about the vertical axis, which is what a pan or an orbit does. */
function turnY(point: Vec3Value, about: Vec3Value, angle: number): Vec3Value {
  const offset = subtract(point, about);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return add(about, {
    x: offset.x * cos + offset.z * sin,
    y: offset.y,
    z: -offset.x * sin + offset.z * cos,
  });
}

function track(id: string, nodeId: string, type: AnimationTrack['type'], frames: [number, Vec3Value][]): AnimationTrack {
  return { id, nodeId, type, keyframes: frames.map(([time, value]) => ({ time, value })) };
}

function cue(request: MoveRequest, name: string, tracks: AnimationTrack[]): AnimationCue {
  return { id: request.id, name, start: request.start, enabled: true, tracks };
}

export type MoveKind = 'camera' | 'light';

export interface MoveDescription {
  id: string;
  /** What the button says. */
  label: string;
  /** What it looks like, for someone who does not know the word. */
  hint: string;
  kind: MoveKind;
}

/**
 * The camera moves, in the vocabulary a crew uses.
 *
 * A dolly changes the distance to the subject; a truck slides the whole camera
 * sideways; a pedestal raises it; a pan and a tilt turn it on the spot. Keeping
 * the real names means the advanced view and the simple one talk about the same
 * thing.
 */
export const CAMERA_MOVES: MoveDescription[] = [
  { id: 'dolly-in', label: 'Dolly inn', hint: 'Kameraet nærmer seg motivet', kind: 'camera' },
  { id: 'dolly-out', label: 'Dolly ut', hint: 'Kameraet trekker seg unna', kind: 'camera' },
  { id: 'truck-left', label: 'Truck venstre', hint: 'Hele kameraet glir sidelengs', kind: 'camera' },
  { id: 'truck-right', label: 'Truck høyre', hint: 'Hele kameraet glir sidelengs', kind: 'camera' },
  { id: 'pedestal-up', label: 'Pedestal opp', hint: 'Kameraet heves rett opp', kind: 'camera' },
  { id: 'pedestal-down', label: 'Pedestal ned', hint: 'Kameraet senkes rett ned', kind: 'camera' },
  { id: 'pan-left', label: 'Panorer venstre', hint: 'Kameraet står, blikket dreier', kind: 'camera' },
  { id: 'pan-right', label: 'Panorer høyre', hint: 'Kameraet står, blikket dreier', kind: 'camera' },
  { id: 'tilt-up', label: 'Tilt opp', hint: 'Blikket løftes', kind: 'camera' },
  { id: 'tilt-down', label: 'Tilt ned', hint: 'Blikket senkes', kind: 'camera' },
  { id: 'orbit-left', label: 'Sirkle venstre', hint: 'Kameraet går i bue rundt motivet', kind: 'camera' },
  { id: 'orbit-right', label: 'Sirkle høyre', hint: 'Kameraet går i bue rundt motivet', kind: 'camera' },
];

export const LIGHT_MOVES: MoveDescription[] = [
  { id: 'fade-up', label: 'Tenn opp', hint: 'Lyset kommer rolig opp', kind: 'light' },
  { id: 'fade-down', label: 'Dimme ned', hint: 'Lyset går rolig ut', kind: 'light' },
  { id: 'flicker', label: 'Flimre', hint: 'Et rør som holder på å ryke', kind: 'light' },
  { id: 'failing', label: 'Svikte', hint: 'Blinker uroligere og dør', kind: 'light' },
  { id: 'pulse', label: 'Pulsere', hint: 'Jevn puls, som en alarm', kind: 'light' },
  { id: 'lightning', label: 'Lyn', hint: 'To harde glimt', kind: 'light' },
  { id: 'to-warm', label: 'Mot varmt', hint: 'Fargen går mot ildskjær', kind: 'light' },
  { id: 'to-cold', label: 'Mot kaldt', hint: 'Fargen går mot måneskinn', kind: 'light' },
];

export const ALL_MOVES: MoveDescription[] = [...CAMERA_MOVES, ...LIGHT_MOVES];

/** How far a dolly, truck or pedestal travels, as a share of the shot distance. */
const TRAVEL = 0.35;
/** How far a pan, tilt or orbit turns. */
const TURN = Math.PI / 6;

/**
 * Build a camera move.
 *
 * Distances are relative to how far the camera stands from its subject, so the
 * same button reads the same on a tight portrait and across a hangar.
 */
export function buildCameraMove(move: string, context: CameraMoveContext): AnimationCue | null {
  const { camera, cameraNodeId: node, duration } = context;
  const toTarget = subtract(camera.target, camera.position);
  const distance = Math.max(0.2, length(toTarget));
  const forward = unit(toTarget);
  const right = unit({ x: forward.z, y: 0, z: -forward.x }, { x: 1, y: 0, z: 0 });
  const travel = distance * TRAVEL;

  const positionTo = (end: Vec3Value) =>
    [track(`${context.id}-position`, node, 'position', [[0, camera.position], [duration, end]])];
  const targetTo = (end: Vec3Value) =>
    [track(`${context.id}-target`, node, 'target', [[0, camera.target], [duration, end]])];

  switch (move) {
    case 'dolly-in':
      // Stop short of the subject: arriving on top of it is never the shot.
      return cue(context, 'Dolly inn', positionTo(add(camera.position, scale(forward, Math.min(travel, distance * 0.8)))));
    case 'dolly-out':
      return cue(context, 'Dolly ut', positionTo(subtract(camera.position, scale(forward, travel))));
    case 'truck-left':
      return cue(context, 'Truck venstre', [
        ...positionTo(subtract(camera.position, scale(right, travel))),
        // The subject stays framed: a truck slides, it does not swing away.
        ...targetTo(subtract(camera.target, scale(right, travel))),
      ]);
    case 'truck-right':
      return cue(context, 'Truck høyre', [
        ...positionTo(add(camera.position, scale(right, travel))),
        ...targetTo(add(camera.target, scale(right, travel))),
      ]);
    case 'pedestal-up':
      return cue(context, 'Pedestal opp', [
        ...positionTo(add(camera.position, { x: 0, y: travel, z: 0 })),
        ...targetTo(add(camera.target, { x: 0, y: travel, z: 0 })),
      ]);
    case 'pedestal-down':
      return cue(context, 'Pedestal ned', [
        ...positionTo(add(camera.position, { x: 0, y: -travel, z: 0 })),
        ...targetTo(add(camera.target, { x: 0, y: -travel, z: 0 })),
      ]);
    case 'pan-left':
      return cue(context, 'Panorer venstre', targetTo(turnY(camera.target, camera.position, TURN)));
    case 'pan-right':
      return cue(context, 'Panorer høyre', targetTo(turnY(camera.target, camera.position, -TURN)));
    case 'tilt-up':
      return cue(context, 'Tilt opp', targetTo(add(camera.target, { x: 0, y: distance * 0.25, z: 0 })));
    case 'tilt-down':
      return cue(context, 'Tilt ned', targetTo(add(camera.target, { x: 0, y: -distance * 0.25, z: 0 })));
    case 'orbit-left':
      // The camera travels, the subject does not: an arc keeps it framed.
      return cue(context, 'Sirkle venstre', positionTo(turnY(camera.position, camera.target, TURN)));
    case 'orbit-right':
      return cue(context, 'Sirkle høyre', positionTo(turnY(camera.position, camera.target, -TURN)));
    default:
      return null;
  }
}

const level = (value: number): Vec3Value => ({ x: Math.max(0, value), y: 0, z: 0 });

/** A repeating on-off pattern, used by flicker, pulse and failing. */
function pattern(
  id: string,
  node: string,
  duration: number,
  steps: number,
  valueAt: (step: number, fraction: number) => number,
): AnimationTrack {
  const frames: [number, Vec3Value][] = [];
  for (let step = 0; step <= steps; step++) {
    const fraction = step / steps;
    frames.push([duration * fraction, level(valueAt(step, fraction))]);
  }
  return track(id, node, 'intensity', frames);
}

/** Build a light move against what the fixture is doing now. */
export function buildLightMove(move: string, context: LightMoveContext): AnimationCue | null {
  const { lightNodeId: node, duration, intensity, color } = context;
  const id = `${context.id}-intensity`;
  const full = Math.max(intensity, 0.05);

  switch (move) {
    case 'fade-up':
      return cue(context, 'Tenn opp', [track(id, node, 'intensity', [[0, level(0)], [duration, level(full)]])]);
    case 'fade-down':
      return cue(context, 'Dimme ned', [track(id, node, 'intensity', [[0, level(full)], [duration, level(0)]])]);
    case 'flicker':
      // Unsteady but alive: never fully out, and never twice the same.
      return cue(context, 'Flimre', [pattern(id, node, duration, 24, step =>
        full * (step % 3 === 0 ? 0.35 : step % 4 === 0 ? 0.85 : 1))]);
    case 'failing':
      // Gets worse as it goes, and ends dark.
      return cue(context, 'Svikte', [pattern(id, node, duration, 28, (step, fraction) =>
        step % 2 === 0 ? full * (1 - fraction) : full * (1 - fraction) * 0.15)]);
    case 'pulse':
      return cue(context, 'Pulsere', [pattern(id, node, duration, 16, (_step, fraction) =>
        full * (0.5 + 0.5 * Math.cos(fraction * Math.PI * 8)))]);
    case 'lightning':
      // Two hard strikes against darkness, the second the harder.
      return cue(context, 'Lyn', [track(id, node, 'intensity', [
        [0, level(0)],
        [duration * 0.08, level(full * 3)],
        [duration * 0.16, level(0)],
        [duration * 0.52, level(0)],
        [duration * 0.58, level(full * 4)],
        [duration * 0.62, level(full * 0.6)],
        [duration * 0.70, level(full * 3)],
        [duration * 0.80, level(0)],
        [duration, level(0)],
      ])]);
    case 'to-warm':
      return cue(context, 'Mot varmt', [track(`${context.id}-color`, node, 'color', [
        [0, color], [duration, { x: 1, y: 0.62, z: 0.28 }],
      ])]);
    case 'to-cold':
      return cue(context, 'Mot kaldt', [track(`${context.id}-color`, node, 'color', [
        [0, color], [duration, { x: 0.62, y: 0.76, z: 1 }],
      ])]);
    default:
      return null;
  }
}
