// Файл обміну тренер ↔ клієнт і резервна копія: формат, перевірка, злиття.
// Чистий модуль: без DOM, IndexedDB, window, navigator.
//
// Злиття — за id: перемагає більший updatedAt (і для видалень — deleted:true теж запис).
// Тому повторний імпорт того самого файлу нічого не змінює.
//
// state (знімок телефона) = { meta, clients, equipment, sessions, settings } — разом із видаленими.

import { settingId, today } from './model.js';

export const FORMAT = 'trainer-log';
export const VERSION = 1;
export const KINDS = Object.freeze(['client-to-trainer', 'trainer-to-client', 'backup']);
const ENTITY_KINDS = ['clients', 'equipment', 'sessions', 'settings'];
export const BACKUP_DUE_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

// --- відбір даних під вид файлу ----------------------------------------------

const ofClient = (list, clientId) => (list || []).filter((x) => x.clientId === clientId);
const findById = (list, id) => (list || []).find((x) => x.id === id) || null;

/** Що тренер шле клієнту: картка, його сесії й налаштування (з видаленими), весь каталог. */
export function selectForClient(state, clientId) {
  const client = findById(state.clients, clientId);
  return {
    clients: client ? [client] : [],
    equipment: [...(state.equipment || [])],
    sessions: ofClient(state.sessions, clientId),
    settings: ofClient(state.settings, clientId),
  };
}

/** Що клієнт шле тренеру: своя картка, сесії й налаштування (каталог тренер не переймає). */
export function selectForTrainer(state) {
  const clientId = state.meta && state.meta.clientId;
  const client = findById(state.clients, clientId);
  return {
    clients: client ? [client] : [],
    equipment: [],
    sessions: ofClient(state.sessions, clientId),
    settings: ofClient(state.settings, clientId),
  };
}

/** Усі дані телефона. */
export function selectBackup(state) {
  const out = {};
  for (const k of ENTITY_KINDS) out[k] = [...(state[k] || [])];
  return out;
}

// --- пакет ---------------------------------------------------------------------

/**
 * kind: 'client-to-trainer' | 'trainer-to-client' | 'backup'
 * data = { clients, equipment, sessions, settings }; meta — метадані телефона-відправника.
 */
export function buildPackage(kind, data, meta = {}, { now = Date.now() } = {}) {
  if (!KINDS.includes(kind)) throw new Error(`Невідомий вид файлу: ${kind}`);
  const pkg = {
    format: FORMAT,
    version: VERSION,
    kind,
    createdAt: now,
    from: { role: meta.role || null, deviceId: meta.deviceId || null, name: meta.trainerName || null },
  };
  if (kind === 'backup') {
    pkg.clients = data.clients || [];
    pkg.meta = {
      role: meta.role || null,
      clientId: meta.clientId || null,
      trainerName: meta.trainerName || null,
      lastBackupAt: meta.lastBackupAt || null,
      aliases: { ...(meta.aliases || {}) },
    };
  } else {
    const client = (data.clients || [])[0];
    if (!client) throw new Error('Немає картки клієнта для файлу');
    pkg.client = { id: client.id, name: client.name };
    pkg.clients = [client];
  }
  pkg.equipment = data.equipment || [];
  pkg.sessions = data.sessions || [];
  pkg.settings = data.settings || [];
  return pkg;
}

const ERR_BROKEN = 'Файл пошкоджений або це не файл «Журналу тренера».';
const ERR_FOREIGN = 'Це не файл «Журналу тренера» — відкрийте файл, який надіслала ця програма.';

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x) => typeof x === 'string' && x.length > 0;
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

function checkEntities(list, extra) {
  if (!Array.isArray(list)) return false;
  return list.every((x) => isObj(x) && isStr(x.id) && isNum(x.updatedAt) && (!extra || extra(x)));
}

