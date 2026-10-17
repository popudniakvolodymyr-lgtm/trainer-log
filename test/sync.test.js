// Обмін файлом і резервна копія: формат, злиття, напрями, перепризначення клієнта.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMAT, VERSION, buildPackage, parsePackage, mergeEntities, planImport, applyImport,
  selectForClient, selectForTrainer, selectBackup, backupDue, summaryText, exchangeFileName,
} from '../src/core/sync.js';
import { seedEquipment } from '../src/core/catalog.js';

const DAY = 24 * 60 * 60 * 1000;

// --- допоміжне: «телефон» як знімок сховища і застосування змін до нього ---

function phone({ role = null, clientId = null, clients = [], sessions = [], settings = [], equipment, aliases = {} } = {}) {
  return {
    meta: { role, deviceId: `dev-${role}`, clientId, trainerName: null, lastBackupAt: null, aliases },
    clients, sessions, settings,
    equipment: equipment || seedEquipment(),
  };
}

/** Записує changes у стан так само, як store.applyChanges. */
function commit(state, changes) {
  const next = { ...state, meta: { ...state.meta, ...(changes.meta || {}) } };
  for (const kind of ['clients', 'equipment', 'sessions', 'settings']) {
    const map = new Map(state[kind].map((x) => [x.id, x]));
    for (const rec of changes[kind] || []) map.set(rec.id, rec);
    next[kind] = [...map.values()];
  }
  return next;
}

/** Повний цикл: файл → розбір → план → застосування. */
function importText(state, text, opts = {}) {
  const parsed = parsePackage(text, { role: state.meta.role });
  if (!parsed.ok) return { error: parsed.error, state };
  const plan = planImport(parsed.pkg, state);
  if (plan.error) return { error: plan.error, state };
  const res = applyImport(parsed.pkg, state, opts);
  return { plan, summary: res.summary, changes: res.state, state: commit(state, res.state) };
}

const live = (list) => list.filter((x) => !x.deleted);
const ses = (id, clientId, date, sets, updatedAt, extra = {}) => ({
  id, clientId, equipmentId: 'eq-03', exerciseId: 'eq-03-a', date, sets, updatedAt, ...extra,
});
const setting = (clientId, adjustmentId, value, updatedAt, by = 'trainer') => ({
  id: `${clientId}|eq-03-a|${adjustmentId}`, clientId, equipmentId: 'eq-03', exerciseId: 'eq-03-a',
  adjustmentId, value, updatedAt, by,
});

/** Файл від клієнта (телефон клієнта → тренеру). */
function clientFile(state) {
  return JSON.stringify(buildPackage('client-to-trainer', selectForTrainer(state), state.meta));
}

// --- parsePackage ----------------------------------------------------------

test('parsePackage: свій файл читається, у нього є маркер формату, версія і вид', () => {
  const c = phone({ role: 'client', clientId: 'c1', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }] });
  const pkg = buildPackage('client-to-trainer', selectForTrainer(c), c.meta);
  assert.equal(pkg.format, 'trainer-log');
  assert.equal(FORMAT, 'trainer-log');
  assert.equal(pkg.version, VERSION);
  assert.equal(pkg.kind, 'client-to-trainer');
  assert.deepEqual(pkg.client, { id: 'c1', name: 'Олена' });
  const r = parsePackage(JSON.stringify(pkg));
  assert.equal(r.ok, true);
  assert.equal(r.pkg.client.name, 'Олена');
});

