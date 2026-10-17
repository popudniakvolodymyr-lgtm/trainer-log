import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDLES, HANDLE_ADJUSTMENT, seedEquipment } from '../src/core/catalog.js';
import { GROUPS, WEIGHT_MODES } from '../src/core/model.js';

// Очікування — з gym/equipment.md, gym/adjustments.md і spec.md (не з коду під тестом).
const SITE = {
  1: ['Жим у блоці', 'chest'],
  2: ['Жим у тренажері', 'chest'],
  3: ['Зведення рук у тренажері', 'chest'],
  4: ['Жим ногами лежачи', 'legs'],
  5: ['Жим ногами сидячи', 'legs'],
  6: ['Зведення ніг у тренажері', 'legs'],
  7: ['Згинання ніг лежачи на тренажері', 'legs'],
  8: ['Присідання в тренажері «Гак-машина»', 'legs'],
  9: ['Розведення ніг у тренажері', 'legs'],
  10: ['Розгинання ніг у тренажері', 'legs'],
  12: ['Відведення рук у тренажері сидячи', 'shoulders'],
  13: ['Жим у блоці', 'shoulders'],
  14: ['Жим у тренажері сидячи', 'shoulders'],
  15: ['Ротація на прес', 'abs'],
  16: ['Скручування на прес', 'abs'],
  17: ['Віджимання в гравітроні', 'arms'],
  18: ['Жим на трицепс', 'arms'],
  19: ['Згинання рук у блоці', 'arms'],
  20: ['Підтягування в гравітроні', 'arms'],
  21: ['Вертикальна тяга в силовому тренажері', 'back'],
  22: ['Горизонтальна тяга у силовому тренажері', 'back'],
  23: ['Розгинання в блоці', 'back'],
  24: ['Тяга в блоці', 'back'],
  25: ['Тяга вертикального блоку', 'back'],
  26: ['Тяга горизонтального блоку', 'back'],
};
const PER_HAND = [2, 4, 8, 14, 21, 22];
const WITH_HANDLE = [18, 19, 23, 24, 25, 26];
const eqId = (no) => `eq-${String(no).padStart(2, '0')}`;
const byId = (list) => Object.fromEntries(list.map((e) => [e.id, e]));

test('HANDLES — 5 ручок у заданому порядку', () => {
  assert.deepEqual(HANDLES.map((h) => [h.id, h.label]), [
    ['v-bar', 'V-подібна'],
    ['rope', 'Канат'],
    ['d-handle', 'Одинарна D-ручка'],
    ['short-bar', 'Коротка пряма'],
    ['long-bar', 'Довга пряма'],
  ]);
});

test('HANDLE_ADJUSTMENT — регулювання «Ручка» з п\'ятьма варіантами', () => {
  assert.equal(HANDLE_ADJUSTMENT.id, 'handle');
  assert.equal(HANDLE_ADJUSTMENT.kind, 'options');
  assert.equal(HANDLE_ADJUSTMENT.label, 'Ручка');
  assert.deepEqual(HANDLE_ADJUSTMENT.options.map((o) => o.id),
    ['v-bar', 'rope', 'd-handle', 'short-bar', 'long-bar']);
});

test('seedEquipment: 25 тренажерів сайту без №11 + гантелі, турнік, кардіо', () => {
  const list = seedEquipment();
  assert.equal(list.length, 28);
  const m = byId(list);
  assert.equal(m['eq-11'], undefined);
  for (const [no, [siteName, group]] of Object.entries(SITE)) {
    const eq = m[eqId(no)];
    assert.ok(eq, `немає ${eqId(no)}`);
    assert.equal(eq.siteName, siteName, `назва з сайту ${no}`);
    assert.equal(eq.siteNo, Number(no));
    assert.equal(eq.group, group, `група ${no}`);
    if (Number(no) !== 3) assert.equal(eq.name, siteName);
  }
  for (const id of ['eq-dumbbells', 'eq-bar', 'eq-cardio']) assert.ok(m[id], id);
  assert.equal(m['eq-dumbbells'].group, 'dumbbells');
  assert.equal(m['eq-bar'].group, 'bar');
  assert.equal(m['eq-cardio'].group, 'cardio');
  assert.equal(m['eq-dumbbells'].name, 'Гантелі');
  assert.equal(m['eq-bar'].name, 'Турнік');
  assert.equal(m['eq-cardio'].name, 'Кардіо');
});

test('seedEquipment: id детерміновані й унікальні; виклики незалежні', () => {
  const a = seedEquipment();
  const b = seedEquipment();
  assert.deepEqual(a, b);
  const ids = a.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const exIds = a.flatMap((e) => e.exercises.map((x) => x.id));
  assert.equal(new Set(exIds).size, exIds.length);
  a[0].name = 'змінено';
  a[0].exercises.push({ id: 'x', name: 'x' });
  assert.notEqual(seedEquipment()[0].name, 'змінено');
  assert.equal(seedEquipment()[0].exercises.length, b[0].exercises.length);
});

