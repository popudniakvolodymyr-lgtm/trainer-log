// Стартовий каталог тренажерів залу APOLLO NEXT 023 (джерело: gym/equipment.md, gym/adjustments.md).
// Чистий модуль. id детерміновані, щоб у тренера й клієнта збігались.
// Версія 2 — за правками автора (spec «Правки» П1–П9); версія 1 лишається як база для оновлення.
// Кількість позицій без джерела позначена approx/unknown — цифр не вигадуємо.

import { GROUPS } from './model.js';

/** Набір ручок для блокових тяг (кріпляться на карабін). №6 «манжета» поки не включено. */
export const HANDLES = Object.freeze([
  Object.freeze({ id: 'v-bar', label: 'V-подібна' }),
  Object.freeze({ id: 'rope', label: 'Канат' }),
  Object.freeze({ id: 'd-handle', label: 'Одинарна D-ручка' }),
  Object.freeze({ id: 'short-bar', label: 'Коротка пряма' }),
  Object.freeze({ id: 'long-bar', label: 'Довга пряма' }),
]);

/** Готове регулювання «Ручка» (вибір з HANDLES). */
export const HANDLE_ADJUSTMENT = Object.freeze({
  id: 'handle',
  label: 'Ручка',
  kind: 'options',
  options: HANDLES,
});

/** Версія стартового каталогу; запис із меншою catalogVersion оновлює upgradeEquipment. */
export const CATALOG_VERSION = 2;

const pad2 = (n) => String(n).padStart(2, '0');

const handleAdjustment = () => ({
  id: HANDLE_ADJUSTMENT.id,
  label: HANDLE_ADJUSTMENT.label,
  kind: HANDLE_ADJUSTMENT.kind,
  options: HANDLES.map((h) => ({ ...h })),
});

// Кількість позицій — 5 «⚠ приблизно», поки не уточнено в залі (spec «Правки» П6).
const positions = (id, label) => ({ id, label, kind: 'positions', count: 5, approx: true });
const seat = () => positions('seat', 'Висота сидіння');
// Дві позиції ручки; назви умовні — тренер перейменовує.
const twoGrips = (labels) => ({
  id: 'grip-pos',
  label: 'Позиція ручки',
  kind: 'options',
  approx: true,
  options: [{ id: 'pos-1', label: labels[0] }, { id: 'pos-2', label: labels[1] }],
});
// Три позиції хвату (зелена / червона / помаранчева) — з №21 версії 1, тепер на №22 (П2).
const threeGrips = () => ({
  id: 'grip',
  label: 'Хват',
  kind: 'options',
  // Назви умовні — тренер перейменовує.
  options: [
    { id: 'green', label: 'Верх', color: '#2e9d4f' },
    { id: 'red', label: 'Вигин', color: '#d63b3b' },
    { id: 'orange', label: 'Низ', color: '#f08a1c' },
  ],
});