test('parsePackage відкидає пошкоджений, чужий, новішої версії і биті дані — текстом українською', () => {
  const ua = /[А-Яа-яІіЇїЄєҐґ]/;
  const good = buildPackage('backup', selectBackup(phone({ role: 'trainer' })), { role: 'trainer', deviceId: 'd' });
  const cases = [
    '{"format":"trainer-log", обрізано',
    '',
    'просто текст',
    JSON.stringify({ hello: 'world' }),
    JSON.stringify([1, 2, 3]),
    JSON.stringify({ ...good, format: 'other-app' }),
    JSON.stringify({ ...good, version: VERSION + 1 }),
    JSON.stringify({ ...good, kind: 'something' }),
    JSON.stringify({ ...good, sessions: 'not-a-list' }),
    JSON.stringify({ ...good, sessions: [{ id: 5, clientId: 'c', sets: [], updatedAt: 1 }] }),
    JSON.stringify({ ...good, settings: [{ id: 'x', updatedAt: 'вчора' }] }),
    JSON.stringify({ ...good, kind: 'client-to-trainer', client: null }),
  ];
  for (const text of cases) {
    const r = parsePackage(text);
    assert.equal(r.ok, false, `мав відкинути: ${text.slice(0, 60)}`);
    assert.match(r.error, ua, 'помилка українською');
  }
});

test('parsePackage з роллю відкидає файл не того напряму', () => {
  const c = phone({ role: 'client', clientId: 'c1', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }] });
  const toTrainer = clientFile(c);
  const t = phone({ role: 'trainer', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }] });
  const toClient = JSON.stringify(buildPackage('trainer-to-client', selectForClient(t, 'c1'), t.meta));
  const trainerBackup = JSON.stringify(buildPackage('backup', selectBackup(t), t.meta));
  const clientBackup = JSON.stringify(buildPackage('backup', selectBackup(c), c.meta));

  assert.equal(parsePackage(toClient, { role: 'trainer' }).ok, false, 'від тренера — на телефон тренера');
  assert.match(parsePackage(toClient, { role: 'trainer' }).error, /тренер/);
  assert.equal(parsePackage(toTrainer, { role: 'client' }).ok, false, 'від клієнта — на телефон клієнта');
  assert.equal(parsePackage(toTrainer, { role: null }).ok, false, 'від клієнта — на новий телефон');
  assert.equal(parsePackage(clientBackup, { role: 'trainer' }).ok, false, 'копія клієнта — тренеру');
  assert.equal(parsePackage(trainerBackup, { role: 'client' }).ok, false, 'копія тренера — клієнту');

  assert.equal(parsePackage(toTrainer, { role: 'trainer' }).ok, true);
  assert.equal(parsePackage(trainerBackup, { role: 'trainer' }).ok, true);
  assert.equal(parsePackage(toClient, { role: 'client' }).ok, true);
  assert.equal(parsePackage(toClient, { role: null }).ok, true);
  assert.equal(parsePackage(clientBackup, { role: null }).ok, true);
  assert.equal(parsePackage(trainerBackup, { role: null }).ok, true);
});

test('невірний файл — дані телефона не змінено', () => {
  const t = phone({ role: 'trainer', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }] });
  const before = JSON.stringify(t);
  const r = importText(t, '{битий');
  assert.ok(r.error);
  assert.equal(JSON.stringify(r.state), before);
});

// --- mergeEntities -----------------------------------------------------------

test('mergeEntities: пізніший updatedAt перемагає в обидва боки, видалення переходить', () => {
  const local = [
    { id: 'a', v: 'старе', updatedAt: 10 },
    { id: 'b', v: 'новіше-локально', updatedAt: 50 },
    { id: 'c', v: 'живе', updatedAt: 10 },
    { id: 'd', v: 'лише-тут', updatedAt: 10 },
  ];
  const incoming = [
    { id: 'a', v: 'нове', updatedAt: 20 },
    { id: 'b', v: 'старіше-з-файлу', updatedAt: 40 },
    { id: 'c', v: 'живе', deleted: true, updatedAt: 30 },
    { id: 'e', v: 'нове-з-файлу', updatedAt: 5 },
  ];
  const r = mergeEntities(local, incoming);
  const byId = Object.fromEntries(r.merged.map((x) => [x.id, x]));
  assert.equal(byId.a.v, 'нове');
  assert.equal(byId.b.v, 'новіше-локально');
  assert.equal(byId.c.deleted, true, 'видалення перейшло');
  assert.equal(byId.d.v, 'лише-тут', 'локальне не губиться');
  assert.equal(byId.e.v, 'нове-з-файлу');
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);
  assert.equal(r.removed, 1);
  assert.equal(r.merged.length, 5);
});

