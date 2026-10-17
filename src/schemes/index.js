// Схеми тренажерів на екрані вправи.
//
// renderScheme(container, equipment, exerciseId, values, opts)
//   values: {[adjustmentId]: value} | null/undefined → прочитати зі opts.store (клієнт + вправа).
//   opts: { store, clientId, role, onPick(adjustmentId), onChange(setting), scheme? }
//     • є store і clientId — натиск на мітку чи рядок списку відкриває нижню панель вибору,
//       значення зберігається як Setting (by = role) і схема перемальовується на місці;
//       після збереження викликається onChange(setting), якщо передано.
//     • немає store — натиск лише викликає onPick(adjustmentId).
//     • scheme — модуль схеми замість schemeFor(equipment) (перегляд/перевірка нового малюнка).
//   Компонування: малюнок (art + мітки, або старий draw) → список регулювань «Сидіння — 3» з ⚠ →
//   вікно вибору (PICKERS + кнопки значень). Без schemeId (або невідома схема) — заглушка + список.
// → container (заповнюється одразу; значення зі сховища домальовуються, коли прочитаються).
//
// КОНТРАКТ МОДУЛЯ СХЕМИ (новий; таски 09/10 переводять на нього всі тренажери):
//   { id: schemeId,
//     HINTS?: {[adjustmentId]: {first, last}}       — підписи крайніх позицій у вікні вибору,
//     art({exerciseId, mini}) → '<svg viewBox="0 0 W H" …>…</svg>'
//         лише тренажер (і людина при mini=false), ракурс ¾; без тексту-значень, бейджів, шкал, рамок.
//         viewBox починається з 0 0, W ≈ 360 (мітка має радіус W/40); фон малює сам art.
//         mini=true — силует для значка в меню (~48×40 px): без людини й дрібниць, товсті лінії.
//     MARKERS: {[adjustmentId]: {x, y}} | (exerciseId) → {…}
//         центр мітки регулювання в координатах viewBox art (на деталі, яку регулюють).
//         Мітки малює renderScheme: кольорова крапка без цифр (колір = крапка рядка в списку);
//         значення вибрано → заповнена з ореолом (class is-set, data-value), ні → біла (is-empty);
//         поки відкрите вікно вибору цього регулювання — class is-active.
//     PICKERS?: {[adjustmentId]: (value, adjustment) → SVG-рядок}
//         наочність у вікні вибору (шкала 1…N, коло шарніра, зони хвату…); value — поточне
//         значення або undefined, вибране підсвічує сам PICKER. Елементи з data-pick="<значення>"
//         (номер позиції або id варіанта) стають кнопками вибору. Під наочністю завжди є кнопки значень.
//   }
//   Старий контракт { draw(values, adjustments) → SVG з data-adj, optionIcon? } працює як раніше
//   (список регулювань під малюнком додається й до нього). Є art — draw не викликається.

import { h, mount, sheet, toast } from '../ui/dom.js';
import { schemeFor } from './registry.js';
import { handleIcon } from './handles.js';
import { APPROX_TEXT, withMarkers } from './svg.js';
import { activeAdjustments, activeExercises, valuesFor, makeSetting, isSet, positionHint } from './values.js';

export { APPROX_TEXT };
export { schemeFor, SCHEMES } from './registry.js';
export { handleIcon } from './handles.js';

const safeColor = (c) => /^#[0-9a-f]{3,8}$/i.test(String(c || ''));

/** Підпис під схемою тренажера без регулювань. */
export const NO_ADJ_TEXT = 'Регулювань немає — лише вага';

/** Підпис під схемою кардіо без регулювань: ваги на кардіо немає (там час, дистанція). */
export const NO_ADJ_CARDIO_TEXT = 'Регулювань немає';

/** Підпис під схемою тренажера без регулювань: кардіо — без «лише вага». */
export function noAdjustmentsText(equipment) {
  return equipment && equipment.weightMode === 'cardio' ? NO_ADJ_CARDIO_TEXT : NO_ADJ_TEXT;
}

const MISSING_TEXT = 'Схему ще не намальовано — регулювання знімемо в залі';

/** Текст значення регулювання: номер позиції ('3') | назва варіанта | 'не вибрано'. */
export function valueLabel(adjustment, value) {
  if (!isSet(adjustment, value)) return 'не вибрано';
  if (adjustment.kind === 'options') return adjustment.options.find((o) => o.id === value).label;
  return String(value);
}

// --- чиста частина: мітки, список, значки ------------------------------------------------

// Кольори міток регулювань (і крапок у списку): за порядком регулювань, що мають мітку.
const MARKER_COLORS = ['#1971c2', '#d6336c', '#2f9e44', '#7048e8', '#0c8599', '#e67700'];

