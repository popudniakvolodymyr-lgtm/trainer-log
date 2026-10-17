import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment, HANDLES } from '../src/core/catalog.js';
import { SCHEMES, schemeFor } from '../src/schemes/registry.js';
import { handleIcon } from '../src/schemes/handles.js';
import { valuesFor, makeSetting, positionHint } from '../src/schemes/values.js';
import {
  renameEquipment, addEquipment, addExercise, renameExercise, removeExercise,
  addAdjustment, renameAdjustment, renameOption, setPositionCount, removeAdjustment, parseOptions,
} from '../src/schemes/equipment-edit.js';

// Очікування — зі spec.md (історії 18–24) і gym/adjustments.md, не з коду під тестом.
const byId = Object.fromEntries(seedEquipment().map((e) => [e.id, e]));
const active = (eq) => eq.adjustments.filter((a) => !a.deleted);

// Значення бейджа регулювання: <g … data-badge="<adj>" data-value="<v>">
const badgeValue = (svg, adjId) => {
  const m = new RegExp(`data-badge="${adjId}"[^>]*data-value="([^"]*)"`).exec(svg);
  return m ? m[1] : null;
};

// Кардіо (Q8) малює таск 10 у src/schemes/cardio.js — до того заглушка; таск 10 прибирає звідси.
const PENDING = new Set(['cardio']);

test('кожен schemeId каталогу має схему в реєстрі', () => {
  for (const eq of seedEquipment()) {
    if (!eq.schemeId || eq.hidden || PENDING.has(eq.schemeId)) continue;
    assert.ok(schemeFor(eq), `${eq.id}: немає схеми ${eq.schemeId}`);
    assert.equal(schemeFor(eq).id, eq.schemeId, eq.id);
  }
  assert.equal(schemeFor(byId['eq-03']), SCHEMES.butterfly);
  assert.equal(schemeFor(byId['eq-22']), SCHEMES['lever-row']);
  assert.equal(schemeFor(byId['eq-26']), SCHEMES['low-row']);
  assert.equal(schemeFor({ ...byId['eq-01'], schemeId: null }), null, 'без schemeId — заглушка');
  assert.equal(schemeFor({ ...byId['eq-01'], schemeId: 'немає-такої' }), null);
});

test('кожна draw: SVG з data-adj для кожного регулювання тренажера', () => {
  for (const eqId of ['eq-03', 'eq-22', 'eq-26']) {
    const eq = byId[eqId];
    const svg = schemeFor(eq).draw({}, eq.adjustments);
    assert.match(svg, /^<svg[\s>]/, eqId);
    assert.match(svg, /<\/svg>$/, eqId);
    for (const a of active(eq)) {
      assert.ok(svg.includes(`data-adj="${a.id}"`), `${eqId}: немає зони ${a.id}`);
    }
  }
});

test('«Метелик»: передані значення видно на бейджах, позиції 1…5 розмічені з поясненням', () => {
  const eq = byId['eq-03'];
  const svg = SCHEMES.butterfly.draw({ seat: 4, 'handles-pos': 2 }, eq.adjustments);
  assert.equal(badgeValue(svg, 'seat'), '4');
  assert.equal(badgeValue(svg, 'handles-pos'), '2');
  for (const adj of ['seat', 'handles-pos']) {
    for (let n = 1; n <= 5; n++) {
      assert.ok(svg.includes(`data-pos="${adj}:${n}"`), `немає позначки ${adj}:${n}`);
    }
  }
  assert.ok(svg.includes('найнижче') && svg.includes('найвище'));
  assert.ok(svg.includes('ближче до грудей') && svg.includes('найширше розведені'));
  assert.ok(svg.includes('⚠ приблизно — уточнити в залі'));
  // інша пара значень — інші бейджі (значення справді з аргументу)
  const svg2 = SCHEMES.butterfly.draw({ seat: 1 }, eq.adjustments);
  assert.equal(badgeValue(svg2, 'seat'), '1');
  assert.equal(badgeValue(svg2, 'handles-pos'), '');
});

