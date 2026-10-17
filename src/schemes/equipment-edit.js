// Редагування тренажерів тренером (екран «Тренажери»). Чисті функції: повертають
// новий об'єкт, оригінал не змінюють. Помилки — Error з текстом українською.

import { uuid, GROUPS, WEIGHT_MODES } from '../core/model.js';
import { HANDLES, HANDLE_ADJUSTMENT } from '../core/catalog.js';

const clean = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');
const need = (s, what) => {
  const v = clean(s);
  if (!v) throw new Error(`Вкажіть ${what}`);
  if (v.length > 80) throw new Error('Задовга назва');
  return v;
};
const copy = (eq) => ({
  ...eq,
  exercises: (eq.exercises || []).map((x) => ({ ...x })),
  adjustments: (eq.adjustments || []).map((a) => ({
    ...a,
    options: a.options ? a.options.map((o) => ({ ...o })) : a.options,
  })),
});
const findAdj = (eq, id) => {
  const a = eq.adjustments.find((x) => x.id === id && !x.deleted);
  if (!a) throw new Error('Регулювання не знайдено');
  return a;
};
const countOf = (count) => {
  const n = Number(count);
  if (!Number.isInteger(n) || n < 2 || n > 30) throw new Error('Кількість позицій — від 2 до 30');
  return n;
};

/** Список варіантів з тексту: рядок, кома або крапка з комою — окремий варіант. */
export function parseOptions(text) {
  return String(text ?? '').split(/[\n,;]/).map(clean).filter(Boolean);
}

export function renameEquipment(eq, name) {
  return { ...copy(eq), name: need(name, 'назву тренажера') };
}

export function setHidden(eq, hidden) {
  return { ...copy(eq), hidden: !!hidden };
}

/** Свій тренажер тренера. Порожня exerciseName → вправа зветься як тренажер. */
export function addEquipment({ name, group, weightMode, exerciseName }) {
  const n = need(name, 'назву тренажера');
  if (!Object.hasOwn(GROUPS, group)) throw new Error('Виберіть групу');
  if (!Object.hasOwn(WEIGHT_MODES, weightMode)) throw new Error('Виберіть тип ваги');
  return {
    id: uuid(),
    name: n,
    siteName: null,
    siteNo: null,
    group,
    weightMode,
    exercises: [{ id: uuid(), name: clean(exerciseName) || n }],
    adjustments: [],
    schemeId: null,
    custom: true,
  };
}

export function addExercise(eq, name) {
  const out = copy(eq);
  out.exercises.push({ id: uuid(), name: need(name, 'назву вправи') });
  return out;
}

export function renameExercise(eq, exerciseId, name) {
  const out = copy(eq);
  const x = out.exercises.find((e) => e.id === exerciseId);
  if (!x) throw new Error('Вправу не знайдено');
  x.name = need(name, 'назву вправи');
  return out;
}

/** Прибирає вправу м'яко (deleted) — записи й обмін не ламаються. Останню не прибрати. */
export function removeExercise(eq, exerciseId) {
  const out = copy(eq);
  if (out.exercises.filter((e) => !e.deleted).length <= 1) {
    throw new Error('Не можна прибрати останню вправу тренажера');
  }
  const x = out.exercises.find((e) => e.id === exerciseId);
  if (x) x.deleted = true;
  return out;
}

/**
 * Нове регулювання:
 *   {label, kind:'positions', count}        — позиції 1…count
 *   {label, kind:'options', options:[назви]} — варіанти
 *   {kind:'handle'}                          — готова «Ручка» (5 малюнків)
 */
export function addAdjustment(eq, spec) {
  const out = copy(eq);
  if (spec.kind === 'handle') {
    const fresh = {
      id: HANDLE_ADJUSTMENT.id,
      label: HANDLE_ADJUSTMENT.label,
      kind: 'options',
      options: HANDLES.map((x) => ({ ...x })),
    };
    const i = out.adjustments.findIndex((a) => a.id === HANDLE_ADJUSTMENT.id);
    if (i >= 0 && !out.adjustments[i].deleted) throw new Error('Ручка на цьому тренажері вже є');
    if (i >= 0) out.adjustments[i] = fresh; // повертаємо прибрану раніше — той самий id
    else out.adjustments.push(fresh);
    return out;
  }
  const label = need(spec.label, 'назву регулювання');
  if (spec.kind === 'positions') {
    out.adjustments.push({ id: uuid(), label, kind: 'positions', count: countOf(spec.count) });
    return out;
  }
  if (spec.kind === 'options') {
    const labels = (spec.options || []).map(clean).filter(Boolean);
    if (labels.length < 2) throw new Error('Потрібно щонайменше два варіанти');
    out.adjustments.push({
      id: uuid(), label, kind: 'options',
      options: labels.map((l) => ({ id: uuid(), label: l })),
    });
    return out;
  }
  throw new Error('Невідомий тип регулювання');
}

export function renameAdjustment(eq, adjustmentId, label) {
  const out = copy(eq);
  findAdj(out, adjustmentId).label = need(label, 'назву регулювання');
  return out;
}

export function renameOption(eq, adjustmentId, optionId, label) {
  const out = copy(eq);
  const o = (findAdj(out, adjustmentId).options || []).find((x) => x.id === optionId);
  if (!o) throw new Error('Варіант не знайдено');
  o.label = need(label, 'назву варіанта');
  return out;
}

export function addOption(eq, adjustmentId, label) {
  const out = copy(eq);
  const a = findAdj(out, adjustmentId);
  if (a.kind !== 'options') throw new Error('Це регулювання має позиції, а не варіанти');
  a.options.push({ id: uuid(), label: need(label, 'назву варіанта') });
  return out;
}

/** Точна кількість позицій із залу — знімає позначку «⚠ приблизно». */
export function setPositionCount(eq, adjustmentId, count) {
  const out = copy(eq);
  const a = findAdj(out, adjustmentId);
  if (a.kind !== 'positions') throw new Error('Це регулювання має варіанти, а не позиції');
  a.count = countOf(count);
  a.approx = false;
  a.unknown = false;
  return out;
}

export function removeAdjustment(eq, adjustmentId) {
  const out = copy(eq);
  findAdj(out, adjustmentId).deleted = true;
  return out;
}
