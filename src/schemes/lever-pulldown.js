// Вертикальна тяга (важільна, на дисках, SHUA, eq-21) — за фото
// gym/my-photos/tyaga-vazhilna.png і tyaga-vazhilna-khvaty.png.
// Регулювання: висота сидіння (5, ⚠ невідомо) і хват — три позиції рук на ручці:
// зелена — верхня горизонтальна частина, червона — вигин угору, помаранчева — внутрішній нижній кінець.
// Хвату «збоку» немає (за словами автора — непрактичний).

import {
  C, el, esc, text, svgRoot, pickAdj, posValue, optValue, zone, ring, badge, ruler, guide, warnBar, legendLine,
} from './svg.js';

export const id = 'lever-pulldown';
export const ADJUSTMENTS = ['seat', 'grip'];
export const HINTS = { seat: { first: 'найнижче', last: 'найвище' } };

const W = 360;
const FLOOR = 300;
const SEAT_LOW = 246;
const SEAT_HIGH = 178;

// --- ручка, вигляд спереду (права; ліва — дзеркально) ---
// Частини ручки за фото: стійка-вигин угору до кріплення, нижня планка, зовнішній вигин, верхня планка.
const GRIP_PATHS = {
  red: 'M204 396 L204 440 Q204 458 222 458',       // вигин, що йде вгору
  orange: 'M222 458 L262 458',                      // внутрішній нижній кінець
  green: 'M300 400 L228 400',                       // верхня горизонтальна частина
};
const GRIP_REST = 'M262 458 L300 458 Q326 458 326 432 L326 426 Q326 400 300 400';
const GRIP_MARK = { red: [204, 426], orange: [242, 458], green: [264, 400] };
const DEFAULT_COLORS = { green: '#2e9d4f', red: '#d63b3b', orange: '#f08a1c' };
const ALL_PATH = `${GRIP_PATHS.red} ${GRIP_PATHS.orange} ${GRIP_REST} ${GRIP_PATHS.green}`;

const mirror = (inner) => `${inner}${el('g', { transform: `translate(${W} 0) scale(-1 1)` }, inner)}`;

