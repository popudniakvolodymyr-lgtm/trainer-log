// Навігація «назад» (spec «Правки, друга черга» Q5): з екрана тренажера — у меню картки клієнта.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backTarget, backStep, isTabSwitch, homeFor } from '../src/app.js';

const trainer = { role: 'trainer' };
const client = { role: 'client', clientId: 'c1' };

test('з екрана тренажера (будь-яка вкладка) ціль «назад» — меню картки клієнта', () => {
  assert.equal(backTarget('#/client/c1/eq/eq-cardio', trainer), '#/client/c1');
  assert.equal(backTarget('#/client/c1/eq/eq-cardio/eq-cardio-b', trainer), '#/client/c1');
  assert.equal(backTarget('#/client/c1/eq/eq-cardio/eq-cardio-c', client), '#/client/c1');
  assert.equal(backTarget('#/client/c%20x/eq/eq-03/eq-03-b', trainer), '#/client/c%20x');
});

test('з картки клієнта тренер іде до списку; з інших екранів ціль не задана', () => {
  assert.equal(backTarget('#/client/c1', trainer), '#/clients');
  assert.equal(backTarget('#/client/c1', client), null, 'для клієнта картка — головний екран');
  assert.equal(backTarget('#/settings', trainer), null);
  assert.equal(backTarget('#/щось', trainer), null);
});

test('стрілка: якщо попередній крок історії — меню картки, то history.back, інакше заміна на меню', () => {
  const ex = '#/client/c1/eq/eq-cardio/eq-cardio-c';
  assert.deepEqual(backStep(ex, trainer, '#/client/c1'), { back: true });
  // зайшли за посиланням прямо на тренажер — історії немає, замінюємо на меню (не новий крок)
  assert.deepEqual(backStep(ex, trainer, null), { replace: '#/client/c1' });
  assert.deepEqual(backStep(ex, trainer, '#/settings'), { replace: '#/client/c1' });
  // екрани без своєї цілі — звичайний крок назад або домівка
  assert.deepEqual(backStep('#/settings', trainer, '#/client/c1/eq/eq-03'), { back: true });
  assert.deepEqual(backStep('#/settings', trainer, null), { replace: homeFor(trainer) });
});

test('перемикання вкладок — та сама картка й тренажер, інша вправа; інше — новий крок', () => {
  assert.equal(isTabSwitch('#/client/c1/eq/eq-cardio', '#/client/c1/eq/eq-cardio/eq-cardio-b'), true);
  assert.equal(isTabSwitch('#/client/c1/eq/eq-cardio/eq-cardio-b', '#/client/c1/eq/eq-cardio/eq-cardio-c'), true);
  assert.equal(isTabSwitch('#/client/c1/eq/eq-cardio/eq-cardio-b', '#/client/c1/eq/eq-03/eq-03-a'), false);
  assert.equal(isTabSwitch('#/client/c1/eq/eq-03', '#/client/c2/eq/eq-03/eq-03-b'), false);
  assert.equal(isTabSwitch('#/client/c1', '#/client/c1/eq/eq-03'), false);
});
