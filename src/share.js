// Надсилання і вибір файлу: меню «Поділитися» телефона (Web Share API) або завантаження.
//
// shareFile(filename, text) → Promise<'shared' | 'downloaded' | 'cancelled' | 'blocked'>
//   'blocked' — браузер не дав відкрити меню без свіжого натиску (iPhone після довгої підготовки):
//   викличте shareFile ще раз з обробника наступного натиску.
// downloadFile(filename, text) — просто завантажити.
// pickFile() → Promise<string | null>   (текст вибраного файлу або null, якщо не вибрали;
//   не прочитався чи завеликий — відхиляє з Error українською)
// readPickedFile(file) → Promise<string | null>   (те саме для вже вибраного File)

const MAX_FILE_BYTES = 30 * 1024 * 1024;

/** Завантажує файл (без меню «Поділитися»). */
export function downloadFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Ділиться файлом через меню телефона; не вміє — завантажує. Скасування меню → 'cancelled'. */
export async function shareFile(filename, text) {
  let file = null;
  try {
    file = new File([text], filename, { type: 'application/json' });
  } catch { /* старий браузер без File() — лише завантаження */ }
  const nav = globalThis.navigator;
  if (file && nav && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    let can = false;
    try { can = nav.canShare({ files: [file] }); } catch { can = false; }
    if (can) {
      try {
        await nav.share({ files: [file], title: filename });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'cancelled';
        if (err && err.name === 'NotAllowedError') return 'blocked';
        // Інша помилка — завантажуємо.
      }
    }
  }
  downloadFile(filename, text);
  return 'downloaded';
}

function readWithFileReader(file) {
  return new Promise((resolve, reject) => {
    const Reader = globalThis.FileReader;
    if (typeof Reader !== 'function') { reject(new Error('FileReader недоступний')); return; }
    const reader = new Reader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('порожній результат')));
    reader.onerror = () => reject(reader.error || new Error('FileReader: помилка'));
    reader.readAsText(file);
  });
}

/**
 * Текст вибраного файлу. → null — файлу немає (не вибрали); завеликий / не прочитався → помилка.
 * Спершу file.text(), відмовив чи його немає — FileReader.readAsText (старі WebView месенджерів).
 */
export async function readPickedFile(file) {
  if (!file) return null;
  if (file.size > MAX_FILE_BYTES) throw new Error('Файл завеликий — це не файл журналу.');
  let first = null;
  if (typeof file.text === 'function') {
    try {
      return await file.text();
    } catch (err) {
      first = err;
    }
  }
  try {
    return await readWithFileReader(file);
  } catch (err) {
    console.error('pickFile: не вдалося прочитати файл', first, err);
    throw new Error('Не вдалося прочитати файл.');
  }
}

/** Відкриває вибір файлу. → текст файлу, null — якщо не вибрали. Завеликий файл → помилка. */
export function pickFile() {
  return new Promise((resolve, reject) => {
    // Вибір, що лишився від попереднього разу (браузер без події cancel), — прибираємо.
    document.querySelectorAll('input[data-pick-file]').forEach((n) => n.remove());
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('data-pick-file', '');
    // Без accept: на iPhone файли з Telegram/«Файлів» інакше бувають неактивні.
    input.style.display = 'none';
    let settled = false;
    const finish = (fn, v) => {
      if (settled) return;
      settled = true;
      input.remove();
      fn(v);
    };
    let picked = false;
    input.addEventListener('change', () => {
      picked = true;
      const file = input.files && input.files[0];
      readPickedFile(file).then((t) => finish(resolve, t), (err) => finish(reject, err));
    });
    // cancel після вибору (поки файл читається) — не «не вибрали».
    input.addEventListener('cancel', () => { if (!picked) finish(resolve, null); });
    document.body.append(input);
    input.click();
  });
}
