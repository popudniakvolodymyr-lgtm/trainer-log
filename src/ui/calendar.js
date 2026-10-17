// Вкладка «Календар» картки клієнта: місяць із підсвіченими днями тренувань, список обраного дня,
// «Минуле тренування». Чисті функції (сітка, місяці, дні з записами) тестує test/today.test.js.

import { h } from './dom.js';
import { formatDate } from '../core/model.js';
import { dayList, daySessions, groupByDay, pastWorkoutDate } from './today.js';

export const MONTHS = Object.freeze(['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']);
export const WEEKDAYS = Object.freeze(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);

const pad = (n) => String(n).padStart(2, '0');
const parseMonth = (ym) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(ym));
  return { y: Number(m[1]), m: Number(m[2]) };
};

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export const monthOf = (date) => String(date).slice(0, 7);

/** Місяць ± кроки: ('2026-12', 1) → '2027-01'. */
export function shiftMonth(ym, delta) {
  const { y, m } = parseMonth(ym);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** '2026-10' → 'Жовтень 2026' */
export function monthTitle(ym) {
  const { y, m } = parseMonth(ym);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Тижні місяця з понеділка: масив по 7 клітинок, дата 'YYYY-MM-DD' або null (порожнє місце). */
export function monthGrid(ym) {
  const { y, m } = parseMonth(ym);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // пн = 0
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Дні, де є підходи (Set 'YYYY-MM-DD'). */
export const workoutDates = (sessions) => new Set(Object.keys(groupByDay(sessions)));

/**
 * Вкладка «Календар». view = { month?, day? } — де зупинилися (береться з history.state);
 * onView(patch) — повідомити про зміну (картка пише її в history.state без нового кроку історії).
 * Перемальовує себе на місці: прокрутка не стрибає.
 */
export function calendarView({ clientId, sessions, equipment, todayStr, view = {}, onView = () => {}, onLeave = null }) {
  const dates = workoutDates(sessions);
  const past = pastWorkoutDate(sessions, todayStr);
  let month = view.month || monthOf(view.day || todayStr);
  let day = view.day || null;

  const root = h('section', { class: 'cal', 'aria-label': 'Календар' });

  const draw = () => {
    const title = h('div', { class: 'cal-title', 'aria-live': 'polite' }, monthTitle(month));
    const nav = h('div', { class: 'cal-nav' },
      h('button', { class: 'btn cal-arrow', type: 'button', 'aria-label': 'Попередній місяць', onclick: () => go(-1) }, '‹'),
      title,
      h('button', { class: 'btn cal-arrow', type: 'button', 'aria-label': 'Наступний місяць', onclick: () => go(1) }, '›'));

    const head = h('div', { class: 'cal-row cal-head', 'aria-hidden': 'true' },
      WEEKDAYS.map((d) => h('span', { class: 'cal-wd' }, d)));
    const weeks = monthGrid(month).map((week) => h('div', { class: 'cal-row' }, week.map((date) => {
      if (!date) return h('span', { class: 'cal-day is-blank' });
      const has = dates.has(date);
      const cls = ['cal-day', has ? 'has-workout' : '', date === todayStr ? 'is-today' : '', date === day ? 'is-selected' : '']
        .filter(Boolean).join(' ');
      return h('button', {
        class: cls, type: 'button', dataset: { date },
        'aria-label': `${formatDate(date)}${has ? ', є тренування' : ''}`,
        'aria-pressed': date === day ? 'true' : 'false',
        onclick: () => pick(date),
      }, String(Number(date.slice(8))));
    })));

    const pastBtn = h('button', {
      class: 'btn btn-big cal-past', type: 'button', id: 'past-workout', disabled: !past,
      onclick: () => { if (past) pick(past); },
    }, 'Минуле тренування');

    const detail = day
      ? h('div', { class: 'cal-day-view' },
        h('h2', null, formatDate(day)),
        dayList({
          clientId, sessions: daySessions(sessions, day), equipment, onLeave,
          emptyText: 'Цього дня нічого не записано',
        }))
      : h('p', { class: 'muted' }, 'Оберіть день, щоб побачити, що робили.');

    root.replaceChildren(...[
      nav,
      h('div', { class: 'cal-grid', role: 'group', 'aria-label': monthTitle(month) }, head, ...weeks),
      pastBtn,
      past ? null : h('p', { class: 'muted' }, 'Раніше тренувань ще немає.'),
      detail,
    ].filter(Boolean));
  };

  function go(delta) {
    month = shiftMonth(month, delta);
    onView({ month, day });
    draw();
  }
  function pick(date) {
    day = date;
    month = monthOf(date);
    onView({ month, day });
    draw();
  }

  draw();
  return root;
}
