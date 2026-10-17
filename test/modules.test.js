import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Усі .js програми — ES-модулі. `node --check` на файлі трактує його як CommonJS і
// пропускає помилки модульного синтаксису, тому перевіряємо через stdin з --input-type=module
// (лише розбір, код не виконується).
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...jsFiles(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = [...jsFiles(join(root, 'src')), join(root, 'sw.js')];

test('знайдено файли для перевірки', () => {
  assert.ok(files.length > 10);
});

for (const file of files) {
  const name = relative(root, file).split(sep).join('/');
  test(`${name} розбирається як ES-модуль`, () => {
    const res = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: readFileSync(file),
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, `${name}: ${res.stderr.split('\n').filter((l) => /Error/.test(l)).join(' ')}`);
  });
}
