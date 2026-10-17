// Графік у часі: власний SVG без бібліотек. renderChart(container, chartSeriesResult).
// Масштабується через viewBox (під час render контейнер ще не в DOM).

import { h, mount } from './dom.js';
import { formatDate, formatNumber } from '../core/model.js';

const W = 360;
const H = 230;
const PAD = { top: 18, bottom: 30, left: 40, right: 12 };

export const EMPTY_TEXT = 'Ще немає записів — запишіть перший підхід';

/** «Гарні» позначки осі: [lo..hi] → масив значень. */
export function niceTicks(lo, hi, count = 4) {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

/** Межі осі Y з невеликим запасом; не від'ємні. */
function yDomain(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(1, Math.abs(max) * 0.2);
    return [Math.max(0, min - pad), max + pad];
  }
  const pad = (max - min) * 0.15;
  return [Math.max(0, min - pad), max + pad];
}

const shortDate = (t) => formatDate(new Date(t).toISOString().slice(0, 10)).slice(0, 5);
const fullDate = (t) => formatDate(new Date(t).toISOString().slice(0, 10));

function pointTitle(s, p) {
  const value = `${formatNumber(p.y)} ${s.unit}`;
  return `${fullDate(p.t)} · ${s.label.split(',')[0]}: ${value}${p.label ? ` ${p.label}` : ''}`;
}

export function renderChart(container, result) {
  const series = (result && result.series ? result.series : []).filter((s) => s.points.length);
  if (!series.length) {
    return mount(container, h('div', { class: 'chart chart-empty' }, h('p', null, EMPTY_TEXT)));
  }

  // Осі за одиницями: перша одиниця — ліворуч, друга (кардіо) — праворуч.
  const units = [...new Set(series.map((s) => s.unit))].slice(0, 2);
  const dual = units.length === 2;
  const pad = { ...PAD, right: dual ? 40 : PAD.right };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const allT = series.flatMap((s) => s.points.map((p) => p.t));
  const tMin = Math.min(...allT);
  const tMax = Math.max(...allT);
  const hasSpan = tMax > tMin;
  // Одна дата — точки по центру; інакше невеликі поля, щоб точки не липли до осей.
  const margin = 18;
  const x = (p) => {
    const base = hasSpan ? margin + ((p.t - tMin) / (tMax - tMin)) * (plotW - 2 * margin) : plotW / 2;
    return pad.left + base + Math.min(p.n - 1, 4) * 4; // підходи одного дня — трохи правіше
  };

  const axes = units.map((unit) => {
    const vals = series.filter((s) => s.unit === unit).flatMap((s) => s.points.map((p) => p.y));
    const [lo, hi] = yDomain(vals);
    return { unit, lo, hi, ticks: niceTicks(lo, hi) };
  });
  const axisOf = (s) => {
    const i = units.indexOf(s.unit);
    return axes[i < 0 ? 0 : i];
  };
  const y = (axis, v) => pad.top + plotH - ((v - axis.lo) / (axis.hi - axis.lo)) * plotH;

  const kids = [];

  // Горизонтальні лінії та підписи лівої (і правої) осі.
  axes.forEach((axis, i) => {
    const right = i === 1;
    const color = dual ? series.find((s) => s.unit === axis.unit).color : null;
    axis.ticks.forEach((v) => {
      const yy = y(axis, v);
      if (i === 0) kids.push(h('line', { class: 'chart-grid', x1: pad.left, x2: W - pad.right, y1: yy, y2: yy }));
      kids.push(h('text', {
        class: 'chart-tick', x: right ? W - pad.right + 4 : pad.left - 5, y: yy + 3.5,
        'text-anchor': right ? 'start' : 'end', fill: color,
      }, formatNumber(v)));
    });
    kids.push(h('text', {
      class: 'chart-unit', x: right ? W - pad.right : pad.left, y: 10,
      'text-anchor': right ? 'end' : 'start', fill: color,
    }, axis.unit));
  });

  // Підписи дат: до 4 різних днів, рівномірно.
  const days = [...new Set(allT)].sort((a, b) => a - b);
  const wanted = days.length <= 4
    ? days
    : [0, 1, 2, 3].map((i) => days[Math.round((i * (days.length - 1)) / 3)]);
  [...new Set(wanted)].forEach((t) => {
    const xx = x({ t, n: 1 });
    kids.push(h('line', { class: 'chart-axis', x1: xx, x2: xx, y1: H - pad.bottom, y2: H - pad.bottom + 4 }));
    kids.push(h('text', { class: 'chart-tick', x: xx, y: H - pad.bottom + 16, 'text-anchor': 'middle' }, shortDate(t)));
  });
  kids.push(h('line', { class: 'chart-axis', x1: pad.left, x2: W - pad.right, y1: H - pad.bottom, y2: H - pad.bottom }));

  // Лінії (лише коли в серії більше однієї точки), потім точки й підписи.
  series.forEach((s) => {
    if (s.points.length < 2) return;
    const axis = axisOf(s);
    const pts = s.points.map((p) => `${x(p).toFixed(1)},${y(axis, p.y).toFixed(1)}`).join(' ');
    kids.push(h('polyline', { class: 'chart-line', points: pts, stroke: s.color }));
  });
  series.forEach((s, si) => {
    const axis = axisOf(s);
    const labelled = si === series.findIndex((o) => o.unit === s.unit) && s.points.length <= 16;
    s.points.forEach((p) => {
      const cx = x(p);
      const cy = y(axis, p.y);
      kids.push(h('circle', { class: 'chart-dot', cx: cx.toFixed(1), cy: cy.toFixed(1), r: 4.5, fill: s.color },
        h('title', null, pointTitle(s, p))));
      if (labelled && p.label) {
        kids.push(h('text', { class: 'chart-label', x: cx.toFixed(1), y: (cy - 8).toFixed(1), 'text-anchor': 'middle' }, p.label));
      }
    });
  });

  const svg = h('svg', {
    class: 'chart-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', preserveAspectRatio: 'xMidYMid meet',
    'aria-label': `Графік: ${series.map((s) => s.label).join(', ')}`,
  }, kids);

  const legend = series.length > 1
    ? h('ul', { class: 'chart-legend' }, series.map((s) => h('li', null,
      h('span', { class: 'chart-swatch', style: { background: s.color } }), s.label)))
    : null;

  const single = allT.length === 1 && series.every((s) => s.points.length === 1);
  return mount(container, h('div', { class: 'chart' }, svg, legend,
    single ? h('p', { class: 'muted chart-hint' }, 'Один запис — лінія з\'явиться після наступного.') : null));
}
