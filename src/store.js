// Сховище на IndexedDB. Єдиний модуль, що торкається бази.
//
// openStore() → Promise<Store>
// Store: getMeta(), setMeta(patch), all(kind, {withDeleted}), get(kind, id), put(kind, obj),
//        putMany(kind, objs), remove(kind, id), snapshot(), replaceAll(snapshot), clearAll()
// kind: 'clients' | 'equipment' | 'sessions' | 'settings'

import { uuid } from './core/model.js';
import { upgradeEquipment, CATALOG_VERSION } from './core/catalog.js';

export const KINDS = Object.freeze(['clients', 'equipment', 'sessions', 'settings']);
const META = 'meta';
const META_KEY = 'meta';
const DB_VERSION = 1;

const DEFAULT_META = () => ({
  role: null,
  deviceId: uuid(),
  clientId: null,
  trainerName: null,
  lastBackupAt: null,
  aliases: {},
});

const req = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

const done = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error || new Error('Транзакцію перервано'));
});

function checkKind(kind) {
  if (!KINDS.includes(kind)) throw new Error(`Невідомий вид даних: ${kind}`);
}

function openDb(idb, name) {
  return new Promise((resolve, reject) => {
    const r = idb.open(name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      for (const kind of KINDS) {
        if (!db.objectStoreNames.contains(kind)) {
          const os = db.createObjectStore(kind, { keyPath: 'id' });
          if (kind === 'sessions' || kind === 'settings') os.createIndex('clientId', 'clientId');
        }
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Базу даних відкрито в іншій вкладці — закрийте її'));
  });
}

/** Просить браузер не стирати дані (navigator.storage.persist). → true|false|null */
export async function requestPersist() {
  try {
    const s = globalThis.navigator && globalThis.navigator.storage;
    if (!s || typeof s.persist !== 'function') return null;
    if (typeof s.persisted === 'function' && (await s.persisted())) return true;
    return await s.persist();
  } catch {
    return null;
  }
}

/**
 * Відкриває сховище; при першому відкритті засіває каталог тренажерів.
 * Опції — для перевірок: { indexedDB, name, persist }.
 */
export async function openStore({
  indexedDB: idb = globalThis.indexedDB,
  name = 'trainer-log',
  persist = true,
} = {}) {
  if (!idb) throw new Error('Браузер не підтримує збереження даних (IndexedDB)');
  const db = await openDb(idb, name);

  async function getMeta() {
    const tx = db.transaction(META, 'readonly');
    const meta = await req(tx.objectStore(META).get(META_KEY));
    return meta ? { ...DEFAULT_META(), ...meta } : null;
  }

  async function writeMeta(meta) {
    const tx = db.transaction(META, 'readwrite');
    tx.objectStore(META).put(meta, META_KEY);
    await done(tx);
    return meta;
  }

  const store = {
    db,

    /** Метадані телефона (роль, deviceId, …). Завжди повний об'єкт. */
    async getMeta() {
      return (await getMeta()) || writeMeta(DEFAULT_META());
    },

    /** Дописує поля в метадані. → новий meta */
    async setMeta(patch) {
      const cur = (await getMeta()) || DEFAULT_META();
      return writeMeta({ ...cur, ...patch });
    },

    /** Усі записи виду; без видалених, якщо не {withDeleted:true}. */
    async all(kind, { withDeleted = false } = {}) {
      checkKind(kind);
      const tx = db.transaction(kind, 'readonly');
      const list = await req(tx.objectStore(kind).getAll());
      return withDeleted ? list : list.filter((x) => !x.deleted);
    },

    /** Один запис за id (у т.ч. видалений) або null. */
    async get(kind, id) {
      checkKind(kind);
      const tx = db.transaction(kind, 'readonly');
      const v = await req(tx.objectStore(kind).get(id));
      return v === undefined ? null : v;
    },

    /**
     * Зберігає правку: updatedAt = Date.now() (правка з інтерфейсу завжди новіша).
     * {keepUpdatedAt:true} — лишити переданий updatedAt (якщо він є).
     */
    async put(kind, obj, { keepUpdatedAt = false } = {}) {
      checkKind(kind);
      const rec = { ...obj };
      if (!rec.id) rec.id = uuid();
      if (!keepUpdatedAt || typeof rec.updatedAt !== 'number') rec.updatedAt = Date.now();
      const tx = db.transaction(kind, 'readwrite');
      tx.objectStore(kind).put(rec);
      await done(tx);
      return rec;
    },

    /** Масовий запис (імпорт/засівання): переданий updatedAt зберігається, відсутній — Date.now(). */
    async putMany(kind, objs) {
      checkKind(kind);
      const now = Date.now();
      const recs = objs.map((o) => {
        const rec = { ...o };
        if (!rec.id) rec.id = uuid();
        if (typeof rec.updatedAt !== 'number') rec.updatedAt = now;
        return rec;
      });
      const tx = db.transaction(kind, 'readwrite');
      const os = tx.objectStore(kind);
      for (const rec of recs) os.put(rec);
      await done(tx);
      return recs;
    },

    /** М'яке видалення: deleted:true, updatedAt:now. → запис або null */
    async remove(kind, id) {
      const cur = await store.get(kind, id);
      if (!cur) return null;
      return store.put(kind, { ...cur, deleted: true });
    },

    /** Усі дані телефона, разом із видаленими. */
    async snapshot() {
      const tx = db.transaction([META, ...KINDS], 'readonly');
      const meta = await req(tx.objectStore(META).get(META_KEY));
      const out = { meta: meta ? { ...DEFAULT_META(), ...meta } : DEFAULT_META() };
      for (const kind of KINDS) out[kind] = await req(tx.objectStore(kind).getAll());
      return out;
    },

    /** Замінює всі дані знімком (відновлення з копії). deviceId телефона зберігається. */
    async replaceAll(snap) {
      const cur = (await getMeta()) || DEFAULT_META();
      const tx = db.transaction([META, ...KINDS], 'readwrite');
      const meta = { ...DEFAULT_META(), ...(snap.meta || {}), deviceId: cur.deviceId };
      tx.objectStore(META).put(meta, META_KEY);
      for (const kind of KINDS) {
        const os = tx.objectStore(kind);
        os.clear();
        for (const rec of snap[kind] || []) os.put(rec);
      }
      await done(tx);
      await upgradeCatalog();
    },

    /**
     * Чисте сховище («Змінити роль»): прибирає всі записи й метадані (роль, клієнт, псевдоніми),
     * лишає deviceId телефона і заново засіває стартовий каталог. Викликати лише після
     * підтвердження користувача (settings.changeRole).
     */
    async clearAll() {
      const cur = (await getMeta()) || DEFAULT_META();
      const tx = db.transaction([META, ...KINDS], 'readwrite');
      tx.objectStore(META).put({ ...DEFAULT_META(), deviceId: cur.deviceId }, META_KEY);
      for (const kind of KINDS) tx.objectStore(kind).clear();
      await done(tx);
      await upgradeCatalog();
    },

    /**
     * Імпорт: записує змінене однією транзакцією (або все, або нічого).
     * changes = { clients?, equipment?, sessions?, settings?: записи як є (updatedAt не чіпає), meta?: patch }
     */
    async applyChanges(changes) {
      const cur = (await getMeta()) || DEFAULT_META();
      const tx = db.transaction([META, ...KINDS], 'readwrite');
      if (changes.meta && Object.keys(changes.meta).length) {
        tx.objectStore(META).put({ ...cur, ...changes.meta, deviceId: cur.deviceId }, META_KEY);
      }
      for (const kind of KINDS) {
        const os = tx.objectStore(kind);
        for (const rec of changes[kind] || []) os.put(rec);
      }
      await done(tx);
      // Тренажери зі старого каталогу (файл з телефона без оновлення) — одразу до нової версії.
      if ((changes.equipment || []).length) await upgradeCatalog();
    },

    close() {
      db.close();
    },
  };

  /**
   * Засівання й оновлення каталогу: додає відсутні стартові тренажери і оновлює ті, що ще
   * старої версії (catalog.upgradeEquipment). Записи й налаштування не чіпає. Одна транзакція.
   */
  async function upgradeCatalog() {
    const [equipment, sessions, settings] = await Promise.all(
      ['equipment', 'sessions', 'settings'].map((k) => store.all(k, { withDeleted: true })),
    );
    const changed = upgradeEquipment(equipment, { sessions, settings });
    const meta = (await getMeta()) || DEFAULT_META();
    const metaChanged = meta.catalogVersion !== CATALOG_VERSION;
    if (!changed.length && !metaChanged) return;
    const tx = db.transaction([META, 'equipment'], 'readwrite');
    const os = tx.objectStore('equipment');
    for (const rec of changed) os.put(rec);
    if (metaChanged) tx.objectStore(META).put({ ...meta, catalogVersion: CATALOG_VERSION }, META_KEY);
    await done(tx);
  }

  await upgradeCatalog();
  await store.getMeta();

  if (persist) requestPersist();
  return store;
}