const CHECKS = {
  clients: (x) => x.deleted || typeof x.name === 'string',
  equipment: (x) => x.deleted || (typeof x.name === 'string' && Array.isArray(x.exercises)),
  sessions: (x) => isStr(x.clientId) && (x.deleted || Array.isArray(x.sets)),
  settings: (x) => isStr(x.clientId) && isStr(x.exerciseId) && isStr(x.adjustmentId),
};

/** Чи приймає телефон з роллю role файл виду kind (і роль копії). → null | 'текст помилки' */
function directionError(pkg, role) {
  const { kind } = pkg;
  if (kind === 'backup') {
    const from = pkg.meta.role;
    if (role === 'trainer' && from === 'client') {
      return 'Це копія телефона клієнта, а цей телефон — тренера. Відновлюйте її на телефоні клієнта.';
    }
    if (role === 'client' && from === 'trainer') {
      return 'Це копія телефона тренера, а цей телефон — клієнта. Відновлюйте її на телефоні тренера.';
    }
    return null;
  }
  if (kind === 'client-to-trainer' && role !== 'trainer') {
    return role === 'client'
      ? 'Це файл від клієнта для тренера. Відкрийте його на телефоні тренера.'
      : 'Це файл від клієнта для тренера. Спершу виберіть «Я тренер», потім відкрийте файл.';
  }
  if (kind === 'trainer-to-client' && role === 'trainer') {
    return 'Це файл від тренера для клієнта. На телефоні тренера відкривайте файли від клієнтів.';
  }
  return null;
}

/**
 * Розбирає й перевіряє текст файлу. opts.role (якщо передано, у т.ч. null) — перевірка напряму.
 * → {ok:true, pkg} | {ok:false, error:'текст українською'}
 */
export function parsePackage(text, opts = {}) {
  let pkg;
  try {
    pkg = JSON.parse(String(text || ''));
  } catch {
    return { ok: false, error: ERR_BROKEN };
  }
  if (!isObj(pkg)) return { ok: false, error: ERR_FOREIGN };
  if (pkg.format !== FORMAT) return { ok: false, error: ERR_FOREIGN };
  if (!Number.isInteger(pkg.version) || pkg.version < 1) return { ok: false, error: ERR_BROKEN };
  if (pkg.version > VERSION) {
    return { ok: false, error: 'Файл створено новішою версією програми. Оновіть програму (перезапустіть її з інтернетом) і спробуйте знову.' };
  }
  if (!KINDS.includes(pkg.kind)) return { ok: false, error: ERR_BROKEN };
  if (!isNum(pkg.createdAt)) return { ok: false, error: ERR_BROKEN };
  if (pkg.kind === 'backup') {
    if (!isObj(pkg.meta) || ![null, 'trainer', 'client'].includes(pkg.meta.role ?? null)) return { ok: false, error: ERR_BROKEN };
    if (pkg.meta.role === 'client' && !isStr(pkg.meta.clientId)) return { ok: false, error: ERR_BROKEN };
    if (pkg.meta.aliases != null && !isObj(pkg.meta.aliases)) return { ok: false, error: ERR_BROKEN };
  } else if (!isObj(pkg.client) || !isStr(pkg.client.id) || typeof pkg.client.name !== 'string') {
    return { ok: false, error: ERR_BROKEN };
  }
  for (const k of ENTITY_KINDS) {
    if (pkg[k] === undefined && k === 'clients' && pkg.kind !== 'backup') continue;
    if (!checkEntities(pkg[k], CHECKS[k])) return { ok: false, error: ERR_BROKEN };
  }
  if ('role' in opts) {
    const error = directionError(pkg, opts.role ?? null);
    if (error) return { ok: false, error };
  }
  return { ok: true, pkg };
}

// --- злиття ---------------------------------------------------------------------

/**
 * Злиття за id: перемагає більший updatedAt; при рівному — лишається локальне.
 * → { merged[], changed[] (що записати), added, updated, removed }
 *   added — нові живі записи; removed — живі, що стали видаленими; updated — інші зміни.
 */