test('mergeEntities: старіше видалення не воскрешає і не вбиває новіший запис', () => {
  const r = mergeEntities([{ id: 'a', v: 1, updatedAt: 100 }], [{ id: 'a', v: 1, deleted: true, updatedAt: 50 }]);
  assert.equal(r.merged[0].deleted, undefined);
  assert.equal(r.updated + r.added + r.removed, 0);
});

test('mergeEntities: повторне злиття того самого нічого не змінює', () => {
  const local = [{ id: 'a', v: 1, updatedAt: 10 }];
  const incoming = [{ id: 'a', v: 2, updatedAt: 20 }, { id: 'b', v: 3, updatedAt: 5 }];
  const first = mergeEntities(local, incoming);
  assert.equal(first.merged.length, 2);
  assert.equal(first.changed.length, 2);
  const second = mergeEntities(first.merged, incoming);
  assert.deepEqual(second.merged, first.merged);
  assert.equal(second.added + second.updated + second.removed, 0);
  assert.deepEqual(second.changed, []);
});

// --- клієнт → тренер ----------------------------------------------------------

test('файл клієнта з відомим id: записи й налаштування в його картці; повторно — «Нового нічого»', () => {
  const c = phone({
    role: 'client', clientId: 'c1',
    clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }],
    sessions: [ses('s1', 'c1', '2026-10-10', [{ reps: 10, weight: 40 }], 100),
      ses('s2', 'c1', '2026-10-12', [{ reps: 8, weight: 45 }], 200)],
    settings: [setting('c1', 'seat', 3, 300, 'client')],
  });
  let t = phone({
    role: 'trainer',
    clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }],
    settings: [setting('c1', 'seat', 2, 250)],
  });
  const file = clientFile(c);
  const r1 = importText(t, file);
  assert.equal(r1.plan.needsClientChoice, false);
  t = r1.state;
  assert.equal(live(t.sessions).filter((s) => s.clientId === 'c1').length, 2);
  assert.equal(t.settings.find((s) => s.id === 'c1|eq-03-a|seat').value, 3, 'пізніша зміна клієнта');
  assert.deepEqual(r1.summary.sessions, { added: 2, updated: 0, removed: 0 });
  assert.equal(summaryText(r1.summary), 'Додано 2 записи, оновлено 1 налаштування');

  const r2 = importText(t, file);
  assert.equal(summaryText(r2.summary), 'Нового нічого');
  assert.deepEqual(r2.state, t, 'повторний імпорт нічого не змінює');
  for (const kind of ['clients', 'equipment', 'sessions', 'settings']) assert.deepEqual(r2.changes[kind], []);
});

test('файл клієнта не змінює каталог тренажерів тренера', () => {
  const eq = seedEquipment();
  eq[0] = { ...eq[0], name: 'Мій тренажер', updatedAt: 999 };
  const c = phone({ role: 'client', clientId: 'c1', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }], equipment: eq,
    sessions: [ses('s1', 'c1', '2026-10-10', [{ reps: 10, weight: 40 }], 100)] });
  const t = phone({ role: 'trainer', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }] });
  const r = importText(t, clientFile(c));
  assert.equal(r.state.sessions.length, 1, 'записи прийшли');
  assert.deepEqual(r.state.equipment, t.equipment);
});

test('видалення в клієнта зникає в тренера після імпорту', () => {
  const s1 = ses('s1', 'c1', '2026-10-10', [{ reps: 10, weight: 40 }], 100);
  const t0 = phone({ role: 'trainer', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }], sessions: [s1] });
  const c = phone({
    role: 'client', clientId: 'c1', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }],
    sessions: [{ ...s1, deleted: true, updatedAt: 500 }],
  });
  const r = importText(t0, clientFile(c));
  assert.equal(live(r.state.sessions).length, 0);
  assert.equal(r.summary.sessions.removed, 1);
  assert.match(summaryText(r.summary), /Видалено 1 запис/);
});

