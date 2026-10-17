// Збірка схем тренажерів для ніг — ракурс ¾ (~45° згори-спереду), за фото gym/my-photos і gym/photos/04…10.
// Кожен елемент SCHEMES — модуль нового контракту (interfaces.md, «T08 — каркас схем»):
//   { id, ADJUSTMENTS, HINTS, art({exerciseId, mini}) → SVG, MARKERS: (exerciseId) → {[adjId]: {x, y}}, PICKERS? }
// На малюнку лише тренажер і людина; мітки регулювань домальовує renderScheme за MARKERS.
// Без регулювань: leg-press, seated-leg-press, hip-adduction, hip-abduction, hack-squat.
// З регулюваннями (позиції 1…5, ⚠ приблизно): leg-curl (важіль — диск на осі, валік — диск біля валика),
// leg-extension (валік — нижній диск, нахил — верхній диск важеля, спинка — повзун на трубі під сидінням).
// Вікна вибору: диск з отворами 1…5 по колу і жовтим фіксатором на вибраному (holeDisk), спинка — труба з поділками.
//
// Малюємо невеликим «3D»: світ у сантиметрах (X — уперед/вздовж тренажера, Y — угору, Z — убік),
// ортографічна камера з поворотом (yaw) і нахилом згори (pitch), грані й деталі сортуються за глибиною.
// Ті самі цеглинки бере cardio.js.

import { C, el, esc, text } from './svg.js';

// --- вектори ------------------------------------------------------------------------------
const r1 = (n) => Math.round(n * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => mul(a, 1 / (len(a) || 1));
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const mid = (a, b) => lerp(a, b, 0.5);
/** Дзеркало відносно площини симетрії тренажера (Z → −Z). */
const mz = (p) => [p[0], p[1], -p[2]];
export const vec = { add, sub, mul, dot, cross, len, unit, lerp, mid, mz };

// --- кольори ------------------------------------------------------------------------------
/** Змішати колір з білим (k > 0) або чорним (k < 0). */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const t = k < 0 ? 0 : 255;
  const a = Math.min(1, Math.abs(k));
  const ch = (v) => Math.round(v + (t - v) * a);
  const rgb = (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255);
  return `#${(rgb | (1 << 24)).toString(16).slice(1)}`;
}

/** Палітра тренажерів залу: чорні рами, чорні подушки, помаранчеві важелі (APOLLO NEXT). */
export const P = {
  frame: '#3e4548',
  dark: '#2b3033',
  pad: '#2f3537',
  orange: '#ef7d22',
  metal: '#c7cfd2',
  plate: '#2a2e30',
  panel: '#9aa4a3',
  floor: '#e2e8e5',
  shirt: '#4b80b8',
  pants: '#5c6672',
  skin: '#e2b593',
  shoe: '#eef1f2', // світлі кросівки — видно на чорних деталях
  hair: '#3b2d24',
  yellow: '#f5c518', // фіксатори (pop-pin) Impulse
};

// --- камера й сцена -----------------------------------------------------------------------
/**
 * Камера ¾: yaw — поворот навколо вертикалі (0 — дивимось з боку +Z), pitch — наскільки згори.
 * Глядач стоїть у напрямку view = (−sin yaw·cos pitch, sin pitch, cos yaw·cos pitch).
 */
export function camera(yaw, pitch) {
  const ct = Math.cos(rad(yaw));
  const st = Math.sin(rad(yaw));
  const cf = Math.cos(rad(pitch));
  const sf = Math.sin(rad(pitch));
  const view = [-st * cf, sf, ct * cf];
  const right = [ct, 0, st];
  const light = unit(add(add(mul(view, 0.6), [0, 1, 0]), mul(right, -0.35)));
  return {
    view,
    light,
    xy: (p) => [p[0] * ct + p[2] * st, -p[1] * cf + (-p[0] * st + p[2] * ct) * sf],
    depth: (p) => dot(p, view),
  };
}

/** Нова сцена. mini — силует для значка: без людини й дрібниць, товщі лінії. */
export function scene(id, cam, { mini = false } = {}) {
  return { id, cam, mini, k: mini ? 2.1 : 1, prims: [], marks: {}, tag: null };
}

/** Додати деталь: pts — [[точка, запас]] для меж, at — точка глибини, draw(V) → SVG. */
function push(S, pts, at, draw, dz = 0) {
  const tag = S.tag;
  S.prims.push({
    pts, d: S.cam.depth(at) + dz,
    draw: tag ? (V) => `<g class="${tag}">${draw(V)}</g>` : draw,
  });
}

const path = (list) => `M${list.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`;
const seg = (A, B, w, color, extra = {}) => el('line', {
  x1: r1(A[0]), y1: r1(A[1]), x2: r1(B[0]), y2: r1(B[1]),
  stroke: color, 'stroke-width': r1(w), 'stroke-linecap': 'round', ...extra,
});
/** Колір грані за її нормаллю (світло згори-зліва-спереду). */
const faceColor = (S, color, n) => shade(color, 0.34 * dot(n, S.cam.light) - 0.12);

/**
 * Шестигранник (коробка, можливо скошена): bottom і top — по 4 кути (top[i] над bottom[i]).
 * soft — радіус заокруглення країв (подушки); edge=false — без контуру.
 */
export function hexa(S, bottom, top, color, { soft = 0, dz = 0, edge = true } = {}) {
  const all = [...bottom, ...top];
  const c = mul(all.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / 8);
  const faces = [bottom, top];
  for (let i = 0; i < 4; i++) faces.push([bottom[i], bottom[(i + 1) % 4], top[(i + 1) % 4], top[i]]);
  const vis = [];
  for (const f of faces) {
    const fc = mul(f.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / 4);
    let n = unit(cross(sub(f[1], f[0]), sub(f[3], f[0])));
    if (dot(n, sub(fc, c)) < 0) n = mul(n, -1);
    if (dot(n, S.cam.view) > 0.01) vis.push({ f, n });
  }
  push(S, all.map((p) => [p, soft]), c, (V) => {
    const sw = soft * V.s;
    const out = [];
    if (edge) {
      for (const { f } of vis) {
        out.push(el('path', {
          d: path(f.map(V.xy)), fill: shade(color, -0.55), stroke: shade(color, -0.55),
          'stroke-width': r1(sw + 1.6), 'stroke-linejoin': 'round',
        }));
      }
    }
    for (const { f, n } of vis) {
      const fill = faceColor(S, color, n);
      out.push(el('path', {
        d: path(f.map(V.xy)), fill, stroke: fill, 'stroke-width': r1(Math.max(sw, 0.6)), 'stroke-linejoin': 'round',
      }));
    }
    return out.join('');
  }, dz);
}

/** Коробка з центром c і піввекторами a (уздовж), b (угору), w (убік). */
export function box(S, c, a, b, w, color, opts) {
  const q = (sb) => [
    add(add(add(c, mul(b, sb)), mul(a, -1)), mul(w, -1)),
    add(add(add(c, mul(b, sb)), a), mul(w, -1)),
    add(add(add(c, mul(b, sb)), a), w),
    add(add(add(c, mul(b, sb)), mul(a, -1)), w),
  ];
  hexa(S, q(-1), q(1), color, opts);
}

/** Коробка між min і max (уздовж осей). */
export function aabb(S, min, max, color, opts) {
  const c = mid(min, max);
  const h = mul(sub(max, min), 0.5);
  box(S, c, [h[0], 0, 0], [0, h[1], 0], [0, 0, h[2]], color, opts);
}

