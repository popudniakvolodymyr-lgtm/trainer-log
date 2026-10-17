// Заготовка екрана; замінює наступний таск. Контракт: renderClient(container, ctx),
// ctx = { store, meta, params, navigate(hash), rerender() }.

import { h, mount } from './dom.js';

export async function renderClient(container, ctx) {
  let heading = 'Картка клієнта';
  const client = ctx.params.clientId ? await ctx.store.get('clients', ctx.params.clientId) : null;
  if (client) heading = client.name;
  mount(container, h('div', { class: 'screen' },
    h('h1', null, heading),
    h('p', { class: 'muted' }, 'Цей екран ще в роботі.')));
}
