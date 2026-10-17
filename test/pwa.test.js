// Встановлюваність і офлайн: manifest і список кешу service worker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

function walk(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const p = join(abs, name);
    return statSync(p).isDirectory()
      ? walk(relative(root, p))
      : [relative(root, p).split(sep).join('/')];
  });
}

function precache() {
  const src = read('sw.js');
  const m = /const\s+PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(src);
  assert.ok(m, 'у sw.js немає масиву PRECACHE');
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1].replace(/^\.\//, ''));
}

test('manifest: українська назва, standalone, відносні start_url/scope, іконки 192 і 512', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.lang, 'uk');
  assert.match(m.name, /[А-Яа-яІіЇїЄєҐґ]/);
  assert.ok(m.short_name);
  assert.equal(m.display, 'standalone');
  for (const key of ['start_url', 'scope']) {
    assert.ok(m[key], key);
    assert.ok(!m[key].startsWith('/') && !/^https?:/.test(m[key]), `${key} має бути відносним`);
  }
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192'));
  assert.ok(sizes.includes('512x512'));
  for (const icon of m.icons) {
    assert.ok(!icon.src.startsWith('/'), `відносний шлях іконки ${icon.src}`);
    assert.ok(existsSync(join(root, icon.src)), `немає файлу ${icon.src}`);
    const png = readFileSync(join(root, icon.src));
    assert.equal(png.subarray(1, 4).toString(), 'PNG', `${icon.src} не PNG`);
    const [w, hgt] = icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16), w, `${icon.src} ширина`);
    assert.equal(png.readUInt32BE(20), hgt, `${icon.src} висота`);
  }
});

test('sw.js: є CACHE_VERSION і в кеші всі файли програми', () => {
  assert.match(read('sw.js'), /const\s+CACHE_VERSION\s*=/);
  const list = precache();
  const required = [
    './', 'index.html', 'app.css', 'manifest.webmanifest',
    ...walk('src'), ...walk('css'), ...walk('icons'),
  ].map((p) => p.replace(/^\.\//, ''));
  for (const f of required) assert.ok(list.includes(f), `не в PRECACHE: ${f || './'}`);
  for (const f of list) {
    if (f === '') continue;
    assert.ok(existsSync(join(root, f)), `у PRECACHE зайвий/неіснуючий файл: ${f}`);
  }
});

test('index.html підключає всі три таблиці стилів, manifest і app.js відносними шляхами', () => {
  const html = read('index.html');
  for (const href of ['app.css', 'css/screens.css', 'css/schemes.css', 'manifest.webmanifest', 'src/app.js']) {
    assert.ok(html.includes(`"${href}"`), href);
  }
  assert.ok(!/(href|src)="\//.test(html), 'абсолютні шляхи в index.html');
  assert.match(html, /<html lang="uk">/);
});
