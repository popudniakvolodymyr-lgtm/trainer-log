import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment } from '../src/core/catalog.js';
import { SCHEMES as LEGS } from '../src/schemes/legs.js';
import { SCHEMES, schemeFor } from '../src/schemes/registry.js';
import { schemeSvg, schemeMarkers, pickerArt, equipmentIcon } from '../src/schemes/index.js';

// Очікування — зі spec.md («Правки, друга черга» Q2–Q4, Q7), interfaces.md («T05 — каталог правок»,
// «T08 — каркас схем») і брифу автора, не з коду під тестом.
const catalog = seedEquipment();
const byId = Object.fromEntries(catalog.map((e) => [e.id, e]));
const active = (eq) => eq.adjustments.filter((a) => !a.deleted);
const mod = (schemeId) => LEGS.find((m) => m.id === schemeId);
const exOf = (eq) => eq.exercises[0].id;

// schemeId тренажерів групи «Ноги» → регулювання (interfaces.md, legs).
const LEG_MACHINES = {
  'eq-04': ['leg-press', []],
  'eq-05': ['seated-leg-press', []],
  'eq-06': ['hip-adduction', []],
  'eq-07': ['leg-curl', ['roller']],
  'eq-08': ['hack-squat', []],
  'eq-09': ['hip-abduction', []],
  'eq-10': ['leg-extension', ['roller', 'tilt', 'backrest']],
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
const viewBox = (svg) => {
  const m = /^<svg[^>]*viewBox="([^"]+)"/.exec(svg);
  return m ? m[1].split(/[\s,]+/).map(Number) : null;
};

/** Правило id (interfaces.md, T08): кожен id — з префіксом schemeId, у mini — із суфіксом -mini; url(#…) — на свої id. */
function idsOk(svg, schemeId, mini) {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) {
    if (!id.startsWith(`${schemeId}-`)) return `id без префікса: ${id}`;
    if (mini !== id.endsWith('-mini')) return `id без/із зайвим -mini: ${id}`;
  }
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) if (!ids.includes(m[1])) return `url на чужий id: ${m[1]}`;
  return null;
}

/** Спільні перевірки малюнка art: SVG, viewBox від 0 0, без тексту, бейджів і шкал. */
function checkArt(svg, schemeId, mini, what) {
  assert.match(svg, /^<svg[\s>]/, what);
  assert.match(svg, /<\/svg>$/, what);
  assert.ok(!/NaN|undefined|null|Infinity/.test(svg), `${what}: NaN/undefined у SVG`);
  assert.ok(tagsBalanced(svg), `${what}: незбалансовані теги`);
  const vb = viewBox(svg);
  assert.ok(vb && vb[0] === 0 && vb[1] === 0 && vb[2] > 0 && vb[3] > 0, `${what}: viewBox "0 0 W H"`);
  if (!mini) assert.ok(vb[2] >= 320 && vb[2] <= 400, `${what}: ширина ≈360`);
  assert.ok(!/<text[\s>]/.test(svg), `${what}: на малюнку немає тексту`);
  assert.ok(!/data-badge|data-pos=|sc-ring|sc-ruler|stroke-dasharray/.test(svg), `${what}: без бейджів, шкал і пунктирних рамок`);
  assert.equal(idsOk(svg, schemeId, mini), null, what);
  return vb;
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

test('кожна схема ніг — новий контракт: art у ракурсі ¾ з людиною, mini — силует без людини', () => {
  for (const [eqId, [schemeId]] of Object.entries(LEG_MACHINES)) {
    const m = mod(schemeId);
    assert.equal(typeof m.art, 'function', `${schemeId}: немає art`);
    const ex = exOf(byId[eqId]);
    const full = m.art({ exerciseId: ex, mini: false });
    const mini = m.art({ exerciseId: ex, mini: true });
    checkArt(full, schemeId, false, `${schemeId} full`);
    checkArt(mini, schemeId, true, `${schemeId} mini`);
    assert.ok(full.includes('class="sc-person"'), `${schemeId}: на схемі є людина`);
    assert.ok(!mini.includes('sc-person'), `${schemeId}: у значку людини немає`);
    assert.ok(mini.length < full.length, `${schemeId}: значок простіший за схему`);
    // значок меню — саме цей силует
    assert.equal(equipmentIcon(byId[eqId]), mini, `${schemeId}: значок меню`);
  }
});

test('MARKERS: мітка на кожне регулювання каталогу, усередині малюнка; без регулювань — без міток', () => {
  for (const [eqId, [schemeId, adjIds]] of Object.entries(LEG_MACHINES)) {
    const eq = byId[eqId];
    const m = mod(schemeId);
    assert.deepEqual(active(eq).map((a) => a.id), adjIds, `${eqId}: регулювання з каталогу`);
    const ex = exOf(eq);
    const markers = schemeMarkers(m, ex);
    assert.deepEqual(Object.keys(markers).sort(), [...adjIds].sort(), `${schemeId}: мітки`);
    const [, , W, H] = viewBox(m.art({ exerciseId: ex, mini: false }));
    for (const [id, p] of Object.entries(markers)) {
      assert.ok(p.x > 8 && p.x < W - 8 && p.y > 8 && p.y < H - 8, `${schemeId}/${id}: мітка поза малюнком`);
    }
    const svg = schemeSvg(m, eq, ex, {});
    for (const id of adjIds) assert.ok(svg.includes(`data-marker="${id}"`), `${schemeId}: немає мітки ${id}`);
    if (!adjIds.length) assert.ok(!svg.includes('data-marker'), `${schemeId}: зайві мітки`);
  }
});

test('Розгинання ніг: три мітки на своїх місцях — верхній шарнір над нижнім (валік), спинка — далеко від важеля', () => {
  const eq = byId['eq-10'];
  const mk = schemeMarkers(mod('leg-extension'), exOf(eq));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // мітки не налазять одна на одну (радіус мітки 9 → щонайменше 3 радіуси)
  assert.ok(dist(mk.roller, mk.tilt) > 27 && dist(mk.roller, mk.backrest) > 27 && dist(mk.tilt, mk.backrest) > 27);
  assert.ok(mk.tilt.y < mk.roller.y, 'верхній шарнір (нахил) вище за нижній (валік)');
  assert.ok(Math.abs(mk.backrest.x - mk.roller.x) > Math.abs(mk.tilt.x - mk.roller.x), 'спинка — з іншого боку сидіння, не на важелі');
  // значення підсвічує свою мітку
  const svg = schemeSvg(mod('leg-extension'), eq, exOf(eq), { tilt: 4 });
  assert.match(svg, /data-marker="tilt"[^>]*data-value="4"[^>]*class="[^"]*is-set/);
  assert.match(svg, /data-marker="roller"[^>]*class="[^"]*is-empty/);
});

