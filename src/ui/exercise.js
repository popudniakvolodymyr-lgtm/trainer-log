// Екран вправи: перемикач вправ, схема (малює таск 03), графік, запис підходу, історія.
// renderExercise(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() },
// params = { clientId, equipmentId, exerciseId?, date? } — date ('YYYY-MM-DD', з ?date= у хеші, перевіряє
// app.js): запис на цей день з «Календаря»; форма нового підходу відкривається вже з цією датою.
// Після запису, правки й видалення підходу екран перемальовується на тій самій прокрутці.

import { h, mount, toast, confirmDialog } from './dom.js';
import { formatDate, formatSet, weightStep, today } from '../core/model.js';
import { chartSeries } from '../core/chartdata.js';
import { renderChart } from './chart.js';
import { renderScheme } from '../schemes/index.js';
import { openSetForm, openSettingPicker } from './log-form.js';
import {
  listSessions, lastSet, addSet, updateSet, deleteSet, settingValues, saveSetting, clearSetting,
} from './log-data.js';

const exHref = (clientId, equipmentId, exerciseId, date = null) =>
  `#/client/${encodeURIComponent(clientId)}/eq/${encodeURIComponent(equipmentId)}/${encodeURIComponent(exerciseId)}${date ? `?date=${date}` : ''}`;

// Прокрутка, на яку повернути екран після перемальовування (запис / правка / видалення підходу).
let keepScrollY = null;

function notFound(container, ctx, text) {
  const { meta, params } = ctx;
  const back = meta.role === 'trainer' && params.clientId ? `#/client/${encodeURIComponent(params.clientId)}` : null;
  mount(container, h('div', { class: 'screen' },
    h('h1', null, text),
    back ? h('a', { class: 'btn btn-primary btn-big', href: back }, 'До картки клієнта') : null));
}

/**
 * Великий перемикач вправ (лише якщо їх кілька). Вкладка замінює поточний крок історії
 * (history.replaceState), а не додає новий: «назад» з будь-якої вкладки — у меню картки (Q5).
 */
function exerciseSwitcher(clientId, equipment, exercises, current, rerender, date = null) {
  if (exercises.length < 2) return null;
  const switchTo = (e, href, same) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (same) return;
    history.replaceState(history.state, '', href);
    rerender();
  };
  return h('nav', { class: 'ex-switch', role: 'tablist', 'aria-label': 'Вправа' },
    exercises.map((ex) => {
      const href = exHref(clientId, equipment.id, ex.id, date);
      return h('a', {
        class: `ex-tab${ex.id === current.id ? ' is-active' : ''}`,
        role: 'tab', 'aria-selected': ex.id === current.id ? 'true' : 'false',
        href,
        onclick: (e) => switchTo(e, href, ex.id === current.id),
      }, ex.name);
    }));
}

function historyView(weightMode, sessions, onEdit, onDelete) {
  if (!sessions.length) return h('p', { class: 'muted' }, 'Записів ще немає.');
  return h('div', { class: 'history' }, [...sessions].reverse().map((session) => h('section', { class: 'card history-day' },
    h('h3', { class: 'history-date' }, formatDate(session.date)),
    h('ol', { class: 'history-sets' }, session.sets.map((set, i) => h('li', { class: 'history-item' },
      h('button', {
        class: 'history-set', type: 'button', 'aria-label': `Змінити підхід ${i + 1}`,
        onclick: () => onEdit(session, i),
      }, h('span', { class: 'history-n' }, `${i + 1}.`), h('span', { class: 'history-text' }, formatSet(weightMode, set)),
      h('span', { class: 'history-edit', 'aria-hidden': 'true' }, '✎')),
      h('button', {
        class: 'history-del', type: 'button', 'aria-label': `Видалити підхід ${i + 1}`, title: 'Видалити підхід',
        onclick: () => onDelete(session, i),
      }, '🗑')))))));
}

