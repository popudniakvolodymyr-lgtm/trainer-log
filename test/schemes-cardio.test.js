import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedEquipment } from '../src/core/catalog.js';
import { SCHEMES as CARDIO } from '../src/schemes/cardio.js';
import { schemeFor } from '../src/schemes/registry.js';
import { schemeSvg, schemeMarkers, equipmentIcon } from '../src/schemes/index.js';

// Очікування — зі spec.md («Правки, друга черга» Q8) та interfaces.md (кардіо: eq-cardio-a доріжка,
// -b велотренажер, -c еліпс; регулювань немає).
const eq = seedEquipment().find((e) => e.id === 'eq-cardio');
const EXERCISES = ['eq-cardio-a', 'eq-cardio-b', 'eq-cardio-c'];

test('кардіо: модуль cardio у збірці й у реєстрі', () => {
  assert.equal(eq.schemeId, 'cardio');
  assert.deepEqual(CARDIO.map((m) => m.id), ['cardio']);
  assert.equal(schemeFor(eq), CARDIO[0]);
  assert.equal(typeof CARDIO[0].art, 'function');
  assert.deepEqual(eq.exercises.map((x) => x.id), EXERCISES);
});

test('кардіо: три різні малюнки за вправою, з людиною, без тексту й міток', () => {
  const m = CARDIO[0];
  const arts = EXERCISES.map((ex) => m.art({ exerciseId: ex, mini: false }));
  assert.equal(new Set(arts).size, 3, 'доріжка, велотренажер і еліпс різні');
  for (const [i, svg] of arts.entries()) {
    assert.match(svg, /^<svg[^>]*viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?"[\s\S]*<\/svg>$/, EXERCISES[i]);
    assert.ok(!/NaN|undefined|null/.test(svg), EXERCISES[i]);
    assert.ok(!/<text[\s>]/.test(svg), `${EXERCISES[i]}: без тексту`);
    assert.ok(svg.includes('class="sc-person"'), `${EXERCISES[i]}: людина на тренажері`);
    for (const id of [...svg.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1])) {
      assert.ok(id.startsWith('cardio-') && !id.endsWith('-mini'), `id ${id}`);
    }
    assert.deepEqual(schemeMarkers(m, EXERCISES[i]), {}, 'регулювань немає — міток немає');
    assert.ok(!schemeSvg(m, eq, EXERCISES[i], {}).includes('data-marker'));
  }
});

test('кардіо: міні-силуети — свої для кожної вправи, без людини; значок меню — силует першої', () => {
  const m = CARDIO[0];
  const minis = EXERCISES.map((ex) => m.art({ exerciseId: ex, mini: true }));
  assert.equal(new Set(minis).size, 3);
  for (const svg of minis) {
    assert.match(svg, /^<svg[\s>][\s\S]*<\/svg>$/);
    assert.ok(!svg.includes('sc-person'));
    for (const id of [...svg.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1])) {
      assert.ok(id.startsWith('cardio-') && id.endsWith('-mini'), `id ${id}`);
    }
  }
  assert.equal(equipmentIcon(eq), minis[0]);
  // невідома вправа (тренер додав свою) — не падає, малює доріжку
  assert.equal(m.art({ exerciseId: 'eq-cardio-x', mini: false }), m.art({ exerciseId: 'eq-cardio-a', mini: false }));
});
