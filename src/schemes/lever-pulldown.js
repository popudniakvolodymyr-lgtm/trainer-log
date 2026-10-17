// Вертикальна тяга (важільна, на дисках, SHUA, eq-21) — тяга зверху вниз:
// позиція ручки (2 варіанти) і притискний валік (5, ⚠ приблизно).
// Сама схема намальована в upper.js (там спільні цеглинки схем верхньої частини тіла);
// цей модуль лише віддає її під старою адресою. Три кольорові хвати — на №22 (lever-row, upper.js).

import { leverPulldown } from './upper.js';

export const id = leverPulldown.id;
export const ADJUSTMENTS = leverPulldown.ADJUSTMENTS;
export const HINTS = leverPulldown.HINTS;
export const draw = leverPulldown.draw;
export const optionIcon = leverPulldown.optionIcon;
