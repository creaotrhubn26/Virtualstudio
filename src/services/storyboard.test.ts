import { describe, it, expect } from 'vitest';
import {
  asClock,
  boardDuration,
  callSheetFor,
  isUsableDirection,
  numberShots,
  parseStoryboard,
  peopleOnBoard,
  shotSummary,
  undirected,
  type StudioShot,
} from './storyboard';

const camera = {
  position: { x: 0, y: 1.5, z: -3 },
  target: { x: 0, y: 1.4, z: 0 },
  focalLength: 85,
  aperture: 2.8,
};

function shot(overrides: Partial<StudioShot> = {}): StudioShot {
  return {
    id: 'shot-1',
    number: 1,
    name: 'Nært på hendene ved ovnen',
    locationId: 'pizzeria',
    lookId: 'pizzeria-kveld',
    camera,
    directions: [],
    duration: 4,
    ...overrides,
  };
}

describe('a shot is a moment somebody can act on', () => {
  it('numbers shots the way people call them on the day', () => {
    const board = numberShots([shot({ id: 'a', number: 9 }), shot({ id: 'b', number: 3 })]);
    expect(board.map(s => s.number)).toEqual([1, 2]);
    // Numbering does not disturb what it was given.
    expect(board[0].id).toBe('a');
  });

  it('tells the crew the things the crew needs', () => {
    const line = shotSummary(shot({ move: 'Dolly inn', duration: 4.5 }));
    expect(line).toContain('85 mm');
    expect(line).toContain('f/2.8');
    expect(line).toContain('Dolly inn');
    expect(line).toContain('4,5 s');
  });

  it('adds up to a running time a producer recognises', () => {
    const board = { shots: [shot({ duration: 4 }), shot({ id: 'b', duration: 6.5 }), shot({ id: 'c', duration: 55 })] };
    expect(boardDuration(board)).toBeCloseTo(65.5, 6);
    expect(asClock(boardDuration(board))).toBe('1:06');
    expect(asClock(4)).toBe('0:04');
  });
});

describe('the sheet you hand to one person', () => {
  const board = {
    shots: numberShots([
      shot({
        id: 'a',
        name: 'Oversikt',
        directions: [
          { markId: 'ovnen', who: 'Pizzabaker', action: 'Du skyver pizzaen inn i ovnen og ser etter den.' },
          { markId: 'disken', who: 'Servitør', action: 'Du tørker av disken og ser opp mot døra.' },
        ],
      }),
      shot({
        id: 'b',
        name: 'Nært på hendene',
        directions: [
          { markId: 'ovnen', who: 'Pizzabaker', action: 'Du trekker spaden ut i én rolig bevegelse.' },
        ],
      }),
    ]),
  };

  it('gives one person only their own shots, in order', () => {
    const baker = callSheetFor(board, 'ovnen');
    expect(baker.map(entry => entry.number)).toEqual([1, 2]);
    expect(baker[1].action).toContain('spaden');

    // The waiter is only in the first shot, and should not read the second.
    const waiter = callSheetFor(board, 'disken');
    expect(waiter).toHaveLength(1);
    expect(waiter[0].number).toBe(1);
  });

  it('is empty for somebody who is not in it, rather than everything', () => {
    expect(callSheetFor(board, 'inngangen')).toEqual([]);
  });

  it('lists everyone the board asks for, once, in the order they appear', () => {
    expect(peopleOnBoard(board)).toEqual([
      { markId: 'ovnen', who: 'Pizzabaker' },
      { markId: 'disken', who: 'Servitør' },
    ]);
  });
});

describe('nobody stands in a shot without being told what to do', () => {
  it('names the marks that have somebody on them and no direction', () => {
    // The failure this exists to prevent: a person on set, in costume, in
    // frame, who was never told what the shot needs from them.
    const one = shot({
      directions: [{ markId: 'ovnen', who: 'Pizzabaker', action: 'Du skyver pizzaen inn i ovnen.' }],
    });
    expect(undirected(one, ['ovnen', 'disken', 'bordet'])).toEqual(['disken', 'bordet']);
    expect(undirected(one, ['ovnen'])).toEqual([]);
  });

  it('knows an instruction from a label', () => {
    expect(isUsableDirection({ action: 'Du setter fra deg pizzaen og ser opp.' })).toBe(true);
    // These are things somebody wrote to fill the field in.
    expect(isUsableDirection({ action: 'står' })).toBe(false);
    expect(isUsableDirection({ action: '   ' })).toBe(false);
    expect(isUsableDirection({ action: 'venter' })).toBe(false);
  });
});

describe('a board read back from a file', () => {
  it('keeps what is usable and renumbers the rest', () => {
    const board = parseStoryboard({
      title: 'Holy Crust · 20 sekunder',
      forWhom: 'Statister',
      shots: [
        null,
        { id: 'keep', name: 'Oversikt', duration: 6, camera: { focalLength: 35, aperture: 4 },
          directions: [{ markId: 'ovnen', who: 'Pizzabaker', action: 'Du skyver pizzaen inn.' }] },
        'not a shot',
        { name: 'Uten id' },
      ],
    });
    expect(board.title).toBe('Holy Crust · 20 sekunder');
    expect(board.forWhom).toBe('Statister');
    expect(board.shots.map(s => s.number)).toEqual([1, 2]);
    expect(board.shots[0].id).toBe('keep');
    expect(board.shots[0].camera.focalLength).toBe(35);
    // A shot with nothing but a name still opens, with sensible defaults.
    expect(board.shots[1].duration).toBe(4);
    expect(board.shots[1].camera.aperture).toBe(2.8);
  });

  it('opens rather than fails, whatever it is handed', () => {
    for (const broken of [undefined, null, 42, 'a board', { shots: 'none' }]) {
      const board = parseStoryboard(broken);
      expect(board.title.length).toBeGreaterThan(0);
      expect(Array.isArray(board.shots)).toBe(true);
    }
  });

  it('drops a direction addressed to nobody', () => {
    const board = parseStoryboard({
      shots: [{ directions: [{ who: 'Ingen', action: 'Du gjør noe.' }, { markId: 'ovnen', action: 'Du skyver inn.' }] }],
    });
    expect(board.shots[0].directions).toHaveLength(1);
    expect(board.shots[0].directions[0].markId).toBe('ovnen');
    // A person with no name is called by the mark they stand on.
    expect(board.shots[0].directions[0].who).toBe('ovnen');
  });

  it('refuses a frame that is not an image', () => {
    const withImage = parseStoryboard({ shots: [{ frame: 'data:image/png;base64,AAAA' }] });
    expect(withImage.shots[0].frame).toBe('data:image/png;base64,AAAA');
    const withJunk = parseStoryboard({ shots: [{ frame: 'https://example.com/tracking.gif' }] });
    expect(withJunk.shots[0].frame).toBeUndefined();
  });
});
