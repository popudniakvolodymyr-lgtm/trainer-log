// Збірка схем тренажерів для ніг (таск 07) — вигляд збоку, за фото gym/photos/04…10.
// Кожен елемент SCHEMES — модуль { id: schemeId з каталогу, ADJUSTMENTS, HINTS, draw(values, adjustments) }.
// Без регулювань (малюється лише тренажер): leg-press, seated-leg-press, hip-adduction, hip-abduction, hack-squat.
// З регулюваннями (усі — позиції 1…5, ⚠ приблизно): leg-curl (валік по колу шарніра),
// leg-extension (валік, нахил, спинка вперед-назад).

import {
  C, el, esc, text, svgRoot, pickAdj, posValue, zone, ring, badge, guide, warnBar,
} from './svg.js';

const W = 360;
const SKIN = '#e6c3a6';
const CLOTH = '#5d6973';
const SHOE = '#2b3230';

// --- геометрія ---
const r1 = (n) => Math.round(n * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;
/** Точка від p під кутом deg (математичний: 0 — вправо, 90 — вгору) на відстані len. */
const polar = (p, deg, len) => [r1(p[0] + Math.cos(rad(deg)) * len), r1(p[1] - Math.sin(rad(deg)) * len)];
const pts = (list) => list.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ');

// --- цеглинки ---
const line = (a, b, w, color, extra = {}) => el('line', {
  x1: r1(a[0]), y1: r1(a[1]), x2: r1(b[0]), y2: r1(b[1]),
  stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', ...extra,
});
/** Товстий відрізок; edge — колір обведення (накладається тонким контуром навколо). */
const bar = (a, b, w, color, { edge = null, ...extra } = {}) => (edge
  ? line(a, b, w + 3, edge) + line(a, b, w, color, extra)
  : line(a, b, w, color, extra));
const poly = (list, w, color) => el('polyline', {
  points: pts(list), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
});
const dot = (p, r, fill, stroke = null, sw = 2) => el('circle', {
  cx: r1(p[0]), cy: r1(p[1]), r, fill, stroke, 'stroke-width': stroke ? sw : null,
});
const metalDot = (p, r) => dot(p, r, C.metal, C.metalEdge, 2);
const floorLine = (y) => el('line', { x1: 8, y1: y, x2: W - 8, y2: y, stroke: C.floor, 'stroke-width': 3 });
const caption = (s) => text(14, 24, s, { 'font-size': 13.5, 'font-weight': 700, fill: C.muted });

/** Стійка з вагою: графітовий корпус, сіра панель, шпилька. */
function stack(x, y, w, h) {
  return el('rect', { x, y, width: w, height: h, rx: 10, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 })
    + el('rect', { x: x + 9, y: y + 16, width: w - 18, height: h - 40, rx: 5, fill: C.panel, stroke: C.panelEdge })
    + el('line', { x1: x + w / 2, y1: y + 36, x2: x + w / 2, y2: y + h - 36, stroke: C.frameEdge, 'stroke-width': 3, 'stroke-linecap': 'round' })
    + el('rect', { x: x + 14, y: y + 36, width: 11, height: 22, rx: 2, fill: '#f4f6f5', opacity: 0.85 });
}

/** Спрощена людина збоку. Усі точки — суглоби. */
function human({ hip, shoulder, knee, ankle, toe, elbow, hand }) {
  const dx = shoulder[0] - hip[0];
  const dy = shoulder[1] - hip[1];
  const len = Math.hypot(dx, dy) || 1;
  const head = [shoulder[0] + (dx / len) * 22, shoulder[1] + (dy / len) * 22];
  return [
    poly([hip, knee, ankle], 15, CLOTH),
    bar(ankle, toe, 9, SHOE),
    bar(hip, shoulder, 26, CLOTH),
    poly([shoulder, elbow, hand], 10, CLOTH),
    dot(hand, 5, SKIN),
    dot(head, 12, SKIN, '#b9906f', 1.2),
  ].join('');
}

/** Підпис регулювання на бейджі: без дужок, не довше за n символів. */
function shortLabel(adj, n = 13) {
  const base = String(adj.label || '').replace(/\s*\(.*?\)/g, '').trim() || String(adj.label || '');
  return base.length > n ? `${base.slice(0, n - 1)}…` : base;
}
const withShortLabel = (adj, n) => ({ ...adj, label: shortLabel(adj, n) });

/** Рядок із п'яти позицій: підпис, пояснення крайніх позицій, кружечки 1…count. */
function chipRow(adj, sel, hints, y) {
  const h = hints[adj.id] || {};
  const n = adj.count;
  const parts = [];
  parts.push(text(14, y + 14, adj.label, { 'font-size': 13.5, 'font-weight': 700, fill: C.ink }));
  parts.push(text(14, y + 31, `1 — ${h.first || 'перша'} … ${n} — ${h.last || 'остання'}`, { 'font-size': 11.5, fill: C.muted }));
  const x0 = 40;
  const step = (W - 2 * x0) / Math.max(n - 1, 1);
  const cy = y + 56;
  parts.push(el('line', { x1: x0, y1: cy, x2: x0 + step * (n - 1), y2: cy, stroke: '#cfd7d3', 'stroke-width': 3, 'stroke-linecap': 'round' }));
  for (let k = 1; k <= n; k++) {
    const on = sel === k;
    const cx = x0 + step * (k - 1);
    const hint = k === 1 ? `1 — ${h.first}` : k === n ? `${n} — ${h.last}` : String(k);
    parts.push(el('g', { 'data-pos': `${adj.id}:${k}`, class: on ? 'sc-tick is-on' : 'sc-tick' },
      el('title', {}, esc(hint))
      + el('circle', { cx, cy, r: on ? 17 : 15, fill: on ? C.accent : '#ffffff', stroke: on ? C.accent : '#9aa6a2', 'stroke-width': on ? 2.5 : 1.8 })
      + text(cx, cy + 5.5, k, { 'font-size': on ? 17 : 14.5, 'font-weight': on ? 800 : 600, 'text-anchor': 'middle', fill: on ? '#ffffff' : C.ink })));
  }
  return parts.join('');
}
const ROW_H = 74;

/** Стрілка (лінія з трикутним наконечником). */
function arrow(a, b, color, w = 4) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const hl = 11;
  const p1 = [b[0] - hl * Math.cos(ang - 0.45), b[1] - hl * Math.sin(ang - 0.45)];
  const p2 = [b[0] - hl * Math.cos(ang + 0.45), b[1] - hl * Math.sin(ang + 0.45)];
  return bar(a, [b[0] - hl * 0.7 * Math.cos(ang), b[1] - hl * 0.7 * Math.sin(ang)], w, color)
    + el('polygon', { points: pts([b, p1, p2]), fill: color });
}

