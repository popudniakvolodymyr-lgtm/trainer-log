// Тяга нижнього (горизонтального) блоку, SHUA, eq-26 — за фото gym/my-photos/tyaga-nyzhnoho-bloku.png.
// Регулювань немає — лише «Ручка» на карабіні (5 ручок, спільні для всіх блокових тяг).

import { C, el, text, svgRoot, pickAdj, optValue, zone, ring, badge, guide } from './svg.js';
import { handleArt } from './handles.js';

export const id = 'low-row';
export const ADJUSTMENTS = ['handle'];
export const HINTS = {};

const W = 360;
const FLOOR = 300;

function machine() {
  return [
    el('line', { x1: 8, y1: FLOOR + 1, x2: W - 8, y2: FLOOR + 1, stroke: C.floor, 'stroke-width': 3 }),
    // стійка з вагою
    el('rect', { x: 14, y: 36, width: 80, height: FLOOR - 36, rx: 10, fill: C.frame, stroke: C.frameEdge, 'stroke-width': 1.5 }),
    el('rect', { x: 25, y: 54, width: 58, height: FLOOR - 92, rx: 5, fill: C.panel, stroke: C.panelEdge }),
    el('line', { x1: 54, y1: 76, x2: 54, y2: FLOOR - 70, stroke: C.frameEdge, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    el('rect', { x: 32, y: 76, width: 13, height: 22, rx: 2, fill: '#f4f6f5', opacity: 0.85 }),
    // довга основа-лава
    el('rect', { x: 88, y: FLOOR - 16, width: 258, height: 14, rx: 6, fill: C.frame, stroke: C.frameEdge }),
    el('path', { d: `M300 ${FLOOR - 16} L300 ${FLOOR - 44}`, stroke: C.frame, 'stroke-width': 10 }),
    el('rect', { x: 236, y: FLOOR - 56, width: 112, height: 15, rx: 7.5, fill: C.pad, stroke: C.padEdge, 'stroke-width': 1.5 }),
    // упор для ніг
    el('path', { d: `M132 ${FLOOR - 16} L150 ${FLOOR - 88}`, stroke: C.frame, 'stroke-width': 9, 'stroke-linecap': 'round' }),
    el('rect', { x: 138, y: FLOOR - 92, width: 14, height: 46, rx: 4, fill: C.rubber, transform: `rotate(14 145 ${FLOOR - 69})` }),
    // нижній блок і трос
    el('circle', { cx: 100, cy: FLOOR - 40, r: 8, fill: C.metal, stroke: C.metalEdge, 'stroke-width': 2 }),
    el('line', { x1: 100, y1: FLOOR - 48, x2: 196, y2: FLOOR - 112, stroke: '#7d8a86', 'stroke-width': 2.5 }),
  ].join('');
}

/** SVG тяги нижнього блоку з вибраною ручкою. */
export function draw(values = {}, adjustments = []) {
  const handle = pickAdj(adjustments, 'handle');
  const sel = optValue(handle, values);
  const parts = [machine()];
  // карабін на кінці троса
  const clip = el('ellipse', { cx: 199, cy: FLOOR - 114, rx: 4.5, ry: 6, fill: 'none', stroke: C.metalEdge, 'stroke-width': 2.5 });
  if (handle) {
    const art = sel ? handleArt(sel.id) : '';
    const small = art
      ? `<svg x="166" y="${FLOOR - 122}" width="66" height="44" viewBox="0 0 120 80" data-handle="${sel.id}">${art}</svg>`
      : text(199, FLOOR - 88, '?', { 'font-size': 20, 'font-weight': 800, 'text-anchor': 'middle', fill: C.accent });
    parts.push(zone('handle', `${handle.label}: змінити`,
      ring(160, FLOOR - 130, 78, 56) + clip + small
      + guide(199, FLOOR - 130, 199, 160)
      // велика картка вибраної ручки
      + el('rect', { x: 108, y: 10, width: 242, height: 150, rx: 16, fill: '#ffffff', stroke: C.accent, 'stroke-width': 2.5, 'stroke-dasharray': sel ? null : '6 4' })
      + text(122, 32, 'Яку ручку чіпляти на карабін', { 'font-size': 13, 'font-weight': 600, fill: C.muted })
      + (art
        ? `<svg x="168" y="34" width="122" height="66" viewBox="0 0 120 80" data-handle="${sel.id}" class="sc-big-handle">${art}</svg>`
        : text(229, 82, 'Натисніть, щоб вибрати', { 'font-size': 14, 'text-anchor': 'middle', fill: C.accent }))
      + badge(handle, {
        x: 116, y: 102, w: 226, h: 52,
        value: sel ? sel.label : null, raw: sel ? sel.id : null, valueSize: 20,
      })));
  } else {
    parts.push(clip);
    parts.push(text(228, 110, 'Регулювань немає', { 'font-size': 14, 'text-anchor': 'middle', fill: C.muted }));
  }
  return svgRoot(W, FLOOR + 12, 'Схема тяги нижнього блоку: ручка', parts.join(''));
}
