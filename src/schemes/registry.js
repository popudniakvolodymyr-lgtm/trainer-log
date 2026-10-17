// Реєстр схем: schemeId тренажера → модуль схеми.
// Модуль схеми: { id, ADJUSTMENTS?: [adjustmentId], HINTS?, draw(values, adjustments) → SVG-рядок,
//                 optionIcon?(adjustment, optionId) → SVG-рядок }.
// Схеми підтягуються зі збірок: upper.js (груди, спина, плечі, руки, прес, гантелі — таск 06)
// і legs.js (ноги — таск 07). Модуль зі збірки з тим самим id замінює вбудований.
// schemeId з каталогу без модуля → заглушка (schemeFor → null).

import * as butterfly from './butterfly.js';
import * as leverPulldown from './lever-pulldown.js';
import * as lowRow from './low-row.js';
import { SCHEMES as UPPER } from './upper.js';
import { SCHEMES as LEGS } from './legs.js';

const BUILT_IN = {
  butterfly,
  'low-row': lowRow,
  // Три хвати (зелена/червона/помаранчева) і сидіння тепер на №22 «Горизонтальна тяга» (lever-row).
  // Тимчасово — стара схема; таск 06 малює горизонтальну тягу в upper.js під цим id.
  'lever-row': leverPulldown,
};

function build() {
  const out = { ...BUILT_IN };
  for (const mod of [...(UPPER || []), ...(LEGS || [])]) {
    if (mod && typeof mod.id === 'string' && typeof mod.draw === 'function') out[mod.id] = mod;
  }
  return Object.freeze(out);
}

export const SCHEMES = build();

/** Модуль схеми тренажера або null (немає схеми → заглушка). */
export function schemeFor(equipment) {
  const sid = equipment && equipment.schemeId;
  return sid && Object.hasOwn(SCHEMES, sid) ? SCHEMES[sid] : null;
}
