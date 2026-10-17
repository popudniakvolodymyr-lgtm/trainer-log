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

// --- версія 3: заморожена копія (як її засівала версія 3 каталогу; не з коду під тестом) ------
const pos5 = (id, label) => ({ id, label, kind: 'positions', count: 5, approx: true });
const SEAT3 = () => pos5('seat', 'Висота сидіння');
const GRIPPOS3 = (a, b) => ({
  id: 'grip-pos', label: 'Позиція ручки', kind: 'options', approx: true,
  options: [{ id: 'pos-1', label: a }, { id: 'pos-2', label: b }],
});
const GRIP3 = () => ({
  id: 'grip', label: 'Хват', kind: 'options', options: [
    { id: 'green', label: 'Верх', color: '#2e9d4f' },
    { id: 'red', label: 'Вигин', color: '#d63b3b' },
    { id: 'orange', label: 'Низ', color: '#f08a1c' },
  ],
});
const m3 = (no, name, group, weightMode, schemeId, more = {}) => {
  const id = `eq-${String(no).padStart(2, '0')}`;
  const { adjustments = [], exercises = [{ id: `${id}-a`, name }], display = name, hidden, rare } = more;
  return {
    id, name: display, siteName: name, siteNo: no, group, weightMode, exercises, adjustments, schemeId,
    ...(hidden ? { hidden: true } : {}), ...(rare ? { rare: true } : {}), catalogVersion: 3, updatedAt: 0,
  };
};
const x3 = (id, name, group, weightMode, exercises, schemeId) => ({
  id, name, siteName: null, siteNo: null, group, weightMode,
  exercises: exercises.map((n, i) => ({ id: `${id}-${'abc'[i]}`, name: n })), adjustments: [], schemeId,
  catalogVersion: 3, updatedAt: 0,
});
const DB3 = [['curl', 'Біцепс стоячи'], ['bench-curl', 'Біцепс сидячи на лаві'], ['hammer', 'Молотки'],
  ['lateral', 'Махи в сторони'], ['front', 'Підйом перед собою'], ['press', 'Жим гантелей лежачи'],
  ['fly', 'Розведення гантелей лежачи'], ['seated-press', 'Жим гантелей сидячи'], ['row', 'Тяга гантелі в нахилі'],
  ['overhead', 'Розгинання з-за голови'], ['lunge', 'Випади з гантелями'], ['squat', 'Присідання з гантеллю']];
