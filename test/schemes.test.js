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

test('кожен schemeId каталогу має схему в реєстрі', () => {
  for (const eq of seedEquipment()) {
    if (!eq.schemeId || eq.hidden) continue;
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
