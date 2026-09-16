import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  CAMERA_MOVES,
  CameraMoveContext,
  LIGHT_MOVES,
  LightMoveContext,
  buildCameraMove,
  buildLightMove,
} from './movePresets';
import { sampleAnimation, sequenceDuration } from './sceneAnimation';

/** A camera four metres back from a figure, at eye height. */
const camera: CameraMoveContext = {
  id: 'move-1',
  start: 0,
  duration: 3,
  cameraNodeId: 'takingCamera',
  camera: { position: { x: 0, y: 1.6, z: -4 }, target: { x: 0, y: 1.4, z: 0 } },
};

const light: LightMoveContext = {
  id: 'move-2',
  start: 2,
  duration: 4,
  lightNodeId: 'light_1',
  intensity: 1,
  color: { x: 1, y: 1, z: 1 },
};

/** Distance from the camera to what it is looking at, at a given moment. */
function shotDistance(cue: ReturnType<typeof buildCameraMove>, time: number) {
  const values = sampleAnimation({ tracks: [], cues: [cue!] }, time);
  const position = values.find(v => v.channel === 'position')?.value ?? camera.camera.position;
  const target = values.find(v => v.channel === 'target')?.value ?? camera.camera.target;
  return Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
}

describe('the vocabulary', () => {
  it('offers every move under a name and a plain explanation', () => {
    expect(CAMERA_MOVES.length).toBeGreaterThanOrEqual(10);
    expect(LIGHT_MOVES.length).toBeGreaterThanOrEqual(6);
    for (const move of ALL_MOVES) {
      // Someone who does not know the word still has to understand the button.
      expect(move.label.length).toBeGreaterThan(2);
      expect(move.hint.length).toBeGreaterThan(8);
      expect(['camera', 'light']).toContain(move.kind);
    }
    expect(new Set(ALL_MOVES.map(m => m.id)).size).toBe(ALL_MOVES.length);
  });

  it('builds a cue for every move it offers, and nothing for one it does not', () => {
    for (const move of CAMERA_MOVES) {
      const cue = buildCameraMove(move.id, camera);
      expect(cue, move.id).not.toBeNull();
      expect(cue!.tracks.length).toBeGreaterThan(0);
      expect(cue!.enabled).toBe(true);
      // A move is placed where the photographer asked for it.
      expect(cue!.start).toBe(camera.start);
      expect(cue!.tracks.every(t => t.nodeId === 'takingCamera')).toBe(true);
    }
    for (const move of LIGHT_MOVES) {
      const cue = buildLightMove(move.id, light);
      expect(cue, move.id).not.toBeNull();
      expect(cue!.start).toBe(light.start);
      expect(cue!.tracks.every(t => t.nodeId === 'light_1')).toBe(true);
    }
    expect(buildCameraMove('moonwalk', camera)).toBeNull();
    expect(buildLightMove('disco', light)).toBeNull();
  });
});

describe('camera moves do what their name says', () => {
  it('a dolly changes the distance, and stops short of the subject', () => {
    const start = shotDistance(buildCameraMove('dolly-in', camera), 0);
    const end = shotDistance(buildCameraMove('dolly-in', camera), 3);
    expect(end).toBeLessThan(start);
    // Arriving on top of the subject is never the shot.
    expect(end).toBeGreaterThan(0.2 * start);
    expect(shotDistance(buildCameraMove('dolly-out', camera), 3)).toBeGreaterThan(start);
  });

  it('a truck slides sideways and keeps the subject framed', () => {
    const cue = buildCameraMove('truck-right', camera)!;
    // Both the camera and what it looks at move together, so the framing holds.
    expect(cue.tracks.map(t => t.type).sort()).toEqual(['position', 'target']);
    expect(shotDistance(cue, 3)).toBeCloseTo(shotDistance(cue, 0), 6);
    const end = sampleAnimation({ tracks: [], cues: [cue] }, 3);
    expect(end.find(v => v.channel === 'position')!.value.x)
      .toBeGreaterThan(camera.camera.position.x);
    // Left goes the other way.
    const left = sampleAnimation({ tracks: [], cues: [buildCameraMove('truck-left', camera)!] }, 3);
    expect(left.find(v => v.channel === 'position')!.value.x).toBeLessThan(camera.camera.position.x);
  });

  it('a pedestal raises the whole shot without tipping it', () => {
    const up = sampleAnimation({ tracks: [], cues: [buildCameraMove('pedestal-up', camera)!] }, 3);
    const position = up.find(v => v.channel === 'position')!.value;
    const target = up.find(v => v.channel === 'target')!.value;
    expect(position.y).toBeGreaterThan(camera.camera.position.y);
    // The eye line rises with it, so the framing is unchanged.
    expect(target.y - camera.camera.target.y).toBeCloseTo(position.y - camera.camera.position.y, 6);
  });

  it('a pan turns the look without moving the camera', () => {
    const cue = buildCameraMove('pan-left', camera)!;
    expect(cue.tracks.map(t => t.type)).toEqual(['target']);
    const end = sampleAnimation({ tracks: [], cues: [cue] }, 3);
    expect(end.find(v => v.channel === 'position')).toBeUndefined();
    expect(end.find(v => v.channel === 'target')!.value.x).not.toBeCloseTo(camera.camera.target.x, 3);
  });

  it('a tilt raises the look, and an orbit keeps the distance', () => {
    const tilt = sampleAnimation({ tracks: [], cues: [buildCameraMove('tilt-up', camera)!] }, 3);
    expect(tilt.find(v => v.channel === 'target')!.value.y).toBeGreaterThan(camera.camera.target.y);

    // An arc around the subject: the camera travels, the framing does not.
    const orbit = buildCameraMove('orbit-left', camera)!;
    expect(shotDistance(orbit, 3)).toBeCloseTo(shotDistance(orbit, 0), 6);
    const moved = sampleAnimation({ tracks: [], cues: [orbit] }, 3)
      .find(v => v.channel === 'position')!.value;
    expect(moved.x).not.toBeCloseTo(camera.camera.position.x, 3);
  });

  it('reads the same on a tight shot and across a hangar', () => {
    // Travel is a share of the shot distance, so one button suits both.
    const far: CameraMoveContext = {
      ...camera,
      camera: { position: { x: 0, y: 2, z: -80 }, target: { x: 0, y: 2, z: 0 } },
    };
    const nearRatio = shotDistance(buildCameraMove('dolly-in', camera), 3) / shotDistance(buildCameraMove('dolly-in', camera), 0);
    const farRatio = shotDistance(buildCameraMove('dolly-in', far), 3) / shotDistance(buildCameraMove('dolly-in', far), 0);
    // Not bit-identical: the near camera looks slightly downwards, so its
    // travel is not perfectly axial. Within a thousandth is the claim.
    expect(nearRatio).toBeCloseTo(farRatio, 3);
  });
});

