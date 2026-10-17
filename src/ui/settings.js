// Екран «Налаштування»: роль, місце під обмін файлами й копію, про програму.

import { h, mount, toast, sheet, confirmDialog } from './dom.js';
import { installHint, isStandalone } from './start.js';
import { formatDate, today, localRecordCounts } from '../core/model.js';
import { sendToTrainer, openFile, saveBackup, backupBanner } from './exchange.js';

const action = (id, text, onclick, primary = false) => h('button', {
  class: `btn btn-big${primary ? ' btn-primary' : ''}`, type: 'button', id, onclick,
}, text);

const dateOf = (ms) => formatDate(today(new Date(ms)));

// --- «Змінити роль» (W7) ---------------------------------------------------------------

const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/** «2 клієнти, 15 підходів…» — що саме зникне. */
function recordsText(info) {
  const parts = [];
  if (info.clients) parts.push(`${info.clients} ${plural(info.clients, 'клієнт', 'клієнти', 'клієнтів')}`);
  if (info.sessions) parts.push(`${info.sessions} ${plural(info.sessions, 'день тренувань', 'дні тренувань', 'днів тренувань')}`);
  if (info.settings) parts.push(`${info.settings} ${plural(info.settings, 'налаштування', 'налаштування', 'налаштувань')}`);
  if (info.equipment) parts.push(`${info.equipment} ${plural(info.equipment, 'змінений тренажер', 'змінені тренажери', 'змінених тренажерів')}`);
  return parts.join(', ');
}

/**
 * Попередження перед зміною ролі, коли на телефоні є записи: «Зберегти копію», підтвердження.
 * → Promise<bool> (true — прибрати записи)
 */
export function askRoleChange(info, ctx) {
  return new Promise((resolve) => {
    let answered = false;
    let saved = false;
    const answer = (v) => { if (!answered) { answered = true; resolve(v); } };
    const handle = sheet((close) => h('div', { class: 'stack', id: 'role-change' },
      h('p', null, h('b', null, 'Записи з цього телефона буде прибрано: '), `${recordsText(info)}.`),
      h('p', { class: 'muted' }, 'Щоб їх не втратити, спершу збережіть копію — її можна буде відкрити кнопкою «Відновити з копії».'),
      h('button', {
        class: 'btn btn-primary btn-big', type: 'button', id: 'role-save-copy',
        onclick: async () => {
          const before = (await ctx.store.getMeta()).lastBackupAt || null;
          await saveBackup(ctx);
          const after = (await ctx.store.getMeta()).lastBackupAt || null;
          if (after && after !== before) saved = true;
        },
      }, 'Зберегти копію'),
      h('button', {
        class: 'btn btn-danger btn-big', type: 'button', id: 'role-confirm',
        onclick: async () => {
          const ok = await confirmDialog(saved
            ? 'Прибрати всі записи з цього телефона і вибрати роль заново?'
            : 'Копію не збережено — записи зникнуть назавжди. Прибрати їх і вибрати роль заново?',
          { ok: 'Прибрати', danger: true });
          if (!ok) return;
          answer(true);
          close();
        },
      }, 'Прибрати записи і змінити роль'),
      h('button', { class: 'btn btn-big', type: 'button', onclick: () => close() }, 'Скасувати')),
    { title: 'Змінити роль' });
    handle.closed.then(() => answer(false));
  });
}

/**
 * «Змінити роль»: без записів — одразу чисте сховище і перший екран; із записами — лише
 * після підтвердження (ask). → Promise<bool> (true — сховище очищено)
 * ui.ask(info, ctx) → Promise<bool>; info — localRecordCounts.
 */
export async function changeRole(ctx, { ask = askRoleChange } = {}) {
  const state = await ctx.store.snapshot();
  const info = localRecordCounts(state, state.meta || ctx.meta);
  const any = Object.values(info).some((n) => n > 0);
  if (any && !(await ask(info, ctx))) return false;
  await ctx.store.clearAll();
  ctx.navigate('#/start');
  return true;
}

