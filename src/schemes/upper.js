// Збірка схем верхньої частини тіла: груди, спина, плечі, руки, прес, гантелі.
// Тренажери — модулі нового контракту (interfaces.md «T08 — каркас схем»):
//   { id, ADJUSTMENTS, HINTS, art({exerciseId, mini}) → SVG, MARKERS(exerciseId) → {[adj]: {x, y}}, PICKERS }.
// Малюнок art — об'ємний, у ракурсі ¾ (~45° згори-спереду): тренажер будується в 3D (сантиметри,
// x — праворуч від людини, y — куди людина дивиться, z — угору), проєктується ортографічно й
// малюється від дальнього до ближнього. Жодного тексту, бейджів, шкал — лише тренажер і людина;
// мітки регулювань (MARKERS) — 3D-точки на деталях, які регулюють; шкали позицій — у PICKERS.
// Малюнки — за фото gym/my-photos/ (з залу) і gym/photos/ (з сайту), номер — у коментарі.
// Гантелі (12 вправ) лишаються на старому контракті draw — малюнок без змін, значок дає меню.
// 3D-цеглинки експортуються для butterfly.js і low-row.js; lever-pulldown.js реекспортує свою схему звідси.
// Сховані в каталозі (№1, №13, №23) схем не мають — для них заглушка.

import { C, el, esc, text, svgRoot, wrapText } from './svg.js';
import { handleArt } from './handles.js';

// --- 2D-цеглинки старого контракту (гантелі) ---
const W = 360;
const FLOOR = 300;
const SKIN = '#e6c3a6';
const SKIN_EDGE = '#b9906f';
const CLOTH = '#5d6973';
const CLOTH_FAR = '#8d98a2';
const SHOE = '#2b3230';
const ARM = '#414c55';        // ближня рука — темніша, щоб було видно на тлі тулуба
const MOVE = '#c2410c';        // стрілка руху

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
const floorLine = (y = FLOOR, x2 = W - 8) => el('line', { x1: 8, y1: y + 1, x2, y2: y + 1, stroke: C.floor, 'stroke-width': 3 });
const pad = (x, y, w, h, extra = {}) => el('rect', {
  x, y, width: w, height: h, rx: Math.min(w, h) / 2, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5, ...extra,
});
const title = (s, x = 14, y = 24) => text(x, y, s, { 'font-size': 13.5, 'font-weight': 700, fill: C.muted });

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

// ======================================================================
// 3D-цеглинки для малюнків у ракурсі ¾
// ======================================================================
const RAD = Math.PI / 180;
export const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vMul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vLen = (a) => Math.hypot(a[0], a[1], a[2]);
const vNorm = (a) => {
  const l = vLen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const vLerp = (a, b, t) => vAdd(a, vMul(vSub(b, a), t));
const vAvg = (list) => vMul(list.reduce(vAdd, [0, 0, 0]), 1 / list.length);
/** Точка з дзеркальної сторони: s = 1 — праворуч від людини (x > 0), s = −1 — ліворуч. */
export const sx = (p, s) => [p[0] * s, p[1], p[2]];

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Світліше (k > 0) або темніше (k < 0) на частку k. */
export function tone(hex, k) {
  const to = k >= 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(k));
  return `#${rgb(hex).map((c) => Math.round(c + (to - c) * t).toString(16).padStart(2, '0')).join('')}`;
}

// Палітра (як на фото залу): графітові рами, помаранчеві важелі ARP, сіро-зелені подушки SHUA.
export const P3 = {
  bg: '#f8faf9',
  floor: '#e2e8e4',
  frame: '#4b555a',
  panel: '#b4bcb7',      // сіра панель стійки з вагою SHUA
  panelArp: '#a3aaae',   // сіра панель ARP
  padShua: '#46685c',
  pad: '#2f3537',        // чорні подушки ARP
  orange: '#f07f22',
  metal: '#c9d1d4',
  rubber: '#26292b',
  plate: '#2c3133',
  plateGreen: '#2f9e44',
  cable: '#66727a',
  pin: '#d64545',
  shirt: '#4d74aa',
  pants: '#36414f',
  skin: '#e9c5a5',
  hair: '#4a382c',
  shoe: '#22272a',
};
const FR = P3.frame;

/**
 * Сцена: yaw — поворот камери від «прямо спереду» до правого боку людини, pitch — кут згори.
 * Елементи збираються як 3D-примітиви й малюються від дальнього до ближнього (layer, потім глибина).
 */
export function scene3d({ yaw = 32, pitch = 22, mini = false } = {}) {
  const a = yaw * RAD;
  const p = pitch * RAD;
  const R = [-Math.cos(a), Math.sin(a), 0];
  const U = [-Math.sin(a) * Math.sin(p), -Math.cos(a) * Math.sin(p), Math.cos(p)];
  const D = [Math.sin(a) * Math.cos(p), Math.cos(a) * Math.cos(p), Math.sin(p)];
  const L = vNorm(vAdd(vAdd(vMul(R, -0.55), vMul(U, 0.8)), vMul(D, 0.5)));
  const S = {
    mini, D, L, items: [], markers: {},
    P: (q) => [vDot(q, R), -vDot(q, U)],
    Z: (q) => vDot(q, D),
    add: (it) => {
      S.items.push({ layer: 1, z: 0, m: 0, ...it });
      return it;
    },
    mark: (id, q) => { S.markers[id] = q; },
  };
  return S;
}

const lit = (S, n, color) => {
  const k = vDot(n, S.L);
  return tone(color, k >= 0 ? k * 0.26 : k * 0.42);
};
const ptsT = (T, list) => list.map((p) => `${T.X(p)},${T.Y(p)}`).join(' ');

const HEX_FACES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]];

/** Опукле тіло з 8 вершин (біт 1 — вісь a, біт 2 — вісь b, біт 4 — вісь c): видимі грані з освітленням. */
export function hexa(S, c8, color, o = {}) {
  const center = vAvg(c8);
  const faces = [];
  for (const f of HEX_FACES) {
    const q = f.map((i) => c8[i]);
    let n = vNorm(vCross(vSub(q[1], q[0]), vSub(q[3], q[0])));
    if (vDot(n, vSub(vAvg(q), center)) < 0) n = vMul(n, -1);
    if (vDot(n, S.D) > 0.015) faces.push({ p: q.map(S.P), fill: lit(S, n, color) });
  }
  const edge = o.edge || tone(color, -0.45);
  // soft — м'які обриси (тулуб людини): обведення кольором грані, заокруглені кути
  const sw = (T) => (T.mini ? T.grow : o.soft ? r1(o.soft * T.s) : 0.8);
  return S.add({
    pts: c8.map(S.P), m: o.soft ? o.soft / 2 : 0, z: S.Z(center) + (o.bias || 0), layer: o.layer ?? 1, kind: o.kind,
    svg: (T) => faces.map((f) => el('polygon', {
      points: ptsT(T, f.p), fill: f.fill,
      stroke: T.mini || o.soft ? f.fill : edge, 'stroke-width': sw(T), 'stroke-linejoin': 'round',
    })).join(''),
  });
}

/** Брусок за центром і трьома півосями. */
export function obox(S, c, ax, ay, az, color, o = {}) {
  const c8 = [];
  for (let i = 0; i < 8; i++) {
    c8.push(vAdd(vAdd(vAdd(c, vMul(ax, i & 1 ? 1 : -1)), vMul(ay, i & 2 ? 1 : -1)), vMul(az, i & 4 ? 1 : -1)));
  }
  return hexa(S, c8, color, o);
}

/** Брусок за двома кутами (осі — як у світу). */
export function box(S, lo, hi, color, o = {}) {
  const c = vLerp(lo, hi, 0.5);
  return obox(S, c, [(hi[0] - lo[0]) / 2, 0, 0], [0, (hi[1] - lo[1]) / 2, 0], [0, 0, (hi[2] - lo[2]) / 2], color, o);
}

/** Прямокутна труба/балка від a до b, перетин w (убік) × h (товщина). */
export function beam(S, a, b, w, h, color, o = {}) {
  const ab = vSub(b, a);
  const len = vLen(ab) || 1;
  const u = vMul(ab, 1 / len);
  let side = vCross(u, [0, 0, 1]);
  if (vLen(side) < 0.35) side = vCross(u, [0, 1, 0]);
  side = vNorm(side);
  const third = vNorm(vCross(side, u));
  const ext = o.ext ?? Math.min(w, h) / 2;
  return obox(S, vLerp(a, b, 0.5), vMul(u, len / 2 + ext), vMul(side, w / 2), vMul(third, h / 2), color, o);
}

/** Ламана з брусків. */
export function beams(S, list, w, h, color, o = {}) {
  for (let i = 0; i < list.length - 1; i++) beam(S, list[i], list[i + 1], w, h, color, o);
}

/** Кругла труба (ручки, троси, кінцівки) — товста лінія з обведенням і відблиском. */
export function tube(S, q, w, color, o = {}) {
  const p = q.map(S.P);
  return S.add({
    pts: p, m: w / 2, z: (o.at ? S.Z(o.at) : q.reduce((m, x) => m + S.Z(x), 0) / q.length) + (o.bias || 0),
    layer: o.layer ?? 1, kind: o.kind,
    svg: (T) => {
      const W = r1(Math.max(w * T.s * (T.mini ? 1.5 : 1), T.mini ? 2.2 : 1));
      const d = `M${p.map((x) => `${T.X(x)} ${T.Y(x)}`).join(' L')}`;
      let out = (o.edge === false ? '' : path(d, r1(W + (T.mini ? 0 : 1.7)), o.edgeColor || tone(color, -0.45)))
        + path(d, W, color);
      if (!T.mini && W >= 4.5 && o.shine !== false) {
        const dx = -W * 0.2;
        const dy = -W * 0.16;
        const d2 = `M${p.map((x) => `${r1(T.X(x) + dx)} ${r1(T.Y(x) + dy)}`).join(' L')}`;
        out += path(d2, r1(W * 0.26), tone(color, 0.32), { opacity: 0.7 });
      }
      return out;
    },
  });
}

