// «Сьогодні» і «Календар»: чиста логіка (групування за днем, минуле тренування, сітка місяця).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupByDay, daySessions, dayEntries, pastWorkoutDate } from '../src/ui/today.js';
import { MONTHS, WEEKDAYS, monthOf, shiftMonth, monthTitle, monthGrid, workoutDates, canAddOnDay } from '../src/ui/calendar.js';

const S = (id, date, exerciseId, equipmentId, sets, updatedAt, extra = {}) =>
  ({ id, clientId: 'c1', equipmentId, exerciseId, date, sets, updatedAt, ...extra });

const EQUIPMENT = [
  { id: 'eq-03', name: 'Метелик', weightMode: 'single', exercises: [{ id: 'eq-03-a', name: 'Зведення рук' }, { id: 'eq-03-b', name: 'Відведення рук назад' }] },
  { id: 'eq-04', name: 'Жим ногами лежачи', weightMode: 'legs', exercises: [{ id: 'eq-04-a', name: 'Жим ногами лежачи' }] },
  { id: 'eq-dumbbells', name: 'Гантелі', weightMode: 'perHand', exercises: [{ id: 'd-a', name: 'Підйом на біцепс' }] },
];

const SESSIONS = [
  S('s1', '2026-10-10', 'eq-03-a', 'eq-03', [{ reps: 10, weight: 40 }], 100),
  S('s2', '2026-10-17', 'eq-04-a', 'eq-04', [{ reps: 10, weight: 120, leg: null }, { reps: 8, weight: 60, leg: 'left' }], 300),
  S('s3', '2026-10-17', 'eq-03-b', 'eq-03', [{ reps: 12, weight: 22.5 }], 200),
  S('s4', '2026-10-18', 'eq-03-a', 'eq-03', [{ reps: 10, weight: 45 }], 400),
  S('s5', '2026-10-12', 'eq-03-a', 'eq-03', [{ reps: 5, weight: 5 }], 150, { deleted: true }),
  S('s6', '2026-10-14', 'eq-03-a', 'eq-03', [], 160),
];

test('groupByDay: дні → сесії в порядку виконання (за updatedAt), без видалених і порожніх', () => {
  const g = groupByDay(SESSIONS);
  assert.deepEqual(Object.keys(g).sort(), ['2026-10-10', '2026-10-17', '2026-10-18']);
  assert.deepEqual(g['2026-10-17'].map((s) => s.id), ['s3', 's2']);
});

test('daySessions: сесії одного дня; порожній день → []', () => {
  assert.deepEqual(daySessions(SESSIONS, '2026-10-18').map((s) => s.id), ['s4']);
  assert.deepEqual(daySessions(SESSIONS, '2026-10-11'), []);
});

test('dayEntries: «тренажер · вправа» і підходи у форматі історії, включно з «Дві ноги / Одна нога»', () => {
  const e = dayEntries(daySessions(SESSIONS, '2026-10-17'), EQUIPMENT);
  assert.equal(e.length, 2);
  assert.equal(e[0].title, 'Метелик · Відведення рук назад');
  assert.deepEqual(e[0].sets, ['12 × 22,5 кг']);
  assert.equal(e[0].equipmentId, 'eq-03');
  assert.equal(e[0].exerciseId, 'eq-03-b');
  // назва вправи збігається з тренажером — без повтору
  assert.equal(e[1].title, 'Жим ногами лежачи');
  assert.deepEqual(e[1].sets, ['10 × 120 кг', '8 × 60 кг · ліва нога']);
  assert.equal(e[1].text, 'Жим ногами лежачи — 10 × 120 кг; 8 × 60 кг · ліва нога');
});

test('dayEntries: невідомий тренажер не ламає список', () => {
  const e = dayEntries([S('x', '2026-10-18', 'zz-a', 'zz', [{ reps: 3, weight: 1 }], 1)], EQUIPMENT);
  assert.equal(e.length, 1);
  assert.match(e[0].title, /Невідомий тренажер/);
});

test('pastWorkoutDate: останній день з записами строго перед сьогоднішнім', () => {
  assert.equal(pastWorkoutDate(SESSIONS, '2026-10-18'), '2026-10-17');
  assert.equal(pastWorkoutDate(SESSIONS, '2026-10-17'), '2026-10-10');
  assert.equal(pastWorkoutDate(SESSIONS, '2026-10-10'), null);
  assert.equal(pastWorkoutDate([], '2026-10-18'), null);
});

test('календар: місяці українською, тиждень з понеділка', () => {
  assert.equal(MONTHS.length, 12);
  assert.equal(MONTHS[0], 'Січень');
  assert.equal(MONTHS[9], 'Жовтень');
  assert.equal(MONTHS[11], 'Грудень');
  assert.deepEqual(WEEKDAYS, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);
  assert.equal(monthTitle('2026-10'), 'Жовтень 2026');
});

test('monthOf / shiftMonth: перехід через межу року', () => {
  assert.equal(monthOf('2026-10-18'), '2026-10');
  assert.equal(shiftMonth('2026-10', 1), '2026-11');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});

test('monthGrid: жовтень 2026 — 1-ше четвер, 31-ше субота, 5 тижнів з понеділка', () => {
  const g = monthGrid('2026-10');
  assert.equal(g.length, 5);
  assert.ok(g.every((w) => w.length === 7));
  assert.deepEqual(g[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(g[4], ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
});

test('monthGrid: лютий 2027 починається з понеділка і має 28 днів — рівно 4 тижні; лютий 2028 — високосний', () => {
  const g = monthGrid('2027-02');
  assert.equal(g.length, 4);
  assert.equal(g[0][0], '2027-02-01');
  assert.equal(g[3][6], '2027-02-28');
  assert.equal(monthGrid('2028-02').flat().filter(Boolean).length, 29);
});

test('workoutDates: дні з підходами, без видалених і порожніх сесій', () => {
  assert.deepEqual([...workoutDates(SESSIONS)].sort(), ['2026-10-10', '2026-10-17', '2026-10-18']);
});

test('«Додати запис на цей день» — для сьогодні й минулих днів, не для майбутніх і не без вибраного дня', () => {
  assert.equal(canAddOnDay('2026-10-18', '2026-10-18'), true);
  assert.equal(canAddOnDay('2026-09-17', '2026-10-18'), true);
  assert.equal(canAddOnDay('2025-12-31', '2026-10-18'), true);
  assert.equal(canAddOnDay('2026-10-19', '2026-10-18'), false);
  assert.equal(canAddOnDay('2026-11-01', '2026-10-18'), false);
  assert.equal(canAddOnDay(null, '2026-10-18'), false);
});
