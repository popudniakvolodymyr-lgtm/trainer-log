import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment, HANDLES } from '../src/core/catalog.js';
import { SCHEMES as UPPER } from '../src/schemes/upper.js';
import { schemeFor } from '../src/schemes/registry.js';
import { schemeSvg, schemeMarkers, pickerArt, equipmentIcon } from '../src/schemes/index.js';
import * as leverPulldownModule from '../src/schemes/lever-pulldown.js';
import { renameOption } from '../src/schemes/equipment-edit.js';

// Очікування — з interfaces.md («T05 — каталог правок», «T08 — каркас схем») і spec.md
// «Правки, друга черга» Q2–Q4, не з коду під тестом.
const MACHINE_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'abs'];
const UPPER_IDS = [
  'plate-chest-press', 'lateral-raise', 'plate-shoulder-press', 'ab-station', 'assisted-dip',
  'cable-curl', 'assisted-pullup', 'triceps-press', 'lever-pulldown', 'lever-row', 'cable-pull',
  'lat-pulldown',
];
const DUMBBELL_IDS = [
  'db-curl', 'db-bench-curl', 'db-hammer', 'db-lateral', 'db-front', 'db-press', 'db-fly',
  'db-seated-press', 'db-row', 'db-overhead', 'db-lunge', 'db-squat',
];