test('горизонтальна тяга (№22): сидіння 1…5 з ⚠, три зони хвату, вибрана підсвічена, «збоку» немає', () => {
  const eq = byId['eq-22'];
  const svg = SCHEMES['lever-row'].draw({ seat: 3, grip: 'red' }, eq.adjustments);
  assert.equal(badgeValue(svg, 'seat'), '3');
  assert.equal(badgeValue(svg, 'grip'), 'red');
  for (let n = 1; n <= 5; n++) assert.ok(svg.includes(`data-pos="seat:${n}"`));
  for (const opt of ['green', 'red', 'orange']) assert.ok(svg.includes(`data-opt="${opt}"`), opt);
  assert.match(svg, /data-opt="red"[^>]*class="[^"]*is-selected/);
  assert.doesNotMatch(svg, /data-opt="green"[^>]*class="[^"]*is-selected/);
  assert.ok(svg.includes('Вигин'), 'назва вибраної позиції хвату');
  assert.ok(svg.includes('⚠ приблизно — уточнити в залі'));
  assert.ok(!/збоку/i.test(svg));
});

test('перейменована позиція хвату і регулювання — нова назва на схемі, текст екранується', () => {
  const eq = byId['eq-22'];
  const renamed = renameOption(eq, 'grip', 'red', 'Вигин <угору>');
  const svg = SCHEMES['lever-row'].draw({ grip: 'red' }, renamed.adjustments);
  assert.ok(svg.includes('Вигин &lt;угору&gt;'));
  assert.ok(!svg.includes('<угору>'));
});

test('тяга нижнього блоку: малюнок вибраної ручки й назва', () => {
  const eq = byId['eq-26'];
  const svg = SCHEMES['low-row'].draw({ handle: 'rope' }, eq.adjustments);
  assert.equal(badgeValue(svg, 'handle'), 'rope');
  assert.ok(svg.includes('Канат'));
  assert.ok(svg.includes('data-handle="rope"'));
  const empty = SCHEMES['low-row'].draw({}, eq.adjustments);
  assert.equal(badgeValue(empty, 'handle'), '');
  assert.ok(empty.includes('не вибрано'));
});

test('5 малюнків ручок: різні, кожен SVG; №6 немає', () => {
  assert.equal(HANDLES.length, 5);
  const icons = HANDLES.map((x) => handleIcon(x.id));
  for (const s of icons) assert.match(s, /^<svg[\s>][\s\S]*<\/svg>$/);
  assert.equal(new Set(icons).size, 5);
  assert.equal(handleIcon('cuff'), '');
});

test('значення клієнта: лише його + цієї вправи, пізніше перемагає, видалені ігноруються', () => {
  const s = (o) => ({ equipmentId: 'eq-03', updatedAt: 1, by: 'trainer', ...o });
  const settings = [
    s({ id: 'c1|eq-03-a|seat', clientId: 'c1', exerciseId: 'eq-03-a', adjustmentId: 'seat', value: 2 }),
    s({ id: 'c1|eq-03-b|seat', clientId: 'c1', exerciseId: 'eq-03-b', adjustmentId: 'seat', value: 5 }),
    s({ id: 'c2|eq-03-a|seat', clientId: 'c2', exerciseId: 'eq-03-a', adjustmentId: 'seat', value: 1 }),
    s({ id: 'c1|eq-03-a|handles-pos', clientId: 'c1', exerciseId: 'eq-03-a', adjustmentId: 'handles-pos', value: 3, deleted: true }),
  ];
  assert.deepEqual(valuesFor(settings, 'c1', 'eq-03-a'), { seat: 2 });
  assert.deepEqual(valuesFor(settings, 'c1', 'eq-03-b'), { seat: 5 });
});

test('makeSetting: id клієнт|вправа|регулювання, by = роль', () => {
  const st = makeSetting({ clientId: 'c1', equipmentId: 'eq-21', exerciseId: 'eq-21-a', adjustmentId: 'grip', value: 'green', by: 'client' });
  assert.equal(st.id, 'c1|eq-21-a|grip');
  assert.equal(st.value, 'green');
  assert.equal(st.by, 'client');
  assert.equal(st.equipmentId, 'eq-21');
  assert.equal(typeof st.updatedAt, 'number');
});

