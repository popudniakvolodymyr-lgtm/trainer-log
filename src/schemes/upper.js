// Збірка схем верхньої частини тіла: груди, спина, плечі, руки, прес, гантелі (таск 06).
// Кожен елемент SCHEMES — модуль схеми { id: schemeId з каталогу, ADJUSTMENTS, HINTS, draw(values, adjustments),
// optionIcon? }. Малюнки — за фото з сайту gym/photos/ (номер у коментарі) і gym/my-photos/.
// Тренажери: вигляд збоку, людина дивиться ліворуч; праворуч — колонка регулювань (лінійка + бейдж).
// Вертикальна тяга (№21, lever-pulldown) живе тут; src/schemes/lever-pulldown.js лише реекспортує її.
// Сховані в каталозі (№1, №13, №23) схем не мають — для них заглушка.

import {
  C, el, esc, text, svgRoot, pickAdj, posValue, optValue, zone, ring, badge, ruler, guide, warnBar, legendLine, wrapText,
} from './svg.js';
import { handleArt } from './handles.js';

const W = 360;
const FLOOR = 300;
const SKIN = '#e6c3a6';
const SKIN_EDGE = '#b9906f';
const CLOTH = '#5d6973';
const CLOTH_FAR = '#8d98a2';
const SHOE = '#2b3230';
const ARM = '#414c55';        // ближня рука — темніша, щоб було видно на тлі тулуба
const ORANGE = '#e8772e';      // помаранчеві важелі тренажерів залу (як на фото)
const ORANGE_EDGE = '#b4561b';
const MOVE = '#c2410c';        // стрілка руху
const LINE = '#dde3e0';
const APPROX_BAR = '⚠ приблизно — уточнити в залі: кількість позицій';

// --- геометрія ---
const r1 = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ');
const add = (p, dx, dy) => [p[0] + dx, p[1] + dy];

/** Суглоб між a і b (дві ланки l1, l2); side — куди згинати: 'up' | 'down' | 'left' | 'right'. */
function bend(a, b, l1, l2, side) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  if (d >= l1 + l2 - 0.5) return [a[0] + (dx / d) * l1, a[1] + (dy / d) * l1];
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const t = Math.acos(Math.max(-1, Math.min(1, cos)));
  const base = Math.atan2(dy, dx);
  const c1 = [a[0] + Math.cos(base + t) * l1, a[1] + Math.sin(base + t) * l1];
  const c2 = [a[0] + Math.cos(base - t) * l1, a[1] + Math.sin(base - t) * l1];
  const score = { up: (p) => -p[1], down: (p) => p[1], left: (p) => -p[0], right: (p) => p[0] }[side];
  return score(c1) >= score(c2) ? c1 : c2;
}

// --- цеглинки ---
const line = (a, b, w, color, extra = {}) => el('line', {
  x1: r1(a[0]), y1: r1(a[1]), x2: r1(b[0]), y2: r1(b[1]),
  stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', ...extra,
});
const bar = (a, b, w, color, edge = null) => (edge ? line(a, b, w + 3, edge) : '') + line(a, b, w, color);
const poly = (list, w, color, extra = {}) => el('polyline', {
  points: pts(list), fill: 'none', stroke: color, 'stroke-width': w,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra,
});
const path = (d, w, color, extra = {}) => el('path', {
  d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra,
});
const dot = (p, r, fill, stroke = null, sw = 2) => el('circle', {
  cx: r1(p[0]), cy: r1(p[1]), r, fill, stroke, 'stroke-width': stroke ? sw : null,
});
const metalDot = (p, r) => dot(p, r, C.metal, C.metalEdge, 2);
const floorLine = (y = FLOOR, x2 = W - 8) => el('line', { x1: 8, y1: y + 1, x2, y2: y + 1, stroke: C.floor, 'stroke-width': 3 });
const base = (x1, x2, y = FLOOR) => el('rect', { x: x1, y: y - 12, width: x2 - x1, height: 12, rx: 4, fill: C.frame });
const pad = (x, y, w, h, extra = {}) => el('rect', {
  x, y, width: w, height: h, rx: Math.min(w, h) / 2, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5, ...extra,
});
const orange = (a, b, w = 11) => bar(a, b, w, ORANGE, ORANGE_EDGE);
const orangePath = (d, w = 11) => path(d, w + 3, ORANGE_EDGE) + path(d, w, ORANGE);
const caption = (s, y) => text(14, y, s, { 'font-size': 12.5, fill: C.muted });
const title = (s, x = 14, y = 24) => text(x, y, s, { 'font-size': 13.5, 'font-weight': 700, fill: C.muted });
const divider = (y) => el('line', { x1: 10, y1: y, x2: W - 10, y2: y, stroke: LINE, 'stroke-width': 1.5 });

/** Диск-млинець (вигляд на площину диска). */
const plate = (p, r) => dot(p, r, '#2a2f2e', '#141817', 2)
  + el('circle', { cx: r1(p[0]), cy: r1(p[1]), r: r1(r * 0.68), fill: 'none', stroke: '#4a5250', 'stroke-width': 2 })
  + metalDot(p, Math.max(4, r * 0.22));

/** Стійка з вагою (блоковий тренажер). */
function stack(x, y, w, h) {
  return el('rect', { x, y, width: w, height: h, rx: 10, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 })
    + el('rect', { x: x + 9, y: y + 16, width: w - 18, height: h - 40, rx: 5, fill: C.panel, stroke: C.panelEdge })
    + el('line', { x1: x + w / 2, y1: y + 36, x2: x + w / 2, y2: y + h - 36, stroke: C.frameEdge, 'stroke-width': 3, 'stroke-linecap': 'round' })
    + el('rect', { x: x + 14, y: y + 36, width: 11, height: 22, rx: 2, fill: '#f4f6f5', opacity: 0.85 });
}

/** Стрілка руху: пряма [a, b] або крива [a, керівна, b]. */
function arrow(list, color = MOVE, w = 4) {
  const b = list[list.length - 1];
  const from = list[list.length - 2];
  const ang = Math.atan2(b[1] - from[1], b[0] - from[0]);
  const hl = 12;
  const tip = [b[0] - hl * 0.6 * Math.cos(ang), b[1] - hl * 0.6 * Math.sin(ang)];
  const p1 = [b[0] - hl * Math.cos(ang - 0.5), b[1] - hl * Math.sin(ang - 0.5)];
  const p2 = [b[0] - hl * Math.cos(ang + 0.5), b[1] - hl * Math.sin(ang + 0.5)];
  const d = list.length === 3
    ? `M${r1(list[0][0])} ${r1(list[0][1])} Q${r1(list[1][0])} ${r1(list[1][1])} ${r1(tip[0])} ${r1(tip[1])}`
    : `M${r1(list[0][0])} ${r1(list[0][1])} L${r1(tip[0])} ${r1(tip[1])}`;
  return el('g', { class: 'sc-move' }, path(d, w, color) + el('polygon', { points: pts([b, p1, p2]), fill: color }));
}

/**
 * Людина. limbs: arms/legs — масиви {from?, mid, end, far?, toe?}; far — дальня (світліша) кінцівка.
 * Порядок малювання: дальні кінцівки, ноги, тулуб, голова, ближні руки.
 */
function person({ head, neck, hip, arms = [], legs = [], torso = 25 }) {
  const out = [];
  const leg = (l, color) => poly([l.from || hip, l.mid, l.end], 15, color) + (l.toe ? bar(l.end, l.toe, 9, SHOE) : '');
  const arm = (a, color) => poly([a.from || neck, a.mid, a.end], 10, color) + dot(a.end, 5.5, SKIN);
  const nearArm = (a) => arm(a, ARM);
  for (const l of legs.filter((x) => x.far)) out.push(leg(l, CLOTH_FAR));
  for (const a of arms.filter((x) => x.far)) out.push(arm(a, CLOTH_FAR));
  for (const l of legs.filter((x) => !x.far)) out.push(leg(l, CLOTH));
  out.push(bar(hip, neck, torso, CLOTH));
  out.push(bar(neck, head, 9, SKIN));
  out.push(dot(head, 12.5, SKIN, SKIN_EDGE, 1.2));
  for (const a of arms.filter((x) => !x.far)) out.push(nearArm(a));
  return out.join('');
}

