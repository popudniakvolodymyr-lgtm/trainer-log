// Надсилання і вибір файлу: меню «Поділитися» телефона (Web Share API) або завантаження.
//
// shareFile(filename, text) → Promise<'shared' | 'downloaded' | 'cancelled' | 'blocked'>
//   'blocked' — браузер не дав відкрити меню без свіжого натиску (iPhone після довгої підготовки):
//   викличте shareFile ще раз з обробника наступного натиску.
// downloadFile(filename, text) — просто завантажити.
// pickFile() → Promise<string | null>   (текст вибраного файлу або null, якщо не вибрали)

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

/** Відкриває вибір файлу. → текст файлу, null — якщо не вибрали. Завеликий файл → помилка. */
export function pickFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    // Без accept: на iPhone файли з Telegram/«Файлів» інакше бувають неактивні.
    input.style.display = 'none';
    let settled = false;
    const finish = (fn, v) => {
      if (settled) return;
      settled = true;
      input.remove();
      fn(v);
    };
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return finish(resolve, null);
      if (file.size > MAX_FILE_BYTES) return finish(reject, new Error('Файл завеликий — це не файл журналу.'));
      try {
        finish(resolve, await file.text());
      } catch {
        finish(reject, new Error('Не вдалося прочитати файл.'));
      }
    });
    input.addEventListener('cancel', () => finish(resolve, null));
    document.body.append(input);
    input.click();
  });
}