test('пояснення позицій: перша й остання підписані', () => {
  const seat = byId['eq-03'].adjustments.find((a) => a.id === 'seat');
  assert.equal(positionHint(seat, 1, SCHEMES.butterfly.HINTS), '1 — найнижче');
  assert.equal(positionHint(seat, 5, SCHEMES.butterfly.HINTS), '5 — найвище');
  assert.equal(positionHint(seat, 3, SCHEMES.butterfly.HINTS), '3');
});

test('редагування тренажера: назва, вправи, регулювання, варіанти — без мутації оригіналу', () => {
  const eq = byId['eq-01'];
  const r = renameEquipment(eq, '  Жим  блок ');
  assert.equal(r.name, 'Жим блок');
  assert.equal(r.siteName, 'Жим у блоці');
  assert.equal(eq.name, 'Жим у блоці');

  const withEx = addExercise(eq, 'Жим однією');
  assert.equal(withEx.exercises.length, 2);
  const newEx = withEx.exercises[1];
  assert.equal(renameExercise(withEx, newEx.id, 'Жим лівою').exercises[1].name, 'Жим лівою');
  assert.equal(removeExercise(withEx, newEx.id).exercises.filter((x) => !x.deleted).length, 1);
  assert.throws(() => removeExercise(eq, eq.exercises[0].id), /останню вправу/);

  const pos = addAdjustment(eq, { label: 'Валик', kind: 'positions', count: 7 });
  const valik = pos.adjustments.at(-1);
  assert.equal(valik.kind, 'positions');
  assert.equal(valik.count, 7);
  const opt = addAdjustment(eq, { label: 'Спинка', kind: 'options', options: parseOptions('Пряма\nНахил, \n') });
  assert.deepEqual(opt.adjustments.at(-1).options.map((o) => o.label), ['Пряма', 'Нахил']);
  const handle = addAdjustment(eq, { kind: 'handle' });
  assert.equal(handle.adjustments.at(-1).id, 'handle');
  assert.equal(handle.adjustments.at(-1).options.length, 5);
  assert.throws(() => addAdjustment(handle, { kind: 'handle' }), /вже є/);
  assert.equal(renameAdjustment(pos, valik.id, 'Валик ніг').adjustments.at(-1).label, 'Валик ніг');
  assert.equal(removeAdjustment(pos, valik.id).adjustments.at(-1).deleted, true);

  const seat = setPositionCount(byId['eq-03'], 'seat', 8).adjustments.find((a) => a.id === 'seat');
  assert.equal(seat.count, 8);
  assert.equal(seat.approx, false, 'уточнена кількість знімає ⚠');
});

test('новий тренажер: свій, без схеми, з першою вправою', () => {
  const eq = addEquipment({ name: 'Смітт', group: 'legs', weightMode: 'single', exerciseName: '' });
  assert.equal(eq.name, 'Смітт');
  assert.equal(eq.custom, true);
  assert.equal(eq.schemeId, null);
  assert.equal(eq.siteName, null);
  assert.deepEqual(eq.exercises.map((x) => x.name), ['Смітт']);
  assert.ok(eq.id && eq.exercises[0].id);
  assert.throws(() => addEquipment({ name: ' ', group: 'legs', weightMode: 'single' }), /назву/);
});

// --- новий контракт модуля схеми: art + MARKERS + PICKERS (spec «Правки, друга черга» Q1, Q4) ---
import { schemeSvg, equipmentIcon, pickerArt, adjustmentRows, markerColor } from '../src/schemes/index.js';
import { isSchemeModule } from '../src/schemes/registry.js';

