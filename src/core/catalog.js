// Стартовий каталог тренажерів залу APOLLO NEXT 023 (джерело: gym/equipment.md, gym/adjustments.md).
// Чистий модуль. id детерміновані, щоб у тренера й клієнта збігались.
// Кількість позицій без джерела позначена approx/unknown — цифр не вигадуємо.

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

// [№, назва з сайту, група, тип ваги]
const SITE = [
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
  // №11 «Відведення рук назад у блоці» — злито в «Метелик» (№3) як друга вправа.
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

const WITH_HANDLE = new Set([18, 19, 23, 24, 25, 26]);

const handleAdjustment = () => ({
  id: HANDLE_ADJUSTMENT.id,
  label: HANDLE_ADJUSTMENT.label,
  kind: HANDLE_ADJUSTMENT.kind,
  options: HANDLES.map((h) => ({ ...h })),
});

// Особливі тренажери: перейменування, вправи, регулювання, схеми.
const SPECIAL = {
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
      {
        id: 'grip',
        label: 'Хват',
        kind: 'options',
        // Назви умовні — тренер перейменовує.
        options: [
          { id: 'green', label: 'Верх', color: '#2e9d4f' },
          { id: 'red', label: 'Вигин', color: '#d63b3b' },
          { id: 'orange', label: 'Низ', color: '#f08a1c' },
        ],
      },
    ],
  },
  26: { schemeId: 'low-row' },
};

const pad2 = (n) => String(n).padStart(2, '0');

/** Новий екземпляр стартового каталогу (28 тренажерів). updatedAt = 0: будь-яка правка новіша. */
export function seedEquipment() {
  const list = SITE.map(([no, siteName, group, weightMode]) => {
    const id = `eq-${pad2(no)}`;
    const sp = SPECIAL[no] || {};
    const adjustments = sp.adjustments ? sp.adjustments() : [];
    if (WITH_HANDLE.has(no)) adjustments.push(handleAdjustment());
    return {
      id,
      name: sp.name || siteName,
      siteName,
      siteNo: no,
      group,
      weightMode,
      exercises: sp.exercises
        ? sp.exercises.map((x) => ({ ...x }))
        : [{ id: `${id}-a`, name: siteName }],
      adjustments,
      schemeId: sp.schemeId || null,
      updatedAt: 0,
    };
  });

  const extra = (id, name, group, weightMode, exercises) => ({
    id,
    name,
    siteName: null,
    siteNo: null,
    group,
    weightMode,
    exercises: exercises.map((exName, i) => ({ id: `${id}-${'abcdefgh'[i]}`, name: exName })),
    adjustments: [],
    schemeId: null,
    updatedAt: 0,
  });

  list.push(
    extra('eq-dumbbells', 'Гантелі', 'dumbbells', 'perHand', ['Вправа з гантелями']),
    extra('eq-bar', 'Турнік', 'bar', 'bodyweight', ['Підтягування']),
    extra('eq-cardio', 'Кардіо', 'cardio', 'cardio', ['Бігова доріжка', 'Велотренажер', 'Еліпс']),
  );
  return list;
}