/** Диск (млинець, шків, поворотна платформа): нормаль n, радіус r, товщина thick. */
export function disc(S, c, n, r, color, o = {}) {
  let nn = vNorm(n);
  if (vDot(nn, S.D) < 0) nn = vMul(nn, -1);
  const e1 = vNorm(Math.abs(nn[2]) < 0.9 ? vCross(nn, [0, 0, 1]) : vCross(nn, [1, 0, 0]));
  const e2 = vCross(nn, e1);
  const N = 30;
  const th = o.thick ?? 3;
  const ring = (cc, rr) => Array.from({ length: N }, (_, i) => {
    const t = (i / N) * Math.PI * 2;
    return vAdd(cc, vAdd(vMul(e1, Math.cos(t) * rr), vMul(e2, Math.sin(t) * rr)));
  });
  const front = ring(c, r);
  const back = ring(vSub(c, vMul(nn, th)), r);
  const band = [];
  for (let i = 0; i < N; i++) {
    const t = ((i + 0.5) / N) * Math.PI * 2;
    const m = vAdd(vMul(e1, Math.cos(t)), vMul(e2, Math.sin(t)));
    if (th > 0 && vDot(m, S.D) > -0.05) band.push([front[i], front[(i + 1) % N], back[(i + 1) % N], back[i]].map(S.P));
  }
  const fp = front.map(S.P);
  const inner = o.plate ? ring(vAdd(c, vMul(nn, 0.2)), r * 0.7).map(S.P) : null;
  const hub = o.plate ? ring(vAdd(c, vMul(nn, 0.4)), Math.max(2.4, r * 0.2)).map(S.P) : null;
  const side = tone(color, -0.38);
  return S.add({
    pts: [...fp, ...back.map(S.P)], z: S.Z(c) + (o.bias || 0), layer: o.layer ?? 1, kind: o.kind,
    svg: (T) => band.map((q) => el('polygon', {
      points: ptsT(T, q), fill: side, stroke: side, 'stroke-width': T.mini ? T.grow : 0.6, 'stroke-linejoin': 'round',
    })).join('')
      + el('polygon', {
        points: ptsT(T, fp), fill: color, stroke: T.mini ? color : tone(color, -0.5),
        'stroke-width': T.mini ? T.grow : 0.8, 'stroke-linejoin': 'round',
      })
      + (inner && !T.mini ? el('polygon', { points: ptsT(T, inner), fill: 'none', stroke: tone(color, 0.16), 'stroke-width': 1.2 }) : '')
      + (hub ? el('polygon', { points: ptsT(T, hub), fill: P3.metal, stroke: tone(P3.metal, -0.45), 'stroke-width': T.mini ? 0.5 : 0.8 }) : ''),
  });
}

/** Куля (голова, кисть, ручка-фіксатор). */
export function ball(S, c, r, color, o = {}) {
  const p = S.P(c);
  return S.add({
    pts: [p], m: r, z: S.Z(c) + (o.bias || 0), layer: o.layer ?? 1, kind: o.kind,
    svg: (T) => el('circle', {
      cx: T.X(p), cy: T.Y(p), r: r1(r * T.s * (T.mini ? 1.3 : 1)), fill: color,
      stroke: o.edge === false ? null : tone(color, -0.42), 'stroke-width': o.edge === false ? null : 0.8,
    }),
  });
}

/** Плаский многокутник (тінь на підлозі, панель). */
export function flat(S, q, fill, o = {}) {
  const p = q.map(S.P);
  return S.add({
    pts: p, z: (o.at ? S.Z(o.at) : S.Z(vAvg(q))) + (o.bias || 0), layer: o.layer ?? 1, kind: o.kind,
    svg: (T) => el('polygon', {
      points: ptsT(T, p), fill, stroke: o.stroke || null, 'stroke-width': o.stroke ? 0.8 : null, 'stroke-linejoin': 'round',
    }),
  });
}

/** Тінь під тренажером (еліпс на підлозі). */
export function floorShadow(S, cx, cy, rx, ry) {
  const q = Array.from({ length: 32 }, (_, i) => {
    const t = (i / 32) * Math.PI * 2;
    return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, 0];
  });
  return flat(S, q, P3.floor, { layer: 0 });
}

/** Трос — тонка лінія. */
export function cable(S, a, b) {
  const p = [S.P(a), S.P(b)];
  return S.add({
    pts: p, z: (S.Z(a) + S.Z(b)) / 2, kind: 'detail',
    svg: (T) => el('line', {
      x1: T.X(p[0]), y1: T.Y(p[0]), x2: T.X(p[1]), y2: T.Y(p[1]), stroke: P3.cable, 'stroke-width': 1.4,
    }),
  });
}

/** Стійка з вагою: графітовий корпус і сірі панелі на видимих бічних гранях. */
export function tower(S, lo, hi, panel = P3.panel) {
  box(S, lo, hi, FR);
  const inset = 5;
  const faces = [
    { n: [1, 0, 0], q: (e) => [[hi[0] + e, lo[1] + inset, lo[2] + 14], [hi[0] + e, hi[1] - inset, lo[2] + 14], [hi[0] + e, hi[1] - inset, hi[2] - inset], [hi[0] + e, lo[1] + inset, hi[2] - inset]] },
    { n: [-1, 0, 0], q: (e) => [[lo[0] - e, lo[1] + inset, lo[2] + 14], [lo[0] - e, hi[1] - inset, lo[2] + 14], [lo[0] - e, hi[1] - inset, hi[2] - inset], [lo[0] - e, lo[1] + inset, hi[2] - inset]] },
    { n: [0, 1, 0], q: (e) => [[lo[0] + inset, hi[1] + e, lo[2] + 14], [hi[0] - inset, hi[1] + e, lo[2] + 14], [hi[0] - inset, hi[1] + e, hi[2] - inset], [lo[0] + inset, hi[1] + e, hi[2] - inset]] },
    { n: [0, -1, 0], q: (e) => [[lo[0] + inset, lo[1] - e, lo[2] + 14], [hi[0] - inset, lo[1] - e, lo[2] + 14], [hi[0] - inset, lo[1] - e, hi[2] - inset], [lo[0] + inset, lo[1] - e, hi[2] - inset]] },
  ];
  for (const f of faces) {
    if (vDot(f.n, S.D) <= 0.05) continue;
    const q = f.q(0.4);
    flat(S, q, lit(S, f.n, panel), { stroke: tone(panel, -0.35), bias: 0.6 });
    // проріз з направляючою стека — деталь (у значку не потрібна)
    const mid = vLerp(vLerp(q[0], q[1], 0.5), vLerp(q[3], q[2], 0.5), 0.12);
    const top = vLerp(vLerp(q[0], q[1], 0.5), vLerp(q[3], q[2], 0.5), 0.86);
    const p = [S.P(mid), S.P(top)];
    S.add({
      pts: p, z: S.Z(vAvg(q)) + 0.8, kind: 'detail',
      svg: (T) => el('line', { x1: T.X(p[0]), y1: T.Y(p[0]), x2: T.X(p[1]), y2: T.Y(p[1]), stroke: tone(panel, -0.55), 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
    });
  }
}

/** Млинець на втулці: c — центр, axis — напрям втулки назовні (одиничний). */
export function plateOn(S, c, axis, r, color = P3.plate) {
  tube(S, [vSub(c, vMul(axis, 7)), vAdd(c, vMul(axis, 9))], 4.5, P3.metal);
  disc(S, c, axis, r, color, { thick: 4, plate: true });
}

/** Ручка (гумовий хват). */
export const grip = (S, q, o = {}) => tube(S, q, o.w ?? 4.6, P3.rubber, o);

/**
 * Сидіння на стійці з фіксатором (шпилька збоку) — регулювання висоти.
 * c — центр подушки [x, y], top — висота верху подушки; повертає точку фіксатора (для мітки).
 */
export function seatOnPost(S, { x = 0, y = 0, top = 46, w = 38, d = 36, color = P3.pad, pin = true }) {
  box(S, [x - 5, y - 5, 2], [x + 5, y + 5, 26], FR);
  box(S, [x - 3.4, y - 3.4, 24], [x + 3.4, y + 3.4, top - 6], P3.metal);
  box(S, [x - w / 2, y - d / 2, top - 7], [x + w / 2, y + d / 2, top], color);
  const knob = [x + 8.5, y + 3, 18];
  if (pin) {
    tube(S, [[x + 4, y + 3, 18], knob], 2.4, P3.metal, { kind: 'detail' });
    ball(S, knob, 3, P3.pin, { kind: 'detail' });
  }
  return knob;
}

/** Інверсна кінематика двох ланок: суглоб між a і b, зігнутий у бік pole. */
function ik(a, b, l1, l2, pole) {
  const ab = vSub(b, a);
  const d = Math.max(0.1, Math.min(vLen(ab), l1 + l2 - 0.01));
  const u = vNorm(ab);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const q = vNorm(vSub(pole, vMul(u, vDot(pole, u))));
  return vAdd(vAdd(a, vMul(u, x)), vMul(q, h));
}

/**
 * Людина (у значку не малюється). Обидві сторони будуються однаково — поза симетрична.
 * o: pelvis — центр таза; face — куди дивиться (горизонтально); lean — нахил тулуба вперед (−назад);
 *    hand(s), ankle(s) — точки кистей і кісточок (s = 1 праворуч, x > 0); elbowPole(s), kneePole(s) —
 *    куди згинаються лікті й коліна; elbow(s)/knee(s) — задати суглоб явно; toe(s) — напрям стопи.
 */
export function human(S, o) {
  const up = [0, 0, 1];
  const f = vNorm(o.face || [0, 1, 0]);
  let right = vNorm(vCross(f, up));
  if (right[0] < 0) right = vMul(right, -1);   // s = 1 завжди з боку x > 0
  const t = vNorm(vAdd(up, vMul(f, o.lean || 0)));
  const fwd = vNorm(vCross(t, vNorm(vCross(f, up))));
  const pel = o.pelvis;
  const at = (k) => vAdd(pel, vMul(t, k));
  const chest = at(46);
  const neckBase = at(49);
  const head = vAdd(at(64), vMul(fwd, 1.5));
  const kind = 'person';
  const torsoCenter = at(22);
  const zTorso = S.Z(torsoCenter);
  const shade = (q, color) => (S.Z(q) < zTorso - 6 ? tone(color, -0.16) : color);

  // таз (штани) і тулуб (футболка) — об'ємні
  const corner = (base, hw, hd, i) => vAdd(vAdd(base, vMul(right, i & 1 ? hw : -hw)), vMul(fwd, i & 2 ? hd : -hd));
  const hexOf = (b0, b1, w0, w1, d0, d1) => Array.from({ length: 8 }, (_, i) => (i & 4 ? corner(b1, w1, d1, i) : corner(b0, w0, d0, i)));
  hexa(S, hexOf(at(-6), at(10), 11.5, 12.5, 9, 9), P3.pants, { kind, soft: 3 });
  hexa(S, hexOf(at(7), at(47), 12.5, 15.5, 8.5, 9), P3.shirt, { kind, bias: 0.5, soft: 4 });

  for (const s of [1, -1]) {
    const side = vMul(right, s);
    const sh = vAdd(vAdd(chest, vMul(side, 16)), vMul(t, -2));
    const hip = vAdd(pel, vMul(side, 8.5));
    const hand = o.hand(s);
    const ankle = o.ankle(s);
    const elbow = o.elbow ? o.elbow(s) : ik(sh, hand, 28, 27, o.elbowPole ? o.elbowPole(s) : [s, 0, -1]);
    const knee = o.knee ? o.knee(s) : ik(hip, ankle, 45, 44, o.kneePole ? o.kneePole(s) : [0, 0.4, 1]);
    const toeDir = vNorm(o.toe ? o.toe(s) : f);
    const toe = vAdd(ankle, vMul(toeDir, 15));
    // ноги
    tube(S, [hip, knee], 13.5, shade(vLerp(hip, knee, 0.5), P3.pants), { kind });
    tube(S, [knee, ankle], 10.5, shade(vLerp(knee, ankle, 0.5), P3.pants), { kind });
    tube(S, [vSub(ankle, vMul(toeDir, 3)), toe], 9.5, P3.shoe, { kind, shine: false });
    // руки: рукав, плече, передпліччя, кисть
    const sleeve = vLerp(sh, elbow, 0.42);
    tube(S, [sh, sleeve], 11.5, shade(sh, P3.shirt), { kind, bias: 0.4 });
    tube(S, [sleeve, elbow], 8.6, shade(elbow, P3.skin), { kind });
    tube(S, [elbow, hand], 8, shade(vLerp(elbow, hand, 0.5), P3.skin), { kind });
    ball(S, hand, 4.6, shade(hand, P3.skin), { kind, bias: 2 });
  }
  // шия і голова (волосся ззаду — видно, куди дивиться людина)
  tube(S, [neckBase, at(57)], 9, P3.skin, { kind, shine: false });
  ball(S, vAdd(vAdd(head, vMul(fwd, -2.6)), vMul(t, 1.6)), 11, P3.hair, { kind, edge: false });
  ball(S, vAdd(head, vMul(fwd, 1.2)), 10, P3.skin, { kind, bias: 0.2 });
}

/**
 * Малюнок сцени: SVG і мітки. Повний — 360 у ширину; значок (mini) — 120×100 без людини й дрібниць.
 */
export function renderScene(S, label, { maxH = 340 } = {}) {
  const mini = S.mini;
  const items = S.items.filter((it) => !(mini && (it.kind === 'person' || it.kind === 'detail')));
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const it of items) {
    for (const p of it.pts) {
      x0 = Math.min(x0, p[0] - it.m);
      y0 = Math.min(y0, p[1] - it.m);
      x1 = Math.max(x1, p[0] + it.m);
      y1 = Math.max(y1, p[1] + it.m);
    }
  }
  const bw = Math.max(1, x1 - x0);
  const bh = Math.max(1, y1 - y0);
  const Wd = mini ? 120 : 360;
  const pad = mini ? 4 : 14;
  const Hmax = mini ? 100 : maxH;
  const s = Math.min(mini ? 10 : 1.75, (Wd - 2 * pad) / bw, (Hmax - 2 * pad) / bh);
  const H = mini ? 100 : Math.round(bh * s + 2 * pad);
  const ox = (Wd - bw * s) / 2;
  const oy = (H - bh * s) / 2;
  const T = {
    X: (p) => r1((p[0] - x0) * s + ox), Y: (p) => r1((p[1] - y0) * s + oy), s, mini, grow: mini ? 2.2 : 0,
  };
  const sorted = items.map((it, i) => ({ it, i }))
    .sort((a, b) => (a.it.layer - b.it.layer) || (a.it.z - b.it.z) || (a.i - b.i))
    .map((x) => x.it);
  const body = sorted.map((it) => (it.kind === 'person' ? `<g class="sc-person">${it.svg(T)}</g>` : it.svg(T))).join('');
  const head = mini
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wd} ${H}" class="scheme-mini" aria-hidden="true">`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wd} ${H}" class="scheme-svg scheme-art" role="img" aria-label="${esc(label)}">`
      + el('rect', { x: 0, y: 0, width: Wd, height: H, rx: 16, fill: P3.bg });
  const markers = {};
  for (const [id, q] of Object.entries(S.markers)) {
    const p = S.P(q);
    markers[id] = { x: T.X(p), y: T.Y(p) };
  }
  return { svg: `${head}${body}</svg>`, markers };
}

/**
 * Модуль схеми нового контракту. build(exerciseId, mini) → {svg, markers} (renderScene).
 * Малюнок і мітки кешуються на вправу.
 */
export function artModule({ id, ADJUSTMENTS = [], HINTS = {}, PICKERS = {}, build }) {
  const cache = new Map();
  const get = (exerciseId, mini) => {
    const key = `${exerciseId}|${mini ? 1 : 0}`;
    if (!cache.has(key)) cache.set(key, build(exerciseId ?? null, !!mini));
    return cache.get(key);
  };
  return {
    id, ADJUSTMENTS, HINTS, PICKERS,
    art: ({ exerciseId = null, mini = false } = {}) => get(exerciseId, mini).svg,
    MARKERS: (exerciseId) => get(exerciseId ?? null, false).markers,
  };
}

// ======================================================================
// PICKERS — наочність у вікні вибору (тут можна й підписи)
// ======================================================================
const ACC = C.accent;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
function pickerSvg(w, h, label, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="picker-svg" role="img"`
    + ` aria-label="${esc(label)}" font-family="${FONT}">${el('rect', { x: 0, y: 0, width: w, height: h, fill: P3.bg })}${inner}</svg>`;
}
/** Кнопка вибору: data-pick і клас is-on для вибраного. */
const pickG = (value, on, label, inner) => el('g', { 'data-pick': value, class: on ? 'pk is-on' : 'pk', 'aria-label': label },
  el('title', {}, esc(label)) + inner);