/** Кнопка «Змінити роль» (налаштування, низ головного екрана тренера й клієнта). */
export function changeRoleButton(ctx, { id = 'change-role' } = {}) {
  let busy = false;
  return h('button', {
    class: 'btn btn-big', type: 'button', id,
    onclick: async () => {
      if (busy) return;
      busy = true;
      try {
        await changeRole(ctx);
      } catch (err) {
        console.error(err);
        toast('Не вдалося змінити роль. Спробуйте ще раз.');
      } finally {
        busy = false;
      }
    },
  }, 'Змінити роль');
}

export async function renderSettings(container, ctx) {
  const { store, meta } = ctx;
  const role = meta.role;
  let roleText = 'Роль ще не вибрано';
  if (role === 'trainer') roleText = 'Ви — тренер';
  if (role === 'client') {
    const me = meta.clientId ? await store.get('clients', meta.clientId) : null;
    roleText = `Ви — клієнт${me ? `: ${me.name}` : ''}`;
  }

  let persisted = null;
  try {
    if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted();
  } catch { /* немає — не страшно */ }

  let trainerBlock = null;
  if (role === 'trainer') {
    const input = h('input', {
      class: 'input', type: 'text', id: 'trainer-name', maxlength: 60,
      value: meta.trainerName || '', placeholder: 'Як вас підписати у файлах',
    });
    trainerBlock = h('form', {
      class: 'form',
      onsubmit: async (e) => {
        e.preventDefault();
        const name = input.value.trim().replace(/\s+/g, ' ');
        await store.setMeta({ trainerName: name || null });
        toast('Збережено');
      },
    },
    h('label', { class: 'label', for: 'trainer-name' }, 'Ваше ім\'я (необов\'язково)'),
    input,
    h('button', { class: 'btn', type: 'submit' }, 'Зберегти ім\'я'));
  }

  const exchange = role === 'client'
    ? [action('send-file', 'Надіслати тренеру', () => sendToTrainer(ctx), true),
      action('open-file', 'Відкрити файл від тренера',
        () => openFile(ctx, { expect: ['trainer-to-client'], title: 'Файл від тренера' }))]
    : [action('open-file', 'Відкрити файл від клієнта',
      () => openFile(ctx, { expect: ['client-to-trainer'], title: 'Файл від клієнта' }), true),
    h('p', { class: 'muted' }, 'Щоб надіслати клієнту його записи, відкрийте його картку → «Надіслати клієнту».')];
  const banner = await backupBanner(ctx);

  const equipmentBlock = role === 'trainer'
    ? h('section', { class: 'card', id: 'settings-equipment' },
      h('h2', null, 'Тренажери'),
      h('p', { class: 'muted' }, 'Назви, вправи, регулювання; сховати непотрібні або додати свій.'),
      h('a', { class: 'btn btn-big', href: '#/equipment', id: 'equipment-link' }, 'Тренажери'))
    : null;

  mount(container,
    h('div', { class: 'settings' },
      h('h1', null, 'Налаштування'),
      h('section', { class: 'card' },
        h('h2', null, 'Роль'),
        h('p', { id: 'role-text' }, roleText),
        trainerBlock,
        role ? changeRoleButton(ctx) : null),
      h('section', { class: 'card', id: 'settings-exchange' },
        h('h2', null, 'Обмін і копія'),
        h('div', { class: 'stack', id: 'exchange-actions' }, exchange),
        banner,
        h('div', { class: 'stack', id: 'backup-actions' },
          action('save-backup', 'Зберегти копію', () => saveBackup(ctx)),
          action('restore-backup', 'Відновити з копії',
            () => openFile(ctx, { expect: ['backup'], title: 'Відновити з копії' }))),
        h('p', { class: 'muted' }, meta.lastBackupAt
          ? `Остання копія: ${dateOf(meta.lastBackupAt)}`
          : 'Копію ще не зберігали.')),
      equipmentBlock,
      h('section', { class: 'card' },
        h('h2', null, 'Про програму'),
        h('p', null, 'Усі дані — лише на цьому телефоні, без реєстрації й інтернету.'),
        h('p', { class: 'muted' }, persisted === true
          ? 'Браузер не стиратиме дані програми.'
          : 'Браузер може очистити дані, якщо забракне місця, — зберігайте копію.')),
      isStandalone() ? null : installHint()));
}