test('новий клієнт: вибір картки; файл іде в обрану (alias), наступний — туди ж без питання', () => {
  const c = phone({
    role: 'client', clientId: 'self-1',
    clients: [{ id: 'self-1', name: 'Оля', updatedAt: 1 }],
    sessions: [ses('s1', 'self-1', '2026-10-10', [{ reps: 10, weight: 40 }], 100)],
    settings: [setting('self-1', 'seat', 4, 120, 'client')],
  });
  let t = phone({
    role: 'trainer',
    clients: [{ id: 'L1', name: 'Олена', updatedAt: 1 }, { id: 'L2', name: 'Андрій', updatedAt: 1 }],
  });
  const parsed = parsePackage(clientFile(c), { role: 'trainer' });
  const plan = planImport(parsed.pkg, t);
  assert.equal(plan.needsClientChoice, true);
  assert.deepEqual(plan.candidates.map((x) => x.name), ['Андрій', 'Олена']);
  assert.equal(plan.clientName, 'Оля');
  assert.throws(() => applyImport(parsed.pkg, t), /картк/);

  const r1 = importText(t, clientFile(c), { targetClientId: 'L1' });
  t = r1.state;
  assert.equal(t.meta.aliases['self-1'], 'L1');
  assert.equal(t.sessions.find((s) => s.id === 's1').clientId, 'L1');
  const st = t.settings.find((s) => s.clientId === 'L1');
  assert.equal(st.id, 'L1|eq-03-a|seat');
  assert.equal(st.value, 4);
  assert.ok(!t.clients.some((x) => x.id === 'self-1'), 'чужа картка не створюється');

  // Наступний файл того ж клієнта — без питання, туди ж.
  const c2 = commit(c, { sessions: [ses('s2', 'self-1', '2026-10-14', [{ reps: 12, weight: 40 }], 400)] });
  const p2 = planImport(parsePackage(clientFile(c2)).pkg, t);
  assert.equal(p2.needsClientChoice, false);
  assert.equal(p2.targetClientId, 'L1');
  const r2 = importText(t, clientFile(c2));
  assert.equal(r2.state.sessions.find((s) => s.id === 's2').clientId, 'L1');
  assert.equal(r2.summary.sessions.added, 1);
  assert.equal(live(r2.state.sessions).length, 2);
});

test('новий клієнт: «Створити картку» — картка з іменем з файлу', () => {
  const c = phone({
    role: 'client', clientId: 'self-1', clients: [{ id: 'self-1', name: 'Оля', updatedAt: 1 }],
    sessions: [ses('s1', 'self-1', '2026-10-10', [{ reps: 10, weight: 40 }], 100)],
  });
  const t = phone({ role: 'trainer' });
  const r = importText(t, clientFile(c), { targetClientId: 'self-1' });
  assert.deepEqual(live(r.state.clients).map((x) => x.name), ['Оля']);
  assert.equal(r.state.sessions[0].clientId, 'self-1');
  const again = importText(r.state, clientFile(c));
  assert.equal(again.plan.needsClientChoice, false);
  assert.equal(summaryText(again.summary), 'Нового нічого');
});

// --- тренер → клієнт ----------------------------------------------------------

