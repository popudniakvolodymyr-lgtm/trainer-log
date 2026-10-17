// Форми журналу: запис/правка підходу (нижня панель) і вибір значення регулювання.

import { h, sheet, toast, confirmDialog } from './dom.js';
import { validateSet, formatNumber, isLegacyHandsSet } from '../core/model.js';
import { APPROX_TEXT } from '../schemes/index.js';

const REPS = { key: 'reps', label: 'Повторення', step: 1, mode: 'numeric' };

/** Поля за типом ваги (ключі збігаються з validateSet). */
export const SET_FIELDS = {
  single: [REPS, { key: 'weight', label: 'Вага, кг', step: 0.5 }],
  perHand: [REPS,
    { key: 'left', label: 'Л — ліва рука, кг', step: 0.5 },
    { key: 'right', label: 'П — права рука, кг', step: 0.5 }],
  // Жим ногами / гак-машина: одна вага на платформі; «Одна нога» — ще вибір лівої / правої.
  legs: [REPS, { key: 'weight', label: 'Вага, кг', step: 0.5 }],
  bodyweight: [REPS, { key: 'extra', label: 'Додаткова вага, кг (необов\'язково)', step: 0.5 }],
  cardio: [
    { key: 'minutes', label: 'Тривалість, хв', step: 1, mode: 'decimal' },
    { key: 'km', label: 'Дистанція, км (необов\'язково)', step: 0.5 },
    { key: 'kcal', label: 'Калорії, ккал (необов\'язково)', step: 10, mode: 'numeric' },
  ],
};

const asText = (v) => (v === null || v === undefined ? '' : formatNumber(v));