export function mergeEntities(local, incoming) {
  const map = new Map((local || []).map((x) => [x.id, x]));
  const changed = new Map();
  let added = 0;
  let updated = 0;
  let removed = 0;
  for (const inc of incoming || []) {
    const cur = map.get(inc.id);
    if (cur && !((inc.updatedAt || 0) > (cur.updatedAt || 0))) continue;
    if (!cur) {
      if (!inc.deleted) added++;
    } else if (inc.deleted && !cur.deleted) removed++;
    else if (!(inc.deleted && cur.deleted)) updated++;
    map.set(inc.id, inc);
    changed.set(inc.id, inc);
  }
  return { merged: [...map.values()], changed: [...changed.values()], added, updated, removed };
}

// --- перепризначення клієнта ----------------------------------------------------

const remapSession = (s, toId) => ({ ...s, clientId: toId });
const remapSetting = (s, toId) => ({ ...s, clientId: toId, id: settingId(toId, s.exerciseId, s.adjustmentId) });

const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'uk');
const liveClient = (state, id) => {
  const c = id ? findById(state.clients, id) : null;
  return c && !c.deleted ? c : null;
};

/** Картка тренера, куди йде файл клієнта з id: alias → та сама картка → null (питати). */
function resolveTrainerTarget(state, incomingId) {
  const alias = (state.meta.aliases || {})[incomingId];
  if (alias && liveClient(state, alias)) return alias;
  if (liveClient(state, incomingId)) return incomingId;
  return null;
}

/** id клієнта, яким стане телефон клієнта після файлу (від тренера або копії клієнта). */
function clientTargetOf(pkg) {
  return pkg.kind === 'trainer-to-client' ? pkg.client.id : pkg.meta.clientId;
}

/**
 * План імпорту (до питань користувачу).
 * → { kind, error?, needsClientChoice, candidates: Client[], clientName, targetClientId,
 *     adopt (записи клієнта цього телефона перейдуть у іншу картку), fromName, becomesRole }
 */
export function planImport(pkg, state) {
  const role = state.meta.role ?? null;
  const error = directionError(pkg, role);
  const plan = {
    kind: pkg.kind, needsClientChoice: false, candidates: [], clientName: pkg.client ? pkg.client.name : null,
    targetClientId: null, adopt: false, fromName: null, becomesRole: role || (pkg.kind === 'backup' ? pkg.meta.role : 'client'),
  };
  if (error) return { ...plan, error };

  if (pkg.kind === 'client-to-trainer') {
    plan.targetClientId = resolveTrainerTarget(state, pkg.client.id);
    if (!plan.targetClientId) {
      plan.needsClientChoice = true;
      plan.candidates = (state.clients || []).filter((c) => !c.deleted).sort(byName);
    }
    return plan;
  }

  const toId = clientTargetOf(pkg);
  if (plan.becomesRole === 'client' && toId) {
    plan.targetClientId = toId;
    const mine = role === 'client' ? liveClient(state, state.meta.clientId) : null;
    if (mine && mine.id !== toId) {
      plan.adopt = true;
      plan.fromName = mine.name;
    }
  }
  return plan;
}

const emptyCount = () => ({ added: 0, updated: 0, removed: 0 });

/**
 * Застосовує файл до стану телефона. opts: { targetClientId?, now? }
 *  - client-to-trainer: записи клієнта → картка targetClientId (або знайдена за alias/id);
 *    якщо картка інша, ніж id у файлі, — записується alias. targetClientId === id з файлу — «Створити картку».
 *  - trainer-to-client / копія клієнта: телефон стає клієнтом з id з файлу; свої записи переносить туди.
 *  - backup: злиття всіх даних + роль, ім'я, aliases.
 * → { state: { clients[], equipment[], sessions[], settings[], meta: patch }, summary }
 *   Повертає лише змінене; повторний імпорт → порожні списки.
 */
