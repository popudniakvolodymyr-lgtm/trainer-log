import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HANDLES, HANDLE_ADJUSTMENT, CATALOG_VERSION, seedEquipment, menuEquipment, isOffMenu,
} from '../src/core/catalog.js';
import { GROUPS, WEIGHT_MODES } from '../src/core/model.js';

// Очікування — з gym/equipment.md, gym/adjustments.md і spec.md «Правки» П1–П9 (не з коду під тестом).
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
const DISCS = [2, 4, 8, 14, 21, 22];
const DUMBBELLS = [
  'Біцепс стоячи', 'Біцепс сидячи на лаві', 'Молотки', 'Махи в сторони', 'Підйом перед собою',
  'Жим гантелей лежачи', 'Розведення гантелей лежачи', 'Жим гантелей сидячи', 'Тяга гантелі в нахилі',
  'Розгинання з-за голови', 'Випади з гантелями', 'Присідання з гантеллю',
];
const eqId = (no) => `eq-${String(no).padStart(2, '0')}`;
const byId = (list) => Object.fromEntries(list.map((e) => [e.id, e]));
const seed = () => byId(seedEquipment());
const adjOf = (no) => byId(seed()[eqId(no)].adjustments);

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

test('CATALOG_VERSION — 2, кожен запис позначено версією', () => {
  assert.equal(CATALOG_VERSION, 2);
  for (const eq of seedEquipment()) assert.equal(eq.catalogVersion, CATALOG_VERSION, eq.id);
});

test('тренажери сайту без №11 і №16; турнік і кардіо на місці; старого «Гантелі» немає', () => {
  const m = seed();
  assert.equal(m['eq-11'], undefined);
  assert.equal(m['eq-16'], undefined, '№16 злито з №15');
  assert.equal(m['eq-dumbbells'], undefined, 'гантелі — окремими пунктами');
  for (const [no, [siteName, group]] of Object.entries(SITE)) {
    const eq = m[eqId(no)];
    assert.ok(eq, `немає ${eqId(no)}`);
    assert.equal(eq.siteName, siteName, `назва з сайту ${no}`);
    assert.equal(eq.siteNo, Number(no));
    assert.equal(eq.group, group, `група ${no}`);
    if (![3, 15].includes(Number(no))) assert.equal(eq.name, siteName);
  }
  assert.equal(m['eq-bar'].weightMode, 'bodyweight');
  assert.equal(m['eq-cardio'].weightMode, 'cardio');
  assert.deepEqual(m['eq-cardio'].exercises.map((x) => x.name), ['Бігова доріжка', 'Велотренажер', 'Еліпс']);
});

test('id детерміновані й унікальні; виклики незалежні; поля моделі на місці', () => {
  const a = seedEquipment();
  assert.deepEqual(a, seedEquipment());
  const ids = a.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const exIds = a.flatMap((e) => e.exercises.map((x) => x.id));
  assert.equal(new Set(exIds).size, exIds.length);
  a[0].name = 'змінено';
  a[0].adjustments.push({ id: 'x' });
  assert.notEqual(seedEquipment()[0].name, 'змінено');
  for (const eq of seedEquipment()) {
    assert.ok(eq.group in GROUPS, eq.id);
    assert.ok(eq.weightMode in WEIGHT_MODES, eq.id);
    assert.ok(eq.exercises.length >= 1, eq.id);
    assert.equal(eq.updatedAt, 0, eq.id);
    for (const ex of eq.exercises) assert.ok(ex.id.startsWith(`${eq.id}-`), ex.id);
  }
});

test('тип ваги: диски — №2, 4, 8, 14, 21, 22; решта тренажерів сайту — блок', () => {
  const m = seed();
  for (const no of Object.keys(SITE).map(Number)) {
    assert.equal(m[eqId(no)].weightMode, DISCS.includes(no) ? 'perHand' : 'single', `№${no}`);
  }
});

test('сховано №1, 13, 23, 5; рідкісні №19, 17, 20; решта — видимі', () => {
  const list = seedEquipment();
  const hidden = list.filter((e) => e.hidden).map((e) => e.siteNo).sort((x, y) => x - y);
  const rare = list.filter((e) => e.rare).map((e) => e.siteNo).sort((x, y) => x - y);
  assert.deepEqual(hidden, [1, 5, 13, 23]);
  assert.deepEqual(rare, [17, 19, 20]);
});

