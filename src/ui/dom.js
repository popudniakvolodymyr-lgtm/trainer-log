// DOM-хелпери. Без браузерних alert/confirm/prompt.

// Ці теги h() створює в просторі імен SVG (графік і схеми). Увага: h('title') — це SVG <title>.
const SVG_TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
  'polygon', 'text', 'tspan', 'defs', 'title', 'clipPath', 'linearGradient', 'stop', 'marker', 'use']);

/**
 * h('button', {class:'btn', onclick: fn, disabled: true, dataset:{id:1}}, 'Текст', child, [..])
 * attrs: class|className, style (рядок або об'єкт), on<подія> (функція), dataset, html (innerHTML — лише для SVG з коду),
 *        boolean-атрибути (true → є, false/null → немає), решта — setAttribute.
 */
export function h(tag, attrs, ...children) {
  const svg = SVG_TAGS.has(tag);
  const el = svg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class' || k === 'className') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' && 'value' in el) el.value = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false || c === true) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Очищає контейнер і вставляє вміст. */
export function mount(container, ...children) {
  container.replaceChildren();
  append(container, children);
  return container;
}

let toastTimer = null;
/** Коротке повідомлення внизу екрана. */
export function toast(text, { duration = 2600 } = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  return el;
}

function overlay(onBackdrop) {
  const el = h('div', { class: 'overlay' });
  el.addEventListener('click', (e) => { if (e.target === el) onBackdrop(); });
  return el;
}

/**
 * Діалог підтвердження. → Promise<bool>
 * opts: { ok:'Так', cancel:'Скасувати', danger:false }
 */
export function confirmDialog(text, { ok = 'Так', cancel = 'Скасувати', danger = false } = {}) {
  return new Promise((resolve) => {
    let ov;
    const close = (v) => {
      document.removeEventListener('keydown', onKey);
      ov.remove();
      resolve(v);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    const okBtn = h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => close(true) }, ok);
    ov = overlay(() => close(false));
    ov.append(h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true' },
      h('p', { class: 'dialog-text' }, text),
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn', onclick: () => close(false) }, cancel),
        okBtn)));
    document.addEventListener('keydown', onKey);
    document.body.append(ov);
    okBtn.focus();
  });
}

/**
 * Нижня панель для вибору.
 * content — Node або функція (close) => Node.
 * → { el, close(), closed: Promise<void> }
 */
export function sheet(content, { title = null } = {}) {
  let resolveClosed;
  const closed = new Promise((r) => { resolveClosed = r; });
  let ov;
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  function close() {
    if (!ov.isConnected) return;
    document.removeEventListener('keydown', onKey);
    ov.remove();
    resolveClosed();
  }
  ov = overlay(close);
  ov.classList.add('overlay-sheet');
  const body = typeof content === 'function' ? content(close) : content;
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'sheet-head' },
      h('span', { class: 'sheet-title' }, title || ''),
      h('button', { class: 'btn-icon', 'aria-label': 'Закрити', onclick: close }, '✕')),
    h('div', { class: 'sheet-body' }, body));
  ov.append(panel);
  document.addEventListener('keydown', onKey);
  document.body.append(ov);
  return { el: panel, close, closed };
}
