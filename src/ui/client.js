// Картка клієнта: меню тренажерів за групами, пошук, секція «Останні».
// renderClient(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() }.
// Тренер і клієнт бачать той самий екран (клієнт — лише свою картку, це перевіряє app.js).

import { h, mount } from './dom.js';
import { GROUPS } from '../core/model.js';
import { listSessions, recentEquipmentIds } from './log-data.js';
import { sendButton, backupBanner } from './exchange.js';

const RECENT_LIMIT = 6;

const eqHref = (clientId, equipmentId) =>
  `#/client/${encodeURIComponent(clientId)}/eq/${encodeURIComponent(equipmentId)}`;

/** Кнопка тренажера: назва (власна) і дрібно — назва з сайту, якщо відрізняється. */
function equipmentButton(clientId, eq) {
  const sub = eq.siteName && eq.siteName !== eq.name ? eq.siteName : null;
  return h('a', { class: 'eq-btn', href: eqHref(clientId, eq.id), dataset: { eq: eq.id } },
    h('span', { class: 'eq-name' }, eq.name),
    sub ? h('span', { class: 'eq-sub' }, sub) : null);
}

export async function renderClient(container, ctx) {
  const { store, params } = ctx;
  const client = params.clientId ? await store.get('clients', params.clientId) : null;
  if (!client || client.deleted) {
    mount(container, h('div', { class: 'screen' },
      h('h1', null, 'Клієнта не знайдено'),
      ctx.meta.role === 'trainer'
        ? h('a', { class: 'btn btn-primary btn-big', href: '#/clients' }, 'До списку клієнтів')
        : null));
    return;
  }

  const equipment = (await store.all('equipment')).filter((e) => !e.hidden);
  const sessions = await listSessions(store, client.id);
  const byId = new Map(equipment.map((e) => [e.id, e]));
  const recent = recentEquipmentIds(sessions).map((id) => byId.get(id)).filter(Boolean).slice(0, RECENT_LIMIT);

  const body = h('div', { class: 'eq-menu' });
  const noMatch = h('p', { class: 'muted', hidden: true }, 'Тренажер не знайдено');
  const search = h('input', {
    class: 'input', type: 'search', placeholder: 'Пошук тренажера', 'aria-label': 'Пошук тренажера',
    autocomplete: 'off',
  });

  const section = (title, items, cls = '') => h('section', { class: `eq-group ${cls}` },
    h('h2', null, title),
    h('div', { class: 'eq-grid' }, items.map((eq) => equipmentButton(client.id, eq))));

  const recentSection = recent.length ? section('Останні', recent, 'eq-recent') : null;
  const groupSections = Object.entries(GROUPS).map(([groupId, title]) => {
    const items = equipment.filter((e) => e.group === groupId);
    if (!items.length) return null;
    const el = section(title, items);
    return { el, items, title };
  }).filter(Boolean);

  body.append(...(recentSection ? [recentSection] : []), ...groupSections.map((g) => g.el));

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    if (recentSection) recentSection.hidden = !!q;
    let shown = 0;
    for (const g of groupSections) {
      let any = false;
      g.items.forEach((eq, i) => {
        const hit = !q || `${eq.name} ${eq.siteName || ''} ${g.title}`.toLowerCase().includes(q);
        g.el.querySelectorAll('.eq-btn')[i].hidden = !hit;
        if (hit) { any = true; shown++; }
      });
      g.el.hidden = !any;
    }
    noMatch.hidden = shown > 0;
  });

  const banner = await backupBanner(ctx);

  mount(container, h('div', { class: 'screen' },
    h('h1', null, client.name),
    banner,
    sendButton(ctx, client.id),
    search,
    body,
    noMatch));
}
