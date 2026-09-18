import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMPTY_STORYBOARD, numberShots, boardDuration, asClock, shotFocalLength, shotSummary,
  callSheetFor, peopleOnBoard, undirected, isUsableDirection, parseStoryboard,
} from './storyboard';

/**
 * The sheet you hand to somebody, for both editions.
 *
 * A board is a working document: people edit it by hand, machines write it badly,
 * and both editions of the studio read and write the same one. So the parser is
 * the part that has to agree exactly — what it keeps, what it fills in, what it
 * drops — and it is fed the sort of nonsense a real file contains.
 *
 * Text limits are counted in UTF-16 units, because `String.prototype.slice` is,
 * and a sentence with an emoji in it must come out the same length on both.
 *
 *   UPDATE_FIXTURES=1 npm test -- storyboard.fixtures
 */

const FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../apple/VirtualstudioCore/Tests/StoryboardTests/Fixtures/storyboard.json',
);

/** A pizza commercial, which is the scenario this whole feature came from. */
const BOARD = {
  title: 'Holy Crust · 20 sekunder',
  forWhom: 'Statister og kjøkken',
  shots: [
    {
      id: 'shot-oven', name: 'Nært på hendene ved ovnen',
      locationId: 'pizzeria', lookId: 'pizzeria-kveld',
      camera: { position: { x: 1.9, y: 1.35, z: 0.2 }, target: { x: 1.15, y: 1.1, z: 0.9 }, focalLength: 85, aperture: 2 },
      move: 'dolly-in', duration: 3.5,
      note: 'Ilden må være synlig i bakkant.',
      directions: [
        { markId: 'ovnen', who: 'Bakeren', action: 'Du skyver pizzaen inn i ovnen og lener deg litt unna varmen.' },
      ],
    },
    {
      id: 'shot-serve', name: 'Servitøren setter fra seg pizzaen',
      locationId: 'pizzeria', lookId: 'pizzeria-kveld',
      camera: { position: { x: 1.4, y: 1.5, z: -2.4 }, target: { x: -0.1, y: 1.15, z: -1.4 }, focalLength: 50, aperture: 2.8 },
      duration: 4,
      directions: [
        { markId: 'servering', who: 'Servitør', action: 'Du setter fra deg pizzaen og ser opp på gjesten.' },
        { markId: 'bordet', who: 'Gjest ved bordet', action: 'Du ser ned på pizzaen idet den kommer, og så opp på servitøren.' },
      ],
    },
    {
      id: 'shot-wide', name: 'Vidt av lokalet',
      locationId: 'pizzeria', lookId: 'pizzeria-kveld',
      camera: { position: { x: -2.6, y: 1.8, z: -2.9 }, target: { x: 0.2, y: 1.2, z: 0.6 }, focalLength: 28, aperture: 4 },
      move: 'orbit-left', duration: 6.25,
      directions: [
        { markId: 'disken', who: 'Vert', action: 'Du tar imot en bestilling over disken og nikker mot kjøkkenet.' },
        { markId: 'bordet', who: 'Gjest ved bordet', action: 'Du sier noe til den andre gjesten og løfter glasset.' },
        { markId: 'gjest2', who: 'Gjest nummer to', action: 'Du ler kort og ser mot inngangen.' },
      ],
    },
  ],
};

/** Boards written badly, which is what a parser is for. */
const BROKEN: { name: string; raw: unknown }[] = [
  { name: 'nothing at all', raw: null },
  { name: 'a number', raw: 42 },
  { name: 'an empty object', raw: {} },
  { name: 'shots that are not objects', raw: { title: 'Rart', shots: [1, 'to', null, []] } },
  { name: 'a shot with nothing in it', raw: { shots: [{}] } },
  {
    name: 'a shot with a broken camera',
    raw: { shots: [{ id: 'a', camera: { position: { x: 'nei' }, target: null, focalLength: -50, aperture: 0 } }] },
  },
  {
    name: 'a direction addressed to nobody',
    raw: { shots: [{ directions: [
      { markId: '', who: 'Ingen', action: 'Du gjør noe.' },
      { markId: '  ', who: 'Heller ingen', action: 'Du gjør noe annet.' },
      { markId: ' ovnen ', action: 'Du står ved ovnen og venter.' },
    ] }] },
  },
  { name: 'a duration of nothing', raw: { shots: [{ duration: 0 }, { duration: -3 }, { duration: 99999 }] } },
  { name: 'a frame that is not an image', raw: { shots: [{ frame: 'http://example.test/bilde.png' }] } },
  { name: 'a frame that is one', raw: { shots: [{ frame: 'data:image/png;base64,iVBORw0KGgo=' }] } },
  {
    name: 'text past every limit',
    raw: {
      title: 'T'.repeat(400), forWhom: 'F'.repeat(400),
      shots: [{
        name: 'N'.repeat(400), locationId: 'L'.repeat(400), lookId: 'K'.repeat(400), note: 'M'.repeat(400),
        directions: [{ markId: 'ovnen', who: 'W'.repeat(400), action: 'A'.repeat(400) }],
      }],
    },
  },
  {
    // Emoji are two UTF-16 units each, so a limit counted in characters would cut
    // in a different place than the web edition does.
    name: 'text past a limit, with emoji in it',
    raw: { shots: [{ directions: [{ markId: 'ovnen', who: '🍕'.repeat(50), action: '🔥'.repeat(200) }] }] },
  },
  { name: 'titles that are only whitespace', raw: { title: '   ', forWhom: '\t\n', shots: [{ name: '  ', note: '   ' }] } },
  { name: 'shots out of order, to be renumbered', raw: { shots: [{ id: 'c', number: 9 }, { id: 'a', number: 1 }] } },
];