/** Людина сидить боком (дивиться ліворуч): таз hip, руки до кистей hands, стопа foot. */
function seatedSide({ hip, hands, foot, lean = 0, armBend = 'down', torsoLen = 60 }) {
  const neck = [hip[0] + lean, hip[1] - torsoLen];
  const head = [neck[0] - 3, neck[1] - 19];
  const sh = add(neck, 0, 6);
  const shFar = add(sh, 5, -1);
  const [hand, handFar = add(hand, 5, -1)] = hands;
  // стегно майже горизонтально вперед, гомілка вниз до стопи
  const knee = [hip[0] - 50, hip[1] + 2];
  const ankle = [knee[0] - 4, foot[1]];
  const ankleFar = add(ankle, 6, -1);
  return person({
    head, neck, hip,
    legs: [
      { far: true, from: add(hip, 3, -1), mid: add(knee, 6, -1), end: ankleFar, toe: add(ankleFar, -14, 0) },
      { mid: knee, end: ankle, toe: add(ankle, -14, 0) },
    ],
    arms: [
      { far: true, from: shFar, mid: bend(shFar, handFar, 38, 36, armBend), end: handFar },
      { from: sh, mid: bend(sh, hand, 38, 36, armBend), end: hand },
    ],
  });
}

/** Людина сидить обличчям до нас: центр cx, таз на висоті hipY, кисті hands [права, ліва] (права — праворуч). */
function seatedFront({ cx, hipY, hands, floor = FLOOR, armBend = 'down', elbowOut = 0 }) {
  const neck = [cx, hipY - 58];
  const head = [cx, hipY - 78];
  const out = [];
  for (const s of [-1, 1]) {
    const hip = [cx + s * 13, hipY];
    const knee = [cx + s * 24, hipY + 12];
    const ankle = [cx + s * 28, floor - 8];
    out.push(bar(hip, knee, 20, CLOTH_FAR) + bar(knee, ankle, 14, CLOTH) + bar(ankle, add(ankle, s * 6, 2), 11, SHOE));
  }
  out.push(el('rect', { x: cx - 19, y: hipY - 60, width: 38, height: 66, rx: 12, fill: CLOTH }));
  out.push(bar(neck, head, 9, SKIN));
  out.push(dot(head, 13, SKIN, SKIN_EDGE, 1.2));
  for (const s of [1, -1]) {
    const sh = [cx + s * 21, hipY - 52];
    const hand = s === 1 ? hands[0] : hands[1];
    let mid = bend(sh, hand, 34, 32, armBend);
    if (elbowOut) mid = [mid[0] + s * elbowOut, mid[1]];
    out.push(poly([sh, mid, hand], 10, CLOTH) + dot(hand, 5.5, SKIN));
  }
  return out.join('');
}

// --- регулювання ---

/**
 * Сидіння з лінійкою позицій і бейджем. Подушка рухається з позицією (step пікселів),
 * лінійка — окремо праворуч (рівні проміжки), пунктир від фіксатора до вибраної позначки.
 * → {svg, dy} — dy: зсув сидіння (людину зсувають на нього).
 */
function seatControl(adj, values, o) {
  const val = posValue(adj, values);
  const n = adj ? adj.count : 5;
  const mid = (n + 1) / 2;
  const step = o.step ?? 6;
  const floor = o.floor ?? FLOOR;
  const dy = val ? -(val - mid) * step : 0;
  const top = o.y + dy;
  const art = [
    el('rect', { x: o.post - 5, y: top + 12, width: 10, height: floor - 14 - top - 12, fill: C.metal, stroke: C.metalEdge }),
    el('rect', { x: o.post - 9, y: floor - 48, width: 18, height: 36, rx: 3, fill: C.frame, stroke: C.frameEdge }),
    pad(o.x, top, o.w, 15),
    el('rect', { x: o.post + 9, y: floor - 35, width: 9, height: 6, fill: C.metalEdge }),
    el('circle', { cx: o.post + 23, cy: floor - 32, r: 6.5, fill: '#d64545', stroke: '#8f2525', 'stroke-width': 1.5 }),
  ].join('');
  if (!adj) return { svg: art, dy };
  const sp = Math.max(11, Math.min(18, 76 / Math.max(n - 1, 1)));
  const yOf = (k) => o.rulerMid + (mid - k) * sp;
  return {
    dy,
    svg: zone(adj.id, `${adj.label}: змінити`,
      ring(o.post - 16, floor - 58, 54, 46) + art
      + ruler(adj, { x: o.rulerX, yOf, selected: val, hints: o.hints })
      + (val ? guide(o.post + 31, floor - 32, o.rulerX - 9, yOf(val)) : '')
      + fitBadge(adj, { x: o.badge[0], y: o.badge[1], w: 104, h: 62, value: val ? String(val) : null, raw: val })),
  };
}

/** Позначка варіанта на малюнку: кружечок з номером. */
function optMarker(p, num, on, color = C.accent) {
  return dot(p, on ? 12 : 10.5, on ? color : '#ffffff', color, 2)
    + text(p[0], p[1] + 4.8, num, { 'font-size': on ? 14 : 13, 'font-weight': 800, 'text-anchor': 'middle', fill: on ? '#ffffff' : color });
}

/** Кнопки-варіанти рядком (з номером або кольором). → SVG; кожна — data-adj + data-opt. */
function optionChips(adj, sel, { y, x0 = 12, width = W - 24, numbered = true }) {
  const opts = (adj.options || []).filter((o) => !o.deleted);
  const gap = 8;
  const w = (width - gap * (opts.length - 1)) / Math.max(opts.length, 1);
  return opts.map((opt, i) => {
    const on = sel && sel.id === opt.id;
    const color = opt.color || C.accent;
    const x = r1(x0 + i * (w + gap));
    const label = String(opt.label);
    const size = Math.max(10, Math.min(14, (w - 44) / (label.length * 0.6)));
    const mark = numbered
      ? text(x + 18, y + 22, i + 1, { 'font-size': 14, 'font-weight': 800, 'text-anchor': 'middle', fill: on ? color : '#ffffff' })
      : '';
    return el('g', {
      'data-adj': adj.id, 'data-opt': opt.id, class: `sc-zone sc-grip${on ? ' is-selected' : ''}`,
      role: 'button', tabindex: 0, 'aria-label': `${adj.label}: ${label}`,
    }, el('title', {}, esc(label))
      + el('rect', { x, y, width: r1(w), height: 34, rx: 17, fill: on ? color : '#ffffff', stroke: color, 'stroke-width': on ? 3 : 2 })
      + el('circle', { cx: x + 18, cy: y + 17, r: 10, fill: on ? '#ffffff' : color })
      + mark
      + text(x + 34, y + 22, label, { 'font-size': r1(size), 'font-weight': on ? 800 : 600, fill: on ? '#ffffff' : C.ink }));
  }).join('');
}

/** Бейдж варіанта (назва вибраного). */
const optBadge = (adj, sel, x, y, w = 104, h = 62, swatch = null) => fitBadge(adj, {
  x, y, w, h, value: sel ? sel.label : null, raw: sel ? sel.id : null, valueSize: 20, swatch,
});

/** Бейдж, у якому довга назва регулювання («Притискний валік») зменшується, щоб влізла. */
function fitBadge(adj, o) {
  const svg = badge(adj, o);
  const size = Math.min(12.5, ((o.w || 100) - 16) / (String(adj.label).length * 0.56));
  return size < 12.5 ? svg.replace('font-size="12.5"', `font-size="${r1(Math.max(9, size))}"`) : svg;
}

const isApprox = (...adjs) => adjs.some((a) => a && (a.approx || a.unknown));

/** Низ схеми: легенди позицій, плашка ⚠, підпис руху. → {svg, y} */
function footer(y, { legends = [], hints = {}, approx = false, note = null }) {
  const out = [];
  for (const adj of legends.filter(Boolean)) {
    out.push(legendLine(adj, hints, 12, y));
    y += 18;
  }
  if (approx) {
    out.push(warnBar(10, y - 8, W - 20, APPROX_BAR));
    y += 26;
  }
  if (note) {
    out.push(caption(note, y + 4));
    y += 18;
  }
  return { svg: out.join(''), y };
}

const SEAT_HINTS = { seat: { first: 'найнижче', last: 'найвище' } };
// Стандарт сидіння збоку: подушка x 140…224, стійка 196, лінійка праворуч.
const SIDE_SEAT = { x: 140, w: 84, y: 232, post: 196, rulerX: 270, rulerMid: 236, badge: [250, 124], hints: SEAT_HINTS };

