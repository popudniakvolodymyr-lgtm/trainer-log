import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment } from '../src/core/catalog.js';
import { SCHEMES as UPPER } from '../src/schemes/upper.js';
import { schemeFor } from '../src/schemes/registry.js';
import * as leverPulldownModule from '../src/schemes/lever-pulldown.js';
import { renameOption } from '../src/schemes/equipment-edit.js';

// Очікування — з interfaces.md («T05 — каталог правок») і spec.md «Правки» П2–П4, П6–П8,
// не з коду під тестом.
const UPPER_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'abs', 'dumbbells'];
const UPPER_IDS = [
  'plate-chest-press', 'lateral-raise', 'plate-shoulder-press', 'ab-station', 'assisted-dip',
  'cable-curl', 'assisted-pullup', 'triceps-press', 'lever-pulldown', 'lever-row', 'cable-pull',
  'lat-pulldown',
];
const DUMBBELL_IDS = [
  'db-curl', 'db-bench-curl', 'db-hammer', 'db-lateral', 'db-front', 'db-press', 'db-fly',
  'db-seated-press', 'db-row', 'db-overhead', 'db-lunge', 'db-squat',
];
const APPROX = '⚠ приблизно — уточнити в залі';

const seed = seedEquipment();
const byId = Object.fromEntries(seed.map((e) => [e.id, e]));
const visibleUpper = seed.filter((e) => UPPER_GROUPS.includes(e.group) && !e.hidden && !e.retired);
const active = (eq) => eq.adjustments.filter((a) => !a.deleted);
const upperById = Object.fromEntries(UPPER.map((m) => [m.id, m]));

const badgeValue = (svg, adjId) => {
  const m = new RegExp(`data-badge="${adjId}"[^>]*data-value="([^"]*)"`).exec(svg);
  return m ? m[1] : null;
};
const ariaLabel = (svg) => (/^<svg[^>]*aria-label="([^"]*)"/.exec(svg) || [])[1] || '';

/** Перевірка, що теги збалансовані (SVG можна вставити в DOM без розриву розмітки). */
function balanced(svg) {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

test('upper.js: схема для кожного schemeId верхньої частини тіла і для 12 вправ з гантелями', () => {
  for (const sid of [...UPPER_IDS, ...DUMBBELL_IDS]) {
    assert.ok(upperById[sid], `немає схеми ${sid}`);
    assert.equal(typeof upperById[sid].draw, 'function', sid);
  }
});

test('кожен видимий тренажер груди/спина/плечі/руки/прес/гантелі має схему в реєстрі', () => {
  assert.ok(visibleUpper.length >= 25, `видимих тренажерів ${visibleUpper.length}`);
  for (const eq of visibleUpper) {
    const sc = schemeFor(eq);
    assert.ok(sc, `${eq.id} (${eq.name}): немає схеми`);
    assert.equal(sc.id, eq.schemeId, eq.id);
  }
  // модулі з upper.js — саме ті, що бере реєстр
  assert.equal(schemeFor(byId['eq-22']), upperById['lever-row']);
  assert.equal(schemeFor(byId['eq-02']), upperById['plate-chest-press']);
});

test('кожна схема: SVG із збалансованими тегами, data-adj на кожне регулювання, позиції й варіанти розмічені', () => {
  for (const eq of visibleUpper) {
    const svg = schemeFor(eq).draw({}, eq.adjustments);
    assert.match(svg, /^<svg[\s>]/, eq.id);
    assert.match(svg, /<\/svg>$/, eq.id);
    assert.ok(balanced(svg), `${eq.id}: незбалансовані теги`);
    for (const a of active(eq)) {
      assert.ok(svg.includes(`data-adj="${a.id}"`), `${eq.id}: немає зони ${a.id}`);
      assert.equal(badgeValue(svg, a.id), '', `${eq.id}: бейдж ${a.id} без значення`);
      if (a.kind === 'positions') {
        for (let n = 1; n <= a.count; n++) {
          assert.ok(svg.includes(`data-pos="${a.id}:${n}"`), `${eq.id}: немає позначки ${a.id}:${n}`);
        }
      } else if (a.id !== 'handle') {
        for (const o of a.options) {
          assert.ok(svg.includes(`data-opt="${o.id}"`), `${eq.id}: немає варіанта ${a.id}/${o.id}`);
          assert.ok(svg.includes(o.label), `${eq.id}: не підписано варіант ${o.label}`);
        }
      }
    }
    if (active(eq).some((a) => a.approx || a.unknown)) assert.ok(svg.includes(APPROX), `${eq.id}: немає ⚠`);
    if (!active(eq).length) assert.ok(!svg.includes('data-adj='), `${eq.id}: зайва зона регулювання`);
  }
});

test('значення клієнта видно великим бейджем і позначкою на схемі (для кожного тренажера з регулюваннями)', () => {
  for (const eq of visibleUpper) {
    const adjs = active(eq);
    if (!adjs.length) continue;
    for (const pickLast of [false, true]) {
      const values = {};
      for (const a of adjs) {
        if (a.kind === 'positions') values[a.id] = pickLast ? a.count : 2;
        else values[a.id] = pickLast ? a.options[a.options.length - 1].id : a.options[0].id;
      }
      const svg = schemeFor(eq).draw(values, eq.adjustments);
      for (const a of adjs) {
        assert.equal(badgeValue(svg, a.id), String(values[a.id]), `${eq.id}: бейдж ${a.id}`);
        if (a.kind === 'positions') {
          assert.match(svg, new RegExp(`data-pos="${a.id}:${values[a.id]}" class="[^"]*is-on`), `${eq.id}: ${a.id}`);
        } else {
          const opt = a.options.find((o) => o.id === values[a.id]);
          assert.ok(svg.includes(opt.label), `${eq.id}: назва ${opt.label}`);
        }
      }
    }
  }
});

test('№22 — горизонтальна тяга: сидіння 1…5 ⚠, три кольорові хвати, вибраний підсвічений', () => {
  const eq = byId['eq-22'];
  const svg = schemeFor(eq).draw({ seat: 4, grip: 'orange' }, eq.adjustments);
  assert.match(ariaLabel(svg), /горизонтальн/i);
  assert.doesNotMatch(ariaLabel(svg), /вертикальн/i);
  for (const color of ['#2e9d4f', '#d63b3b', '#f08a1c']) assert.ok(svg.includes(color), color);
  assert.match(svg, /data-opt="orange"[^>]*class="[^"]*is-selected/);
  assert.doesNotMatch(svg, /data-opt="green"[^>]*class="[^"]*is-selected/);
  assert.equal(badgeValue(svg, 'seat'), '4');
  assert.ok(svg.includes('Низ'));
  assert.ok(svg.includes(APPROX));
  assert.equal(typeof schemeFor(eq).optionIcon, 'function');
  assert.match(schemeFor(eq).optionIcon(eq.adjustments.find((a) => a.id === 'grip'), 'red'), /^<svg[\s\S]*#d63b3b[\s\S]*<\/svg>$/);
});

