// Вкладка «Сьогодні» картки клієнта й спільний список виконаного за день (його ж показує «Календар»).
// Чисті функції (groupByDay, daySessions, dayEntries, pastWorkoutDate) — без DOM, їх тестує test/today.test.js.
// Порядок виконання: у сесії немає часу створення, тож за порядок править updatedAt (останній підхід).

import { h } from './dom.js';
import { formatSet } from '../core/model.js';

const hasSets = (s) => s && !s.deleted && Array.isArray(s.sets) && s.sets.length > 0;
const byUpdated = (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0);

/** Дні з записами: { 'YYYY-MM-DD': Session[] } — у порядку виконання; без видалених і порожніх сесій. */
export function groupByDay(sessions) {
  const days = {};
  for (const s of sessions || []) {
    if (!hasSets(s)) continue;
    (days[s.date] ||= []).push(s);
  }
  for (const list of Object.values(days)) list.sort(byUpdated);
  return days;
}

/** Сесії одного дня у порядку виконання. */
export function daySessions(sessions, date) {
  return groupByDay(sessions)[date] || [];
}

/** Останній день з записами строго перед todayStr або null. */
export function pastWorkoutDate(sessions, todayStr) {
  const dates = Object.keys(groupByDay(sessions)).filter((d) => d < todayStr).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/**
 * Рядки списку дня: «тренажер · вправа — підходи» (формат підходів як в історії вправи).
 * → [{ equipmentId, exerciseId, title, sets: string[], text }]
 */
export function dayEntries(sessions, equipment) {
  const byId = new Map((equipment || []).map((e) => [e.id, e]));
  return (sessions || []).map((s) => {
    const eq = byId.get(s.equipmentId);
    const ex = eq && (eq.exercises || []).find((x) => x.id === s.exerciseId);
    const eqName = eq ? eq.name : 'Невідомий тренажер';
    const title = ex && ex.name && ex.name !== eqName ? `${eqName} · ${ex.name}` : eqName;
    const sets = s.sets.map((set) => formatSet(eq ? eq.weightMode : 'single', set));
    return { equipmentId: s.equipmentId, exerciseId: s.exerciseId, title, sets, text: `${title} — ${sets.join('; ')}` };
  });
}

const entryHref = (clientId, e) => {
  const base = `#/client/${encodeURIComponent(clientId)}/eq/${encodeURIComponent(e.equipmentId)}`;
  return e.exerciseId ? `${base}/${encodeURIComponent(e.exerciseId)}` : base;
};

/** Список виконаного за день: натиск відкриває тренажер (onLeave — запам'ятати місце перед переходом). */
export function dayList({ clientId, sessions, equipment, emptyText, onLeave = null }) {
  const entries = dayEntries(sessions, equipment);
  if (!entries.length) return h('p', { class: 'muted day-empty' }, emptyText);
  return h('ol', { class: 'day-list' }, entries.map((e) => h('li', null,
    h('a', { class: 'day-row card', href: entryHref(clientId, e), onclick: onLeave },
      h('span', { class: 'day-title' }, e.title),
      h('span', { class: 'day-sets' }, e.sets.map((t) => h('span', { class: 'day-set' }, t)))))));
}

/** Вкладка «Сьогодні». */
export function todayView({ clientId, sessions, equipment, todayStr, onLeave }) {
  return h('section', { class: 'day-view', 'aria-label': 'Сьогодні' },
    dayList({
      clientId, sessions: daySessions(sessions, todayStr), equipment, onLeave,
      emptyText: 'Сьогодні ще нічого не записано',
    }));
}