// Тренажери залу (gym/equipment.md): [№, назва з сайту, група, тип ваги, особливе].
// №11 злито в «Метелик» (№3), №16 — у «Прес» (№15).
const SITE = [
  [1, 'Жим у блоці', 'chest', 'single', { schemeId: 'cable-chest-press', hidden: true }],
  [2, 'Жим у тренажері', 'chest', 'perHand', { schemeId: 'plate-chest-press', adjustments: () => [seat()] }],
  [3, 'Зведення рук у тренажері', 'chest', 'single', {
    name: 'Метелик',
    schemeId: 'butterfly',
    exercises: [
      { id: 'eq-03-a', name: 'Зведення рук' },
      { id: 'eq-03-b', name: 'Відведення рук назад' },
    ],
    adjustments: () => [positions('handles-pos', 'Позиція ручок'), seat()],
  }],
  [4, 'Жим ногами лежачи', 'legs', 'perHand', { schemeId: 'leg-press' }],
  [5, 'Жим ногами сидячи', 'legs', 'single', { schemeId: 'seated-leg-press', hidden: true }],
  [6, 'Зведення ніг у тренажері', 'legs', 'single', { schemeId: 'hip-adduction' }],
  [7, 'Згинання ніг лежачи на тренажері', 'legs', 'single', {
    schemeId: 'leg-curl', adjustments: () => [positions('roller', 'Позиція валика')],
  }],
  [8, 'Присідання в тренажері «Гак-машина»', 'legs', 'perHand', { schemeId: 'hack-squat' }],
  [9, 'Розведення ніг у тренажері', 'legs', 'single', { schemeId: 'hip-abduction' }],
  [10, 'Розгинання ніг у тренажері', 'legs', 'single', {
    schemeId: 'leg-extension',
    adjustments: () => [
      positions('roller', 'Валік'),
      positions('tilt', 'Нахил'),
      positions('backrest', 'Спинка (вперед-назад)'),
    ],
  }],
  [12, 'Відведення рук у тренажері сидячи', 'shoulders', 'single', {
    schemeId: 'lateral-raise', adjustments: () => [seat()],
  }],
  [13, 'Жим у блоці', 'shoulders', 'single', { schemeId: 'cable-shoulder-press', hidden: true }],
  [14, 'Жим у тренажері сидячи', 'shoulders', 'perHand', {
    schemeId: 'plate-shoulder-press', adjustments: () => [twoGrips(['Позиція 1', 'Позиція 2']), seat()],
  }],
  [15, 'Ротація на прес', 'abs', 'single', {
    name: 'Прес',
    schemeId: 'ab-station',
    exercises: [
      { id: 'eq-15-a', name: 'Ротація на прес' },
      { id: 'eq-15-b', name: 'Скручування на прес' },
    ],
  }],
  [17, 'Віджимання в гравітроні', 'arms', 'single', { schemeId: 'assisted-dip', rare: true }],
  [18, 'Жим на трицепс', 'arms', 'single', { schemeId: 'triceps-press' }],
  [19, 'Згинання рук у блоці', 'arms', 'single', { schemeId: 'cable-curl', rare: true }],
  [20, 'Підтягування в гравітроні', 'arms', 'single', { schemeId: 'assisted-pullup', rare: true }],
  [21, 'Вертикальна тяга в силовому тренажері', 'back', 'perHand', {
    schemeId: 'lever-pulldown',
    adjustments: () => [twoGrips(['Ширше', 'Вужче']), positions('roller', 'Притискний валік')],
  }],
  [22, 'Горизонтальна тяга у силовому тренажері', 'back', 'perHand', {
    schemeId: 'lever-row', adjustments: () => [seat(), threeGrips()],
  }],
  [23, 'Розгинання в блоці', 'back', 'single', { schemeId: 'cable-extension', hidden: true }],
  [24, 'Тяга в блоці', 'back', 'single', { schemeId: 'cable-pull' }],
  [25, 'Тяга вертикального блоку', 'back', 'single', {
    schemeId: 'lat-pulldown', adjustments: () => [handleAdjustment(), positions('roller', 'Притискний валік')],
  }],
  [26, 'Тяга горизонтального блоку', 'back', 'single', {
    schemeId: 'low-row', adjustments: () => [handleAdjustment()],
  }],
];

// «Гантелі» — кожна вправа окремим пунктом, вага на кожну руку (П8).
// [слово для id `eq-db-<слово>` і schemeId `db-<слово>`, назва]
const DUMBBELLS = [
  ['curl', 'Біцепс стоячи'],
  ['bench-curl', 'Біцепс сидячи на лаві'],
  ['hammer', 'Молотки'],
  ['lateral', 'Махи в сторони'],
  ['front', 'Підйом перед собою'],
  ['press', 'Жим гантелей лежачи'],
  ['fly', 'Розведення гантелей лежачи'],
  ['seated-press', 'Жим гантелей сидячи'],
  ['row', 'Тяга гантелі в нахилі'],
  ['overhead', 'Розгинання з-за голови'],
  ['lunge', 'Випади з гантелями'],
  ['squat', 'Присідання з гантеллю'],
];