test('trainer-to-client: клієнт, що почав сам, переходить на id тренера без втрат і дублів', () => {
  // Клієнт почав сам, двічі надіслав файл тренеру (alias self-1 → L1), потім отримав файл від тренера.
  let c = phone({
    role: 'client', clientId: 'self-1', clients: [{ id: 'self-1', name: 'Оля', updatedAt: 1 }],
    sessions: [ses('s1', 'self-1', '2026-10-10', [{ reps: 10, weight: 40 }], 100),
      ses('s2', 'self-1', '2026-10-11', [{ reps: 10, weight: 42.5 }], 150)],
    settings: [setting('self-1', 'seat', 4, 120, 'client'), setting('self-1', 'handles-pos', 2, 900, 'client')],
  });
  let t = phone({ role: 'trainer', clients: [{ id: 'L1', name: 'Олена', updatedAt: 1 }] });
  t = importText(t, clientFile(c), { targetClientId: 'L1' }).state;
  // Тренер дописав свій запис і змінив сидіння пізніше; ручки — раніше за клієнта.
  t = commit(t, {
    sessions: [ses('s3', 'L1', '2026-10-15', [{ reps: 6, weight: 50 }], 700)],
    settings: [setting('L1', 'seat', 5, 800), setting('L1', 'handles-pos', 1, 600)],
  });
  const eq = t.equipment.map((e) => (e.id === 'eq-03' ? { ...e, name: 'Метелик (тренер)', updatedAt: 650 } : e));
  t = { ...t, equipment: eq };

  const toClient = JSON.stringify(buildPackage('trainer-to-client', selectForClient(t, 'L1'), t.meta));
  const parsed = parsePackage(toClient, { role: 'client' });
  assert.ok(parsed.ok);
  const plan = planImport(parsed.pkg, c);
  assert.equal(plan.adopt, true, 'попередить, що записи переходять у картку тренера');
  const r = importText(c, toClient);
  c = r.state;

  assert.equal(c.meta.role, 'client');
  assert.equal(c.meta.clientId, 'L1');
  const mine = live(c.sessions);
  assert.deepEqual(mine.map((s) => s.id).sort(), ['s1', 's2', 's3'], 'без втрат і без дублів');
  assert.ok(mine.every((s) => s.clientId === 'L1'));
  const st = live(c.settings);
  assert.ok(st.every((s) => s.clientId === 'L1' && s.id.startsWith('L1|')));
  assert.equal(st.find((s) => s.adjustmentId === 'seat').value, 5, 'пізніша зміна тренера');
  assert.equal(st.find((s) => s.adjustmentId === 'handles-pos').value, 2, 'пізніша зміна клієнта');
  assert.equal(st.length, 2);
  assert.deepEqual(live(c.clients).map((x) => [x.id, x.name]), [['L1', 'Олена']]);
  assert.equal(c.equipment.find((e) => e.id === 'eq-03').name, 'Метелик (тренер)', 'назви тренера');

  // Повторно той самий файл — нічого.
  const again = importText(c, toClient);
  assert.equal(summaryText(again.summary), 'Нового нічого');
  assert.deepEqual(again.state, c);

  // Тепер клієнт шле тренеру — нічого не дублюється.
  const back = importText(t, clientFile(c));
  assert.equal(back.plan.needsClientChoice, false);
  assert.equal(live(back.state.sessions).length, 3);
  assert.equal(live(back.state.settings).length, 2);
  assert.equal(back.state.settings.find((s) => s.id === 'L1|eq-03-a|handles-pos').value, 2);
});

test('trainer-to-client на новому телефоні: стає клієнтом з карткою тренера', () => {
  const t = phone({
    role: 'trainer', clients: [{ id: 'L1', name: 'Олена', updatedAt: 1 }, { id: 'L2', name: 'Андрій', updatedAt: 1 }],
    sessions: [ses('s1', 'L1', '2026-10-10', [{ reps: 10, weight: 40 }], 100),
      ses('s9', 'L2', '2026-10-10', [{ reps: 10, weight: 90 }], 100)],
  });
  const text = JSON.stringify(buildPackage('trainer-to-client', selectForClient(t, 'L1'), t.meta));
  assert.ok(!text.includes('s9') && !text.includes('Андрій'), 'чужих даних у файлі немає');
  const r = importText(phone(), text);
  assert.equal(r.plan.adopt, false);
  assert.equal(r.state.meta.role, 'client');
  assert.equal(r.state.meta.clientId, 'L1');
  assert.deepEqual(r.state.sessions.map((s) => s.id), ['s1']);
});

// --- резервна копія -----------------------------------------------------------