test('Зведення й Розведення ніг різняться (подушки всередині / зовні колін)', () => {
  const a = mod('hip-adduction').art({ exerciseId: 'eq-06-a', mini: false });
  const b = mod('hip-abduction').art({ exerciseId: 'eq-09-a', mini: false });
  assert.notEqual(a, b);
  assert.notEqual(mod('hip-adduction').art({ mini: true }), mod('hip-abduction').art({ mini: true }));
});

// Позиції вибору у PICKER: [{pick, cx, cy, on}] з елементів data-pick (перше коло всередині).
function picks(svg) {
  return [...svg.matchAll(/<g[^>]*data-pick="(\d+)"([^>]*)>\s*<circle[^>]*cx="([\d.-]+)"[^>]*cy="([\d.-]+)"/g)]
    .map((m) => ({ pick: Number(m[1]), on: /is-on/.test(m[0].split('>')[0]), cx: Number(m[3]), cy: Number(m[4]) }));
}

test('Згинання ніг лежачи: у вікні вибору — позиції валика 1…N по колу шарніра, вибрана підсвічена', () => {
  const adj = active(byId['eq-07']).find((a) => a.id === 'roller');
  const m = mod('leg-curl');
  const svg = pickerArt(m, adj, 4);
  assert.match(svg, /^<svg[\s>][\s\S]*<\/svg>$/);
  assert.ok(tagsBalanced(svg));
  const p = picks(svg);
  assert.deepEqual(p.map((x) => x.pick), [1, 2, 3, 4, 5]);
  assert.deepEqual(p.filter((x) => x.on).map((x) => x.pick), [4], 'підсвічено лише вибрану');
  const c = /data-dial-center="([\d.-]+),([\d.-]+)"/.exec(svg);
  assert.ok(c, 'є центр круглого шарніра');
  const radii = p.map((x) => Math.hypot(x.cx - Number(c[1]), x.cy - Number(c[2])));
  for (const r of radii) assert.ok(Math.abs(r - radii[0]) < 0.6, 'позиції на одному колі');
  assert.equal(new Set(p.map((x) => `${x.cx},${x.cy}`)).size, 5, 'усі в різних місцях');
  // 1 — найнижче, 5 — найвище (SVG: менше y — вище)
  assert.ok(p[4].cy < p[0].cy, '5 вище за 1');
  // нічого не вибрано — нічого не підсвічено; тренер змінив кількість позицій — стільки ж кнопок
  assert.deepEqual(picks(pickerArt(m, adj, undefined)).filter((x) => x.on), []);
  assert.notEqual(pickerArt(m, adj, 1), svg, 'інше значення — інше положення важеля');
  assert.equal(picks(pickerArt(m, { ...adj, count: 7 }, 2)).length, 7);
});

test('Розгинання ніг: у вікні вибору кожного з трьох регулювань — позиції 1…N, вибрана підсвічена', () => {
  const m = mod('leg-extension');
  for (const adj of active(byId['eq-10'])) {
    const svg = pickerArt(m, adj, 2);
    assert.match(svg, /^<svg[\s>][\s\S]*<\/svg>$/, adj.id);
    assert.ok(tagsBalanced(svg), adj.id);
    const p = picks(svg);
    assert.deepEqual(p.map((x) => x.pick), [1, 2, 3, 4, 5], adj.id);
    assert.deepEqual(p.filter((x) => x.on).map((x) => x.pick), [2], adj.id);
    assert.deepEqual(picks(pickerArt(m, adj, undefined)).filter((x) => x.on), [], adj.id);
    assert.notEqual(pickerArt(m, adj, 5), svg, `${adj.id}: значення рухає деталь`);
  }
});