const extra = (id, name, group, weightMode, exercises, schemeId, version) => ({
  id,
  name,
  siteName: null,
  siteNo: null,
  group,
  weightMode,
  exercises: exercises.map((exName, i) => ({ id: `${id}-${'abcdefgh'[i]}`, name: exName })),
  adjustments: [],
  schemeId,
  ...(version ? { catalogVersion: version } : {}),
  updatedAt: 0,
});

/** Новий екземпляр стартового каталогу. updatedAt = 0: будь-яка правка новіша. */
export function seedEquipment() {
  const list = SITE.map(([no, siteName, group, weightMode, sp]) => {
    const id = `eq-${pad2(no)}`;
    return {
      id,
      name: sp.name || siteName,
      siteName,
      siteNo: no,
      group,
      weightMode,
      exercises: sp.exercises ? sp.exercises.map((x) => ({ ...x })) : [{ id: `${id}-a`, name: siteName }],
      adjustments: sp.adjustments ? sp.adjustments() : [],
      schemeId: sp.schemeId || null,
      ...(sp.hidden ? { hidden: true } : {}),
      ...(sp.rare ? { rare: true } : {}),
      catalogVersion: CATALOG_VERSION,
      updatedAt: 0,
    };
  });
  for (const [slug, name] of DUMBBELLS) {
    list.push(extra(`eq-db-${slug}`, name, 'dumbbells', 'perHand', [name], `db-${slug}`, CATALOG_VERSION));
  }
  list.push(
    extra('eq-bar', 'Турнік', 'bar', 'bodyweight', ['Підтягування'], null, CATALOG_VERSION),
    extra('eq-cardio', 'Кардіо', 'cardio', 'cardio', ['Бігова доріжка', 'Велотренажер', 'Еліпс'], null, CATALOG_VERSION),
  );
  return list;
}

// --- меню картки клієнта ----------------------------------------------------------

/**
 * Чи тренажер не в меню клієнтів: сховав тренер (hidden:true) або прибрано з каталогу
 * (retired) і тренер не повернув його кнопкою «Показати» (hidden:false).
 */
export function isOffMenu(eq) {
  return !!eq && (eq.hidden === true || (!!eq.retired && eq.hidden !== false));
}

/**
 * Тренажери для меню картки клієнта: у порядку груп (GROUPS), у групі — звичайні, потім сірі,
 * кожні в порядку каталогу.
 * Сховані (hidden) і прибрані з каталогу (retired) не показуються, якщо в клієнта на них немає
 * записів; з записами — сірими в кінці групи. rare — завжди сірі в кінці групи.
 * sessions — записи цього клієнта. → [{ equipment, muted }]
 */
export function menuEquipment(equipment, sessions = []) {
  const used = new Set((sessions || []).filter((s) => !s.deleted).map((s) => s.equipmentId));
  const groups = Object.keys(GROUPS);
  const rank = (g) => (groups.includes(g) ? groups.indexOf(g) : groups.length);
  const items = [];
  (equipment || []).forEach((eq, i) => {
    if (!eq || eq.deleted) return;
    const away = isOffMenu(eq);
    if (away && !used.has(eq.id)) return;
    items.push({ equipment: eq, muted: away || !!eq.rare, i });
  });
  // У групі — порядок каталогу (а не id, як їх віддає база); власні тренера — після.
  const order = new Map(seedEquipment().map((e, i) => [e.id, i]));
  const pos = (x) => (order.has(x.equipment.id) ? order.get(x.equipment.id) : order.size + x.i);
  items.sort((a, b) => rank(a.equipment.group) - rank(b.equipment.group)
    || Number(a.muted) - Number(b.muted) || pos(a) - pos(b));
  return items.map(({ equipment: eq, muted }) => ({ equipment: eq, muted }));
}

// --- оновлення каталогу на встановлених телефонах (П9) --------------------------------

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byIdMap = (list) => new Map((list || []).map((x) => [x.id, x]));