test('відновлення з копії на чистому телефоні дає ті самі дані і роль', () => {
  const eq = seedEquipment().map((e) => (e.id === 'eq-21' ? { ...e, hidden: true, updatedAt: 77 } : e));
  const t = phone({
    role: 'trainer', equipment: eq, aliases: { 'self-1': 'L1' },
    clients: [{ id: 'L1', name: 'Олена', updatedAt: 1 }, { id: 'L0', name: 'Старий', deleted: true, updatedAt: 5 }],
    sessions: [ses('s1', 'L1', '2026-10-10', [{ reps: 10, weight: 40 }], 100)],
    settings: [setting('L1', 'seat', 3, 300)],
  });
  t.meta.trainerName = 'Іван';
  const text = JSON.stringify(buildPackage('backup', selectBackup(t), t.meta));
  const r = importText(phone(), text);
  const s = r.state;
  assert.equal(s.meta.role, 'trainer');
  assert.equal(s.meta.trainerName, 'Іван');
  assert.deepEqual(s.meta.aliases, { 'self-1': 'L1' });
  assert.equal(s.meta.deviceId, 'dev-null', 'deviceId телефона лишається');
  const sort = (l) => [...l].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const kind of ['clients', 'equipment', 'sessions', 'settings']) assert.deepEqual(sort(s[kind]), sort(t[kind]), kind);
  assert.ok(s.meta.lastBackupAt > 0);
  assert.equal(summaryText(importText(s, text).summary), 'Нового нічого');
});

test('копія клієнта відновлює роль клієнта і його картку', () => {
  const c = phone({
    role: 'client', clientId: 'L1', clients: [{ id: 'L1', name: 'Олена', updatedAt: 1 }],
    sessions: [ses('s1', 'L1', '2026-10-10', [{ reps: 10, weight: 40 }], 100)],
  });
  const r = importText(phone(), JSON.stringify(buildPackage('backup', selectBackup(c), c.meta)));
  assert.equal(r.state.meta.role, 'client');
  assert.equal(r.state.meta.clientId, 'L1');
  assert.equal(r.state.sessions.length, 1);
});

test('копія на телефоні з даними: злиття, нічого локального не губиться', () => {
  const old = phone({ role: 'trainer', clients: [{ id: 'A', name: 'А', updatedAt: 1 }],
    sessions: [ses('s1', 'A', '2026-10-01', [{ reps: 1, weight: 1 }], 10)] });
  const text = JSON.stringify(buildPackage('backup', selectBackup(old), old.meta));
  const now = phone({ role: 'trainer', clients: [{ id: 'B', name: 'Б', updatedAt: 1 }],
    sessions: [ses('s2', 'B', '2026-10-02', [{ reps: 2, weight: 2 }], 20)] });
  const r = importText(now, text);
  assert.deepEqual(r.state.clients.map((x) => x.id).sort(), ['A', 'B']);
  assert.deepEqual(r.state.sessions.map((x) => x.id).sort(), ['s1', 's2']);
});

// --- нагадування про копію ------------------------------------------------------

test('backupDue: понад 14 днів і є нові записи; після збереження — ні', () => {
  const now = 100 * DAY;
  const sessions = [{ id: 's', updatedAt: now - 20 * DAY }, { id: 's2', updatedAt: now - 1 * DAY }];
  assert.equal(backupDue({ lastBackupAt: now - 15 * DAY }, sessions, now), true);
  assert.equal(backupDue({ lastBackupAt: now - 13 * DAY }, sessions, now), false, 'менше 14 днів');
  assert.equal(backupDue({ lastBackupAt: now - 15 * DAY }, [{ id: 's', updatedAt: now - 20 * DAY }], now), false, 'нових записів немає');
  assert.equal(backupDue({ lastBackupAt: null }, [], now), false, 'записів немає взагалі');
  assert.equal(backupDue({ lastBackupAt: null }, [{ id: 's', updatedAt: now - 15 * DAY }], now), true, 'ніколи не зберігали, записи давні');
  assert.equal(backupDue({ lastBackupAt: null }, [{ id: 's', updatedAt: now - 2 * DAY }], now), false, 'ніколи, але записи свіжі');
  assert.equal(backupDue({ lastBackupAt: now }, sessions, now), false, 'щойно зберегли');
});

// --- тексти --------------------------------------------------------------------