describe('light moves do what their name says', () => {
  const play = (move: string, time: number) =>
    sampleAnimation({ tracks: [], cues: [buildLightMove(move, light)!] }, time)
      .find(v => v.channel === 'intensity')?.value.x;

  it('fades up from dark and down to dark', () => {
    expect(play('fade-up', light.start)).toBe(0);
    expect(play('fade-up', light.start + light.duration)).toBeCloseTo(1, 6);
    expect(play('fade-down', light.start)).toBeCloseTo(1, 6);
    expect(play('fade-down', light.start + light.duration)).toBe(0);
  });

  it('flickers without ever going out', () => {
    // A tube on its way out is unsteady, not off.
    const samples = Array.from({ length: 40 }, (_, i) =>
      play('flicker', light.start + (i / 39) * light.duration)!);
    expect(Math.min(...samples)).toBeGreaterThan(0);
    expect(Math.max(...samples)).toBeGreaterThan(Math.min(...samples) * 1.5);
  });

  it('fails by getting worse, and ends dark', () => {
    const early = play('failing', light.start + light.duration * 0.1)!;
    const late = play('failing', light.start + light.duration * 0.9)!;
    expect(late).toBeLessThan(early);
    expect(play('failing', light.start + light.duration)).toBeCloseTo(0, 6);
  });

  it('strikes twice for lightning, harder than the fixture burns', () => {
    const samples = Array.from({ length: 60 }, (_, i) =>
      play('lightning', light.start + (i / 59) * light.duration)!);
    // A strike is far brighter than the standing level, and it ends dark.
    expect(Math.max(...samples)).toBeGreaterThan(2);
    expect(play('lightning', light.start + light.duration)).toBe(0);
  });

  it('shifts colour without touching the output', () => {
    const cue = buildLightMove('to-warm', light)!;
    expect(cue.tracks.map(t => t.type)).toEqual(['color']);
    const end = sampleAnimation({ tracks: [], cues: [cue] }, light.start + light.duration)
      .find(v => v.channel === 'color')!.value;
    // Warm means more red than blue; cold the other way round.
    expect(end.x).toBeGreaterThan(end.z);
    const cold = sampleAnimation({ tracks: [], cues: [buildLightMove('to-cold', light)!] },
      light.start + light.duration).find(v => v.channel === 'color')!.value;
    expect(cold.z).toBeGreaterThan(cold.x);
  });
});

describe('moves in sequence', () => {
  it('a move placed later leaves the scene alone until its moment', () => {
    const sequence = {
      tracks: [],
      cues: [buildCameraMove('dolly-in', camera)!, buildLightMove('failing', light)!],
    };
    // The light beat starts at 2; before that nothing has told it to change.
    expect(sampleAnimation(sequence, 1).find(v => v.channel === 'intensity')).toBeUndefined();
    expect(sampleAnimation(sequence, 3).find(v => v.channel === 'intensity')).toBeDefined();
    // And the whole sequence runs until the last beat has finished.
    expect(sequenceDuration(sequence)).toBe(light.start + light.duration);
  });
});