const approxIn = (adjs) => adjs.some((a) => a && (a.approx || a.unknown));

// ======================================================================
// 1. Жим ногами лежачи (eq-04, leg-press): нахилена лава, візок з платформою й дисками. Без регулювань.
// ======================================================================
const legPress = {
  id: 'leg-press',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const hip = [142, 214];
    const shoulder = [70, 158];
    const u = [hip[0] - shoulder[0], hip[1] - shoulder[1]];
    const ul = Math.hypot(u[0], u[1]);
    const nrm = [-u[1] / ul, u[0] / ul]; // донизу-вліво від тіла
    const padA = [shoulder[0] + nrm[0] * 17 - 22 * u[0] / ul, shoulder[1] + nrm[1] * 17 - 22 * u[1] / ul];
    const padB = [hip[0] + nrm[0] * 17 + 12 * u[0] / ul, hip[1] + nrm[1] * 17 + 12 * u[1] / ul];
    const railA = [150, 268];
    const railB = [304, 84];
    const c = [262, 134]; // центр платформи на рейці
    const pn = [0.77, 0.64];
    const parts = [
      floorLine(284),
      // основа, опори лави
      bar([40, 274], [318, 274], 12, C.frame),
      bar([66, 274], [78, 196], 11, C.frame),
      bar([150, 274], [144, 240], 11, C.frame),
      // рейки візка
      bar(railA, railB, 11, C.frameEdge),
      bar([122, 274], [140, 238], 9, C.frame),
      // лава: спинка-подушка
      bar(padA, padB, 24, C.pad, { edge: C.padEdge }),
      // візок: платформа, диски
      bar([c[0] - pn[0] * 42, c[1] - pn[1] * 42], [c[0] + pn[0] * 42, c[1] + pn[1] * 42], 12, C.metal, { edge: C.metalEdge }),
      dot([296, 80], 21, C.rubber), metalDot([296, 80], 7),
      dot([312, 96], 17, '#3a4340'), metalDot([312, 96], 5),
    ];
    parts.push(human({
      hip, shoulder, knee: [196, 168], ankle: [249, 146], toe: [259, 132], elbow: [112, 200], hand: [148, 196],
    }));
    parts.push(bar([140, 190], [152, 204], 6, C.rubber));
    parts.push(caption('Жим ногами лежачи'));
    return svgRoot(W, 300, 'Схема тренажера «Жим ногами лежачи»', parts.join(''));
  },
};

