// Список клієнтів (тренер): додати, перейменувати, видалити з підтвердженням, пошук.
// renderClients(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() }.

import { h, mount, sheet, toast, confirmDialog } from './dom.js';
import { uuid } from '../core/model.js';
import { deleteClient } from './log-data.js';
import { backupBanner } from './exchange.js';

const NAME_MAX = 60;

const cleanName = (raw) => String(raw || '').trim().replace(/\s+/g, ' ');
const byName = (a, b) => a.name.localeCompare(b.name, 'uk');

/** Панель з полем імені. onSubmit(name) → Promise; помилка показується під полем. */
function openNameSheet({ title, initial = '', submitText, onSubmit }) {
  const input = h('input', {
    class: 'input', type: 'text', id: 'client-name', maxlength: NAME_MAX, value: initial,
    placeholder: 'Ім\'я клієнта', autocomplete: 'off', enterkeyhint: 'done',
  });
  const error = h('p', { class: 'field-error', role: 'alert' });
  input.addEventListener('input', () => { error.textContent = ''; });
  let busy = false;
  const form = h('form', {
    class: 'form', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      if (busy) return;
      const name = cleanName(input.value);
      if (!name) {
        error.textContent = 'Вкажіть ім\'я клієнта';
        input.focus();
        return;
      }
      busy = true;
      try {
        await onSubmit(name);
        handle.close();
      } catch (err) {
        console.error(err);
        toast('Не вдалося зберегти. Спробуйте ще раз.');
      } finally {
        busy = false;
      }
    },
  },
  h('label', { class: 'label', for: 'client-name' }, 'Ім\'я'),
  input,
  error,
  h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, submitText));
  const handle = sheet(form, { title });
  setTimeout(() => { input.focus(); input.select(); }, 50);
  return handle;
}

export async function renderClients(container, ctx) {
  const { store, rerender } = ctx;
  const clients = (await store.all('clients')).sort(byName);

  const addClient = () => openNameSheet({
    title: 'Новий клієнт',
    submitText: 'Додати',
    onSubmit: async (name) => {
      await store.put('clients', { id: uuid(), name });
      toast('Клієнта додано');
      await rerender();
    },
  });

  const banner = await backupBanner(ctx);

  if (!clients.length) {
    mount(container, h('div', { class: 'screen' },
      h('h1', null, 'Клієнти'),
      banner,
      h('div', { class: 'card empty-state' },
        h('h2', null, 'Додайте першого клієнта'),
        h('p', { class: 'muted' }, 'Для кожного клієнта ведуться записи підходів, графіки і налаштування тренажерів.'),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: addClient }, 'Додати клієнта'))));
    return;
  }

  const list = h('ul', { class: 'client-list' });
  const noMatch = h('p', { class: 'muted', hidden: true }, 'Нікого не знайдено');
  const search = h('input', {
    class: 'input', type: 'search', placeholder: 'Пошук за іменем', 'aria-label': 'Пошук клієнта',
    autocomplete: 'off',
  });

  const rowActions = (client) => sheet((close) => h('div', { class: 'stack' },
    h('button', {
      class: 'btn btn-big', type: 'button',
      onclick: () => {
        close();
        openNameSheet({
          title: 'Перейменувати', initial: client.name, submitText: 'Зберегти',
          onSubmit: async (name) => {
            await store.put('clients', { ...client, name });
            toast('Збережено');
            await rerender();
          },
        });
      },
    }, 'Перейменувати'),
    h('button', {
      class: 'btn btn-danger btn-big', type: 'button',
      onclick: async () => {
        close();
        const ok = await confirmDialog(
          `Видалити клієнта «${client.name}» разом з усіма його записами й налаштуваннями? Це не можна скасувати.`,
          { ok: 'Видалити', danger: true });
        if (!ok) return;
        try {
          await deleteClient(store, client.id);
          toast('Клієнта видалено');
          await rerender();
        } catch (err) {
          console.error(err);
          toast('Не вдалося видалити. Спробуйте ще раз.');
        }
      },
    }, 'Видалити')), { title: client.name });

  const rows = clients.map((client) => ({
    client,
    el: h('li', { class: 'client-row' },
      h('a', { class: 'client-link', href: `#/client/${encodeURIComponent(client.id)}` }, client.name),
      h('button', {
        class: 'btn-icon', type: 'button', 'aria-label': `Дії: ${client.name}`, onclick: () => rowActions(client),
      }, '⋯')),
  }));
  list.append(...rows.map((r) => r.el));

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const r of rows) {
      const hit = !q || r.client.name.toLowerCase().includes(q);
      r.el.hidden = !hit;
      if (hit) shown++;
    }
    noMatch.hidden = shown > 0;
  });

  mount(container, h('div', { class: 'screen has-bar' },
    h('h1', null, 'Клієнти'),
    banner,
    search,
    list,
    noMatch,
    h('div', { class: 'log-bar' },
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: addClient }, '+ Додати клієнта'))));
}