const OCCUPIED = ['ovnen', 'servering', 'bordet', 'gjest2', 'disken', 'inngangen'];

function build() {
  const board = parseStoryboard(BOARD);
  return {
    source: 'src/services/storyboard.ts',
    note: 'Generated by storyboard.fixtures.test.ts. Read by StoryboardTests in apple/VirtualstudioCore.',
    empty: EMPTY_STORYBOARD,
    board: { input: BOARD, parsed: board },
    // How a duration is rounded for the crew line.
    //
    // JavaScript's toFixed takes the nearest representation and, on an exact tie,
    // the larger one; C's printf rounds a tie to even. 6.25 is "6,3" here and
    // would be "6,2" through String(format:) — the same shot, two different
    // sheets. These are the cases the Swift port is held to.
    rounding: ([[6.25, 1], [0.15, 1], [0.25, 1], [0.35, 1], [2.5, 0], [3.5, 0],
      [9.99, 1], [9.96, 1], [99.99, 1], [0.04, 1], [-6.25, 1], [4, 1], [0, 2],
      [1.005, 2], [8.475, 2], [1234.5678, 3]] as [number, number][])
      .map(([value, digits]) => ({ value, digits, fixed: value.toFixed(digits) })),
    // The clock, at the boundaries that catch a rounding mistake.
    clock: [0, -5, 0.4, 0.6, 5, 59, 59.5, 60, 65, 599, 600, 3600]
      .map(seconds => ({ seconds, clock: asClock(seconds) })),
    duration: { seconds: boardDuration(board), clock: asClock(boardDuration(board)) },
    // The line the crew reads.
    summaries: board.shots.map(shot => ({
      id: shot.id, focalLength: shotFocalLength(shot), summary: shotSummary(shot),
    })),
    // The sheet each person gets.
    callSheets: OCCUPIED.map(markId => ({ markId, lines: callSheetFor(board, markId) })),
    people: peopleOnBoard(board),
    // Who is on set with nothing to do, per shot.
    undirected: board.shots.map(shot => ({ id: shot.id, marks: undirected(shot, OCCUPIED) })),
    // What counts as an instruction rather than a label.
    usable: [
      'Du setter fra deg pizzaen og ser opp på gjesten.',
      'Du venter.', 'Venter', '', '   ', 'Gå inn', 'Du går inn',
      'Sett deg', 'Sett deg ned', 'åååååååå', 'å å',
    ].map(action => ({ action, usable: isUsableDirection({ action }) })),
    // And every way a board can arrive broken.
    broken: BROKEN.map(({ name, raw }) => ({ name, raw: raw ?? null, parsed: parseStoryboard(raw) })),
    // Renumbering leaves the input alone.
    renumbered: (() => {
      const input = parseStoryboard({ shots: [{ id: 'a', number: 7 }, { id: 'b', number: 7 }] }).shots;
      return { before: input.map(s => s.number), after: numberShots(input).map(s => s.number) };
    })(),
  };
}

describe('the sheet you hand to somebody, for both editions', () => {
  it('matches the fixture the Swift suite reads', () => {
    const current = build();
    if (process.env.UPDATE_FIXTURES) {
      mkdirSync(dirname(FIXTURE), { recursive: true });
      writeFileSync(FIXTURE, `${JSON.stringify(current, null, 2)}\n`);
    }
    expect(JSON.parse(JSON.stringify(current))).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8')));
  });

  it('names everybody who is on set with nothing to do', () => {
    // The failure the whole feature exists to prevent, asserted rather than
    // trusted: the wide has three people directed, so the other three are named.
    const board = parseStoryboard(BOARD);
    expect(undirected(board.shots[0], OCCUPIED).length).toBe(5);
    expect(undirected(board.shots[2], OCCUPIED)).toEqual(['ovnen', 'servering', 'inngangen']);
  });

  it('cuts long text where UTF-16 cuts it', () => {
    // A limit counted in characters would keep 240 emoji, which is 480 units,
    // and the same board would then differ between the two editions.
    const parsed = parseStoryboard({ shots: [{ directions: [{ markId: 'ovnen', action: '🔥'.repeat(200) }] }] });
    expect(parsed.shots[0].directions[0].action.length).toBe(240);
  });
});