// ======================================================================
// 2. Жим ногами сидячи (eq-05, seated-leg-press, схований у каталозі). Без регулювань.
// ======================================================================
const seatedLegPress = {
  id: 'seated-leg-press',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const parts = [
      floorLine(284),
      stack(14, 46, 70, 226),
      bar([30, 274], [334, 274], 12, C.frame),
      // платформа для ніг на важелі
      bar([112, 116], [106, 214], 20, C.metal, { edge: C.metalEdge }),
      bar([116, 214], [158, 266], 9, C.frame),
      bar([90, 238], [150, 238], 8, C.frame),
      // сидіння і спинка
      bar([268, 226], [268, 268], 11, C.frame),
      bar([236, 210], [296, 210], 18, C.pad, { edge: C.padEdge }),
      bar([306, 212], [316, 124], 20, C.pad, { edge: C.padEdge }),
      bar([308, 226], [334, 268], 9, C.frame),
      bar([212, 212], [212, 270], 9, C.frame),
    ];
    parts.push(human({
      hip: [276, 198], shoulder: [302, 124], knee: [204, 168], ankle: [126, 172], toe: [118, 158], elbow: [268, 168], hand: [254, 196],
    }));
    parts.push(caption('Жим ногами сидячи'));
    return svgRoot(W, 300, 'Схема тренажера «Жим ногами сидячи»', parts.join(''));
  },
};

// ======================================================================
// 3–4. Зведення / Розведення ніг (eq-06, eq-09): сидячи, подушки на колінах. Без регулювань.
// ======================================================================
function seatedHip(kind) {
  const together = kind === 'adduction';
  const hip = [244, 188];
  const parts = [
    floorLine(262),
    stack(14, 38, 68, 218),
    bar([50, 252], [310, 252], 12, C.frame),
    // сидіння, спинка, стійка
    bar([244, 206], [244, 252], 11, C.frame),
    bar([212, 192], [274, 192], 18, C.pad, { edge: C.padEdge }),
    bar([282, 196], [290, 112], 20, C.pad, { edge: C.padEdge }),
    bar([284, 210], [310, 252], 9, C.frame),
    // важіль з подушкою для ноги
    bar([182, 204], [206, 248], 9, C.frame),
    el('rect', { x: 150, y: 142, width: 22, height: 58, rx: 10, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5 }),
    metalDot([206, 248], 7),
  ];
  parts.push(human({
    hip, shoulder: [286, 112], knee: [168, 182], ankle: [158, 238], toe: [140, 244], elbow: [262, 154], hand: [228, 176],
  }));
  parts.push(caption(together ? 'Зведення ніг' : 'Розведення ніг'));

  // Вигляд зверху: куди рухаються коліна.
  const y0 = 272;
  const cx = 180;
  parts.push(el('line', { x1: 10, y1: y0, x2: W - 10, y2: y0, stroke: '#dde3e0', 'stroke-width': 1.5 }));
  parts.push(text(14, y0 + 22, 'Вигляд зверху — як рухаються ноги', { 'font-size': 13.5, 'font-weight': 700, fill: C.ink }));
  const pelvis = [cx, y0 + 112];
  const spread = together ? 52 : 14; // початкове розведення колін
  const kneeL = [cx - spread, y0 + 60];
  const kneeR = [cx + spread, y0 + 60];
  parts.push(el('rect', { x: cx - 24, y: y0 + 100, width: 48, height: 22, rx: 11, fill: C.pad }));
  parts.push(bar([pelvis[0] - 12, pelvis[1] - 4], kneeL, 16, CLOTH));
  parts.push(bar([pelvis[0] + 12, pelvis[1] - 4], kneeR, 16, CLOTH));
  parts.push(dot(kneeL, 9, '#7b8791'));
  parts.push(dot(kneeR, 9, '#7b8791'));
  const col = C.accent;
  if (together) {
    parts.push(arrow([kneeL[0] - 6, kneeL[1] - 24], [cx - 10, kneeL[1] - 24], col));
    parts.push(arrow([kneeR[0] + 6, kneeR[1] - 24], [cx + 10, kneeR[1] - 24], col));
  } else {
    parts.push(arrow([kneeL[0] - 6, kneeL[1] - 24], [cx - 66, kneeL[1] - 24], col));
    parts.push(arrow([kneeR[0] + 6, kneeR[1] - 24], [cx + 66, kneeR[1] - 24], col));
  }
  parts.push(text(14, y0 + 138, together ? 'Коліна сходяться до центру' : 'Коліна розходяться в сторони', { 'font-size': 12.5, fill: C.ink }));
  return svgRoot(W, y0 + 150, together ? 'Схема тренажера «Зведення ніг»' : 'Схема тренажера «Розведення ніг»', parts.join(''));
}

