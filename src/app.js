// Точка входу: відкриває сховище, маршрутизує за location.hash, реєструє service worker.
//
// Маршрути: #/start, #/clients, #/client/<id>, #/client/<id>/eq/<eqId>[/<exId>], #/equipment, #/settings
// Екран — функція render(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() }.

import { openStore } from './store.js';
import { h, mount, sheetHistorySettled } from './ui/dom.js';
import { renderStart } from './ui/start.js';
import { renderSettings } from './ui/settings.js';
import { renderClients } from './ui/clients.js';
import { renderClient } from './ui/client.js';
import { renderExercise } from './ui/exercise.js';
import { renderEquipment } from './ui/equipment.js';


/**
 * Таблиця маршрутів. roles — хто має доступ; own — клієнт бачить лише свою картку.
 * Екрани живуть у src/ui/*.js; наступні таски замінюють ці модулі, а не app.js.
 */
export const routes = [
  { pattern: /^#\/start$/, name: 'start', roles: [null], render: renderStart, bare: true },
  { pattern: /^#\/clients$/, name: 'clients', roles: ['trainer'], render: renderClients },
  { pattern: /^#\/client\/([^/]+)\/eq\/([^/]+)(?:\/([^/]+))?$/, name: 'exercise', roles: ['trainer', 'client'], own: true,
    keys: ['clientId', 'equipmentId', 'exerciseId'], render: renderExercise },
  { pattern: /^#\/client\/([^/]+)$/, name: 'client', roles: ['trainer', 'client'], own: true,
    keys: ['clientId'], render: renderClient },
  { pattern: /^#\/equipment$/, name: 'equipment', roles: ['trainer'], render: renderEquipment },
  { pattern: /^#\/settings$/, name: 'settings', roles: ['trainer', 'client'], render: renderSettings },
];

/** Головний екран ролі. */
export function homeFor(meta) {
  if (meta.role === 'trainer') return '#/clients';
  if (meta.role === 'client' && meta.clientId) return `#/client/${encodeURIComponent(meta.clientId)}`;
  return '#/start';
}

const EXERCISE_HASH = /^#\/client\/([^/]+)\/eq\/([^/]+)(?:\/([^/]+))?$/;
const CLIENT_HASH = /^#\/client\/([^/]+)$/;

/**
 * Куди веде «назад» з екрана (Q5) або null — ціль не задана (звичайний крок історії).
 * Екран тренажера (будь-яка вкладка) → меню картки клієнта; картка → список клієнтів (тренер).
 */
export function backTarget(hash, meta) {
  const ex = EXERCISE_HASH.exec(hash || '');
  if (ex) return `#/client/${ex[1]}`;
  if (CLIENT_HASH.test(hash || '') && meta.role === 'trainer') return '#/clients';
  return null;
}

/**
 * Що робить стрілка «назад». prevHash — екран, з якого прийшли на цей крок історії (або null).
 * → {back:true} — history.back(); {replace: hash} — замінити поточний крок (без нового кроку).
 */
export function backStep(hash, meta, prevHash) {
  const target = backTarget(hash, meta);
  if (target) return prevHash === target ? { back: true } : { replace: target };
  return prevHash ? { back: true } : { replace: homeFor(meta) };
}

/** Перехід між вкладками вправ того самого тренажера тієї самої картки — без нового кроку історії. */
export function isTabSwitch(fromHash, toHash) {
  const a = EXERCISE_HASH.exec(fromHash || '');
  const b = EXERCISE_HASH.exec(toHash || '');
  return !!(a && b && a[1] === b[1] && a[2] === b[2]);
}

function match(hash) {
  for (const r of routes) {
    const m = r.pattern.exec(hash);
    if (!m) continue;
    const params = {};
    try {
      (r.keys || []).forEach((k, i) => {
        if (m[i + 1] !== undefined) params[k] = decodeURIComponent(m[i + 1]);
      });
    } catch {
      return null; // битий хеш (напр. «%») — як невідомий маршрут
    }
    return { route: r, params };
  }
  return null;
}

/** Запасний екран, коли домашній маршрут ролі не розпізнано. */
function fallbackFor(meta) {
  const name = meta.role === 'trainer' || meta.role === 'client' ? 'settings' : 'start';
  return { route: routes.find((r) => r.name === name), params: {} };
}

let store = null;
let renderId = 0;
let lastHash = null; // екран попереднього рендеру — для history.state.prev

/** Новий крок історії запам'ятовує, звідки на нього прийшли (history.state.prev). */
function rememberPrev() {
  const st = history.state;
  if (st && typeof st === 'object' && 'prev' in st) return;
  const prev = lastHash && lastHash !== location.hash ? lastHash : null;
  history.replaceState({ ...(st && typeof st === 'object' ? st : {}), prev }, '');
}

/** Стрілка «назад» у шапці. */
function goBack(meta) {
  const prev = history.state && typeof history.state === 'object' ? history.state.prev : null;
  const step = backStep(location.hash, meta, prev || null);
  if (step.back) history.back();
  else location.replace(step.replace);
}
const view = () => document.getElementById('view');
const topbar = () => document.getElementById('topbar');

// Панель, що щойно закрилась, прибирає свій крок історії асинхронно (history.back) —
// перехід і рендер чекають, щоб не читати й не міняти history.state чужого кроку (F3).
async function navigate(hash) {
  await sheetHistorySettled();
  if (location.hash === hash) render();
  else location.hash = hash;
}

function renderTopbar(meta, route) {
  const home = homeFor(meta);
  const atHome = location.hash === home;
  mount(topbar(),
    route.bare ? null : h('button', {
      class: 'btn-icon', type: 'button', 'aria-label': 'Назад', disabled: atHome,
      onclick: () => goBack(meta),
    }, '‹'),
    h('a', { class: 'topbar-title', href: home }, 'Журнал тренера'),
    route.bare ? null : h('a', {
      class: 'btn-icon', href: '#/settings', 'aria-label': 'Налаштування',
      'aria-current': route.name === 'settings' ? 'page' : null,
    }, '⚙'));
}

async function render() {
  const id = ++renderId;
  await sheetHistorySettled();
  if (id !== renderId) return;
  const meta = await store.getMeta();
  if (id !== renderId) return;
  const home = homeFor(meta);
  const found = match(location.hash);

  // Немає маршруту, нема доступу або клієнт лізе в чужу картку — на головний екран ролі.
  const denied = !found
    || !found.route.roles.includes(meta.role)
    || (found.route.own && meta.role === 'client' && found.params.clientId !== meta.clientId);
  if (denied) {
    if (location.hash !== home) {
      location.replace(home);
      return;
    }
  }
  // Домашній маршрут може не збігтися (битий id у даних) — тоді налаштування або старт, а не порожній екран.
  const target = (denied ? match(home) : found) || fallbackFor(meta);
  const { route, params } = target;

  // Екран малюється в окремий корінь; у #view він потрапляє, лише якщо за час
  // await не почався новіший рендер (інакше застарілий результат відкидається).
  rememberPrev();
  const container = h('div', { class: 'screen-root' });
  // Екран може повернути { scrollY } — куди прокрутити після вставки (повернення в меню, Q6).
  let shown = null;
  try {
    shown = await route.render(container, { store, meta, params, navigate, rerender: render });
  } catch (err) {
    console.error(err);
    mount(container, h('div', { class: 'screen' },
      h('h1', null, 'Щось пішло не так'),
      h('p', null, 'Спробуйте оновити сторінку. Ваші дані на місці.')));
  }
  if (id !== renderId) return;
  renderTopbar(meta, route);
  const v = view();
  v.dataset.screen = route.name;
  mount(v, container);
  v.focus({ preventScroll: true });
  const y = shown && Number.isFinite(shown.scrollY) ? shown.scrollY : 0;
  window.scrollTo(0, y);
  lastHash = location.hash;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker:', err));
}

async function main() {
  try {
    store = await openStore();
  } catch (err) {
    console.error(err);
    mount(view(), h('div', { class: 'screen' },
      h('h1', null, 'Не вдалося відкрити дані'),
      h('p', null, 'Браузер не дозволяє зберігати дані. Відкрийте програму у звичайному (не приватному) вікні Safari або Chrome.')));
    return;
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', render);
  await render();
  registerServiceWorker();
}

// У node (тести nav.test.js) лише чисті функції маршрутів — без запуску програми.
if (typeof document !== 'undefined') main();
