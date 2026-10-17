// Спільні цеглинки SVG-схем. Чистий модуль: повертає рядки SVG.
// Кольори задано атрибутами (працює й без CSS); css/schemes.css лише додає стани.

import { isSet, positionHint } from './values.js';

export const APPROX_TEXT = '⚠ приблизно — уточнити в залі';

// Палітра схем (світла «карточка» навіть у темній темі — схема як креслення).
export const C = {
  frame: '#3b4542',      // графітова рама
  frameEdge: '#232a28',
  panel: '#c3cbc7',      // сіра панель стійки з вагою
  panelEdge: '#8d9894',
  pad: '#3f5d53',        // зелено-сірі подушки SHUA
  padEdge: '#2a3f38',
  metal: '#d3dadd',
  metalEdge: '#6f7c82',
  rubber: '#2b3230',
  floor: '#c9d1cd',
  ink: '#1d2624',
  muted: '#5d6a66',
  accent: '#1864ab',     // регулювання: кільця, бейджі, вибрана позиція
  accentSoft: 'rgba(24, 100, 171, 0.12)',
  warnBg: '#fff1c7',
  warnText: '#7a5300',
};

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Екранування тексту й атрибутів. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ESC[ch]);

/** Атрибути з об'єкта (null/undefined/false пропускаються). */
export const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== null && v !== undefined && v !== false)
  .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');

export const el = (tag, a = {}, inner = null) => (inner === null
  ? `<${tag}${attrs(a)}/>`
  : `<${tag}${attrs(a)}>${inner}</${tag}>`);

export const text = (x, y, s, a = {}) => el('text', { x, y, ...a }, esc(s));

