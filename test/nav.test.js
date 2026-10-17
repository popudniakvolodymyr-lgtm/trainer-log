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

// --- Нижня панель і системне «назад» (F3) ---------------------------------------------
import { createSheetSteps } from '../src/ui/dom.js';

/** Підроблена історія: back() асинхронний, як у браузері, і викликає onPop. */
function fakeHistory(initial) {
  const entries = [initial];
  let i = 0;
  const h = {
    backs: 0,
    onPop: () => {},
    get state() { return entries[i]; },
    get length() { return entries.length; },
    get index() { return i; },
    pushState(st) { entries.splice(i + 1); entries.push(st); i++; },
    replaceState(st) { entries[i] = st; },
    back() { h.backs++; setTimeout(() => { if (i > 0) { i--; h.onPop(); } }, 0); },
    navigate() { entries.splice(i + 1); entries.push(null); i++; }, // новий маршрут (location.hash = …)
    entries,
  };
  return h;
}
const tick = () => new Promise((r) => setTimeout(r, 5));
const CARD = { prev: '#/clients', menu: { clientId: 'c1', scrollY: 300, query: 'жим' }, view: { clientId: 'c1', tab: 'calendar' } };

test('відкрита панель кладе крок історії, не затираючи menu/view; системне «назад» закриває лише панель', async () => {
  const hist = fakeHistory(CARD);
  const steps = createSheetSteps({ history: hist });
  hist.onPop = steps.onPop;
  let dismissed = 0;
  steps.open(() => { dismissed++; });
  await tick();
  assert.equal(hist.length, 2, 'новий крок');
  assert.deepEqual({ ...hist.state, sheet: undefined }, { ...CARD, sheet: undefined }, 'menu, view, prev на місці');
  assert.ok(hist.state.sheet);
  hist.back(); // системне «назад»
  await tick();
  assert.equal(dismissed, 1, 'панель закрилась');
  assert.equal(hist.index, 0);
  assert.deepEqual(hist.state, CARD, 'місце меню і вкладка картки — як були');
});

test('закриття панелі (хрестик/фон/«Зберегти») прибирає її крок; зміни стану за цей час не губляться', async () => {
  const hist = fakeHistory(CARD);
  const steps = createSheetSteps({ history: hist });
  hist.onPop = steps.onPop;
  let dismissed = 0;
  const step = steps.open(() => { dismissed++; });
  await tick();
  hist.replaceState({ ...hist.state, view: { clientId: 'c1', tab: 'today' } });
  step.close();
  await steps.settled();
  assert.equal(hist.backs, 1);
  assert.equal(hist.index, 0, 'крок панелі прибрано');
  assert.equal(dismissed, 0, 'сама закрилась — не «відпускають» вдруге');
  assert.equal(hist.state.sheet, undefined);
  assert.deepEqual(hist.state.view, { clientId: 'c1', tab: 'today' });
  assert.deepEqual(hist.state.menu, CARD.menu);
});

test('дві панелі одна над одною: «назад» закриває лише верхню', async () => {
  const hist = fakeHistory(CARD);
  const steps = createSheetSteps({ history: hist });
  hist.onPop = steps.onPop;
  const closed = [];
  steps.open(() => closed.push('a'));
  await tick();
  steps.open(() => closed.push('b'));
  await tick();
  assert.equal(hist.length, 3);
  hist.back();
  await tick();
  assert.deepEqual(closed, ['b']);
  hist.back();
  await tick();
  assert.deepEqual(closed, ['b', 'a']);
  assert.deepEqual(hist.state, CARD);
});

test('зміна маршруту закриває панелі; повернення на її старий крок проскакує його', async () => {
  const hist = fakeHistory(CARD);
  const steps = createSheetSteps({ history: hist });
  hist.onPop = steps.onPop;
  let dismissed = 0;
  steps.open(() => { dismissed++; });
  await tick();
  hist.navigate();
  steps.onRoute();
  assert.equal(dismissed, 1, 'панель закрита зміною маршруту');
  hist.back(); // з нового екрана назад — на крок панелі, якої вже нема
  await tick();
  await steps.settled();
  assert.equal(hist.index, 0, 'порожній крок панелі проскочено');
  assert.deepEqual(hist.state, CARD);
});

test('нова панель одразу після закриття попередньої кладе крок уже після її «назад»', async () => {
  const hist = fakeHistory(CARD);
  const steps = createSheetSteps({ history: hist });
  hist.onPop = steps.onPop;
  const a = steps.open(() => {});
  await tick();
  a.close();
  let dismissedB = 0;
  steps.open(() => { dismissedB++; });
  await tick();
  await tick();
  assert.equal(dismissedB, 0, 'друга панель не закрита «назад» першої');
  assert.equal(hist.index, 1);
  assert.equal(hist.length, 2);
  assert.equal(hist.state.sheet, 1);
});