export async function renderExercise(container, ctx) {
  const { store, meta, params, rerender } = ctx;
  const restoreY = keepScrollY;
  keepScrollY = null;
  const shown = restoreY === null ? null : { scrollY: restoreY };
  // Перемалювати екран, лишивши прокрутку y (зняту, коли відкрили форму чи натиснули 🗑).
  const stay = (y) => { keepScrollY = Number.isFinite(y) ? y : window.scrollY; return rerender(); };
  const client = params.clientId ? await store.get('clients', params.clientId) : null;
  if (!client || client.deleted) return notFound(container, ctx, 'Клієнта не знайдено');
  const equipment = params.equipmentId ? await store.get('equipment', params.equipmentId) : null;
  if (!equipment || equipment.deleted) return notFound(container, ctx, 'Тренажер не знайдено');

  const exercises = (equipment.exercises || []).filter((e) => !e.deleted);
  if (!exercises.length) return notFound(container, ctx, 'У тренажера немає вправ');
  const exercise = exercises.find((e) => e.id === params.exerciseId) || exercises[0];
  const weightMode = equipment.weightMode;
  const role = meta.role;

  const sessions = await listSessions(store, client.id, { exerciseId: exercise.id });
  const values = await settingValues(store, client.id, exercise.id);

  // --- запис і правка ---
  const common = { clientId: client.id, equipmentId: equipment.id, exerciseId: exercise.id };

  const step = weightStep(equipment);
  const todayStr = today();
  const logDate = params.date && params.date <= todayStr ? params.date : todayStr;
  // Свіжий список сесій на момент збереження: «Зберегти й додати ще» підставляє щойно записане.
  let current = sessions;
  const record = () => {
    const y = window.scrollY;
    openSetForm({
      weightMode,
      step,
      title: 'Новий підхід',
      date: logDate,
      initial: lastSet(current, { upTo: logDate }),
      initialFor: (date) => lastSet(current, { upTo: date }),
      allowAgain: true,
      onSave: async (set, date) => {
        await addSet(store, { ...common, set, date: date || todayStr });
        current = await listSessions(store, client.id, { exerciseId: exercise.id });
        await stay(y);
      },
    });
  };

  const deleteText = (session, index) =>
    `Видалити підхід ${formatSet(weightMode, session.sets[index])} від ${formatDate(session.date)}?`;
  const remove = async (session, index) => {
    await deleteSet(store, session, index);
    toast('Підхід видалено');
  };

  const edit = (session, index) => {
    const y = window.scrollY;
    openSetForm({
      weightMode,
      step,
      title: `Підхід ${index + 1} · ${formatDate(session.date)}`,
      initial: session.sets[index],
      deleteText: deleteText(session, index),
      onSave: async (set) => {
        await updateSet(store, session, index, set);
        toast('Збережено');
        await stay(y);
      },
      onDelete: async () => {
        await remove(session, index);
        await stay(y);
      },
    });
  };

  // 🗑 в історії: підтвердження, м'яке видалення, екран на тому ж місці. «Скасувати» нічого не змінює.
  let deleting = false;
  const askDelete = async (session, index) => {
    if (deleting) return;
    const y = window.scrollY;
    const ok = await confirmDialog(deleteText(session, index), { ok: 'Видалити', cancel: 'Скасувати', danger: true });
    if (!ok) return;
    deleting = true;
    try {
      await remove(session, index);
      await stay(y);
    } catch (err) {
      console.error(err);
      toast('Не вдалося видалити. Спробуйте ще раз.');
    } finally {
      deleting = false;
    }
  };

  // --- схема: малюнок + мітки + список регулювань (renderScheme); вибір значення вона
  //     зберігає сама через store, onPick — запасний шлях, якщо схема лише повідомляє про натиск ---
  const onPick = (adjustmentId) => {
    const adjustment = (equipment.adjustments || []).find((a) => a.id === adjustmentId && !a.deleted);
    if (!adjustment) return;
    openSettingPicker({
      adjustment,
      current: values[adjustmentId],
      onChoose: async (value) => {
        await saveSetting(store, { ...common, adjustmentId, value, by: role });
        await rerender();
      },
      onClear: async () => {
        await clearSetting(store, client.id, exercise.id, adjustmentId);
        await rerender();
      },
    });
  };

  const schemeBox = h('div', { class: 'scheme-box' });
  renderScheme(schemeBox, equipment, exercise.id, values, {
    onPick, store, clientId: client.id, role, rerender,
  });

  const chartBox = h('div', { class: 'chart-box' });
  renderChart(chartBox, chartSeries(weightMode, sessions));

  const showSub = equipment.siteName && equipment.siteName !== equipment.name ? equipment.siteName : null;
  const singleName = exercises.length === 1 && exercise.name !== equipment.name ? exercise.name : null;

  mount(container, h('div', { class: 'screen has-bar' },
    h('header', { class: 'ex-head' },
      h('h1', null, equipment.name),
      showSub || singleName || role === 'trainer'
        ? h('p', { class: 'muted ex-sub' }, [showSub, singleName, role === 'trainer' ? client.name : null].filter(Boolean).join(' · '))
        : null),
    exerciseSwitcher(client.id, equipment, exercises, exercise, rerender, params.date || null),
    schemeBox,
    h('section', { class: 'ex-section' }, h('h2', null, 'Графік'), chartBox),
    h('section', { class: 'ex-section' }, h('h2', null, 'Історія'), historyView(weightMode, sessions, edit, askDelete)),
    h('div', { class: 'log-bar' },
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: record },
        logDate === todayStr ? 'Записати підхід' : `Записати на ${formatDate(logDate)}`))));
  return shown;
}
