# Інтерфейси

Файл, який кожен виконавець читає першим. Код — англійською (імена), інтерфейс — українською.

## Правила проєкту

- Стилі: спільні — `app.css` (таск 01); екранів запису — `css/screens.css` (таск 02); схем — `css/schemes.css` (таск 03). Усі три підключені в `index.html`.
- Статичний сайт без збирання і без npm-залежностей: `index.html`, `app.css`, `src/**/*.js` (ES-модулі, `import` з відносними шляхами з `.js`), `sw.js`, `manifest.webmanifest`, `icons/`. Усі шляхи відносні (сайт житиме в підпапці GitHub Pages).
- Чисті модулі (`src/core/*`) не торкаються DOM, IndexedDB, `window`, `navigator` — вони тестуються `node --test` з `test/*.test.js`.
- Перевірка всього проєкту: `node --test` з кореня. Запуск: `python -m http.server 8000` з кореня → http://localhost:8000.
- Кожен рядок інтерфейсу — українською. Жодного поля «нотатка» (R31).
- Не вигадувати цифр регулювань: приблизне/невідоме має `approx: true` і показується позначкою «⚠ приблизно — уточнити в залі».
- Час — `Date.now()` (мс). Дата сесії — рядок `YYYY-MM-DD` за локальним часом телефона.
- Нові файли в `src/` додавай у список кешу в `sw.js` (`PRECACHE`), і піднімай `CACHE_VERSION`.

## Межі, вирішені в специфікації

### Модель даних (`src/core/model.js`) — володіє формою даних

```js
// Усі сутності мають: id (uuid рядок), updatedAt (мс), deleted (bool, опц.)
Client     { id, name, updatedAt, deleted? }
Equipment  { id, name, siteName|null, siteNo|null, group, weightMode, exercises: Exercise[],
             adjustments: Adjustment[], schemeId|null, hidden?, custom?, updatedAt, deleted? }
  // group: 'chest'|'legs'|'shoulders'|'abs'|'arms'|'back'|'dumbbells'|'bar'|'cardio'
  // weightMode: 'single' | 'perHand' | 'bodyweight' | 'cardio'
Exercise   { id, name, deleted? }
Adjustment { id, label, kind: 'positions'|'options', count?, options?: [{id,label,color?}],
             approx?: bool, unknown?: bool, deleted? }
  // 'positions' → значення 1..count; 'options' → id одного з options
  // ручка: { id:'handle', kind:'options', options: HANDLES } (id ручок див. catalog)
Session    { id, clientId, equipmentId, exerciseId, date:'YYYY-MM-DD', sets: Set[], updatedAt, deleted? }
Set        single:     { reps, weight }
           perHand:    { reps, left, right }
           bodyweight: { reps, extra|null }
           cardio:     { minutes, km|null, kcal|null }
Setting    { id: `${clientId}|${exerciseId}|${adjustmentId}`, clientId, equipmentId, exerciseId,
             adjustmentId, value, updatedAt, by:'trainer'|'client' }
Meta       { role:'trainer'|'client'|null, deviceId, clientId|null (у клієнта — його id),
             trainerName|null, lastBackupAt|null, aliases: {[foreignClientId]: localClientId} }
```

Експорти: `uuid()`, `today()`, `GROUPS` (id → українська назва, порядок), `WEIGHT_MODES`,
`validateSet(weightMode, raw) → {ok:true, set} | {ok:false, errors:{field: 'текст'}}` (приймає кому в числах),
`formatSet(weightMode, set) → '10 × 40 кг' | '10 × Л 20 / П 22,5 кг' | '30 хв · 5 км'`,
`formatDate('YYYY-MM-DD') → '17.10.2026'`.

### Каталог (`src/core/catalog.js`) — стартові дані