/** Тестовий модуль нового контракту: запам'ятовує, з чим його викликали. */
function testModule() {
  const calls = [];
  return {
    calls,
    id: 'test-art',
    HINTS: { seat: { first: 'найнижче', last: 'найвище' } },
    art: (opts) => {
      calls.push(opts);
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240"><g id="machine-${opts.mini ? 'mini' : 'full'}-${opts.exerciseId}"/></svg>`;
    },
    MARKERS: { seat: { x: 120, y: 150 }, grip: { x: 250, y: 80 } },
    PICKERS: {
      seat: (value, adj) => `<svg viewBox="0 0 100 100"><g data-pick="1"/><text>${adj.label}:${value ?? '-'}</text></svg>`,
    },
  };
}
const testEq = {
  id: 'eq-t', name: 'Тест', group: 'chest', weightMode: 'single', schemeId: 'test-art',
  exercises: [{ id: 'eq-t-a', name: 'Вправа' }],
  adjustments: [
    { id: 'seat', label: 'Сидіння', kind: 'positions', count: 5, approx: true },
    { id: 'grip', label: 'Хват', kind: 'options', options: [{ id: 'green', label: 'Верх', color: '#2e9d4f' }, { id: 'red', label: 'Вигин' }] },
    { id: 'mine', label: 'Своє тренера', kind: 'positions', count: 3 },
    { id: 'gone', label: 'Видалене', kind: 'positions', count: 3, deleted: true },
  ],
};
const markerOf = (svg, adjId) => new RegExp(`<g[^>]*data-marker="${adjId}"[^>]*>`).exec(svg)?.[0] || null;

test('новий контракт: малюнок art без бейджів і шкал, мітки на координатах MARKERS', () => {
  const mod = testModule();
  const svg = schemeSvg(mod, testEq, 'eq-t-a', {});
  assert.deepEqual(mod.calls, [{ exerciseId: 'eq-t-a', mini: false }]);
  assert.match(svg, /^<svg[\s>][\s\S]*<\/svg>$/);
  assert.ok(svg.includes('id="machine-full-eq-t-a"'), 'малюнок тренажера на місці');
  assert.ok(!svg.includes('data-badge') && !svg.includes('data-pos='), 'без бейджів і шкал');
  assert.ok(markerOf(svg, 'seat') && markerOf(svg, 'grip'));
  assert.match(svg, /data-marker="seat"[\s\S]*?<circle[^>]*cx="120"[^>]*cy="150"/);
  assert.match(svg, /data-marker="grip"[\s\S]*?<circle[^>]*cx="250"[^>]*cy="80"/);
  assert.equal(markerOf(svg, 'mine'), null, 'регулювання без координат — лише в списку');
  assert.equal(markerOf(svg, 'gone'), null, 'видалене — без мітки');
  assert.ok(markerOf(svg, 'seat').includes('data-adj="seat"'), 'мітка — кнопка регулювання');
  // мітка — маленька: радіус від ширини viewBox (360 → 9)
  assert.match(svg, /data-marker="seat"[\s\S]*?<circle[^>]*class="sc-marker-dot"[^>]*r="9"/);
});

test('вибране значення підсвічує мітку; невибране — порожня мітка; без цифр на малюнку', () => {
  const mod = testModule();
  const svg = schemeSvg(mod, testEq, 'eq-t-a', { seat: 3 });
  assert.match(markerOf(svg, 'seat'), /class="[^"]*is-set/);
  assert.match(markerOf(svg, 'seat'), /data-value="3"/);
  assert.match(markerOf(svg, 'grip'), /class="[^"]*is-empty/);
  assert.match(markerOf(svg, 'grip'), /data-value=""/);
  assert.ok(!/<text[^>]*>3<\/text>/.test(svg), 'значення не пишеться цифрою на малюнку');
  const svg2 = schemeSvg(mod, testEq, 'eq-t-a', { grip: 'red', seat: 99 });
  assert.match(markerOf(svg2, 'grip'), /is-set/);
  assert.match(markerOf(svg2, 'seat'), /is-empty/, 'позиція поза 1…N — не вибрано');
});

test('MARKERS може залежати від вправи (функція exerciseId → координати)', () => {
  const mod = { ...testModule(), MARKERS: (exId) => (exId === 'eq-t-b' ? { seat: { x: 10, y: 20 } } : {}) };
  assert.equal(markerOf(schemeSvg(mod, testEq, 'eq-t-a', {}), 'seat'), null);
  assert.match(schemeSvg(mod, testEq, 'eq-t-b', {}), /data-marker="seat"[\s\S]*?cx="10"[^>]*cy="20"/);
});