/** Значення поля як число: кома → крапка; не число → null. */
function toNumber(text) {
  const s = String(text).trim().replace(',', '.');
  if (s === '' || !/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return null;
  return Number(s);
}

// Поля ваги, на які діє крок тренажера (model.weightStep).
const STEPPED = new Set(['weight', 'left', 'right']);

/** Найближче кратне кроку (для підстановки в новий підхід). */
const snap = (v, step) => (typeof v === 'number' && step ? Math.round(Math.round(v / step) * step * 100) / 100 : v);

/**
 * Перемикач з кількох кнопок (стилі вкладок вправ). → { el, set(value) }
 * options: [[value, 'Текст'], …]
 */
function segmented(label, options, value, onChange) {
  const buttons = options.map(([v, text]) => h('button', {
    class: 'ex-tab', type: 'button', role: 'radio', dataset: { value: v },
    style: { border: '0', font: 'inherit', cursor: 'pointer' },
    onclick: () => { set(v); onChange(v); },
  }, text));
  function set(v) {
    for (const b of buttons) {
      const on = b.dataset.value === v;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.style.background = on ? '' : 'transparent';
    }
  }
  set(value);
  return { el: h('div', { class: 'ex-switch', role: 'radiogroup', 'aria-label': label }, buttons), set };
}

/**
 * Відкриває панель підходу.
 * opts: { weightMode, step?: 5|2.5|null (крок ваги тренажера), initial: Set|null, title,
 *         onSave(set) → Promise, onDelete?() → Promise, allowAgain? }
 * Підставлені значення — з initial (у новому підході вага — найближче кратне кроку);
 * кнопки ваги −крок/+крок; невірне введення лишається в полях, підказка під полем.
 * weightMode 'legs': перемикач «Дві ноги / Одна нога» (+ «Ліва / Права»); стартовий вибір —
 * як в initial (останній підхід клієнта на цьому тренажері). Правка старого підходу «Л/П»
 * (до перемикача) — у старій формі з двома полями, щоб нічого не загубилось.
 */
export function openSetForm({
  weightMode, step = null, initial: given = null, title, onSave, onDelete = null, allowAgain = false,
}) {
  const isNew = !onDelete;
  const legacyEdit = weightMode === 'legs' && !isNew && isLegacyHandsSet(given);
  const mode = legacyEdit ? 'perHand' : weightMode;
  let initial = given;
  if (mode === 'legs' && isLegacyHandsSet(given)) {
    // Новий підхід після старого «Л/П»: загальна вага на платформі — сума сторін.
    const sum = (Number(given.left) || 0) + (Number(given.right) || 0);
    initial = { reps: given.reps, weight: sum || null, leg: null };
  }
  const fields = (SET_FIELDS[mode] || []).map((f) => (step && STEPPED.has(f.key) ? { ...f, step, snap: true } : f));

  // «Дві ноги» (leg = null) | «Одна нога» + сторона.
  let leg = initial && (initial.leg === 'left' || initial.leg === 'right') ? initial.leg : null;
  let side = leg || 'left';
  let legRows = null;
  if (mode === 'legs') {
    const sideSwitch = segmented('Яка нога', [['left', 'Ліва'], ['right', 'Права']], side, (v) => { side = v; leg = v; });
    const showSide = () => { sideSwitch.el.style.display = leg ? '' : 'none'; };
    const legsSwitch = segmented('Скільки ніг', [['both', 'Дві ноги'], ['one', 'Одна нога']], leg ? 'one' : 'both', (v) => {
      leg = v === 'one' ? side : null;
      showSide();
    });
    showSide();
    legRows = h('div', { class: 'log-field' }, legsSwitch.el, sideSwitch.el);
  }
  const startValue = (f) => {
    if (!initial) return '';
    const v = initial[f.key];
    return asText(isNew && f.snap ? snap(v, step) : v);
  };
  const inputs = {};
  const errors = {};
  let busy = false;

  const rows = fields.map((f) => {
    const input = h('input', {
      class: 'input log-input', type: 'text', id: `f-${f.key}`, name: f.key,
      inputmode: f.mode || 'decimal', autocomplete: 'off', enterkeyhint: 'done',
      value: startValue(f),
    });
    inputs[f.key] = input;
    errors[f.key] = h('p', { class: 'field-error', id: `e-${f.key}`, role: 'alert' });
    input.setAttribute('aria-describedby', `e-${f.key}`);
    input.addEventListener('input', () => { errors[f.key].textContent = ''; input.removeAttribute('aria-invalid'); });
    const bump = (dir) => {
      const cur = toNumber(input.value);
      const base = cur === null ? 0 : cur;
      // З кроком тренажера — до сусіднього кратного (42,5 → +5 → 45).
      const raw = f.snap
        ? (dir > 0 ? Math.floor(base / f.step + 1e-9) + 1 : Math.ceil(base / f.step - 1e-9) - 1) * f.step
        : base + dir * f.step;
      const next = Math.max(0, Math.round(raw * 100) / 100);
      input.value = formatNumber(next);
      errors[f.key].textContent = '';
    };
    return h('div', { class: 'log-field' },
      h('label', { class: 'label', for: `f-${f.key}` }, f.label),
      h('div', { class: 'log-row' },
        h('button', { class: 'btn log-step', type: 'button', 'aria-label': f.snap ? `Менше на ${formatNumber(f.step)} кг` : 'Менше', onclick: () => bump(-1) },
          f.snap ? `−${formatNumber(f.step)}` : '−'),
        input,
        h('button', { class: 'btn log-step', type: 'button', 'aria-label': f.snap ? `Більше на ${formatNumber(f.step)} кг` : 'Більше', onclick: () => bump(1) },
          f.snap ? `+${formatNumber(f.step)}` : '+')),
      mode === 'perHand' && f.key === 'right'
        ? h('button', {
          class: 'btn log-copy', type: 'button',
          onclick: () => { inputs.right.value = inputs.left.value; errors.right.textContent = ''; },
        }, 'П = Л')
        : null,
      errors[f.key]);
  });

  // → Set | null (null — є помилки, вони вже показані під полями)
  function collect() {
    const raw = {};
    for (const f of fields) raw[f.key] = inputs[f.key].value;
    if (mode === 'legs') raw.leg = leg;
    // Правка старого підходу, де вагу не міняли (записано до кроку 5 / 2,5 кг), — не блокуємо.
    const keptOld = !isNew && initial && fields.filter((f) => f.snap)
      .every((f) => toNumber(inputs[f.key].value) === initial[f.key]);
    const res = validateSet(mode, raw, { step: keptOld ? null : step });
    for (const f of fields) {
      const msg = res.ok ? '' : (res.errors[f.key] || '');
      errors[f.key].textContent = msg;
      if (msg) inputs[f.key].setAttribute('aria-invalid', 'true');
      else inputs[f.key].removeAttribute('aria-invalid');
    }
    if (res.ok) return res.set;
    const first = fields.find((f) => res.errors[f.key]);
    if (first) inputs[first.key].focus();
    return null;
  }

  async function submit(again) {
    if (busy) return;
    const set = collect();
    if (!set) return;
    busy = true;
    try {
      await onSave(set);
      if (again) toast('Підхід записано');
      else handle.close();
    } catch (err) {
      console.error(err);
      toast('Не вдалося зберегти. Спробуйте ще раз.');
    } finally {
      busy = false;
    }
  }

  const form = h('form', {
    class: 'form log-form', novalidate: true,
    onsubmit: (e) => { e.preventDefault(); submit(false); },
  },
  legRows,
  rows,
  h('button', { class: 'btn btn-primary btn-big', type: 'submit' }, 'Зберегти'),
  allowAgain
    ? h('button', { class: 'btn btn-big', type: 'button', onclick: () => submit(true) }, 'Зберегти й додати ще підхід')
    : null,
  onDelete
    ? h('button', {
      class: 'btn btn-danger btn-big', type: 'button',
      onclick: async () => {
        if (busy) return;
        const ok = await confirmDialog('Видалити цей підхід?', { ok: 'Видалити', danger: true });
        if (!ok) return;
        busy = true;
        try {
          await onDelete();
          handle.close();
        } catch (err) {
          console.error(err);
          toast('Не вдалося видалити. Спробуйте ще раз.');
        } finally {
          busy = false;
        }
      },
    }, 'Видалити підхід')
    : null);

  const handle = sheet(form, { title });
  return handle;
}

/**
 * Вибір значення регулювання.
 * opts: { adjustment, current, onChoose(value) → Promise, onClear?() → Promise }
 * positions → кнопки 1..count; options → список варіантів (з кольором, якщо є).
 */
export function openSettingPicker({ adjustment, current, onChoose, onClear = null }) {
  const choose = async (value) => {
    try {
      await onChoose(value);
      handle.close();
    } catch (err) {
      console.error(err);
      toast('Не вдалося зберегти. Спробуйте ще раз.');
    }
  };
  let list;
  if (adjustment.kind === 'options') {
    list = h('div', { class: 'pick-list' }, (adjustment.options || []).map((o) => h('button', {
      class: `btn pick-option${current === o.id ? ' is-active' : ''}`, type: 'button',
      'aria-pressed': current === o.id ? 'true' : 'false', onclick: () => choose(o.id),
    }, o.color ? h('span', { class: 'swatch', style: { background: o.color } }) : null, o.label)));
  } else {
    const count = Number(adjustment.count) || 0;
    list = h('div', { class: 'pick-grid' }, Array.from({ length: count }, (_, i) => i + 1).map((n) => h('button', {
      class: `btn pick-pos${Number(current) === n ? ' is-active' : ''}`, type: 'button',
      'aria-pressed': Number(current) === n ? 'true' : 'false', onclick: () => choose(n),
    }, String(n))));
  }
  const body = h('div', { class: 'stack' },
    adjustment.approx || adjustment.unknown ? h('p', { class: 'approx-note' }, APPROX_TEXT) : null,
    list,
    onClear && current !== undefined && current !== null && current !== ''
      ? h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          try { await onClear(); handle.close(); } catch (err) { console.error(err); toast('Не вдалося зберегти. Спробуйте ще раз.'); }
        },
      }, 'Скинути значення')
      : null);
  const handle = sheet(body, { title: adjustment.label });
  return handle;
}
