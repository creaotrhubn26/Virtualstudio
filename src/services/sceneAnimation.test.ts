import { describe, it, expect } from 'vitest';
import {
  AnimationTrack,
  Keyframe,
  animatedNodeIds,
  animationDuration,
  parseAnimation,
  sampleTrack,
  sortKeyframes,
  upsertKeyframe,
} from './sceneAnimation';

/** An air ambulance coming in over five seconds and setting down. */
const approach: Keyframe[] = [
  { time: 0, value: { x: 0, y: 40, z: -120 } },
  { time: 4, value: { x: 0, y: 6, z: -10 } },
  { time: 5, value: { x: 0, y: 0, z: 0 } },
];

describe('sampling a track', () => {
  it('interpolates between the keyframes on either side', () => {
    expect(sampleTrack(approach, 0)).toEqual({ x: 0, y: 40, z: -120 });
    expect(sampleTrack(approach, 5)).toEqual({ x: 0, y: 0, z: 0 });
    // Halfway through the descent.
    expect(sampleTrack(approach, 2)).toEqual({ x: 0, y: 23, z: -65 });
    const late = sampleTrack(approach, 4.5)!;
    expect(late.y).toBeCloseTo(3, 9);
    expect(late.z).toBeCloseTo(-5, 9);
  });

  it('holds at both ends rather than carrying on', () => {
    // A helicopter that has landed stays landed; extrapolating would fly it
    // through the floor.
    expect(sampleTrack(approach, 500)).toEqual({ x: 0, y: 0, z: 0 });
    expect(sampleTrack(approach, -20)).toEqual({ x: 0, y: 40, z: -120 });
  });

  it('leaves a node alone when a track says nothing', () => {
    // Returning the origin would teleport whatever it addresses.
    expect(sampleTrack([], 1)).toBeNull();
    expect(sampleTrack([{ time: 3, value: { x: 1, y: 2, z: 3 } }], 0)).toEqual({ x: 1, y: 2, z: 3 });
    expect(sampleTrack([{ time: 3, value: { x: 1, y: 2, z: 3 } }], 99)).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('copes with keyframes that arrive out of order or at once', () => {
    const jumbled: Keyframe[] = [
      { time: 5, value: { x: 10, y: 0, z: 0 } },
      { time: 0, value: { x: 0, y: 0, z: 0 } },
    ];
    expect(sampleTrack(jumbled, 2.5)).toEqual({ x: 5, y: 0, z: 0 });
    // The caller's array is not reordered underneath it.
    expect(jumbled[0].time).toBe(5);
    // Two keyframes at one instant: the later wins, rather than dividing by zero.
    const doubled: Keyframe[] = [
      { time: 0, value: { x: 0, y: 0, z: 0 } },
      { time: 1, value: { x: 1, y: 0, z: 0 } },
      { time: 1, value: { x: 9, y: 0, z: 0 } },
    ];
    expect(Number.isFinite(sampleTrack(doubled, 1)!.x)).toBe(true);
  });

  it('never hands back the array it was given', () => {
    const sorted = sortKeyframes(approach);
    expect(sorted).not.toBe(approach);
    expect(sorted.map(k => k.time)).toEqual([0, 4, 5]);
  });
});

describe('editing a track', () => {
  it('replaces the keyframe already at that moment', () => {
    const track = upsertKeyframe(approach, 4, { x: 1, y: 7, z: -11 });
    expect(track).toHaveLength(3);
    expect(track[1]).toEqual({ time: 4, value: { x: 1, y: 7, z: -11 } });
    // And a new moment is inserted in order.
    const inserted = upsertKeyframe(track, 2, { x: 0, y: 20, z: -60 });
    expect(inserted.map(k => k.time)).toEqual([0, 2, 4, 5]);
    // The original is untouched: a track being played from must not change
    // underfoot.
    expect(approach).toHaveLength(3);
    expect(approach[1].value.y).toBe(6);
  });

  it('treats a moment within a hundredth of a second as the same one', () => {
    const track = upsertKeyframe(approach, 4.005, { x: 2, y: 2, z: 2 });
    expect(track).toHaveLength(3);
    expect(track[1].value).toEqual({ x: 2, y: 2, z: 2 });
  });
});

describe('what a scene needs to play', () => {
  const tracks: AnimationTrack[] = [
    { id: 'heli-position', nodeId: 'air-ambulance', type: 'position', keyframes: approach },
    { id: 'heli-rotation', nodeId: 'air-ambulance', type: 'rotation', keyframes: [{ time: 2, value: { x: 0, y: 1, z: 0 } }] },
    { id: 'key-position', nodeId: 'light_1', type: 'position', keyframes: [{ time: 7, value: { x: 1, y: 2, z: 3 } }] },
  ];

  it('runs until the last thing stops moving', () => {
    expect(animationDuration(tracks)).toBe(7);
    expect(animationDuration([])).toBe(0);
  });

  it('names every node it needs, once each', () => {
    expect(animatedNodeIds(tracks)).toEqual(['air-ambulance', 'light_1']);
  });
});

describe('reading animation out of a document', () => {
  it('keeps a well-formed timeline', () => {
    const parsed = parseAnimation({
      duration: 5,
      tracks: [{ id: 'heli-position', nodeId: 'air-ambulance', type: 'position', keyframes: approach }],
    });
    expect(parsed.duration).toBe(5);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].keyframes).toHaveLength(3);
  });

  it('never ends before the movement does', () => {
    // A timeline shorter than its own keyframes would cut the arrival off.
    const parsed = parseAnimation({
      duration: 2,
      tracks: [{ id: 'heli-position', nodeId: 'air-ambulance', type: 'position', keyframes: approach }],
    });
    expect(parsed.duration).toBe(5);
    expect(parseAnimation({ tracks: [] }).duration).toBe(0);
  });

  it('drops what cannot be played rather than half-applying it', () => {
    const parsed = parseAnimation({
      tracks: [
        { id: 'ok', nodeId: 'a', type: 'position', keyframes: [{ time: 1, value: { x: 1, y: 2, z: 3 } }] },
        { id: 'ok', nodeId: 'duplicate', type: 'position', keyframes: [{ time: 1, value: { x: 0, y: 0, z: 0 } }] },
        { id: 'no-node', type: 'position', keyframes: [{ time: 0, value: { x: 0, y: 0, z: 0 } }] },
        { id: 'bad-channel', nodeId: 'a', type: 'scale', keyframes: [{ time: 0, value: { x: 0, y: 0, z: 0 } }] },
        { id: 'empty', nodeId: 'a', type: 'position', keyframes: [] },
        { id: 'broken-frames', nodeId: 'a', type: 'position',
          keyframes: [{ time: -1, value: { x: 0, y: 0, z: 0 } }, { time: 1, value: { x: 0, y: null, z: 0 } }] },
        'rubbish',
      ],
    });
    expect(parsed.tracks.map(t => t.id)).toEqual(['ok']);
    expect(parsed.tracks[0].nodeId).toBe('a');
  });

  it('reads a document that has no animation at all', () => {
    // Every scene written before movement existed.
    expect(parseAnimation(undefined)).toEqual({ duration: 0, tracks: [] });
    expect(parseAnimation({ duration: 'later' })).toEqual({ duration: 0, tracks: [] });
  });
});