const V3 = () => [
  m3(1, 'Жим у блоці', 'chest', 'single', 'cable-chest-press', { hidden: true }),
  m3(2, 'Жим у тренажері', 'chest', 'perHand', 'plate-chest-press', { adjustments: [SEAT3()] }),
  m3(3, 'Зведення рук у тренажері', 'chest', 'single', 'butterfly', {
    display: 'Метелик',
    exercises: [{ id: 'eq-03-a', name: 'Зведення рук' }, { id: 'eq-03-b', name: 'Відведення рук назад' }],
    adjustments: [pos5('handles-pos', 'Позиція ручок'), SEAT3()],
  }),
  m3(4, 'Жим ногами лежачи', 'legs', 'perHand', 'leg-press'),
  m3(5, 'Жим ногами сидячи', 'legs', 'single', 'seated-leg-press', { hidden: true }),
  m3(6, 'Зведення ніг у тренажері', 'legs', 'single', 'hip-adduction'),
  m3(7, 'Згинання ніг лежачи на тренажері', 'legs', 'single', 'leg-curl', { adjustments: [pos5('roller', 'Позиція валика')] }),
  m3(8, 'Присідання в тренажері «Гак-машина»', 'legs', 'perHand', 'hack-squat'),
  m3(9, 'Розведення ніг у тренажері', 'legs', 'single', 'hip-abduction'),
  m3(10, 'Розгинання ніг у тренажері', 'legs', 'single', 'leg-extension', {
    adjustments: [pos5('roller', 'Валік'), pos5('tilt', 'Нахил'), pos5('backrest', 'Спинка (вперед-назад)')],
  }),
  m3(12, 'Відведення рук у тренажері сидячи', 'shoulders', 'single', 'lateral-raise', { adjustments: [SEAT3()] }),
  m3(13, 'Жим у блоці', 'shoulders', 'single', 'cable-shoulder-press', { hidden: true }),
  m3(14, 'Жим у тренажері сидячи', 'shoulders', 'perHand', 'plate-shoulder-press', {
    adjustments: [GRIPPOS3('Позиція 1', 'Позиція 2'), SEAT3()],
  }),
  m3(15, 'Ротація на прес', 'abs', 'single', 'ab-station', {
    display: 'Прес',
    exercises: [{ id: 'eq-15-a', name: 'Ротація на прес' }, { id: 'eq-15-b', name: 'Скручування на прес' }],
  }),
  m3(17, 'Віджимання в гравітроні', 'arms', 'single', 'assisted-dip', { rare: true }),
  m3(18, 'Жим на трицепс', 'arms', 'single', 'triceps-press'),
  m3(19, 'Згинання рук у блоці', 'arms', 'single', 'cable-curl', { rare: true }),
  m3(20, 'Підтягування в гравітроні', 'arms', 'single', 'assisted-pullup', { rare: true }),
  m3(21, 'Вертикальна тяга в силовому тренажері', 'back', 'perHand', 'lever-pulldown', {
    adjustments: [GRIPPOS3('Ширше', 'Вужче'), pos5('roller', 'Притискний валік')],
  }),
  m3(22, 'Горизонтальна тяга у силовому тренажері', 'back', 'perHand', 'lever-row', { adjustments: [SEAT3(), GRIP3()] }),
  m3(23, 'Розгинання в блоці', 'back', 'single', 'cable-extension', { hidden: true }),
  m3(24, 'Тяга в блоці', 'back', 'single', 'cable-pull'),
  m3(25, 'Тяга вертикального блоку', 'back', 'single', 'lat-pulldown', {
    adjustments: [HANDLE_V1, pos5('roller', 'Притискний валік')],
  }),
  m3(26, 'Тяга горизонтального блоку', 'back', 'single', 'low-row', { adjustments: [HANDLE_V1] }),
  ...DB3.map(([slug, name]) => x3(`eq-db-${slug}`, name, 'dumbbells', 'perHand', [name], `db-${slug}`)),
  x3('eq-bar', 'Турнік', 'bar', 'bodyweight', ['Підтягування'], null),
  x3('eq-cardio', 'Кардіо', 'cardio', 'cardio', ['Бігова доріжка', 'Велотренажер', 'Еліпс'], 'cardio'),
].map((e) => JSON.parse(JSON.stringify(e)));

// --- версія 2 → 4: кардіо отримує схему (spec «Правки, друга черга» Q8) ---------------------
// Запис v2 — як його засівала версія 2 каталогу: як версія 3, лише кардіо без схеми.
const V2 = () => V3().map((e) => (e.id === 'eq-cardio'
  ? { ...e, schemeId: null, catalogVersion: 2 }
  : { ...e, catalogVersion: 2 }));

test('v2 → v4: незмінене кардіо отримує schemeId «cardio», решта лише позначається версією', () => {
  const { byId } = apply(V2());
  assert.deepEqual(byId['eq-cardio'], SEED['eq-cardio']);
  assert.equal(byId['eq-cardio'].schemeId, 'cardio');
  for (const id of Object.keys(SEED)) assert.deepEqual(byId[id], SEED[id], id);
  assert.deepEqual(upgradeEquipment(Object.values(byId), NONE), [], 'повторно — нічого');
});

