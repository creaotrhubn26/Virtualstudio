import { describe, it, expect } from 'vitest';
import { boardSheet, personSheet } from './storyboardSheet';
import { numberShots, type Storyboard, type StudioShot } from './storyboard';

const camera = {
  position: { x: 0, y: 1.5, z: -3 },
  target: { x: 0, y: 1.4, z: 0 },
  focalLength: 85,
  aperture: 2.8,
};

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

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

const board: Storyboard = {
  title: 'Holy Crust · 20 sekunder',
  forWhom: 'Statister',
  shots: numberShots([
    shot({
      id: 'a',
      name: 'Oversikt over lokalet',
      frame: PIXEL,
      duration: 6,
      move: 'Dolly inn',
      directions: [
        { markId: 'ovnen', who: 'Pizzabaker', action: 'Du skyver pizzaen inn i ovnen og ser etter den.' },
        { markId: 'disken', who: 'Servitør', action: 'Du tørker av disken og ser opp mot døra.' },
      ],
    }),
    shot({
      id: 'b',
      name: 'Nært på hendene',
      directions: [{ markId: 'ovnen', who: 'Pizzabaker', action: 'Du trekker spaden ut i én rolig bevegelse.' }],
      note: 'Hold hendene i bildet hele tiden.',
    }),
  ]),
};

describe('the board, for the director', () => {
  it('is a page that opens on its own', () => {
    const html = boardSheet(board);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    // Self-contained: the styles travel with it, because this gets mailed.
    expect(html).toContain('<style>');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('<script');
  });

  it('carries every shot, numbered as they are called', () => {
    const html = boardSheet(board);
    expect(html).toContain('Opptak 1');
    expect(html).toContain('Opptak 2');
    expect(html).toContain('Oversikt over lokalet');
    expect(html).toContain('Nært på hendene');
    // The running time a producer asks for.
    expect(html).toContain('0:10');
  });

  it('gives the crew their line and the cast theirs', () => {
    const html = boardSheet(board);
    expect(html).toContain('85 mm');
    expect(html).toContain('Dolly inn');
    expect(html).toContain('Du skyver pizzaen inn i ovnen og ser etter den.');
    expect(html).toContain('Hold hendene i bildet hele tiden.');
  });

  it('says out loud when nobody has been told anything', () => {
    // A shot with no directions is the failure the sheet exists to catch, so
    // it is printed rather than left as an empty space.
    const html = boardSheet({ title: 'Tom', shots: numberShots([shot({ directions: [] })]) });
    expect(html).toContain('Ingen har fått beskjed');
  });

  it('marks a direction that is a label rather than an instruction', () => {
    const html = boardSheet({
      title: 'Halvferdig',
      shots: numberShots([shot({ directions: [{ markId: 'ovnen', who: 'Baker', action: 'venter' }] })]),
    });
    expect(html).toContain('Mangler beskjed');
    expect(html).not.toContain('>venter<');
  });

  it('says a frame is missing instead of showing a broken image', () => {
    expect(boardSheet(board)).toContain('Ingen ramme lagret');
  });
});

describe('one person’s sheet', () => {
  it('has only their shots and only their line', () => {
    const html = personSheet(board, 'disken');
    expect(html).toContain('Servitør');
    expect(html).toContain('Du tørker av disken og ser opp mot døra.');
    // The waiter is not in the second shot and must not read its direction.
    expect(html).not.toContain('Du trekker spaden ut');
    expect(html).not.toContain('Opptak 2');
  });

  it('keeps the numbers the board uses, so a call matches', () => {
    // Somebody hearing "opptak to" has to be able to find opptak to.
    const html = personSheet(board, 'ovnen');
    expect(html).toContain('Opptak 1');
    expect(html).toContain('Opptak 2');
  });

  it('says so plainly when somebody is in nothing', () => {
    const html = personSheet(board, 'inngangen');
    expect(html).toContain('ikke med i noen opptak');
  });
});

describe('a sheet passed between people is not a tracker', () => {
  it('refuses a frame that is not an image this document made', () => {
    const html = boardSheet({
      title: 'Ekstern',
      shots: numberShots([shot({ frame: 'https://example.com/pixel.gif' })]),
    });
    expect(html).not.toContain('example.com');
    expect(html).toContain('Ingen ramme lagret');
  });

  it('writes text as text, never as markup', () => {
    const html = boardSheet({
      title: '<script>alert(1)</script>',
      shots: numberShots([shot({
        name: 'Bord & stol',
        directions: [{ markId: 'a', who: '<b>Baker</b>', action: 'Du sier "hei" og går ut.' }],
      })]),
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Bord &amp; stol');
    expect(html).toContain('&lt;b&gt;Baker&lt;/b&gt;');
    expect(html).toContain('&quot;hei&quot;');
  });
});