test('старий модуль (draw) малюється як раніше', () => {
  const eq = byId['eq-03'];
  const svg = schemeSvg(SCHEMES.butterfly, eq, 'eq-03-a', { seat: 4 });
  assert.equal(svg, SCHEMES.butterfly.draw({ seat: 4 }, eq.adjustments.filter((a) => !a.deleted)));
});

test('список під малюнком: усі активні регулювання з поточним значенням, ⚠ біля приблизних, колір мітки', () => {
  const rows = adjustmentRows(testEq, { seat: 3, grip: 'green' }, testModule(), 'eq-t-a');
  assert.deepEqual(rows.map((r) => [r.id, r.label, r.value, r.set, r.approx]), [
    ['seat', 'Сидіння', '3', true, true],
    ['grip', 'Хват', 'Верх', true, false],
    ['mine', 'Своє тренера', 'не вибрано', false, false],
  ]);
  assert.equal(rows[0].marker, markerColor(0));
  assert.equal(rows[1].marker, markerColor(1));
  assert.equal(rows[2].marker, null, 'без мітки на малюнку — без кольору');
  assert.notEqual(markerColor(0), markerColor(1));
  // колір у списку = колір мітки на малюнку
  const svg = schemeSvg(testModule(), testEq, 'eq-t-a', {});
  assert.ok(markerOf(svg, 'grip').includes(`--mk:${markerColor(1)}`) || svg.includes(`stroke="${markerColor(1)}"`));
});

test('PICKERS: наочність у вікні вибору отримує поточне значення; без PICKERS — порожньо', () => {
  const mod = testModule();
  const seat = testEq.adjustments[0];
  assert.match(pickerArt(mod, seat, 4), /Сидіння:4/);
  assert.match(pickerArt(mod, seat, undefined), /Сидіння:-/);
  assert.equal(pickerArt(mod, testEq.adjustments[1], 'red'), '');
  assert.equal(pickerArt(SCHEMES.butterfly, seat, 1), '', 'старі модулі PICKERS не мають');
});

test('значок у меню: силует art({mini:true}), гантеля для групи «Гантелі», нейтральний без схеми', () => {
  const mod = testModule();
  const icon = equipmentIcon(testEq, mod);
  assert.deepEqual(mod.calls, [{ exerciseId: 'eq-t-a', mini: true }]);
  assert.ok(icon.includes('id="machine-mini-eq-t-a"'));
  assert.ok(!icon.includes('data-marker'), 'у значку без міток');
  const db = seedEquipment().filter((e) => e.group === 'dumbbells');
  assert.ok(db.length > 3);
  const dbIcons = new Set(db.map((e) => equipmentIcon(e)));
  assert.equal(dbIcons.size, 1, 'усі гантелі — один значок');
  const [dumbbell] = dbIcons;
  assert.match(dumbbell, /^<svg[\s>][\s\S]*<\/svg>$/);
  assert.ok(dumbbell.includes('data-icon="dumbbell"'));
  const neutral = equipmentIcon({ ...byId['eq-01'], schemeId: null });
  assert.ok(neutral.includes('data-icon="machine"'));
  assert.notEqual(neutral, dumbbell);
  assert.equal(equipmentIcon(byId['eq-03'], SCHEMES.butterfly), neutral, 'старий модуль без art — нейтральний значок');
  // зламаний art не валить меню
  assert.equal(equipmentIcon(testEq, { id: 'x', art: () => { throw new Error('x'); } }), neutral);
});

test('реєстр приймає модулі обох контрактів', () => {
  assert.equal(isSchemeModule(testModule()), true);
  assert.equal(isSchemeModule(SCHEMES.butterfly), true);
  assert.equal(isSchemeModule({ id: 'x' }), false);
  assert.equal(isSchemeModule({ art: () => '' }), false);
});
