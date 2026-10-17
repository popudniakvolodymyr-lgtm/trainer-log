// Перший запуск: вибір ролі й підказка про головний екран.

import { h, mount, sheet, toast } from './dom.js';
import { uuid } from '../core/model.js';
import { openFile } from './exchange.js';

/** Чи відкрито програму з головного екрана (встановлену). */
export function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

/** Коротка підказка, як додати програму на головний екран. */
export function installHint() {
  return h('section', { class: 'card hint' },
    h('h2', null, 'Додайте програму на головний екран'),
    h('p', null, 'Тоді вона відкриватиметься одним натиском і працюватиме без інтернету.'),
    h('ul', { class: 'hint-list' },
      h('li', null, h('b', null, 'iPhone (Safari): '), 'кнопка «Поділитися» ⬆ → «На початковий екран».'),
      h('li', null, h('b', null, 'Android (Chrome): '), 'меню ⋮ → «Додати на головний екран».')));
}

function askClientName(ctx) {
  const input = h('input', {
    class: 'input', type: 'text', id: 'client-name', autocomplete: 'name',
    maxlength: 60, placeholder: 'Наприклад: Олена',
  });
  const error = h('p', { class: 'field-error', role: 'alert' });
  let busy = false;
  const s = sheet((close) => h('form', {
    class: 'form',
    onsubmit: async (e) => {
      e.preventDefault();
      if (busy) return;
      const name = input.value.trim().replace(/\s+/g, ' ');
      if (!name) {
        error.textContent = 'Введіть своє ім\'я';
        input.focus();
        return;
      }
      busy = true;
      try {
        const client = await ctx.store.put('clients', { id: uuid(), name });
        await ctx.store.setMeta({ role: 'client', clientId: client.id });
        close();
        toast(`Вітаємо, ${name}!`);
        ctx.navigate(`#/client/${client.id}`);
      } catch (err) {
        busy = false;
        error.textContent = 'Не вдалося зберегти. Спробуйте ще раз.';
      }
    },
  },
  h('label', { class: 'label', for: 'client-name' }, 'Ваше ім\'я'),
  input,
  error,
  h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Почати')),
  { title: 'Я клієнт' });
  setTimeout(() => input.focus(), 50);
  return s;
}

export function renderStart(container, ctx) {
  const chooseTrainer = async () => {
    await ctx.store.setMeta({ role: 'trainer', clientId: null });
    ctx.navigate('#/clients');
  };

  mount(container,
    h('div', { class: 'start' },
      h('div', { class: 'start-head' },
        h('img', { src: 'icons/icon-192.png', alt: '', width: 72, height: 72, class: 'start-logo' }),
        h('h1', null, 'Журнал тренера'),
        h('p', { class: 'muted' }, 'Записи тренувань і налаштування тренажерів залу APOLLO NEXT 023. Дані зберігаються лише на цьому телефоні.')),
      h('div', { class: 'start-actions' },
        h('div', null,
          h('button', { class: 'btn btn-primary btn-big', type: 'button', id: 'role-trainer', onclick: chooseTrainer }, 'Я тренер'),
          h('p', { class: 'muted role-hint', style: { margin: '6px 0 0', textAlign: 'center' } }, 'Я тренер — веду кількох клієнтів')),
        h('div', null,
          h('button', { class: 'btn btn-primary btn-big', type: 'button', id: 'role-client', onclick: () => askClientName(ctx) }, 'Я клієнт'),
          h('p', { class: 'muted role-hint', style: { margin: '6px 0 0', textAlign: 'center' } }, 'Я клієнт — записую свої тренування')),
        h('button', {
          class: 'btn btn-big', type: 'button', id: 'open-trainer-file',
          onclick: () => openFile(ctx, { expect: ['trainer-to-client'], title: 'Файл від тренера' }),
        }, 'Відкрити файл від тренера'),
        h('button', {
          class: 'btn btn-big', type: 'button', id: 'restore-backup',
          onclick: () => openFile(ctx, { expect: ['backup'], title: 'Відновити з копії' }),
        }, 'Відновити з копії')),
      isStandalone() ? null : installHint()));
}
