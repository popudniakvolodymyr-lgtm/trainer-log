// Картка клієнта: меню тренажерів за групами, пошук, секція «Останні».
// renderClient(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() }.
// Тренер і клієнт бачать той самий екран (клієнт — лише свою картку, це перевіряє app.js).
// Кнопка тренажера — значок (equipmentIcon) + назва. Перед переходом на тренажер прокрутка й
// пошуковий запит пишуться в history.state цього кроку ({menu:{scrollY, query}}): «назад» на
// меню їх відновлює (Q6); render повертає { scrollY } — app.js прокручує після вставки.

import { h, mount } from './dom.js';
import { GROUPS } from '../core/model.js';
import { menuEquipment } from '../core/catalog.js';
import { listSessions, recentEquipmentIds } from './log-data.js';
import { sendButton, backupBanner } from './exchange.js';
import { equipmentIcon } from '../schemes/index.js';

const RECENT_LIMIT = 6;

const eqHref = (clientId, equipmentId) =>
  `#/client/${encodeURIComponent(clientId)}/eq/${encodeURIComponent(equipmentId)}`;

// Рідкісні (і сховані, на яких є записи клієнта) — сірим, у кінці групи.
const MUTED_STYLE = { opacity: '0.55', filter: 'grayscale(1)' };

/** Кнопка тренажера: назва (власна) і дрібно — назва з сайту, якщо відрізняється. */
function equipmentButton(clientId, eq, muted = false, onLeave = null) {
  const sub = eq.siteName && eq.siteName !== eq.name ? eq.siteName : null;
  return h('a', {
    class: `eq-btn${muted ? ' is-rare' : ''}`, href: eqHref(clientId, eq.id), dataset: { eq: eq.id },
    style: muted ? MUTED_STYLE : null,
    onclick: onLeave,
  },
    h('span', { class: 'eq-ico', 'aria-hidden': 'true', html: equipmentIcon(eq) }),
    h('span', { class: 'eq-text' },
      h('span', { class: 'eq-name' }, eq.name),
      sub ? h('span', { class: 'eq-sub' }, sub) : null));
}

/** Збережене місце меню цього кроку історії: { scrollY, query } або null. */
function savedMenu(clientId) {
  const st = typeof history !== 'undefined' ? history.state : null;
  const m = st && typeof st === 'object' ? st.menu : null;
  return m && m.clientId === clientId ? m : null;
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

  const sessions = await listSessions(store, client.id);
  // Сховане й прибране з каталогу — лише якщо на ньому є записи клієнта (П5, П9).
  const menu = menuEquipment(await store.all('equipment'), sessions);
  const mutedIds = new Set(menu.filter((x) => x.muted).map((x) => x.equipment.id));
  const equipment = menu.map((x) => x.equipment);
  const byId = new Map(equipment.map((e) => [e.id, e]));
  const recent = recentEquipmentIds(sessions).map((id) => byId.get(id)).filter(Boolean).slice(0, RECENT_LIMIT);

  const body = h('div', { class: 'eq-menu' });
  const noMatch = h('p', { class: 'muted', hidden: true }, 'Тренажер не знайдено');
  const search = h('input', {
    class: 'input', type: 'search', placeholder: 'Пошук тренажера', 'aria-label': 'Пошук тренажера',
    autocomplete: 'off',
  });

  // Перед переходом на тренажер — запам'ятати місце меню в поточному кроці історії:
  // яку кнопку натиснули (і в якій секції) та де вона була на екрані.
  const remember = (e) => {
    const btn = e && e.currentTarget;
    const st = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({
      ...st,
      menu: {
        clientId: client.id, scrollY: window.scrollY, query: search.value,
        eq: btn ? btn.dataset.eq : null,
        recent: !!(btn && btn.closest('.eq-recent')),
        top: btn ? Math.round(btn.getBoundingClientRect().top) : null,
      },
    }, '');
  };

  const section = (title, items, cls = '') => h('section', { class: `eq-group ${cls}` },
    h('h2', null, title),
    h('div', { class: 'eq-grid' }, items.map((eq) => equipmentButton(client.id, eq, mutedIds.has(eq.id), remember))));

  const recentSection = recent.length ? section('Останні', recent, 'eq-recent') : null;
  const groupSections = Object.entries(GROUPS).map(([groupId, title]) => {
    const items = equipment.filter((e) => e.group === groupId);
    if (!items.length) return null;
    const el = section(title, items);
    return { el, items, title };
  }).filter(Boolean);

  body.append(...(recentSection ? [recentSection] : []), ...groupSections.map((g) => g.el));

  const filter = () => {
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
  };
  search.addEventListener('input', filter);

  // Місце меню застосовується один раз — при поверненні на цей крок; потім стирається,
  // щоб наступні перемальовування (і очищений пошук) його не повертали.
  const saved = savedMenu(client.id);
  if (saved) {
    const { menu, ...rest } = history.state;
    history.replaceState(rest, '');
  }
  if (saved && saved.query) {
    search.value = String(saved.query);
    filter();
  }

  const banner = await backupBanner(ctx);

  mount(container, h('div', { class: 'screen' },
    h('h1', null, client.name),
    banner,
    sendButton(ctx, client.id),
    search,
    body,
    noMatch));
  if (saved && saved.eq) {
    // Після вставки в DOM: та сама кнопка — на тому ж місці екрана, хоч би «Останні» й подовшали.
    requestAnimationFrame(() => {
      const btns = [...container.querySelectorAll('.eq-btn')]
        .filter((b) => b.dataset.eq === saved.eq && !b.hidden && b.offsetParent);
      const btn = btns.find((b) => !!b.closest('.eq-recent') === saved.recent) || btns[0];
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const top = Number.isFinite(saved.top) ? saved.top : (window.innerHeight - rect.height) / 2;
      window.scrollTo(0, Math.max(0, window.scrollY + rect.top - top));
      const after = btn.getBoundingClientRect();
      if (after.top < 0 || after.bottom > window.innerHeight) btn.scrollIntoView({ block: 'center' });
    });
  }
  return saved && Number.isFinite(saved.scrollY) ? { scrollY: saved.scrollY } : null;
}
