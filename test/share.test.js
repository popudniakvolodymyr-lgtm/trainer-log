import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readPickedFile } from '../src/share.js';

// F2 (історії 30–31): файл з месенджера має прочитатися; «не вибрали» ≠ «не прочитали».
const JSON_TEXT = '{"app":"trainer-log","kind":"exchange"}';
const READ_ERROR = 'Не вдалося прочитати файл.';

// Підміна FileReader браузера: читає з поля __content, або падає, якщо його немає.
class FakeReader {
  readAsText(blob) {
    setTimeout(() => {
      if (typeof blob.__content === 'string') { this.result = blob.__content; this.onload && this.onload(); }
      else { this.error = new Error('NotReadableError'); this.onerror && this.onerror(); }
    }, 0);
  }
}
const original = globalThis.FileReader;
afterEach(() => { globalThis.FileReader = original; });

const failingText = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotReadableError' }));

test('нічого не вибрали → null, а не помилка', async () => {
  assert.equal(await readPickedFile(undefined), null);
  assert.equal(await readPickedFile(null), null);
});

test('звичайний файл читається через file.text()', async () => {
  const file = new File([JSON_TEXT], 'zhurnal.json', { type: 'application/json' });
  assert.equal(await readPickedFile(file), JSON_TEXT);
});

test('file.text() відмовив → запасний шлях FileReader.readAsText', async () => {
  globalThis.FileReader = FakeReader;
  const file = { name: 'z.json', size: JSON_TEXT.length, text: failingText, __content: JSON_TEXT };
  assert.equal(await readPickedFile(file), JSON_TEXT);
});

test('старий браузер без file.text() → FileReader', async () => {
  globalThis.FileReader = FakeReader;
  const file = { name: 'z.json', size: JSON_TEXT.length, __content: JSON_TEXT };
  assert.equal(await readPickedFile(file), JSON_TEXT);
});

test('обидва шляхи відмовили → помилка читання (не null)', async () => {
  globalThis.FileReader = FakeReader;
  const file = { name: 'z.json', size: 10, text: failingText };
  await assert.rejects(readPickedFile(file), (err) => err.message === READ_ERROR);
});

test('завеликий файл → помилка, не читаємо', async () => {
  let read = false;
  const file = { name: 'big.json', size: 31 * 1024 * 1024, text: () => { read = true; return Promise.resolve(''); } };
  await assert.rejects(readPickedFile(file), /завеликий/);
  assert.equal(read, false);
});