/** Корінь схеми. */
export function svgRoot(width, height, label, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="scheme-svg"`
    + ` role="img" aria-label="${esc(label)}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">`
    + `${el('rect', { x: 0, y: 0, width, height, rx: 16, fill: '#f8faf9' })}${inner}</svg>`;
}

/** Активне регулювання з переданих (без видалених). */
export const pickAdj = (adjustments, id) => (adjustments || []).find((a) => a.id === id && !a.deleted) || null;

/** Значення позиції як число або null. */
export function posValue(adj, values) {
  if (!adj) return null;
  const v = values ? values[adj.id] : null;
  return isSet(adj, v) ? Number(v) : null;
}

/** Вибраний варіант або null. */
export function optValue(adj, values) {
  if (!adj) return null;
  const v = values ? values[adj.id] : null;
  return isSet(adj, v) ? (adj.options || []).find((o) => o.id === v) : null;
}

/** Обгортка клікабельної зони регулювання. */
export function zone(adjId, label, inner, extra = {}) {
  return el('g', {
    'data-adj': adjId, class: `sc-zone ${extra.class || ''}`.trim(),
    role: 'button', tabindex: 0, 'aria-label': label,
  }, inner);
}

/** Пунктирне кільце підсвічення регулювання. */
export function ring(x, y, w, h, rx = 12) {
  return el('rect', {
    x, y, width: w, height: h, rx, class: 'sc-ring',
    fill: C.accentSoft, stroke: C.accent, 'stroke-width': 2.5, 'stroke-dasharray': '6 4',
  });
}

/**
 * Великий бейдж зі значенням клієнта.
 * value — рядок для показу ('3', 'Канат') або null → «не вибрано».
 * raw — значення для data-value (номер чи id варіанта).
 */
export function badge(adj, { x, y, w = 100, h = 64, value, raw, swatch = null, icon = null, valueSize = 34 }) {
  const set = value !== null && value !== undefined;
  const warn = adj.approx || adj.unknown;
  const parts = [];
  parts.push(el('rect', {
    x, y, width: w, height: h, rx: 14, class: 'sc-badge-bg',
    fill: set ? C.accent : '#ffffff', stroke: C.accent, 'stroke-width': 2.5,
    'stroke-dasharray': set ? null : '6 4',
  }));
  parts.push(text(x + 10, y + 18, adj.label, {
    'font-size': 12.5, 'font-weight': 600, fill: set ? '#dbe8f5' : C.accent,
  }));
  // ⚠ — у правому нижньому куті, поруч зі значенням (кількість позицій приблизна)
  if (warn && set) {
    parts.push(el('circle', { cx: x + w - 15, cy: y + h - 18, r: 10, fill: C.warnBg, stroke: '#e9c46a' }));
    parts.push(text(x + w - 15, y + h - 13.5, '!', { 'font-size': 14, 'font-weight': 800, 'text-anchor': 'middle', fill: C.warnText }));
    parts.push(el('title', {}, APPROX_TEXT));
  }
  let vx = x + 10;
  if (swatch && set) {
    parts.push(el('circle', { cx: x + 20, cy: y + h - 21, r: 9, fill: swatch, stroke: '#ffffff', 'stroke-width': 2 }));
    vx = x + 36;
  }
  if (icon && set) parts.push(icon);
  // Довгу назву (тренер перейменував) зменшуємо, щоб влізла в бейдж.
  const room = x + w - (warn && set ? 30 : 8) - vx;
  const shown = set ? String(value) : 'не вибрано';
  const fit = Math.max(11, Math.min(set ? valueSize : 15, room / (shown.length * 0.62)));
  parts.push(text(vx, y + h - 11, set ? value : 'не вибрано', {
    'font-size': Math.round(fit * 10) / 10, 'font-weight': 800,
    fill: set ? '#ffffff' : C.accent, class: 'sc-badge-value',
  }));
  return el('g', {
    'data-badge': adj.id, 'data-value': set ? raw : '', class: 'sc-badge',
  }, parts.join(''));
}

/** Плашка «⚠ приблизно — уточнити в залі». */
export function warnBar(x, y, w, s = APPROX_TEXT) {
  return el('g', { class: 'sc-warn' },
    el('rect', { x, y, width: w, height: 24, rx: 8, fill: C.warnBg, stroke: '#e9c46a', 'stroke-width': 1 })
    + text(x + 10, y + 16.5, s, { 'font-size': 12.5, 'font-weight': 600, fill: C.warnText }));
}

/**
 * Вертикальна лінійка позицій 1…count (1 — внизу).
 * yOf(n) — висота позиції n; кожна позначка має data-pos="<adj>:<n>".
 */
export function ruler(adj, { x, yOf, selected, hints, words = true }) {
  const n = adj.count;
  const parts = [];
  parts.push(el('line', { x1: x, y1: yOf(n), x2: x, y2: yOf(1), stroke: C.muted, 'stroke-width': 2, 'stroke-linecap': 'round' }));
  for (let k = 1; k <= n; k++) {
    const y = yOf(k);
    const on = selected === k;
    const hint = positionHint(adj, k, hints);
    const word = hint.includes(' — ') ? hint.split(' — ')[1] : '';
    parts.push(el('g', { 'data-pos': `${adj.id}:${k}`, class: on ? 'sc-tick is-on' : 'sc-tick' },
      el('title', {}, esc(hint))
      + el('line', { x1: x - 6, y1: y, x2: x + 6, y2: y, stroke: on ? C.accent : C.muted, 'stroke-width': on ? 3 : 2 })
      + (on ? el('circle', { cx: x + 17, cy: y, r: 9.5, fill: C.accent }) : '')
      + text(x + 17, y + 4.5, k, {
        'font-size': on ? 13 : 12, 'font-weight': on ? 800 : 600, 'text-anchor': 'middle',
        fill: on ? '#ffffff' : C.ink,
      })
      + (words && word ? text(x + 31, y + 4.5, word, { 'font-size': 11.5, fill: C.muted }) : '')));
  }
  return el('g', { class: 'sc-ruler' }, parts.join(''));
}

/** Пунктирна напрямна (від позначки до деталі). */
export const guide = (x1, y1, x2, y2) => el('line', {
  x1, y1, x2, y2, stroke: C.accent, 'stroke-width': 1.5, 'stroke-dasharray': '3 3', class: 'sc-guide',
});

/** Рядок легенди внизу схеми: «Сидіння: 1 — найнижче … 5 — найвище». */
export function legendLine(adj, hints, x, y) {
  const h = hints[adj.id];
  const s = h
    ? `${adj.label}: 1 — ${h.first} … ${adj.count} — ${h.last}`
    : `${adj.label}: позиції 1…${adj.count}`;
  return text(x, y, s, { 'font-size': 12.5, fill: C.ink });
}

/** Текст, що переноситься на кілька рядків за орієнтовною шириною. → {svg, lines} */
export function wrapText(x, y, s, { width, size = 12.5, lineHeight = 16, ...a }) {
  const max = Math.max(8, Math.floor(width / (size * 0.56)));
  const lines = [];
  let cur = '';
  for (const w of String(s).split(' ')) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return {
    svg: lines.map((l, i) => text(x, y + i * lineHeight, l, { 'font-size': size, ...a })).join(''),
    lines: lines.length,
  };
}

// --- мітки регулювань для модулів нового контракту (art + MARKERS) ------------------------

/** Ширина viewBox SVG-рядка (для масштабу міток) або 360. */
export function viewBoxWidth(svg) {
  const m = /viewBox\s*=\s*"\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+[\d.]+\s*"/.exec(String(svg || ''));
  const w = m ? Number(m[1]) : NaN;
  return Number.isFinite(w) && w > 0 ? w : 360;
}

/**
 * Додає до малюнка art шар міток (перед останнім </svg>).
 * items: [{ id, x, y, color, set, value, label }] — координати у viewBox малюнка.
 * Мітка — маленька кольорова крапка без цифр: вибрано → заповнена з ореолом (is-set),
 * не вибрано → біла з кольоровим обідком (is-empty). Кожна — кнопка data-adj.
 */
export function withMarkers(artSvg, items) {
  const svg = String(artSvg || '');
  const end = svg.lastIndexOf('</svg>');
  if (end < 0 || !items.length) return svg;
  const r = Math.round((viewBoxWidth(svg) / 40) * 10) / 10;
  const layer = items.map((m) => el('g', {
    'data-marker': m.id, 'data-adj': m.id, 'data-value': m.set ? m.value : '',
    class: `sc-zone sc-marker ${m.set ? 'is-set' : 'is-empty'}`,
    style: `--mk:${m.color}`,
    role: 'button', tabindex: 0, 'aria-label': m.label,
  }, el('title', {}, esc(m.label))
    + el('circle', { class: 'sc-marker-hit', cx: m.x, cy: m.y, r: Math.round(r * 2.6), fill: 'transparent' })
    + (m.set ? el('circle', { class: 'sc-marker-halo', cx: m.x, cy: m.y, r: Math.round(r * 1.8), fill: m.color, 'fill-opacity': 0.28 }) : '')
    + el('circle', {
      class: 'sc-marker-dot', cx: m.x, cy: m.y, r,
      fill: m.set ? m.color : '#ffffff', stroke: m.set ? '#ffffff' : m.color,
      'stroke-width': Math.round((r / 3) * 10) / 10,
    }))).join('');
  return `${svg.slice(0, end)}<g class="sc-markers">${layer}</g>${svg.slice(end)}`;
}