test('v2 → v4: зміни тренера в кардіо і в інших тренажерах не губляться, записи на місці', () => {
  let list = V2();
  list = replace(list, 'eq-cardio', {
    name: 'Кардіо (моє)', updatedAt: 1200,
    exercises: [...SEED['eq-cardio'].exercises, { id: 'eq-cardio-x', name: 'Гребний' }],
  });
  list = replace(list, 'eq-03', { name: 'Метелик (мій)', hidden: true, updatedAt: 1300 });
  list = replace(list, 'eq-07', {
    adjustments: V2().find((e) => e.id === 'eq-07').adjustments.map((a) => ({ ...a, count: 9, approx: false })), updatedAt: 1400,
  });
  const data = {
    sessions: [{ id: 's1', clientId: 'c1', equipmentId: 'eq-cardio', exerciseId: 'eq-cardio-b', sets: [] }],
    settings: [],
  };
  const { byId } = apply(list, data);
  const c = byId['eq-cardio'];
  assert.equal(c.schemeId, 'cardio');
  assert.equal(c.name, 'Кардіо (моє)');
  assert.deepEqual(c.exercises.map((x) => x.id), ['eq-cardio-a', 'eq-cardio-b', 'eq-cardio-c', 'eq-cardio-x']);
  assert.equal(c.updatedAt, 1200);
  assert.equal(c.catalogVersion, CATALOG_VERSION);
  assert.equal(byId['eq-03'].name, 'Метелик (мій)');
  assert.equal(byId['eq-03'].hidden, true);
  const roller = byId['eq-07'].adjustments.find((a) => a.id === 'roller');
  assert.equal(roller.count, 9, 'кількість позицій тренера лишається');
  assert.equal(roller.approx, false);
});

test('v2 → v4: прибрані №16 і старі «Гантелі» з позначкою v2 лишаються прибраними й цілими', () => {
  const v1 = apply(V1()).byId;
  const retired = ['eq-16', 'eq-dumbbells'].map((id) => ({ ...v1[id], catalogVersion: 2 }));
  const { byId } = apply([...V2(), ...retired]);
  for (const id of ['eq-16', 'eq-dumbbells']) {
    assert.equal(byId[id].retired, true, id);
    assert.ok(!byId[id].deleted, id);
    assert.equal(byId[id].exercises[0].id, `${id}-a`);
  }
});

// --- версія 3 → 4: третя черга (W1, W2, W4, W6) ------------------------------------------------
const V3_BY = () => Object.fromEntries(V3().map((e) => [e.id, e]));

test('v3 → v4: незмінене тренером — точно як новий каталог; повторно — нічого', () => {
  const { byId } = apply(V3());
  for (const id of Object.keys(SEED)) assert.deepEqual(byId[id], SEED[id], id);
  assert.equal(byId['eq-04'].weightMode, 'legs');
  assert.equal(byId['eq-08'].weightMode, 'legs');
  assert.deepEqual(byId['eq-07'].adjustments.map((a) => [a.id, a.label]), [['lever', 'Важіль'], ['roller', 'Валік']]);
  assert.equal(byId['eq-bar'].schemeId, 'pullup-bar');
  assert.deepEqual(byId['eq-bar'].adjustments[0].options.map((o) => o.id), ['normal', 'wide', 'reverse']);
  assert.deepEqual(upgradeEquipment(Object.values(byId), NONE), []);
});

test('v3 → v4: ручки-Г — id варіантів pos-1/pos-2 ті самі, нові лише назви; налаштування клієнтів на місці', () => {
  const data = {
    sessions: [],
    settings: [setting('eq-21', 'eq-21-a', 'grip-pos', 'pos-2'), setting('eq-14', 'eq-14-a', 'grip-pos', 'pos-1'),
      setting('eq-07', 'eq-07-a', 'roller', 3)],
  };
  const before = JSON.stringify(data);
  const { byId } = apply(V3(), data);
  for (const id of ['eq-21', 'eq-14']) {
    const g = byId[id].adjustments.find((a) => a.id === 'grip-pos');
    assert.deepEqual(g.options.map((o) => [o.id, o.label]), [['pos-1', 'Прямий'], ['pos-2', 'Під 90°']], id);
  }
  assert.ok(byId['eq-07'].adjustments.some((a) => a.id === 'roller'), 'валік №7 з налаштуванням — той самий id');
  assert.equal(JSON.stringify(data), before, 'налаштування не змінено');
});

