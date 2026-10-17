// Модель даних: форма сутностей, перевірка і форматування підходів.
// Чистий модуль: без DOM, IndexedDB, window, navigator.
//
// Усі сутності мають: id (uuid рядок), updatedAt (мс), deleted (bool, опц.)
// Client     { id, name, updatedAt, deleted? }
// Equipment  { id, name, siteName|null, siteNo|null, group, weightMode, exercises: Exercise[],
//              adjustments: Adjustment[], schemeId|null, hidden?, rare?, retired?, custom?,
//              catalogVersion?, updatedAt, deleted? }
//   rare — у меню в кінці групи, сірим; retired — прибраний з каталогу (у меню лише з записами);
//   catalogVersion — до якої версії каталогу запис уже оновлено (catalog.upgradeEquipment).
// Exercise   { id, name, deleted? }
// Adjustment { id, label, kind: 'positions'|'options', count?, options?: [{id,label,color?}],
//              approx?: bool, unknown?: bool, deleted? }
// Session    { id, clientId, equipmentId, exerciseId, date:'YYYY-MM-DD', sets: Set[], updatedAt, deleted? }
// Set        single: { reps, weight } · perHand: { reps, left, right }
//            bodyweight: { reps, extra|null } · cardio: { minutes, km|null, kcal|null }
// Setting    { id: `${clientId}|${exerciseId}|${adjustmentId}`, clientId, equipmentId, exerciseId,
//              adjustmentId, value, updatedAt, by:'trainer'|'client' }
// Meta       { role, deviceId, clientId, trainerName, lastBackupAt, aliases, catalogVersion? }

export function uuid() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const pad = (n) => String(n).padStart(2, '0');