test('summaryText і ім\'я файлу', () => {
  const z = { added: 0, updated: 0, removed: 0 };
  assert.equal(summaryText({ sessions: { ...z, added: 5 }, settings: { ...z, updated: 2 }, equipment: z, clients: z }),
    'Додано 5 записів, оновлено 2 налаштування');
  assert.equal(summaryText({ sessions: { ...z, added: 1 }, settings: { ...z, added: 5 }, equipment: z, clients: z }),
    'Додано 1 запис, оновлено 5 налаштувань');
  assert.equal(summaryText({ sessions: z, settings: z, equipment: z, clients: z }), 'Нового нічого');
  assert.equal(exchangeFileName('Олена Петрівна', new Date(2026, 9, 17)), 'журнал-Олена-Петрівна-2026-10-17.json');
  assert.equal(exchangeFileName('a/b:c', new Date(2026, 9, 17)), 'журнал-a-b-c-2026-10-17.json');
});

// --- ремонт: безпечні id, id налаштувань, глибша перевірка вмісту ------------------

const BROKEN = /Файл пошкоджений/;
const U1 = '3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f';

function trainerFileFor(clientId, extra = {}) {
  const t = phone({ role: 'trainer', clients: [{ id: clientId, name: 'Олена', updatedAt: 1 }],
    sessions: [ses(U1, clientId, '2026-10-10', [{ reps: 10, weight: 40 }], 100)],
    settings: [setting(clientId, 'seat', 3, 300)] });
  return { ...buildPackage('trainer-to-client', selectForClient(t, clientId), t.meta), ...extra };
}

test('parsePackage відкидає id поза безпечним шаблоном — файл не робить телефон «цеглиною»', () => {
  for (const bad of ['a/b', '%', '../x', 'a b', '#/start', 'a|b', '']) {
    const pkg = trainerFileFor('c1');
    const cases = {
      client: { ...pkg, client: { id: bad, name: 'Олена' } },
      clients: { ...pkg, clients: [{ id: bad, name: 'Олена', updatedAt: 1 }] },
      session: { ...pkg, sessions: [{ ...pkg.sessions[0], id: bad }] },
      sessionClient: { ...pkg, sessions: [{ ...pkg.sessions[0], clientId: bad }] },
      sessionEquipment: { ...pkg, sessions: [{ ...pkg.sessions[0], equipmentId: bad }] },
      sessionExercise: { ...pkg, sessions: [{ ...pkg.sessions[0], exerciseId: bad }] },
      settingClient: { ...pkg, settings: [{ ...pkg.settings[0], clientId: bad }] },
      settingEquipment: { ...pkg, settings: [{ ...pkg.settings[0], equipmentId: bad }] },
      equipment: { ...pkg, equipment: [{ ...pkg.equipment[0], id: bad }] },
      exercise: { ...pkg, equipment: [{ ...pkg.equipment[0], exercises: [{ id: bad, name: 'x' }] }] },
    };
    for (const [name, p] of Object.entries(cases)) {
      const r = parsePackage(JSON.stringify(p));
      assert.equal(r.ok, false, `${name} = ${JSON.stringify(bad)} мав бути відкинутий`);
      assert.match(r.error, BROKEN);
    }
  }
  const t = phone({ role: 'trainer' });
  const backup = buildPackage('backup', selectBackup(t), { role: 'client', clientId: 'a/b', deviceId: 'd' });
  assert.equal(parsePackage(JSON.stringify(backup)).ok, false, 'копія клієнта з битим clientId');
  const aliased = buildPackage('backup', selectBackup(t), { role: 'trainer', deviceId: 'd', aliases: { x: '%' } });
  assert.equal(parsePackage(JSON.stringify(aliased)).ok, false, 'alias з битим id');
  // Справжні id програми: uuid, eq-…, з seed — приймаються.
  assert.equal(parsePackage(JSON.stringify(trainerFileFor(U1))).ok, true);
  assert.equal(parsePackage(JSON.stringify(trainerFileFor('c1'))).ok, true);
});

