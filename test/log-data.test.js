// Операції журналу (src/ui/log-data.js): запис на минулу дату (V1), підстановка до дати, м'яке видалення (V2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addSet, deleteSet, lastSet, listSessions, validLogDate } from '../src/ui/log-data.js';

/** Сховище в пам'яті з тим самим інтерфейсом, що src/store.js (all / put / remove, м'яке видалення). */
function memoryStore(initial = []) {
  const rows = new Map(initial.map((s) => [s.id, { ...s }]));
  let clock = 1000;
  return {
    rows,
    async all(kind, { withDeleted = false } = {}) {
      assert.equal(kind, 'sessions');
      return [...rows.values()].filter((s) => withDeleted || !s.deleted).map((s) => ({ ...s }));
    },
    async put(kind, obj) {
      const saved = { ...obj, updatedAt: ++clock };
      rows.set(saved.id, saved);
      return { ...saved };
    },
    async remove(kind, id) {
      const saved = { ...rows.get(id), deleted: true, updatedAt: ++clock };
      rows.set(id, saved);
      return { ...saved };
    },
  };
}

const base = { clientId: 'c1', equipmentId: 'eq-03', exerciseId: 'eq-03-a' };
const S = (id, date, sets, extra = {}) => ({ id, ...base, date, sets, updatedAt: 1, ...extra });

test('addSet з датою кладе підхід у сесію тієї дати, а не сьогоднішньої', async () => {
  const store = memoryStore([
    S('today', '2026-10-18', [{ reps: 10, weight: 40 }]),
    S('old', '2026-09-17', [{ reps: 8, weight: 30 }]),
  ]);
  await addSet(store, { ...base, set: { reps: 12, weight: 35 }, date: '2026-09-17' });
  assert.deepEqual(store.rows.get('old').sets, [{ reps: 8, weight: 30 }, { reps: 12, weight: 35 }]);
  assert.deepEqual(store.rows.get('today').sets, [{ reps: 10, weight: 40 }], 'сьогоднішня сесія не змінилась');
});

test('addSet на дату без сесії створює нову сесію цієї дати; на графіку й в історії вона стає на своє місце', async () => {
  const store = memoryStore([
    S('a', '2026-10-01', [{ reps: 10, weight: 40 }]),
    S('b', '2026-10-18', [{ reps: 10, weight: 45 }]),
  ]);
  const made = await addSet(store, { ...base, set: { reps: 9, weight: 42.5 }, date: '2026-10-10' });
  assert.equal(made.date, '2026-10-10');
  assert.deepEqual(made.sets, [{ reps: 9, weight: 42.5 }]);
  const list = await listSessions(store, 'c1', { exerciseId: 'eq-03-a' });
  assert.deepEqual(list.map((s) => s.date), ['2026-10-01', '2026-10-10', '2026-10-18']);
});

test('lastSet з upTo — останній підхід не пізніше цієї дати', () => {
  const sessions = [
    S('a', '2026-09-01', [{ reps: 10, weight: 30 }]),
    S('b', '2026-09-17', [{ reps: 10, weight: 35 }, { reps: 8, weight: 37.5 }]),
    S('c', '2026-10-18', [{ reps: 10, weight: 50 }]),
  ];
  assert.deepEqual(lastSet(sessions, { upTo: '2026-10-01' }), { reps: 8, weight: 37.5 });
  assert.deepEqual(lastSet(sessions, { upTo: '2026-09-17' }), { reps: 8, weight: 37.5 }, 'той самий день — враховано');
  assert.deepEqual(lastSet(sessions, { upTo: '2026-09-10' }), { reps: 10, weight: 30 });
  assert.equal(lastSet(sessions, { upTo: '2026-08-01' }), null, 'раніше записів немає');
  assert.deepEqual(lastSet(sessions), { reps: 10, weight: 50 }, 'без дати — як раніше');
});

test('validLogDate: справжня дата не пізніше сьогодні, інакше null', () => {
  assert.equal(validLogDate('2026-09-17', '2026-10-18'), '2026-09-17');
  assert.equal(validLogDate('2026-10-18', '2026-10-18'), '2026-10-18');
  assert.equal(validLogDate('2026-10-19', '2026-10-18'), null, 'майбутнє — ні');
  assert.equal(validLogDate('2026-02-30', '2026-10-18'), null);
  assert.equal(validLogDate('17.09.2026', '2026-10-18'), null);
  assert.equal(validLogDate('', '2026-10-18'), null);
  assert.equal(validLogDate(null, '2026-10-18'), null);
});

test('deleteSet м\'який: прибирає один підхід; останній — сесія deleted, а не зникає', async () => {
  const store = memoryStore([S('a', '2026-10-17', [{ reps: 10, weight: 40 }, { reps: 8, weight: 45 }])]);
  await deleteSet(store, store.rows.get('a'), 0);
  assert.deepEqual(store.rows.get('a').sets, [{ reps: 8, weight: 45 }]);
  await deleteSet(store, store.rows.get('a'), 0);
  assert.equal(store.rows.get('a').deleted, true);
  assert.ok(store.rows.has('a'), 'запис лишився — видалення поїде у файлі обміну');
  assert.deepEqual(await listSessions(store, 'c1'), []);
});
