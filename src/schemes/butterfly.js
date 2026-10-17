// «Метелик» (SHUA, eq-03) — вигляд збоку, за фото gym/my-photos/metelyk.png.
// Регулювання: позиція ручок — диск із фіксатором зверху над головою;
// висота сидіння — шпилька на стійці під сидінням. Обидва — ⚠ приблизно (по 5).

import {
  C, el, text, svgRoot, pickAdj, posValue, zone, ring, badge, ruler, guide, warnBar, legendLine,
} from './svg.js';

export const id = 'butterfly';
export const ADJUSTMENTS = ['handles-pos', 'seat'];
export const HINTS = {
  'handles-pos': { first: 'ближче до грудей', last: 'найширше розведені' },
  seat: { first: 'найнижче', last: 'найвище' },
};

const W = 360;
const FLOOR = 412;
// Сидіння: верх подушки для позиції k (1 — найнижче).
const SEAT_LOW = 352;
const SEAT_HIGH = 282;

function machine() {
  return [
    // підлога й основа
    el('line', { x1: 8, y1: FLOOR + 1, x2: 262, y2: FLOOR + 1, stroke: C.floor, 'stroke-width': 3 }),
    el('rect', { x: 14, y: FLOOR - 13, width: 226, height: 12, rx: 4, fill: C.frame }),
    // стійка з вагою (ззаду)
    el('rect', { x: 16, y: 70, width: 76, height: FLOOR - 82, rx: 9, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
    el('rect', { x: 26, y: 88, width: 56, height: FLOOR - 120, rx: 5, fill: C.panel, stroke: C.panelEdge }),
    el('line', { x1: 54, y1: 112, x2: 54, y2: FLOOR - 50, stroke: C.frameEdge, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    el('rect', { x: 34, y: 112, width: 13, height: 22, rx: 2, fill: '#f4f6f5', opacity: 0.85 }),
    // верхня балка
    el('rect', { x: 46, y: 58, width: 150, height: 14, rx: 7, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
    // передня похила колона
    el('polygon', { points: `154,${FLOOR - 12} 169,${FLOOR - 12} 144,72 129,72`, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
    // кронштейн і спинка
    el('rect', { x: 146, y: 196, width: 16, height: 10, fill: C.frame }),
    el('rect', { x: 158, y: 150, width: 22, height: 116, rx: 10, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5 }),
    // важіль із ручкою (звисає перед грудьми)
    el('path', { d: 'M158 74 L222 86 L228 156', fill: 'none', stroke: C.frame, 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    el('rect', { x: 221, y: 148, width: 15, height: 60, rx: 7.5, fill: C.rubber }),
  ].join('');
}

// Диск позиції ручок (зверху) з фіксатором під балкою.
function handleDisc() {
  return el('ellipse', { cx: 158, cy: 54, rx: 31, ry: 9, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 })
    + el('ellipse', { cx: 158, cy: 52, rx: 9, ry: 3, fill: C.metalEdge })
    + el('rect', { x: 155, y: 72, width: 6, height: 8, fill: C.metalEdge })
    + el('circle', { cx: 158, cy: 84, r: 5.5, fill: '#d64545', stroke: '#8f2525', 'stroke-width': 1.5 });
}

// Вид зверху (окремий ряд під машиною): як розведені ручки на позиції k.
// 1 — ручки перед грудьми, близько одна до одної; остання — розведені в сторони.
function topView(adj, sel, y0) {
  const cx = 160;
  const cy = y0 + 52;
  const n = adj.count;
  const len = 80;
  const ang = (k) => (10 + ((k - 1) / Math.max(n - 1, 1)) * 72) * Math.PI / 180;
  const at = (k, r, side = 1) => [cx + side * Math.sin(ang(k)) * r, cy + Math.cos(ang(k)) * r];
  const parts = [];
  parts.push(el('line', { x1: 10, y1: y0, x2: W - 10, y2: y0, stroke: '#dde3e0', 'stroke-width': 1.5 }));
  parts.push(text(14, y0 + 22, `${adj.label} — вигляд зверху`, { 'font-size': 14, 'font-weight': 700, fill: C.ink }));
  // спинка і голова (вид зверху), людина дивиться вниз
  parts.push(el('rect', { x: cx - 30, y: cy - 20, width: 60, height: 11, rx: 5.5, fill: C.pad }));
  parts.push(el('ellipse', { cx, cy: cy - 2, rx: 22, ry: 7, fill: '#e3e8e6', stroke: '#9aa6a2', 'stroke-width': 1.2 }));
  parts.push(el('circle', { cx, cy: cy - 2, r: 8, fill: '#f4f6f5', stroke: '#9aa6a2', 'stroke-width': 1.5 }));
  for (let k = 1; k <= n; k++) {
    const on = sel === k;
    const [x, y] = at(k, len);
    const [nx, ny] = at(k, len + 17);
    const [lx, ly] = at(k, len, -1);
    const hint = k === 1 ? `1 — ${HINTS['handles-pos'].first}` : k === n ? `${n} — ${HINTS['handles-pos'].last}` : String(k);
    const ray = (x2, y2, faint) => el('line', {
      x1: cx, y1: cy, x2, y2,
      stroke: on ? C.accent : '#b8c2be', 'stroke-width': on ? 5 : 1.5,
      'stroke-dasharray': on ? null : '4 4', 'stroke-linecap': 'round', opacity: faint ? 0.55 : 1,
    });
    const grip = (gx, gy, faint) => el('rect', { x: gx - 5, y: gy - 9, width: 10, height: 18, rx: 5, fill: C.rubber, opacity: faint ? 0.6 : 1 });
    parts.push(el('g', { 'data-pos': `${adj.id}:${k}`, class: on ? 'sc-tick is-on' : 'sc-tick' },
      el('title', {}, hint)
      + ray(x, y) + ray(lx, ly, true)
      + (on ? grip(x, y) + grip(lx, ly, true) : '')
      + el('circle', { cx: nx, cy: ny, r: on ? 11 : 9.5, fill: on ? C.accent : '#ffffff', stroke: on ? C.accent : '#9aa6a2', 'stroke-width': 1.5 })
      + text(nx, ny + 4.5, k, { 'font-size': on ? 14 : 12, 'font-weight': on ? 800 : 600, 'text-anchor': 'middle', fill: on ? '#fff' : C.ink })));
  }
  parts.push(el('circle', { cx, cy, r: 4.5, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 }));
  const h = HINTS['handles-pos'];
  parts.push(text(14, y0 + 172, `1 — ${h.first} … ${n} — ${h.last}`, { 'font-size': 12.5, fill: C.ink }));
  return { svg: parts.join(''), height: 184 };
}

/** SVG «Метелика» зі значеннями клієнта. values: {[adjustmentId]: value}. */
export function draw(values = {}, adjustments = []) {
  const hp = pickAdj(adjustments, 'handles-pos');
  const seat = pickAdj(adjustments, 'seat');
  const hpVal = posValue(hp, values);
  const seatVal = posValue(seat, values);
  const parts = [machine()];

  // --- сидіння (рухається з позицією) ---
  const yOf = (k) => (seat
    ? SEAT_LOW - ((k - 1) / Math.max(seat.count - 1, 1)) * (SEAT_LOW - SEAT_HIGH)
    : (SEAT_LOW + SEAT_HIGH) / 2);
  const seatTop = seatVal ? yOf(seatVal) : (SEAT_LOW + SEAT_HIGH) / 2;
  const seatParts = [
    el('rect', { x: 200, y: seatTop + 14, width: 10, height: FLOOR - 14 - seatTop - 14, fill: C.metal, stroke: C.metalEdge }),
    el('rect', { x: 196, y: FLOOR - 52, width: 18, height: 40, rx: 3, fill: C.frame, stroke: C.frameEdge }),
    el('rect', { x: 166, y: seatTop, width: 82, height: 16, rx: 8, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5, opacity: seatVal ? 1 : 0.75 }),
    // шпилька-фіксатор
    el('rect', { x: 214, y: FLOOR - 37, width: 9, height: 6, fill: C.metalEdge }),
    el('circle', { cx: 228, cy: FLOOR - 34, r: 6.5, fill: '#d64545', stroke: '#8f2525', 'stroke-width': 1.5 }),
  ];
  if (seat) {
    parts.push(zone('seat', `${seat.label}: змінити`,
      ring(186, FLOOR - 62, 54, 48) + seatParts.join('')
      + ruler(seat, { x: 262, yOf: (k) => yOf(k) + 8, selected: seatVal, hints: HINTS })
      + (seatVal ? guide(250, seatTop + 8, 256, seatTop + 8) : '')
      + badge(seat, { x: 252, y: 196, w: 102, h: 64, value: seatVal ? String(seatVal) : null, raw: seatVal })));
  } else {
    parts.push(seatParts.join(''));
  }

  // --- позиція ручок (диск зверху) ---
  if (hp) {
    parts.push(zone('handles-pos', `${hp.label}: змінити`,
      ring(118, 36, 80, 58) + handleDisc()
      + guide(198, 50, 252, 40)
      + badge(hp, { x: 252, y: 10, w: 102, h: 64, value: hpVal ? String(hpVal) : null, raw: hpVal })));
  } else {
    parts.push(handleDisc());
  }

  // --- легенда, вид зверху на ручки й позначка ⚠ ---
  let y = FLOOR + 24;
  if (seat) { parts.push(legendLine(seat, HINTS, 12, y)); y += 14; }
  if (hp) {
    const tv = topView(hp, hpVal, y);
    parts.push(zone('handles-pos', `${hp.label}: змінити`, tv.svg));
    y += tv.height;
  }
  if ((hp && (hp.approx || hp.unknown)) || (seat && (seat.approx || seat.unknown))) {
    parts.push(warnBar(10, y - 6, W - 20, '⚠ приблизно — уточнити в залі: кількість позицій'));
    y += 26;
  }
  return svgRoot(W, y + 4, 'Схема «Метелика»: позиція ручок і висота сидіння', parts.join(''));
}
