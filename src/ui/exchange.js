// Обмін файлом тренер ↔ клієнт і резервна копія: кнопки, діалоги, плашка нагадування.
//
// sendToTrainer(ctx), sendToClient(ctx, clientId), saveBackup(ctx) — файл у меню «Поділитися» / завантаження.
// openFile(ctx, {expect, title}) — вибір файлу, перевірка, питання (картка / перехід), злиття, підсумок.
// sendButton(ctx, clientId) → кнопка «Надіслати тренеру» | «Надіслати клієнту».
// backupBanner(ctx) → Promise<Node|null> — «Давно не зберігали копію».

import { h, toast, sheet, confirmDialog } from './dom.js';
import { shareFile, pickFile, downloadFile } from '../share.js';
import {
  buildPackage, parsePackage, planImport, applyImport, selectForClient, selectForTrainer, selectBackup,
  backupDue, summaryText, exchangeFileName,
} from '../core/sync.js';
import { formatDate, today } from '../core/model.js';

const homeFor = (meta) => {
  if (meta.role === 'trainer') return '#/clients';
  if (meta.role === 'client' && meta.clientId) return `#/client/${meta.clientId}`;
  return '#/start';
};

let busy = false;
/** Не дає запустити дві дії обміну одночасно (подвійний натиск). */
async function once(fn) {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    const own = err && /[А-Яа-яІіЇїЄєҐґ]/.test(err.message || '');
    showMessage('Не вийшло', own ? err.message : 'Щось пішло не так. Ваші дані не змінено.');
  } finally {
    busy = false;
  }
}

function showMessage(title, text, extra = null) {
  return sheet((close) => h('div', { class: 'stack' },
    h('p', { class: 'exchange-message' }, text),
    extra,
    h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: close }, 'Зрозуміло')), { title });
}

/** Ділиться файлом; підказує, якщо файл лише завантажено. → результат shareFile */
async function deliver(filename, text, { hint, title }) {
  const done = (res) => {
    if (res === 'shared') toast('Готово');
    if (res === 'downloaded') {
      showMessage(title, `Файл «${filename}» збережено в «Завантаження». ${hint}`);
    }
    return res;
  };
  const res = await shareFile(filename, text);
  if (res !== 'blocked') return done(res);
  // Браузер просить ще один натиск — файл уже готовий.
  return new Promise((resolve) => {
    let result = 'cancelled';
    const s = sheet((close) => h('div', { class: 'stack' },
      h('p', null, 'Файл готовий.'),
      h('button', {
        class: 'btn btn-primary btn-big', type: 'button',
        onclick: async () => {
          result = await shareFile(filename, text);
          if (result === 'blocked') {
            downloadFile(filename, text);
            result = 'downloaded';
          }
          close();
        },
      }, 'Поділитися файлом')), { title });
    s.closed.then(() => resolve(done(result)));
  });
}

const sendHint = (to) => `Надішліть його ${to} в Telegram або Viber: скріпка → «Файл» → виберіть цей файл.`;

/** Клієнт → тренер: свої записи й налаштування. */
export function sendToTrainer(ctx) {
  return once(async () => {
    const state = await ctx.store.snapshot();
    const data = selectForTrainer(state);
    if (!data.clients.length) throw new Error('Немає вашої картки. Почніть з «Я клієнт».');
    const text = JSON.stringify(buildPackage('client-to-trainer', data, state.meta));
    await deliver(exchangeFileName(data.clients[0].name), text, {
      title: 'Надіслати тренеру', hint: sendHint('тренеру'),
    });
  });
}

/** Тренер → клієнт: картка клієнта, його записи й налаштування, поточний каталог тренажерів. */
export function sendToClient(ctx, clientId) {
  return once(async () => {
    const state = await ctx.store.snapshot();
    const data = selectForClient(state, clientId);
    if (!data.clients.length || data.clients[0].deleted) throw new Error('Клієнта не знайдено.');
    const text = JSON.stringify(buildPackage('trainer-to-client', data, state.meta));
    await deliver(exchangeFileName(data.clients[0].name), text, {
      title: 'Надіслати клієнту', hint: sendHint('клієнту'),
    });
  });
}

/** Резервна копія всіх даних телефона (з роллю). */
export function saveBackup(ctx) {
  return once(async () => {
    const state = await ctx.store.snapshot();
    const now = Date.now();
    const meta = { ...state.meta, lastBackupAt: now };
    const text = JSON.stringify(buildPackage('backup', selectBackup(state), meta, { now }));
    const res = await deliver(exchangeFileName('копія'), text, {
      title: 'Зберегти копію', hint: 'Надішліть його собі в Telegram («Збережене») або збережіть у «Файли».',
    });
    if (res === 'shared' || res === 'downloaded') {
      await ctx.store.setMeta({ lastBackupAt: now });
      if (res === 'shared') toast('Копію збережено');
      ctx.rerender();
    }
  });
}

