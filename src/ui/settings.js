// Екран «Налаштування»: роль, місце під обмін файлами й копію, про програму.

import { h, mount, toast } from './dom.js';
import { installHint, isStandalone } from './start.js';
import { formatDate, today } from '../core/model.js';

const soon = (text) => h('button', { class: 'btn btn-big', type: 'button', disabled: true },
  text, h('span', { class: 'soon' }, 'скоро'));

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
    ? [soon('Надіслати тренеру'), soon('Відкрити файл від тренера')]
    : [soon('Відкрити файл від клієнта')];

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
        h('div', { class: 'stack', id: 'backup-actions' },
          soon('Зберегти копію'),
          soon('Відновити з копії')),
        h('p', { class: 'muted' }, meta.lastBackupAt
          ? `Остання копія: ${dateOf(meta.lastBackupAt)}`
          : 'Копію ще не зберігали.')),
      h('section', { class: 'card' },
        h('h2', null, 'Про програму'),
        h('p', null, 'Усі дані — лише на цьому телефоні, без реєстрації й інтернету.'),
        h('p', { class: 'muted' }, persisted === true
          ? 'Браузер не стиратиме дані програми.'
          : 'Браузер може очистити дані, якщо забракне місця, — зберігайте копію.')),
      isStandalone() ? null : installHint()));
}