/** Прямокутна труба рами від a до b: ширина w, висота h; up — куди «верх» перерізу. */
export function beam(S, a, b, w, h, color, { up = [0, 1, 0], ...opts } = {}) {
  const d = sub(b, a);
  let side = cross(d, up);
  if (len(side) < 1e-6) side = cross(d, [1, 0, 0]);
  side = unit(side);
  const top = unit(cross(side, d));
  box(S, mid(a, b), mul(d, 0.5), mul(top, (h * S.k) / 2), mul(side, (w * S.k) / 2), color, opts);
}

/** Кругла труба / частина тіла від a до b (заокруглені кінці). */
export function tube(S, a, b, w, color, { dz = 0, hl = true, outline = true } = {}) {
  const ww = w * S.k;
  push(S, [[a, ww / 2], [b, ww / 2]], mid(a, b), (V) => {
    const A = V.xy(a);
    const B = V.xy(b);
    const W = ww * V.s;
    let out = outline ? seg(A, B, W + 1.6, shade(color, -0.5)) : '';
    out += seg(A, B, W, color);
    const dx = B[0] - A[0];
    const dy = B[1] - A[1];
    const l = Math.hypot(dx, dy);
    if (hl && W > 3.2 && l > 0.5) {
      let n = [-dy / l, dx / l];
      if (n[1] > 0 || (Math.abs(n[1]) < 1e-3 && n[0] > 0)) n = [-n[0], -n[1]];
      const o = W * 0.2;
      const A2 = [A[0] + dx * 0.08 + n[0] * o, A[1] + dy * 0.08 + n[1] * o];
      const B2 = [B[0] - dx * 0.08 + n[0] * o, B[1] - dy * 0.08 + n[1] * o];
      out += seg(A2, B2, W * 0.28, shade(color, 0.3), { 'stroke-opacity': 0.75 });
    }
    return out;
  }, dz);
}