const fit = (s, room, max) => r1(Math.max(10, Math.min(max, room / (String(s).length * 0.58))));

export const SEAT_HINTS = { seat: { first: 'найнижче', last: 'найвище' } };
export const ROLLER_HINTS = { roller: { first: 'найнижче', last: 'найвище' } };

/**
 * Висота на стійці з отворами: kind 'seat' — подушка сидіння, 'roller' — притискний валік над стегном.
 * Праворуч — рядки 1…N (N угорі) з поясненням крайніх.
 */
export function heightPicker(kind, hints) {
  return (value, adj) => {
    const n = Math.max(1, Math.min(12, Number(adj.count) || 5));
    const h = hints[adj.id] || { first: 'найнижче', last: 'найвище' };
    const sel = Number(value) >= 1 && Number(value) <= n && Number.isInteger(Number(value)) ? Number(value) : null;
    const W = 330;
    const H = 230;
    const rowH = Math.min(38, 196 / n);
    const yOf = (k) => 16 + (n - k) * rowH + rowH / 2;
    const out = [];
    const px = 84;
    // стійка з отворами
    out.push(el('rect', { x: px - 7, y: yOf(n) - 16, width: 14, height: H - yOf(n) + 6, rx: 3, fill: P3.metal, stroke: tone(P3.metal, -0.45) }));
    out.push(el('rect', { x: px - 12, y: H - 46, width: 24, height: 40, rx: 4, fill: FR }));
    out.push(el('rect', { x: 24, y: H - 10, width: 130, height: 6, rx: 3, fill: FR }));
    for (let k = 1; k <= n; k++) {
      out.push(el('circle', { cx: px, cy: yOf(k), r: 3.6, fill: sel === k ? P3.pin : '#59636a' }));
    }
    const at = sel ? yOf(sel) : yOf((n + 1) / 2);
    const ghost = sel ? 1 : 0.35;
    if (kind === 'seat') {
      out.push(el('rect', { x: 30, y: at - 30, width: 108, height: 18, rx: 9, fill: P3.pad, opacity: ghost }));
      out.push(el('rect', { x: px - 4, y: at - 14, width: 8, height: 14, fill: tone(P3.metal, -0.2), opacity: ghost }));
    } else {
      // стегно сидячої людини і валік над ним
      out.push(el('rect', { x: 26, y: H - 64, width: 120, height: 22, rx: 11, fill: P3.pants, opacity: 0.85 }));
      out.push(el('rect', { x: px - 4, y: at, width: 8, height: 14, fill: tone(P3.metal, -0.2), opacity: ghost }));
      out.push(el('circle', { cx: px, cy: at - 13, r: 13, fill: P3.pad, opacity: ghost }));
    }
    if (sel) {
      out.push(el('circle', { cx: px + 13, cy: yOf(sel), r: 4.5, fill: P3.pin, stroke: '#8f2525' }));
      out.push(el('line', { x1: px + 20, y1: yOf(sel), x2: 168, y2: yOf(sel), stroke: ACC, 'stroke-width': 2 }));
    }
    for (let k = 1; k <= n; k++) {
      const on = sel === k;
      const y = yOf(k);
      const word = k === 1 ? h.first : k === n ? h.last : '';
      out.push(pickG(k, on, `${k}${word ? ` — ${word}` : ''}`,
        el('rect', { x: 170, y: r1(y - rowH / 2 + 3), width: 150, height: r1(rowH - 6), rx: 10, fill: on ? ACC : '#ffffff', stroke: on ? ACC : '#c5cdc9', 'stroke-width': 1.5 })
        + text(190, r1(y + 6), k, { 'font-size': r1(Math.min(18, rowH * 0.55)), 'font-weight': 800, 'text-anchor': 'middle', fill: on ? '#ffffff' : C.ink })
        + (word ? text(208, r1(y + 5), word, { 'font-size': r1(Math.min(14, rowH * 0.42)), fill: on ? '#dbe8f5' : C.muted }) : '')));
    }
    return pickerSvg(W, H, `${adj.label}: позиції 1…${n}`, out.join(''));
  };
}

