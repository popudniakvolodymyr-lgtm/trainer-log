// Реєстр схем: schemeId тренажера → модуль схеми.
// Модуль схеми — один із двох контрактів (повний опис — src/schemes/index.js):
//   новий: { id, ADJUSTMENTS?, HINTS?, art({exerciseId, mini}) → SVG-рядок,
//            MARKERS: {[adjustmentId]: {x, y}} | (exerciseId) → {…}, PICKERS?: {[adjustmentId]: (value, adjustment) → SVG} }
//   старий: { id, ADJUSTMENTS?, HINTS?, draw(values, adjustments) → SVG-рядок, optionIcon?(adjustment, optionId) }
// Якщо модуль має art, рендер бере art (draw ігнорується).
// Схеми підтягуються зі збірок: upper.js (груди, спина, плечі, руки, прес, гантелі), legs.js (ноги)
// і cardio.js (кардіо). Модуль зі збірки з тим самим id замінює вбудований.
// schemeId з каталогу без модуля → заглушка (schemeFor → null).

import * as butterfly from './butterfly.js';
import * as leverPulldown from './lever-pulldown.js';
import * as lowRow from './low-row.js';
import { SCHEMES as UPPER } from './upper.js';
import { SCHEMES as LEGS } from './legs.js';
import { SCHEMES as CARDIO } from './cardio.js';

const BUILT_IN = {
  butterfly,
  'low-row': lowRow,
  // Три хвати (зелена/червона/помаранчева) і сидіння тепер на №22 «Горизонтальна тяга» (lever-row).
  // Тимчасово — стара схема; таск 06 малює горизонтальну тягу в upper.js під цим id.
  'lever-row': leverPulldown,
};

/** Чи це модуль схеми (новий контракт з art або старий з draw). */
export function isSchemeModule(mod) {
  return !!mod && typeof mod.id === 'string' && mod.id !== ''
    && (typeof mod.art === 'function' || typeof mod.draw === 'function');
}

function build() {
  const out = { ...BUILT_IN };
  for (const mod of [...(UPPER || []), ...(LEGS || []), ...(CARDIO || [])]) {
    if (isSchemeModule(mod)) out[mod.id] = mod;
  }
  return Object.freeze(out);
}

export const SCHEMES = build();

/** Модуль схеми тренажера або null (немає схеми → заглушка). */
export function schemeFor(equipment) {
  const sid = equipment && equipment.schemeId;
  return sid && Object.hasOwn(SCHEMES, sid) ? SCHEMES[sid] : null;
}
