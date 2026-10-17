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

## Що побудували таски

### T01 — каркас
- model: `uuid()`, `today(date?)`, `GROUPS`, `WEIGHT_MODES` (заморожені «id → назва», порядок = порядок меню), `validateSet`, `formatSet`, `formatDate`, також `formatNumber(n)`, `settingId(clientId, exerciseId, adjustmentId)`.
- catalog: `HANDLES`, `HANDLE_ADJUSTMENT`, `seedEquipment()` → 28 тренажерів, `updatedAt:0`; id `eq-dumbbells`/`eq-bar`/`eq-cardio`; вправи `eq-NN-a`, кардіо `eq-cardio-a/b/c`.
- store: `openStore({indexedDB?, name?, persist?})`; `all(kind, {withDeleted})` без видалених за замовчуванням; `put(kind, obj, {keepUpdatedAt})` ставить `updatedAt=now`, якщо не `keepUpdatedAt`; `putMany` зберігає переданий `updatedAt` (для імпорту); `close()`, `KINDS`, `requestPersist()`; `replaceAll` лишає `deviceId` телефона; засівання доповнює відсутні id з seed при кожному відкритті.
- app.js: таблиця `routes` `{pattern, name, roles, own, keys, render}`; `render(container, ctx)`, `ctx = {store, meta, params, navigate(hash), rerender()}`; `homeFor(meta)`. Екрани clients/client/exercise/equipment — заготовки; таски 02/03 замінюють їхній render.
- dom: `h`, `mount(container, ...children)`, `toast(text,{duration})`, `confirmDialog(text,{ok,cancel,danger}) → Promise<bool>`, `sheet(content | (close)=>Node, {title}) → {el, close, closed}`.
- start.js: `renderStart`, `installHint()`, `isStandalone()`; settings.js: `renderSettings`, контейнери `#settings-exchange` / `#exchange-actions` / `#backup-actions` для таску 04.
- schemes/index.js: `renderScheme` за контрактом + `valueLabel`, `renderAdjustmentList`, `APPROX_TEXT`.
- Екрани: `renderClients`, `renderClient`, `renderExercise`, `renderEquipment` — `(container, ctx)` у `src/ui/<clients|client|exercise|equipment>.js`; `app.js` лише імпортує — таски 02/03 замінюють ці файли, `app.js` не чіпають.
- Рендер іде у відокремлений `div.screen-root` і вставляється в `#view` лише якщо `renderId` ще актуальний — під час `render` контейнер ще НЕ в DOM: графік масштабується через `viewBox` (або міряє після вставки).
- Битий хеш → головний екран ролі. `h()` створює SVG-елементи для `svg, g, path, line, rect, circle, text, title, clipPath, linearGradient, stop, marker, use, defs, tspan…`.
- `sw.js` (`CACHE_VERSION`, `PRECACHE`) у хвилі 2 не чіпати — нові файли таски 02/03 називають у контракті, таск 04 додає їх у кеш.

### T03 — схеми
- `renderScheme(container, equipment, exerciseId, values?, {store, clientId, role, onPick, onChange}) → container`: без `values` читає зі `store`; зі `store`+`clientId` сам відкриває панель, зберігає Setting (`by=role`) і перемальовує на місці; `onPick` — лише без `store`. Також `valueLabel`, `renderAdjustmentList(eq, values, {onPick, only})`, `loadValues(store, clientId, exId)`, `APPROX_TEXT`, `SCHEMES`, `schemeFor`, `handleIcon`.
- Модуль схеми: `{id, ADJUSTMENTS, HINTS, draw(values, adjustments) → '<svg…>'}` з `data-adj` / `data-badge`+`data-value` / `data-pos="adj:n"` / `data-opt`, `optionIcon?`. `handles.js`: `handleIcon(id,{width,height})`, `handleArt(id)`. `values.js`: `valuesFor(settings, clientId, exId)`, `makeSetting({...})`, `isSet`, `positionHint`, `activeAdjustments`, `activeExercises`.
- `equipment-edit.js` (чисті → новий Equipment): `renameEquipment`, `setHidden`, `addEquipment({name,group,weightMode,exerciseName})`, `addExercise/renameExercise/removeExercise`, `addAdjustment({kind:'positions'|'options'|'handle'})`, `renameAdjustment`, `renameOption`, `addOption`, `setPositionCount`, `removeAdjustment`, `parseOptions`.
- Нові файли поза кешем `sw.js`: `src/schemes/{registry,svg,values,handles,butterfly,lever-pulldown,low-row,equipment-edit}.js` — додає таск 04. На `#/equipment` ще ніщо не веде — посилання для тренера додає таск 04 у `settings.js`.

