// «Метелик» (SHUA, eq-03) — за фото gym/my-photos/metelyk.png, ракурс ¾ (новий контракт art/MARKERS/PICKERS).
// Стійка з вагою позаду, зверху балка з диском позиції ручок (фіксатор), два важелі звисають до
// вертикальних ручок; спинка на похилій колоні; сидіння на стійці зі шпилькою.
// Регулювання: позиція ручок — диск зверху; висота сидіння — шпилька на стійці. Обидва — ⚠ приблизно (по 5).
// Вправи: «Зведення рук» (eq-03-a) — спиною до спинки, руки розведені на ручках;
// «Відведення рук назад» (eq-03-b) — грудьми до спинки, ручки попереду.

import { C, el, esc, text } from './svg.js';
import {
  P3, scene3d, renderScene, artModule, beam, beams, box, disc, ball, tower, grip, floorShadow,
  seatOnPost, human, heightPicker,
} from './upper.js';

export const id = 'butterfly';
export const ADJUSTMENTS = ['handles-pos', 'seat'];
export const HINTS = {
  'handles-pos': { first: 'ближче до грудей', last: 'найширше розведені' },
  seat: { first: 'найнижче', last: 'найвище' },
};

const SEAT_TOP = 46;
const FR = P3.frame;

/** Вигляд зверху: як розведені ручки на позиції k (1 — перед грудьми, остання — найширше). */
function handlesPicker(value, adj) {
  const n = Math.max(1, Math.min(12, Number(adj.count) || 5));
  const sel = Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= n ? Number(value) : null;
  const W = 330;
  const H = 214;
  const cx = 165;
  const cy = 44;
  const len = 104;
  const ang = (k) => (12 + ((k - 1) / Math.max(n - 1, 1)) * 70) * (Math.PI / 180);
  const at = (k, r, s) => [cx + s * Math.sin(ang(k)) * r, cy + Math.cos(ang(k)) * r];
  const r1 = (v) => Math.round(v * 10) / 10;
  const parts = [];
  // спинка і людина зверху (дивиться вниз)
  parts.push(el('rect', { x: cx - 36, y: cy - 30, width: 72, height: 12, rx: 6, fill: P3.padShua }));
  parts.push(el('ellipse', { cx, cy: cy - 6, rx: 27, ry: 10, fill: P3.shirt }));
  parts.push(el('circle', { cx, cy: cy - 6, r: 10, fill: P3.skin, stroke: '#b58d6c', 'stroke-width': 1.2 }));
  for (let k = 1; k <= n; k++) {
    const on = sel === k;
    const hint = k === 1 ? `1 — ${HINTS['handles-pos'].first}` : k === n ? `${n} — ${HINTS['handles-pos'].last}` : String(k);
    let inner = el('title', {}, esc(hint));
    for (const s of [1, -1]) {
      const [x, y] = at(k, len, s);
      inner += el('line', {
        x1: cx, y1: cy, x2: r1(x), y2: r1(y), stroke: on ? C.accent : '#b8c2be',
        'stroke-width': on ? 5 : 2, 'stroke-linecap': 'round', opacity: s === 1 || on ? 1 : 0.6,
      });
      if (on) inner += el('rect', { x: r1(x - 5), y: r1(y - 9), width: 10, height: 18, rx: 5, fill: P3.rubber });
    }
    const [nx, ny] = at(k, len + 22, 1);
    inner += el('circle', { cx: r1(nx), cy: r1(ny), r: 14, fill: on ? C.accent : '#ffffff', stroke: on ? C.accent : '#9aa6a2', 'stroke-width': 1.5 })
      + text(r1(nx), r1(ny + 5.5), k, { 'font-size': 15, 'font-weight': 800, 'text-anchor': 'middle', fill: on ? '#ffffff' : C.ink });
    parts.push(el('g', { 'data-pick': k, class: on ? 'pk is-on' : 'pk', 'aria-label': hint }, inner));
  }
  parts.push(el('circle', { cx, cy, r: 5, fill: P3.metal, stroke: C.metalEdge, 'stroke-width': 2 }));
  const h = HINTS['handles-pos'];
  parts.push(text(12, H - 12, `1 — ${h.first} … ${n} — ${h.last}`, { 'font-size': 13, fill: C.ink }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="picker-svg" role="img"`
    + ` aria-label="${esc(adj.label)}: вигляд зверху" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">`
    + `${el('rect', { x: 0, y: 0, width: W, height: H, fill: P3.bg })}${parts.join('')}</svg>`;
}

export const PICKERS = {
  'handles-pos': handlesPicker,
  seat: heightPicker('seat', HINTS),
};

function build(exerciseId, mini) {
  const back = exerciseId === 'eq-03-b';
  const S = scene3d({ yaw: back ? 62 : 30, pitch: 24, mini });
  floorShadow(S, 0, -34, 72, 80);
  tower(S, [-30, -104, 0], [30, -72, 190]);
  beam(S, [0, -72, 3], [0, 40, 3], 8, 6, FR);
  beam(S, [-30, 36, 3], [30, 36, 3], 8, 6, FR);
  // верхня балка з диском позиції ручок і фіксатором
  beam(S, [0, -86, 196], [0, -22, 196], 10, 10, FR);
  disc(S, [0, -26, 205], [0, 0, 1], 14, P3.metal, { thick: 4 });
  ball(S, [0, -12, 196], 3, P3.pin, { kind: 'detail' });
  S.mark('handles-pos', [0, -26, 206]);
  // похила колона зі спинкою
  beam(S, [0, -60, 2], [0, -38, 190], 9, 9, FR);
  beam(S, [0, -28, 78], [0, -30, 136], 32, 8, P3.padShua);
  beam(S, [0, -44, 108], [0, -32, 108], 6, 6, FR);
  S.mark('seat', seatOnPost(S, { top: SEAT_TOP, color: P3.padShua }));
  for (const s of [-1, 1]) {
    box(S, [s * 7 - 4, -30, 184], [s * 7 + 4, -22, 192], FR);
    if (back) {
      beams(S, [[s * 7, -26, 188], [s * 26, -50, 186], [s * 26, -52, 134]], 6, 6, FR);
      grip(S, [[s * 26, -52, 136], [s * 26, -52, 102]], { w: 5.5 });
    } else {
      beams(S, [[s * 7, -26, 188], [s * 44, -22, 186], [s * 45, 16, 150]], 6, 6, FR);
      grip(S, [[s * 45, 16, 150], [s * 45, 17, 110]], { w: 5.5 });
    }
  }
  if (back) {
    human(S, {
      face: [0, -1, 0], pelvis: [0, -4, SEAT_TOP + 9], lean: 0.12,
      hand: (s) => [s * 26, -52, 114],
      elbowPole: (s) => [s, 0.2, -0.3],
      ankle: (s) => [s * 18, -44, 9], kneePole: () => [0, -0.35, 1], toe: () => [0, -1, 0],
    });
  } else {
    human(S, {
      pelvis: [0, -6, SEAT_TOP + 9],
      hand: (s) => [s * 45, 16, 126],
      elbowPole: (s) => [s, -0.3, -0.3],
      ankle: (s) => [s * 18, 42, 9], kneePole: () => [0, 0.35, 1],
    });
  }
  return renderScene(S, back
    ? 'Схема «Метелика» — відведення рук назад: грудьми до спинки, ручки попереду'
    : 'Схема «Метелика» — зведення рук: спиною до спинки, руки на ручках');
}

const mod = artModule({ id, ADJUSTMENTS, HINTS, PICKERS, build });
export const art = mod.art;
export const MARKERS = mod.MARKERS;