test('seedEquipment: усі поля моделі на місці', () => {
  for (const eq of seedEquipment()) {
    assert.ok(eq.name, eq.id);
    assert.ok(eq.group in GROUPS, eq.id);
    assert.ok(eq.weightMode in WEIGHT_MODES, eq.id);
    assert.ok(Array.isArray(eq.exercises) && eq.exercises.length >= 1, eq.id);
    assert.ok(Array.isArray(eq.adjustments), eq.id);
    assert.ok('schemeId' in eq, eq.id);
    assert.equal(typeof eq.updatedAt, 'number', eq.id);
    for (const ex of eq.exercises) {
      assert.ok(ex.id.startsWith(`${eq.id}-`), ex.id);
      assert.ok(ex.name, ex.id);
    }
  }
});

test('№3 — «Метелик» з двома вправами і приблизними регулюваннями', () => {
  const eq = byId(seedEquipment())['eq-03'];
  assert.equal(eq.name, 'Метелик');
  assert.equal(eq.siteName, 'Зведення рук у тренажері');
  assert.equal(eq.schemeId, 'butterfly');
  assert.deepEqual(eq.exercises, [
    { id: 'eq-03-a', name: 'Зведення рук' },
    { id: 'eq-03-b', name: 'Відведення рук назад' },
  ]);
  const adj = byId(eq.adjustments);
  assert.deepEqual(Object.keys(adj).sort(), ['handles-pos', 'seat']);
  for (const a of eq.adjustments) {
    assert.equal(a.kind, 'positions');
    assert.equal(a.count, 5);
    assert.equal(a.approx, true);
  }
});

test('№21 — вертикальна тяга: сидіння невідоме, хват трьома кольорами', () => {
  const eq = byId(seedEquipment())['eq-21'];
  assert.equal(eq.schemeId, 'lever-pulldown');
  const adj = byId(eq.adjustments);
  assert.equal(adj.seat.kind, 'positions');
  assert.equal(adj.seat.count, 5);
  assert.equal(adj.seat.unknown, true);
  assert.equal(adj.seat.approx, true);
  assert.equal(adj.grip.kind, 'options');
  assert.deepEqual(adj.grip.options.map((o) => o.id), ['green', 'red', 'orange']);
  for (const o of adj.grip.options) assert.match(o.color, /^#[0-9a-f]{6}$/i);
  assert.equal(adj.handle, undefined);
});

test('№26 — тяга нижнього блоку: схема low-row, регулювання «Ручка»', () => {
  const eq = byId(seedEquipment())['eq-26'];
  assert.equal(eq.schemeId, 'low-row');
  assert.deepEqual(eq.adjustments.map((a) => a.id), ['handle']);
});

test('«Ручка» стоїть саме на №18, 19, 23, 24, 25, 26', () => {
  const withHandle = seedEquipment()
    .filter((e) => e.adjustments.some((a) => a.id === 'handle'))
    .map((e) => e.siteNo).sort((x, y) => x - y);
  assert.deepEqual(withHandle, WITH_HANDLE);
  const eq = byId(seedEquipment())['eq-18'];
  assert.deepEqual(eq.adjustments.find((a) => a.id === 'handle').options,
    HANDLE_ADJUSTMENT.options);
});

test('тип ваги: на кожну руку — №2, 4, 8, 14, 21, 22 і гантелі; турнік; кардіо', () => {
  const list = seedEquipment();
  const perHand = list.filter((e) => e.weightMode === 'perHand').map((e) => e.id).sort();
  assert.deepEqual(perHand, [...PER_HAND.map(eqId), 'eq-dumbbells'].sort());
  const m = byId(list);
  assert.equal(m['eq-bar'].weightMode, 'bodyweight');
  assert.equal(m['eq-cardio'].weightMode, 'cardio');
  assert.equal(m['eq-01'].weightMode, 'single');
});

test('кардіо: бігова доріжка, велотренажер, еліпс', () => {
  const eq = byId(seedEquipment())['eq-cardio'];
  assert.deepEqual(eq.exercises.map((x) => x.name), ['Бігова доріжка', 'Велотренажер', 'Еліпс']);
});

test('без схеми — schemeId null; жодних вигаданих регулювань', () => {
  for (const eq of seedEquipment()) {
    if (['eq-03', 'eq-21', 'eq-26'].includes(eq.id)) continue;
    assert.equal(eq.schemeId, null, eq.id);
    for (const a of eq.adjustments) assert.equal(a.id, 'handle', `${eq.id}: ${a.id}`);
  }
});
