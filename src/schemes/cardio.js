// Кардіо (eq-cardio, schemeId "cardio"): бігова доріжка (eq-cardio-a), велотренажер (eq-cardio-b),
// еліпс (eq-cardio-c) — кожна вправа свій малюнок у ракурсі ¾, регулювань немає (spec Q8).
// Модуль нового контракту { id: 'cardio', art({exerciseId, mini}), MARKERS }; цеглинки 3D — з legs.js.
// Невідома вправа (тренер додав свою) — малюється доріжка.

import {
  artModule, P, aabb, beam, box, cyl, tube, flat, person, vec,
} from './legs.js';

const { unit, add, mul } = vec;
const KINDS = { 'eq-cardio-a': 'treadmill', 'eq-cardio-b': 'bike', 'eq-cardio-c': 'elliptical' };
const kindOf = (exerciseId) => KINDS[exerciseId] || 'treadmill';
const LABELS = {
  treadmill: 'Схема: бігова доріжка',
  bike: 'Схема: велотренажер',
  elliptical: 'Схема: еліпс',
};

/** Бігова доріжка: дека зі стрічкою, капот мотора, стійки з поручнями й пультом; людина йде. */
function treadmill(S) {
  aabb(S, [-74, 4, -34], [64, 18, 34], P.dark, { soft: 2 });
  aabb(S, [-68, 18, -25], [58, 19.5, 25], '#1d2123', { edge: false });
  aabb(S, [56, 4, -36], [84, 26, 36], P.frame, { soft: 3 });
  for (const s of [-1, 1]) {
    beam(S, [74, 22, 34 * s], [62, 112, 34 * s], 6, 7, P.frame);
    tube(S, [62, 104, 34 * s], [18, 100, 32 * s], 4.5, P.metal);
  }
  box(S, [60, 116, 0], unit([1, 0.7, 0]).map((v) => v * 9), mul(unit([-0.7, 1, 0]), 5), [0, 0, 36], P.dark, { soft: 2 });
  if (!S.mini) flat(S, [[56, 121, -18], [56, 121, 18], [63, 126, 18], [63, 126, -18]], '#4a6f8c', { dz: 1 });
  person(S, {
    pelvis: [0, 103, 0], neck: [6, 155, 0], face: [1, -0.05, 0],
    leg: { ankle: [24, 29, 10], toe: [36, 25, 10], knee: [1, 0.2, 0] },
    legL: { ankle: [-26, 33, -10], toe: [-18, 23, -10], knee: [1, 0, 0] },
    arm: { hand: [30, 101, 30], elbow: [-0.6, -0.6, 0.6] },
  });
}