### T02 — клієнти, запис, графік
- `chartSeries(weightMode, sessions) → {series:[{key,label,unit,color,points:[{t,y,label,n}]}], yUnit}`; `t` — початок дня UTC (мс), `n` — номер підходу в дні; ключі серій `weight` | `left,right` | `extra` або `reps` | `minutes,km`; порожні серії не повертаються. Також `dateToT`, `COLORS`. `renderChart(container, result)` (viewBox 360×230; кардіо — дві осі Y), `niceTicks`, `EMPTY_TEXT`.
- Екран вправи викликає `renderScheme(box, equipment, exercise.id, values, {onPick, store, clientId, role, rerender})`; схема зберігає сама (T03), `onPick` — запасний шлях.
- `src/ui/log-data.js`: `listSessions, lastSet, addSet, updateSet, deleteSet, settingValues, saveSetting, clearSetting, deleteClient, recentEquipmentIds`; `src/ui/log-form.js`: `openSetForm, openSettingPicker, SET_FIELDS`. Видалення клієнта м'яко видаляє його сесії й налаштування.
- Кнопки «Записати підхід» і «+ Додати клієнта» — фіксована нижня панель `.log-bar`.
- Браузерна перевірка: лише headless Chrome через CDP зі свіжим профілем (як у T01) — НЕ браузер користувача.

### T04 — обмін і копія
- sync: `parsePackage(text, {role}?)` (з `role` перевіряє напрям), `buildPackage(kind, data, meta, {now}?)`, `mergeEntities → {merged, changed, added, updated, removed}`, `planImport → {error?, needsClientChoice, candidates, clientName, targetClientId, adopt, fromName, becomesRole}`, `applyImport(pkg, state, {targetClientId?, now?}) → {state, summary}` (targetClientId = id з файлу означає «Створити картку»), `selectForClient`, `selectForTrainer`, `selectBackup`, `backupDue(meta, sessions, now?)`, `summaryText`, `exchangeFileName`, `KINDS`, `BACKUP_DUE_DAYS`.
- share: `shareFile → 'shared'|'downloaded'|'cancelled'|'blocked'`, `downloadFile`, `pickFile`. exchange: `sendToTrainer(ctx)`, `sendToClient(ctx, clientId)`, `saveBackup(ctx)`, `openFile(ctx, {expect, title})`, `sendButton(ctx, clientId)`, `backupBanner(ctx) → Promise<Node|null>`.
- store: `applyChanges({clients?, equipment?, sessions?, settings?, meta?})` — одна транзакція, `updatedAt` як передано, `deviceId` не чіпає.
- `sw.js`: 41 файл у PRECACHE, `CACHE_VERSION=3`.

## Межі правок (таски 05–07)

- Equipment отримує `rare?: bool` (у меню — в кінці групи, сірим) і `catalogVersion` у meta (`meta.catalogVersion`). `CATALOG_VERSION` — експорт `catalog.js`.
- `weightStep(equipment) → 5 (блок) | 2.5 (диски) | null (гантелі, турнік, кардіо)` у `model.js`; `validateSet(weightMode, raw, {step})`.
- Нові `schemeId` (рядки) задає каталог (таск 05). Реєстр `src/schemes/registry.js` (таск 05) підтягує схеми з двох файлів-збірок: `src/schemes/upper.js` (груди, спина, плечі, руки, прес, гантелі — таск 06) і `src/schemes/legs.js` (ноги — таск 07), кожен `export const SCHEMES = [/* модулі схем {id, ADJUSTMENTS?, HINTS?, draw} */]`. Таск 05 створює їх порожніми і кладе в PRECACHE `sw.js`; 06 і 07 пишуть лише у свій файл. `schemeId` без реалізованої схеми → поточна заглушка.
- Схема без регулювань: `draw(values, adjustments)` малює тренажер; підпис «Регулювань немає — лише вага» дає `renderScheme`.