/** 5 ручок блоку малюнками (gym/my-photos/ruchky-stiyka.png). */
export function handlePicker(value, adj) {
  const opts = (adj.options || []).filter((o) => !o.deleted);
  const cols = 3;
  const cw = 100;
  const ch = 92;
  const rows = Math.ceil(opts.length / cols);
  const W = 330;
  const H = rows * (ch + 8) + 8;
  const out = opts.map((o, i) => {
    const on = value === o.id;
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, opts.length - row * cols);
    const x = r1((W - inRow * cw - (inRow - 1) * 10) / 2 + (i % cols) * (cw + 10));
    const y = 8 + row * (ch + 8);
    const art = handleArt(o.id);
    return pickG(o.id, on, `${adj.label}: ${o.label}`,
      el('rect', { x, y, width: cw, height: ch, rx: 12, fill: on ? '#e7f0fa' : '#ffffff', stroke: on ? ACC : '#c5cdc9', 'stroke-width': on ? 3 : 1.5 })
      + (art ? `<svg x="${x + 8}" y="${y + 4}" width="${cw - 16}" height="56" viewBox="0 0 120 80" data-handle="${esc(o.id)}">${art}</svg>` : '')
      + text(r1(x + cw / 2), y + ch - 12, o.label, {
        'font-size': fit(o.label, cw - 10, 12.5), 'font-weight': on ? 800 : 600, 'text-anchor': 'middle', fill: on ? ACC : C.ink,
      }));
  });
  return pickerSvg(W, H, `${adj.label}: яку ручку чіпляти на карабін`, out.join(''));
}

// ======================================================================
// Спільні частини тренажерів
// ======================================================================
const SEAT_TOP = 46;

/** Рама-основа: поздовжні бруски на підлозі й поперечки. */
function baseFrame(S, { x = 40, y0 = -55, y1 = 50, cross = [], mid = null }) {
  for (const s of [-1, 1]) beam(S, [s * x, y0, 3], [s * x, y1, 3], 7, 6, FR);
  for (const y of cross) beam(S, [-x, y, 3], [x, y, 3], 7, 6, FR);
  if (mid) beam(S, [0, mid[0], 3], [0, mid[1], 3], 7, 6, FR);
}

/** Сидить обличчям уперед (+y): стопи на підлозі. */
const seatedLegs = (y = 44, w = 17) => ({ ankle: (s) => [s * w, y, 9], kneePole: () => [0, 0.35, 1] });

// ======================================================================
// №2 «Жим у тренажері» (груди, диски) — фото gym/my-photos/zhym-u-trenazheri-*.png і сайту 02:
// сидиш обличчям уперед, помаранчеві важелі від осі вгорі позаду заходять згори, ручки біля грудей,
// млинці на кінцях важелів; жим уперед-угору по дузі. Регулювання: висота сидіння.
// ======================================================================
const plateChestPress = artModule({
  id: 'plate-chest-press',
  ADJUSTMENTS: ['seat'],
  HINTS: SEAT_HINTS,
  PICKERS: { seat: heightPicker('seat', SEAT_HINTS) },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 28, pitch: 24, mini });
    floorShadow(S, 0, -4, 82, 74);
    baseFrame(S, { x: 42, y0: -62, y1: 54, cross: [-58, 48], mid: [-58, 0] });
    for (const s of [-1, 1]) beam(S, [s * 42, -58, 2], [s * 44, -50, 174], 8, 8, FR);
    beam(S, [-48, -50, 174], [48, -50, 174], 8, 8, FR);
    // спинка (трохи відхилена)
    beam(S, [0, -56, 5], [0, -40, 118], 7, 7, FR);
    beam(S, [0, -26, 56], [0, -34, 128], 36, 8, P3.pad);
    S.mark('seat', seatOnPost(S, { top: SEAT_TOP }));
    for (const s of [-1, 1]) {
      // вісь угорі позаду, важіль уперед і вниз до ручки
      box(S, [s * 44 - 5, -55, 166], [s * 44 + 5, -45, 178], FR);
      beams(S, [[s * 47, -48, 170], [s * 50, 2, 160], [s * 46, 27, 118]], 7, 6, P3.orange);
      beam(S, [s * 46, 27, 116], [s * 40, 27, 115], 5, 5, P3.orange);
      grip(S, [[s * 40, 27, 94], [s * 40, 28, 116]]);
      plateOn(S, [s * 59, 8, 152], [s, 0, 0], 21);
    }
    human(S, {
      pelvis: [0, -6, SEAT_TOP + 9], lean: -0.14,
      hand: (s) => [s * 40, 27, 104],
      elbowPole: (s) => [s, -0.4, -0.7],
      ...seatedLegs(46, 19),
    });
    return renderScene(S, 'Тренажер «Жим у тренажері»: сидячи, ручки біля грудей — жим уперед');
  },
});

// ======================================================================
// №12 Відведення рук сидячи (ARP) — фото gym/my-photos/vidvedennya-ruk-*.png і сайту 12:
// стійка з вагою позаду, помаранчеві важелі від осей позаду плечей, подушки під лікті;
// руки (лікті) йдуть у сторони вгору. Регулювання — лише висота сидіння.
// ======================================================================
const lateralRaise = artModule({
  id: 'lateral-raise',
  ADJUSTMENTS: ['seat'],
  HINTS: SEAT_HINTS,
  PICKERS: { seat: heightPicker('seat', SEAT_HINTS) },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 24, pitch: 24, mini });
    floorShadow(S, 0, -30, 80, 72);
    baseFrame(S, { x: 34, y0: -96, y1: 40, cross: [34], mid: [-70, 0] });
    tower(S, [-30, -100, 0], [30, -68, 150], P3.panelArp);
    // спинка на стійці
    beam(S, [0, -66, 70], [0, -32, 70], 7, 7, FR);
    beam(S, [0, -28, 58], [0, -30, 116], 34, 8, P3.pad);
    // кронштейн осей важелів на рівні плечей
    beam(S, [-26, -60, 108], [26, -60, 108], 8, 8, FR);
    beam(S, [0, -68, 108], [0, -60, 108], 8, 8, FR);
    S.mark('seat', seatOnPost(S, { top: SEAT_TOP }));
    const sh = (s) => [s * 16, -8, 101];
    const a = 46 * RAD;
    const elbow = (s) => vAdd(sh(s), [s * Math.sin(a) * 28, 0, -Math.cos(a) * 28]);
    const hand = (s) => vAdd(elbow(s), [s * 2, 25, 3]);
    for (const s of [-1, 1]) {
      const pivot = [s * 20, -48, 104];
      beam(S, [s * 20, -60, 104], pivot, 6, 6, FR);
      disc(S, pivot, [0, 1, 0], 9, P3.orange, { thick: 4 });
      // важіль паралельно плечу позаду, далі вперед до подушки під лікоть і ручки
      const low = vAdd(pivot, [s * Math.sin(a) * 30, 0, -Math.cos(a) * 30]);
      beams(S, [pivot, low, vAdd(elbow(s), [s * 8, -4, 0])], 7, 6, P3.orange);
      obox(S, vAdd(elbow(s), [s * 8, -2, 1]), [s * 3, 0, 0], [0, 11, 0], [0, 0, 6.5], P3.pad);
      beam(S, vAdd(elbow(s), [s * 8, 8, 0]), vAdd(hand(s), [s * 6, 0, -3]), 5, 5, P3.orange);
      grip(S, [vAdd(hand(s), [s * 1, 0, -8]), vAdd(hand(s), [s * 1, 0, 8])]);
    }
    human(S, {
      pelvis: [0, -8, SEAT_TOP + 9],
      hand, elbow,
      ...seatedLegs(42, 18),
    });
    return renderScene(S, 'Тренажер «Відведення рук сидячи»: лікті на подушках важелів ідуть у сторони вгору');
  },
});

// ======================================================================
// Ручка буквою Г (№14 жим сидячи, №21 вертикальна тяга) — фото gym/my-photos/zhym-sydyachy-ruchka-g.png,
// vertykalna-tyaga-zal.png: від важеля ручка йде горизонтально всередину, на куті — вниз.
// «Прямий» (pos-1) — за горизонтальну частину, долоні вперед; «Під 90°» (pos-2) — за вертикальну,
// долоні одна до одної. Вікно вибору: ручка-Г крупно, дві кольорові зони, на вибраній — кисть.
// ======================================================================
const L_ZONES = {
  'pos-1': { d: 'M272 98 L140 98', color: '#1c7ed6', how: 'долоні вперед' },
  'pos-2': { d: 'M106 132 L106 176', color: '#ae3ec9', how: 'долоні одна до одної' },
};
const L_HANDLE = 'M300 98 L130 98 Q106 98 106 122 L106 182';
const SKIN_P = P3.skin;
const SKIN_D = tone(P3.skin, -0.28);

/** Передпліччя — кругла ланка від кисті (a) до краю малюнка (b). */
const forearm = (ax, ay, bx, by) => path(`M${ax} ${ay} L${bx} ${by}`, 27, SKIN_D) + path(`M${ax} ${ay} L${bx} ${by}`, 23, tone(P3.skin, -0.06));

/** Кисть на горизонтальній частині (долоні вперед — видно тильний бік і кісточки). */
function fistOnBar(cx, cy) {
  return forearm(cx, cy + 8, cx + 4, 190)
    + el('rect', { x: cx - 25, y: cy - 17, width: 50, height: 34, rx: 11, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 2 })
    + [-12.5, 0, 12.5].map((dx) => el('line', { x1: cx + dx, y1: cy - 15, x2: cx + dx, y2: cy - 3, stroke: SKIN_D, 'stroke-width': 2, 'stroke-linecap': 'round' })).join('')
    + el('ellipse', { cx: cx - 22, cy: cy + 9, rx: 8, ry: 6, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 1.6 });
}
/** Кисть на вертикальній частині (долоні одна до одної — пальці обхоплюють ручку збоку). */
function fistOnPost(cx, cy) {
  return forearm(cx + 6, cy + 4, cx + 70, cy + 38)
    + el('rect', { x: cx - 17, y: cy - 24, width: 34, height: 48, rx: 11, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 2 })
    + [-11, 0, 11].map((dy) => el('line', { x1: cx - 15, y1: cy + dy, x2: cx - 4, y2: cy + dy, stroke: SKIN_D, 'stroke-width': 2, 'stroke-linecap': 'round' })).join('')
    + el('ellipse', { cx: cx + 2, cy: cy - 25, rx: 7, ry: 6, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 1.6 });
}