/** Велотренажер: рама, маховик спереду, сідло, кермо з пультом; людина крутить педалі. */
function bike(S) {
  for (const x of [-46, 44]) beam(S, [x, 3, -26], [x, 3, 26], 7, 6, P.frame);
  beam(S, [-46, 6, 0], [44, 6, 0], 7, 6, P.frame);
  beam(S, [-30, 6, 0], [-26, 82, 0], 7, 7, P.frame);
  beam(S, [36, 6, 0], [30, 100, 0], 7, 7, P.frame);
  beam(S, [-28, 40, 0], [32, 46, 0], 6, 6, P.frame);
  cyl(S, [34, 38, -8], [34, 38, 8], 25, P.dark, { rings: S.mini ? [] : [0.55], hub: 4, dz: -20 });
  box(S, [-27, 86, 0], [13, 0, 0], [0, 3, 0], [0, 0, 9], P.pad, { soft: 3 });
  tube(S, [30, 101, -22], [30, 101, 22], 4.6, P.dark);
  for (const s of [-1, 1]) tube(S, [30, 101, 20 * s], [42, 106, 20 * s], 4.4, P.dark);
  box(S, [35, 112, 0], [5, 0, 0], [0, 5, 0], [0, 0, 11], P.dark, { soft: 2 });
  // шатуни й педалі
  const crank = [4, 34, 0];
  const pr = [crank[0] + 13, crank[1] - 9, 12];
  const pl = [crank[0] - 13, crank[1] + 9, -12];
  cyl(S, [crank[0], crank[1], -9], [crank[0], crank[1], 9], 3.5, P.metal);
  for (const p of [pr, pl]) {
    beam(S, [crank[0], crank[1], p[2] * 0.7], [p[0], p[1], p[2] * 0.7], 3.5, 3.5, P.metal);
    if (!S.mini) aabb(S, [p[0] - 7, p[1] - 1.5, p[2] - 5], [p[0] + 7, p[1] + 1.5, p[2] + 5], P.dark);
  }
  person(S, {
    pelvis: [-26, 97, 0], neck: [8, 140, 0], face: [1, -0.3, 0],
    leg: { ankle: [pr[0] - 3, pr[1] + 8, 11], toe: [pr[0] + 9, pr[1] + 3, 11], knee: [1, 0.3, 0.1] },
    legL: { ankle: [pl[0] - 3, pl[1] + 8, -11], toe: [pl[0] + 9, pl[1] + 3, -11], knee: [1, 0.3, -0.1] },
    arm: { hand: [36, 104, 20], elbow: [-0.2, -1, 0.5] },
  });
}

/** Еліпс: довга основа, маховик позаду, педалі на рейках, рухомі ручки біля стійки. */
function elliptical(S) {
  beam(S, [-80, 4, 0], [62, 4, 0], 10, 7, P.frame);
  for (const x of [-78, 58]) beam(S, [x, 3, -24], [x, 3, 24], 7, 6, P.frame);
  aabb(S, [-86, 4, -12], [-58, 46, 12], P.dark, { soft: 4 });
  beam(S, [56, 6, 0], [50, 118, 0], 8, 8, P.frame);
  box(S, [50, 124, 0], [6, 0, 0], [0, 5, 0], [0, 0, 13], P.dark, { soft: 2 });
  const feet = { r: [-4, 30, 13], l: [-30, 22, -13] };
  for (const [p, s] of [[feet.r, 1], [feet.l, -1]]) {
    beam(S, [-62, 26, 10 * s], [44, 50, 13 * s], 5, 5, P.metal);
    aabb(S, [p[0] - 13, p[1] - 4, p[2] - 6], [p[0] + 13, p[1] - 1, p[2] + 6], P.dark, { soft: 1 });
  }
  const hands = { r: [32, 126, 24], l: [42, 120, -24] };
  for (const [h, s] of [[hands.r, 1], [hands.l, -1]]) {
    tube(S, [50, 82, 10 * s], add(h, [2, 18, 0]), 5, P.orange);
    tube(S, [50, 82, 10 * s], [47, 52, 13 * s], 5, P.orange);
  }
  person(S, {
    pelvis: [-12, 104, 0], neck: [-4, 157, 0], face: [1, -0.1, 0],
    leg: { ankle: [feet.r[0] - 4, feet.r[1] + 7, 12], toe: [feet.r[0] + 11, feet.r[1] + 1, 12], knee: [1, 0.2, 0] },
    legL: { ankle: [feet.l[0] - 4, feet.l[1] + 7, -12], toe: [feet.l[0] + 11, feet.l[1] + 1, -12], knee: [1, 0.2, 0] },
    arm: { hand: hands.r, elbow: [-0.3, -1, 0.4] },
    armL: { hand: hands.l, elbow: [-0.3, -1, -0.4] },
  });
}

const DRAW = { treadmill, bike, elliptical };

export const SCHEMES = [artModule({
  id: 'cardio',
  label: (exerciseId) => LABELS[kindOf(exerciseId)],
  view: [-40, 24],
  build(S, exerciseId) { DRAW[kindOf(exerciseId)](S); },
})];
