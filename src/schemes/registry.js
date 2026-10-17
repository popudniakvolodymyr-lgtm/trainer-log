// Реєстр схем: schemeId тренажера → модуль схеми.
// Модуль схеми: { id, ADJUSTMENTS: [adjustmentId], HINTS, draw(values, adjustments) → SVG-рядок,
//                 optionIcon?(adjustment, optionId) → SVG-рядок }.

import * as butterfly from './butterfly.js';
import * as leverPulldown from './lever-pulldown.js';
import * as lowRow from './low-row.js';

export const SCHEMES = Object.freeze({
  butterfly,
  'lever-pulldown': leverPulldown,
  'low-row': lowRow,
});

/** Модуль схеми тренажера або null (немає схеми → заглушка). */
export function schemeFor(equipment) {
  const sid = equipment && equipment.schemeId;
  return sid && Object.hasOwn(SCHEMES, sid) ? SCHEMES[sid] : null;
}