/**
 * Злиття списку (вправи або регулювання) за id: що тренер не змінював відносно старого
 * каталогу — береться з нового; змінене або додане тренером — лишається; прибране каталогом —
 * зникає, якщо keep(id) не каже лишити (на нього є записи чи налаштування).
 */
function mergeList(current, oldSeed, newSeed, keep) {
  const cur = byIdMap(current);
  const old = byIdMap(oldSeed);
  const out = [];
  for (const s of newSeed) {
    const c = cur.get(s.id);
    if (c) out.push(old.has(s.id) && same(c, old.get(s.id)) ? s : c);
    else if (!old.has(s.id)) out.push(s);
    // був у старому каталозі, а в тренера його немає — тренер прибрав, не повертаємо
  }
  const fresh = new Set(newSeed.map((x) => x.id));
  for (const c of current || []) {
    if (fresh.has(c.id)) continue;
    const o = old.get(c.id);
    if (o && same(c, o) && !keep(c.id)) continue;
    out.push(c);
  }
  return out;
}

/**
 * Оновлює тренажери стартового каталогу до CATALOG_VERSION. Чиста функція.
 * equipment — усі тренажери телефона (з видаленими); data = { sessions, settings } — щоб не
 * прибрати вправу чи регулювання, на які вже є записи.
 * → лише змінені й нові тренажери (записати як є). updatedAt не міняється: на всіх телефонах
 *   результат той самий, і файл обміну зі старим каталогом (рівний час) його не відкочує.
 * Уже оновлені (catalogVersion ≥ CATALOG_VERSION), видалені й власні тренажери тренера не чіпає;
 * повторний виклик → [].
 */
export function upgradeEquipment(equipment, { sessions = [], settings = [] } = {}) {
  const cur = byIdMap(equipment);
  const oldSeed = byIdMap(seedV1());
  const live = (list) => (list || []).filter((x) => !x.deleted);
  const usedEx = new Set([...live(sessions), ...live(settings)].map((s) => s.exerciseId));
  const usedAdj = new Set(live(settings).map((s) => `${s.equipmentId}|${s.adjustmentId}`));
  const upToDate = (e) => (e.catalogVersion || 0) >= CATALOG_VERSION;
  const seed = seedEquipment();
  const changed = [];

  for (const s of seed) {
    const c = cur.get(s.id);
    if (!c) { changed.push(s); continue; }
    if (c.deleted || upToDate(c)) continue;
    const o = oldSeed.get(s.id);
    if (!o) { changed.push({ ...c, catalogVersion: CATALOG_VERSION }); continue; }
    const next = {
      ...c,
      name: c.name === o.name ? s.name : c.name,
      siteName: s.siteName,
      siteNo: s.siteNo,
      group: s.group,
      weightMode: s.weightMode,
      schemeId: s.schemeId,
      exercises: mergeList(c.exercises, o.exercises, s.exercises, (id) => usedEx.has(id)),
      adjustments: mergeList(c.adjustments, o.adjustments, s.adjustments, (id) => usedAdj.has(`${c.id}|${id}`)),
      catalogVersion: CATALOG_VERSION,
    };
    // «Сховати» тренер ставить явно (hidden: true/false); поля немає — бере каталог.
    if (!('hidden' in c)) {
      if (s.hidden) next.hidden = true;
      else delete next.hidden;
    }
    if (s.rare) next.rare = true;
    else delete next.rare;
    changed.push(next);
  }

  // Прибрані з каталогу (№16, старі «Гантелі»): не видаляємо — у меню лише з записами.
  // Змінені тренером лишаються як є (його зміни не зникають з меню).
  const inSeed = new Set(seed.map((e) => e.id));
  for (const c of equipment || []) {
    if (inSeed.has(c.id) || c.deleted || upToDate(c) || !oldSeed.has(c.id)) continue;
    const untouched = same(c, oldSeed.get(c.id));
    changed.push({ ...c, ...(untouched ? { retired: true } : {}), catalogVersion: CATALOG_VERSION });
  }
  return changed;
}

// --- каталог версії 1: база для оновлення («що тренер не змінював») ----------------------
// Не міняти: це точна копія того, що засівала перша версія програми.

