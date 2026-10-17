import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment } from '../src/core/catalog.js';
import { SCHEMES as LEGS } from '../src/schemes/legs.js';
import { SCHEMES, schemeFor } from '../src/schemes/registry.js';

// Очікування — зі spec.md (П4, П6), interfaces.md («T05 — каталог правок») і брифу автора,
// не з коду під тестом.
const catalog = seedEquipment();
const byId = Object.fromEntries(catalog.map((e) => [e.id, e]));
const active = (eq) => eq.adjustments.filter((a) => !a.deleted);
const mod = (schemeId) => LEGS.find((m) => m.id === schemeId);

// schemeId тренажерів групи «Ноги» → скільки регулювань (interfaces.md, legs).
const LEG_MACHINES = {
  'eq-04': ['leg-press', []],
  'eq-05': ['seated-leg-press', []],
  'eq-06': ['hip-adduction', []],
  'eq-07': ['leg-curl', ['roller']],
  'eq-08': ['hack-squat', []],
  'eq-09': ['hip-abduction', []],
  'eq-10': ['leg-extension', ['roller', 'tilt', 'backrest']],
};

const badgeValue = (svg, adjId) => {
  const m = new RegExp(`data-badge="${adjId}"[^>]*data-value="([^"]*)"`).exec(svg);
  return m ? m[1] : null;
};

// Кількість відкритих і закритих тегів збігається (SVG — це XML).
function tagsBalanced(svg) {
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) { if (stack.pop() !== name) return false; } else stack.push(name);
  }
  return stack.length === 0;
}

test('збірка legs.js: рівно по одному модулю на кожен тренажер ніг з каталогу', () => {
  assert.deepEqual(LEGS.map((m) => m.id).sort(), Object.values(LEG_MACHINES).map(([s]) => s).sort());
  const legsInCatalog = catalog.filter((e) => e.group === 'legs' && e.schemeId);
  assert.equal(legsInCatalog.length, 7);
  for (const eq of legsInCatalog) assert.ok(mod(eq.schemeId), `немає схеми ${eq.schemeId}`);
});

test('реєстр віддає ці схеми за schemeId тренажера', () => {
  for (const [eqId, [schemeId]] of Object.entries(LEG_MACHINES)) {
    assert.equal(byId[eqId].schemeId, schemeId);
    assert.equal(schemeFor(byId[eqId]), mod(schemeId), eqId);
    assert.equal(SCHEMES[schemeId], mod(schemeId));
  }
});

test('кожна схема: коректний SVG, без NaN, теги збалансовані; регулювання каталогу мають data-adj', () => {
  for (const [eqId, [schemeId, adjIds]] of Object.entries(LEG_MACHINES)) {
    const eq = byId[eqId];
    assert.deepEqual(active(eq).map((a) => a.id), adjIds, `${eqId}: регулювання з каталогу`);
    const svg = mod(schemeId).draw({}, eq.adjustments);
    assert.match(svg, /^<svg[\s>]/, eqId);
    assert.match(svg, /<\/svg>$/, eqId);
    assert.ok(!/NaN|undefined|null/.test(svg), `${eqId}: у SVG є NaN/undefined/null`);
    assert.ok(tagsBalanced(svg), `${eqId}: незбалансовані теги`);
    assert.deepEqual([...svg.matchAll(/data-adj="([^"]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).sort(),
      [...adjIds].sort(), `${eqId}: зони data-adj`);
    assert.deepEqual(mod(schemeId).ADJUSTMENTS || [], adjIds, `${eqId}: ADJUSTMENTS модуля`);
  }
});

test('тренажери без регулювань малюються і з порожніми, і з чужими значеннями', () => {
  for (const schemeId of ['leg-press', 'seated-leg-press', 'hip-adduction', 'hip-abduction', 'hack-squat']) {
    const a = mod(schemeId).draw({}, []);
    const b = mod(schemeId).draw({ seat: 3, roller: 2 }, []);
    assert.ok(a.length > 400, `${schemeId}: схема не порожня`);
    assert.equal(a, b, `${schemeId}: значення неіснуючих регулювань нічого не змінюють`);
  }
});

test('Зведення й Розведення ніг різняться (інакше їх не відрізнити на схемі)', () => {
  assert.notEqual(mod('hip-adduction').draw({}, []), mod('hip-abduction').draw({}, []));
});

