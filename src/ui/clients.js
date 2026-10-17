// Заготовка екрана; замінює наступний таск. Контракт: renderClients(container, ctx),
// ctx = { store, meta, params, navigate(hash), rerender() }.

import { h, mount } from './dom.js';

export async function renderClients(container, ctx) {
  let heading = 'Клієнти';
  mount(container, h('div', { class: 'screen' },
    h('h1', null, heading),
    h('p', { class: 'muted' }, 'Цей екран ще в роботі.')));
}