/** Колір i-ї мітки регулювання. */
export const markerColor = (i) => MARKER_COLORS[((i % MARKER_COLORS.length) + MARKER_COLORS.length) % MARKER_COLORS.length];

const isArt = (sc) => !!sc && typeof sc.art === 'function';

/** Координати міток модуля для вправи: {[adjustmentId]: {x, y}} (лише скінченні числа). */
export function schemeMarkers(sc, exerciseId) {
  if (!isArt(sc)) return {};
  let m = sc.MARKERS;
  if (typeof m === 'function') {
    try { m = m(exerciseId); } catch (err) { console.error(err); m = null; }
  }
  const out = {};
  for (const [id, p] of Object.entries(m || {})) {
    if (p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) out[id] = { x: Number(p.x), y: Number(p.y) };
  }
  return out;
}

/**
 * Рядки списку регулювань під малюнком (усі активні регулювання тренажера).
 * → [{ id, label, value: '3' | 'Канат' | 'не вибрано', set, approx, marker: колір | null, adjustment }]
 */
export function adjustmentRows(equipment, values = {}, sc = null, exerciseId = null) {
  const markers = schemeMarkers(sc, exerciseId);
  let k = 0;
  return activeAdjustments(equipment).map((a) => {
    const v = values ? values[a.id] : undefined;
    const marker = markers[a.id] ? markerColor(k++) : null;
    return {
      id: a.id, label: a.label, value: valueLabel(a, v), set: isSet(a, v),
      approx: !!(a.approx || a.unknown), marker, adjustment: a,
    };
  });
}

/** SVG схеми для вправи: art + мітки (новий контракт) або draw (старий). Чиста функція. */
export function schemeSvg(sc, equipment, exerciseId, values = {}) {
  const adjs = activeAdjustments(equipment);
  if (!isArt(sc)) return sc.draw(values || {}, adjs);
  const art = sc.art({ exerciseId, mini: false });
  const markers = schemeMarkers(sc, exerciseId);
  const items = adjustmentRows(equipment, values, sc, exerciseId)
    .filter((r) => r.marker)
    .map((r) => ({
      id: r.id, ...markers[r.id], color: r.marker, set: r.set,
      value: r.set ? String(values[r.id]) : '', label: `${r.label}: ${r.value}`,
    }));
  return withMarkers(art, items);
}

/** Наочність для вікна вибору (PICKERS) або ''. */
export function pickerArt(sc, adjustment, value) {
  const fn = sc && sc.PICKERS && sc.PICKERS[adjustment.id];
  if (typeof fn !== 'function') return '';
  try {
    return String(fn(value, adjustment) || '');
  } catch (err) {
    console.error(err);
    return '';
  }
}

const ICON_DUMBBELL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 40" data-icon="dumbbell" aria-hidden="true">'
  + '<rect x="14" y="17.5" width="20" height="5" rx="2" fill="#6f7c82"/>'
  + '<rect x="7" y="8" width="7" height="24" rx="2.5" fill="#3b4542"/>'
  + '<rect x="34" y="8" width="7" height="24" rx="2.5" fill="#3b4542"/>'
  + '<rect x="2.5" y="12.5" width="5" height="15" rx="2" fill="#3b4542"/>'
  + '<rect x="40.5" y="12.5" width="5" height="15" rx="2" fill="#3b4542"/></svg>';

const ICON_MACHINE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 40" data-icon="machine" aria-hidden="true">'
  + '<rect x="6" y="4" width="5" height="32" rx="1.5" fill="#3b4542"/>'
  + '<rect x="12.5" y="9" width="9" height="17" rx="1.5" fill="#8d9894"/>'
  + '<path d="M13 13.5h8M13 17.5h8M13 21.5h8" stroke="#c3cbc7" stroke-width="1.6"/>'
  + '<rect x="27" y="23" width="15" height="4" rx="2" fill="#3f5d53"/>'
  + '<rect x="33" y="10" width="4" height="14" rx="2" fill="#3f5d53"/>'
  + '<rect x="33.5" y="27" width="3" height="9" fill="#3b4542"/>'
  + '<rect x="3" y="35" width="42" height="2.5" rx="1.2" fill="#6f7c82"/></svg>';

/**
 * Значок тренажера для кнопки меню (Q1): група «Гантелі» — значок гантелі; модуль з art —
 * силует art({mini:true}) першої вправи; інакше (без схеми, старий модуль) — нейтральний значок.
 */
