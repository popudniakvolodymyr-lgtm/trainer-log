// Оновлення каталогу на вже встановлених телефонах (spec «Правки» П9).
// Старі записи — літерально так, як їх засівала версія 1 каталогу (src/core/catalog.js до правок).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment, upgradeEquipment, CATALOG_VERSION } from '../src/core/catalog.js';
import { mergeEntities } from '../src/core/sync.js';

const HANDLE_V1 = {
  id: 'handle', label: 'Ручка', kind: 'options',
  options: [
    { id: 'v-bar', label: 'V-подібна' }, { id: 'rope', label: 'Канат' },
    { id: 'd-handle', label: 'Одинарна D-ручка' }, { id: 'short-bar', label: 'Коротка пряма' },
    { id: 'long-bar', label: 'Довга пряма' },
  ],
};
const site = (no, name, group, weightMode, more = {}) => {
  const id = `eq-${String(no).padStart(2, '0')}`;
  return {
    id, name, siteName: name, siteNo: no, group, weightMode,
    exercises: [{ id: `${id}-a`, name }], adjustments: [], schemeId: null, updatedAt: 0, ...more,
  };
};
const V1 = () => [
  site(1, 'Жим у блоці', 'chest', 'single'),
  {
    ...site(3, 'Зведення рук у тренажері', 'chest', 'single'),
    name: 'Метелик', schemeId: 'butterfly',
    exercises: [{ id: 'eq-03-a', name: 'Зведення рук' }, { id: 'eq-03-b', name: 'Відведення рук назад' }],
    adjustments: [
      { id: 'handles-pos', label: 'Позиція ручок', kind: 'positions', count: 5, approx: true },
      { id: 'seat', label: 'Висота сидіння', kind: 'positions', count: 5, approx: true },
    ],
  },
  site(4, 'Жим ногами лежачи', 'legs', 'perHand'),
  site(13, 'Жим у блоці', 'shoulders', 'single'),
  site(15, 'Ротація на прес', 'abs', 'single'),
  site(16, 'Скручування на прес', 'abs', 'single'),
  site(18, 'Жим на трицепс', 'arms', 'single', { adjustments: [HANDLE_V1] }),
  site(21, 'Вертикальна тяга в силовому тренажері', 'back', 'perHand', {
    schemeId: 'lever-pulldown',
    adjustments: [
      { id: 'seat', label: 'Висота сидіння', kind: 'positions', count: 5, approx: true, unknown: true },
      {
        id: 'grip', label: 'Хват', kind: 'options', options: [
          { id: 'green', label: 'Верх', color: '#2e9d4f' },
          { id: 'red', label: 'Вигин', color: '#d63b3b' },
          { id: 'orange', label: 'Низ', color: '#f08a1c' },
        ],
      },
    ],
  }),
  site(22, 'Горизонтальна тяга у силовому тренажері', 'back', 'perHand'),
  site(26, 'Тяга горизонтального блоку', 'back', 'single', { schemeId: 'low-row', adjustments: [HANDLE_V1] }),
  {
    id: 'eq-dumbbells', name: 'Гантелі', siteName: null, siteNo: null, group: 'dumbbells', weightMode: 'perHand',
    exercises: [{ id: 'eq-dumbbells-a', name: 'Вправа з гантелями' }], adjustments: [], schemeId: null, updatedAt: 0,
  },
];

const SEED = Object.fromEntries(seedEquipment().map((e) => [e.id, e]));
const NONE = { sessions: [], settings: [] };
/** Стан після оновлення: старі записи + змінене функцією. */
function apply(list, data = NONE) {
  const changed = upgradeEquipment(list, data);
  const map = new Map(list.map((e) => [e.id, e]));
  for (const e of changed) map.set(e.id, e);
  return { changed, byId: Object.fromEntries(map) };
}
const replace = (list, id, patch) => list.map((e) => (e.id === id ? { ...e, ...patch } : e));
const setting = (equipmentId, exerciseId, adjustmentId, value) => ({
  id: `c1|${exerciseId}|${adjustmentId}`, clientId: 'c1', equipmentId, exerciseId, adjustmentId, value, updatedAt: 100,
});

test('незмінені тренером тренажери замінюються новою версією каталогу', () => {
  const { byId } = apply(V1());
  for (const id of ['eq-01', 'eq-03', 'eq-04', 'eq-13', 'eq-15', 'eq-18', 'eq-21', 'eq-22', 'eq-26']) {
    assert.deepEqual(byId[id], SEED[id], id);
  }
  assert.equal(byId['eq-01'].hidden, true);
  assert.deepEqual(byId['eq-15'].exercises.map((x) => x.name), ['Ротація на прес', 'Скручування на прес']);
});

test('нові тренажери каталогу (гантелі, решта №) доповнюються', () => {
  const { byId } = apply(V1());
  for (const id of Object.keys(SEED)) assert.deepEqual(byId[id], SEED[id], id);
});

test('№16 і старі «Гантелі» не зникають з бази — позначені прибраними, вправи й id ті самі', () => {
  const { byId } = apply(V1());
  for (const id of ['eq-16', 'eq-dumbbells']) {
    const eq = byId[id];
    assert.ok(eq && !eq.deleted, id);
    assert.equal(eq.retired, true, id);
    assert.equal(eq.catalogVersion, CATALOG_VERSION);
    assert.equal(eq.exercises[0].id, `${id}-a`);
  }
});

