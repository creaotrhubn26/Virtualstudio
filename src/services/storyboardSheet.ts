/**
 * The sheet you hand to somebody.
 *
 * A storyboard that only exists inside the application is a storyboard nobody
 * on the floor can read. This turns one into a page: a frame per shot, the
 * number people call it by, and one line per person in words they can act on.
 *
 * It is a self-contained HTML document with the styles inside it, so it can be
 * saved, mailed, opened on a phone in a kitchen doorway, or printed and taped
 * to a wall — which is where these actually end up.
 *
 * Two sheets come out of the same board, because two different people need
 * different things from it:
 *
 * - the **board**, for the director and the crew: every shot in order
 * - a **call sheet**, for one person: only their shots, only their lines
 *
 * Handing an extra the whole board and asking them to find themselves in it is
 * how people end up standing in the wrong place.
 */

import {
  asClock,
  boardDuration,
  callSheetFor,
  isUsableDirection,
  peopleOnBoard,
  shotSummary,
  type Storyboard,
  type StudioShot,
} from './storyboard';

/** Text going into HTML is text, never markup. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only an image this document made.
 *
 * A frame arrives as a data URL from the taking camera. Anything else — a
 * remote URL above all — would turn a sheet passed between people into a thing
 * that phones home when it is opened.
 */
function safeFrame(frame: string | undefined): string | null {
  if (!frame) return null;
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(frame) ? frame : null;
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px;
    font: 14px/1.55 "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #15171a; background: #fff;
  }
  header { border-bottom: 2px solid #15171a; padding-bottom: 12px; margin-bottom: 22px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .01em; }
  .meta { font-size: 12px; color: #5a6068; }
  .shot {
    display: grid; grid-template-columns: 280px 1fr; gap: 20px;
    padding: 18px 0; border-bottom: 1px solid #dfe2e6;
    break-inside: avoid; page-break-inside: avoid;
  }
  .frame { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border: 1px solid #c9ced4; background: #eef0f2; }
  .frame.missing { display: flex; align-items: center; justify-content: center; font-size: 12px; color: #80868e; }
  .shot h2 { font-size: 16px; margin: 0 0 2px; }
  .number { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: #80868e; text-transform: uppercase; }
  .crew { font-size: 12px; color: #5a6068; margin: 2px 0 12px; font-variant-numeric: tabular-nums; }
  .direction { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 5px 0; }
  .who { font-weight: 700; }
  .missing-direction { color: #b3261e; font-weight: 700; }
  .note { margin-top: 10px; font-size: 12px; color: #5a6068; font-style: italic; }
  footer { margin-top: 24px; font-size: 11px; color: #80868e; }
  @media print {
    body { padding: 0; }
    .shot { border-bottom: 1px solid #c9ced4; }
  }
`;

function frameMarkup(shot: StudioShot): string {
  const frame = safeFrame(shot.frame);
  return frame
    ? `<img class="frame" src="${frame}" alt="Opptak ${shot.number}">`
    : '<div class="frame missing">Ingen ramme lagret</div>';
}

function directionsMarkup(shot: StudioShot): string {
  if (shot.directions.length === 0) {
    // Said plainly rather than left blank: a shot with nobody directed is
    // the thing this sheet exists to catch.
    return '<p class="missing-direction">Ingen har fått beskjed i dette opptaket.</p>';
  }
  return shot.directions.map(direction => {
    const action = isUsableDirection(direction)
      ? escape(direction.action)
      : '<span class="missing-direction">Mangler beskjed</span>';
    return `<div class="direction"><span class="who">${escape(direction.who)}</span><span>${action}</span></div>`;
  }).join('\n');
}

/**
 * The whole board, in order, for the director and the crew.
 */
export function boardSheet(board: Storyboard): string {
  const shots = board.shots.map(shot => `
    <section class="shot">
      <div>${frameMarkup(shot)}</div>
      <div>
        <div class="number">Opptak ${shot.number}</div>
        <h2>${escape(shot.name)}</h2>
        <div class="crew">${escape(shotSummary(shot))}</div>
        ${directionsMarkup(shot)}
        ${shot.note ? `<p class="note">${escape(shot.note)}</p>` : ''}
      </div>
    </section>`).join('\n');

  const count = board.shots.length;
  return document_(
    escape(board.title),
    `<h1>${escape(board.title)}</h1>
     <p class="meta">${count} ${count === 1 ? 'opptak' : 'opptak'} · ${asClock(boardDuration(board))} totalt${
       board.forWhom ? ` · ${escape(board.forWhom)}` : ''}</p>`,
    count > 0 ? shots : '<p class="meta">Ingen opptak lagret ennå.</p>',
  );
}

/**
 * One person's sheet: their shots, their lines, nothing else.
 *
 * The number is kept from the board so it matches what is called out on the
 * day — an extra hearing "opptak fire" needs to find opptak fire.
 */
export function personSheet(board: Storyboard, markId: string): string {
  const entries = callSheetFor(board, markId);
  const who = entries[0]?.who ?? peopleOnBoard(board).find(p => p.markId === markId)?.who ?? markId;
  const frames = new Map(board.shots.map(shot => [shot.number, shot]));

  const rows = entries.map(entry => {
    const shot = frames.get(entry.number);
    return `
    <section class="shot">
      <div>${shot ? frameMarkup(shot) : '<div class="frame missing">Ingen ramme lagret</div>'}</div>
      <div>
        <div class="number">Opptak ${entry.number}</div>
        <h2>${escape(entry.name)}</h2>
        <div class="direction"><span class="who">Du</span><span>${
          entry.action.trim() ? escape(entry.action) : '<span class="missing-direction">Mangler beskjed</span>'
        }</span></div>
      </div>
    </section>`;
  }).join('\n');

  return document_(
    `${escape(who)} · ${escape(board.title)}`,
    `<h1>${escape(who)}</h1>
     <p class="meta">${escape(board.title)} · ${entries.length} ${entries.length === 1 ? 'opptak' : 'opptak'}</p>`,
    entries.length > 0 ? rows : '<p class="meta">Du er ikke med i noen opptak ennå.</p>',
  );
}

function document_(title: string, header: string, body: string): string {
  return `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<header>${header}</header>
${body}
<footer>Laget i Virtualstudio</footer>
</body>
</html>`;
}