/** Коло в 3D (центр c, вісь axis, радіус r) → точки. */
function ring3(c, axis, r, n = 28) {
  const d = unit(axis);
  const e1 = unit(cross(d, Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const e2 = cross(d, e1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    out.push(add(c, add(mul(e1, Math.cos(t) * r), mul(e2, Math.sin(t) * r))));
  }
  return out;
}

/**
 * Циліндр від a до b радіуса r (валик, диск, вісь). cap — колір торця, rings — кільця на торці (млинець),
 * hole — отвір у центрі торця.
 */
export function cyl(S, a, b, r, color, { cap = null, rings = [], hub = 0, dz = 0 } = {}) {
  const d = sub(b, a);
  const dir = unit(d);
  const front = dot(dir, S.cam.view) >= 0 ? b : a;
  const back = front === b ? a : b;
  const fc = mul(dot(dir, S.cam.view) >= 0 ? dir : mul(dir, -1), 1);
  push(S, [[a, r], [b, r]], mid(a, b), (V) => {
    const A = V.xy(a);
    const B = V.xy(b);
    const R = r * V.s;
    let px = -(B[1] - A[1]);
    let py = B[0] - A[0];
    const pl = Math.hypot(px, py);
    if (pl > 1e-6) { px /= pl; py /= pl; } else { px = 0; py = 0; }
    const out = [];
    const edgeC = shade(color, -0.55);
    out.push(el('path', { d: path(ring3(back, d, r).map(V.xy)), fill: shade(color, -0.2), stroke: edgeC, 'stroke-width': 1.2 }));
    if (pl > 1e-6) {
      const quad = [[A[0] + px * R, A[1] + py * R], [B[0] + px * R, B[1] + py * R], [B[0] - px * R, B[1] - py * R], [A[0] - px * R, A[1] - py * R]];
      out.push(el('path', { d: path(quad), fill: color, stroke: edgeC, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }));
      // відблиск уздовж тіла циліндра (з боку світла)
      const s = py < 0 ? 1 : -1;
      const hq = [0.25, 0.55].map((t) => t * s * R);
      out.push(el('path', {
        d: path([[A[0] + px * hq[0], A[1] + py * hq[0]], [B[0] + px * hq[0], B[1] + py * hq[0]], [B[0] + px * hq[1], B[1] + py * hq[1]], [A[0] + px * hq[1], A[1] + py * hq[1]]]),
        fill: shade(color, 0.28), 'fill-opacity': 0.7,
      }));
    }
    const capColor = cap || faceColor(S, shade(color, 0.12), fc);
    out.push(el('path', { d: path(ring3(front, d, r).map(V.xy)), fill: capColor, stroke: edgeC, 'stroke-width': 1.2 }));
    for (const k of rings) {
      out.push(el('path', { d: path(ring3(front, d, r * k).map(V.xy)), fill: 'none', stroke: shade(capColor, -0.35), 'stroke-width': 1 }));
    }
    if (hub) out.push(el('path', { d: path(ring3(front, d, hub).map(V.xy)), fill: P.metal, stroke: shade(P.metal, -0.45), 'stroke-width': 1 }));
    return out.join('');
  }, dz);
}

/** Млинець (диск штанги) з центром c на осі axis. */
export function plate(S, c, axis, r, t, color = P.plate) {
  const d = mul(unit(axis), t / 2);
  cyl(S, sub(c, d), add(c, d), r, color, { rings: S.mini ? [] : [0.82, 0.42], hub: r * 0.22 });
}

/**
 * Диск регулювання з отворами по колу (за фото Impulse): центр c, вісь axis (на глядача — бік +Z), радіус r.
 * angles — кути отворів у площині XY (градуси, 0 — уперед +X, 90 — угору); pin — індекс отвору з жовтим фіксатором.
 * metal — світле кільце з темними отворами (диск біля валика), інакше чорний диск зі світлими отворами.
 * → центр лицьового боку (для мітки).
 */
export function holeDisk(S, c, r, angles, { pin = -1, metal = false, t = 3, dz = 0 } = {}) {
  const face = add(c, [0, 0, t / 2]);
  cyl(S, sub(c, [0, 0, t / 2]), face, r, metal ? P.metal : P.dark, { hub: r * 0.24, rings: S.mini ? [] : [metal ? 0.92 : 0.9], dz });
  if (S.mini) return face;
  angles.forEach((deg, i) => {
    const p = add(face, [Math.cos(rad(deg)) * r * 0.68, Math.sin(rad(deg)) * r * 0.68, 0.4]);
    if (i === pin) sphere(S, add(p, [0, 0, 1.2]), Math.max(1.8, r * 0.13), P.yellow, { dz: dz + 2 });
    else sphere(S, p, Math.max(1.1, r * 0.08), metal ? '#22282a' : P.metal, { stroke: false, dz: dz + 1 });
  });
  return face;
}

/** Куля (голова, кисть, ручка). */
export function sphere(S, c, r, color, { dz = 0, stroke = true } = {}) {
  push(S, [[c, r]], c, (V) => {
    const [x, y] = V.xy(c);
    const R = r * V.s;
    return el('circle', { cx: r1(x), cy: r1(y), r: r1(R), fill: color, stroke: stroke ? shade(color, -0.45) : null, 'stroke-width': stroke ? 1.2 : null })
      + el('circle', { cx: r1(x - R * 0.3), cy: r1(y - R * 0.32), r: r1(R * 0.38), fill: shade(color, 0.35), 'fill-opacity': 0.6 });
  }, dz);
}

/** Плоский багатокутник (ґрунт, платформа). */
export function flat(S, pts, color, { dz = 0, edge = true } = {}) {
  const c = mul(pts.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / pts.length);
  let n = unit(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
  if (dot(n, S.cam.view) < 0) n = mul(n, -1);
  push(S, pts.map((p) => [p, 0]), c, (V) => el('path', {
    d: path(pts.map(V.xy)), fill: faceColor(S, color, n),
    stroke: edge ? shade(color, -0.5) : 'none', 'stroke-width': 1.2, 'stroke-linejoin': 'round',
  }), dz);
}

/** Позначити точку регулювання (центр мітки) у координатах світу. */
export function mark(S, adjId, p) { S.marks[adjId] = p; }

// --- людина -------------------------------------------------------------------------------
/** Середній суглоб дволанкової кінцівки (коліно, лікоть): від a до c, довжини l1, l2, згин у бік hint. */
export function ik(a, c, l1, l2, hint) {
  const ac = sub(c, a);
  let d = len(ac);
  const dir = mul(ac, 1 / (d || 1));
  d = Math.min(d, l1 + l2 - 0.5);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = unit(sub(hint, mul(dir, dot(hint, dir))));
  return add(add(a, mul(dir, x)), mul(p, h));
}

const THIGH = 44;
const SHIN = 43;
const UPPER_ARM = 29;
const FOREARM = 27;

/**
 * Людина. pelvis, neck — центри таза й основи шиї; face — куди дивиться обличчя (вектор);
 * legs/arms — для боку +Z: { ankle, toe, knee? (підказка згину) } / { hand, elbow? }; другий бік — дзеркально,
 * або явно legsL / armsL. Ширина плечей і таза — уздовж Z.
 */
export function person(S, o) {
  if (S.mini) return;
  const prev = S.tag;
  S.tag = 'sc-person';
  const { pelvis, neck, face = [1, 0, 0] } = o;
  const spine = sub(neck, pelvis);
  const up = unit(spine);
  const lat = [0, 0, 1];
  let front = unit(cross(lat, up));
  if (dot(front, face) < 0) front = mul(front, -1);
  const legR = o.leg;
  const legL = o.legL || { ankle: mz(legR.ankle), toe: mz(legR.toe), knee: legR.knee && mz(legR.knee) };
  const armR = o.arm;
  const armL = o.armL || (armR && { hand: mz(armR.hand), elbow: armR.elbow && mz(armR.elbow) });

  // ноги
  for (const [leg, s] of [[legR, 1], [legL, -1]]) {
    const hip = add(pelvis, [0, 0, 9.5 * s]);
    const knee = ik(hip, leg.ankle, THIGH, SHIN, leg.knee || add(front, [0, 0.4, 0]));
    tube(S, hip, knee, 15.5, P.pants);
    tube(S, knee, leg.ankle, 11.5, P.pants);
    tube(S, leg.ankle, leg.toe, 8.5, P.shoe, { hl: false });
  }
  // тулуб: трапеція від таза до плечей
  const quad = (c, hw, hd) => [
    add(add(c, mul(lat, -hw)), mul(front, -hd)),
    add(add(c, mul(lat, hw)), mul(front, -hd)),
    add(add(c, mul(lat, hw)), mul(front, hd)),
    add(add(c, mul(lat, -hw)), mul(front, hd)),
  ];
  hexa(S, quad(sub(pelvis, mul(up, 4)), 15, 9.5), quad(add(neck, mul(up, 1)), 18.5, 10), P.shirt, { soft: 4 });
  // голова
  const head = add(add(neck, mul(up, 13)), mul(unit(face), 2));
  tube(S, neck, head, 9, P.skin, { hl: false });
  push(S, [[head, 11.5]], head, (V) => {
    const [x, y] = V.xy(head);
    const R = 11 * V.s;
    const back = V.xy(sub(add(head, mul(up, 2.2)), mul(unit(face), 3)));
    const fwd = V.xy(add(head, mul(unit(face), 1.4)));
    return el('circle', { cx: r1(back[0]), cy: r1(back[1]), r: r1(R * 1.02), fill: P.hair, stroke: shade(P.hair, -0.4), 'stroke-width': 1.2 })
      + el('circle', { cx: r1(fwd[0]), cy: r1(fwd[1]), r: r1(R * 0.9), fill: P.skin, stroke: shade(P.skin, -0.4), 'stroke-width': 1.1 })
      + el('circle', { cx: r1(x - R * 0.1), cy: r1(y - R * 0.25), r: r1(R * 0.3), fill: shade(P.skin, 0.35), 'fill-opacity': 0.55 });
  });
  // руки
  for (const [arm, s] of [[armR, 1], [armL, -1]]) {
    if (!arm) continue;
    const sh = add(sub(neck, mul(up, 4)), [0, 0, 17 * s]);
    const elbow = ik(sh, arm.hand, UPPER_ARM, FOREARM, arm.elbow || [0, -1, 0.4 * s]);
    tube(S, sh, elbow, 10, P.shirt);
    tube(S, elbow, arm.hand, 7.6, P.skin);
    sphere(S, arm.hand, 4.6, P.skin);
  }
  S.tag = prev;
}

// --- рендер -------------------------------------------------------------------------------
/**
 * Сцена → SVG. Повна схема: ширина 360, висота за вмістом; значок (mini): 120×103 без фону.
 * → { svg, project(p) → [x, y] у viewBox }
 */
export function render(S, label) {
  const { cam, mini } = S;
  // тінь-підлога під тренажером
  if (!mini) {
    let lo = [Infinity, Infinity];
    let hi = [-Infinity, -Infinity];
    for (const pr of S.prims) {
      for (const [p] of pr.pts) {
        lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[2])];
        hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[2])];
      }
    }
    const g = 10;
    const fl = [[lo[0] - g, 0, lo[1] - g], [hi[0] + g, 0, lo[1] - g], [hi[0] + g, 0, hi[1] + g], [lo[0] - g, 0, hi[1] + g]];
    S.prims.push({
      pts: fl.map((p) => [p, 0]), d: -Infinity,
      draw: (V) => el('path', {
        d: path(fl.map(V.xy)), fill: P.floor, stroke: P.floor, 'stroke-width': r1(16 * V.s), 'stroke-linejoin': 'round',
      }),
    });
  }
  let minx = Infinity; let miny = Infinity; let maxx = -Infinity; let maxy = -Infinity;
  for (const pr of S.prims) {
    for (const [p, pad] of pr.pts) {
      const [x, y] = cam.xy(p);
      minx = Math.min(minx, x - pad); maxx = Math.max(maxx, x + pad);
      miny = Math.min(miny, y - pad); maxy = Math.max(maxy, y + pad);
    }
  }
  const W = mini ? 120 : 360;
  const m = mini ? 3 : 14;
  const Hmax = mini ? 103 : 300;
  const bw = Math.max(maxx - minx, 1);
  const bh = Math.max(maxy - miny, 1);
  const s = Math.min((W - 2 * m) / bw, (Hmax - 2 * m) / bh);
  const H = mini ? Hmax : Math.round(Math.max(190, bh * s + 2 * m));
  const ox = (W - bw * s) / 2 - minx * s;
  const oy = (H - bh * s) / 2 - miny * s;
  const V = { s, xy: (p) => { const [x, y] = cam.xy(p); return [x * s + ox, y * s + oy]; } };
  const body = S.prims.slice().sort((a, b) => a.d - b.d).map((pr) => pr.draw(V)).join('');
  const bg = mini ? '' : `<defs><linearGradient id="${S.id}-bg" x1="0" y1="0" x2="0" y2="1">`
    + '<stop offset="0" stop-color="#fbfcfc"/><stop offset="1" stop-color="#edf1ef"/></linearGradient></defs>'
    + `<rect x="0" y="0" width="${W}" height="${H}" rx="16" fill="url(#${S.id}-bg)"/>`;
  const head = mini
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="scheme-mini" aria-hidden="true">`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="scheme-svg" role="img" aria-label="${esc(label)}">`;
  return {
    svg: `${head}${bg}${body}</svg>`,
    project: (p) => { const [x, y] = V.xy(p); return { x: r1(x), y: r1(y) }; },
  };
}

