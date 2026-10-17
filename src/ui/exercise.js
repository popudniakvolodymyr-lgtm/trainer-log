// Екран вправи: перемикач вправ, схема (малює таск 03), графік, запис підходу, історія.
// renderExercise(container, ctx), ctx = { store, meta, params, navigate(hash), rerender() },
// params = { clientId, equipmentId, exerciseId? }.

import { h, mount, toast } from './dom.js';
import { formatDate, formatSet } from '../core/model.js';
import { chartSeries } from '../core/chartdata.js';
import { renderChart } from './chart.js';
import { renderScheme } from '../schemes/index.js';
import { openSetForm, openSettingPicker } from './log-form.js';
import {
  listSessions, lastSet, addSet, updateSet, deleteSet, settingValues, saveSetting, clearSetting,
} from './log-data.js';

const exHref = (clientId, equipmentId, exerciseId) =>
  `#/client/${encodeURIComponent(clientId)}/eq/${encodeURIComponent(equipmentId)}/${encodeURIComponent(exerciseId)}`;

function notFound(container, ctx, text) {
  const { meta, params } = ctx;
  const back = meta.role === 'trainer' && params.clientId ? `#/client/${encodeURIComponent(params.clientId)}` : null;
  mount(container, h('div', { class: 'screen' },
    h('h1', null, text),
    back ? h('a', { class: 'btn btn-primary btn-big', href: back }, 'До картки клієнта') : null));
}

/** Великий перемикач вправ (лише якщо їх кілька). */
function exerciseSwitcher(clientId, equipment, exercises, current) {
  if (exercises.length < 2) return null;
  return h('nav', { class: 'ex-switch', role: 'tablist', 'aria-label': 'Вправа' },
    exercises.map((ex) => h('a', {
      class: `ex-tab${ex.id === current.id ? ' is-active' : ''}`,
      role: 'tab', 'aria-selected': ex.id === current.id ? 'true' : 'false',
      href: exHref(clientId, equipment.id, ex.id),
    }, ex.name)));
}

function historyView(weightMode, sessions, onEdit) {
  if (!sessions.length) return h('p', { class: 'muted' }, 'Записів ще немає.');
  return h('div', { class: 'history' }, [...sessions].reverse().map((session) => h('section', { class: 'card history-day' },
    h('h3', { class: 'history-date' }, formatDate(session.date)),
    h('ol', { class: 'history-sets' }, session.sets.map((set, i) => h('li', null,
      h('button', {
        class: 'history-set', type: 'button', 'aria-label': `Змінити підхід ${i + 1}`,
        onclick: () => onEdit(session, i),
      }, h('span', { class: 'history-n' }, `${i + 1}.`), h('span', { class: 'history-text' }, formatSet(weightMode, set)),
      h('span', { class: 'history-edit', 'aria-hidden': 'true' }, '✎'))))))));
}

export async function renderExercise(container, ctx) {
  const { store, meta, params, rerender } = ctx;
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

  const record = () => openSetForm({
    weightMode,
    title: 'Новий підхід',
    initial: lastSet(sessions),
    allowAgain: true,
    onSave: async (set) => {
      await addSet(store, { ...common, set });
      await rerender();
    },
  });

  const edit = (session, index) => openSetForm({
    weightMode,
    title: `Підхід ${index + 1} · ${formatDate(session.date)}`,
    initial: session.sets[index],
    onSave: async (set) => {
      await updateSet(store, session, index, set);
      toast('Збережено');
      await rerender();
    },
    onDelete: async () => {
      await deleteSet(store, session, index);
      toast('Підхід видалено');
      await rerender();
    },
  });

  // --- схема: малює таск 03; вибір значення вона зберігає сама через store/rerender,
  //     а onPick — запасний шлях (панель вибору), якщо схема лише повідомляє про натиск ---
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
    exerciseSwitcher(client.id, equipment, exercises, exercise),
    schemeBox,
    h('section', { class: 'ex-section' }, h('h2', null, 'Графік'), chartBox),
    h('section', { class: 'ex-section' }, h('h2', null, 'Історія'), historyView(weightMode, sessions, edit)),
    h('div', { class: 'log-bar' },
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: record }, 'Записати підхід'))));
}