test('№21 — вертикальна тяга: 2 позиції ручки «Ширше»/«Вужче» і притискний валік 1…5, без трьох хватів', () => {
  const eq = byId['eq-21'];
  const sc = schemeFor(eq);
  assert.equal(sc.id, 'lever-pulldown');
  assert.equal(leverPulldownModule.id, 'lever-pulldown');
  assert.equal(leverPulldownModule.draw, sc.draw, 'lever-pulldown.js — та сама схема, що в upper.js');
  const svg = sc.draw({ 'grip-pos': 'pos-2', roller: 5 }, eq.adjustments);
  assert.match(ariaLabel(svg), /вертикальн/i);
  assert.ok(svg.includes('Ширше') && svg.includes('Вужче'));
  assert.match(svg, /data-opt="pos-2"[^>]*class="[^"]*is-selected/);
  assert.doesNotMatch(svg, /data-opt="pos-1"[^>]*class="[^"]*is-selected/);
  assert.equal(badgeValue(svg, 'roller'), '5');
  assert.equal(badgeValue(svg, 'grip-pos'), 'pos-2');
  assert.ok(!svg.includes('data-opt="green"'));
  assert.ok(!svg.includes('data-adj="seat"'), 'сидіння на №21 не регулюється');
});

test('№2 «Жим у тренажері»: лише висота сидіння, 5 позицій ⚠, найнижче/найвище підписані', () => {
  const eq = byId['eq-02'];
  const svg = schemeFor(eq).draw({ seat: 1 }, eq.adjustments);
  assert.deepEqual([...new Set([...svg.matchAll(/data-adj="([^"]+)"/g)].map((m) => m[1]))], ['seat']);
  assert.ok(svg.includes('найнижче') && svg.includes('найвище'));
  assert.equal(badgeValue(svg, 'seat'), '1');
});

test('перейменований варіант позиції ручки — нова назва на схемі, текст екранується', () => {
  for (const eqId of ['eq-21', 'eq-14']) {
    const eq = renameOption(byId[eqId], 'grip-pos', 'pos-1', 'Широко <зовні>');
    const svg = schemeFor(eq).draw({ 'grip-pos': 'pos-1' }, eq.adjustments);
    assert.ok(svg.includes('Широко &lt;зовні&gt;'), eqId);
    assert.ok(!svg.includes('<зовні>'), eqId);
  }
});

test('«Прес»: на схемі обидві вправи — ротація і скручування', () => {
  const svg = schemeFor(byId['eq-15']).draw({}, []);
  assert.ok(svg.includes('Ротація') && svg.includes('Скручування'));
});

test('гантелі: 12 різних схем, у підписі — назва вправи з каталогу, регулювань немає', () => {
  const dbs = seed.filter((e) => e.group === 'dumbbells');
  assert.equal(dbs.length, 12);
  const svgs = new Set();
  for (const eq of dbs) {
    const svg = schemeFor(eq).draw({}, eq.adjustments);
    assert.ok(balanced(svg), eq.id);
    assert.ok(ariaLabel(svg).includes(eq.name), `${eq.id}: «${ariaLabel(svg)}» без «${eq.name}»`);
    assert.ok(!svg.includes('data-adj='), eq.id);
    svgs.add(svg);
  }
  assert.equal(svgs.size, 12, 'усі 12 малюнків різні');
});

test('усі схеми upper.js різні (жодна не підмінена іншою)', () => {
  const drawn = UPPER.map((m) => {
    const eq = seed.find((e) => e.schemeId === m.id);
    return m.draw({}, eq ? eq.adjustments : []);
  });
  assert.equal(new Set(drawn).size, UPPER.length);
});