test('зміни тренера зберігаються: назва, вправи, «сховати», «показати»; схема й рідкісність доповнюються', () => {
  let list = V1();
  list = replace(list, 'eq-01', { name: 'Жим (мій)', updatedAt: 500 });
  list = replace(list, 'eq-04', { hidden: true, exercises: [{ id: 'eq-04-a', name: 'Жим ногами' }], updatedAt: 600 });
  list = replace(list, 'eq-13', { hidden: false, updatedAt: 700 });
  list = replace(list, 'eq-15', { exercises: [{ id: 'eq-15-a', name: 'Ротація на прес' }, { id: 'eq-15-x', name: 'Своя' }], updatedAt: 800 });
  const { byId } = apply(list);
  assert.equal(byId['eq-01'].name, 'Жим (мій)');
  assert.equal(byId['eq-01'].hidden, true, 'тренер не чіпав «сховати» — бере каталог');
  assert.equal(byId['eq-01'].schemeId, SEED['eq-01'].schemeId);
  assert.equal(byId['eq-01'].updatedAt, 500, 'час правки тренера не міняється');
  assert.equal(byId['eq-04'].hidden, true);
  assert.deepEqual(byId['eq-04'].exercises, [{ id: 'eq-04-a', name: 'Жим ногами' }]);
  assert.equal(byId['eq-13'].hidden, false, 'тренер повернув у меню — не ховаємо');
  assert.deepEqual(byId['eq-15'].exercises.map((x) => x.id), ['eq-15-a', 'eq-15-b', 'eq-15-x']);
  assert.equal(byId['eq-15'].name, 'Прес');
});

test('регулювання тренера зберігаються; старе регулювання з налаштуваннями не зникає', () => {
  let list = V1();
  list = replace(list, 'eq-26', {
    adjustments: [HANDLE_V1, { id: 'adj-mine', label: 'Своє', kind: 'positions', count: 3 }], updatedAt: 900,
  });
  const data = {
    sessions: [],
    settings: [setting('eq-21', 'eq-21-a', 'grip', 'red'), setting('eq-18', 'eq-18-a', 'handle', 'rope')],
  };
  const { byId } = apply(list, data);
  assert.deepEqual(byId['eq-26'].adjustments.map((a) => a.id), ['handle', 'adj-mine']);
  const a21 = byId['eq-21'].adjustments.map((a) => a.id);
  for (const a of SEED['eq-21'].adjustments) assert.ok(a21.includes(a.id), a.id);
  assert.ok(a21.includes('grip'), 'хват клієнта на №21 не губиться');
  assert.ok(!a21.includes('seat'), 'сидіння без налаштувань — прибрано за каталогом');
  assert.deepEqual(byId['eq-18'].adjustments.map((a) => a.id), ['handle']);
  // без налаштувань — як у каталозі
  const clean = apply(V1()).byId;
  assert.deepEqual(clean['eq-18'].adjustments, []);
});

test('повторне оновлення нічого не змінює; «показати» тренера після оновлення не перекривається', () => {
  const first = apply(V1());
  const list = Object.values(first.byId);
  assert.deepEqual(upgradeEquipment(list, NONE), []);
  const shown = list.map((e) => (e.id === 'eq-01' ? { ...e, hidden: false, updatedAt: 1000 } : e));
  assert.deepEqual(upgradeEquipment(shown, NONE), []);
});

test('видалене не воскресає; записи й налаштування функція не чіпає', () => {
  const list = replace(V1(), 'eq-04', { deleted: true, updatedAt: 50 });
  const data = { sessions: [{ id: 's1', clientId: 'c1', equipmentId: 'eq-16', exerciseId: 'eq-16-a', sets: [] }], settings: [] };
  const before = JSON.stringify(data);
  const { changed } = apply(list, data);
  assert.ok(!changed.some((e) => e.id === 'eq-04'));
  assert.equal(JSON.stringify(data), before);
  assert.ok(changed.every((e) => Array.isArray(e.exercises)), 'повертає лише тренажери');
});

test('обмін зі старим телефоном: файл зі старим каталогом не відкочує оновлене і сам оновлюється', () => {
  const migrated = Object.values(apply(V1()).byId);
  // старий телефон шле незмінений каталог (updatedAt 0) — рівний час, лишається оновлене
  const r = mergeEntities(migrated, V1());
  assert.equal(r.changed.length, 0);
  // старий телефон тренера перейменував №21 (новіший запис без позначки версії) — береться й оновлюється
  const renamed = { ...V1().find((e) => e.id === 'eq-21'), name: 'Тяга (тренер)', updatedAt: 2000 };
  const merged = mergeEntities(migrated, [renamed]).merged;
  const after = apply(merged).byId['eq-21'];
  assert.equal(after.name, 'Тяга (тренер)');
  assert.equal(after.catalogVersion, CATALOG_VERSION);
  assert.deepEqual(after.adjustments, SEED['eq-21'].adjustments);
  // новий телефон шле оновлений каталог старому — для старого це просто записи з невідомими полями
  const old = mergeEntities(V1(), migrated);
  assert.ok(old.merged.some((e) => e.id === 'eq-db-curl' || e.group === 'dumbbells'));
});

test('змінені тренером №16 і старі «Гантелі» не позначаються прибраними', () => {
  let list = V1();
  list = replace(list, 'eq-16', { name: 'Скручування (моє)', updatedAt: 300 });
  list = replace(list, 'eq-dumbbells', { exercises: [{ id: 'eq-dumbbells-a', name: 'Вправа з гантелями' }, { id: 'eq-dumbbells-x', name: 'Своя' }], updatedAt: 310 });
  const { byId } = apply(list);
  for (const id of ['eq-16', 'eq-dumbbells']) {
    assert.ok(!byId[id].retired, `${id}: зміни тренера лишаються в меню`);
    assert.equal(byId[id].catalogVersion, CATALOG_VERSION);
    assert.equal(byId[id].updatedAt, list.find((e) => e.id === id).updatedAt);
  }
  assert.equal(byId['eq-16'].name, 'Скручування (моє)');
});