/**
 * Модуль схеми нового контракту з опису:
 *   { id, label, view: [yaw, pitch] | (exerciseId) → [yaw, pitch], build(S, exerciseId), ADJUSTMENTS?, HINTS?, PICKERS? }
 * art і MARKERS кешуються (малюнок не залежить від значень клієнта).
 */
export function artModule({ id, label, view, build, ADJUSTMENTS = [], HINTS = {}, PICKERS }) {
  const cache = new Map();
  const get = (exerciseId, mini) => {
    const key = `${exerciseId ?? ''}|${mini ? 1 : 0}`;
    if (!cache.has(key)) {
      const [yaw, pitch] = typeof view === 'function' ? view(exerciseId) : view;
      const S = scene(id, camera(yaw, pitch), { mini });
      build(S, exerciseId);
      const name = typeof label === 'function' ? label(exerciseId) : label;
      const { svg, project } = render(S, name);
      const marks = {};
      for (const [adj, p] of Object.entries(S.marks)) marks[adj] = project(p);
      cache.set(key, { svg, marks });
    }
    return cache.get(key);
  };
  const mod = {
    id,
    ADJUSTMENTS,
    HINTS,
    art: ({ exerciseId = null, mini = false } = {}) => get(exerciseId, mini).svg,
    MARKERS: (exerciseId = null) => ({ ...get(exerciseId, false).marks }),
  };
  if (PICKERS) mod.PICKERS = PICKERS;
  return mod;
}

// --- спільне для тренажерів ---------------------------------------------------------------
/** Стійка з вагою (чорний корпус, світла панель на грані faceDir: 'x+' | 'x-' | 'z+'). */
function stackTower(S, min, max, faceDir = 'x+') {
  aabb(S, min, max, P.dark, { soft: 2 });
  if (S.mini) return;
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const e = 0.6;
  if (faceDir === 'x+' || faceDir === 'x-') {
    const x = faceDir === 'x+' ? x1 + e : x0 - e;
    const zm = (z0 + z1) / 2;
    const hz = (z1 - z0) * 0.3;
    flat(S, [[x, y0 + 30, zm - hz], [x, y0 + 30, zm + hz], [x, y1 - 14, zm + hz], [x, y1 - 14, zm - hz]], P.panel, { dz: 0.5 });
    flat(S, [[x + (faceDir === 'x+' ? 0.3 : -0.3), y0 + 40, zm - 2], [x, y0 + 40, zm + 2], [x, y1 - 24, zm + 2], [x, y1 - 24, zm - 2]], P.dark, { dz: 0.6, edge: false });
  } else {
    const z = z1 + e;
    const xm = (x0 + x1) / 2;
    const hx = (x1 - x0) * 0.3;
    flat(S, [[xm - hx, y0 + 30, z], [xm + hx, y0 + 30, z], [xm + hx, y1 - 14, z], [xm - hx, y1 - 14, z]], P.panel, { dz: 0.5 });
    flat(S, [[xm - 2, y0 + 40, z + 0.3], [xm + 2, y0 + 40, z + 0.3], [xm + 2, y1 - 24, z + 0.3], [xm - 2, y1 - 24, z + 0.3]], P.dark, { dz: 0.6, edge: false });
  }
}

/** Подушка (сидіння, спинка): від a до b по центру, нормаль n (куди «верх» подушки), півширина hw, півтовщина ht. */
function pad(S, a, b, n, hw, ht = 4.5, color = P.pad) {
  box(S, mid(a, b), mul(sub(b, a), 0.5), mul(unit(n), ht), [0, 0, hw], color, { soft: 3 });
}

/** Опорна рама: дві повздовжні балки по підлозі та поперечки. */
function baseFrame(S, x0, x1, hz, cross = []) {
  for (const z of [-hz, hz]) beam(S, [x0, 3, z], [x1, 3, z], 7, 6, P.frame);
  for (const x of cross) beam(S, [x, 3, -hz], [x, 3, hz], 6, 5, P.frame);
}

// ======================================================================
// 1. Жим ногами лежачи (eq-04, leg-press): 45° — лежак унизу, похилі напрямні, каретка з платформою й дисками.
// ======================================================================
const legPress = artModule({
  id: 'leg-press',
  label: 'Схема тренажера «Жим ногами лежачи»',
  view: [40, 16],
  build(S) {
    const d = unit([1, 1, 0]); // уздовж напрямних, 45°
    const up = unit([-1, 1, 0]); // перпендикуляр до напрямних, угору
    const R0 = [96, 6, 0];
    baseFrame(S, -12, 200, 28, [-8, 94, 196]);
    // напрямні та задні стійки
    const top = add(R0, mul(d, 150));
    for (const z of [-24, 24]) {
      beam(S, [R0[0], R0[1], z], [top[0], top[1], z], 7, 7, P.frame, { up });
      beam(S, [top[0], 3, z], [top[0], top[1] + 4, z], 7, 7, P.frame);
    }
    beam(S, [top[0], top[1] + 4, -26], [top[0], top[1] + 4, 26], 6, 6, P.frame);
    // лежак: спинка вниз до голови, сидіння під тазом
    const bk = unit([-60, 30, 0]);
    const nb = unit([30, 60, 0]);
    const seatA = [64, 36, 0];
    pad(S, seatA, add(seatA, mul(bk, 66)), nb, 24, 4.5);
    pad(S, [68, 37, 0], [96, 50, 0], unit([-13, 28, 0]), 22, 4.5);
    beam(S, [56, 3, 0], [58, 34, 0], 8, 8, P.frame, { dz: -40 });
    beam(S, [14, 3, 0], [14, 58, 0], 8, 8, P.frame, { dz: -40 });
    beam(S, [14, 54, 0], [60, 31, 0], 6, 6, P.frame, { up: nb, dz: -40 });
    // ручки біля таза
    if (!S.mini) {
      for (const z of [-31, 31]) {
        beam(S, [62, 3, z * 0.9], [64, 40, z], 5, 5, P.frame);
        tube(S, [52, 43, z], [78, 45, z], 4.5, P.orange);
      }
    }
    // каретка на напрямних і платформа для стоп
    const s = 74;
    const Rs = add(R0, mul(d, s));
    const Fc = add(Rs, mul(up, 46)); // центр робочої площини платформи
    box(S, add(add(Rs, mul(d, 14)), mul(up, 22)), mul(d, 9), mul(up, 25), [0, 0, 27], P.frame, { soft: 1, dz: -45 });
    for (const z of [-28, 28]) beam(S, add(add(Rs, mul(d, 4)), [0, 0, z]), add(add(Rs, mul(d, 4)), add(mul(up, 46), [0, 0, z])), 4, 6, P.orange, { up: d });
    // платформа повернута робочою площиною до людини (нормаль pn), pu — «угору» по платформі
    const pn = unit([-1, -0.35, 0]);
    const pu = unit([-0.35, 1, 0]);
    box(S, sub(Fc, mul(pn, 2.5)), mul(pu, 30), mul(pn, 2.5), [0, 0, 32], '#5d676d', { soft: 1.5, dz: -40 }); // за стопами
    // втулки з дисками з обох боків каретки
    const hc = add(add(Rs, mul(d, 16)), mul(up, 16));
    for (const sgn of [-1, 1]) {
      cyl(S, add(hc, [0, 0, 27 * sgn]), add(hc, [0, 0, 56 * sgn]), 2.6, P.metal);
      plate(S, add(hc, [0, 0, 34 * sgn]), [0, 0, 1], 22, 4);
      plate(S, add(hc, [0, 0, 39 * sgn]), [0, 0, 1], 22, 4);
    }
    // людина: лежить на лежаку, стопи на платформі
    const pelvis = add(add(seatA, mul(bk, 4)), mul(nb, 14.5));
    const neck = add(add(seatA, mul(bk, 54)), mul(nb, 14.5));
    const ankle = add(add(Fc, mul(pn, 8)), add(mul(pu, -6), [0, 0, 15]));
    person(S, {
      pelvis, neck, face: add(nb, mul(d, 0.4)),
      leg: { ankle, toe: add(add(ankle, mul(pu, 14)), mul(pn, 1)), knee: [-0.3, 1, 0.12] },
      arm: { hand: [64, 47, 31], elbow: [0, -0.3, 1] },
    });
  },
});