export function applyImport(pkg, state, { targetClientId = null, now = Date.now() } = {}) {
  const role = state.meta.role ?? null;
  const error = directionError(pkg, role);
  if (error) throw new Error(error);

  const work = {};
  for (const k of ENTITY_KINDS) work[k] = [...(state[k] || [])];
  const changes = { clients: new Map(), equipment: new Map(), sessions: new Map(), settings: new Map() };
  const meta = {};
  const summary = { clients: emptyCount(), equipment: emptyCount(), sessions: emptyCount(), settings: emptyCount() };

  const touch = (k, rec) => {
    const i = work[k].findIndex((x) => x.id === rec.id);
    if (i >= 0) work[k][i] = rec; else work[k].push(rec);
    changes[k].set(rec.id, rec);
  };
  const merge = (k, incoming, count = true) => {
    const r = mergeEntities(work[k], incoming);
    for (const rec of r.changed) touch(k, rec);
    if (count) {
      summary[k].added += r.added;
      summary[k].updated += r.updated;
      summary[k].removed += r.removed;
    }
  };

  if (pkg.kind === 'client-to-trainer') {
    const fromId = pkg.client.id;
    let toId = targetClientId || resolveTrainerTarget(state, fromId);
    if (!toId) throw new Error('Виберіть картку клієнта для цього файлу');
    if (toId !== fromId && !liveClient(state, toId)) throw new Error('Вибраної картки клієнта немає');
    const sessions = ofClient(pkg.sessions, fromId).map((s) => (toId === fromId ? s : remapSession(s, toId)));
    const settings = ofClient(pkg.settings, fromId).map((s) => (toId === fromId ? s : remapSetting(s, toId)));
    if (toId === fromId) {
      const inc = findById(pkg.clients, fromId) || { id: fromId, name: pkg.client.name, updatedAt: 0 };
      const cur = findById(work.clients, fromId);
      if (cur && cur.deleted && targetClientId === fromId) {
        // «Створити картку» для колись видаленого клієнта — картка знову жива.
        const { deleted, ...rest } = cur;
        touch('clients', { ...rest, name: inc.deleted ? cur.name : inc.name, updatedAt: Math.max(now, cur.updatedAt + 1) });
        summary.clients.added++;
      } else {
        if (!inc.deleted) merge('clients', [inc], false); // свою картку в тренера клієнт не видаляє
      }
    } else if ((state.meta.aliases || {})[fromId] !== toId) {
      meta.aliases = { ...(state.meta.aliases || {}), [fromId]: toId };
    }
    merge('sessions', sessions);
    merge('settings', settings);
  } else {
    const becomes = role || (pkg.kind === 'backup' ? pkg.meta.role : 'client');
    const toId = clientTargetOf(pkg);

    // Клієнт, що почав сам (або з іншою карткою), переходить на id з файлу — без втрат і дублів.
    if (role === 'client' && becomes === 'client' && toId && state.meta.clientId && state.meta.clientId !== toId) {
      const fromId = state.meta.clientId;
      for (const s of ofClient(state.sessions, fromId)) touch('sessions', remapSession(s, toId));
      for (const s of ofClient(state.settings, fromId)) {
        const moved = remapSetting(s, toId);
        const r = mergeEntities(work.settings, [moved]);
        for (const rec of r.changed) touch('settings', rec);
        if (!s.deleted) touch('settings', { ...s, deleted: true, updatedAt: Math.max(now, s.updatedAt + 1) });
      }
      const old = findById(state.clients, fromId);
      if (old && !old.deleted) touch('clients', { ...old, deleted: true, updatedAt: Math.max(now, old.updatedAt + 1) });
      meta.aliases = { ...(state.meta.aliases || {}), [fromId]: toId };
    }

    if (pkg.kind === 'trainer-to-client') {
      merge('clients', ofList(pkg.clients).filter((c) => c.id === toId), false);
      if (!findById(work.clients, toId)) touch('clients', { id: toId, name: pkg.client.name, updatedAt: pkg.createdAt });
      merge('equipment', pkg.equipment);
      merge('sessions', ofClient(pkg.sessions, toId));
      merge('settings', ofClient(pkg.settings, toId));
    } else {
      merge('clients', pkg.clients);
      merge('equipment', pkg.equipment);
      merge('sessions', pkg.sessions);
      merge('settings', pkg.settings);
      const m = pkg.meta;
      const aliases = { ...(m.aliases || {}), ...(state.meta.aliases || {}), ...(meta.aliases || {}) };
      if (JSON.stringify(aliases) !== JSON.stringify(state.meta.aliases || {})) meta.aliases = aliases;
      if (!state.meta.trainerName && m.trainerName) meta.trainerName = m.trainerName;
      const last = Math.max(state.meta.lastBackupAt || 0, m.lastBackupAt || 0, pkg.createdAt);
      if (last !== (state.meta.lastBackupAt || 0)) meta.lastBackupAt = last;
    }

    if (role !== becomes) meta.role = becomes;
    if (becomes === 'client' && toId && state.meta.clientId !== toId) meta.clientId = toId;
    if (pkg.kind === 'trainer-to-client' && pkg.from && pkg.from.name && state.meta.trainerName !== pkg.from.name) {
      meta.trainerName = pkg.from.name;
    }
  }

  const out = { meta };
  for (const k of ENTITY_KINDS) out[k] = [...changes[k].values()];
  return { state: out, summary };
}

