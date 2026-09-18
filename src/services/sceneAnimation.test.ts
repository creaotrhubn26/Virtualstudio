import { describe, it, expect } from 'vitest';
import {
  AnimationCue,
  AnimationTrack,
  Keyframe,
  animatedNodeIds,
  animationDuration,
  cueDuration,
  parseAnimation,
  sampleAnimation,
  sampleTrack,
  sequenceDuration,
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
    expect(parseAnimation(undefined)).toEqual({ duration: 0, tracks: [], cues: [] });
    expect(parseAnimation({ duration: 'later' })).toEqual({ duration: 0, tracks: [], cues: [] });
  });
});

/** A beat: the overhead light fails two seconds in and dies over one second. */
const lightFails: AnimationCue = {
  id: 'light-fails',
  name: 'Lyset svikter',
  start: 2,
  enabled: true,
  tracks: [{
    id: 'key-intensity', nodeId: 'light_1', type: 'intensity',
    keyframes: [
      { time: 0, value: { x: 1, y: 0, z: 0 } },
      { time: 1, value: { x: 0, y: 0, z: 0 } },
    ],
  }],
};

describe('a sequence of cues', () => {
  const animation = {
    tracks: [{
      id: 'heli-position', nodeId: 'air-ambulance', type: 'position' as const, keyframes: approach,
    }],
    cues: [lightFails],
  };

  it('holds a cue back until its moment', () => {
    // Before its start the beat must not reach back and change anything.
    const before = sampleAnimation(animation, 1);
    expect(before.find(v => v.channel === 'intensity')).toBeUndefined();
    // The helicopter is a quarter of the way from 40 m down to 6 m.
    expect(before.find(v => v.channel === 'position')!.value.y).toBeCloseTo(31.5, 6);

    // Inside it, the cue plays in its own time: one second in means halfway.
    const during = sampleAnimation(animation, 2.5);
    expect(during.find(v => v.channel === 'intensity')!.value.x).toBeCloseTo(0.5, 6);
  });

  it('leaves what a cue last said standing afterwards', () => {
    // A light dimmed by a beat stays dim until something else changes it,
    // rather than snapping back when the beat ends.
    expect(sampleAnimation(animation, 30).find(v => v.channel === 'intensity')!.value.x).toBe(0);
  });

  it('lets a beat be muted while the rest is worked on', () => {
    const muted = { ...animation, cues: [{ ...lightFails, enabled: false }] };
    expect(sampleAnimation(muted, 3).find(v => v.channel === 'intensity')).toBeUndefined();
    // The scene's own tracks keep playing.
    expect(sampleAnimation(muted, 3).find(v => v.channel === 'position')).toBeDefined();
  });

  it('reads top to bottom: a later cue wins the same channel', () => {
    const restored: AnimationCue = {
      id: 'light-returns', name: 'Lyset kommer tilbake', start: 6, enabled: true,
      tracks: [{ id: 'key-intensity-2', nodeId: 'light_1', type: 'intensity',
        keyframes: [{ time: 0, value: { x: 0.8, y: 0, z: 0 } }] }],
    };
    // Written out of order on purpose: the sequence is read by start time.
    const sequence = { tracks: [], cues: [restored, lightFails] };
    // Halfway through the failure, before the later beat begins.
    expect(sampleAnimation(sequence, 2.5).find(v => v.channel === 'intensity')!.value.x).toBeCloseTo(0.5, 6);
    // Once the light returns, the later beat is the one that counts.
    expect(sampleAnimation(sequence, 7).find(v => v.channel === 'intensity')!.value.x).toBeCloseTo(0.8, 6);
  });

  it('runs until the last beat has finished, not just the last track', () => {
    expect(cueDuration(lightFails)).toBe(1);
    // The helicopter lands at 5; the beat starting at 2 ends at 3.
    expect(sequenceDuration(animation)).toBe(5);
    // A beat placed after everything else extends the sequence.
    const late = { ...animation, cues: [{ ...lightFails, start: 20 }] };
    expect(sequenceDuration(late)).toBe(21);
    // A cue told to stop early stops early.
    expect(cueDuration({ ...lightFails, duration: 0.5 })).toBe(0.5);
  });
});

describe('reading a sequence out of a document', () => {
  it('keeps cues, and the duration covers them', () => {
    const parsed = parseAnimation({ duration: 1, tracks: [], cues: [{ ...lightFails, start: 9 }] });
    expect(parsed.cues).toHaveLength(1);
    expect(parsed.cues[0].name).toBe('Lyset svikter');
    expect(parsed.duration).toBe(10);
  });

  it('drops a beat that would occupy the sequence without doing anything', () => {
    const parsed = parseAnimation({
      tracks: [],
      cues: [
        { id: 'empty', name: 'Ingenting', start: 0, enabled: true, tracks: [] },
        { name: 'Nameless', start: 0, enabled: true, tracks: lightFails.tracks },
        lightFails,
        { ...lightFails, name: 'Duplicate' },
      ],
    });
    expect(parsed.cues.map(c => c.id)).toEqual(['light-fails']);
    expect(parsed.cues[0].name).toBe('Lyset svikter');
  });

  it('accepts every channel a track can drive', () => {
    const parsed = parseAnimation({
      tracks: ['position', 'rotation', 'intensity', 'color', 'target'].map((type, i) => ({
        id: `t${i}`, nodeId: 'thing', type,
        keyframes: [{ time: 0, value: { x: 1, y: 1, z: 1 } }],
      })),
    });
    expect(parsed.tracks.map(t => t.type)).toEqual(['position', 'rotation', 'intensity', 'color', 'target']);
    // And still refuses one it cannot drive.
    expect(parseAnimation({ tracks: [{ id: 'x', nodeId: 'a', type: 'scale',
      keyframes: [{ time: 0, value: { x: 1, y: 1, z: 1 } }] }] }).tracks).toEqual([]);
  });
});
