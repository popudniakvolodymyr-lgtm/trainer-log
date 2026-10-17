// Екран «Тренажери» (лише тренер): перейменувати тренажер (назва з сайту лишається дрібним підписом),
// додати свій, сховати/показати, вправи (додати/перейменувати/прибрати), регулювання
// (додати позиції / варіанти / «Ручку», перейменувати, уточнити кількість, прибрати), перейменувати варіанти.
// renderEquipment(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() }.

import { h, mount, sheet, toast, confirmDialog } from './dom.js';
import { GROUPS, WEIGHT_MODES } from '../core/model.js';
import {
  renameEquipment, setHidden, addEquipment, addExercise, renameExercise, removeExercise,
  addAdjustment, renameAdjustment, renameOption, addOption, setPositionCount, removeAdjustment, parseOptions,
} from '../schemes/equipment-edit.js';
import { handleIcon } from '../schemes/handles.js';
import { APPROX_TEXT } from '../schemes/svg.js';

const live = (list) => (list || []).filter((x) => !x.deleted);

function sortEquipment(a, b) {
  const an = a.siteNo ?? Infinity;
  const bn = b.siteNo ?? Infinity;
  if (an !== bn) return an - bn;
  return a.name.localeCompare(b.name, 'uk');
}

const siteText = (eq) => (eq.siteName ? `З сайту${eq.siteNo ? ` №${eq.siteNo}` : ''}: «${eq.siteName}»` : 'Свій тренажер');

/** Поле + кнопка в один рядок. onSave(value) може кинути Error — текст піде в toast. */
function inlineEdit({ value = '', placeholder = '', button = 'Зберегти', type = 'text', label, onSave, inputAttrs = {} }) {
  const input = h('input', {
    class: 'input', type, value: String(value), placeholder, 'aria-label': label || placeholder,
    autocomplete: 'off', enterkeyhint: 'done', ...inputAttrs,
  });
  const form = h('form', {
    class: 'eq-inline', novalidate: true,
    onsubmit: (e) => {
      e.preventDefault();
      onSave(input.value, input);
    },
  }, input, h('button', { class: 'btn btn-small', type: 'submit' }, button));
  return form;
}

const kindText = (a) => {
  if (a.id === 'handle') return 'Ручка — 5 малюнків';
  if (a.kind === 'positions') return `Позиції 1…${a.count}`;
  return `Варіанти: ${live(a.options).length}`;
};

