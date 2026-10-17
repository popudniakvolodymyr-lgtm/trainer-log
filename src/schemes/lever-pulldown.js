// Вертикальна тяга (важільна, на дисках, SHUA, eq-21) — тяга зверху вниз:
// позиція ручки (2 варіанти) і притискний валік (5, ⚠ приблизно).
// Сама схема (новий контракт art/MARKERS/PICKERS, ракурс ¾) намальована в upper.js;
// цей модуль лише віддає її під старою адресою. Три кольорові хвати — на №22 (lever-row, upper.js).

import { leverPulldown } from './upper.js';

export const id = leverPulldown.id;
export const ADJUSTMENTS = leverPulldown.ADJUSTMENTS;
export const HINTS = leverPulldown.HINTS;
export const art = leverPulldown.art;
export const MARKERS = leverPulldown.MARKERS;
export const PICKERS = leverPulldown.PICKERS;
