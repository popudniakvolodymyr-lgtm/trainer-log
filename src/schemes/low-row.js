// Тяга нижнього (горизонтального) блоку, SHUA, eq-26 — за фото gym/my-photos/tyaga-nyzhnoho-bloku.png,
// ракурс ¾ (новий контракт art/MARKERS/PICKERS): стійка з вагою попереду, довга лава, упор для ніг,
// нижній блок і трос до ручки. Регулювань немає — лише «Ручка» на карабіні (5 ручок, спільні для
// всіх блокових тяг; малюнки — у вікні вибору).

import {
  P3, scene3d, renderScene, artModule, beam, box, disc, tube, tower, cable, floorShadow, human, handlePicker,
} from './upper.js';

export const id = 'low-row';
export const ADJUSTMENTS = ['handle'];
export const HINTS = {};
export const PICKERS = { handle: handlePicker };

const FR = P3.frame;

function build(exerciseId, mini) {
  const S = scene3d({ yaw: 60, pitch: 22, mini });
  floorShadow(S, 0, 30, 60, 112);
  tower(S, [-30, 98, 0], [30, 130, 186]);
  // довга основа-лава
  beam(S, [0, -66, 4], [0, 98, 4], 11, 8, FR);
  beam(S, [-22, -64, 3], [22, -64, 3], 8, 6, FR);
  for (const y of [-48, 8]) beam(S, [0, y, 4], [0, y, 38], 8, 8, FR);
  box(S, [-16, -58, 39], [16, 18, 47], P3.padShua);
  // упор для ніг і нижній блок
  beam(S, [0, 56, 6], [0, 64, 44], 40, 4, P3.rubber);
  box(S, [-8, 86, 4], [8, 98, 26], FR);
  disc(S, [0, 92, 16], [1, 0, 0], 6.5, P3.metal, { thick: 3 });
  cable(S, [0, 90, 16], [0, 36, 80]);
  tube(S, [[-7, 28, 80], [0, 36, 80], [7, 28, 80]], 3.2, P3.metal);
  S.mark('handle', [0, 36, 80]);
  human(S, {
    pelvis: [0, -14, 56], lean: -0.05,
    hand: (s) => [s * 7, 27, 80],
    elbowPole: (s) => [s * 0.6, -1, -0.2],
    ankle: (s) => [s * 12, 50, 24], kneePole: () => [0, 0, 1], toe: () => [0, 0.35, 1],
  });
  return renderScene(S, 'Тяга горизонтального блоку: сидячи на лаві, стопи в упорі — ручку до живота');
}

const mod = artModule({ id, ADJUSTMENTS, HINTS, PICKERS, build });
export const art = mod.art;
export const MARKERS = mod.MARKERS;