/** PICKER «Хват» для ручки-Г; plate — колір млинця на важелі. */
function lGripPicker(plate) {
  return (value, adj) => {
    const opts = (adj.options || []).filter((o) => !o.deleted);
    const sel = opts.find((o) => o.id === value) || null;
    const pic = [];
    const out = [];
    // важіль з млинцем і кронштейн ручки
    pic.push(el('circle', { cx: 326, cy: 38, r: 30, fill: plate, stroke: tone(plate, -0.45), 'stroke-width': 2 })
      + el('circle', { cx: 326, cy: 38, r: 20, fill: 'none', stroke: tone(plate, 0.18), 'stroke-width': 2 })
      + el('circle', { cx: 326, cy: 38, r: 7, fill: P3.metal, stroke: tone(P3.metal, -0.45) }));
    pic.push(el('rect', { x: 132, y: 24, width: 196, height: 28, rx: 14, fill: P3.orange, stroke: tone(P3.orange, -0.4), 'stroke-width': 1.5 })
      + el('rect', { x: 140, y: 42, width: 180, height: 7, rx: 3.5, fill: tone(P3.orange, -0.18) }));
    pic.push(el('rect', { x: 278, y: 46, width: 16, height: 46, rx: 3, fill: FR }));
    // ручка-Г (гума), торець металевий
    pic.push(path(L_HANDLE, 23, tone(P3.rubber, -0.3)) + path(L_HANDLE, 19, P3.rubber)
      + path('M286 92 L134 92', 3, tone(P3.rubber, 0.35), { opacity: 0.8 })
      + el('rect', { x: 94, y: 180, width: 24, height: 9, rx: 3, fill: P3.metal, stroke: tone(P3.metal, -0.45) }));
    // дві зони хвату — кожна кнопка; обидві підсвічені, вибрана — яскраво й з кистю
    for (const o of opts) {
      const z = L_ZONES[o.id];
      if (!z) continue;
      const on = !!sel && sel.id === o.id;
      pic.push(el('g', { 'data-pick': o.id, 'data-grip-zone': o.id, class: on ? 'pk is-on' : 'pk', 'aria-label': `${adj.label}: ${o.label}` },
        el('title', {}, esc(`${o.label} — ${z.how}`))
        + path(z.d, 44, z.color, { opacity: on ? 0.3 : 0.14 })
        + path(z.d, on ? 10 : 7, z.color, { opacity: on || !sel ? 1 : 0.5 })));
    }
    if (sel && sel.id === 'pos-1') pic.push(fistOnBar(206, 98));
    if (sel && sel.id === 'pos-2') pic.push(fistOnPost(106, 152));
    out.push(el('g', { transform: 'translate(-24 0)' }, pic.join('')));
    out.push(...gripButtons(opts, sel, adj, L_ZONES));
    return pickerSvg(360, 262, `${adj.label}: ручка буквою Г — за яку частину брати`, out.join(''));
  };
}

/** Назви варіантів хвату і як тримати — під малюнком, кнопками (y 200…254). */
function gripButtons(opts, sel, adj, zones) {
  const gap = 8;
  const n = Math.max(1, opts.length);
  const w = (340 - gap * (n - 1)) / n;
  return opts.map((o, i) => {
    const on = !!sel && sel.id === o.id;
    const z = zones[o.id];
    const color = z ? z.color : ACC;
    const x = r1(10 + i * (w + gap));
    return el('g', { 'data-pick': o.id, class: on ? 'pk is-on' : 'pk', 'aria-label': `${adj.label}: ${o.label}` },
      el('title', {}, esc(z ? `${o.label} — ${z.how}` : o.label))
      + el('rect', { x, y: 200, width: r1(w), height: 54, rx: 14, fill: on ? color : '#ffffff', stroke: color, 'stroke-width': on ? 3 : 2 })
      + el('circle', { cx: x + 18, cy: 220, r: 8, fill: on ? '#ffffff' : color })
      + text(x + 32, 225.5, o.label, { 'font-size': fit(o.label, w - 40, 16), 'font-weight': on ? 800 : 700, fill: on ? '#ffffff' : C.ink })
      + (z ? text(x + 12, 245, z.how, { 'font-size': fit(z.how, w - 20, 12.5), fill: on ? '#ffffff' : C.muted }) : ''));
  });
}

// Ручка буквою L (№14, правка четвертої черги — gym/my-photos/ruchka-g-pravka-4.png): важіль на всю
// ширину вгорі (млинець праворуч), від лівого кінця важеля ручка йде вниз, унизу — вправо.
// «Під 90°» (pos-2) — вертикальна частина, «Прямий» (pos-1) — нижня горизонтальна.
const LL_X = 44;            // вертикальна частина під лівим кінцем важеля
const LL_Y = 164;           // нижня горизонтальна частина
const LL_ZONES = {
  'pos-1': { d: `M86 ${LL_Y} L218 ${LL_Y}`, color: L_ZONES['pos-1'].color, how: L_ZONES['pos-1'].how },
  'pos-2': { d: `M${LL_X} 74 L${LL_X} 132`, color: L_ZONES['pos-2'].color, how: L_ZONES['pos-2'].how },
};
const LL_HANDLE = `M${LL_X} 44 L${LL_X} ${LL_Y - 24} Q${LL_X} ${LL_Y} ${LL_X + 24} ${LL_Y} L240 ${LL_Y}`;

/** PICKER «Хват» для ручки-L; plate — колір млинця на важелі. */
function lShapeGripPicker(plate) {
  return (value, adj) => {
    const opts = (adj.options || []).filter((o) => !o.deleted);
    const sel = opts.find((o) => o.id === value) || null;
    const pic = [];
    // важіль на всю ширину з млинцем праворуч
    pic.push(el('rect', { x: 14, y: 18, width: 312, height: 28, rx: 14, fill: P3.orange, stroke: tone(P3.orange, -0.4), 'stroke-width': 1.5, 'data-part': 'lever' })
      + el('rect', { x: 22, y: 36, width: 296, height: 7, rx: 3.5, fill: tone(P3.orange, -0.18) }));
    pic.push(el('circle', { cx: 324, cy: 32, r: 30, fill: plate, stroke: tone(plate, -0.45), 'stroke-width': 2 })
      + el('circle', { cx: 324, cy: 32, r: 20, fill: 'none', stroke: tone(plate, 0.18), 'stroke-width': 2 })
      + el('circle', { cx: 324, cy: 32, r: 7, fill: P3.metal, stroke: tone(P3.metal, -0.45) }));
    // кріплення ручки до лівого кінця важеля
    pic.push(el('rect', { x: LL_X - 9, y: 38, width: 18, height: 18, rx: 3, fill: FR }));
    // ручка-L (гума), торець металевий
    pic.push(path(LL_HANDLE, 23, tone(P3.rubber, -0.3)) + path(LL_HANDLE, 19, P3.rubber)
      + path(`M${LL_X - 6} 60 L${LL_X - 6} ${LL_Y - 26}`, 3, tone(P3.rubber, 0.35), { opacity: 0.8 })
      + path(`M${LL_X + 26} ${LL_Y - 6} L236 ${LL_Y - 6}`, 3, tone(P3.rubber, 0.35), { opacity: 0.8 })
      + el('rect', { x: 238, y: LL_Y - 12, width: 9, height: 24, rx: 3, fill: P3.metal, stroke: tone(P3.metal, -0.45) }));
    for (const o of opts) {
      const z = LL_ZONES[o.id];
      if (!z) continue;
      const on = !!sel && sel.id === o.id;
      pic.push(el('g', { 'data-pick': o.id, 'data-grip-zone': o.id, class: on ? 'pk is-on' : 'pk', 'aria-label': `${adj.label}: ${o.label}` },
        el('title', {}, esc(`${o.label} — ${z.how}`))
        + path(z.d, 44, z.color, { opacity: on ? 0.3 : 0.14 })
        + path(z.d, on ? 10 : 7, z.color, { opacity: on || !sel ? 1 : 0.5 })));
    }
    if (sel && sel.id === 'pos-1') pic.push(fistOnBar(152, LL_Y));
    if (sel && sel.id === 'pos-2') pic.push(fistOnPost(LL_X, 104));
    const out = [pic.join(''), ...gripButtons(opts, sel, adj, LL_ZONES)];
    return pickerSvg(360, 262, `${adj.label}: ручка буквою L — за яку частину брати`, out.join(''));
  };
}

/** Ручка-Г у 3D: від важеля (a) горизонтально до кута (b), далі вниз (c). */
function lHandle(S, a, b, c) {
  grip(S, [a, b, c], { w: 5 });
}

// ======================================================================
// №14 Жим у тренажері сидячи (плечі, диски) — фото gym/my-photos/zhym-sydyachy-*.png і сайту 14:
// сидіння між двома похилими стійками, на них осі помаранчевих важелів з ручками-Г біля плечей і
// млинцями; жим угору. Регулювання: хват (ручка-Г, 2 варіанти) і висота сидіння.
// ======================================================================
const plateShoulderPress = artModule({
  id: 'plate-shoulder-press',
  ADJUSTMENTS: ['grip-pos', 'seat'],
  HINTS: SEAT_HINTS,
  PICKERS: {
    'grip-pos': lShapeGripPicker(P3.plateGreen),
    seat: heightPicker('seat', SEAT_HINTS),
  },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 26, pitch: 24, mini });
    floorShadow(S, 0, -2, 86, 66);
    baseFrame(S, { x: 60, y0: -42, y1: 44, cross: [-38, 38], mid: [-38, 38] });
    for (const s of [-1, 1]) beam(S, [s * 60, 36, 3], [s * 50, -30, 112], 8, 8, FR);
    beam(S, [0, -40, 4], [0, -36, 104], 7, 7, FR);
    beam(S, [0, -24, 56], [0, -28, 134], 34, 8, P3.pad);
    S.mark('seat', seatOnPost(S, { top: SEAT_TOP }));
    for (const s of [-1, 1]) {
      box(S, [s * 50 - 6, -38, 108], [s * 50 + 6, -26, 120], FR);
      beams(S, [[s * 50, -32, 114], [s * 47, 4, 120], [s * 46, 19, 121]], 7, 7, P3.orange);
      // ручка-Г перед важелем: горизонтально всередину, на куті — вниз
      box(S, [s * 47 - 2, 17, 118], [s * 47 + 2, 22, 124], FR);
      lHandle(S, [s * 48, 22, 121], [s * 29, 22, 121], [s * 31, 23, 101]);
      plateOn(S, [s * 60, 4, 124], [s, 0, 0], 20, P3.plateGreen);
    }
    S.mark('grip-pos', [40, 22, 121]);
    human(S, {
      pelvis: [0, -6, SEAT_TOP + 9],
      hand: (s) => [s * 36, 22, 121],
      elbowPole: (s) => [s, 0.25, -1],
      ...seatedLegs(42, 20),
    });
    return renderScene(S, 'Тренажер «Жим у тренажері сидячи» (плечі): ручки біля плечей — жим угору');
  },
});