test('№15 «Прес» — один тренажер з двома вправами', () => {
  const eq = seed()['eq-15'];
  assert.equal(eq.name, 'Прес');
  assert.deepEqual(eq.exercises.map((x) => x.name), ['Ротація на прес', 'Скручування на прес']);
  assert.equal(eq.exercises[0].id, 'eq-15-a', 'стара вправа — той самий id');
});

test('№3 «Метелик» — без змін', () => {
  const eq = seed()['eq-03'];
  assert.equal(eq.name, 'Метелик');
  assert.equal(eq.schemeId, 'butterfly');
  assert.deepEqual(eq.exercises, [
    { id: 'eq-03-a', name: 'Зведення рук' },
    { id: 'eq-03-b', name: 'Відведення рук назад' },
  ]);
  assert.deepEqual(eq.adjustments.map((a) => [a.id, a.kind, a.count, a.approx]),
    [['handles-pos', 'positions', 5, true], ['seat', 'positions', 5, true]]);
});

test('№22 — сидіння 5 ⚠ і хват трьома кольорами (перенесено з №21)', () => {
  const a = adjOf(22);
  assert.deepEqual(Object.keys(a).sort(), ['grip', 'seat']);
  assert.equal(a.seat.kind, 'positions');
  assert.equal(a.seat.count, 5);
  assert.equal(a.seat.approx, true);
  assert.equal(a.grip.kind, 'options');
  assert.deepEqual(a.grip.options.map((o) => o.id), ['green', 'red', 'orange']);
  for (const o of a.grip.options) assert.match(o.color, /^#[0-9a-f]{6}$/i);
});

test('№21 — позиція ручки (2 варіанти) + притискний валік', () => {
  const a = Object.values(adjOf(21));
  assert.equal(a.length, 2);
  const grip = a.find((x) => x.kind === 'options');
  assert.equal(grip.options.length, 2);
  assert.deepEqual(grip.options.map((o) => o.label), ['Ширше', 'Вужче']);
  const roller = a.find((x) => x.kind === 'positions');
  assert.match(roller.label, /валік/i);
  assert.equal(roller.count, 5);
  assert.equal(roller.approx, true);
});

test('регулювання за списком П3/П6: №2, 25, 26, 12, 14, 7, 10', () => {
  const kinds = (no) => Object.values(adjOf(no)).map((a) => a.kind);
  assert.deepEqual(Object.values(adjOf(2)).map((a) => [a.label, a.count, a.approx]), [['Висота сидіння', 5, true]]);
  assert.deepEqual(Object.keys(adjOf(26)), ['handle']);
  assert.deepEqual(adjOf(26).handle.options, HANDLE_ADJUSTMENT.options);
  assert.equal(adjOf(25).handle.kind, 'options');
  assert.deepEqual(kinds(25).sort(), ['options', 'positions']);
  assert.match(Object.values(adjOf(25)).find((a) => a.kind === 'positions').label, /валік/i);
  assert.deepEqual(Object.values(adjOf(12)).map((a) => a.label), ['Висота сидіння']);
  const a14 = Object.values(adjOf(14));
  assert.equal(a14.find((a) => a.kind === 'options').options.length, 2);
  assert.equal(a14.find((a) => a.kind === 'positions').label, 'Висота сидіння');
  assert.equal(a14.length, 2);
  assert.deepEqual(kinds(7), ['positions']);
  assert.match(Object.values(adjOf(7))[0].label, /валик/i);
  const a10 = Object.values(adjOf(10)).map((a) => a.label.toLowerCase());
  assert.equal(a10.length, 3);
  assert.ok(a10.some((l) => l.includes('валік')) && a10.some((l) => l.includes('нахил')) && a10.some((l) => l.includes('спинка')));
  for (const eq of seedEquipment()) {
    for (const a of eq.adjustments) {
      if (a.kind === 'positions') {
        assert.equal(a.count, 5, `${eq.id}:${a.id}`);
        assert.equal(a.approx, true, `${eq.id}:${a.id} без ⚠`);
      }
    }
  }
});

test('решта тренажерів — без регулювань', () => {
  const withAdj = [2, 3, 7, 10, 12, 14, 21, 22, 25, 26];
  for (const eq of seedEquipment()) {
    if (withAdj.includes(eq.siteNo)) continue;
    assert.deepEqual(eq.adjustments, [], eq.id);
  }
});

test('кожен тренажер залу і кожна вправа з гантелями має свій schemeId', () => {
  const list = seedEquipment().filter((e) => e.siteNo || e.group === 'dumbbells');
  const ids = list.map((e) => e.schemeId);
  for (const e of list) assert.equal(typeof e.schemeId, 'string', e.id);
  assert.equal(new Set(ids).size, ids.length, 'schemeId не повторюються');
  const m = seed();
  assert.equal(m['eq-03'].schemeId, 'butterfly');
  assert.equal(m['eq-26'].schemeId, 'low-row');
  assert.notEqual(m['eq-21'].schemeId, m['eq-22'].schemeId);
});

test('«Гантелі» — 12 окремих пунктів, вага на кожну руку, без регулювань', () => {
  const db = seedEquipment().filter((e) => e.group === 'dumbbells');
  assert.deepEqual(db.map((e) => e.name), DUMBBELLS);
  for (const e of db) {
    assert.equal(e.weightMode, 'perHand', e.id);
    assert.deepEqual(e.exercises.map((x) => x.name), [e.name]);
    assert.deepEqual(e.adjustments, []);
  }
});

// --- меню картки клієнта --------------------------------------------------------

const ses = (equipmentId, extra = {}) => ({ id: `s-${equipmentId}`, clientId: 'c1', equipmentId, exerciseId: `${equipmentId}-a`, ...extra });

test('menuEquipment: сховані й прибрані — не в меню; рідкісні — в кінці групи, сірим', () => {
  const list = [
    { id: 'eq-17', group: 'arms', rare: true },
    { id: 'eq-18', group: 'arms' },
    { id: 'eq-19', group: 'arms', rare: true },
    { id: 'eq-01', group: 'chest', hidden: true },
    { id: 'eq-16', group: 'abs', retired: true },
    { id: 'eq-x', group: 'abs', deleted: true },
  ];
  const r = menuEquipment(list, []);
  assert.deepEqual(r.map((x) => [x.equipment.id, x.muted]), [['eq-18', false], ['eq-17', true], ['eq-19', true]]);
});

test('menuEquipment: тренажер з записами клієнта не зникає (сірим у кінці групи)', () => {
  const list = [
    { id: 'eq-16', group: 'abs', retired: true },
    { id: 'eq-15', group: 'abs' },
    { id: 'eq-01', group: 'chest', hidden: true },
    { id: 'eq-02', group: 'chest' },
  ];
  const r = menuEquipment(list, [ses('eq-16'), ses('eq-01'), ses('eq-02', { deleted: true })]);
  assert.deepEqual(r.map((x) => [x.equipment.id, x.muted]),
    [['eq-02', false], ['eq-01', true], ['eq-15', false], ['eq-16', true]], 'групи в порядку меню');
  // видалений запис не тримає тренажер у меню
  const r2 = menuEquipment(list, [ses('eq-01', { deleted: true })]);
  assert.ok(!r2.some((x) => x.equipment.id === 'eq-01'));
});

test('menuEquipment: у групі — порядок каталогу, а не id з бази', () => {
  const db = seedEquipment().filter((e) => e.group === 'dumbbells');
  const sorted = [...db].sort((a, b) => a.id.localeCompare(b.id));
  const r = menuEquipment(sorted, []);
  assert.deepEqual(r.map((x) => x.equipment.name), DUMBBELLS);
});

test('прибраний з каталогу: окрема позначка, «показати» тренера (hidden:false) повертає в меню', () => {
  const retired = { id: 'eq-16', group: 'abs', retired: true };
  assert.equal(isOffMenu(retired), true);
  assert.equal(isOffMenu({ ...retired, hidden: false }), false);
  assert.equal(isOffMenu({ ...retired, hidden: true }), true);
  assert.equal(isOffMenu({ id: 'eq-02', group: 'chest' }), false);
  assert.equal(isOffMenu({ id: 'eq-01', group: 'chest', hidden: true }), true);
  const r = menuEquipment([{ ...retired, hidden: false }], []);
  assert.deepEqual(r.map((x) => [x.equipment.id, x.muted]), [['eq-16', false]]);
});