// ======================================================================
// 2. Жим ногами сидячи (eq-05, seated-leg-press, схований у каталозі).
// ======================================================================
const seatedLegPress = artModule({
  id: 'seated-leg-press',
  label: 'Схема тренажера «Жим ногами сидячи»',
  view: [-38, 24],
  build(S) {
    baseFrame(S, -40, 120, 24, [-36, 116]);
    stackTower(S, [-46, 0, -70], [-14, 150, -36], 'x+');
    beam(S, [-20, 3, -40], [-20, 3, -24], 6, 5, P.frame);
    // сидіння і спинка
    beam(S, [0, 3, 0], [0, 40, 0], 8, 8, P.frame);
    pad(S, [-18, 45, 0], [22, 45, 0], [0, 1, 0], 22);
    pad(S, [-22, 50, 0], [-36, 112, 0], unit([62, 14, 0]), 21);
    beam(S, [-30, 3, 0], [-38, 80, 0], 6, 6, P.frame);
    // платформа на важелі
    beam(S, [112, 3, 0], [112, 30, 0], 8, 8, P.frame);
    beam(S, [112, 30, 0], [96, 22, 0], 6, 6, P.orange);
    box(S, [96, 56, 0], [2.5, 0, 0], [0, 32, 0], [0, 0, 30], P.dark, { soft: 1.5 });
    beam(S, [100, 30, -24], [100, 80, -24], 5, 5, P.orange);
    beam(S, [100, 30, 24], [100, 80, 24], 5, 5, P.orange);
    if (!S.mini) for (const z of [-27, 27]) tube(S, [-6, 50, z], [18, 50, z], 4.5, P.orange);
    person(S, {
      pelvis: [-4, 58, 0], neck: [-18, 108, 0], face: [1, 0, 0],
      leg: { ankle: [86, 56, 14], toe: [91, 70, 15], knee: [0, 1, 0.2] },
      arm: { hand: [6, 52, 27], elbow: [-0.5, -0.5, 1] },
    });
  },
});

// ======================================================================
// 3–4. Зведення / Розведення ніг (eq-06, eq-09): сидячи, помаранчеві важелі з подушками біля колін —
// всередині колін (зведення, ноги розведені) або зовні (розведення, ноги разом). Ракурс згори під кутом.
// ======================================================================
function hipMachine(S, adduction) {
  baseFrame(S, -44, 70, 16, [-40, 66]);
  stackTower(S, [-46, 0, -96], [-12, 146, -58], 'x+');
  beam(S, [-30, 3, -60], [-30, 3, -16], 6, 5, P.frame);
  // сидіння, спинка, ручки
  beam(S, [0, 3, 0], [0, 40, 0], 9, 9, P.frame);
  pad(S, [-22, 46, 0], [22, 46, 0], [0, 1, 0], 22);
  const pelvis = [-4, 58, 0];
  const neck = [-14, 108, 0];
  const spine = unit(sub(neck, pelvis));
  const front = unit(cross(spine, [0, 0, 1]));
  const back = mul(front, -15);
  pad(S, add(add(pelvis, back), mul(spine, -2)), add(add(neck, back), mul(spine, 6)), front, 20, 4.5);
  beam(S, add(add(pelvis, mul(front, -20)), [0, -10, 0]), add(add(neck, mul(front, -20)), mul(spine, -10)), 6, 6, P.frame);
  if (!S.mini) {
    for (const z of [-29, 29]) {
      beam(S, [-6, 38, z * 0.8], [-6, 50, z], 4, 4, P.frame);
      tube(S, [-10, 52, z], [16, 52, z], 4.5, P.dark);
    }
  }
  // ноги
  const kneeZ = adduction ? 30 : 12;
  const knee = [adduction ? 38 : 43, 58, kneeZ];
  const ankle = [knee[0] + 5, 17, kneeZ + (adduction ? 4 : 1)];
  // важелі: вісь під передом сидіння, плече вперед, стійка з подушкою біля коліна й упором для стоп
  const padZ = adduction ? kneeZ - 15 : kneeZ + 14.5;
  for (const s of [-1, 1]) {
    const piv = [14, 26, 7 * s];
    const post = [48, 26, padZ * s];
    cyl(S, add(piv, [0, -4, 0]), add(piv, [0, 4, 0]), 4, P.dark);
    beam(S, piv, post, 6, 6, P.orange);
    const dz = adduction ? -14 : 0; // подушка всередині коліна — за ногою
    beam(S, [48, 12, padZ * s], [48, 78, padZ * s], 6, 6, P.orange, { dz });
    cyl(S, [knee[0] + 1, 48, padZ * s], [knee[0] + 1, 76, padZ * s], 6.5, P.pad, { cap: shade(P.pad, 0.18), dz });
    // упор для стоп
    beam(S, [48, 12, padZ * s], [48, 12, ankle[2] * s + 6 * s * (adduction ? 1 : -1)], 4.5, 4.5, P.orange);
    if (!S.mini) tube(S, [34, 10, ankle[2] * s], [60, 10, ankle[2] * s], 5, P.dark);
  }
  person(S, {
    pelvis, neck, face: [1, -0.1, 0],
    leg: { ankle, toe: add(ankle, [13, -5, 0]), knee: [1, 0.3, 0] },
    arm: { hand: [4, 54, 29], elbow: [-0.6, -0.4, 0.8] },
  });
}

const hipAdduction = artModule({
  id: 'hip-adduction', label: 'Схема тренажера «Зведення ніг»', view: [-64, 50],
  build(S) { hipMachine(S, true); },
});
const hipAbduction = artModule({
  id: 'hip-abduction', label: 'Схема тренажера «Розведення ніг»', view: [-64, 50],
  build(S) { hipMachine(S, false); },
});