test('Згинання ніг лежачи: позиції валика 1…5 по колу шарніра, значення клієнта великим бейджем', () => {
  const eq = byId['eq-07'];
  const m = mod('leg-curl');
  const svg = m.draw({ roller: 4 }, eq.adjustments);
  assert.equal(badgeValue(svg, 'roller'), '4');
  for (let n = 1; n <= 5; n++) assert.ok(svg.includes(`data-pos="roller:${n}"`), `немає позначки roller:${n}`);
  assert.ok(svg.includes('шарнір'), 'підпис про круглий шарнір');
  assert.ok(svg.includes('⚠ приблизно — уточнити в залі'));
  // позначки йдуть по колу: центри п'яти отворів лежать на одній відстані від центра диска
  const holes = [...svg.matchAll(/data-hole="(\d)" cx="([\d.-]+)" cy="([\d.-]+)"/g)].map((x) => [Number(x[1]), Number(x[2]), Number(x[3])]);
  assert.equal(holes.length, 5);
  const c = /data-dial-center="([\d.-]+),([\d.-]+)"/.exec(svg);
  assert.ok(c, 'є центр великого диска');
  const radii = holes.map(([, x, y]) => Math.hypot(x - Number(c[1]), y - Number(c[2])));
  for (const r of radii) assert.ok(Math.abs(r - radii[0]) < 0.6, 'отвори на одному колі');
  assert.ok(new Set(holes.map(([, x, y]) => `${x},${y}`)).size === 5, 'усі п’ять у різних місцях');
  // інше значення → інший бейдж і інше положення вибраного отвору
  const svg2 = m.draw({ roller: 1 }, eq.adjustments);
  assert.equal(badgeValue(svg2, 'roller'), '1');
  assert.notEqual(svg, svg2);
  assert.equal(badgeValue(m.draw({}, eq.adjustments), 'roller'), '');
  assert.equal(badgeValue(m.draw({ roller: 9 }, eq.adjustments), 'roller'), '', 'поза 1…5 — не вибрано');
});

test('Розгинання ніг: валік, нахил і спинка — три підсвічені зони з підписами й значеннями', () => {
  const eq = byId['eq-10'];
  const m = mod('leg-extension');
  const svg = m.draw({ roller: 2, tilt: 5, backrest: 3 }, eq.adjustments);
  assert.equal(badgeValue(svg, 'roller'), '2');
  assert.equal(badgeValue(svg, 'tilt'), '5');
  assert.equal(badgeValue(svg, 'backrest'), '3');
  for (const adj of ['roller', 'tilt', 'backrest']) {
    assert.ok(svg.includes(`data-adj="${adj}"`), `немає зони ${adj}`);
    for (let n = 1; n <= 5; n++) assert.ok(svg.includes(`data-pos="${adj}:${n}"`), `немає ${adj}:${n}`);
  }
  for (const label of ['Валік', 'Нахил', 'Спинка (вперед-назад)']) assert.ok(svg.includes(label), label);
  assert.ok(svg.includes('⚠ приблизно — уточнити в залі'));
  assert.equal(badgeValue(m.draw({ tilt: 2 }, eq.adjustments), 'roller'), '');
  assert.equal(badgeValue(m.draw({ tilt: 2 }, eq.adjustments), 'tilt'), '2');
  // кожне регулювання рухає свою деталь: інше значення → інший малюнок
  const base = m.draw({ roller: 3, tilt: 3, backrest: 3 }, eq.adjustments);
  for (const adj of ['roller', 'tilt', 'backrest']) {
    assert.notEqual(m.draw({ roller: 3, tilt: 3, backrest: 3, [adj]: 1 }, eq.adjustments), base, adj);
  }
});

test('тренер перейменував або сховав регулювання — схема це витримує', () => {
  const eq = byId['eq-10'];
  const renamed = eq.adjustments.map((a) => (a.id === 'tilt' ? { ...a, label: 'Кут' } : a));
  const svg = mod('leg-extension').draw({ tilt: 2 }, renamed);
  assert.ok(svg.includes('Кут'));
  const hidden = eq.adjustments.map((a) => (a.id === 'tilt' ? { ...a, deleted: true } : a));
  const svg2 = mod('leg-extension').draw({ tilt: 2 }, hidden);
  assert.ok(!svg2.includes('data-adj="tilt"'));
  assert.ok(svg2.includes('data-adj="roller"') && svg2.includes('data-adj="backrest"'));
  // перейменована мітка з розміткою не ламає SVG
  const evil = eq.adjustments.map((a) => (a.id === 'roller' ? { ...a, label: 'А<b>"&' } : a));
  const svg3 = mod('leg-extension').draw({ roller: 1 }, evil);
  assert.ok(tagsBalanced(svg3));
  assert.ok(!svg3.includes('<b>'));
});