const SITE_V1 = [
  [1, 'Жим у блоці', 'chest', 'single'],
  [2, 'Жим у тренажері', 'chest', 'perHand'],
  [3, 'Зведення рук у тренажері', 'chest', 'single'],
  [4, 'Жим ногами лежачи', 'legs', 'perHand'],
  [5, 'Жим ногами сидячи', 'legs', 'single'],
  [6, 'Зведення ніг у тренажері', 'legs', 'single'],
  [7, 'Згинання ніг лежачи на тренажері', 'legs', 'single'],
  [8, 'Присідання в тренажері «Гак-машина»', 'legs', 'perHand'],
  [9, 'Розведення ніг у тренажері', 'legs', 'single'],
  [10, 'Розгинання ніг у тренажері', 'legs', 'single'],
  [12, 'Відведення рук у тренажері сидячи', 'shoulders', 'single'],
  [13, 'Жим у блоці', 'shoulders', 'single'],
  [14, 'Жим у тренажері сидячи', 'shoulders', 'perHand'],
  [15, 'Ротація на прес', 'abs', 'single'],
  [16, 'Скручування на прес', 'abs', 'single'],
  [17, 'Віджимання в гравітроні', 'arms', 'single'],
  [18, 'Жим на трицепс', 'arms', 'single'],
  [19, 'Згинання рук у блоці', 'arms', 'single'],
  [20, 'Підтягування в гравітроні', 'arms', 'single'],
  [21, 'Вертикальна тяга в силовому тренажері', 'back', 'perHand'],
  [22, 'Горизонтальна тяга у силовому тренажері', 'back', 'perHand'],
  [23, 'Розгинання в блоці', 'back', 'single'],
  [24, 'Тяга в блоці', 'back', 'single'],
  [25, 'Тяга вертикального блоку', 'back', 'single'],
  [26, 'Тяга горизонтального блоку', 'back', 'single'],
];

const WITH_HANDLE_V1 = new Set([18, 19, 23, 24, 25, 26]);

const SPECIAL_V1 = {
  3: {
    name: 'Метелик',
    schemeId: 'butterfly',
    exercises: [
      { id: 'eq-03-a', name: 'Зведення рук' },
      { id: 'eq-03-b', name: 'Відведення рук назад' },
    ],
    adjustments: () => [
      { id: 'handles-pos', label: 'Позиція ручок', kind: 'positions', count: 5, approx: true },
      { id: 'seat', label: 'Висота сидіння', kind: 'positions', count: 5, approx: true },
    ],
  },
  21: {
    schemeId: 'lever-pulldown',
    adjustments: () => [
      { id: 'seat', label: 'Висота сидіння', kind: 'positions', count: 5, approx: true, unknown: true },
      threeGrips(),
    ],
  },
  26: { schemeId: 'low-row' },
};

function seedV1() {
  const list = SITE_V1.map(([no, siteName, group, weightMode]) => {
    const id = `eq-${pad2(no)}`;
    const sp = SPECIAL_V1[no] || {};
    const adjustments = sp.adjustments ? sp.adjustments() : [];
    if (WITH_HANDLE_V1.has(no)) adjustments.push(handleAdjustment());
    return {
      id,
      name: sp.name || siteName,
      siteName,
      siteNo: no,
      group,
      weightMode,
      exercises: sp.exercises ? sp.exercises.map((x) => ({ ...x })) : [{ id: `${id}-a`, name: siteName }],
      adjustments,
      schemeId: sp.schemeId || null,
      updatedAt: 0,
    };
  });
  list.push(
    extra('eq-dumbbells', 'Гантелі', 'dumbbells', 'perHand', ['Вправа з гантелями'], null),
    extra('eq-bar', 'Турнік', 'bar', 'bodyweight', ['Підтягування'], null),
    extra('eq-cardio', 'Кардіо', 'cardio', 'cardio', ['Бігова доріжка', 'Велотренажер', 'Еліпс'], null),
  );
  return list;
}