`HANDLES` — 5 ручок `{id, label}`: `v-bar` V-подібна, `rope` Канат, `d-handle` Одинарна D-ручка, `short-bar` Коротка пряма, `long-bar` Довга пряма.
`seedEquipment() → Equipment[]` — детерміновані id (`eq-03`, `eq-26`, `eq-dumbbells`, …; вправи `eq-03-a`, …), щоб у тренера й клієнта збігались.
`HANDLE_ADJUSTMENT` — готове регулювання «Ручка».
Схемні тренажери: `eq-03` «Метелик» (schemeId `butterfly`, вправи «Зведення рук» `eq-03-a`, «Відведення рук назад» `eq-03-b`, регулювання `handles-pos` (5, approx), `seat` (5, approx)); `eq-21` (schemeId `lever-pulldown`, `seat` (5, unknown), `grip` options `green|red|orange` з кольорами); `eq-26` (schemeId `low-row`, `handle`).

### Злиття й файл обміну (`src/core/sync.js`) — володіє форматом файлу

```js
FORMAT = 'trainer-log', VERSION = 1
buildPackage(kind, data, meta) → object      // kind: 'client-to-trainer'|'trainer-to-client'|'backup'
  // data = { clients, equipment, sessions, settings } — що вже відібрано під цей kind
  // package: { format, version, kind, createdAt, from:{role, deviceId}, client?:{id,name}, clients?, equipment, sessions, settings, meta? }
parsePackage(text) → {ok:true, pkg} | {ok:false, error:'текст українською'}
mergeEntities(local[], incoming[]) → { merged[], added:n, updated:n }   // за id, більший updatedAt перемагає, deleted теж
planImport(pkg, localState) → { needsClientChoice: bool, candidates: Client[], ... }  // для R47i
applyImport(pkg, localState, {targetClientId?}) → { state: changedSets, summary:{sessions:{added,updated}, settings:{…}, equipment:{…}} }
  // перепризначає clientId з файлу на targetClientId (та записує alias); ідемпотентно
selectForClient(state, clientId) → data   // що тренер шле клієнту: його сесії, налаштування, весь каталог
```

Правила напрямів: телефон тренера приймає `client-to-trainer` і `backup`; телефон клієнта — `trainer-to-client` і `backup`; телефон без ролі — `trainer-to-client` (стає клієнтом) або `backup` (стає тим, ким був). Інше — помилка без змін.
`trainer-to-client`: клієнт переймає `client.id` тренера як свій (перепризначає свої старі записи) — історія 35.

### Сховище (`src/store.js`) — володіє IndexedDB

```js
openStore() → Promise<Store>
Store: getMeta(), setMeta(patch),
       all(kind), get(kind, id), put(kind, obj), putMany(kind, objs),   // kind: 'clients'|'equipment'|'sessions'|'settings'
       remove(kind, id)  // м'яко: deleted:true, updatedAt:now
       snapshot() → {meta, clients, equipment, sessions, settings}; replaceAll(snapshot)
```
При першому відкритті без даних — засіває `seedEquipment()`. `put` ставить `updatedAt = Date.now()`, якщо не передано.

### Графік (`src/core/chartdata.js` + `src/ui/chart.js`)

`chartSeries(weightMode, sessions) → { series:[{key, label, color, points:[{t, y, label}]}], yUnit }` — чисто, без обчислення «робочої ваги»: кожен підхід — точка.
`renderChart(container, seriesResult)` — SVG, адаптивна ширина, підписи українською, порожній стан.

### Схеми (`src/schemes/*.js`)

```js
// src/schemes/index.js
renderScheme(container, equipment, exerciseId, values, {onPick(adjustmentId)})
  // values: {[adjustmentId]: value}; без schemeId → заглушка + список регулювань
// кожна схема: export function draw(values, adjustments) → SVG-рядок з елементами data-adj="<adjustmentId>"
// src/schemes/handles.js: handleIcon(handleId) → SVG-рядок
```

### Інтерфейс (`src/ui/*.js`, `src/app.js`)

Маршрути за `location.hash`: `#/start`, `#/clients`, `#/client/<id>`, `#/client/<id>/eq/<eqId>[/<exId>]`, `#/equipment` (тренер), `#/settings`.
`src/ui/dom.js` — `h(tag, attrs, ...children)`, `toast(text)`, `confirmDialog(text) → Promise<bool>`, `sheet(content)` (нижня панель для вибору). Без `alert/confirm` браузера.
`src/share.js` — `shareFile(filename, text) → 'shared'|'downloaded'`, `pickFile() → Promise<string|null>`.

### Тестові шви

`src/core/*` через `node --test`. UI перевіряється руками/браузером.
