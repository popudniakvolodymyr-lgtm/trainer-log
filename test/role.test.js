// «Змінити роль» (spec «Правки, третя черга» W7): без записів — одразу на перший екран;
// із записами — лише після підтвердження, і тоді чисте сховище.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasLocalRecords } from '../src/core/model.js';
import { changeRole } from '../src/ui/settings.js';

const EMPTY = { clients: [], sessions: [], settings: [], equipment: [] };
const seedEq = { id: 'eq-03', name: 'Метелик', updatedAt: 0, catalogVersion: 4 };
const client = (id, extra = {}) => ({ id, name: `К ${id}`, updatedAt: 5, ...extra });
const session = (clientId, extra = {}) => ({ id: `s-${clientId}`, clientId, equipmentId: 'eq-03', exerciseId: 'eq-03-a', date: '2026-10-18', sets: [{ reps: 10, weight: 40 }], updatedAt: 7, ...extra });

test('hasLocalRecords: свіжий телефон і лише стартовий каталог — записів немає', () => {
  assert.equal(hasLocalRecords(EMPTY, { role: null }), false);
  assert.equal(hasLocalRecords({ ...EMPTY, equipment: [seedEq] }, { role: 'trainer' }), false);
});

test('hasLocalRecords: тренер з клієнтом (навіть без підходів) — є записи', () => {
  assert.equal(hasLocalRecords({ ...EMPTY, clients: [client('c1')] }, { role: 'trainer' }), true);
});

test('hasLocalRecords: клієнт лише зі своєю карткою — записів немає; з підходом — є', () => {
  const meta = { role: 'client', clientId: 'me' };
  assert.equal(hasLocalRecords({ ...EMPTY, clients: [client('me')] }, meta), false);
  assert.equal(hasLocalRecords({ ...EMPTY, clients: [client('me')], sessions: [session('me')] }, meta), true);
});

test('hasLocalRecords: видалене не рахується; налаштування і зміни тренажерів — рахуються', () => {
  const meta = { role: 'trainer' };
  assert.equal(hasLocalRecords({ ...EMPTY, clients: [client('c1', { deleted: true })], sessions: [session('c1', { deleted: true })] }, meta), false);
  assert.equal(hasLocalRecords({ ...EMPTY, settings: [{ id: 'c1|eq-03-a|seat', value: 3, updatedAt: 9 }] }, meta), true);
  assert.equal(hasLocalRecords({ ...EMPTY, equipment: [{ ...seedEq, name: 'Мій метелик', updatedAt: 1000 }] }, meta), true);
});

/** Підроблене сховище й екран: що викликали. */
function fakeCtx(state, meta) {
  const calls = [];
  const store = {
    async snapshot() { return { meta, ...state }; },
    async getMeta() { return meta; },
    async clearAll() { calls.push('clearAll'); },
  };
  return { calls, ctx: { store, meta, navigate: (hash) => calls.push(`navigate ${hash}`), rerender: () => {} } };
}

test('changeRole: без записів — одразу чисте сховище і перший екран, без питань', async () => {
  const { calls, ctx } = fakeCtx({ ...EMPTY, equipment: [seedEq] }, { role: 'trainer' });
  let asked = 0;
  const done = await changeRole(ctx, { ask: async () => { asked++; return true; } });
  assert.equal(asked, 0);
  assert.equal(done, true);
  assert.deepEqual(calls, ['clearAll', 'navigate #/start']);
});

test('changeRole: із записами — питання; «Скасувати» нічого не прибирає', async () => {
  const { calls, ctx } = fakeCtx({ ...EMPTY, clients: [client('c1')], sessions: [session('c1')] }, { role: 'trainer' });
  let info = null;
  const done = await changeRole(ctx, { ask: async (i) => { info = i; return false; } });
  assert.equal(done, false);
  assert.deepEqual(calls, [], 'сховище не чіпали');
  assert.equal(info.clients, 1);
  assert.equal(info.sessions, 1);
});

test('changeRole: із записами — лише після підтвердження чисте сховище і перший екран', async () => {
  const { calls, ctx } = fakeCtx({ ...EMPTY, clients: [client('me')], sessions: [session('me')] }, { role: 'client', clientId: 'me' });
  const done = await changeRole(ctx, { ask: async () => true });
  assert.equal(done, true);
  assert.deepEqual(calls, ['clearAll', 'navigate #/start']);
});
