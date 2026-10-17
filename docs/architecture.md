# Архітектура

Статичний PWA без збирання і npm: `index.html` + `app.css` + `css/*.css` + ES-модулі `src/**` + `sw.js`. Усі шляхи відносні (сайт живе в підпапці GitHub Pages). Рішення "чому так" — `docs/adr/`, слова — `CONTEXT.md`.

## Потік даних

- `index.html` -> `src/app.js`: `openStore()` -> `render()` за `location.hash` -> екран `render(container, ctx)` з `src/ui/*.js`. `ctx = {store, meta, params, navigate, rerender}`.
- Екран читає/пише лише через `store` (IndexedDB `trainer-log`); чисту логіку бере з `src/core/*`.
- Рендер екрана йде в окремий `div.screen-root`, у `#view` він потрапляє, лише якщо `renderId` ще актуальний. Під час `render` контейнера ще немає в DOM: міряти розміри не можна, графік масштабується через `viewBox`.
- Доступ: `routes` у `src/app.js` мають `roles` і `own`; чужа картка для клієнта, невідомий або битий хеш -> головний екран ролі (`homeFor`).
- Обмін між телефонами: `ui/exchange.js` -> `core/sync.js` (`buildPackage` -> `shareFile`; у зворотний бік `pickFile` -> `parsePackage` -> `planImport` -> `applyImport` -> `store.applyChanges`). Сервера немає.

## Межі модулів

- `src/core/*` — чисті, без DOM, IndexedDB, `window`, `navigator`; тестуються `node --test`.
  - `model.js` володіє формою даних (Client, Equipment, Exercise, Adjustment, Session, Set, Setting, Meta) і `validateSet`/`formatSet`/`formatDate`.
  - `catalog.js` — стартові 28 тренажерів із детермінованими id (`eq-03`, `eq-dumbbells`, вправи `eq-03-a`), однаковими на всіх телефонах; ручки `HANDLES`.
  - `sync.js` володіє форматом файлу обміну (`FORMAT='trainer-log'`, `VERSION=1`, види `client-to-trainer` / `trainer-to-client` / `backup`) і правилами злиття.
  - `chartdata.js` — `chartSeries(weightMode, sessions)`: кожен підхід — точка, без «робочої ваги».
- `src/store.js` володіє IndexedDB: `all/get/put/putMany/remove/applyChanges/snapshot/replaceAll`; засіває каталог при кожному відкритті (доповнює відсутні id).
- `src/schemes/*` — малюнки тренажерів. `registry.js` зіставляє `equipment.schemeId` з модулем (`butterfly`, `lever-pulldown`, `low-row`); без схеми — заглушка + список регулювань. Модуль схеми: `{id, ADJUSTMENTS, HINTS, draw(values, adjustments) -> SVG-рядок}` з `data-adj`. Схема лише відображає значення, не зберігає. `equipment-edit.js` — чисті функції редагування тренажера тренером.
- `src/ui/*` — екрани та DOM-хелпери (`dom.js`: `h`, `mount`, `toast`, `confirmDialog`, `sheet`). `log-data.js` — операції над записами для екранів, `log-form.js` — форми підходу й вибору налаштування. Браузерних `alert/confirm` немає.
- `src/share.js` — `shareFile` / `downloadFile` / `pickFile` (меню «Поділитися» або завантаження файлу).
- `sw.js` — кеш-спершу, весь додаток у `PRECACHE`.

## Домовленості проєкту

- Код (імена) — англійською, увесь інтерфейс — українською. Поля «нотатка» немає.
- Кожна сутність: `id` (uuid), `updatedAt` (мс, `Date.now()`), `deleted?`. Видалення м'яке (`deleted:true`) — воно їде у файлі. Злиття за id: більший `updatedAt` перемагає, повторний імпорт нічого не дублює.
- Дата сесії — `YYYY-MM-DD` за локальним часом телефона.
- Налаштування (`Setting`) належить трійці клієнт + вправа + регулювання (`clientId|exerciseId|adjustmentId`), а не тренажеру. Регулювання — позиції 1..N або вибір з варіантів, вільного тексту немає.
- Не вигадувати цифр регулювань: приблизне має `approx: true`, невідоме — `unknown: true`; показується «⚠ приблизно — уточнити в залі».
- Ролі `trainer` / `client` (у `meta.role`, на телефоні). Тренер — власник id клієнта: клієнт після першого файлу від тренера переймає його id і переприв'язує свої старі записи. Файл від клієнта тренер додає у вибрану або нову картку (відповідність запам'ятовується в `meta.aliases`).
- Напрями файлів: тренер приймає `client-to-trainer` і `backup`; клієнт — `trainer-to-client` і `backup`; телефон без ролі — `trainer-to-client` (стає клієнтом) або `backup`. Інше — помилка без змін.
- Нові файли в `src/`, `css/`, `icons/` додавай у `PRECACHE` в `sw.js` і піднімай `CACHE_VERSION` (перевіряє `test/pwa.test.js`).
- Джерела даних залу: `gym/equipment.md` (28 тренажерів), `gym/adjustments.md` (регулювання), фото для схем — `gym/my-photos/`.
