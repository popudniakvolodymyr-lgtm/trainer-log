// Схеми тренажерів на екрані вправи.
//
// renderScheme(container, equipment, exerciseId, values, opts)
//   values: {[adjustmentId]: value} | null/undefined → прочитати зі opts.store (клієнт + вправа).
//   opts: { store, clientId, role, onPick(adjustmentId), onChange(setting) }
//     • є store і clientId — натиск на регулювання відкриває нижню панель вибору, значення
//       зберігається як Setting (by = role) і схема перемальовується на місці (без скролу вгору);
//       після збереження викликається onChange(setting), якщо передано.
//     • немає store — натиск лише викликає onPick(adjustmentId).
//   Тренажер без schemeId (або з невідомою схемою) — помітна заглушка + список регулювань.
// → container (заповнюється одразу; значення зі сховища домальовуються, коли прочитаються).

import { h, mount, sheet, toast } from '../ui/dom.js';
import { schemeFor } from './registry.js';
import { handleIcon } from './handles.js';
import { APPROX_TEXT } from './svg.js';
import { activeAdjustments, activeExercises, valuesFor, makeSetting, isSet, positionHint } from './values.js';

export { APPROX_TEXT };
export { schemeFor, SCHEMES } from './registry.js';
export { handleIcon } from './handles.js';

const safeColor = (c) => /^#[0-9a-f]{3,8}$/i.test(String(c || ''));

const MISSING_TEXT = 'Схему ще не намальовано — регулювання знімемо в залі';

/** Текст значення регулювання: номер позиції ('3') | назва варіанта | 'не вибрано'. */
export function valueLabel(adjustment, value) {
  if (!isSet(adjustment, value)) return 'не вибрано';
  if (adjustment.kind === 'options') return adjustment.options.find((o) => o.id === value).label;
  return String(value);
}

/** Малюнок варіанта (ручка або позиція хвату) як HTML-вузол або null. */
function optionPicture(equipment, adjustment, optionId, size = 'small') {
  let svg = '';
  if (adjustment.id === 'handle') svg = handleIcon(optionId, size === 'big' ? { width: 120, height: 80 } : { width: 66, height: 44 });
  else {
    const sc = schemeFor(equipment);
    if (sc && sc.optionIcon) svg = sc.optionIcon(adjustment, optionId);
  }
  return svg ? h('span', { class: `opt-pic opt-pic-${size}`, html: svg }) : null;
}

function swatchOf(adjustment, value) {
  const o = adjustment.kind === 'options' ? (adjustment.options || []).find((x) => x.id === value) : null;
  return o && o.color ? h('span', { class: 'swatch', style: { background: o.color } }) : null;
}

/** Список регулювань з поточними значеннями; натиск → onPick(adjustmentId). */
export function renderAdjustmentList(equipment, values = {}, { onPick, only = null } = {}) {
  let adjs = activeAdjustments(equipment);
  if (only) adjs = adjs.filter((a) => only.includes(a.id));
  if (!adjs.length) {
    return only ? null : h('p', { class: 'muted' }, 'Регулювань ще не додано.');
  }
  return h('ul', { class: 'adj-list' }, adjs.map((a) => {
    const v = values[a.id];
    const set = isSet(a, v);
    return h('li', null,
      h('button', {
        class: `adj-item${set ? '' : ' is-empty'}`,
        type: 'button',
        dataset: { adj: a.id },
        onclick: () => onPick && onPick(a.id),
      },
      h('span', { class: 'adj-label' }, a.label),
      h('span', { class: 'adj-value' },
        set && a.id === 'handle' ? optionPicture(equipment, a, v) : swatchOf(a, v),
        valueLabel(a, v)),
      a.approx || a.unknown ? h('span', { class: 'approx' }, APPROX_TEXT) : null));
  }));
}

/** Вміст нижньої панелі вибору значення. choose(value) — зберегти й закрити. */
function pickerBody(equipment, adjustment, current, choose) {
  const sc = schemeFor(equipment);
  const hints = (sc && sc.HINTS) || {};
  const warn = adjustment.approx || adjustment.unknown
    ? h('p', { class: 'approx picker-warn' }, APPROX_TEXT) : null;
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
    optionPicture(equipment, adjustment, o.id, 'big') || (o.color ? h('span', { class: 'swatch swatch-big', style: { background: o.color } }) : null),
    h('span', { class: 'pick-opt-label' }, o.label))));
  }
  const clear = isSet(adjustment, current)
    ? h('button', { type: 'button', class: 'btn pick-clear', onclick: () => choose(null) }, 'Скинути — не вибрано')
    : null;
  return h('div', { class: 'picker' }, warn, choices, clear);
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
    sheet((close) => pickerBody(equipment, adjustment, state.values[adjId], (value) => {
      close();
      save(adjustment, value);
    }), { title: adjustment.label });
  }

  function paint() {
    const sc = schemeFor(equipment);
    const adjs = activeAdjustments(equipment);
    if (!sc) {
      mount(container, h('div', { class: 'scheme scheme-placeholder' },
        h('p', { class: 'scheme-missing' }, MISSING_TEXT),
        adjs.length
          ? h('p', { class: 'muted scheme-tip' }, 'Натисніть на регулювання, щоб вибрати значення.')
          : null,
        renderAdjustmentList(equipment, state.values, { onPick: pick })));
      return;
    }
    const canvas = h('div', { class: 'scheme-canvas', html: sc.draw(state.values, adjs) });
    // Зони регулювань на схемі — кнопки.
    canvas.querySelectorAll('[data-adj]').forEach((node) => {
      const adjId = node.getAttribute('data-adj');
      node.addEventListener('click', () => pick(adjId));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(adjId); }
      });
    });
    const drawn = new Set(sc.ADJUSTMENTS || []);
    const extra = adjs.filter((a) => !drawn.has(a.id)).map((a) => a.id);
    mount(container, h('div', { class: 'scheme', dataset: { scheme: sc.id } },
      canvas,
      h('p', { class: 'muted scheme-tip' }, 'Натисніть на синю рамку, щоб змінити значення.'),
      extra.length ? renderAdjustmentList(equipment, state.values, { onPick: pick, only: extra }) : null));
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
