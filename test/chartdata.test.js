import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartSeries } from '../src/core/chartdata.js';

// Очікування пораховано вручну з прикладів нижче, не з коду під тестом.
const day = (y, m, d) => Date.UTC(y, m - 1, d);
const session = (date, sets, extra = {}) => ({
  id: `s-${date}`, clientId: 'c1', equipmentId: 'e1', exerciseId: 'x1', date, sets, updatedAt: 1, ...extra,
});

test('одна вага: кожен підхід — окрема точка, підписана повтореннями', () => {
  const res = chartSeries('single', [
    session('2026-10-17', [{ reps: 12, weight: 45 }, { reps: 10, weight: 50 }]),
    session('2026-10-10', [{ reps: 10, weight: 40 }]),
  ]);
  assert.equal(res.yUnit, 'кг');
  assert.equal(res.series.length, 1);
  const pts = res.series[0].points;
  assert.deepEqual(pts.map((p) => p.y), [40, 45, 50]); // від старих до нових
  assert.deepEqual(pts.map((p) => p.t), [day(2026, 10, 10), day(2026, 10, 17), day(2026, 10, 17)]);
  assert.deepEqual(pts.map((p) => p.label), ['×10', '×12', '×10']);
});

test('жодних обчислених «робочих» значень: три підходи → рівно три точки в одній серії', () => {
  const res = chartSeries('single', [
    session('2026-10-17', [{ reps: 10, weight: 40 }, { reps: 10, weight: 40 }, { reps: 8, weight: 60 }]),
  ]);
  assert.equal(res.series.length, 1);
  assert.equal(res.series[0].points.length, 3);
  assert.deepEqual(res.series[0].points.map((p) => p.y), [40, 40, 60]);
});

test('Л/П: дві серії різних кольорів, ліва й права вага окремо', () => {
  const res = chartSeries('perHand', [
    session('2026-10-17', [{ reps: 10, left: 20, right: 22.5 }]),
    session('2026-10-10', [{ reps: 8, left: 17.5, right: 20 }]),
  ]);
  assert.equal(res.yUnit, 'кг');
  assert.equal(res.series.length, 2);
  const [l, r] = res.series;
  assert.equal(l.key, 'left');
  assert.equal(r.key, 'right');
  assert.notEqual(l.color, r.color);
  assert.deepEqual(l.points.map((p) => p.y), [17.5, 20]);
  assert.deepEqual(r.points.map((p) => p.y), [20, 22.5]);
  assert.match(l.label, /Л/);
  assert.match(r.label, /П/);
});

test('турнік без ваги — серія повторень', () => {
  const res = chartSeries('bodyweight', [
    session('2026-10-10', [{ reps: 8, extra: null }]),
    session('2026-10-17', [{ reps: 10, extra: null }, { reps: 9, extra: null }]),
  ]);
  assert.equal(res.yUnit, 'повт.');
  assert.equal(res.series.length, 1);
  assert.deepEqual(res.series[0].points.map((p) => p.y), [8, 10, 9]);
});

test('турнік із додатковою вагою — вага по вертикалі, повторення підписом', () => {
  const res = chartSeries('bodyweight', [
    session('2026-10-10', [{ reps: 8, extra: null }]),
    session('2026-10-17', [{ reps: 6, extra: 7.5 }]),
  ]);
  assert.equal(res.yUnit, 'кг');
  assert.deepEqual(res.series[0].points.map((p) => p.y), [0, 7.5]);
  assert.deepEqual(res.series[0].points.map((p) => p.label), ['×8', '×6']);
});

test('кардіо: тривалість і дистанція — дві серії; підхід без км не дає точки дистанції', () => {
  const res = chartSeries('cardio', [
    session('2026-10-10', [{ minutes: 20, km: null, kcal: null }]),
    session('2026-10-17', [{ minutes: 30, km: 5, kcal: 250 }]),
  ]);
  assert.equal(res.series.length, 2);
  const [min, km] = res.series;
  assert.equal(min.key, 'minutes');
  assert.equal(min.unit, 'хв');
  assert.deepEqual(min.points.map((p) => p.y), [20, 30]);
  assert.equal(km.key, 'km');
  assert.equal(km.unit, 'км');
  assert.deepEqual(km.points.map((p) => p.y), [5]);
  assert.deepEqual(km.points.map((p) => p.t), [day(2026, 10, 17)]);
});

test('порожньо: немає сесій або всі видалені → жодної серії', () => {
  assert.deepEqual(chartSeries('single', []).series, []);
  const del = session('2026-10-17', [{ reps: 10, weight: 40 }], { deleted: true });
  assert.deepEqual(chartSeries('single', [del]).series, []);
  assert.deepEqual(chartSeries('single', [session('2026-10-17', [])]).series, []);
});

// --- дві ноги / одна нога (spec «Правки, третя черга» W2) --------------------

test('legs: дві ноги — одна серія загальної ваги', () => {
  const res = chartSeries('legs', [
    session('2026-10-17', [{ reps: 10, weight: 120, leg: null }, { reps: 8, weight: 130, leg: null }]),
    session('2026-10-10', [{ reps: 10, weight: 110, leg: null }]),
  ]);
  assert.equal(res.yUnit, 'кг');
  assert.equal(res.series.length, 1);
  assert.deepEqual(res.series[0].points.map((p) => p.y), [110, 120, 130]);
  assert.deepEqual(res.series[0].points.map((p) => p.label), ['×10', '×10', '×8']);
});

test('legs: одна нога — ліва й права окремими серіями своїх кольорів, поруч з двома ногами', () => {
  const res = chartSeries('legs', [
    session('2026-10-17', [
      { reps: 10, weight: 120, leg: null },
      { reps: 10, weight: 60, leg: 'left' },
      { reps: 10, weight: 62.5, leg: 'right' },
      { reps: 8, weight: 65, leg: 'left' },
    ]),
  ]);
  assert.equal(res.series.length, 3);
  const both = res.series.find((s) => s.points.some((p) => p.y === 120));
  const left = res.series.find((s) => /ліва нога/.test(s.label));
  const right = res.series.find((s) => /права нога/.test(s.label));
  assert.ok(both && left && right);
  assert.deepEqual(both.points.map((p) => p.y), [120]);
  assert.deepEqual(left.points.map((p) => p.y), [60, 65]);
  assert.deepEqual(right.points.map((p) => p.y), [62.5]);
  assert.equal(new Set(res.series.map((s) => s.color)).size, 3, 'три різні кольори');
  assert.equal(new Set(res.series.map((s) => s.key)).size, 3);
});

test('legs: старі записи Л/П на цих тренажерах — як були (дві серії Л і П)', () => {
  const res = chartSeries('legs', [
    session('2026-10-10', [{ reps: 8, left: 17.5, right: 20 }]),
    session('2026-10-17', [{ reps: 10, weight: 120, leg: null }]),
  ]);
  const l = res.series.find((s) => s.key === 'left');
  const r = res.series.find((s) => s.key === 'right');
  assert.deepEqual(l.points.map((p) => p.y), [17.5]);
  assert.deepEqual(r.points.map((p) => p.y), [20]);
  assert.match(l.label, /Л/);
  assert.match(r.label, /П/);
  const both = res.series.find((s) => s.key !== 'left' && s.key !== 'right');
  assert.deepEqual(both.points.map((p) => p.y), [120]);
  assert.equal(res.series.length, 3);
});
