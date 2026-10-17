// Операції журналу над сховищем: сесії, підходи, налаштування, каскадне видалення клієнта.
// Без DOM. Одна сесія = клієнт + вправа + дата; нові підходи дня додаються до неї.

import { uuid, today, settingId } from '../core/model.js';

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.updatedAt || 0) - (b.updatedAt || 0));

/** Живі сесії клієнта (за вправою або тренажером), від старих до нових. */
export async function listSessions(store, clientId, { exerciseId = null, equipmentId = null } = {}) {
  const all = await store.all('sessions');
  return all
    .filter((s) => s.clientId === clientId
      && (!exerciseId || s.exerciseId === exerciseId)
      && (!equipmentId || s.equipmentId === equipmentId))
    .sort(byDate);
}

/**
 * Останній записаний підхід (за найпізнішою датою) або null.
 * upTo: 'YYYY-MM-DD' — лише сесії не пізніше цієї дати (запис на минулу дату підставляє тодішнє).
 */
export function lastSet(sessions, { upTo = null } = {}) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (upTo && sessions[i].date > upTo) continue;
    const sets = sessions[i].sets || [];
    if (sets.length) return sets[sets.length - 1];
  }
  return null;
}

/** 'YYYY-MM-DD' — справжня дата не пізніше todayStr (на майбутнє не записуємо) → та сама дата, інакше null. */
export function validLogDate(raw, todayStr = today()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof raw === 'string' ? raw : '');
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() + 1 !== Number(m[2]) || d.getUTCDate() !== Number(m[3])) return null;
  return raw <= todayStr ? raw : null;
}

/** Додає підхід у сесію дня date (за замовчуванням сьогодні) (створює або «оживляє» видалену). → сесія */
export async function addSet(store, { clientId, equipmentId, exerciseId, set, date = today() }) {
  const all = await store.all('sessions', { withDeleted: true });
  const found = all.find((s) => s.clientId === clientId && s.exerciseId === exerciseId && s.date === date);
  if (found) {
    const { deleted, ...rest } = found;
    return store.put('sessions', { ...rest, equipmentId, sets: deleted ? [set] : [...found.sets, set] });
  }
  return store.put('sessions', { id: uuid(), clientId, equipmentId, exerciseId, date, sets: [set] });
}

/** Замінює підхід з номером index. */
export async function updateSet(store, session, index, set) {
  const sets = session.sets.map((s, i) => (i === index ? set : s));
  return store.put('sessions', { ...session, sets });
}

/** Прибирає підхід; якщо він останній — м'яко видаляє всю сесію. */
export async function deleteSet(store, session, index) {
  if (session.sets.length <= 1) return store.remove('sessions', session.id);
  return store.put('sessions', { ...session, sets: session.sets.filter((_, i) => i !== index) });
}

/** Значення регулювань клієнта для вправи: {[adjustmentId]: value}. */
export async function settingValues(store, clientId, exerciseId) {
  const all = await store.all('settings');
  const out = {};
  for (const s of all) {
    if (s.clientId === clientId && s.exerciseId === exerciseId) out[s.adjustmentId] = s.value;
  }
  return out;
}

export async function saveSetting(store, { clientId, equipmentId, exerciseId, adjustmentId, value, by }) {
  return store.put('settings', {
    id: settingId(clientId, exerciseId, adjustmentId),
    clientId, equipmentId, exerciseId, adjustmentId, value, by,
  });
}

export async function clearSetting(store, clientId, exerciseId, adjustmentId) {
  return store.remove('settings', settingId(clientId, exerciseId, adjustmentId));
}

/** Видаляє клієнта разом з усіма його сесіями й налаштуваннями (м'яко, щоб видалення передалось при обміні). */
export async function deleteClient(store, clientId) {
  const [sessions, settings] = await Promise.all([store.all('sessions'), store.all('settings')]);
  for (const s of sessions) if (s.clientId === clientId) await store.remove('sessions', s.id);
  for (const s of settings) if (s.clientId === clientId) await store.remove('settings', s.id);
  await store.remove('clients', clientId);
}

/** id тренажерів, де в клієнта є записи, — найсвіжіші першими. */
export function recentEquipmentIds(sessions) {
  const latest = new Map();
  for (const s of sessions) {
    const prev = latest.get(s.equipmentId);
    if (!prev || s.date > prev.date || (s.date === prev.date && (s.updatedAt || 0) > prev.at)) {
      latest.set(s.equipmentId, { date: s.date, at: s.updatedAt || 0 });
    }
  }
  return [...latest.entries()]
    .sort((a, b) => (a[1].date < b[1].date ? 1 : a[1].date > b[1].date ? -1 : b[1].at - a[1].at))
    .map(([id]) => id);
}