// ======================================================================
// 5. Гак-машина (eq-08, hack-squat) — зворотна: обличчям до тренажера, плечі під валиками,
// стопи на похилій платформі, присід з нахилом корпусу.
// ======================================================================
const hackSquat = artModule({
  id: 'hack-squat',
  label: 'Схема тренажера «Гак-машина»: обличчям до тренажера, плечі під валиками',
  view: [-22, 20],
  build(S) {
    baseFrame(S, -22, 116, 30, [-18, 112]);
    // похила платформа для стоп (носки вище)
    const tilt = rad(12);
    const pa = [Math.cos(tilt) * 26, Math.sin(tilt) * 26, 0];
    const pn = [-Math.sin(tilt), Math.cos(tilt), 0];
    box(S, [12, 11, 0], pa, mul(pn, 2.5), [0, 0, 34], P.dark, { soft: 1 });
    beam(S, [-10, 3, 0], [-10, 6, 0], 30, 4, P.frame);
    beam(S, [34, 3, 0], [34, 14, 0], 30, 4, P.frame);
    // напрямні, нахилені до людини
    const r0 = [112, 3, 0];
    const rd = unit([-50, 165, 0]);
    const rn = unit(cross([0, 0, 1], rd)); // від напрямних до людини... (−X)
    for (const z of [-17, 17]) beam(S, [r0[0], r0[1], z], add([r0[0], r0[1], z], mul(rd, 172)), 7, 7, P.frame, { up: rn });
    const rtop = add(r0, mul(rd, 172));
    beam(S, add(rtop, [0, 0, -20]), add(rtop, [0, 0, 20]), 6, 6, P.frame);
    beam(S, [116, 3, 0], [116, 60, 0], 7, 7, P.frame);
    // каретка з втулками й дисками
    const cc = add(r0, mul(rd, 118));
    box(S, add(cc, mul(rn, -2)), mul(rd, 20), mul(rn, 5), [0, 0, 22], P.frame, { soft: 1 });
    const hc = add(add(cc, mul(rd, -34)), [6, 0, 0]);
    beam(S, add(cc, mul(rd, -20)), hc, 6, 6, P.frame);
    for (const s of [-1, 1]) {
      cyl(S, add(hc, [0, 0, 18 * s]), add(hc, [0, 0, 42 * s]), 2.6, P.metal);
      plate(S, add(hc, [0, 0, 26 * s]), [0, 0, 1], 18, 4);
      plate(S, add(hc, [0, 0, 31 * s]), [0, 0, 1], 18, 4);
    }
    // людина в присіді з нахилом уперед
    const pelvis = [-8, 76, 0];
    const neck = [24, 116, 0];
    const sh = sub(neck, mul(unit(sub(neck, pelvis)), 4));
    // плечові валики й ручки на кронштейнах від каретки
    const padY = sh[1] + 11.5;
    for (const s of [-1, 1]) {
      const z = 16 * s;
      beam(S, add(add(cc, mul(rd, 14)), [0, 0, z]), [44, padY + 4, z], 6, 6, P.orange);
      box(S, [sh[0] + 4, padY, z], [17, 0, 0], [0, 5, 0], [0, 0, 5.5], P.pad, { soft: 3 });
      if (!S.mini) {
        beam(S, [42, padY - 2, z], [42, padY - 2, 26 * s], 4, 4, P.orange);
        tube(S, [41, padY - 14, 26 * s], [41, padY + 4, 26 * s], 4.8, P.dark);
      }
    }
    const ankle = [5, 20, 14];
    person(S, {
      pelvis, neck, face: [1, -0.25, 0],
      leg: { ankle, toe: [25, 22.5, 16], knee: [1, 0.1, 0.25] },
      arm: { hand: [41, padY - 6, 26], elbow: [0.1, -1, 0.35] },
    });
  },
});

// ======================================================================
// 6. Згинання ніг лежачи (eq-07, leg-curl), за фото Impulse prone leg curl: стійка з вагою біля голови,
// рівна лава (одна подушка), ручки під грудьми; біля колін — диск з отворами на осі важеля («Важіль»),
// на кінці важеля — кільце з отворами біля валика («Валік»). Позиції по колу — у PICKERS.
// ======================================================================
const LC_HINTS = {
  lever: { first: 'найнижче', last: 'найвище' },
  roller: { first: 'найнижче', last: 'найвище' },
};
// Кут відхилення від горизонталі: позиція k → −56°…+56° (плюс — вище).
const curlAngle = (k, n) => (k - (n + 1) / 2) * (112 / Math.max(n - 1, 1));
const curlHoles = (n = 5) => Array.from({ length: n }, (_, i) => 180 - curlAngle(i + 1, n));

const legCurl = artModule({
  id: 'leg-curl',
  label: 'Схема тренажера «Згинання ніг лежачи»: диск важеля біля колін і диск валика',
  ADJUSTMENTS: ['lever', 'roller'],
  HINTS: LC_HINTS,
  view: [22, 38],
  build(S) {
    baseFrame(S, -46, 132, 20, [-42, 30, 128]);
    stackTower(S, [102, 0, -27], [134, 150, 27], 'x-');
    // лава: одна рівна подушка від колін до грудей
    pad(S, [-24, 64, 0], [80, 64, 0], [0, 1, 0], 17, 5);
    for (const x of [-2, 62]) beam(S, [x, 3, 0], [x, 58, 0], 8, 8, P.frame);
    beam(S, [-14, 57, 0], [74, 57, 0], 7, 5, P.frame);
    // ручки під передом лави
    beam(S, [70, 57, 0], [74, 36, 0], 6, 6, P.frame);
    beam(S, [74, 36, -24], [74, 36, 24], 5, 5, P.frame);
    if (!S.mini) for (const z of [-24, 24]) tube(S, [74, 36, z], [80, 48, z], 4.6, P.orange);
    // вісь важеля біля колін: кронштейн від рами, диск з отворами («Важіль»)
    const hinge = [-27, 79, 25];
    beam(S, [-12, 57, 18], [hinge[0], hinge[1], 21], 6, 6, P.frame);
    const leverFace = holeDisk(S, hinge, 19, curlHoles(), { pin: 2, t: 6, dz: 20 });
    // важіль до валика й кільце з отворами біля валика («Валік»)
    const roller = [-66, 90, 25];
    beam(S, add(hinge, [0, 0, -6]), add(roller, [0, 0, -6]), 6, 6, P.orange); // за диском, як на фото
    cyl(S, [roller[0], roller[1], -22], [roller[0], roller[1], 24], 7, P.pad, { cap: shade(P.pad, 0.2) });
    const rollerFace = holeDisk(S, add(roller, [0, 0, 6.5]), 13, curlHoles().map((d) => d + 180), { pin: 2, metal: true, t: 3 });
    if (!S.mini) sphere(S, [roller[0], roller[1], -23.5], 2.4, P.yellow);
    mark(S, 'lever', leverFace);
    mark(S, 'roller', rollerFace);
    // людина лежить на животі, ахіли під валиком
    person(S, {
      pelvis: [16, 79, 0], neck: [66, 79, 0], face: [0.7, -0.7, 0],
      leg: { ankle: [-68, 77.5, 9.5], toe: [-71, 67, 10], knee: [0, 1, 0] },
      arm: { hand: [80, 47, 24], elbow: [-0.5, 0.1, 1] },
    });
  },
  PICKERS: {
    lever: (v, adj) => curlPicker('lever', v, adj),
    roller: (v, adj) => curlPicker('roller', v, adj),
  },
});