/** Нижня панель редагування одного тренажера. Після закриття — onDone(changed). */
function openEditor(store, initial, onDone) {
  let eq = initial;
  let changed = false;
  const body = h('div', { class: 'eq-editor' });

  async function commit(fn, okText = 'Збережено') {
    let next;
    try {
      next = fn(eq);
    } catch (err) {
      toast(err.message || 'Перевірте введене');
      return false;
    }
    try {
      await store.put('equipment', next);
    } catch (err) {
      console.error(err);
      toast('Не вдалося зберегти. Спробуйте ще раз.');
      return false;
    }
    eq = (await store.get('equipment', eq.id)) || next;
    changed = true;
    draw();
    toast(okText);
    return true;
  }

  function adjustmentItem(a) {
    const parts = [
      h('div', { class: 'eq-item-head' },
        h('span', { class: 'eq-item-title' }, a.label),
        h('span', { class: 'eq-tag' }, kindText(a))),
      inlineEdit({ value: a.label, label: 'Назва регулювання', onSave: (v) => commit((e) => renameAdjustment(e, a.id, v)) }),
    ];
    if (a.kind === 'positions') {
      if (a.approx || a.unknown) {
        parts.push(h('p', { class: 'approx' }, APPROX_TEXT),
          h('p', { class: 'eq-sub' }, 'Подивились у залі — впишіть точну кількість позицій, позначка зникне.'));
      }
      parts.push(inlineEdit({
        value: a.count, type: 'number', label: 'Кількість позицій', button: 'Позицій',
        inputAttrs: { min: 2, max: 30, inputmode: 'numeric' },
        onSave: (v) => commit((e) => setPositionCount(e, a.id, v)),
      }));
    } else if (a.id === 'handle') {
      parts.push(h('div', { class: 'eq-kind' }, live(a.options).map((o) => h('span', { class: 'opt-pic opt-pic-small', title: o.label, html: handleIcon(o.id, { width: 54, height: 36 }) }))));
    } else {
      parts.push(h('div', { class: 'eq-opts' },
        live(a.options).map((o) => h('div', { class: 'eq-inline' },
          o.color ? h('span', { class: 'swatch', style: { background: o.color } }) : null,
          inlineEdit({ value: o.label, label: 'Назва варіанта', onSave: (v) => commit((e) => renameOption(e, a.id, o.id, v)) }))),
        inlineEdit({ placeholder: 'Новий варіант', button: 'Додати', onSave: (v) => commit((e) => addOption(e, a.id, v), 'Варіант додано') })));
    }
    parts.push(h('button', {
      class: 'btn btn-small btn-link-danger', type: 'button',
      onclick: async () => {
        const ok = await confirmDialog(`Прибрати регулювання «${a.label}»? Значення клієнтів для нього більше не показуватимуться.`, { ok: 'Прибрати', danger: true });
        if (ok) commit((e) => removeAdjustment(e, a.id), 'Регулювання прибрано');
      },
    }, 'Прибрати регулювання'));
    return h('div', { class: 'eq-item' }, parts);
  }

  function addAdjustmentForm() {
    const hasHandle = live(eq.adjustments).some((a) => a.id === 'handle');
    let kind = 'positions';
    const label = h('input', { class: 'input', type: 'text', placeholder: 'Назва, напр. «Валик»', 'aria-label': 'Назва регулювання', autocomplete: 'off' });
    const count = h('input', { class: 'input', type: 'number', min: 2, max: 30, value: 5, inputmode: 'numeric', 'aria-label': 'Кількість позицій' });
    const options = h('textarea', { class: 'input', rows: 3, placeholder: 'Кожен варіант з нового рядка', 'aria-label': 'Варіанти' });
    const countRow = h('label', { class: 'eq-inline' }, h('span', null, 'Позицій:'), count);
    const optsRow = h('div', null, options);
    const kinds = [['positions', 'Позиції 1…N'], ['options', 'Варіанти'], ...(hasHandle ? [] : [['handle', 'Ручка']])];
    const sync = () => {
      countRow.hidden = kind !== 'positions';
      optsRow.hidden = kind !== 'options';
      label.hidden = kind === 'handle';
    };
    const radios = h('div', { class: 'eq-kind', role: 'radiogroup' }, kinds.map(([k, text]) => h('label', null,
      h('input', { type: 'radio', name: 'adj-kind', value: k, checked: k === kind, onchange: () => { kind = k; sync(); } }),
      text)));
    sync();
    return h('form', {
      class: 'eq-section', novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        const spec = kind === 'handle' ? { kind }
          : kind === 'positions' ? { kind, label: label.value, count: count.value }
            : { kind, label: label.value, options: parseOptions(options.value) };
        commit((x) => addAdjustment(x, spec), 'Регулювання додано');
      },
    },
    h('h3', null, 'Додати регулювання'),
    radios, label, countRow, optsRow,
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Додати регулювання'));
  }

  function draw() {
    const exercises = live(eq.exercises);
    mount(body,
      h('section', { class: 'eq-section' },
        h('h3', null, 'Назва'),
        inlineEdit({ value: eq.name, label: 'Назва тренажера', onSave: (v) => commit((e) => renameEquipment(e, v)) }),
        h('p', { class: 'eq-sub' }, siteText(eq)),
        h('p', { class: 'eq-sub' }, `${GROUPS[eq.group] || ''} · ${WEIGHT_MODES[eq.weightMode] || ''}`),
        h('button', {
          class: 'btn', type: 'button',
          onclick: () => commit((e) => setHidden(e, !e.hidden), eq.hidden ? 'Тренажер знову в меню' : 'Тренажер сховано з меню'),
        }, eq.hidden ? 'Показати в меню клієнтів' : 'Сховати з меню клієнтів')),
      h('section', { class: 'eq-section' },
        h('h3', null, 'Вправи'),
        exercises.map((x) => h('div', { class: 'eq-item' },
          inlineEdit({ value: x.name, label: 'Назва вправи', onSave: (v) => commit((e) => renameExercise(e, x.id, v)) }),
          exercises.length > 1 ? h('button', {
            class: 'btn btn-small btn-link-danger', type: 'button',
            onclick: async () => {
              const ok = await confirmDialog(`Прибрати вправу «${x.name}»? Її записи сховаються разом із нею.`, { ok: 'Прибрати', danger: true });
              if (ok) commit((e) => removeExercise(e, x.id), 'Вправу прибрано');
            },
          }, 'Прибрати вправу') : null)),
        inlineEdit({ placeholder: 'Нова вправа', button: 'Додати', label: 'Нова вправа', onSave: (v) => commit((e) => addExercise(e, v), 'Вправу додано') })),
      h('section', { class: 'eq-section' },
        h('h3', null, 'Регулювання'),
        eq.schemeId ? h('p', { class: 'eq-sub' }, 'Для цього тренажера намальовано схему.') : h('p', { class: 'eq-sub' }, 'Схеми ще немає — регулювання показуються списком.'),
        live(eq.adjustments).length
          ? live(eq.adjustments).map(adjustmentItem)
          : h('p', { class: 'muted' }, 'Регулювань ще не додано.')),
      addAdjustmentForm());
  }

  draw();
  const handle = sheet(body, { title: eq.name });
  handle.closed.then(() => onDone(changed));
  return handle;
}

