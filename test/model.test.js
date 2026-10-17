import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  uuid, today, GROUPS, WEIGHT_MODES, validateSet, formatSet, formatDate,
} from '../src/core/model.js';

// --- uuid / today / довідники -------------------------------------------

test('uuid дає різні рядки формату UUID', () => {
  const a = uuid();
  const b = uuid();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(a, b);
});

test('today — локальна дата YYYY-MM-DD', () => {
  assert.equal(today(new Date(2026, 9, 7, 23, 59)), '2026-10-07');
  assert.equal(today(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test('GROUPS — 9 груп у порядку меню з українськими назвами', () => {
  assert.deepEqual(Object.keys(GROUPS),
    ['chest', 'legs', 'shoulders', 'abs', 'arms', 'back', 'dumbbells', 'bar', 'cardio']);
  assert.deepEqual(Object.values(GROUPS),
    ['Груди', 'Ноги', 'Плечі', 'Прес', 'Руки', 'Спина', 'Гантелі', 'Турнік', 'Кардіо']);
});

test('WEIGHT_MODES — чотири типи ваги', () => {
  assert.deepEqual(Object.keys(WEIGHT_MODES).sort(), ['bodyweight', 'cardio', 'perHand', 'single']);
  for (const label of Object.values(WEIGHT_MODES)) assert.ok(label.length > 0);
});

// --- validateSet: single --------------------------------------------------

test('single: звичайний підхід, кома в вазі', () => {
  assert.deepEqual(validateSet('single', { reps: '10', weight: '42,5' }),
    { ok: true, set: { reps: 10, weight: 42.5 } });
  assert.deepEqual(validateSet('single', { reps: 8, weight: 40 }),
    { ok: true, set: { reps: 8, weight: 40 } });
  assert.deepEqual(validateSet('single', { reps: ' 12 ', weight: '37.5' }),
    { ok: true, set: { reps: 12, weight: 37.5 } });
});

test('single: порожні поля — помилки українською на кожному полі', () => {
  const r = validateSet('single', { reps: '', weight: '' });
  assert.equal(r.ok, false);
  assert.match(r.errors.reps, /повтор/i);
  assert.match(r.errors.weight, /ваг/i);
});

test('single: 0 повторень, від\'ємна вага, букви, дробові повторення', () => {
  const zero = validateSet('single', { reps: '0', weight: '20' });
  assert.equal(zero.ok, false);
  assert.match(zero.errors.reps, /більше 0/);

  const neg = validateSet('single', { reps: '10', weight: '-5' });
  assert.equal(neg.ok, false);
  assert.match(neg.errors.weight, /від'ємн/);

  const letters = validateSet('single', { reps: 'десять', weight: '20кг' });
  assert.equal(letters.ok, false);
  assert.match(letters.errors.reps, /числ/);
  assert.match(letters.errors.weight, /числ/);

  const frac = validateSet('single', { reps: '7,5', weight: '20' });
  assert.equal(frac.ok, false);
  assert.match(frac.errors.reps, /ціл/);

  const negReps = validateSet('single', { reps: '-3', weight: '20' });
  assert.equal(negReps.ok, false);
  assert.ok(negReps.errors.reps);
});

test('single: помилки мають лише поля з помилкою', () => {
  const r = validateSet('single', { reps: '10', weight: '' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors), ['weight']);
});

// --- validateSet: perHand -------------------------------------------------

test('perHand: ліва і права різні, кома', () => {
  assert.deepEqual(validateSet('perHand', { reps: '10', left: '20', right: '22,5' }),
    { ok: true, set: { reps: 10, left: 20, right: 22.5 } });
});

test('perHand: обидві руки обов\'язкові, не від\'ємні', () => {
  const r = validateSet('perHand', { reps: '10', left: '', right: '-1' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.left);
  assert.match(r.errors.right, /від'ємн/);
  assert.equal(r.errors.reps, undefined);
  const z = validateSet('perHand', { reps: '0', left: '10', right: '10' });
  assert.equal(z.ok, false);
  assert.ok(z.errors.reps);
});

// --- validateSet: bodyweight ----------------------------------------------

test('bodyweight: додаткова вага необов\'язкова', () => {
  assert.deepEqual(validateSet('bodyweight', { reps: '12', extra: '' }),
    { ok: true, set: { reps: 12, extra: null } });
  assert.deepEqual(validateSet('bodyweight', { reps: '12' }),
    { ok: true, set: { reps: 12, extra: null } });
  assert.deepEqual(validateSet('bodyweight', { reps: '6', extra: '7,5' }),
    { ok: true, set: { reps: 6, extra: 7.5 } });
});

test('bodyweight: помилки повторень і додаткової ваги', () => {
  const r = validateSet('bodyweight', { reps: '', extra: 'abc' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.reps);
  assert.match(r.errors.extra, /числ/);
  const z = validateSet('bodyweight', { reps: '0' });
  assert.equal(z.ok, false);
  assert.ok(z.errors.reps);
});

// --- validateSet: cardio --------------------------------------------------

test('cardio: тривалість обов\'язкова, км і ккал необов\'язкові', () => {
  assert.deepEqual(validateSet('cardio', { minutes: '30', km: '5,2', kcal: '' }),
    { ok: true, set: { minutes: 30, km: 5.2, kcal: null } });
  assert.deepEqual(validateSet('cardio', { minutes: '20' }),
    { ok: true, set: { minutes: 20, km: null, kcal: null } });
  assert.deepEqual(validateSet('cardio', { minutes: '45', km: '', kcal: '310' }),
    { ok: true, set: { minutes: 45, km: null, kcal: 310 } });
});

test('cardio: порожня/нульова тривалість, від\'ємні км, букви в ккал', () => {
  const e = validateSet('cardio', { minutes: '' });
  assert.equal(e.ok, false);
  assert.match(e.errors.minutes, /тривал/i);
  const z = validateSet('cardio', { minutes: '0' });
  assert.equal(z.ok, false);
  assert.match(z.errors.minutes, /більше 0/);
  const r = validateSet('cardio', { minutes: '30', km: '-2', kcal: 'багато' });
  assert.equal(r.ok, false);
  assert.match(r.errors.km, /від'ємн/);
  assert.match(r.errors.kcal, /числ/);
});

test('невідомий тип ваги — помилка, а не виняток', () => {
  const r = validateSet('rocket', { reps: '1' });
  assert.equal(r.ok, false);
});

// --- formatSet --------------------------------------------------------------

test('formatSet для всіх типів', () => {
  assert.equal(formatSet('single', { reps: 10, weight: 40 }), '10 × 40 кг');
  assert.equal(formatSet('single', { reps: 8, weight: 42.5 }), '8 × 42,5 кг');
  assert.equal(formatSet('perHand', { reps: 10, left: 20, right: 22.5 }), '10 × Л 20 / П 22,5 кг');
  assert.equal(formatSet('bodyweight', { reps: 12, extra: null }), '12 повт.');
  assert.equal(formatSet('bodyweight', { reps: 6, extra: 7.5 }), '6 × +7,5 кг');
  assert.equal(formatSet('cardio', { minutes: 30, km: 5, kcal: null }), '30 хв · 5 км');
  assert.equal(formatSet('cardio', { minutes: 20, km: null, kcal: null }), '20 хв');
  assert.equal(formatSet('cardio', { minutes: 45, km: 6.4, kcal: 310 }), '45 хв · 6,4 км · 310 ккал');
});

// --- formatDate -------------------------------------------------------------

test('formatDate: YYYY-MM-DD → ДД.ММ.РРРР', () => {
  assert.equal(formatDate('2026-10-17'), '17.10.2026');
  assert.equal(formatDate('2026-01-05'), '05.01.2026');
});
