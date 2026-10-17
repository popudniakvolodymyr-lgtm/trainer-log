// Екран «Налаштування»: роль, місце під обмін файлами й копію, про програму.

import { h, mount, toast } from './dom.js';
import { installHint, isStandalone } from './start.js';
import { formatDate, today } from '../core/model.js';
import { sendToTrainer, openFile, saveBackup, backupBanner } from './exchange.js';

const action = (id, text, onclick, primary = false) => h('button', {
  class: `btn btn-big${primary ? ' btn-primary' : ''}`, type: 'button', id, onclick,
}, text);

const dateOf = (ms) => formatDate(today(new Date(ms)));

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
        trainerBlock),
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