// --- PICKERS: наочність у вікні вибору ----------------------------------------------------
const picked = (adj, v) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= adj.count ? Number(v) : null);
const p2 = (c, deg, l) => [r1(c[0] + Math.cos(rad(deg)) * l), r1(c[1] - Math.sin(rad(deg)) * l)];
const pickerRoot = (w, h, label, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">`
  + `${el('rect', { x: 0, y: 0, width: w, height: h, fill: '#f8faf9' })}${inner}</svg>`;
/** Кнопка позиції: коло з номером; is-on — вибрана. */
function pickDot(k, [x, y], on, r = 13) {
  return el('g', { 'data-pick': k, class: on ? 'pick-dot is-on' : 'pick-dot' },
    el('circle', { cx: x, cy: y, r: on ? r + 3 : r, fill: on ? C.accent : '#ffffff', stroke: on ? C.accent : '#8f9b97', 'stroke-width': on ? 3 : 2 })
    + text(x, y + 5, k, { 'font-size': on ? 16 : 14, 'font-weight': on ? 800 : 600, 'text-anchor': 'middle', fill: on ? '#ffffff' : C.ink }));
}
const thick = (a, b, w, color, extra = {}) => el('line', {
  x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', ...extra,
});
const ghost = (a, b, w = 7) => thick(a, b, w, '#d5dcd9');
const note = (x, y, s, anchor = 'start') => text(x, y, s, { 'font-size': 13, fill: C.muted, 'text-anchor': anchor });

/**
 * Диск з отворами у вікні вибору (W1, W3): отвори 1…N по колу — кнопки; на вибраному — жовтий фіксатор.
 * D — центр, r — радіус диска, hr — радіус кола отворів, angle(k) — кут отвору k (градуси, 90 — угору),
 * metal — світле кільце (диск біля валика), інакше чорний диск. → { parts, holes }
 */
function pickDisk(D, r, hr, n, sel, angle, { metal = false } = {}) {
  const parts = [el('circle', {
    cx: D[0], cy: D[1], r, fill: metal ? '#cdd4d7' : P.dark, stroke: metal ? '#6f7c82' : '#15191b', 'stroke-width': 3,
    'data-dial-center': `${D[0]},${D[1]}`,
  })];
  parts.push(el('circle', { cx: D[0], cy: D[1], r: r - 7, fill: 'none', stroke: metal ? '#aeb7bb' : '#454c50', 'stroke-width': 1.5 }));
  const holes = [];
  const rr = n > 6 ? 10 : 13;
  for (let k = 1; k <= n; k++) {
    const [x, y] = p2(D, angle(k), hr);
    const on = sel === k;
    holes.push(el('g', { 'data-pick': k, class: on ? 'pick-dot is-on' : 'pick-dot' },
      (on
        ? el('circle', { cx: x, cy: y, r: rr + 4, fill: P.yellow, stroke: '#7a5c00', 'stroke-width': 3 })
        : el('circle', { cx: x, cy: y, r: rr, fill: '#14191b', stroke: metal ? '#7d898d' : '#aeb7bb', 'stroke-width': 2.5 }))
      + text(x, y + 5, k, { 'font-size': on ? 17 : 14, 'font-weight': on ? 800 : 700, 'text-anchor': 'middle', fill: on ? '#1d1a0a' : '#ffffff' })));
  }
  return { parts, holes };
}
const hub = (D, r = 11) => el('circle', { cx: D[0], cy: D[1], r, fill: P.metal, stroke: '#6f7c82', 'stroke-width': 2.5 });
/** Валик з торця; on=false — блідий (нічого не вибрано). */
const rollerEnd = (c, r, on = true) => el('circle', { cx: c[0], cy: c[1], r, fill: on ? P.pad : '#dfe5e2', stroke: on ? '#111' : '#c8d0cd', 'stroke-width': 1.5 })
  + (on ? el('circle', { cx: c[0], cy: c[1], r: r1(r * 0.3), fill: '#5b6467' }) : '');

/**
 * Згинання ніг (W1). «Важіль» — чорний диск на осі біля колін, важіль з валиком проходить через вибраний отвір.
 * «Валік» — світле кільце з отворами на кінці важеля, валик на короткому плечі навпроти вибраного отвору.
 * Отвори по колу ліворуч: 1 — найнижче, N — найвище.
 */
function curlPicker(which, value, adj) {
  const n = adj.count;
  const sel = picked(adj, value);
  const ang = (k) => 180 - curlAngle(k, n);
  const parts = [];
  if (which === 'lever') {
    const D = [214, 120];
    const disk = pickDisk(D, 84, 60, n, sel, ang);
    parts.push(...disk.parts);
    const tip = p2(D, sel ? ang(sel) : 180, 112);
    parts.push(sel ? thick(D, tip, 14, P.orange) : ghost(D, tip, 12));
    parts.push(rollerEnd(tip, 18, !!sel));
    parts.push(hub(D), ...disk.holes);
  } else {
    const R = [204, 118];
    parts.push(thick(R, [340, 168], 18, P.orange)); // важіль від осі біля колін
    const disk = pickDisk(R, 80, 58, n, sel, ang, { metal: true });
    parts.push(...disk.parts);
    const tip = p2(R, sel ? ang(sel) : 180, 104);
    parts.push(sel ? thick(R, tip, 11, P.dark) : ghost(R, tip, 10));
    parts.push(rollerEnd(tip, 22, !!sel));
    parts.push(hub(R, 10), ...disk.holes);
  }
  const h = LC_HINTS[which];
  parts.push(note(12, 24, `${n} — ${h.last}`));
  parts.push(note(12, 228, `1 — ${h.first}`));
  return pickerRoot(320, 240, `${adj.label}: диск з отворами, позиції 1…${n}`, parts.join(''));
}

// ======================================================================
// 7. Розгинання ніг (eq-10, leg-extension): спинка вперед-назад, верхній шарнір — нахил усього важеля,
// нижній шарнір — валик (за позначками автора на фото rozhynannya-nih.png).
// ======================================================================
const LE_HINTS = {
  roller: { first: 'ближче до коліна', last: 'ближче до стопи' },
  tilt: { first: 'менший нахил', last: 'більший нахил' },
  backrest: { first: 'ближче до валика (коротші ноги)', last: 'далі (довші ноги)' },
};

const legExtension = artModule({
  id: 'leg-extension',
  label: 'Схема тренажера «Розгинання ніг»: спинка, нахил важеля і валик',
  ADJUSTMENTS: ['roller', 'tilt', 'backrest'],
  HINTS: LE_HINTS,
  view: [-36, 24],
  build(S) {
    baseFrame(S, -50, 66, 22, [-46, 62]);
    stackTower(S, [-44, 0, -76], [-8, 156, -40], 'x+');
    beam(S, [-26, 3, -42], [-26, 3, -20], 6, 5, P.frame);
    // сидіння
    beam(S, [10, 3, 0], [10, 42, 0], 9, 9, P.frame);
    pad(S, [-14, 47, 0], [34, 47, 0], [0, 1, 0], 21);
    // спинка на повзуні: труба під сидінням, повзун з жовтою ручкою-фіксатором, стійка спинки
    const pelvis = [-6, 62, 0];
    const neck = [-15, 111, 0];
    const spine = unit(sub(neck, pelvis));
    const front = unit(cross(spine, [0, 0, 1]));
    const bA = add(add(pelvis, mul(front, -15)), mul(spine, -4));
    const bB = add(add(neck, mul(front, -15)), mul(spine, 6));
    pad(S, bA, bB, front, 20, 4.5);
    beam(S, [-46, 30, 0], [6, 30, 0], 6, 6, P.frame);
    aabb(S, [-36, 26, -7], [-22, 36, 7], P.frame, { soft: 1 });
    beam(S, [-29, 34, 0], add(bA, mul(front, -6)), 6, 6, P.frame);
    beam(S, add(bA, mul(front, -6)), add(bB, add(mul(front, -6), mul(spine, -10))), 5, 5, P.frame);
    if (!S.mini) {
      tube(S, [-29, 31, 7], [-25, 31, 17], 3.4, P.yellow);
      for (const z of [-28, 28]) {
        beam(S, [12, 40, z * 0.8], [12, 52, z], 4, 4, P.frame);
        tube(S, [-6, 55, z], [24, 54, z], 4.5, P.dark);
      }
    }
    // важіль на боці +Z (за фото Impulse): верхній диск з отворами біля коліна («Нахил»),
    // нижче на важелі — світле кільце з отворами («Валік»), на кінці — валик перед гомілками
    const cam = [39, 59, 27];
    const low = [52, 30, 27];
    const roll = [56, 21, 27];
    beam(S, [24, 42, 21], add(cam, [0, 0, -4]), 6, 6, P.frame);
    const tiltFace = holeDisk(S, cam, 11, [-150, -125, -100, -75, -50], { pin: 2, t: 7 });
    // важіль — за дисками (диски на зовнішньому боці, як на фото)
    beam(S, add(cam, [0, 0, -6]), add(low, [0, 0, -6]), 7, 6, P.orange);
    beam(S, add(low, [0, 0, -6]), add(roll, [0, 0, -6]), 5, 5, P.orange);
    cyl(S, add(low, [0, 0, -6]), add(low, [0, 0, 2]), 2, P.metal);
    const rollFace = holeDisk(S, add(low, [0, 0, 3]), 6.5, [150, 185, 220, 255, 290], { pin: 1, metal: true, t: 2.5 });
    cyl(S, [roll[0], roll[1], -20], [roll[0], roll[1], 24], 7, P.pad, { cap: shade(P.pad, 0.2) });
    mark(S, 'tilt', tiltFace);
    mark(S, 'roller', rollFace);
    mark(S, 'backrest', add(mid(bA, bB), add(mul(front, -5), [0, 0, 20])));
    person(S, {
      pelvis, neck, face: [1, -0.1, 0],
      leg: { ankle: [44, 17, 10], toe: [50, 7, 11], knee: [1, 0.3, 0] },
      arm: { hand: [8, 56, 28], elbow: [-0.5, -0.3, 1] },
    });
  },
  PICKERS: {
    roller: (v, adj) => extPicker('roller', v, adj),
    tilt: (v, adj) => extPicker('tilt', v, adj),
    backrest: (v, adj) => extPicker('backrest', v, adj),
  },
});

/** Стрілка ↔ по горизонталі від x0 до x1 (з підказкою title). */
function arrowLR(x0, x1, y, color = C.accent) {
  const head = (x, d) => el('path', { d: `M${x} ${y}l${d * 11} -7v14z`, fill: color, stroke: '#ffffff', 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
  return el('g', { class: 'pick-arrow' }, `<title>↔ вперед-назад</title>`
    + thick([x0 + 8, y], [x1 - 8, y], 7, '#ffffff') + thick([x0 + 8, y], [x1 - 8, y], 4, color) + head(x0, 1) + head(x1, -1));
}

/**
 * Розгинання ніг (W3). «Нахил» — чорний диск біля коліна, важіль з валиком через вибраний отвір;
 * «Валік» — світле кільце нижче на важелі, валик на плечі навпроти вибраного отвору;
 * «Спинка» — збоку: сидіння, під ним труба з поділками 1…N, спинка на вибраній поділці з жовтим фіксатором, ↔.
 */
function extPicker(which, value, adj) {
  const n = adj.count;
  const sel = picked(adj, value);
  const f = (k) => (k - 1) / Math.max(n - 1, 1);
  const h = LE_HINTS[which];
  const parts = [];
  if (which === 'tilt') {
    const D = [220, 112];
    parts.push(thick([350, 100], D, 22, '#c3ccd6')); // стегно на сидінні — до осі біля коліна
    const ang = (k) => -80 - f(k) * 90; // 1 — майже прямовисно, N — далі вперед
    const disk = pickDisk(D, 88, 70, n, sel, ang);
    parts.push(...disk.parts);
    const tip = p2(D, sel ? ang(sel) : -80, 124);
    parts.push(sel ? thick(D, tip, 14, P.orange) : ghost(D, tip, 12));
    parts.push(rollerEnd(tip, 18, !!sel));
    parts.push(hub(D, 12), ...disk.holes);
    parts.push(note(12, 22, `1 — ${h.first}`), note(12, 40, `${n} — ${h.last}`));
    return pickerRoot(340, 258, `${adj.label}: диск з отворами, позиції 1…${n}`, parts.join(''));
  }
  if (which === 'roller') {
    const R = [186, 124];
    parts.push(thick([350, 4], R, 18, P.orange)); // важіль від верхнього диска біля коліна
    const ang = (k) => 160 + f(k) * 100; // 1 — вище, ближче до коліна; N — нижче, ближче до стопи
    const disk = pickDisk(R, 80, 58, n, sel, ang, { metal: true });
    parts.push(...disk.parts);
    const tip = p2(R, sel ? ang(sel) : 210, 108);
    parts.push(sel ? thick(R, tip, 11, P.dark) : ghost(R, tip, 10));
    parts.push(rollerEnd(tip, 22, !!sel));
    parts.push(hub(R, 10), ...disk.holes);
    parts.push(note(12, 22, `1 — ${h.first}`), note(12, 40, `${n} — ${h.last}`));
    return pickerRoot(340, 258, `${adj.label}: диск з отворами, позиції 1…${n}`, parts.join(''));
  }
  // спинка: валик ліворуч, сидіння, під ним труба з поділками; спинка їздить по трубі
  const knee = [70, 122];
  const foot = p2(knee, -98, 92);
  parts.push(thick([30, 240], [346, 240], 8, P.frame)); // рама на підлозі
  parts.push(thick([150, 132], [150, 238], 10, P.frame)); // стійка сидіння
  parts.push(thick(knee, foot, 10, P.orange), rollerEnd(foot, 17));
  parts.push(el('circle', { cx: knee[0], cy: knee[1], r: 11, fill: P.dark, stroke: '#6f7c82', 'stroke-width': 2 }));
  parts.push(thick([84, 122], [184, 122], 18, P.pad)); // сидіння
  const tubeY = 156;
  const tx = (k) => r1(198 + f(k) * 112);
  parts.push(thick([140, tubeY], [334, tubeY], 9, '#9aa4a8'));
  for (let k = 1; k <= n; k++) parts.push(thick([tx(k), tubeY - 10], [tx(k), tubeY + 10], 2.5, '#4b5558'));
  const x = tx(sel || Math.ceil(n / 2));
  parts.push(thick([x, tubeY], [x + 8, 130], 8, sel ? P.frame : '#c8d0cd'));
  parts.push(thick([x + 4, 132], [x + 24, 52], 18, sel ? P.pad : '#dfe5e2'));
  parts.push(el('rect', { x: x - 12, y: tubeY - 9, width: 24, height: 18, rx: 4, fill: sel ? P.dark : '#c8d0cd' }));
  if (sel) parts.push(el('circle', { cx: x, cy: tubeY + 16, r: 7, fill: P.yellow, stroke: '#7a5c00', 'stroke-width': 2 }));
  parts.push(arrowLR(x - 24, x + 46, 96));
  for (let k = 1; k <= n; k++) parts.push(pickDot(k, [tx(k), 208], sel === k, n > 6 ? 10 : 12));
  parts.push(note(12, 22, `1 — ${h.first}`), note(12, 40, `${n} — ${h.last}`));
  return pickerRoot(360, 252, `${adj.label}: поділки на трубі під сидінням, позиції 1…${n}`, parts.join(''));
}

export const SCHEMES = [
  legPress, seatedLegPress, hipAdduction, legCurl, hackSquat, hipAbduction, legExtension,
];