// ======================================================================
// «Прес» (№15 Ротація, №16 Скручування) — фото сайту 15, 16; регулювань немає.
// Ротація: сидиш на поворотній платформі, тримаєш помаранчеву дугу перед грудьми, поворот корпусу.
// Скручування: спина до спинки, стопи за валиками, руки на помаранчевих ручках біля голови.
// ======================================================================
const abStation = artModule({
  id: 'ab-station',
  build(exerciseId, mini) {
    const crunch = exerciseId === 'eq-15-b';
    const S = scene3d({ yaw: 28, pitch: 24, mini });
    floorShadow(S, -8, -6, 96, 70);
    tower(S, [-86, -48, 0], [-58, 30, 152], P3.panelArp);
    beam(S, [-56, -40, 3], [56, -40, 3], 7, 6, FR);
    beam(S, [0, -40, 3], [0, 58, 3], 7, 6, FR);
    beam(S, [-60, 58, 3], [60, 58, 3], 7, 6, FR);
    if (!crunch) {
      // рама попереду (поперечка на рівні колін) і поворотна платформа
      beam(S, [-60, 58, 0], [-60, 58, 58], 9, 9, FR);
      beam(S, [-64, 58, 56], [60, 58, 56], 10, 9, FR);
      disc(S, [0, 0, 22], [0, 0, 1], 28, P3.metal, { thick: 6 });
      box(S, [-4, -4, 4], [4, 4, 16], FR);
      beam(S, [0, 0, 22], [0, 0, SEAT_TOP - 6], 8, 8, FR);
      box(S, [-18, -16, SEAT_TOP - 7], [18, 18, SEAT_TOP], P3.pad);
      // помаранчева дуга з вертикальними ручками, на кронштейнах від платформи
      for (const s of [-1, 1]) {
        beams(S, [[s * 24, -6, 24], [s * 30, -6, 60], [s * 26, 10, 96]], 6, 6, P3.orange);
        grip(S, [[s * 25, 10, 98], [s * 25, 10, 118]]);
      }
      tube(S, [[-25, 10, 98], [-20, 22, 92], [0, 28, 90], [20, 22, 92], [25, 10, 98]], 6, P3.orange);
      human(S, {
        pelvis: [0, -4, SEAT_TOP + 9],
        hand: (s) => [s * 25, 10, 108],
        elbowPole: (s) => [s, -0.2, -1],
        ankle: (s) => [s * 17, 34, 24], kneePole: () => [0, 0.4, 1],
      });
      return renderScene(S, 'Тренажер «Прес» — Ротація: поворот корпусу вліво-вправо на поворотному сидінні');
    }
    // скручування: спинка, валики для ніг, ручки біля голови на важелях з віссю позаду
    beam(S, [0, -40, 3], [0, -36, 112], 7, 7, FR);
    beam(S, [0, -26, 58], [0, -28, 112], 34, 8, P3.pad);
    seatOnPost(S, { top: SEAT_TOP, pin: false });
    beam(S, [0, 58, 3], [0, 50, 34], 7, 7, FR);
    for (const z of [14, 34]) {
      tube(S, [[-3, 46, z], [3, 46, z]], 4, P3.metal);
      for (const s of [-1, 1]) tube(S, [[s * 4, 46, z], [s * 22, 46, z]], 11, P3.pad, { shine: false });
    }
    beam(S, [-34, -38, 112], [34, -38, 112], 8, 8, FR);
    for (const s of [-1, 1]) {
      beam(S, [s * 34, -40, 3], [s * 34, -38, 112], 7, 7, FR);
      box(S, [s * 30 - 4, -34, 106], [s * 30 + 4, -24, 118], FR);
      beams(S, [[s * 30, -28, 112], [s * 29, -16, 126], [s * 25, -2, 132]], 6, 6, P3.orange);
      grip(S, [[s * 25, -2, 132], [s * 13, 5, 136]]);
    }
    human(S, {
      pelvis: [0, -6, SEAT_TOP + 9], lean: 0.12,
      hand: (s) => [s * 18, 2, 134],
      elbowPole: (s) => [s, 0.7, -0.2],
      ankle: (s) => [s * 13, 37, 9], kneePole: () => [0, 0.4, 1],
    });
    return renderScene(S, 'Тренажер «Прес» — Скручування: ручки біля голови, корпус уперед-униз');
  },
});

// ======================================================================
// Гравітрон (№17 віджимання, №20 підтягування) — фото сайту 17, 20: помаранчева рама, коліна на
// платформі-противазі; бруси для віджимань, ручки вгорі для підтягувань. Регулювань немає.
// ======================================================================
function gravitron(id, dip) {
  return artModule({
    id,
    build(exerciseId, mini) {
      const S = scene3d({ yaw: 28, pitch: 22, mini });
      floorShadow(S, 0, -36, 74, 66);
      tower(S, [-26, -96, 0], [26, -66, 206], P3.panelArp);
      beam(S, [-42, -70, 3], [42, -70, 3], 8, 6, FR);
      for (const s of [-1, 1]) {
        beam(S, [s * 38, -70, 3], [s * 38, 30, 3], 8, 6, FR);
        beam(S, [s * 36, -34, 0], [s * 36, -34, 262], 9, 9, P3.orange);
        // бруси
        beam(S, [s * 36, -34, 144], [s * 29, 6, 144], 6, 6, P3.orange);
        grip(S, [[s * 29, 2, 144], [s * 28, 26, 144]], { w: 5 });
        // ручки для підтягувань угорі
        beam(S, [s * 36, -34, 254], [s * 34, 4, 254], 6, 6, P3.orange);
        grip(S, [[s * 34, 4, 254], [s * 27, 12, 242]], { w: 5 });
      }
      beam(S, [-40, -34, 262], [40, -34, 262], 9, 9, P3.orange);
      // платформа під коліна на важелі
      beam(S, [0, -66, 60], [0, -4, 96], 7, 7, P3.orange);
      box(S, [-17, -22, 96], [17, 14, 103], P3.pad);
      // сходинка
      box(S, [-22, 18, 30], [22, 34, 34], P3.metal);
      beam(S, [0, 26, 3], [0, 26, 30], 6, 6, FR);
      human(S, {
        pelvis: [0, 9, 150],
        hand: dip ? (s) => [s * 28, 12, 145] : (s) => [s * 29, 8, 248],
        elbowPole: dip ? (s) => [s * 0.3, -1, 0] : (s) => [s, 0, -0.2],
        ankle: (s) => [s * 10, -22, 109], knee: (s) => [s * 10, 10, 108],
        toe: () => [0, -1, -0.2],
      });
      return renderScene(S, dip
        ? 'Тренажер «Віджимання в гравітроні»: коліна на платформі, руки на брусах'
        : 'Тренажер «Підтягування в гравітроні»: коліна на платформі, руки на ручках угорі', { maxH: 380 });
    },
  });
}
const assistedDip = gravitron('assisted-dip', true);
const assistedPullup = gravitron('assisted-pullup', false);

// ======================================================================
// №18 Жим на трицепс (ARP) — фото сайту 18: сидиш, спиною до спинки, обидві руки на ручках
// помаранчевих важелів біля стегон, лікті позаду; тиснеш униз. Симетрично. Регулювань немає.
// ======================================================================
const tricepsPress = artModule({
  id: 'triceps-press',
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 26, pitch: 24, mini });
    floorShadow(S, -16, -4, 96, 66);
    tower(S, [-100, -44, 0], [-70, 26, 156], P3.panelArp);
    beam(S, [-70, -32, 3], [44, -32, 3], 7, 6, FR);
    beam(S, [0, -32, 3], [0, 44, 3], 7, 6, FR);
    beam(S, [-44, 40, 3], [44, 40, 3], 7, 6, FR);
    beam(S, [0, -36, 3], [0, -32, 132], 7, 7, FR);
    beam(S, [0, -24, 58], [0, -26, 134], 34, 8, P3.pad);
    seatOnPost(S, { top: SEAT_TOP, pin: false });
    for (const s of [-1, 1]) {
      beam(S, [s * 40, 40, 3], [s * 40, 38, 34], 7, 7, FR);
      box(S, [s * 37 - 3, 32, 28], [s * 37 + 4, 42, 40], FR);
      beams(S, [[s * 36, 37, 34], [s * 34, 16, 60], [s * 33, 8, 66]], 6, 6, P3.orange);
      grip(S, [[s * 31, -6, 68], [s * 31, 12, 68]]);
    }
    human(S, {
      pelvis: [0, -6, SEAT_TOP + 9],
      hand: (s) => [s * 31, 3, 69],
      elbow: (s) => [s * 25, -20, 82],
      ...seatedLegs(44, 18),
    });
    return renderScene(S, 'Тренажер «Жим на трицепс»: обидві руки на ручках біля стегон — тиснути вниз');
  },
});

// ======================================================================
// №19 Згинання рук у блоці (ARP) — фото сайту 19: сидиш, плечі лежать на похилій подушці попереду,
// обидві руки на ручках помаранчевих важелів з віссю біля ліктів; згинаєш руки. Регулювань немає.
// ======================================================================
const cableCurl = artModule({
  id: 'cable-curl',
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 28, pitch: 24, mini });
    floorShadow(S, -16, 4, 96, 66);
    tower(S, [-100, -36, 0], [-70, 30, 156], P3.panelArp);
    beam(S, [-70, -26, 3], [0, -26, 3], 7, 6, FR);
    beam(S, [0, -26, 3], [0, 56, 3], 7, 6, FR);
    beam(S, [-36, 52, 3], [36, 52, 3], 7, 6, FR);
    seatOnPost(S, { y: -6, top: SEAT_TOP + 2, pin: false });
    // похила подушка під плечі
    beam(S, [0, 52, 3], [0, 40, 72], 8, 8, FR);
    beam(S, [0, 20, 89], [0, 46, 70], 50, 7, P3.pad, { bias: -8 });
    for (const s of [-1, 1]) {
      box(S, [s * 32 - 4, 26, 82], [s * 32 + 4, 36, 94], FR);
      beam(S, [s * 32, 31, 88], [s * 32, 26, 114], 6, 6, P3.orange);
      grip(S, [[s * 32, 26, 114], [s * 13, 26, 114]]);
    }
    human(S, {
      pelvis: [0, -8, SEAT_TOP + 11], lean: 0.32,
      hand: (s) => [s * 19, 26, 114],
      elbow: (s) => [s * 21, 31, 88],
      ...seatedLegs(42, 18),
    });
    return renderScene(S, 'Тренажер «Згинання рук у блоці»: плечі на похилій подушці, згинати обидві руки');
  },
});