/** Локальна дата телефона як 'YYYY-MM-DD'. */
export function today(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** id групи → українська назва; порядок ключів = порядок у меню. */
export const GROUPS = Object.freeze({
  chest: 'Груди',
  legs: 'Ноги',
  shoulders: 'Плечі',
  abs: 'Прес',
  arms: 'Руки',
  back: 'Спина',
  dumbbells: 'Гантелі',
  bar: 'Турнік',
  cardio: 'Кардіо',
});

/** id типу ваги → українська назва. */
export const WEIGHT_MODES = Object.freeze({
  single: 'Одна вага',
  perHand: 'Окремо ліва і права рука',
  bodyweight: 'Власна вага (+ додаткова)',
  cardio: 'Кардіо (час, дистанція)',
});

// --- розбір чисел ----------------------------------------------------------

const EMPTY = Symbol('empty');
const BAD = Symbol('bad');

function parseNumber(raw) {
  if (raw === null || raw === undefined) return EMPTY;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : BAD;
  const s = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (s === '') return EMPTY;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return BAD;
  return Number(s);
}

// Кожна перевірка повертає [значення, текст помилки|null].
function reps(raw, emptyText = 'Вкажіть кількість повторень') {
  const n = parseNumber(raw);
  if (n === EMPTY) return [null, emptyText];
  if (n === BAD) return [null, 'Введіть число'];
  if (!Number.isInteger(n)) return [null, 'Лише ціле число'];
  if (n <= 0) return [null, 'Має бути більше 0'];
  if (n > 10000) return [null, 'Забагато — перевірте число'];
  return [n, null];
}

function amount(raw, { required, emptyText = 'Вкажіть вагу', integer = false, max = 100000 }) {
  const n = parseNumber(raw);
  if (n === EMPTY) return required ? [null, emptyText] : [null, null];
  if (n === BAD) return [null, 'Введіть число'];
  if (n < 0) return [null, 'Не може бути від\'ємним'];
  if (integer && !Number.isInteger(n)) return [null, 'Лише ціле число'];
  if (n > max) return [null, 'Забагато — перевірте число'];
  return [Math.round(n * 1000) / 1000, null];
}

function positive(raw, emptyText) {
  const [n, err] = amount(raw, { required: true, emptyText });
  if (err) return [null, err];
  if (n <= 0) return [null, 'Має бути більше 0'];
  return [n, null];
}

const FIELDS = {
  single: (r) => ({
    reps: reps(r.reps),
    weight: amount(r.weight, { required: true, max: 2000 }),
  }),
  perHand: (r) => ({
    reps: reps(r.reps),
    left: amount(r.left, { required: true, emptyText: 'Вкажіть вагу лівої руки', max: 1000 }),
    right: amount(r.right, { required: true, emptyText: 'Вкажіть вагу правої руки', max: 1000 }),
  }),
  bodyweight: (r) => ({
    reps: reps(r.reps),
    extra: amount(r.extra, { required: false, max: 1000 }),
  }),
  cardio: (r) => ({
    minutes: positive(r.minutes, 'Вкажіть тривалість у хвилинах'),
    km: amount(r.km, { required: false, max: 1000 }),
    kcal: amount(r.kcal, { required: false, integer: true, max: 100000 }),
  }),
};

// Поля ваги, до яких застосовується крок тренажера.
const STEP_FIELDS = { single: ['weight'], perHand: ['left', 'right'] };

/** Текст підказки, коли вага не кратна кроку. */
export function stepText(step) {
  if (step === 5) return 'На блоці вага кроком 5 кг';
  if (step === 2.5) return 'На дисках вага кроком 2,5 кг';
  return `Вага кроком ${formatNumber(step)} кг`;
}

const isMultiple = (n, step) => Math.abs(n / step - Math.round(n / step)) < 1e-9;

/**
 * Крок ваги тренажера: 5 — блок зі шпилькою (single), 2.5 — диски (perHand тренажер),
 * null — без обмеження (гантелі, турнік, кардіо).
 */
export function weightStep(equipment) {
  if (!equipment || equipment.group === 'dumbbells') return null;
  if (equipment.weightMode === 'single') return 5;
  if (equipment.weightMode === 'perHand') return 2.5;
  return null;
}

/**
 * Перевіряє введений підхід. Приймає рядки з комою або крапкою.
 * opts.step — крок ваги тренажера (weightStep); вага не кратна кроку → підказка.
 * → {ok:true, set} | {ok:false, errors:{field: 'текст'}}
 */
export function validateSet(weightMode, raw = {}, { step = null } = {}) {
  const fields = FIELDS[weightMode];
  if (!fields) return { ok: false, errors: { _: 'Невідомий тип тренажера' } };
  const checked = fields(raw || {});
  if (step > 0) {
    for (const key of STEP_FIELDS[weightMode] || []) {
      const [value, err] = checked[key];
      if (!err && value !== null && !isMultiple(value, step)) checked[key] = [null, stepText(step)];
    }
  }
  const set = {};
  const errors = {};
  for (const [key, [value, err]] of Object.entries(checked)) {
    if (err) errors[key] = err;
    else set[key] = value;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, set };
}

/** Число українською: кома замість крапки, без зайвих нулів. */
export function formatNumber(n) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '';
  return String(Math.round(Number(n) * 100) / 100).replace('.', ',');
}

/** '10 × 40 кг' | '10 × Л 20 / П 22,5 кг' | '12 повт.' | '6 × +7,5 кг' | '30 хв · 5 км' */
export function formatSet(weightMode, set) {
  if (!set) return '';
  const f = formatNumber;
  switch (weightMode) {
    case 'single':
      return `${set.reps} × ${f(set.weight)} кг`;
    case 'perHand':
      return `${set.reps} × Л ${f(set.left)} / П ${f(set.right)} кг`;
    case 'bodyweight':
      return set.extra ? `${set.reps} × +${f(set.extra)} кг` : `${set.reps} повт.`;
    case 'cardio': {
      const parts = [`${f(set.minutes)} хв`];
      if (set.km !== null && set.km !== undefined) parts.push(`${f(set.km)} км`);
      if (set.kcal !== null && set.kcal !== undefined) parts.push(`${f(set.kcal)} ккал`);
      return parts.join(' · ');
    }
    default:
      return '';
  }
}

/** '2026-10-17' → '17.10.2026' */
export function formatDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!m) return String(date || '');
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** id налаштування клієнта для вправи й регулювання. */
export function settingId(clientId, exerciseId, adjustmentId) {
  return `${clientId}|${exerciseId}|${adjustmentId}`;
}