/** Панель «Новий тренажер». onCreated(equipment). */
function openAddSheet(store, onCreated) {
  const name = h('input', { class: 'input', type: 'text', id: 'eq-name', maxlength: 80, autocomplete: 'off', placeholder: 'Напр. «Смітт»' });
  const group = h('select', { class: 'input', id: 'eq-group' },
    Object.entries(GROUPS).map(([id, label]) => h('option', { value: id }, label)));
  const mode = h('select', { class: 'input', id: 'eq-mode' },
    Object.entries(WEIGHT_MODES).map(([id, label]) => h('option', { value: id }, label)));
  const exercise = h('input', { class: 'input', type: 'text', id: 'eq-ex', maxlength: 80, autocomplete: 'off', placeholder: 'Як назва тренажера' });
  const error = h('p', { class: 'field-error', role: 'alert' });
  let busy = false;
  const form = h('form', {
    class: 'form', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      if (busy) return;
      let eq;
      try {
        eq = addEquipment({ name: name.value, group: group.value, weightMode: mode.value, exerciseName: exercise.value });
      } catch (err) {
        error.textContent = err.message;
        return;
      }
      busy = true;
      try {
        await store.put('equipment', eq);
        handle.close();
        toast('Тренажер додано');
        onCreated(await store.get('equipment', eq.id) || eq);
      } catch (err) {
        console.error(err);
        toast('Не вдалося зберегти. Спробуйте ще раз.');
      } finally {
        busy = false;
      }
    },
  },
  h('label', { class: 'label', for: 'eq-name' }, 'Назва'), name,
  h('label', { class: 'label', for: 'eq-group' }, 'Група м\'язів'), group,
  h('label', { class: 'label', for: 'eq-mode' }, 'Тип ваги'), mode,
  h('label', { class: 'label', for: 'eq-ex' }, 'Перша вправа (необов\'язково)'), exercise,
  error,
  h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Додати тренажер'));
  name.addEventListener('input', () => { error.textContent = ''; });
  const handle = sheet(form, { title: 'Новий тренажер' });
  setTimeout(() => name.focus(), 50);
  return handle;
}

export async function renderEquipment(container, ctx) {
  const { store } = ctx;
  const all = live(await store.all('equipment')).sort(sortEquipment);
  const refresh = () => renderEquipment(container, ctx);
  const edit = (eq) => openEditor(store, eq, (changed) => { if (changed) refresh(); });

  const listBox = h('div');
  const search = h('input', {
    class: 'input', type: 'search', placeholder: 'Пошук тренажера', 'aria-label': 'Пошук тренажера', autocomplete: 'off',
  });

  const drawList = () => {
    const q = search.value.trim().toLowerCase();
    const shown = q
      ? all.filter((e) => `${e.name} ${e.siteName || ''}`.toLowerCase().includes(q))
      : all;
    if (!shown.length) {
      mount(listBox, h('p', { class: 'muted' }, 'Нічого не знайдено.'));
      return;
    }
    mount(listBox, Object.entries(GROUPS).map(([gid, gname]) => {
      const items = shown.filter((e) => e.group === gid);
      if (!items.length) return null;
      return [
        h('h2', { class: 'eq-group' }, gname),
        h('ul', { class: 'eq-list' }, items.map((e) => h('li', null,
          h('button', { class: `eq-row${e.hidden ? ' is-hidden' : ''}`, type: 'button', dataset: { eq: e.id }, onclick: () => edit(e) },
            h('span', { class: 'eq-row-main' },
              h('span', { class: 'eq-row-name' }, e.name),
              e.siteName && e.siteName !== e.name ? h('span', { class: 'eq-row-site' }, e.siteName) : null),
            e.hidden ? h('span', { class: 'eq-tag eq-tag-hidden' }, 'сховано') : null,
            e.schemeId ? h('span', { class: 'eq-tag' }, 'схема') : null,
            h('span', { 'aria-hidden': 'true' }, '›'))))),
      ];
    }));
  };
  search.addEventListener('input', drawList);
  drawList();

  mount(container, h('div', { class: 'screen eq-screen' },
    h('h1', null, 'Тренажери'),
    h('p', { class: 'muted' }, 'Назви, вправи й регулювання. Зміни видно в картках усіх клієнтів.'),
    h('button', {
      class: 'btn btn-primary btn-big', type: 'button',
      onclick: () => openAddSheet(store, (eq) => { refresh(); edit(eq); }),
    }, '+ Додати свій тренажер'),
    h('div', { class: 'eq-toolbar' }, search),
    listBox));
}