// ======================================================================
// №21 Вертикальна тяга (диски, SHUA) — за фото із залу gym/my-photos/vertykalna-tyaga-zal.png:
// попереду похила колона, на ній вісь; від осі назад над головою — два широкі помаранчеві важелі
// з ручками-Г на кінцях, уперед — короткі плечі з млинцями. Людина сидить низько обличчям до
// колони, притискний валік лежить на колінах. Регулювання: хват (ручка-Г) і притискний валік.
// ======================================================================
export const leverPulldown = artModule({
  id: 'lever-pulldown',
  ADJUSTMENTS: ['grip-pos', 'roller'],
  HINTS: ROLLER_HINTS,
  PICKERS: {
    'grip-pos': lGripPicker(P3.plate),
    roller: heightPicker('roller', ROLLER_HINTS),
  },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 40, pitch: 22, mini });
    floorShadow(S, 0, 30, 70, 86);
    // основа: поздовжня балка й поперечки
    beam(S, [0, -36, 3], [0, 102, 3], 8, 6, FR);
    beam(S, [-36, -34, 3], [36, -34, 3], 8, 6, FR);
    beam(S, [-44, 98, 3], [44, 98, 3], 9, 7, FR);
    // похила колона попереду, вилка з віссю вгорі
    beam(S, [0, 100, 3], [0, 66, 140], 12, 12, FR);
    beam(S, [0, 84, 3], [0, 72, 60], 8, 8, FR);
    box(S, [-15, 58, 136], [15, 72, 150], FR);
    tube(S, [[-21, 64, 144], [21, 64, 144]], 4, P3.metal);
    seatOnPost(S, { y: -4, top: SEAT_TOP - 2, pin: false });
    // притискний валік на колінах: кронштейн від колони
    beams(S, [[0, 74, 40], [0, 44, 58], [0, 34, 66]], 7, 7, FR);
    tube(S, [[-25, 34, 67], [25, 34, 67]], 3.6, P3.metal);
    for (const s of [-1, 1]) tube(S, [[s * 5, 34, 67], [s * 24, 34, 67]], 13, P3.rubber, { shine: false });
    S.mark('roller', [25, 34, 67]);
    for (const s of [-1, 1]) {
      const pivot = [s * 17, 64, 144];
      // важіль назад над головою (широкий, вигнутий) і коротке плече вперед з млинцем
      tube(S, [[s * 20, 92, 155], pivot, [s * 24, 46, 154], [s * 31, 28, 159], [s * 37, 14, 159], [s * 44, 4, 156]], 9, P3.orange);
      plateOn(S, [s * 32, 90, 154], [s, 0, 0], 21);
      // ручка-Г: від кінця важеля всередину, на куті — вниз
      lHandle(S, [s * 44, 6, 153], [s * 27, 6, 153], [s * 28, 7, 135]);
    }
    S.mark('grip-pos', [37, 6, 153]);
    human(S, {
      pelvis: [0, -6, SEAT_TOP + 7],
      hand: (s) => [s * 35, 6, 153],
      elbowPole: (s) => [s, -0.3, -0.3],
      ...seatedLegs(48, 16),
    });
    return renderScene(S, 'Вертикальна тяга (тяга зверху вниз): ручки-Г над головою, валік на колінах', { maxH: 360 });
  },
});

// ======================================================================
// №22 Горизонтальна тяга (диски, SHUA) — фото сайту 22, gym/my-photos/tyaga-vazhilna*.png:
// сидиш грудьми до вертикальної подушки, ручки попереду на рівні грудей на помаранчевих важелях
// з віссю внизу, млинці збоку; тяга до себе. Регулювання: висота сидіння і хват — три кольорові
// зони на ручці: зелена — верхня горизонтальна частина, червона — вигин, помаранчева — внутрішній низ.
// ======================================================================
// Ручка спереду (права половина, дзеркалиться відносно x = 180) — з малюнка tyaga-vazhilna-khvaty.png.
const GRIP_PATHS = {
  red: 'M204 396 L204 440 Q204 458 222 458',
  orange: 'M222 458 L262 458',
  green: 'M300 400 L228 400',
};
const GRIP_REST = 'M262 458 L300 458 Q326 458 326 432 L326 426 Q326 400 300 400';
const GRIP_MARK = { red: [204, 426], orange: [242, 458], green: [264, 400] };
const GRIP_COLORS = { green: '#2e9d4f', red: '#d63b3b', orange: '#f08a1c' };
const safeHex = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : null);
const gripColor = (opt) => (opt && (safeHex(opt.color) || GRIP_COLORS[opt.id])) || ACC;
const mirror = (inner) => `${inner}${el('g', { transform: 'translate(360 0) scale(-1 1)' }, inner)}`;

function rowGripPicker(value, adj) {
  const opts = (adj.options || []).filter((o) => !o.deleted);
  const sel = opts.find((o) => o.id === value) || null;
  const out = [];
  // рама й важелі (сірим), ручка — чорна; зони — кольорові, кожна — кнопка
  out.push(el('rect', { x: 170, y: 372, width: 20, height: 104, rx: 4, fill: FR, opacity: 0.3 }));
  out.push(mirror(el('path', { d: 'M204 389 L200 372', stroke: FR, 'stroke-width': 10, 'stroke-linecap': 'round' })
    + path(`${GRIP_PATHS.red} ${GRIP_PATHS.orange} ${GRIP_REST} ${GRIP_PATHS.green}`, 14, P3.rubber)
    + el('circle', { cx: 204, cy: 389, r: 7.5, fill: P3.metal, stroke: C.metalEdge, 'stroke-width': 2 })));
  for (const o of opts) {
    const d = GRIP_PATHS[o.id];
    if (!d) continue;
    const on = !!sel && sel.id === o.id;
    const color = gripColor(o);
    const [mx, my] = GRIP_MARK[o.id];
    out.push(pickG(o.id, on, `${adj.label}: ${o.label}`, mirror(
      path(d, 30, color, { opacity: on ? 0.28 : 0.001 })
      + path(d, on ? 13 : 9, color, { opacity: on || !sel ? 1 : 0.45 })
      + (on ? el('circle', { cx: mx, cy: my, r: 9, fill: '#ffffff', stroke: color, 'stroke-width': 4 }) : ''))));
  }
  // назви зон (тренер може перейменувати) — рядком під ручкою
  const gap = 8;
  const w = (340 - gap * (opts.length - 1)) / Math.max(1, opts.length);
  opts.forEach((o, i) => {
    const on = !!sel && sel.id === o.id;
    const color = gripColor(o);
    const x = r1(10 + i * (w + gap));
    out.push(pickG(o.id, on, `${adj.label}: ${o.label}`,
      el('rect', { x, y: 486, width: r1(w), height: 36, rx: 18, fill: on ? color : '#ffffff', stroke: color, 'stroke-width': on ? 3 : 2 })
      + el('circle', { cx: x + 18, cy: 504, r: 9, fill: on ? '#ffffff' : color })
      + text(x + 33, 509.5, o.label, { 'font-size': fit(o.label, w - 40, 14), 'font-weight': on ? 800 : 600, fill: on ? '#ffffff' : C.ink })));
  });
  return pickerSvg(360, 172, `${adj.label}: де брати ручку`, el('g', { transform: 'translate(0 -356)' }, out.join('')));
}

const leverRow = artModule({
  id: 'lever-row',
  ADJUSTMENTS: ['seat', 'grip'],
  HINTS: SEAT_HINTS,
  PICKERS: { seat: heightPicker('seat', SEAT_HINTS), grip: rowGripPicker },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 36, pitch: 24, mini });
    floorShadow(S, 0, 10, 84, 70);
    baseFrame(S, { x: 32, y0: -40, y1: 66, cross: [-36, 62], mid: [-36, 62] });
    for (const s of [-1, 1]) beam(S, [s * 32, 62, 3], [s * 50, 74, 3], 8, 6, FR);
    seatOnPost(S, { y: -6, top: SEAT_TOP });
    S.mark('seat', [-16, 4, SEAT_TOP]);   // край сидіння (фіксатор під ним закритий млинцем)
    // грудна подушка на стійці
    beam(S, [0, 36, 3], [0, 30, 80], 8, 8, FR);
    beam(S, [0, 22, 72], [0, 23, 104], 22, 8, P3.pad);
    // підніжки
    box(S, [-26, 34, 9], [26, 46, 13], P3.metal);
    for (const s of [-1, 1]) {
      box(S, [s * 32 - 5, 52, 16], [s * 32 + 5, 62, 30], FR);
      beam(S, [s * 32, 57, 22], [s * 31, 58, 98], 8, 7, P3.orange);
      plateOn(S, [s * 46, 57, 66], [s, 0, 0], 19);
      tube(S, [[s * 31, 58, 104], [s * 13, 58, 104], [s * 9, 58, 99], [s * 9, 58, 90], [s * 15, 58, 87]], 4.8, P3.rubber);
    }
    S.mark('grip', [10, 58, 94]);
    human(S, {
      pelvis: [0, -8, SEAT_TOP + 9], lean: 0.22,
      hand: (s) => [s * 21, 58, 104],
      elbowPole: (s) => [s, 0, -0.5],
      ankle: (s) => [s * 15, 40, 18], kneePole: () => [0, 0.3, 1],
    });
    return renderScene(S, 'Горизонтальна тяга (тяга до себе): грудьми до подушки, ручки на рівні грудей');
  },
});

// ======================================================================
// №24 Тяга в блоці (ARP) — фото сайту 24: сидиш грудьми до подушки, помаранчеві важелі з віссю
// внизу, ручки на рівні грудей; попереду — велика графітова дуга рами, стійка з вагою збоку.
// ======================================================================
const cablePull = artModule({
  id: 'cable-pull',
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 36, pitch: 24, mini });
    floorShadow(S, -10, 14, 96, 74);
    tower(S, [-100, -60, 0], [-70, 10, 156], P3.panelArp);
    beam(S, [-70, -30, 3], [0, -30, 3], 7, 6, FR);
    beam(S, [0, -34, 3], [0, 74, 3], 8, 6, FR);
    for (const s of [-1, 1]) beam(S, [s * 60, 74, 0], [s * 60, 74, 84], 11, 11, FR);
    beams(S, [[-60, 74, 52], [-34, 86, 52], [34, 86, 52], [60, 74, 52]], 11, 10, FR);
    seatOnPost(S, { y: -8, top: SEAT_TOP, pin: false });
    beam(S, [0, 34, 3], [0, 30, 80], 8, 8, FR);
    beam(S, [0, 22, 72], [0, 23, 104], 22, 8, P3.pad);
    box(S, [-26, 36, 9], [26, 48, 13], P3.metal);
    for (const s of [-1, 1]) {
      box(S, [s * 24 - 4, 44, 12], [s * 24 + 4, 54, 24], FR);
      beam(S, [s * 24, 49, 18], [s * 26, 54, 100], 7, 7, P3.orange);
      grip(S, [[s * 28, 54, 102], [s * 12, 56, 102]]);
    }
    cable(S, [-24, 49, 14], [-70, 0, 14]);
    human(S, {
      pelvis: [0, -10, SEAT_TOP + 9], lean: 0.22,
      hand: (s) => [s * 19, 55, 102],
      elbowPole: (s) => [s, 0, -0.5],
      ankle: (s) => [s * 15, 42, 18], kneePole: () => [0, 0.3, 1],
    });
    return renderScene(S, 'Тренажер «Тяга в блоці»: грудьми до подушки, ручки до себе');
  },
});

