// Малюнки ручок для блокових тяг (за фото стійки gym/my-photos/ruchky-stiyka.png).
// Усі в одній системі координат 0 0 120 80, карабін зверху по центру. №6 (манжета) не малюємо.

import { C, el } from './svg.js';

const metal = (d, w = 6) => el('path', {
  d, fill: 'none', stroke: C.metalEdge, 'stroke-width': w + 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
}) + el('path', {
  d, fill: 'none', stroke: C.metal, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
});
const grip = (d, w = 10) => el('path', {
  d, fill: 'none', stroke: C.rubber, 'stroke-width': w, 'stroke-linecap': 'round',
});
// Карабін-кільце, на яке чіпляється ручка.
const clip = (cx = 60, cy = 11) => el('ellipse', {
  cx, cy, rx: 5.5, ry: 7, fill: 'none', stroke: C.metalEdge, 'stroke-width': 3,
});

const ART = {
  // V-подібна: «трикутник», дві близькі нахилені ручки.
  'v-bar': () => clip() + metal('M60 18 L60 26') + metal('M60 26 L34 70 M60 26 L86 70', 6)
    + grip('M45 52 L35 69 M75 52 L85 69', 11)
    + el('circle', { cx: 60, cy: 27, r: 5, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 }),

  // Канат: два кінці з потовщеннями, червоно-чорний.
  rope: () => clip() + metal('M60 18 L60 25', 7)
    + el('path', { d: 'M60 26 C 58 44, 44 52, 40 68 M60 26 C 62 44, 76 52, 80 68', fill: 'none', stroke: '#1c1f1e', 'stroke-width': 9, 'stroke-linecap': 'round' })
    + el('path', { d: 'M60 26 C 58 44, 44 52, 40 68 M60 26 C 62 44, 76 52, 80 68', fill: 'none', stroke: '#d2352b', 'stroke-width': 9, 'stroke-dasharray': '3 4' })
    + el('circle', { cx: 39, cy: 71, r: 6.5, fill: '#1c1f1e' })
    + el('circle', { cx: 81, cy: 71, r: 6.5, fill: '#1c1f1e' }),

  // Одинарна D-ручка (на одну руку).
  'd-handle': () => clip() + metal('M60 18 L60 22')
    + metal('M60 22 L40 58 Q38 62 43 62 L77 62 Q82 62 80 58 Z', 5)
    + grip('M46 62 L74 62', 12),

  // Коротка пряма.
  'short-bar': () => clip(60, 15) + metal('M60 22 L60 40', 5) + metal('M24 44 L96 44', 6)
    + grip('M27 44 L49 44 M71 44 L93 44', 11),

  // Довга пряма (широка, кінці трохи вниз).
  'long-bar': () => clip(60, 15) + metal('M60 22 L60 38', 5) + metal('M5 52 L16 42 L104 42 L115 52', 6)
    + grip('M6 51 L15 43 M105 43 L114 51', 11),
};

/** Внутрішність малюнка ручки (без <svg>), координати 0 0 120 80. '' для невідомої. */
export function handleArt(handleId) {
  const f = ART[handleId];
  return f ? f() : '';
}

/** Малюнок ручки як окремий SVG-рядок (або '' для невідомої). */
export function handleIcon(handleId, { width = 120, height = 80, x = null, y = null } = {}) {
  const art = handleArt(handleId);
  if (!art) return '';
  const pos = x === null ? '' : ` x="${x}" y="${y}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"${pos} width="${width}" height="${height}"`
    + ` class="handle-icon" data-handle="${handleId}" aria-hidden="true">${art}</svg>`;
}