/** Панель «Куди додати записи?». → id картки або null (закрили). */
function chooseClient(plan) {
  return new Promise((resolve) => {
    let picked = null;
    const s = sheet((close) => {
      const pick = (id) => () => { picked = id; close(); };
      return h('div', { class: 'stack' },
        h('p', null, `Файл від клієнта «${plan.clientName}». Такої картки ще немає. Куди додати записи?`),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', id: 'import-new-client', onclick: pick('new') },
          `Створити картку «${plan.clientName}»`),
        plan.candidates.length ? h('p', { class: 'muted' }, 'Або це клієнт зі списку:') : null,
        plan.candidates.map((c) => h('button', {
          class: 'btn btn-big', type: 'button', dataset: { client: c.id }, onclick: pick(c.id),
        }, `Це клієнт ${c.name}`)));
    }, { title: 'Новий клієнт' });
    s.closed.then(() => resolve(picked));
  });
}

const KIND_TEXT = {
  backup: 'Це резервна копія — відкрийте її кнопкою «Відновити з копії».',
  exchange: 'Це файл обміну, а не резервна копія — відкрийте його кнопкою «Відкрити файл».',
};

/**
 * Відкрити файл обміну або копію.
 * opts.expect — які види приймає ця кнопка: ['client-to-trainer'] | ['trainer-to-client'] | ['backup'].
 */
export async function openFile(ctx, { expect = null, title = 'Відкрити файл' } = {}) {
  if (busy) return;
  // Вибір файлу — поза блокуванням: старі браузери не кажуть, що вибір скасовано.
  let text;
  try {
    text = await pickFile();
  } catch (err) {
    showMessage(title, `${err.message} Ваші дані не змінено.`);
    return;
  }
  if (text === null) return;
  await once(async () => {

    const meta = await ctx.store.getMeta();
    const parsed = parsePackage(text, { role: meta.role });
    if (!parsed.ok) {
      showMessage(title, `${parsed.error} Ваші дані не змінено.`);
      return;
    }
    const { pkg } = parsed;
    if (expect && !expect.includes(pkg.kind)) {
      showMessage(title, `${pkg.kind === 'backup' ? KIND_TEXT.backup : KIND_TEXT.exchange} Ваші дані не змінено.`);
      return;
    }

    const state = await ctx.store.snapshot();
    const plan = planImport(pkg, state);
    if (plan.error) {
      showMessage(title, `${plan.error} Ваші дані не змінено.`);
      return;
    }

    const opts = {};
    if (plan.needsClientChoice) {
      const choice = await chooseClient(plan);
      if (!choice) return;
      opts.targetClientId = choice === 'new' ? pkg.client.id : choice;
    }
    if (plan.adopt) {
      const ok = await confirmDialog(
        `Файл від тренера для картки «${plan.clientName}». Ваші записи з картки «${plan.fromName}» перейдуть у неї — нічого не загубиться. Продовжити?`,
        { ok: 'Продовжити' });
      if (!ok) return;
    }
    if (pkg.kind === 'backup' && meta.role) {
      const ok = await confirmDialog(
        `Копія від ${formatDate(today(new Date(pkg.createdAt)))}. Її дані додадуться до даних цього телефона — нічого не видаляється. Продовжити?`,
        { ok: 'Відновити' });
      if (!ok) return;
    }

    // Знімок ще раз — раптом дані змінилися, поки відкрито питання.
    const fresh = await ctx.store.snapshot();
    const { state: changes, summary } = applyImport(pkg, fresh, opts);
    await ctx.store.applyChanges(changes);

    const after = await ctx.store.getMeta();
    const msg = summaryText(summary);
    let prefix = '';
    if (pkg.kind === 'backup') prefix = 'Копію відновлено. ';
    else if (plan.adopt) prefix = `Ваші записи тепер у картці «${plan.clientName}». `;
    else if (!meta.role && pkg.kind === 'trainer-to-client') prefix = `Вітаємо, ${plan.clientName}! `;
    toast(prefix + msg, { duration: 4000 });

    let target = homeFor(after);
    if (pkg.kind === 'client-to-trainer') {
      target = `#/client/${encodeURIComponent(opts.targetClientId || plan.targetClientId)}`;
    }
    if (location.hash === target) ctx.rerender();
    else ctx.navigate(target);
  });
}

/** Кнопка надсилання для картки клієнта. */
export function sendButton(ctx, clientId) {
  const isClient = ctx.meta.role === 'client';
  return h('button', {
    class: 'btn btn-big', type: 'button', id: 'send-file',
    onclick: () => (isClient ? sendToTrainer(ctx) : sendToClient(ctx, clientId)),
  }, isClient ? 'Надіслати тренеру' : 'Надіслати клієнту');
}

/** Плашка «Давно не зберігали копію» — якщо понад 14 днів і є нові записи. */
export async function backupBanner(ctx) {
  const meta = await ctx.store.getMeta();
  const sessions = await ctx.store.all('sessions', { withDeleted: true });
  if (!backupDue(meta, sessions)) return null;
  return h('div', {
    class: 'card backup-banner', role: 'status',
    style: { background: 'var(--warn-bg)', color: 'var(--warn-text)', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  },
  h('span', null, 'Давно не зберігали копію'),
  h('button', { class: 'btn', type: 'button', onclick: () => saveBackup(ctx) }, 'Зберегти копію'));
}