test('v3 → v4: перейменоване тренером лишається його, решта назв — нові', () => {
  const v3 = V3_BY();
  const g21 = v3['eq-21'].adjustments[0];
  const list = Object.values({
    ...v3,
    // тренер перейменував варіант pos-1 на №21
    'eq-21': { ...v3['eq-21'], updatedAt: 500,
      adjustments: [{ ...g21, options: [{ id: 'pos-1', label: 'Широко' }, g21.options[1]] }, v3['eq-21'].adjustments[1]] },
    // тренер перейменував саме регулювання на №14
    'eq-14': { ...v3['eq-14'], updatedAt: 510,
      adjustments: [{ ...v3['eq-14'].adjustments[0], label: 'Ручки (моє)' }, v3['eq-14'].adjustments[1]] },
    // тренер перейменував валік на №7
    'eq-07': { ...v3['eq-07'], updatedAt: 520, adjustments: [{ ...v3['eq-07'].adjustments[0], label: 'Мій валик' }] },
    // тренер перейменував жим ногами
    'eq-04': { ...v3['eq-04'], name: 'Жим 45°', updatedAt: 530 },
  });
  const { byId } = apply(list);
  const g = byId['eq-21'].adjustments.find((a) => a.id === 'grip-pos');
  assert.deepEqual(g.options.map((o) => [o.id, o.label]), [['pos-1', 'Широко'], ['pos-2', 'Під 90°']]);
  assert.equal(g.label, 'Хват');
  assert.equal(byId['eq-21'].updatedAt, 500);
  const g14 = byId['eq-14'].adjustments.find((a) => a.id === 'grip-pos');
  assert.equal(g14.label, 'Ручки (моє)');
  assert.deepEqual(g14.options.map((o) => o.label), ['Прямий', 'Під 90°']);
  assert.deepEqual(byId['eq-07'].adjustments.map((a) => [a.id, a.label]), [['lever', 'Важіль'], ['roller', 'Мій валик']]);
  assert.equal(byId['eq-04'].name, 'Жим 45°');
  assert.equal(byId['eq-04'].weightMode, 'legs', 'новий тип ваги — з каталогу');
  for (const e of Object.values(byId)) assert.equal(e.catalogVersion, CATALOG_VERSION, e.id);
});

test('v3 → v4: старі підходи Л/П на №4 і №8 функція не чіпає', () => {
  const data = {
    sessions: [
      { id: 's1', clientId: 'c1', equipmentId: 'eq-04', exerciseId: 'eq-04-a', date: '2026-10-15', sets: [{ reps: 10, left: 20, right: 20 }], updatedAt: 9 },
      { id: 's2', clientId: 'c1', equipmentId: 'eq-08', exerciseId: 'eq-08-a', date: '2026-10-16', sets: [{ reps: 8, left: 15, right: 17.5 }], updatedAt: 9 },
    ],
    settings: [],
  };
  const before = JSON.stringify(data);
  const { changed, byId } = apply(V3(), data);
  assert.equal(JSON.stringify(data), before);
  assert.ok(changed.every((e) => Array.isArray(e.exercises)), 'повертає лише тренажери');
  assert.deepEqual(byId['eq-04'].exercises, [{ id: 'eq-04-a', name: 'Жим ногами лежачи' }], 'та сама вправа — записи на місці');
  assert.deepEqual(byId['eq-08'].exercises, [{ id: 'eq-08-a', name: 'Присідання в тренажері «Гак-машина»' }]);
});

test('v1 → v4 і v2 → v4: одразу до нової версії', () => {
  const a = apply(V1()).byId;
  assert.equal(a['eq-04'].weightMode, 'legs');
  assert.deepEqual(a['eq-21'], SEED['eq-21']);
  const b = apply(V2()).byId;
  for (const id of Object.keys(SEED)) assert.deepEqual(b[id], SEED[id], id);
});