const seed = seedEquipment();
const byId = Object.fromEntries(seed.map((e) => [e.id, e]));
const visibleMachines = seed.filter((e) => MACHINE_GROUPS.includes(e.group) && !e.hidden && !e.retired);
const active = (eq) => eq.adjustments.filter((a) => !a.deleted);
const exercises = (eq) => eq.exercises.filter((x) => !x.deleted);
const upperById = Object.fromEntries(UPPER.map((m) => [m.id, m]));
const adj = (eqId, adjId) => byId[eqId].adjustments.find((a) => a.id === adjId);

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
const viewBox = (svg) => {
  const m = /^<svg[^>]*viewBox="([^"]+)"/.exec(svg);
  return m ? m[1].trim().split(/[\s,]+/).map(Number) : null;
};
const ariaLabel = (svg) => (/^<svg[^>]*aria-label="([^"]*)"/.exec(svg) || [])[1] || '';
const ids = (svg) => [...svg.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
/** Елемент вибору data-pick="v" вибраний (class … is-on). */
const pickOn = (svg, v) => new RegExp(`data-pick="${v}"[^>]*class="[^"]*is-on`).test(svg);

test('машини верху тіла — новий контракт (art + MARKERS), гантелі — як були (draw)', () => {
  for (const sid of UPPER_IDS) {
    assert.ok(upperById[sid], `немає схеми ${sid}`);
    assert.equal(typeof upperById[sid].art, 'function', `${sid}: немає art`);
    assert.ok(upperById[sid].MARKERS, `${sid}: немає MARKERS`);
  }
  for (const sid of DUMBBELL_IDS) {
    assert.ok(upperById[sid], `немає схеми ${sid}`);
    assert.equal(typeof upperById[sid].draw, 'function', sid);
  }
  for (const eqId of ['eq-03', 'eq-26', 'eq-22', 'eq-21']) {
    assert.equal(typeof schemeFor(byId[eqId]).art, 'function', `${eqId}: у реєстрі старий модуль`);
  }
});

test('кожен видимий тренажер груди/спина/плечі/руки/прес має схему в реєстрі', () => {
  assert.ok(visibleMachines.length >= 13, `видимих тренажерів ${visibleMachines.length}`);
  for (const eq of visibleMachines) {
    const sc = schemeFor(eq);
    assert.ok(sc, `${eq.id} (${eq.name}): немає схеми`);
    assert.equal(sc.id, eq.schemeId, eq.id);
  }
  assert.equal(schemeFor(byId['eq-22']), upperById['lever-row']);
  assert.equal(schemeFor(byId['eq-02']), upperById['plate-chest-press']);
});

test('art: SVG 360 у ширину з viewBox від 0 0, без тексту, бейджів, шкал і пунктирних рамок; з людиною', () => {
  for (const eq of visibleMachines) {
    const sc = schemeFor(eq);
    for (const ex of exercises(eq)) {
      const svg = sc.art({ exerciseId: ex.id, mini: false });
      const where = `${eq.id}/${ex.id}`;
      assert.match(svg, /^<svg[\s>]/, where);
      assert.match(svg, /<\/svg>$/, where);
      assert.ok(balanced(svg), `${where}: незбалансовані теги`);
      const vb = viewBox(svg);
      assert.ok(vb, `${where}: немає viewBox`);
      assert.deepEqual(vb.slice(0, 3), [0, 0, 360], where);
      assert.ok(vb[3] > 150 && vb[3] < 480, `${where}: висота ${vb[3]}`);
      assert.ok(!/<text[\s>]/.test(svg), `${where}: текст на малюнку`);
      assert.ok(!/data-badge|data-pos=|data-adj=|stroke-dasharray/.test(svg), `${where}: бейджі, шкали чи рамки`);
      assert.ok(svg.includes('sc-person'), `${where}: немає людини`);
      for (const id of ids(svg)) assert.ok(id.startsWith(`${sc.id}-`) && !id.endsWith('-mini'), `${where}: id «${id}»`);
    }
  }
});

test('art({mini:true}): силует без людини, валідний SVG, id з суфіксом -mini; значок меню бере його', () => {
  for (const eq of visibleMachines) {
    const sc = schemeFor(eq);
    const ex = exercises(eq)[0];
    const full = sc.art({ exerciseId: ex.id, mini: false });
    const mini = sc.art({ exerciseId: ex.id, mini: true });
    assert.match(mini, /^<svg[\s>][\s\S]*<\/svg>$/, eq.id);
    assert.ok(balanced(mini), `${eq.id}: незбалансовані теги значка`);
    assert.deepEqual(viewBox(mini).slice(0, 2), [0, 0], eq.id);
    assert.ok(!mini.includes('sc-person'), `${eq.id}: людина у значку`);
    assert.ok(!/<text[\s>]/.test(mini), eq.id);
    assert.notEqual(mini, full, eq.id);
    for (const id of ids(mini)) assert.ok(id.startsWith(`${sc.id}-`) && id.endsWith('-mini'), `${eq.id}: id «${id}»`);
    assert.equal(equipmentIcon(eq), mini, `${eq.id}: значок у меню — не силует схеми`);
  }
});

test('MARKERS: мітка на кожне регулювання каталогу, у межах малюнка; без регулювань — без міток', () => {
  for (const eq of visibleMachines) {
    const sc = schemeFor(eq);
    for (const ex of exercises(eq)) {
      const markers = schemeMarkers(sc, ex.id);
      const [, , w, h] = viewBox(sc.art({ exerciseId: ex.id, mini: false }));
      for (const a of active(eq)) {
        const p = markers[a.id];
        assert.ok(p, `${eq.id}/${ex.id}: немає мітки ${a.id}`);
        assert.ok(p.x > 0 && p.x < w && p.y > 0 && p.y < h, `${eq.id}: мітка ${a.id} поза малюнком (${p.x}, ${p.y})`);
      }
      const svg = schemeSvg(sc, eq, ex.id, {});
      for (const a of active(eq)) assert.ok(svg.includes(`data-marker="${a.id}"`), `${eq.id}: мітку ${a.id} не намальовано`);
      if (!active(eq).length) assert.ok(!svg.includes('data-marker='), `${eq.id}: зайва мітка`);
    }
  }
});

test('PICKERS: наочність у вікні вибору для кожного регулювання, кожне значення — кнопка data-pick', () => {
  for (const eq of visibleMachines) {
    const sc = schemeFor(eq);
    for (const a of active(eq)) {
      const values = a.kind === 'positions'
        ? Array.from({ length: a.count }, (_, i) => String(i + 1))
        : a.options.map((o) => o.id);
      const empty = pickerArt(sc, a, undefined);
      assert.match(empty, /^<svg[\s>][\s\S]*<\/svg>$/, `${eq.id}: немає PICKER для ${a.id}`);
      assert.ok(balanced(empty), `${eq.id}/${a.id}`);
      for (const v of values) assert.ok(empty.includes(`data-pick="${v}"`), `${eq.id}/${a.id}: немає вибору ${v}`);
      assert.ok(!values.some((v) => pickOn(empty, v)), `${eq.id}/${a.id}: без значення нічого не підсвічено`);
      const last = a.kind === 'positions' ? a.count : a.options.at(-1).id;
      const on = pickerArt(sc, a, last);
      assert.ok(pickOn(on, last), `${eq.id}/${a.id}: вибране ${last} не підсвічено`);
      assert.ok(!values.filter((v) => v !== String(last)).some((v) => pickOn(on, v)), `${eq.id}/${a.id}: підсвічено зайве`);
    }
  }
});

test('позиції сидіння/валика у вікні вибору пояснені: 1 — найнижче … 5 — найвище', () => {
  for (const [eqId, adjId] of [['eq-02', 'seat'], ['eq-12', 'seat'], ['eq-03', 'seat'], ['eq-21', 'roller'], ['eq-25', 'roller']]) {
    const svg = pickerArt(schemeFor(byId[eqId]), adj(eqId, adjId), 2);
    assert.ok(svg.includes('найнижче') && svg.includes('найвище'), `${eqId}/${adjId}`);
  }
  const hp = pickerArt(schemeFor(byId['eq-03']), adj('eq-03', 'handles-pos'), 1);
  assert.ok(hp.includes('ближче до грудей') && hp.includes('найширше розведені'));
});

test('№22 — хват: три кольорові зони на ручці (зелена, червона, помаранчева), назви з каталогу', () => {
  const grip = adj('eq-22', 'grip');
  const svg = pickerArt(schemeFor(byId['eq-22']), grip, 'red');
  for (const color of ['#2e9d4f', '#d63b3b', '#f08a1c']) assert.ok(svg.includes(color), color);
  for (const label of ['Верх', 'Вигин', 'Низ']) assert.ok(svg.includes(label), label);
  assert.ok(pickOn(svg, 'red') && !pickOn(svg, 'green') && !pickOn(svg, 'orange'));
});

test('ручки блоків (№25, №26): 5 малюнків ручок у вікні вибору, вибрана підсвічена', () => {
  for (const eqId of ['eq-25', 'eq-26']) {
    const handle = adj(eqId, 'handle');
    const svg = pickerArt(schemeFor(byId[eqId]), handle, 'rope');
    for (const hd of HANDLES) assert.ok(svg.includes(`data-handle="${hd.id}"`), `${eqId}: немає малюнка ${hd.id}`);
    assert.ok(pickOn(svg, 'rope') && !pickOn(svg, 'v-bar'), eqId);
  }
});

test('позиції ручок (№14, №21): обидві у вікні вибору; перейменована — нова назва, текст екранується', () => {
  for (const eqId of ['eq-14', 'eq-21']) {
    const eq = renameOption(byId[eqId], 'grip-pos', 'pos-1', 'Широко <зовні>');
    const a = eq.adjustments.find((x) => x.id === 'grip-pos');
    const svg = pickerArt(schemeFor(eq), a, 'pos-1');
    assert.ok(svg.includes('Широко &lt;зовні&gt;'), eqId);
    assert.ok(!svg.includes('<зовні>'), eqId);
    assert.ok(pickOn(svg, 'pos-1') && !pickOn(svg, 'pos-2'), eqId);
  }
});

test('«Прес»: дві вправи — два різні малюнки (ротація і скручування)', () => {
  const sc = schemeFor(byId['eq-15']);
  const rot = sc.art({ exerciseId: 'eq-15-a', mini: false });
  const crunch = sc.art({ exerciseId: 'eq-15-b', mini: false });
  assert.notEqual(rot, crunch);
  assert.match(ariaLabel(rot), /Ротація/);
  assert.match(ariaLabel(crunch), /Скручування/);
});

test('«Метелик»: зведення і відведення рук назад — різні пози, ті самі мітки', () => {
  const sc = schemeFor(byId['eq-03']);
  assert.notEqual(sc.art({ exerciseId: 'eq-03-a' }), sc.art({ exerciseId: 'eq-03-b' }));
  for (const ex of ['eq-03-a', 'eq-03-b']) {
    assert.deepEqual(Object.keys(schemeMarkers(sc, ex)).sort(), ['handles-pos', 'seat']);
  }
});

test('lever-pulldown.js — та сама схема, що в upper.js', () => {
  const sc = schemeFor(byId['eq-21']);
  assert.equal(sc.id, 'lever-pulldown');
  assert.equal(leverPulldownModule.id, 'lever-pulldown');
  assert.equal(leverPulldownModule.art, sc.art);
  assert.match(ariaLabel(sc.art({ exerciseId: 'eq-21-a' })), /вертикальн/i);
  assert.match(ariaLabel(schemeFor(byId['eq-22']).art({ exerciseId: 'eq-22-a' })), /горизонтальн/i);
});

test('гантелі: 12 різних схем, у підписі — назва вправи з каталогу, без регулювань і бейджів', () => {
  const dbs = seed.filter((e) => e.group === 'dumbbells');
  assert.equal(dbs.length, 12);
  const svgs = new Set();
  for (const eq of dbs) {
    const svg = schemeFor(eq).draw({}, eq.adjustments);
    assert.ok(balanced(svg), eq.id);
    assert.ok(ariaLabel(svg).includes(eq.name), `${eq.id}: «${ariaLabel(svg)}» без «${eq.name}»`);
    assert.ok(!svg.includes('data-adj=') && !svg.includes('data-badge'), eq.id);
    svgs.add(svg);
  }
  assert.equal(svgs.size, 12, 'усі 12 малюнків різні');
});

test('усі схеми тренажерів різні (жодна не підмінена іншою)', () => {
  const drawn = visibleMachines.map((eq) => schemeFor(eq).art({ exerciseId: exercises(eq)[0].id, mini: false }));
  assert.equal(new Set(drawn).size, visibleMachines.length);
  const minis = visibleMachines.map((eq) => schemeFor(eq).art({ exerciseId: exercises(eq)[0].id, mini: true }));
  assert.ok(new Set(minis).size >= visibleMachines.length - 1, 'гравітрон може мати один силует на двох');
});
