// Заготовка екрана; замінює наступний таск. Контракт: renderEquipment(container, ctx),
// ctx = { store, meta, params, navigate(hash), rerender() }.

import { h, mount } from './dom.js';

export async function renderEquipment(container, ctx) {
  let heading = 'Тренажери';
  mount(container, h('div', { class: 'screen' },
    h('h1', null, heading),
    h('p', { class: 'muted' }, 'Цей екран ще в роботі.')));
}