const hipAdduction = {
  id: 'hip-adduction', ADJUSTMENTS: [], HINTS: {}, draw() { return seatedHip('adduction'); },
};
const hipAbduction = {
  id: 'hip-abduction', ADJUSTMENTS: [], HINTS: {}, draw() { return seatedHip('abduction'); },
};

// ======================================================================
// 5. Гак-машина (eq-08, hack-squat): нахилена рама, плечові подушки, платформа. Без регулювань.
// ======================================================================
const hackSquat = {
  id: 'hack-squat',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const shoulder = [118, 96];
    const hip = [154, 172];
    const u = [hip[0] - shoulder[0], hip[1] - shoulder[1]];
    const ul = Math.hypot(u[0], u[1]);
    const nrm = [-u[1] / ul, u[0] / ul]; // від тіла назад-вниз (ліворуч)
    const k = 17;
    const parts = [
      floorLine(284),
      // платформа й основа
      el('polygon', { points: '146,266 330,266 338,280 138,280', fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
      bar([40, 274], [196, 274], 11, C.frame),
      // нахилені рейки
      bar([58, 52], [184, 266], 12, C.frameEdge),
      // диски на штирях ззаду
      dot([48, 208], 23, C.rubber), metalDot([48, 208], 7),
      bar([48, 208], [92, 236], 8, C.frame),
      // спинка-подушка візка
      bar([shoulder[0] + nrm[0] * k - 18 * u[0] / ul, shoulder[1] + nrm[1] * k - 18 * u[1] / ul],
        [hip[0] + nrm[0] * k + 6 * u[0] / ul, hip[1] + nrm[1] * k + 6 * u[1] / ul], 22, C.pad, { edge: C.padEdge }),
      // плечові подушки
      bar([92, 66], [112, 100], 20, C.pad, { edge: C.padEdge }),
      // ручки
      bar([128, 150], [138, 168], 6, C.rubber),
    ];
    parts.push(human({
      hip, shoulder, knee: [210, 210], ankle: [198, 262], toe: [222, 264], elbow: [140, 126], hand: [114, 108],
    }));
    parts.push(caption('Присідання в «Гак-машині»'));
    return svgRoot(W, 300, 'Схема тренажера «Гак-машина»', parts.join(''));
  },
};

// ======================================================================
// 6. Згинання ніг лежачи (eq-07, leg-curl): валік на круглому шарнірі, 5 позицій по колу.
// ======================================================================
const LC_HINTS = { roller: { first: 'найнижче', last: 'найвище' } };
// Кут відхилення валика від горизонталі вліво: позиція k → −56°…+56° (плюс — вище).
const curlAngle = (k, n) => (k - (n + 1) / 2) * (112 / Math.max(n - 1, 1));

const legCurl = {
  id: 'leg-curl',
  ADJUSTMENTS: ['roller'],
  HINTS: LC_HINTS,
  draw(values = {}, adjustments = []) {
    const adj = pickAdj(adjustments, 'roller');
    const sel = posValue(adj, values);
    const n = adj ? adj.count : 5;
    const phi = sel ? curlAngle(sel, n) : 0;
    const P = [108, 172]; // центр круглого шарніра
    const R = polar(P, 180 - phi, 70);
    const parts = [floorLine(284)];
    // стійка з вагою, основа, лава
    parts.push(stack(272, 40, 78, 234));
    parts.push(bar([120, 274], [262, 274], 12, C.frame));
    parts.push(bar([168, 178], [168, 270], 11, C.frame));
    parts.push(bar([228, 164], [228, 270], 11, C.frame));
    parts.push(bar([128, 170], [240, 154], 20, C.pad, { edge: C.padEdge }));
    // людина лежить на животі
    const A = [r1(R[0] + 3), r1(R[1] - 13)];
    parts.push(human({
      hip: [184, 144], shoulder: [240, 134], knee: [118, 148], ankle: A, toe: [A[0] - 10, A[1] + 4], elbow: [236, 168], hand: [262, 194],
    }));
    // круглий шарнір: диск, отвори, важіль з валиком
    const holes = [];
    const dials = [];
    for (let k = 1; k <= n; k++) {
      const hp = polar(P, 180 - curlAngle(k, n), 21);
      holes.push(dot(hp, k === sel ? 5.5 : 3.5, k === sel ? C.accent : C.metalEdge, k === sel ? '#ffffff' : null, 1.5));
    }
    dials.push(el('circle', { cx: P[0], cy: P[1], r: 33, fill: '#e9eeec', stroke: C.metalEdge, 'stroke-width': 2.5 }));
    dials.push(holes.join(''));
    dials.push(bar(P, R, 9, C.frame));
    dials.push(dot(R, 11.5, C.rubber, '#000000', 1));
    dials.push(metalDot(P, 7));
    if (adj) {
      parts.push(zone('roller', `${adj.label}: змінити`,
        ring(P[0] - 44, P[1] - 44, 88, 88, 44) + dials.join('')));
      parts.push(zone('roller', `${adj.label}: змінити`,
        badge(withShortLabel(adj, 14), { x: 10, y: 10, w: 118, h: 62, value: sel ? String(sel) : null, raw: sel })));
    } else {
      parts.push(dials.join(''));
    }
    parts.push(text(138, 24, 'Згинання ніг лежачи', { 'font-size': 13.5, 'font-weight': 700, fill: C.muted }));

    // --- великий диск: позиції валика по колу шарніра ---
    let y = 300;
    if (adj) {
      const y0 = y;
      const D = [176, y0 + 122];
      const dial = [];
      dial.push(el('line', { x1: 10, y1: y0, x2: W - 10, y2: y0, stroke: '#dde3e0', 'stroke-width': 1.5 }));
      dial.push(text(14, y0 + 22, `${adj.label} — по колу круглого шарніра`, { 'font-size': 13.5, 'font-weight': 700, fill: C.ink }));
      dial.push(el('circle', { cx: D[0], cy: D[1], r: 82, fill: '#eef2f0', stroke: C.metalEdge, 'stroke-width': 2.5, 'data-dial-center': `${D[0]},${D[1]}` }));
      dial.push(el('path', {
        d: `M ${polar(D, 124, 60).join(' ')} A 60 60 0 0 0 ${polar(D, 236, 60).join(' ')}`,
        fill: 'none', stroke: '#c5cfcb', 'stroke-width': 2, 'stroke-dasharray': '5 4',
      }));
      if (sel) {
        const tip = polar(D, 180 - phi, 118);
        dial.push(bar(D, tip, 12, C.frame));
        dial.push(dot(tip, 17, C.rubber, '#000000', 1));
      } else {
        const tip = polar(D, 180, 112);
        dial.push(bar(D, tip, 8, '#aab5b1', { 'stroke-dasharray': '6 5' }));
        dial.push(dot(tip, 15, '#c9d1cd', '#9aa6a2', 1.5));
      }
      for (let k = 1; k <= n; k++) {
        const on = sel === k;
        const hp = polar(D, 180 - curlAngle(k, n), 60);
        const hint = k === 1 ? `1 — ${LC_HINTS.roller.first}` : k === n ? `${n} — ${LC_HINTS.roller.last}` : String(k);
        dial.push(el('g', { 'data-pos': `roller:${k}`, class: on ? 'sc-tick is-on' : 'sc-tick' },
          el('title', {}, esc(hint))
          + el('circle', { 'data-hole': k, cx: hp[0], cy: hp[1], r: on ? 16 : 13, fill: on ? C.accent : '#ffffff', stroke: on ? C.accent : '#9aa6a2', 'stroke-width': on ? 2.5 : 1.8 })
          + text(hp[0], hp[1] + 5.5, k, { 'font-size': on ? 17 : 14.5, 'font-weight': on ? 800 : 600, 'text-anchor': 'middle', fill: on ? '#ffffff' : C.ink })));
      }
      dial.push(metalDot(D, 11));
      dial.push(text(262, y0 + 52, '5 — найвище', { 'font-size': 12.5, fill: C.ink }));
      dial.push(text(262, y0 + 196, '1 — найнижче', { 'font-size': 12.5, fill: C.ink }));
      dial.push(text(262, y0 + 118, 'круглий шарнір', { 'font-size': 12.5, fill: C.muted }));
      dial.push(text(262, y0 + 133, 'тренажера', { 'font-size': 12.5, fill: C.muted }));
      parts.push(zone('roller', `${adj.label}: змінити`, dial.join('')));
      y += 214;
    }
    if (approxIn([adj])) {
      parts.push(warnBar(10, y - 2, W - 20, '⚠ приблизно — уточнити в залі: кількість позицій'));
      y += 28;
    }
    return svgRoot(W, y + 6, 'Схема тренажера «Згинання ніг лежачи»: позиція валика по колу шарніра', parts.join(''));
  },
};

// ======================================================================
// 7. Розгинання ніг (eq-10, leg-extension): валік, нахил (спинка), спинка вперед-назад.
// ======================================================================
const LE_HINTS = {
  roller: { first: 'ближче до коліна', last: 'ближче до стопи' },
  tilt: { first: 'менший нахил', last: 'більший нахил' },
  backrest: { first: 'ближче до валика', last: 'далі від валика' },
};

const legExtension = {
  id: 'leg-extension',
  ADJUSTMENTS: ['roller', 'tilt', 'backrest'],
  HINTS: LE_HINTS,
  draw(values = {}, adjustments = []) {
    const roller = pickAdj(adjustments, 'roller');
    const tilt = pickAdj(adjustments, 'tilt');
    const back = pickAdj(adjustments, 'backrest');
    const rv = posValue(roller, values);
    const tv = posValue(tilt, values);
    const bv = posValue(back, values);
    const frac = (adj, v) => (adj && v ? (v - 1) / Math.max(adj.count - 1, 1) : 0.5);
    const rk = frac(roller, rv);
    const tk = frac(tilt, tv);
    const bk = frac(back, bv);

    // Геометрія: нахил спинки і її зсув уперед-назад.
    const a = 6 + tk * 20; // градуси відхилення назад від вертикалі
    const hip = [190 + (bk - 0.5) * 24, 214];
    const u = [Math.sin(rad(a)), -Math.cos(rad(a))]; // вгору по тілу
    const nrm = [Math.cos(rad(a)), Math.sin(rad(a))]; // від тіла назад
    const shoulder = [hip[0] + u[0] * 82, hip[1] + u[1] * 82];
    const padLo = [hip[0] + nrm[0] * 19 - u[0] * 12, hip[1] + nrm[1] * 19 - u[1] * 12];
    const padHi = [hip[0] + nrm[0] * 19 + u[0] * 82, hip[1] + nrm[1] * 19 + u[1] * 82];
    const rollerY = 232 + rk * 32;

    const parts = [floorLine(284)];
    parts.push(stack(14, 42, 62, 232));
    parts.push(bar([40, 274], [262, 274], 12, C.frame));
    // сидіння
    parts.push(bar([172, 232], [172, 268], 11, C.frame));
    parts.push(bar([136, 224], [208, 224], 16, C.pad, { edge: C.padEdge }));
    // людина
    parts.push(human({
      hip, shoulder, knee: [128, 218], ankle: [128, 260], toe: [112, 266], elbow: [shoulder[0] - 6, shoulder[1] + 40], hand: [hip[0] - 22, hip[1] - 24],
    }));
    // важіль валика
    const lever = bar([108, 218], [108, 270], 8, C.frame) + metalDot([108, 218], 8);
    const rollerArt = bar([108, rollerY], [117, rollerY], 5, C.frame) + dot([118, rollerY], 10, C.rubber, '#000000', 1);

    if (roller) {
      parts.push(zone('roller', `${roller.label}: змінити`,
        ring(88, 212, 52, 66, 14) + lever + rollerArt
        + guide(114, 212, 114, 160)
        + badge(withShortLabel(roller, 13), { x: 86, y: 98, w: 100, h: 60, value: rv ? String(rv) : null, raw: rv })));
    } else {
      parts.push(lever + rollerArt);
    }

    // спинка: подушка (залежить від нахилу) і візок на рейці (залежить від зсуву)
    const strutFoot = [padLo[0] + 12, 268];
    const backPad = bar(padLo, padHi, 17, C.pad, { edge: C.padEdge })
      + bar(padLo, strutFoot, 8, C.frame) + metalDot(padLo, 6.5);
    const carriage = el('rect', { x: r1(strutFoot[0] - 20), y: 258, width: 40, height: 14, rx: 4, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 1.5 });
    const tiltBox = [Math.min(padLo[0], padHi[0]) - 14, padHi[1] - 14, Math.abs(padHi[0] - padLo[0]) + 28, padLo[1] - padHi[1] + 8];
    if (tilt) {
      parts.push(zone('tilt', `${tilt.label}: змінити`,
        ring(tiltBox[0], tiltBox[1], tiltBox[2], tiltBox[3], 14) + backPad
        + guide(tiltBox[0] + tiltBox[2], padHi[1] + 18, 262, 68)
        + badge(withShortLabel(tilt, 13), { x: 262, y: 40, w: 92, h: 60, value: tv ? String(tv) : null, raw: tv })));
    } else {
      parts.push(backPad);
    }
    if (back) {
      parts.push(zone('backrest', `${back.label}: змінити`,
        ring(strutFoot[0] - 30, 246, 60, 36, 12) + carriage
        + guide(strutFoot[0] + 30, 264, 262, 232)
        + badge(withShortLabel(back, 13), { x: 262, y: 196, w: 92, h: 60, value: bv ? String(bv) : null, raw: bv })));
    } else {
      parts.push(carriage);
    }
    parts.push(text(90, 24, 'Розгинання ніг', { 'font-size': 13.5, 'font-weight': 700, fill: C.muted }));

    // --- рядки позицій 1…5 ---
    let y = 296;
    const rows = [[roller, rv], [tilt, tv], [back, bv]].filter(([adj]) => adj);
    for (const [adj, v] of rows) {
      parts.push(el('line', { x1: 10, y1: y - 6, x2: W - 10, y2: y - 6, stroke: '#dde3e0', 'stroke-width': 1.5 }));
      parts.push(zone(adj.id, `${adj.label}: змінити`, chipRow(adj, v, LE_HINTS, y)));
      y += ROW_H;
    }
    if (approxIn([roller, tilt, back])) {
      parts.push(warnBar(10, y - 4, W - 20, '⚠ приблизно — уточнити в залі: кількість позицій'));
      y += 28;
    }
    return svgRoot(W, y + 4, 'Схема тренажера «Розгинання ніг»: валік, нахил і спинка', parts.join(''));
  },
};

export const SCHEMES = [
  legPress, seatedLegPress, hipAdduction, legCurl, hackSquat, hipAbduction, legExtension,
];