const ofList = (x) => (Array.isArray(x) ? x : []);

// --- нагадування й тексти ----------------------------------------------------------

/**
 * Чи показувати «Давно не зберігали копію»: понад 14 днів від останньої копії
 * (або, якщо копії не було, від найдавнішого незбереженого запису) і є записи, новіші за копію.
 */
export function backupDue(meta, sessions, now = Date.now()) {
  const last = (meta && meta.lastBackupAt) || 0;
  const fresh = (sessions || []).filter((s) => (s.updatedAt || 0) > last);
  if (!fresh.length) return false;
  const since = last || Math.min(...fresh.map((s) => s.updatedAt || 0));
  return now - since > BACKUP_DUE_DAYS * DAY;
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const records = (n) => `${n} ${plural(n, 'запис', 'записи', 'записів')}`;
const settingsWord = (n) => `${n} ${plural(n, 'налаштування', 'налаштування', 'налаштувань')}`;
const machines = (n) => `${n} ${plural(n, 'тренажер', 'тренажери', 'тренажерів')}`;

/** «Додано 5 записів, оновлено 2 налаштування» | «Нового нічого». */
export function summaryText(summary) {
  const s = summary.sessions || emptyCount();
  const st = summary.settings || emptyCount();
  const eq = summary.equipment || emptyCount();
  const parts = [];
  if (s.added) parts.push(`додано ${records(s.added)}`);
  if (s.updated) parts.push(`оновлено ${records(s.updated)}`);
  if (s.removed) parts.push(`видалено ${records(s.removed)}`);
  const stn = st.added + st.updated + st.removed;
  if (stn) parts.push(`оновлено ${settingsWord(stn)}`);
  const eqn = eq.added + eq.updated + eq.removed;
  if (eqn) parts.push(`оновлено ${machines(eqn)}`);
  if (!parts.length) return 'Нового нічого';
  const text = parts.join(', ');
  return text[0].toUpperCase() + text.slice(1);
}

/** Ім'я файлу: журнал-<ім'я>-<дата>.json */
export function exchangeFileName(name, date = new Date()) {
  const clean = String(name || '').trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'дані';
  return `журнал-${clean}-${today(date)}.json`;
}
