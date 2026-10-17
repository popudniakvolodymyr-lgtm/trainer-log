// Дані для графіка: кожен підхід — окрема точка, без жодних обчислених значень
// («робочу вагу» програма не рахує). Чистий модуль: без DOM.
//
// chartSeries(weightMode, sessions) →
//   { series: [{ key, label, unit, color, points: [{ t, y, label, n }] }], yUnit }
//   t — початок дня (UTC, мс), y — значення, label — підпис точки (повторення: '×10'),
//   n — номер підходу в дні (з 1). Порожні серії не повертаються.

export const COLORS = Object.freeze({ primary: '#2f80ed', secondary: '#f2994a' });

/** 'YYYY-MM-DD' → мс початку дня (UTC); null, якщо дата не схожа на дату. */
export function dateToT(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Підходи в порядку часу: [{t, n, set}], сесії від старих до нових. */
function flatten(sessions) {
  const list = (sessions || [])
    .filter((s) => s && !s.deleted && dateToT(s.date) !== null && Array.isArray(s.sets))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.updatedAt || 0) - (b.updatedAt || 0)));
  const out = [];
  for (const s of list) {
    s.sets.forEach((set, i) => out.push({ t: dateToT(s.date), n: i + 1, set }));
  }
  return out;
}

const repsLabel = (set) => `×${set.reps}`;

function makeSeries(key, label, unit, color, points) {
  return { key, label, unit, color, points };
}

export function chartSeries(weightMode, sessions) {
  const sets = flatten(sessions);
  const nonEmpty = (list) => list.filter((s) => s.points.length > 0);

  switch (weightMode) {
    case 'single': {
      const pts = sets.filter((x) => isNum(x.set.weight))
        .map((x) => ({ t: x.t, y: x.set.weight, label: repsLabel(x.set), n: x.n }));
      return { series: nonEmpty([makeSeries('weight', 'Вага, кг', 'кг', COLORS.primary, pts)]), yUnit: 'кг' };
    }
    case 'perHand': {
      const side = (key) => sets.filter((x) => isNum(x.set[key]))
        .map((x) => ({ t: x.t, y: x.set[key], label: repsLabel(x.set), n: x.n }));
      return {
        series: nonEmpty([
          makeSeries('left', 'Л — ліва рука', 'кг', COLORS.primary, side('left')),
          makeSeries('right', 'П — права рука', 'кг', COLORS.secondary, side('right')),
        ]),
        yUnit: 'кг',
      };
    }
    case 'bodyweight': {
      const withExtra = sets.some((x) => isNum(x.set.extra) && x.set.extra > 0);
      if (withExtra) {
        const pts = sets.map((x) => ({ t: x.t, y: isNum(x.set.extra) ? x.set.extra : 0, label: repsLabel(x.set), n: x.n }));
        return {
          series: nonEmpty([makeSeries('extra', 'Додаткова вага, кг', 'кг', COLORS.primary, pts)]),
          yUnit: 'кг',
        };
      }
      const pts = sets.map((x) => ({ t: x.t, y: x.set.reps, label: '', n: x.n }));
      return {
        series: nonEmpty([makeSeries('reps', 'Повторення', 'повт.', COLORS.primary, pts)]),
        yUnit: 'повт.',
      };
    }
    case 'cardio': {
      const minutes = sets.filter((x) => isNum(x.set.minutes))
        .map((x) => ({ t: x.t, y: x.set.minutes, label: '', n: x.n }));
      const km = sets.filter((x) => isNum(x.set.km))
        .map((x) => ({ t: x.t, y: x.set.km, label: '', n: x.n }));
      return {
        series: nonEmpty([
          makeSeries('minutes', 'Тривалість, хв', 'хв', COLORS.primary, minutes),
          makeSeries('km', 'Дистанція, км', 'км', COLORS.secondary, km),
        ]),
        yUnit: 'хв / км',
      };
    }
    default:
      return { series: [], yUnit: '' };
  }
}