export function equipmentIcon(equipment, sc = schemeFor(equipment)) {
  if (equipment && equipment.group === 'dumbbells') return ICON_DUMBBELL;
  if (isArt(sc)) {
    try {
      const ex = activeExercises(equipment)[0];
      const svg = String(sc.art({ exerciseId: ex ? ex.id : null, mini: true }) || '');
      if (/^\s*<svg[\s>]/.test(svg)) return svg;
    } catch (err) {
      console.error(err);
    }
  }
  return ICON_MACHINE;
}

// --- DOM ---------------------------------------------------------------------------------

/** Малюнок варіанта (ручка або позиція хвату) як HTML-вузол або null. */
function optionPicture(equipment, adjustment, optionId, size = 'small', sc = schemeFor(equipment)) {
  let svg = '';
  if (adjustment.id === 'handle') svg = handleIcon(optionId, size === 'big' ? { width: 120, height: 80 } : { width: 66, height: 44 });
  else if (sc && sc.optionIcon) svg = sc.optionIcon(adjustment, optionId);
  return svg ? h('span', { class: `opt-pic opt-pic-${size}`, html: svg }) : null;
}

function swatchOf(adjustment, value) {
  const o = adjustment.kind === 'options' ? (adjustment.options || []).find((x) => x.id === value) : null;
  return o && o.color ? h('span', { class: 'swatch', style: { background: o.color } }) : null;
}

/**
 * Список регулювань «Сидіння — 3» з поточними значеннями і ⚠; натиск → onPick(adjustmentId).
 * scheme/exerciseId — щоб показати крапку кольору мітки на малюнку.
 */
export function renderAdjustmentList(equipment, values = {}, { onPick, only = null, scheme = null, exerciseId = null } = {}) {
  let rows = adjustmentRows(equipment, values, scheme, exerciseId);
  if (only) rows = rows.filter((r) => only.includes(r.id));
  if (!rows.length) {
    return only ? null : h('p', { class: 'muted' }, 'Регулювань ще не додано.');
  }
  return h('ul', { class: 'adj-list scheme-adjs' }, rows.map((r) => {
    const a = r.adjustment;
    const v = values[a.id];
    return h('li', null,
      h('button', {
        class: `adj-item${r.set ? '' : ' is-empty'}`,
        type: 'button',
        dataset: { adj: a.id },
        'aria-label': `${a.label}: ${r.value}${r.approx ? ` (${APPROX_TEXT})` : ''}`,
        onclick: () => onPick && onPick(a.id),
      },
      r.marker ? h('span', { class: 'adj-dot', style: { background: r.marker }, 'aria-hidden': 'true' }) : null,
      h('span', { class: 'adj-label' }, a.label),
      h('span', { class: 'adj-value' },
        r.set && a.id === 'handle' ? optionPicture(equipment, a, v, 'small', scheme) : swatchOf(a, v),
        r.value),
      r.approx ? h('span', { class: 'adj-warn', title: APPROX_TEXT, 'aria-hidden': 'true' }, '⚠') : null));
  }));
}

/** Вміст нижньої панелі вибору значення. choose(value) — зберегти й закрити. */
function pickerBody(equipment, adjustment, current, choose, sc) {
  const hints = (sc && sc.HINTS) || {};
  const warn = adjustment.approx || adjustment.unknown
    ? h('p', { class: 'approx picker-warn' }, APPROX_TEXT) : null;
  const visualSvg = pickerArt(sc, adjustment, current);
  let visual = null;
  if (visualSvg) {
    visual = h('div', { class: 'picker-art', html: visualSvg });
    visual.querySelectorAll('[data-pick]').forEach((node) => {
      const raw = node.getAttribute('data-pick');
      const value = adjustment.kind === 'positions' ? Number(raw) : raw;
      if (!isSet(adjustment, value)) return;
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.classList.add('pick-zone');
      node.addEventListener('click', () => choose(value));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(value); }
      });
    });
  }
  let choices;
  if (adjustment.kind === 'positions') {
    const items = [];
    for (let k = adjustment.count; k >= 1; k--) {
      const hint = positionHint(adjustment, k, hints);
      const word = hint.includes(' — ') ? hint.split(' — ')[1] : '';
      items.push(h('button', {
        type: 'button',
        class: `pick-pos${Number(current) === k ? ' is-current' : ''}`,
        'aria-pressed': Number(current) === k ? 'true' : 'false',
        onclick: () => choose(k),
      }, h('span', { class: 'pick-num' }, String(k)), word ? h('span', { class: 'pick-word' }, word) : null));
    }
    choices = h('div', { class: 'pick-positions' }, items);
  } else {
    choices = h('div', { class: 'pick-options' }, (adjustment.options || []).filter((o) => !o.deleted).map((o) => h('button', {
      type: 'button',
      class: `pick-opt${current === o.id ? ' is-current' : ''}`,
      'aria-pressed': current === o.id ? 'true' : 'false',
      style: safeColor(o.color) ? `--opt-color: ${o.color}` : null,
      onclick: () => choose(o.id),
    },
    optionPicture(equipment, adjustment, o.id, 'big', sc) || (o.color ? h('span', { class: 'swatch swatch-big', style: { background: o.color } }) : null),
    h('span', { class: 'pick-opt-label' }, o.label))));
  }
  const clear = isSet(adjustment, current)
    ? h('button', { type: 'button', class: 'btn pick-clear', onclick: () => choose(null) }, 'Скинути — не вибрано')
    : null;
  return h('div', { class: 'picker' }, warn, visual, choices, clear);
}