// ======================================================================
// №2 «Жим у тренажері» (груди, диски) — фото 02: сидиш, помаранчеві важелі з дисками
// заходять згори, ручки перед грудьми, жим уперед. Регулювання: висота сидіння.
// ======================================================================
const plateChestPress = {
  id: 'plate-chest-press',
  ADJUSTMENTS: ['seat'],
  HINTS: SEAT_HINTS,
  draw(values = {}, adjustments = []) {
    const seat = pickAdj(adjustments, 'seat');
    const sc = seatControl(seat, values, SIDE_SEAT);
    const hip = [210, 236 + sc.dy];
    const handle = [140, 172];
    const parts = [
      floorLine(FLOOR, 250), base(18, 250),
      // задня стійка до осі важелів
      el('polygon', { points: `228,${FLOOR - 12} 246,${FLOOR - 12} 246,58 232,58`, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
      pad(222, 126, 18, 108),
      sc.svg,
      seatedSide({ hip, hands: [handle, add(handle, 6, -2)], foot: [128, FLOOR - 8], lean: 2 }),
      // важіль: від осі над головою вперед і вниз до ручки
      plate([168, 66], 27),
      orangePath(`M239 62 L172 52 Q142 50 142 92 L142 160`, 12),
      bar([132, 160], [148, 186], 11, C.rubber),
      metalDot([239, 62], 8),
      arrow([[120, 150], [72, 150]]),
      text(68, 140, 'від себе', { 'font-size': 12, fill: MOVE, 'font-weight': 700 }),
      title('Жим від грудей'),
    ];
    const f = footer(FLOOR + 26, { legends: [seat], hints: SEAT_HINTS, approx: isApprox(seat) });
    parts.push(f.svg);
    return svgRoot(W, f.y + 4, 'Схема тренажера «Жим у тренажері» (груди): висота сидіння', parts.join(''));
  },
};

// ======================================================================
// №12 Відведення рук сидячи — фото 12: сидиш обличчям до нас, лікті на помаранчевих важелях,
// піднімаєш лікті в сторони. Регулювання: висота сидіння (вісь важеля — на рівні плеча).
// ======================================================================
const lateralRaise = {
  id: 'lateral-raise',
  ADJUSTMENTS: ['seat'],
  HINTS: SEAT_HINTS,
  draw(values = {}, adjustments = []) {
    const seat = pickAdj(adjustments, 'seat');
    const cx = 128;
    const sc = seatControl(seat, values, { ...SIDE_SEAT, x: cx - 46, w: 92, post: cx, badge: [250, 40] });
    const hipY = 236 + sc.dy;
    const shY = hipY - 52;
    const elbows = [[cx + 78, shY - 22], [cx - 78, shY - 22]];
    const hands = [[cx + 84, shY + 6], [cx - 84, shY + 6]];
    const parts = [
      floorLine(FLOOR, 250), base(30, 230),
      // корпус тренажера позаду
      el('rect', { x: cx - 64, y: 40, width: 128, height: FLOOR - 52, rx: 12, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
      el('rect', { x: cx - 50, y: 58, width: 100, height: 120, rx: 6, fill: C.panel, stroke: C.panelEdge }),
      pad(cx - 24, 120, 48, 104),
      sc.svg,
      seatedFront({ cx, hipY, hands }),
    ];
    // важелі: від осі над плечем до подушки біля ліктя
    for (const [i, s] of [[0, 1], [1, -1]]) {
      const pivot = [cx + s * 28, 172];
      parts.push(orange(pivot, add(elbows[i], s * 14, -4), 13));
      parts.push(dot(add(elbows[i], s * 6, -10), 11, C.rubber));
      parts.push(metalDot(pivot, 7));
      parts.push(arrow([[cx + s * 112, shY + 22], [cx + s * 126, shY - 20], [cx + s * 104, shY - 54]]));
    }
    parts.push(guide(cx - 112, 172, cx + 112, 172));
    parts.push(title('Лікті вгору в сторони', 14, 24));
    const f = footer(FLOOR + 26, {
      legends: [seat], hints: SEAT_HINTS, approx: isApprox(seat),
      note: 'Сидіння — щоб плечі були на рівні осей важелів',
    });
    parts.push(f.svg);
    return svgRoot(W, f.y + 4, 'Схема тренажера «Відведення рук сидячи»: висота сидіння', parts.join(''));
  },
};

// ======================================================================
// №14 Жим у тренажері сидячи (плечі, диски) — фото 14: сидиш обличчям до нас, помаранчеві
// важелі з дисками біля плечей, жим угору. Регулювання: позиція ручок (2) і висота сидіння.
// ======================================================================
const SP_CX = 130;
const SP_Y = 166;
// Дві ручки на кожному важелі (s = 1 праворуч, −1 ліворуч): 1 — горизонтальна зовні, 2 — вертикальна всередині.
const spGrip = {
  'pos-1': (s) => ({ d: [[SP_CX + s * 60, SP_Y], [SP_CX + s * 90, SP_Y]], hand: [SP_CX + s * 75, SP_Y], mark: [SP_CX + s * 76, SP_Y + 24] }),
  'pos-2': (s) => ({ d: [[SP_CX + s * 46, SP_Y - 16], [SP_CX + s * 46, SP_Y + 14]], hand: [SP_CX + s * 46, SP_Y], mark: [SP_CX + s * 30, SP_Y - 30] }),
};

const plateShoulderPress = {
  id: 'plate-shoulder-press',
  ADJUSTMENTS: ['grip-pos', 'seat'],
  HINTS: SEAT_HINTS,
  draw(values = {}, adjustments = []) {
    const seat = pickAdj(adjustments, 'seat');
    const grip = pickAdj(adjustments, 'grip-pos');
    const sel = optValue(grip, values);
    const cx = SP_CX;
    const sc = seatControl(seat, values, { ...SIDE_SEAT, x: cx - 46, w: 92, post: cx, badge: [250, 116] });
    const hipY = 240 + sc.dy;
    const opts = grip ? (grip.options || []).filter((o) => !o.deleted) : [];
    const handOpt = sel ? sel.id : 'pos-1';
    const hands = [1, -1].map((s) => (spGrip[handOpt] || spGrip['pos-1'])(s).hand);
    const parts = [
      floorLine(FLOOR, 250), base(20, 228),
      // рама: дві похилі стійки, спинка
      el('polygon', { points: `${cx - 92},${FLOOR - 12} ${cx - 78},${FLOOR - 12} ${cx - 34},70 ${cx - 46},70`, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
      el('polygon', { points: `${cx + 92},${FLOOR - 12} ${cx + 78},${FLOOR - 12} ${cx + 34},70 ${cx + 46},70`, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
      pad(cx - 24, 104, 48, 124),
      sc.svg,
    ];
    // важелі з дисками
    for (const s of [1, -1]) {
      parts.push(orangePath(`M${cx + s * 40} 128 Q${cx + s * 50} ${SP_Y - 12} ${cx + s * 92} ${SP_Y - 12} L${cx + s * 104} ${SP_Y - 14}`, 13));
      parts.push(plate([cx + s * 100, SP_Y - 42], 20));
      parts.push(metalDot([cx + s * 40, 128], 6));
    }
    parts.push(seatedFront({ cx, hipY, hands, armBend: 'down', elbowOut: 6 }));
    // ручки: обидві позиції на кожному важелі
    const gripArt = [];
    for (const s of [1, -1]) {
      for (const id of ['pos-1', 'pos-2']) {
        const g = spGrip[id](s);
        gripArt.push(bar(g.d[0], g.d[1], 9, C.rubber));
      }
    }
    parts.push(gripArt.join(''));
    if (grip) {
      opts.forEach((opt, i) => {
        const geo = spGrip[opt.id];
        if (!geo) return;
        const on = sel && sel.id === opt.id;
        let art = '';
        for (const s of [1, -1]) {
          const g = geo(s);
          if (on) art += line(g.d[0], g.d[1], 20, C.accent, { opacity: 0.3 });
          art += bar(g.d[0], g.d[1], 9, on ? C.accent : C.rubber) + optMarker(g.mark, i + 1, on);
        }
        parts.push(el('g', {
          'data-adj': grip.id, 'data-opt': opt.id, class: `sc-zone sc-grip${on ? ' is-selected' : ''}`,
          role: 'button', tabindex: 0, 'aria-label': `${grip.label}: ${opt.label}`,
        }, el('title', {}, esc(opt.label)) + art));
      });
      parts.push(zone(grip.id, `${grip.label}: змінити`, optBadge(grip, sel, 250, 12) + guide(254, 54, cx + 100, SP_Y + 4)));
    }
    parts.push(arrow([[cx, 96], [cx, 52]]));
    parts.push(text(cx + 10, 70, 'угору', { 'font-size': 12, fill: MOVE, 'font-weight': 700 }));
    parts.push(title('Жим угору'));
    let y = FLOOR + 14;
    if (grip) {
      parts.push(text(14, y + 6, `${grip.label}:`, { 'font-size': 13, 'font-weight': 700, fill: C.ink }));
      parts.push(optionChips(grip, sel, { y: y + 14 }));
      y += 64;
    }
    const f = footer(y, { legends: [seat], hints: SEAT_HINTS, approx: isApprox(seat, grip) });
    parts.push(f.svg);
    return svgRoot(W, f.y + 4, 'Схема тренажера «Жим у тренажері сидячи» (плечі): позиція ручок і висота сидіння', parts.join(''));
  },
  optionIcon(adjustment, optionId) {
    if (adjustment.id !== 'grip-pos' || !spGrip[optionId]) return '';
    const inner = ['pos-1', 'pos-2'].map((id) => {
      const g = spGrip[id](1);
      return bar(g.d[0], g.d[1], 9, id === optionId ? C.accent : '#b8c2be');
    }).join('') + orangePath(`M${SP_CX + 40} 128 Q${SP_CX + 50} ${SP_Y - 12} ${SP_CX + 92} ${SP_Y - 12}`, 10);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SP_CX + 30} 120 72 64" width="96" height="84" class="grip-icon" aria-hidden="true">${inner}</svg>`;
  },
};

// ======================================================================
// «Прес» (№15 Ротація + №16 Скручування) — фото 15, 16. Регулювань немає.
// ======================================================================
const abStation = {
  id: 'ab-station',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const parts = [];
    // --- Ротація: вигляд спереду, сидиш на поворотному диску, тримаєш дугу перед грудьми ---
    const cx = 150;
    const fl = 196;
    parts.push(title('Ротація', 14, 24));
    parts.push(floorLine(fl));
    parts.push(stack(262, 30, 74, fl - 30));
    parts.push(el('rect', { x: 60, y: 118, width: 210, height: 14, rx: 7, fill: C.frame }));
    parts.push(el('rect', { x: 64, y: 118, width: 14, height: fl - 118, rx: 5, fill: C.frame }));
    parts.push(el('ellipse', { cx, cy: fl - 10, rx: 52, ry: 9, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 }));
    parts.push(pad(cx - 34, 130, 68, 14));
    parts.push(seatedFront({ cx, hipY: 134, hands: [[cx + 30, 88], [cx - 30, 88]], floor: fl - 8, armBend: 'down', elbowOut: 8 }));
    parts.push(orangePath(`M${cx - 44} 70 L${cx - 44} 92 Q${cx} 116 ${cx + 44} 92 L${cx + 44} 70`, 10));
    parts.push(bar([cx - 44, 62], [cx - 44, 84], 9, C.rubber) + bar([cx + 44, 62], [cx + 44, 84], 9, C.rubber));
    parts.push(arrow([[cx - 70, 150], [cx, 176], [cx + 74, 150]]));
    parts.push(arrow([[cx + 70, 112], [cx, 92], [cx - 74, 112]], MOVE, 3));
    parts.push(caption('Поворот корпусу вліво-вправо', fl + 22));
    // --- Скручування: вигляд збоку, ноги під валиками, ручки біля голови ---
    const y0 = fl + 36;
    const f2 = y0 + 176;
    parts.push(divider(y0));
    parts.push(title('Скручування', 14, y0 + 24));
    parts.push(floorLine(f2));
    parts.push(stack(270, y0 + 20, 66, f2 - y0 - 20));
    parts.push(base(40, 270, f2));
    parts.push(bar([196, f2 - 10], [196, f2 - 56], 10, C.frame));
    parts.push(pad(150, f2 - 66, 84, 15));
    parts.push(pad(230, f2 - 140, 18, 80));
    // валики для ніг
    parts.push(bar([116, f2 - 10], [116, f2 - 40], 8, C.frame));
    parts.push(dot([116, f2 - 46], 11, C.rubber) + dot([116, f2 - 20], 11, C.rubber));
    const hip = [212, f2 - 62];
    const neck = [196, f2 - 118];
    parts.push(person({
      head: [184, f2 - 134], neck, hip,
      legs: [{ mid: [160, f2 - 64], end: [128, f2 - 30], toe: [114, f2 - 34] }],
      arms: [{ mid: [172, f2 - 120], end: [182, f2 - 146] }],
    }));
    // ручки зверху, вісь за спиною
    parts.push(orangePath(`M240 ${f2 - 150} Q220 ${f2 - 168} 190 ${f2 - 150}`, 9));
    parts.push(metalDot([240, f2 - 150], 6));
    parts.push(arrow([[168, f2 - 166], [130, f2 - 150], [132, f2 - 108]]));
    parts.push(caption('Скручування корпусу вперед-униз', f2 + 22));
    return svgRoot(W, f2 + 32, 'Схема тренажера «Прес»: Ротація і Скручування', parts.join(''));
  },
};

// ======================================================================
// Гравітрон (№17 віджимання, №20 підтягування) — фото 17, 20: стоїш колінами на подушці-платформі,
// що допомагає підніматися. Регулювань немає.
// ======================================================================
function gravitron(kind) {
  const dip = kind === 'dip';
  const parts = [floorLine(FLOOR), base(30, 340)];
  parts.push(stack(270, 70, 70, FLOOR - 82));
  // помаранчева рама: висока стійка, верхні ручки, бруси
  parts.push(orangePath(`M246 ${FLOOR - 12} L246 46 Q246 30 230 30 L120 30`, 14));
  parts.push(orange([246, 176], [130, 176], 11));
  parts.push(bar([120, 30], [116, 52], 9, dip ? '#9aa6a2' : C.rubber));
  parts.push(bar([130, 176], [120, 176], 10, dip ? C.rubber : '#9aa6a2'));
  // платформа під коліна на важелі
  parts.push(bar([246, 246], [170, 240], 9, C.frame));
  parts.push(pad(118, 232, 96, 16));
  parts.push(metalDot([246, 246], 7));
  // сходинка
  parts.push(el('rect', { x: 44, y: FLOOR - 40, width: 60, height: 10, rx: 4, fill: C.metal, stroke: C.metalEdge }));
  parts.push(bar([74, FLOOR - 30], [74, FLOOR - 10], 8, C.frame));
  const knee = [168, 230];
  const hip = [174, 178];
  const neck = [172, 112];
  if (dip) {
    parts.push(person({
      head: [176, 92], neck, hip,
      legs: [{ mid: knee, end: [110, 226], toe: [100, 236] }],
      arms: [{ mid: [190, 142], end: [124, 176] }],
    }));
    parts.push(arrow([[76, 120], [76, 170]]));
    parts.push(arrow([[96, 170], [96, 120]], C.accent));
  } else {
    parts.push(person({
      head: [168, 92], neck: [170, 112], hip,
      legs: [{ mid: knee, end: [110, 226], toe: [100, 236] }],
      arms: [{ mid: [140, 80], end: [118, 52] }],
    }));
    parts.push(arrow([[76, 170], [76, 112]]));
  }
  parts.push(title(dip ? 'Віджимання на брусах' : 'Підтягування'));
  parts.push(caption('Коліна на платформі — вона допомагає підніматися', FLOOR + 24));
  parts.push(caption('Більша вага на блоці — легше', FLOOR + 42));
  return svgRoot(W, FLOOR + 54, dip ? 'Схема тренажера «Віджимання в гравітроні»' : 'Схема тренажера «Підтягування в гравітроні»', parts.join(''));
}
const assistedDip = { id: 'assisted-dip', ADJUSTMENTS: [], HINTS: {}, draw() { return gravitron('dip'); } };
const assistedPullup = { id: 'assisted-pullup', ADJUSTMENTS: [], HINTS: {}, draw() { return gravitron('pullup'); } };

// ======================================================================
// №18 Жим на трицепс — фото 18: сидиш обличчям до нас, ручки біля стегон, тиснеш униз.
// ======================================================================
const tricepsPress = {
  id: 'triceps-press',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const cx = 196;
    const hipY = 236;
    const parts = [floorLine(), base(16, 300), stack(16, 40, 80, FLOOR - 52)];
    parts.push(pad(cx - 24, 92, 48, 140));
    parts.push(pad(cx - 46, 232, 92, 15));
    parts.push(el('rect', { x: cx - 5, y: 246, width: 10, height: 42, fill: C.metal, stroke: C.metalEdge }));
    for (const s of [1, -1]) {
      parts.push(orange([cx + s * 72, 262], [cx + s * 52, 218], 11));
      parts.push(metalDot([cx + s * 72, 262], 6));
    }
    parts.push(seatedFront({ cx, hipY, hands: [[cx + 50, 214], [cx - 50, 214]], armBend: 'right', elbowOut: 10 }));
    for (const s of [1, -1]) {
      parts.push(bar([cx + s * 44, 214], [cx + s * 60, 214], 10, C.rubber));
      parts.push(arrow([[cx + s * 92, 176], [cx + s * 92, 226]]));
    }
    parts.push(title('Ручки біля стегон — тиснути вниз', 110, 24));
    return svgRoot(W, FLOOR + 12, 'Схема тренажера «Жим на трицепс»', parts.join(''));
  },
};

// ======================================================================
// №19 Згинання рук у блоці — фото 19: сидиш, плечі лежать на похилій подушці, згинаєш руки.
// ======================================================================
const cableCurl = {
  id: 'cable-curl',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const parts = [floorLine(), base(40, 340), stack(262, 40, 78, FLOOR - 52)];
    parts.push(bar([196, FLOOR - 10], [196, 246], 10, C.frame));
    parts.push(pad(156, 232, 84, 15));
    // похила подушка під плечі
    parts.push(bar([120, FLOOR - 10], [130, 210], 9, C.frame));
    parts.push(bar([108, 206], [160, 178], 18, C.pad, C.padEdge));
    const hip = [214, 234];
    const neck = [208, 172];
    const elbow = [118, 196];
    const hand = [104, 150];
    parts.push(person({
      head: [202, 152], neck, hip,
      legs: [{ mid: [160, 240], end: [148, FLOOR - 8], toe: [134, FLOOR - 8] }],
      arms: [{ from: add(neck, 0, 6), mid: elbow, end: hand }],
    }));
    // важіль з ручкою, вісь біля ліктя, трос до блоку
    parts.push(line([118, 200], [262, 70], 2.5, '#7d8a86'));
    parts.push(orange([116, 200], [100, 146], 9));
    parts.push(bar([92, 148], [110, 142], 9, C.rubber));
    parts.push(metalDot([116, 200], 7));
    parts.push(arrow([[80, 196], [62, 160], [84, 124]]));
    parts.push(title('Згинання рук'));
    return svgRoot(W, FLOOR + 12, 'Схема тренажера «Згинання рук у блоці»', parts.join(''));
  },
};

// ======================================================================
// №21 Вертикальна тяга (диски) — фото 21 і gym/my-photos/tyaga-vazhilna.png: сидиш, ручки над
// головою, тяга зверху вниз; стегна під притискним валіком. Регулювання: позиція ручки (2), валік (5).
// ======================================================================
const LP_HINTS = { roller: { first: 'найнижче', last: 'найвище' } };
const LP_CX = 180;
// Ручки, вигляд спереду (s = 1 праворуч, −1 ліворуч): 1 — широкий хват на кінцях, 2 — вузький ближче до центру.
const lpGrip = {
  'pos-1': (s) => ({ d: `M${LP_CX + s * 120} 384 Q${LP_CX + s * 144} 384 ${LP_CX + s * 144} 404 L${LP_CX + s * 144} 428`, mark: [LP_CX + s * 144, 448] }),
  'pos-2': (s) => ({ d: `M${LP_CX + s * 60} 380 L${LP_CX + s * 60} 424`, mark: [LP_CX + s * 60, 444] }),
};

function lpHandles(sel, adj) {
  const out = [];
  out.push(el('rect', { x: LP_CX - 10, y: 360, width: 20, height: 50, rx: 4, fill: C.frame, opacity: 0.35 }));
  for (const s of [1, -1]) out.push(orangePath(`M${LP_CX + s * 8} 366 L${LP_CX + s * 120} 384`, 12));
  for (const id of ['pos-1', 'pos-2']) for (const s of [1, -1]) out.push(path(lpGrip[id](s).d, 13, C.rubber));
  if (adj) {
    (adj.options || []).filter((o) => !o.deleted).forEach((opt, i) => {
      const geo = lpGrip[opt.id];
      if (!geo) return;
      const on = sel && sel.id === opt.id;
      let art = '';
      for (const s of [1, -1]) {
        const g = geo(s);
        if (on) art += path(g.d, 26, C.accent, { opacity: 0.28 });
        art += path(g.d, on ? 11 : 9, on ? C.accent : '#4a5250') + optMarker(g.mark, i + 1, on);
      }
      out.push(el('g', {
        'data-adj': adj.id, 'data-opt': opt.id, class: `sc-zone sc-grip${on ? ' is-selected' : ''}`,
        role: 'button', tabindex: 0, 'aria-label': `${adj.label}: ${opt.label}`,
      }, el('title', {}, esc(opt.label)) + art));
    });
  }
  return out.join('');
}

/** Притискний валік над стегнами з лінійкою позицій. → {svg} */
function rollerControl(adj, values, o) {
  const val = posValue(adj, values);
  const n = adj ? adj.count : 5;
  const mid = (n + 1) / 2;
  const cy = o.y - (val ? (val - mid) * 5 : 0);
  const art = bar([o.x + 8, cy], [o.x + 8, o.postBottom], 8, C.frame) + dot([o.x, cy], 13, C.pad, C.padEdge, 1.5)
    + dot([o.x + 8, cy], 4, C.metalEdge);
  if (!adj) return art;
  const sp = Math.max(11, Math.min(18, 76 / Math.max(n - 1, 1)));
  const yOf = (k) => o.rulerMid + (mid - k) * sp;
  return zone(adj.id, `${adj.label}: змінити`,
    ring(o.x - 22, cy - 22, 44, 44, 22) + art
    + ruler(adj, { x: o.rulerX, yOf, selected: val, hints: o.hints })
    + (val ? guide(o.x + 22, cy, o.rulerX - 9, yOf(val)) : '')
    + fitBadge(adj, { x: o.badge[0], y: o.badge[1], w: 104, h: 62, value: val ? String(val) : null, raw: val }));
}

export const leverPulldown = {
  id: 'lever-pulldown',
  ADJUSTMENTS: ['grip-pos', 'roller'],
  HINTS: LP_HINTS,
  draw(values = {}, adjustments = []) {
    const grip = pickAdj(adjustments, 'grip-pos');
    const roller = pickAdj(adjustments, 'roller');
    const sel = optValue(grip, values);
    const parts = [floorLine(FLOOR, 250), base(18, 250)];
    // похила колона спереду, вісь угорі, диск на передньому кінці важеля
    parts.push(el('polygon', { points: `58,${FLOOR - 12} 78,${FLOOR - 12} 100,58 82,58`, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }));
    // сидіння (без регулювання)
    parts.push(bar([200, FLOOR - 10], [200, 250], 10, C.frame));
    parts.push(pad(160, 238, 84, 15));
    const hip = [214, 240];
    const hands = [[188, 104], [194, 102]];
    parts.push(seatedSide({ hip, hands, foot: [140, FLOOR - 8], lean: -2, armBend: 'right' }));
    parts.push(rollerControl(roller, values, {
      x: 168, y: 222, postBottom: 262, rulerX: 270, rulerMid: 220, badge: [250, 100], hints: LP_HINTS,
    }));
    // важіль: диск попереду осі, ручки над головою
    parts.push(orangePath('M40 50 L92 58 L178 84 L188 96', 12));
    parts.push(el('rect', { x: 30, y: 44, width: 22, height: 10, fill: C.metal, stroke: C.metalEdge }));
    parts.push(plate([40, 50], 28));
    parts.push(metalDot([92, 58], 8));
    parts.push(bar([176, 98], [204, 98], 12, C.rubber));
    if (grip) {
      parts.push(zone(grip.id, `${grip.label}: змінити`,
        ring(166, 84, 50, 28, 10) + optBadge(grip, sel, 250, 16) + guide(254, 60, 216, 92)));
    }
    parts.push(arrow([[146, 104], [146, 160]]));
    parts.push(text(112, 136, 'вниз', { 'font-size': 12, fill: MOVE, 'font-weight': 700 }));
    parts.push(title('Тяга зверху вниз', 110, 24));
    let y = FLOOR + 14;
    if (grip) {
      parts.push(divider(y + 22));
      parts.push(text(14, y + 46, `${grip.label} — де брати ручку`, { 'font-size': 15, 'font-weight': 700, fill: C.ink }));
      parts.push(text(W - 14, y + 46, 'вигляд спереду', { 'text-anchor': 'end', 'font-size': 11.5, fill: C.muted }));
      parts.push(lpHandles(sel, grip));
      parts.push(optionChips(grip, sel, { y: 470 }));
      y = 524;
    }
    const f = footer(y + 10, { legends: [roller], hints: LP_HINTS, approx: isApprox(grip, roller) });
    parts.push(f.svg);
    return svgRoot(W, f.y + 4, 'Схема вертикальної тяги (тяга зверху вниз): позиція ручки і притискний валік', parts.join(''));
  },
  optionIcon(adjustment, optionId) {
    if (adjustment.id !== 'grip-pos' || !lpGrip[optionId]) return '';
    const inner = orangePath(`M${LP_CX + 8} 366 L${LP_CX + 120} 384`, 10)
      + ['pos-1', 'pos-2'].map((id) => path(lpGrip[id](1).d, 11, id === optionId ? C.accent : '#b8c2be')).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LP_CX} 356 160 80" width="120" height="60" class="grip-icon" aria-hidden="true">${inner}</svg>`;
  },
};

// ======================================================================
// №22 Горизонтальна тяга (диски) — фото 22: сидиш грудьми до подушки, ручки попереду на рівні
// грудей, тяга до себе. Хват — три кольорові зони на ручці (gym/my-photos/tyaga-vazhilna-khvaty.png):
// зелена — верхня горизонтальна частина, червона — вигин угору, помаранчева — внутрішній нижній кінець.
// ======================================================================
const LR_HINTS = SEAT_HINTS;
const GRIP_PATHS = {
  red: 'M204 396 L204 440 Q204 458 222 458',
  orange: 'M222 458 L262 458',
  green: 'M300 400 L228 400',
};
const GRIP_REST = 'M262 458 L300 458 Q326 458 326 432 L326 426 Q326 400 300 400';
const GRIP_MARK = { red: [204, 426], orange: [242, 458], green: [264, 400] };
const GRIP_COLORS = { green: '#2e9d4f', red: '#d63b3b', orange: '#f08a1c' };
const GRIP_ALL = `${GRIP_PATHS.red} ${GRIP_PATHS.orange} ${GRIP_REST} ${GRIP_PATHS.green}`;
const gripColor = (opt) => (opt && (opt.color || GRIP_COLORS[opt.id])) || C.accent;
const mirror = (inner) => `${inner}${el('g', { transform: `translate(${W} 0) scale(-1 1)` }, inner)}`;

function rowHandleFront() {
  return mirror(
    el('path', { d: 'M204 389 L200 372', stroke: C.frame, 'stroke-width': 10, 'stroke-linecap': 'round' })
    + path(GRIP_ALL, 14, C.rubber)
    + metalDot([204, 389], 7.5)
    + metalDot([225, 400], 5.5),
  );
}

function rowGripSeg(opt, sel) {
  const d = GRIP_PATHS[opt.id];
  if (!d) return '';
  const color = gripColor(opt);
  const on = sel && sel.id === opt.id;
  const [mx, my] = GRIP_MARK[opt.id];
  return mirror((on ? path(d, 26, color, { opacity: 0.28 }) : '')
    + path(d, on ? 12 : 9, color, { opacity: on || !sel ? 1 : 0.45 })
    + (on ? el('circle', { cx: mx, cy: my, r: 9, fill: '#ffffff', stroke: color, 'stroke-width': 4 }) : ''));
}

const leverRow = {
  id: 'lever-row',
  ADJUSTMENTS: ['seat', 'grip'],
  HINTS: LR_HINTS,
  draw(values = {}, adjustments = []) {
    const seat = pickAdj(adjustments, 'seat');
    const grip = pickAdj(adjustments, 'grip');
    const sel = optValue(grip, values);
    const sc = seatControl(seat, values, { ...SIDE_SEAT, x: 150, w: 80, post: 200, badge: [250, 110] });
    const hip = [214, 236 + sc.dy];
    const parts = [floorLine(FLOOR, 250), base(18, 250)];
    // стійка грудної подушки й підніжка
    parts.push(bar([140, FLOOR - 10], [146, 204], 10, C.frame));
    parts.push(bar([146, 204], [180, 192], 8, C.frame));
    parts.push(el('rect', { x: 128, y: FLOOR - 22, width: 44, height: 8, rx: 3, fill: C.metal, stroke: C.metalEdge }));
    parts.push(sc.svg);
    parts.push(seatedSide({ hip, hands: [[146, 170], [150, 168]], foot: [124, FLOOR - 24], lean: -6, armBend: 'down' }));
    // грудна подушка — перед грудьми
    parts.push(pad(178, 148, 16, 68));
    // важіль: вісь унизу спереду, диск на важелі, ручка зверху на рівні грудей
    parts.push(el('rect', { x: 100, y: 208, width: 18, height: 10, fill: C.metal, stroke: C.metalEdge }));
    parts.push(plate([108, 214], 28));
    parts.push(orange([96, FLOOR - 26], [134, 170], 13));
    parts.push(metalDot([96, FLOOR - 26], 8));
    const color = sel ? gripColor(sel) : null;
    const sideHandle = el('rect', { x: 126, y: 162, width: 36, height: 14, rx: 7, fill: C.rubber });
    if (grip) {
      parts.push(zone('grip', `${grip.label}: змінити`,
        ring(116, 150, 54, 38, 10) + sideHandle
        + fitBadge(grip, { x: 250, y: 14, w: 104, h: 62, value: sel ? sel.label : null, raw: sel ? sel.id : null, swatch: color, valueSize: 22 })
        + guide(250, 64, 170, 158)));
    } else {
      parts.push(sideHandle);
    }
    parts.push(arrow([[126, 128], [180, 128]]));
    parts.push(text(70, 132, 'до себе', { 'font-size': 12, fill: MOVE, 'font-weight': 700 }));
    parts.push(title('Тяга до себе, ручки на рівні грудей', 14, 24));

    // --- великий малюнок ручки спереду з трьома зонами ---
    let y = FLOOR + 24;
    if (grip) {
      const opts = (grip.options || []).filter((o) => !o.deleted);
      parts.push(divider(336));
      parts.push(text(14, 358, `${grip.label} — де брати ручку`, { 'font-size': 15, 'font-weight': 700, fill: C.ink }));
      parts.push(text(W - 14, 358, 'вигляд спереду', { 'text-anchor': 'end', 'font-size': 11.5, fill: C.muted }));
      parts.push(el('rect', { x: 170, y: 378, width: 20, height: 102, rx: 4, fill: C.frame, opacity: 0.35 }));
      parts.push(rowHandleFront());
      opts.forEach((opt) => {
        const on = sel && sel.id === opt.id;
        parts.push(el('g', {
          'data-adj': 'grip', 'data-opt': opt.id, class: `sc-zone sc-grip${on ? ' is-selected' : ''}`,
          role: 'button', tabindex: 0, 'aria-label': `${grip.label}: ${opt.label}`,
        }, el('title', {}, esc(opt.label)) + rowGripSeg(opt, sel)));
      });
      parts.push(optionChips(grip, sel, { y: 492, numbered: false }));
      y = 548;
    }
    const f = footer(y, { legends: [seat], hints: LR_HINTS, approx: isApprox(seat) });
    parts.push(f.svg);
    return svgRoot(W, f.y + 4, 'Схема горизонтальної тяги (тяга до себе): висота сидіння і хват', parts.join(''));
  },
  optionIcon(adjustment, optionId) {
    if (adjustment.id !== 'grip' || !GRIP_PATHS[optionId]) return '';
    const opt = (adjustment.options || []).find((o) => o.id === optionId) || { id: optionId };
    const inner = path(GRIP_ALL, 14, C.rubber) + metalDot([204, 389], 7.5) + path(GRIP_PATHS[optionId], 12, gripColor(opt));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="190 378 150 92" width="120" height="74" class="grip-icon" aria-hidden="true">${inner}</svg>`;
  },
};

// ======================================================================
// №24 Тяга в блоці — фото 24: сидиш грудьми до подушки, помаранчеві важелі від блоку,
// ручки на рівні грудей, тяга до себе. Регулювань немає.
// ======================================================================
const cablePull = {
  id: 'cable-pull',
  ADJUSTMENTS: [],
  HINTS: {},
  draw() {
    const parts = [floorLine(), base(14, 340), stack(270, 40, 70, FLOOR - 52)];
    // велика дуга рами спереду
    parts.push(path(`M40 ${FLOOR - 10} L40 140 Q40 116 64 116 L110 116`, 14, C.frame));
    parts.push(bar([210, FLOOR - 10], [210, 248], 10, C.frame));
    parts.push(pad(168, 236, 84, 15));
    parts.push(bar([152, FLOOR - 10], [158, 206], 10, C.frame));
    parts.push(bar([158, 206], [190, 196], 8, C.frame));
    parts.push(seatedSide({ hip: [226, 240], hands: [[156, 170], [160, 168]], foot: [128, FLOOR - 8], lean: -6 }));
    parts.push(pad(190, 150, 16, 68));
    // важіль від осі внизу до ручки, трос до блоку
    parts.push(line([110, 252], [290, 252], 2.5, '#7d8a86'));
    parts.push(orange([110, 262], [146, 172], 12));
    parts.push(metalDot([110, 262], 8));
    parts.push(bar([138, 164], [170, 164], 12, C.rubber));
    parts.push(arrow([[136, 132], [192, 132]]));
    parts.push(text(124, 108, 'до себе', { 'font-size': 12, fill: MOVE, 'font-weight': 700 }));
    parts.push(title('Тяга до себе з упором грудьми', 120, 24));
    return svgRoot(W, FLOOR + 12, 'Схема тренажера «Тяга в блоці»', parts.join(''));
  },
};

// ======================================================================
// №25 Тяга вертикального блоку — фото 25: висока стійка з блоком, трос зверху, сидиш під ним,
// стегна під валиком. Регулювання: ручка на карабіні і притискний валік.
// ======================================================================
const LAT_HINTS = { roller: { first: 'найнижче', last: 'найвище' } };
const latPulldown = {
  id: 'lat-pulldown',
  ADJUSTMENTS: ['handle', 'roller'],
  HINTS: LAT_HINTS,
  draw(values = {}, adjustments = []) {
    const handle = pickAdj(adjustments, 'handle');
    const roller = pickAdj(adjustments, 'roller');
    const sel = optValue(handle, values);
    const parts = [floorLine(FLOOR, 250), base(14, 250), stack(14, 30, 70, FLOOR - 42)];
    // верхня балка з блоком над людиною
    parts.push(el('rect', { x: 70, y: 28, width: 150, height: 14, rx: 7, fill: C.frame, stroke: C.frameEdge }));
    parts.push(metalDot([212, 48], 8));
    parts.push(line([212, 56], [204, 90], 2.5, '#7d8a86'));
    parts.push(bar([214, FLOOR - 10], [214, 252], 10, C.frame));
    parts.push(pad(170, 240, 84, 15));
    parts.push(seatedSide({ hip: [226, 242], hands: [[186, 112], [196, 110]], foot: [148, FLOOR - 8], lean: 0, armBend: 'right' }));
    parts.push(rollerControl(roller, values, {
      x: 176, y: 224, postBottom: 262, rulerX: 270, rulerMid: 214, badge: [250, 96], hints: LAT_HINTS,
    }));
    // карабін і ручка
    const clip = el('ellipse', { cx: 204, cy: 94, rx: 4.5, ry: 6, fill: 'none', stroke: C.metalEdge, 'stroke-width': 2.5 });
    const art = sel ? handleArt(sel.id) : '';
    const small = art
      ? `<svg x="170" y="86" width="66" height="44" viewBox="0 0 120 80" data-handle="${sel.id}">${art}</svg>`
      : bar([170, 108], [238, 108], 7, C.metal, C.metalEdge);
    parts.push(arrow([[124, 96], [124, 150]]));
    parts.push(text(96, 88, 'вниз', { 'font-size': 12, fill: MOVE, 'font-weight': 700 }));
    parts.push(title('Тяга зверху вниз', 96, 24));
    let y = FLOOR + 18;
    if (handle) {
      parts.push(zone('handle', `${handle.label}: змінити`,
        ring(162, 80, 84, 54) + clip + small
        + el('rect', { x: 10, y, width: W - 20, height: 92, rx: 16, fill: '#ffffff', stroke: C.accent, 'stroke-width': 2.5, 'stroke-dasharray': sel ? null : '6 4' })
        + text(24, y + 22, 'Яку ручку чіпляти на карабін', { 'font-size': 13, 'font-weight': 600, fill: C.muted })
        + (art
          ? `<svg x="24" y="${y + 28}" width="96" height="60" viewBox="0 0 120 80" data-handle="${sel.id}" class="sc-big-handle">${art}</svg>`
          : text(70, y + 64, '?', { 'font-size': 28, 'font-weight': 800, 'text-anchor': 'middle', fill: C.accent }))
        + fitBadge(handle, { x: 130, y: y + 28, w: 214, h: 56, value: sel ? sel.label : null, raw: sel ? sel.id : null, valueSize: 20 })));
      y += 108;
    } else {
      parts.push(clip + small);
    }
    const f = footer(y + 6, { legends: [roller], hints: LAT_HINTS, approx: isApprox(roller) });
    parts.push(f.svg);
    return svgRoot(W, f.y + 4, 'Схема тяги вертикального блоку: ручка і притискний валік', parts.join(''));
  },
};

// ======================================================================
// Гантелі (12 вправ) — людина з гантелями в характерній позі; регулювань немає.
// ======================================================================
const DB_FLOOR = 262;

/** Гантель збоку (видно гриф і два диски); angle — кут грифа в градусах. */
function dbSide(p, angle = 0, len = 30) {
  const a = (angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const end = (k) => [p[0] + ux * k, p[1] + uy * k];
  return el('g', { class: 'sc-dumbbell' },
    line(end(-len / 2), end(len / 2), 5, C.metalEdge)
    + line(end(-len / 2 + 2), end(-len / 2 + 9), 20, C.rubber, { 'stroke-linecap': 'butt' })
    + line(end(len / 2 - 9), end(len / 2 - 2), 20, C.rubber, { 'stroke-linecap': 'butt' }));
}
/** Гантель торцем (видно диск). */
const dbEnd = (p) => el('g', { class: 'sc-dumbbell' }, dot(p, 11, C.rubber, '#000000', 1) + dot(p, 4, C.metal, C.metalEdge, 1.5));
/** Примарна кінцева/початкова поза руки — пунктиром. */
const ghost = (list) => poly(list, 8, '#b8c2be', { 'stroke-dasharray': '5 5', opacity: 0.9 });

/** Стоїть боком (дивиться ліворуч). */
const STAND = { head: [162, 58], neck: [162, 78], hip: [164, 152] };
const standLegs = [
  { far: true, from: [168, 152], mid: [170, 206], end: [172, 254], toe: [158, 256] },
  { mid: [162, 206], end: [164, 254], toe: [150, 256] },
];
const bench = (x1, x2, y) => el('rect', { x: x1, y, width: x2 - x1, height: 14, rx: 5, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5 })
  + bar([x1 + 14, y + 14], [x1 + 14, DB_FLOOR - 2], 8, C.frame) + bar([x2 - 14, y + 14], [x2 - 14, DB_FLOOR - 2], 8, C.frame);

function dbScheme(id, name, note, inner) {
  return {
    id,
    ADJUSTMENTS: [],
    HINTS: {},
    draw() {
      const cap = wrapText(14, DB_FLOOR + 26, note, { width: W - 28, size: 12.5, lineHeight: 16, fill: C.muted });
      const parts = [floorLine(DB_FLOOR), inner(), title(name), cap.svg];
      return svgRoot(W, DB_FLOOR + 24 + cap.lines * 16, `Схема вправи з гантелями «${name}»`, parts.join(''));
    },
  };
}

const sh = add(STAND.neck, 0, 6);

const DUMBBELLS = [
  dbScheme('db-curl', 'Біцепс стоячи', 'Лікті притиснуті до боків, гантелі піднімати до плечей', () => {
    const elb = [166, 120];
    return ghost([elb, [166, 156]])
      + person({
        ...STAND, legs: standLegs,
        arms: [{ far: true, from: add(sh, 4, 0), mid: [170, 120], end: [170, 156] }, { from: sh, mid: elb, end: [136, 96] }],
      })
      + dbEnd([170, 158]) + dbEnd([136, 96])
      + arrow([[124, 150], [106, 120], [124, 88]]);
  }),
  dbScheme('db-bench-curl', 'Біцепс сидячи на лаві', 'Сидячи на лаві, спина рівно — згинати руки', () => {
    const hip = [204, 178];
    const neck = [200, 106];
    return bench(150, 250, 180) + bar([244, 178], [256, 90], 16, C.pad, C.padEdge)
      + ghost([[204, 146], [206, 180]])
      + person({
        head: [196, 86], neck, hip,
        legs: [{ mid: [150, 182], end: [146, 254], toe: [132, 256] }],
        arms: [{ far: true, from: add(neck, 4, 6), mid: [208, 146], end: [210, 182] }, { from: add(neck, 0, 6), mid: [204, 146], end: [174, 122] }],
      })
      + dbEnd([210, 184]) + dbEnd([174, 122])
      + arrow([[162, 172], [144, 146], [160, 112]]);
  }),
  dbScheme('db-hammer', 'Молотки', 'Хват «молоток» — долоні дивляться одна на одну', () => {
    const elb = [166, 120];
    return person({
      ...STAND, legs: standLegs,
      arms: [{ far: true, from: add(sh, 4, 0), mid: [170, 120], end: [170, 156] }, { from: sh, mid: elb, end: [138, 96] }],
    })
      + dbSide([170, 158], 90, 30) + dbSide([138, 96], 140, 30)
      + arrow([[120, 152], [100, 122], [116, 86]]);
  }),
  dbScheme('db-lateral', 'Махи в сторони', 'Обличчям до нас: руки через сторони до рівня плечей', () => {
    const cx = 180;
    const out = [];
    for (const s of [1, -1]) {
      out.push(ghost([[cx + s * 22, 86], [cx + s * 30, 124], [cx + s * 34, 158]]));
      out.push(bar([cx + s * 10, 150], [cx + s * 14, 204], 16, CLOTH) + bar([cx + s * 14, 204], [cx + s * 16, 254], 14, CLOTH) + bar([cx + s * 16, 254], [cx + s * 26, 256], 9, SHOE));
    }
    out.push(el('rect', { x: cx - 22, y: 78, width: 44, height: 78, rx: 13, fill: CLOTH }));
    out.push(bar([cx, 78], [cx, 60], 9, SKIN) + dot([cx, 56], 13, SKIN, SKIN_EDGE, 1.2));
    for (const s of [1, -1]) {
      out.push(poly([[cx + s * 22, 86], [cx + s * 58, 90], [cx + s * 94, 92]], 10, CLOTH) + dot([cx + s * 94, 92], 5.5, SKIN));
      out.push(dbEnd([cx + s * 98, 94]));
      out.push(arrow([[cx + s * 52, 164], [cx + s * 110, 160], [cx + s * 112, 116]]));
    }
    return out.join('');
  }),
  dbScheme('db-front', 'Підйом перед собою', 'Руки прямі — підняти гантелі перед собою до рівня плечей', () =>
    ghost([sh, [164, 120], [164, 156]])
    + person({
      ...STAND, legs: standLegs,
      arms: [{ far: true, from: add(sh, 4, 0), mid: [170, 120], end: [170, 156] }, { from: sh, mid: [128, 86], end: [94, 88] }],
    })
    + dbEnd([170, 158]) + dbEnd([92, 88])
    + arrow([[136, 166], [86, 156], [80, 108]])),
  dbScheme('db-press', 'Жим гантелей лежачи', 'Лежачи на лаві — вижимати гантелі вгору над грудьми', () => {
    const neck = [104, 176];
    return bench(70, 250, 186)
      + ghost([[112, 180], [96, 196], [112, 166]])
      + person({
        head: [84, 172], neck, hip: [196, 178], torso: 24,
        legs: [{ mid: [240, 160], end: [252, 254], toe: [266, 256] }],
        arms: [{ from: [112, 174], mid: [110, 136], end: [112, 100] }],
      })
      + dbEnd([112, 98])
      + arrow([[148, 160], [148, 104]]);
  }),
  dbScheme('db-fly', 'Розведення гантелей лежачи', 'Вигляд з боку голови: руки широко в сторони і зведення над грудьми', () => {
    const cx = 180;
    const out = [bench(cx - 40, cx + 40, 194)];
    out.push(el('ellipse', { cx, cy: 182, rx: 38, ry: 14, fill: CLOTH }));
    out.push(dot([cx, 168], 13, SKIN, SKIN_EDGE, 1.2));
    for (const s of [1, -1]) {
      out.push(ghost([[cx + s * 32, 176], [cx + s * 30, 128], [cx + s * 14, 84]]));
      out.push(poly([[cx + s * 32, 176], [cx + s * 78, 160], [cx + s * 118, 154]], 10, CLOTH) + dot([cx + s * 118, 154], 5.5, SKIN));
      out.push(dbEnd([cx + s * 122, 152]));
      out.push(arrow([[cx + s * 128, 128], [cx + s * 104, 74], [cx + s * 40, 70]]));
    }
    return out.join('');
  }),
  dbScheme('db-seated-press', 'Жим гантелей сидячи', 'Обличчям до нас: від плечей угору', () => {
    const cx = 180;
    const out = [pad(cx - 26, 70, 52, 120), bar([cx, 196], [cx, DB_FLOOR - 2], 9, C.frame), pad(cx - 44, 186, 88, 14)];
    out.push(seatedFront({ cx, hipY: 186, hands: [[cx + 64, 110], [cx - 64, 110]], floor: DB_FLOOR, armBend: 'down', elbowOut: 12 }));
    for (const s of [1, -1]) {
      out.push(ghost([[cx + s * 64, 104], [cx + s * 40, 60]]));
      out.push(dbSide([cx + s * 64, 106], 0, 34));
      out.push(arrow([[cx + s * 104, 110], [cx + s * 104, 60]]));
    }
    return out.join('');
  }),
  dbScheme('db-row', 'Тяга гантелі в нахилі', 'Коліно й рука на лаві, спина рівна — тягнути гантель до пояса', () =>
    bench(150, 280, 176)
    + ghost([[120, 136], [122, 172], [124, 208]])
    + person({
      head: [96, 116], neck: [114, 126], hip: [202, 130],
      legs: [
        { far: true, from: [206, 132], mid: [214, 172], end: [262, 172], toe: [270, 166] },
        { mid: [190, 194], end: [188, 254], toe: [174, 256] },
      ],
      arms: [{ far: true, from: [126, 132], mid: [140, 152], end: [156, 172] }, { from: [122, 132], mid: [150, 104], end: [140, 150] }],
    })
    + dbSide([140, 152], 0, 30)
    + arrow([[86, 210], [86, 150]])),
  dbScheme('db-overhead', 'Розгинання з-за голови', 'Гантель двома руками за головою — розгинати руки вгору', () =>
    ghost([[162, 112], [156, 72], [150, 38]])
    + person({
      head: [162, 88], neck: [162, 108], hip: [164, 182], legs: standLegs.map((l) => ({ ...l, from: l.from && add(l.from, 0, 30), mid: add(l.mid, 0, 24), end: add(l.end, 0, 2), toe: add(l.toe, 0, 2) })),
      arms: [{ from: [162, 114], mid: [156, 66], end: [186, 92] }],
    })
    + dbSide([188, 92], 80, 30)
    + arrow([[210, 96], [222, 64], [196, 38]])),
  dbScheme('db-lunge', 'Випади з гантелями', 'Крок уперед, заднє коліно — майже до підлоги', () =>
    person({
      head: [166, 58], neck: [166, 78], hip: [168, 150],
      legs: [
        { far: true, from: [172, 150], mid: [206, 214], end: [244, 248], toe: [254, 254] },
        { mid: [118, 186], end: [116, 252], toe: [100, 254] },
      ],
      arms: [{ from: [166, 84], mid: [168, 120], end: [170, 154] }],
    })
    + dbSide([170, 158], 0, 30)
    + arrow([[70, 120], [70, 176]])),
  dbScheme('db-squat', 'Присідання з гантеллю', 'Гантель біля грудей — присідати, таз назад', () =>
    person({
      head: [150, 90], neck: [158, 108], hip: [200, 176],
      legs: [{ mid: [140, 190], end: [156, 252], toe: [140, 254] }],
      arms: [{ from: [158, 114], mid: [136, 146], end: [140, 120] }],
    })
    + dbSide([138, 122], 90, 30)
    + arrow([[248, 120], [248, 176]]) + arrow([[268, 176], [268, 120]])),
];

export const SCHEMES = [
  plateChestPress, lateralRaise, plateShoulderPress, abStation, assistedDip, assistedPullup,
  tricepsPress, cableCurl, leverPulldown, leverRow, cablePull, latPulldown, ...DUMBBELLS,
];