test('імпортоване налаштування має id = settingId(clientId, exerciseId, adjustmentId), інакше файл відкинуто', () => {
  const c = phone({ role: 'client', clientId: 'c1', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }],
    settings: [setting('c1', 'seat', 3, 300, 'client')] });
  const t = phone({ role: 'trainer', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }, { id: 'c2', name: 'Іра', updatedAt: 1 }],
    settings: [setting('c2', 'seat', 1, 100)] });
  const pkg = buildPackage('client-to-trainer', selectForTrainer(c), c.meta);
  // Підмінений id перезаписав би налаштування іншого клієнта.
  const evil = { ...pkg, settings: [{ ...pkg.settings[0], id: 'c2|eq-03-a|seat' }] };
  const r = importText(t, JSON.stringify(evil));
  assert.match(r.error || '', BROKEN);
  assert.equal(r.state.settings.find((s) => s.id === 'c2|eq-03-a|seat').value, 1, 'чуже налаштування не зачеплено');
  const ok = importText(t, JSON.stringify(pkg));
  for (const s of ok.changes.settings) assert.equal(s.id, `${s.clientId}|${s.exerciseId}|${s.adjustmentId}`);
});

test('пошкоджений вміст (сесія без тренажера, вправи, дати; вправа без назви; count поза 1…50) → «Файл пошкоджений…», нічого не записано', () => {
  const pkg = trainerFileFor('c1');
  const s0 = pkg.sessions[0];
  const st0 = pkg.settings[0];
  const eq0 = pkg.equipment[0];
  const { equipmentId, exerciseId, date, ...bareSession } = s0;
  const { equipmentId: _e, ...bareSetting } = st0;
  const withAdj = (adj) => ({ ...pkg, equipment: [{ ...eq0, adjustments: [adj] }] });
  const cases = {
    noEquipmentId: { ...pkg, sessions: [{ ...bareSession, exerciseId, date }] },
    noExerciseId: { ...pkg, sessions: [{ ...bareSession, equipmentId, date }] },
    noDate: { ...pkg, sessions: [{ ...bareSession, equipmentId, exerciseId }] },
    dateDots: { ...pkg, sessions: [{ ...s0, date: '17.10.2026' }] },
    dateShort: { ...pkg, sessions: [{ ...s0, date: '2026-1-5' }] },
    dateJunk: { ...pkg, sessions: [{ ...s0, date: '2026-10-10x' }] },
    settingNoEquipment: { ...pkg, settings: [bareSetting] },
    exerciseNoId: { ...pkg, equipment: [{ ...eq0, exercises: [{ name: 'x' }] }] },
    exerciseNoName: { ...pkg, equipment: [{ ...eq0, exercises: [{ id: 'eq-03-a' }] }] },
    exerciseNotObj: { ...pkg, equipment: [{ ...eq0, exercises: [null] }] },
    count0: withAdj({ id: 'seat', label: 'С', kind: 'positions', count: 0 }),
    count51: withAdj({ id: 'seat', label: 'С', kind: 'positions', count: 51 }),
    countHuge: withAdj({ id: 'seat', label: 'С', kind: 'positions', count: 1e9 }),
    countText: withAdj({ id: 'seat', label: 'С', kind: 'positions', count: '5' }),
    countFrac: withAdj({ id: 'seat', label: 'С', kind: 'positions', count: 2.5 }),
  };
  for (const [name, p] of Object.entries(cases)) {
    const before = phone({ role: 'client', clientId: 'c1', clients: [{ id: 'c1', name: 'Олена', updatedAt: 1 }] });
    const snap = JSON.stringify(before);
    const r = importText(before, JSON.stringify(p));
    assert.match(r.error || '', BROKEN, `${name} мав бути відкинутий`);
    assert.equal(JSON.stringify(r.state), snap, `${name}: нічого не записано`);
  }
  assert.equal(parsePackage(JSON.stringify(withAdj({ id: 'seat', label: 'С', kind: 'positions', count: 50 }))).ok, true);
  assert.equal(parsePackage(JSON.stringify(withAdj({ id: 'seat', label: 'С', kind: 'positions', count: 1 }))).ok, true);
});
