import { describe, it, expect } from 'vitest';
import {
  STOOL_RANGE,
  cameraTiltDeg,
  faceIlluminance,
  heightSpread,
  keyHeightFor,
  rehearsalSpread,
  rehearse,
  seatForEyeHeight,
  sittingEyeHeight,
  sittingHeight,
  standingEyeHeight,
} from './subjectFraming';

describe('where a body puts its eyes', () => {
  it('reads eye height off standing height', () => {
    // A 1.72 m adult's eyes are about 1.61 m up; the top of the head is not
    // where anybody looks.
    expect(standingEyeHeight(1.72)).toBeCloseTo(1.61, 2);
    expect(standingEyeHeight(1.15)).toBeLessThan(1.15);
  });

  it('gives a child proportionally more of their height sitting down', () => {
    // The correction that matters: a six-year-old is nearly as tall sitting as
    // the adult ratio says a much taller person would be.
    const adultShare = sittingHeight(1.72) / 1.72;
    const childShare = sittingHeight(1.17) / 1.17;
    expect(childShare).toBeGreaterThan(adultShare);
    expect(childShare - adultShare).toBeLessThan(0.05);
  });

  it('puts the eyes below the top of the head, sitting or standing', () => {
    for (const height of [1.15, 1.4, 1.72, 1.9]) {
      expect(sittingEyeHeight(height)).toBeLessThan(sittingHeight(height));
      expect(standingEyeHeight(height)).toBeLessThan(height);
    }
  });
});

describe('fixing the head and moving the seat', () => {
  it('solves the seat so two different people meet the same eye line', () => {
    const target = 1.32;
    for (const height of [1.2, 1.45, 1.72]) {
      const seat = seatForEyeHeight(target, height);
      expect(seat.reachable, `${height}`).toBe(true);
      expect(seat.eyeHeight, `${height}`).toBeCloseTo(target, 6);
    }
  });

  it('says so when no stool reaches, instead of inventing one', () => {
    // The real limit in a school hall is the other way round from what one
    // expects: sitting eye height is under a metre for everybody, so nobody is
    // too tall — the smallest children are the ones who need a seat higher
    // than a stool goes, and they need a booster.
    const small = seatForEyeHeight(1.32, 1.1);
    expect(small.reachable).toBe(false);
    expect(small.seatHeight).toBe(STOOL_RANGE.max);
    // And it reports where the eyes really end up, not the wish.
    expect(small.eyeHeight).toBeLessThan(1.32);

    const low = seatForEyeHeight(0.7, 1.72);
    expect(low.reachable).toBe(false);
    expect(low.seatHeight).toBe(STOOL_RANGE.min);
  });

  it('hangs the key above the eye line, not level with it', () => {
    const eye = 1.32;
    const high = keyHeightFor(eye, 2.2, 35);
    expect(high).toBeGreaterThan(eye);
    // 35° at 2.2 m is a metre and a half up: a real stand, not a wish.
    expect(high - eye).toBeCloseTo(2.2 * Math.tan((35 * Math.PI) / 180), 10);
    expect(keyHeightFor(eye, 2.2, 0)).toBeCloseTo(eye, 10);
  });

  it('measures the angle the lens looks down at a face', () => {
    // The thing that makes a photograph of a child read as an adult standing
    // over them.
    expect(cameraTiltDeg(1.5, 1.15, 2)).toBeGreaterThan(9);
    expect(cameraTiltDeg(1.32, 1.32, 2)).toBeCloseTo(0, 10);
    expect(cameraTiltDeg(1.1, 1.32, 2)).toBeLessThan(0);
  });
});

describe('putting a class through one rig', () => {
  const key = { position: { x: 1.6, y: 2.2, z: -1.4 }, candela: 12000 };
  const options = { targetEye: 1.32, key, cameraHeight: 1.32, cameraDistance: 2.4 };

  it('measures every face instead of assuming they are the same', () => {
    const rows = rehearse(heightSpread(1.15, 1.75, 5), options);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.reachable, row.label).toBe(true);
      // The point of the whole exercise: one eye line for everyone.
      expect(row.eyeHeight, row.label).toBeCloseTo(1.32, 6);
      expect(row.faceLux, row.label).toBeGreaterThan(0);
      expect(Math.abs(row.cameraTilt), row.label).toBeLessThan(0.01);
    }
    // Same eye line, same distance to the key, so the same exposure.
    expect(rehearsalSpread(rows)).toBeCloseTo(0, 6);
  });

  it('shows the eye line breaking when the seat cannot reach', () => {
    // The smallest child sits as high as the stool goes and still comes up
    // short, so the eye line is no longer one line — which is the thing the
    // rehearsal exists to say before the morning does.
    const rows = rehearse([{ height: 1.45, label: 'midt' }, { height: 1.1, label: 'minst' }], options);
    expect(rows[0].reachable).toBe(true);
    expect(rows[1].reachable).toBe(false);
    expect(rows[1].eyeHeight).toBeLessThan(rows[0].eyeHeight);
    expect(Math.abs(rows[1].stopsFromReference)).toBeGreaterThan(0);
    expect(rehearsalSpread(rows)).toBeGreaterThan(0);
    // The lens is no longer level with those eyes either.
    expect(rows[1].cameraTilt).toBeGreaterThan(rows[0].cameraTilt);
  });

  it('measures against a subject the rig can actually hold', () => {
    // The reference is the first person whose seat solves, so one unreachable
    // outlier does not redefine what correct exposure is.
    const rows = rehearse([{ height: 1.1, label: 'minst' }, { height: 1.4, label: 'midt' }], options);
    expect(rows[1].stopsFromReference).toBeCloseTo(0, 6);
    expect(rows[0].stopsFromReference).not.toBeCloseTo(0, 3);
  });

  it('falls off with the square of the distance, like the renderer', () => {
    const near = faceIlluminance({ position: { x: 0, y: 1.32, z: -1 }, candela: 1000 }, { x: 0, y: 1.32, z: 0 });
    const far = faceIlluminance({ position: { x: 0, y: 1.32, z: -2 }, candela: 1000 }, { x: 0, y: 1.32, z: 0 });
    expect(near / far).toBeCloseTo(4, 6);
  });
});

describe('a spread of heights to rehearse against', () => {
  it('runs from the smallest to the tallest, labelled in centimetres', () => {
    const spread = heightSpread(1.15, 1.75, 5);
    expect(spread[0].height).toBeCloseTo(1.15, 10);
    expect(spread[4].height).toBeCloseTo(1.75, 10);
    expect(spread[0].label).toBe('115 cm');
    expect(spread.every((s, i) => i === 0 || s.height > spread[i - 1].height)).toBe(true);
  });
});