/** Прочитати значення клієнта для вправи зі сховища. */
export async function loadValues(store, clientId, exerciseId) {
  const all = await store.all('settings');
  return valuesFor(all, clientId, exerciseId);
}

export function renderScheme(container, equipment, exerciseId, values, opts = {}) {
  const { store, clientId, role, onPick, onChange } = opts;
  const exId = exerciseId || (activeExercises(equipment)[0] || {}).id;
  const state = { values: values || {} };
  const canSave = !!(store && clientId && exId);
  const scheme = () => opts.scheme || schemeFor(equipment);

  async function save(adjustment, value) {
    const setting = makeSetting({
      clientId, equipmentId: equipment.id, exerciseId: exId,
      adjustmentId: adjustment.id, value, by: role,
    });
    try {
      await store.put('settings', setting);
    } catch (err) {
      console.error(err);
      toast('Не вдалося зберегти — спробуйте ще раз');
      return;
    }
    const next = { ...state.values };
    if (value === null) delete next[adjustment.id];
    else next[adjustment.id] = value;
    state.values = next;
    paint();
    toast(value === null ? `${adjustment.label}: скинуто` : `${adjustment.label}: ${valueLabel(adjustment, value)} — збережено`);
    if (onChange) onChange(setting);
  }

  function pick(adjId) {
    const adjustment = activeAdjustments(equipment).find((a) => a.id === adjId);
    if (!adjustment) return;
    if (!canSave) {
      if (onPick) onPick(adjId);
      return;
    }
    // Мітка цього регулювання на малюнку підсвічена, поки відкрите вікно вибору.
    const marker = [...container.querySelectorAll('[data-marker]')].find((n) => n.getAttribute('data-marker') === adjId);
    if (marker) marker.classList.add('is-active');
    const panel = sheet((close) => pickerBody(equipment, adjustment, state.values[adjId], (value) => {
      close();
      save(adjustment, value);
    }, scheme()), { title: adjustment.label });
    panel.closed.then(() => { if (marker) marker.classList.remove('is-active'); });
  }

  function paint() {
    const sc = scheme();
    const adjs = activeAdjustments(equipment);
    const list = () => renderAdjustmentList(equipment, state.values, { onPick: pick, scheme: sc, exerciseId: exId });
    if (!sc) {
      mount(container, h('div', { class: 'scheme scheme-placeholder' },
        h('p', { class: 'scheme-missing' }, MISSING_TEXT),
        adjs.length
          ? h('p', { class: 'muted scheme-tip' }, 'Натисніть на регулювання, щоб вибрати значення.')
          : null,
        list()));
      return;
    }
    let svg = '';
    try {
      svg = schemeSvg(sc, equipment, exId, state.values);
    } catch (err) {
      console.error(err);
    }
    const canvas = svg ? h('div', { class: 'scheme-canvas', html: svg }) : null;
    // Мітки (новий контракт) і зони (старий) — кнопки регулювань.
    if (canvas) {
      canvas.querySelectorAll('[data-adj]').forEach((node) => {
        const adjId = node.getAttribute('data-adj');
        node.addEventListener('click', () => pick(adjId));
        node.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(adjId); }
        });
      });
    }
    mount(container, h('div', { class: `scheme${isArt(sc) ? ' scheme-art' : ''}`, dataset: { scheme: sc.id } },
      canvas || h('p', { class: 'scheme-missing' }, MISSING_TEXT),
      adjs.length ? list() : h('p', { class: 'muted scheme-tip scheme-no-adj' }, noAdjustmentsText(equipment))));
  }

  paint();
  if ((values === null || values === undefined) && store && clientId && exId) {
    loadValues(store, clientId, exId).then((v) => {
      state.values = v;
      paint();
    }).catch((err) => console.error(err));
  }
  return container;
}