// ======================================================================
// №25 Тяга вертикального блоку — фото сайту 25: стійка з вагою попереду, над людиною — кронштейн
// з блоком, трос униз до ручки; стегна під валиком. Регулювання: ручка на карабіні і валік.
// ======================================================================
const latPulldown = artModule({
  id: 'lat-pulldown',
  ADJUSTMENTS: ['handle', 'roller'],
  HINTS: ROLLER_HINTS,
  PICKERS: { handle: handlePicker, roller: heightPicker('roller', ROLLER_HINTS) },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 56, pitch: 20, mini });
    floorShadow(S, 0, 30, 64, 80);
    tower(S, [-28, 62, 0], [28, 94, 206]);
    beam(S, [0, -30, 3], [0, 62, 3], 8, 6, FR);
    beam(S, [-30, -28, 3], [30, -28, 3], 8, 6, FR);
    beams(S, [[0, 70, 206], [0, 6, 210]], 9, 9, FR);
    disc(S, [0, 6, 202], [1, 0, 0], 6, P3.metal, { thick: 3 });
    seatOnPost(S, { y: -2, top: SEAT_TOP, pin: false });
    beam(S, [0, 36, 3], [0, 28, 70], 7, 7, FR);
    tube(S, [[-24, 24, 76], [24, 24, 76]], 3.6, P3.metal);
    for (const s of [-1, 1]) tube(S, [[s * 5, 24, 76], [s * 23, 24, 76]], 12, P3.pad, { shine: false });
    S.mark('roller', [24, 24, 76]);
    cable(S, [0, 6, 196], [0, 4, 163]);
    tube(S, [[0, 4, 165], [0, 4, 158]], 2.5, P3.metal);
    tube(S, [[-54, 4, 150], [-46, 4, 157], [46, 4, 157], [54, 4, 150]], 3.4, P3.metal);
    for (const s of [-1, 1]) grip(S, [[s * 46, 4, 157], [s * 54, 4, 150]], { w: 4.4 });
    S.mark('handle', [0, 4, 163]);
    human(S, {
      pelvis: [0, -4, SEAT_TOP + 9],
      hand: (s) => [s * 37, 4, 157],
      elbowPole: (s) => [s, -0.3, -0.5],
      ...seatedLegs(46, 16),
    });
    return renderScene(S, 'Тренажер «Тяга вертикального блоку»: ручка на тросі над головою, стегна під валиком');
  },
});

// ======================================================================
// «Турнік» (eq-bar) — перекладина на двох стійках; людина висить на прямих руках, ноги трохи зігнуті.
// Регулювання «Хват» (мітка на перекладині): звичайний — долоні від себе, ширина плечей;
// широкий — долоні від себе, ширше плечей; обратний — долоні до себе. Фото турніка в залі немає.
// ======================================================================
const BAR_Z = 226;
// Кисті на перекладині для кожного хвату: півширина в сантиметрах і куди дивляться долоні.
const BAR_GRIPS = {
  normal: { half: 24, palms: 'away', how: ['долоні від себе', 'ширина плечей'] },
  wide: { half: 44, palms: 'away', how: ['долоні від себе', 'ширше плечей'] },
  reverse: { half: 20, palms: 'toward', how: ['долоні до себе', 'ширина плечей'] },
};

/** Кисть на перекладині (вигляд ззаду людини): away — видно тильний бік і кісточки, toward — пальці й долоню. */
function barHand(id, x, y, side, palms) {
  const parts = [];
  if (palms === 'away') {
    parts.push(el('rect', { x: x - 9, y: y - 9, width: 18, height: 20, rx: 6, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 1.4 }));
    for (const dx of [-4.5, 0, 4.5]) parts.push(el('line', { x1: x + dx, y1: y - 8, x2: x + dx, y2: y - 2, stroke: SKIN_D, 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
    // великий палець — з внутрішнього боку під перекладиною
    parts.push(el('ellipse', { cx: x - side * 8, cy: y + 7, rx: 4.5, ry: 3.4, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 1.2 }));
  } else {
    parts.push(el('rect', { x: x - 9, y: y - 9, width: 18, height: 20, rx: 6, fill: tone(SKIN_P, 0.22), stroke: SKIN_D, 'stroke-width': 1.4 }));
    for (const dy of [-5, -1, 3]) parts.push(el('line', { x1: x - 7, y1: y + dy, x2: x + 7, y2: y + dy, stroke: SKIN_D, 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
    // великий палець — із зовнішнього боку
    parts.push(el('ellipse', { cx: x + side * 9, cy: y - 5, rx: 3.4, ry: 4.5, fill: SKIN_P, stroke: SKIN_D, 'stroke-width': 1.2 }));
  }
  return el('g', { 'data-hand-grip': id }, parts.join(''));
}

/** PICKER «Хват» турніка: три картки одна під одною, на кожній — перекладина, плечі й дві кисті. */
function barGripPicker(value, adj) {
  const opts = (adj.options || []).filter((o) => !o.deleted);
  const cardH = 80;
  const gap = 8;
  const H = 8 + opts.length * (cardH + gap);
  const out = opts.map((o, i) => {
    const on = value === o.id;
    const g = BAR_GRIPS[o.id];
    const y = 8 + i * (cardH + gap);
    const parts = [];
    parts.push(el('rect', { x: 8, y, width: 344, height: cardH, rx: 14, fill: on ? '#e7f0fa' : '#ffffff', stroke: on ? ACC : '#c5cdc9', 'stroke-width': on ? 3 : 1.5 }));
    // перекладина
    const by = y + 20;
    parts.push(el('line', { x1: 18, y1: by, x2: 226, y2: by, stroke: tone(P3.metal, -0.5), 'stroke-width': 9, 'stroke-linecap': 'round' })
      + el('line', { x1: 18, y1: by, x2: 226, y2: by, stroke: P3.metal, 'stroke-width': 6, 'stroke-linecap': 'round' }));
    // людина ззаду: голова, плечі, руки до перекладини
    const cx = 122;
    const shY = y + 64;
    if (g) {
      const k = 1.15;
      for (const s of [-1, 1]) {
        const hx = cx + s * g.half * k;
        parts.push(el('line', { x1: cx + s * 18, y1: shY, x2: hx, y2: by + 8, stroke: P3.shirt, 'stroke-width': 9, 'stroke-linecap': 'round' }));
        parts.push(el('line', { x1: r1(cx + s * 18 + (hx - cx - s * 18) * 0.55), y1: r1(shY + (by + 8 - shY) * 0.55), x2: hx, y2: by + 8, stroke: SKIN_P, 'stroke-width': 7, 'stroke-linecap': 'round' }));
      }
      parts.push(el('path', { d: `M${cx - 24} ${y + cardH - 2} L${cx - 22} ${shY - 4} Q${cx} ${shY - 10} ${cx + 22} ${shY - 4} L${cx + 24} ${y + cardH - 2} Z`, fill: P3.shirt }));
      parts.push(el('circle', { cx, cy: shY - 14, r: 10, fill: P3.hair }));
      for (const s of [-1, 1]) parts.push(barHand(o.id, r1(cx + s * g.half * k), by, s, g.palms));
    }
    parts.push(text(240, y + 30, o.label, { 'font-size': fit(o.label, 104, 16), 'font-weight': on ? 800 : 700, fill: on ? ACC : C.ink }));
    if (g) g.how.forEach((line, j) => parts.push(text(240, y + 50 + j * 16, line, { 'font-size': 12.5, fill: on ? ACC : C.muted })));
    return pickG(o.id, on, `${adj.label}: ${o.label}`, parts.join(''));
  });
  return pickerSvg(360, H, `${adj.label}: як брати перекладину`, out.join(''));
}

const pullupBar = artModule({
  id: 'pullup-bar',
  ADJUSTMENTS: ['grip'],
  PICKERS: { grip: barGripPicker },
  build(exerciseId, mini) {
    const S = scene3d({ yaw: 30, pitch: 18, mini });
    floorShadow(S, 0, 0, 84, 50);
    for (const s of [-1, 1]) {
      // стійка з опорою на підлозі
      beam(S, [s * 62, -40, 3], [s * 62, 40, 3], 9, 6, FR);
      beam(S, [s * 62, 0, 0], [s * 62, 0, BAR_Z + 12], 10, 10, FR);
      beam(S, [s * 62, -30, 3], [s * 62, -2, 70], 6, 6, FR, { kind: 'detail' });
      beam(S, [s * 62, 30, 3], [s * 62, 2, 70], 6, 6, FR, { kind: 'detail' });
      box(S, [s * 62 - 7, -6, BAR_Z - 6], [s * 62 + 7, 6, BAR_Z + 6], FR);
    }
    tube(S, [[-60, 0, BAR_Z], [60, 0, BAR_Z]], 4.2, P3.metal);
    S.mark('grip', [0, 0, BAR_Z]);
    // висить на прямих руках, хват звичайний (ширина плечей)
    human(S, {
      pelvis: [0, -2, BAR_Z - 98],
      hand: (s) => [s * 24, 0, BAR_Z - 1],
      elbowPole: (s) => [s, -0.4, 0],
      ankle: (s) => [s * 9, -24, BAR_Z - 176], kneePole: () => [0, 1, 0.1],
      toe: () => [0, 0.5, -1],
    });
    return renderScene(S, 'Турнік: людина висить на перекладині, підтягування', { maxH: 400 });
  },
});

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
  tricepsPress, cableCurl, leverPulldown, leverRow, cablePull, latPulldown, pullupBar, ...DUMBBELLS,
];
