// Схеми тренажерів. Поки що заглушка (схеми малює таск 03), але з тим самим експортом:
// renderScheme(container, equipment, exerciseId, values, {onPick(adjustmentId)})
//   values: {[adjustmentId]: value}. Заглушка завжди (для будь-якого schemeId) показує
//   «Схему ще не намальовано» + список регулювань; натиск на пункт → onPick(adjustmentId).

import { h, mount } from '../ui/dom.js';

export const APPROX_TEXT = '⚠ приблизно — уточнити в залі';

/** Текст значення регулювання: номер позиції ('3') | назва варіанта | 'не вибрано'. */
export function valueLabel(adjustment, value) {
  if (value === null || value === undefined || value === '') return 'не вибрано';
  if (adjustment.kind === 'options') {
    const opt = (adjustment.options || []).find((o) => o.id === value);
    return opt ? opt.label : 'не вибрано';
  }
  return String(value);
}

/** Список регулювань з поточними значеннями; натиск → onPick(adjustmentId). */
export function renderAdjustmentList(equipment, values = {}, { onPick } = {}) {
  const adjs = (equipment.adjustments || []).filter((a) => !a.deleted);
  if (!adjs.length) {
    return h('p', { class: 'muted' }, 'Регулювань ще не додано.');
  }
  return h('ul', { class: 'adj-list' }, adjs.map((a) => {
    const v = values[a.id];
    const opt = a.kind === 'options' ? (a.options || []).find((o) => o.id === v) : null;
    return h('li', null,
      h('button', {
        class: 'adj-item',
        type: 'button',
        dataset: { adj: a.id },
        onclick: () => onPick && onPick(a.id),
      },
      h('span', { class: 'adj-label' }, a.label),
      h('span', { class: 'adj-value' },
        opt && opt.color ? h('span', { class: 'swatch', style: { background: opt.color } }) : null,
        valueLabel(a, v)),
      a.approx || a.unknown ? h('span', { class: 'approx' }, APPROX_TEXT) : null));
  }));
}

export function renderScheme(container, equipment, exerciseId, values = {}, { onPick } = {}) {
  return mount(container,
    h('div', { class: 'scheme scheme-placeholder' },
      h('p', { class: 'scheme-missing' }, 'Схему ще не намальовано — регулювання знімемо в залі'),
      renderAdjustmentList(equipment, values, { onPick })));
}
