// Значення регулювань клієнта. Чистий модуль: без DOM і сховища.

import { settingId } from '../core/model.js';

/** Невидалені регулювання тренажера. */
export const activeAdjustments = (equipment) => (equipment.adjustments || []).filter((a) => !a.deleted);

/** Невидалені вправи тренажера. */
export const activeExercises = (equipment) => (equipment.exercises || []).filter((x) => !x.deleted);

/** Налаштування клієнта для вправи → {[adjustmentId]: value}. Якщо записів кілька — пізніший. */
export function valuesFor(settings, clientId, exerciseId) {
  const out = {};
  const at = {};
  for (const s of settings || []) {
    if (s.deleted || s.clientId !== clientId || s.exerciseId !== exerciseId) continue;
    if (at[s.adjustmentId] !== undefined && at[s.adjustmentId] > (s.updatedAt || 0)) continue;
    at[s.adjustmentId] = s.updatedAt || 0;
    if (s.value === null || s.value === undefined || s.value === '') delete out[s.adjustmentId];
    else out[s.adjustmentId] = s.value;
  }
  return out;
}

/** Новий запис Setting (клієнт + вправа + регулювання). */
export function makeSetting({ clientId, equipmentId, exerciseId, adjustmentId, value, by }) {
  return {
    id: settingId(clientId, exerciseId, adjustmentId),
    clientId,
    equipmentId,
    exerciseId,
    adjustmentId,
    value: value === undefined ? null : value,
    updatedAt: Date.now(),
    by: by === 'client' ? 'client' : 'trainer',
  };
}

/** Чи вибрано значення (позиція в межах 1…count або існуючий варіант). */
export function isSet(adjustment, value) {
  if (value === null || value === undefined || value === '') return false;
  if (adjustment.kind === 'options') return (adjustment.options || []).some((o) => o.id === value && !o.deleted);
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= (adjustment.count || 0);
}

/**
 * Пояснення позиції: '1 — найнижче' для першої/останньої, якщо схема дає HINTS
 * ({[adjustmentId]: {first, last}}); інакше просто номер.
 */
export function positionHint(adjustment, n, hints = {}) {
  const h = hints[adjustment.id];
  if (h && n === 1 && h.first) return `1 — ${h.first}`;
  if (h && n === adjustment.count && h.last) return `${n} — ${h.last}`;
  return String(n);
}