function handleBase() {
  return mirror(
    // кріплення до важеля
    el('path', { d: 'M204 389 L200 372', stroke: C.frame, 'stroke-width': 10, 'stroke-linecap': 'round' })
    + el('path', { d: ALL_PATH, fill: 'none', stroke: C.rubber, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    + el('circle', { cx: 204, cy: 389, r: 7.5, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 })
    + el('circle', { cx: 225, cy: 400, r: 5.5, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 }),
  );
}

function gripZone(adj, opt, selected) {
  const color = opt.color || DEFAULT_COLORS[opt.id] || C.accent;
  const d = GRIP_PATHS[opt.id];
  const on = selected && selected.id === opt.id;
  let art = '';
  if (d) {
    const [mx, my] = GRIP_MARK[opt.id];
    const seg = (on
      ? el('path', { d, fill: 'none', stroke: color, 'stroke-width': 26, 'stroke-linecap': 'round', opacity: 0.28 })
      : '')
      + el('path', {
        d, fill: 'none', stroke: color, 'stroke-width': on ? 12 : 9, 'stroke-linecap': 'round',
        opacity: on || !selected ? 1 : 0.45,
      })
      + (on ? el('circle', { cx: mx, cy: my, r: 9, fill: '#ffffff', stroke: color, 'stroke-width': 4 }) : '');
    art = mirror(seg);
  }
  return art;
}

/** Підпис-кнопка варіанта хвату під малюнком. */
function gripChip(opt, i, selected) {
  const color = opt.color || DEFAULT_COLORS[opt.id] || C.accent;
  const on = selected && selected.id === opt.id;
  const x = 12 + i * 113;
  const y = 492;
  const label = String(opt.label);
  const size = Math.max(10, Math.min(14, 72 / (label.length * 0.6)));
  return el('rect', {
    x, y, width: 107, height: 34, rx: 17,
    fill: on ? color : '#ffffff', stroke: color, 'stroke-width': on ? 3 : 2,
  })
    + el('circle', { cx: x + 17, cy: y + 17, r: 8, fill: on ? '#ffffff' : color })
    + text(x + 31, y + 22, label, { 'font-size': size, 'font-weight': on ? 800 : 600, fill: on ? '#ffffff' : C.ink });
}

function machine() {
  return [
    el('line', { x1: 8, y1: FLOOR + 1, x2: 250, y2: FLOOR + 1, stroke: C.floor, 'stroke-width': 3 }),
    el('rect', { x: 18, y: FLOOR - 12, width: 214, height: 12, rx: 4, fill: C.frame }),
    // рама (похила колона)
    el('polygon', { points: `58,${FLOOR - 12} 78,${FLOOR - 12} 100,52 82,52`, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
    // диск на втулці позаду
    el('rect', { x: 30, y: 44, width: 22, height: 9, fill: C.metal, stroke: C.metalEdge }),
    el('circle', { cx: 40, cy: 50, r: 28, fill: '#2a2f2e', stroke: '#141817', 'stroke-width': 2 }),
    el('circle', { cx: 40, cy: 50, r: 19, fill: 'none', stroke: '#4a5250', 'stroke-width': 2 }),
    el('circle', { cx: 40, cy: 50, r: 6, fill: C.metal, stroke: C.metalEdge }),
    // важіль: від диска через вісь уперед до ручки
    el('path', { d: 'M40 48 L92 54 L208 86 L216 100', fill: 'none', stroke: C.frame, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    el('circle', { cx: 92, cy: 54, r: 8, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 }),
    // упор для стегон
    el('path', { d: 'M88 140 L158 140', stroke: C.frame, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    el('circle', { cx: 168, cy: 142, r: 14, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5 }),
  ].join('');
}

// Ручка, вигляд збоку (на кінці важеля).
const sideHandle = () => el('rect', { x: 202, y: 96, width: 46, height: 14, rx: 7, fill: C.rubber });

/** SVG вертикальної тяги зі значеннями клієнта. */
export function draw(values = {}, adjustments = []) {
  const seat = pickAdj(adjustments, 'seat');
  const grip = pickAdj(adjustments, 'grip');
  const seatVal = posValue(seat, values);
  const gripVal = optValue(grip, values);
  const parts = [machine()];

  // --- сидіння ---
  const yOf = (k) => (seat
    ? SEAT_LOW - ((k - 1) / Math.max(seat.count - 1, 1)) * (SEAT_LOW - SEAT_HIGH)
    : (SEAT_LOW + SEAT_HIGH) / 2);
  const seatTop = seatVal ? yOf(seatVal) : (SEAT_LOW + SEAT_HIGH) / 2;
  const seatParts = [
    el('rect', { x: 156, y: seatTop + 14, width: 10, height: FLOOR - 12 - seatTop - 14, fill: C.metal, stroke: C.metalEdge }),
    el('rect', { x: 152, y: FLOOR - 38, width: 18, height: 26, rx: 3, fill: C.frame, stroke: C.frameEdge }),
    el('path', { d: `M78 ${FLOOR - 24} L152 ${FLOOR - 24}`, stroke: C.frame, 'stroke-width': 8 }),
    el('rect', { x: 118, y: seatTop, width: 88, height: 15, rx: 7.5, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5, opacity: seatVal ? 1 : 0.75 }),
    el('rect', { x: 170, y: FLOOR - 29, width: 9, height: 6, fill: C.metalEdge }),
    el('circle', { cx: 184, cy: FLOOR - 26, r: 6.5, fill: '#d64545', stroke: '#8f2525', 'stroke-width': 1.5 }),
  ];
  if (seat) {
    parts.push(zone('seat', `${seat.label}: змінити`,
      ring(142, FLOOR - 48, 54, 40) + seatParts.join('')
      + ruler(seat, { x: 236, yOf: (k) => yOf(k) + 7.5, selected: seatVal, hints: HINTS })
      + (seatVal ? guide(208, seatTop + 7.5, 230, seatTop + 7.5) : '')
      + badge(seat, { x: 250, y: 112, w: 104, h: 62, value: seatVal ? String(seatVal) : null, raw: seatVal })));
  } else {
    parts.push(seatParts.join(''));
  }

  // --- хват: збоку на важелі + великий малюнок ручки спереду ---
  if (grip) {
    const opts = (grip.options || []).filter((o) => !o.deleted);
    const color = gripVal ? (gripVal.color || DEFAULT_COLORS[gripVal.id] || C.accent) : null;
    parts.push(zone('grip', `${grip.label}: змінити`,
      ring(194, 84, 62, 36, 10) + sideHandle()
      + badge(grip, { x: 250, y: 12, w: 104, h: 62, value: gripVal ? gripVal.label : null, raw: gripVal ? gripVal.id : null, swatch: color, valueSize: 22 })
      + guide(250, 60, 238, 84)));

    parts.push(el('line', { x1: 10, y1: 336, x2: W - 10, y2: 336, stroke: '#dde3e0', 'stroke-width': 1.5 }));
    parts.push(text(14, 358, `${grip.label} — де брати ручку`, { 'font-size': 15, 'font-weight': 700, fill: C.ink }));
    parts.push(text(W - 14, 358, 'вигляд спереду', { 'text-anchor': 'end', 'font-size': 11.5, fill: C.muted }));
    // центральна рама між ручками
    parts.push(el('rect', { x: 170, y: 378, width: 20, height: 102, rx: 4, fill: C.frame, opacity: 0.35 }));
    parts.push(handleBase());
    opts.forEach((opt, i) => {
      const on = gripVal && gripVal.id === opt.id;
      parts.push(el('g', {
        'data-adj': 'grip', 'data-opt': opt.id,
        class: `sc-zone sc-grip${on ? ' is-selected' : ''}`,
        role: 'button', tabindex: 0, 'aria-label': `${grip.label}: ${opt.label}`,
      }, el('title', {}, esc(opt.label)) + gripZone(grip, opt, gripVal) + (i < 3 ? gripChip(opt, i, gripVal) : '')));
    });
  } else {
    parts.push(sideHandle());
  }

  // --- легенда й позначка ⚠ ---
  let y = grip ? 548 : FLOOR + 24;
  if (seat) { parts.push(legendLine(seat, HINTS, 12, y)); y += 12; }
  if (seat && (seat.approx || seat.unknown)) {
    parts.push(warnBar(10, y, W - 20, '⚠ приблизно — уточнити в залі: позиції сидіння'));
    y += 28;
  }
  return svgRoot(W, y + 6, 'Схема вертикальної тяги: висота сидіння і хват', parts.join(''));
}

/** Малюнок ручки з підсвіченою позицією хвату (для вибору в нижній панелі). */
export function optionIcon(adjustment, optionId) {
  if (adjustment.id !== 'grip' || !GRIP_PATHS[optionId]) return '';
  const opt = (adjustment.options || []).find((o) => o.id === optionId) || { id: optionId };
  const inner = el('path', { d: ALL_PATH, fill: 'none', stroke: C.rubber, 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    + el('circle', { cx: 204, cy: 389, r: 7.5, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 })
    + el('path', { d: GRIP_PATHS[optionId], fill: 'none', stroke: opt.color || DEFAULT_COLORS[optionId], 'stroke-width': 12, 'stroke-linecap': 'round' });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="190 378 150 92" width="120" height="74" class="grip-icon" aria-hidden="true">${inner}</svg>`;
}
