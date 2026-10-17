window.STATE =
{
  "version": 2,
  "slug": "trainer-log",
  "dir": "2026-10-17-trainer-log",
  "title": "Журнал фітнес-тренера",
  "mode": "semi",
  "depth": "normal",
  "tier": "T2",
  "briefFile": "2026-10-18-brief-pravky-3.md",
  "memoryFile": "AGENTS.md",
  "memoryOwner": "autopilot",
  "skillDir": "C:/Антігравіті ресьорч/.claude/skills/autopilot",
  "baseCommit": "a3eeb4c",
  "startedAt": "2026-10-17T17:50:53+03:00",
  "updatedAt": "2026-10-18T01:35:36+03:00",
  "finishedAt": "2026-10-18T01:35:36+03:00",
  "stages": [
    {
      "id": "preflight",
      "status": "done",
      "startedAt": "2026-10-17T17:50:53+03:00",
      "finishedAt": "2026-10-17T17:51:10+03:00"
    },
    {
      "id": "manifest",
      "status": "done",
      "startedAt": "2026-10-18T00:39:29+03:00",
      "finishedAt": "2026-10-18T00:41:31+03:00"
    },
    {
      "id": "briefing",
      "status": "skipped",
      "startedAt": "2026-10-18T00:39:35+03:00",
      "finishedAt": "2026-10-18T00:39:35+03:00",
      "note": "усе уточнено в діалозі"
    },
    {
      "id": "spec",
      "status": "done",
      "startedAt": "2026-10-18T00:41:31+03:00",
      "finishedAt": "2026-10-18T00:41:33+03:00"
    },
    {
      "id": "plan",
      "status": "done",
      "startedAt": "2026-10-18T00:41:33+03:00",
      "finishedAt": "2026-10-18T00:41:51+03:00"
    },
    {
      "id": "build",
      "status": "done",
      "startedAt": "2026-10-18T00:41:51+03:00",
      "finishedAt": "2026-10-18T01:10:17+03:00"
    },
    {
      "id": "review",
      "status": "done",
      "startedAt": "2026-10-18T01:10:17+03:00",
      "finishedAt": "2026-10-18T01:35:36+03:00"
    },
    {
      "id": "final",
      "status": "done",
      "finishedAt": "2026-10-18T01:35:36+03:00",
      "startedAt": "2026-10-18T01:35:36+03:00"
    }
  ],
  "requirements": {
    "total": 88,
    "done": 88,
    "inTicket": 0,
    "inSpec": 0,
    "placeholder": 0,
    "deferred": 0,
    "dropped": 0
  },
  "tickets": [
    {
      "id": "01",
      "title": "Каркас програми: сховище, модель, каталог, перший запуск",
      "requirements": [
        "R09",
        "R10",
        "R25",
        "R30",
        "R31",
        "R32",
        "R44i",
        "R49i"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "index.html",
        "app.css",
        "css/",
        "screens.css",
        "schemes.css",
        "index.html",
        "manifest.webmanifest",
        "sw.js",
        "icons/",
        "src/app.js",
        "src/store.js",
        "src/core/model.js",
        "src/core/catalog.js",
        "src/ui/dom.js",
        "src/ui/start.js",
        "src/ui/settings.js",
        "src/schemes/index.js",
        "test/"
      ],
      "review": "да — фундамент",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T18:02:36+03:00",
      "finishedAt": "2026-10-17T18:15:08+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 32,
        "failed": 0
      },
      "commit": "b72bf82"
    },
    {
      "id": "02",
      "title": "Клієнти, меню тренажерів, запис підходів, графік та історія",
      "requirements": [
        "R01",
        "R02",
        "R03",
        "R04",
        "R05",
        "R06",
        "R14",
        "R15",
        "R18",
        "R21",
        "R28",
        "R43i",
        "R48i",
        "G01"
      ],
      "blockedBy": [
        "01"
      ],
      "wave": 2,
      "zone": [
        "src/ui/clients.js",
        "src/ui/client.js",
        "src/ui/exercise.js",
        "src/ui/chart.js",
        "src/core/chartdata.js",
        "test/chartdata.test.js",
        "css/screens.css"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "startedAt": "2026-10-17T18:15:10+03:00",
      "finishedAt": "2026-10-17T18:55:09+03:00",
      "retries": 0,
      "repairs": 1,
      "repairFindings": [
        "exercise.js не парситься як ES-модуль — програма не завантажується; + тест парсингу модулів"
      ],
      "tests": {
        "passed": 99,
        "failed": 0
      },
      "commit": "19412f6"
    },
    {
      "id": "03",
      "title": "Схеми регулювань і налаштування клієнта, редагування тренажерів",
      "requirements": [
        "R07",
        "R16",
        "R17",
        "R22",
        "R23",
        "R24",
        "R26",
        "R27",
        "R29",
        "R30",
        "R33",
        "R34",
        "R35",
        "R36",
        "R37",
        "R38",
        "R39",
        "R40",
        "R41",
        "R42"
      ],
      "blockedBy": [
        "01"
      ],
      "wave": 2,
      "zone": [
        "src/schemes/",
        "src/ui/equipment.js",
        "test/schemes.test.js",
        "css/schemes.css"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T18:15:10+03:00",
      "finishedAt": "2026-10-17T18:33:57+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 50,
        "failed": 1
      },
      "commit": "2ae9ba9"
    },
    {
      "id": "04",
      "title": "Обмін файлом тренер ↔ клієнт і резервна копія",
      "requirements": [
        "R08",
        "R11",
        "R12",
        "R13",
        "R19",
        "R20",
        "R44i",
        "R45i",
        "R46i",
        "R47i"
      ],
      "blockedBy": [
        "01",
        "02",
        "03"
      ],
      "wave": 3,
      "zone": [
        "sw.js",
        "src/core/sync.js",
        "src/share.js",
        "src/ui/exchange.js",
        "test/sync.test.js",
        "src/ui/client.js",
        "src/ui/start.js",
        "src/ui/settings.js"
      ],
      "review": "да — злиття і видалення даних користувача",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T18:41:10+03:00",
      "finishedAt": "2026-10-17T18:57:01+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 99,
        "failed": 0
      },
      "commit": "89a23b9"
    },
    {
      "id": "05",
      "title": "Каталог залу за правками: крок ваги, видимість, прес, гантелі, оновлення на встановлених телефонах",
      "requirements": [
        "G02",
        "G17",
        "G03",
        "G04",
        "G06",
        "G07",
        "G08",
        "G09",
        "G10",
        "G11",
        "G12",
        "G13",
        "G14",
        "G16"
      ],
      "blockedBy": [],
      "wave": 5,
      "zone": [
        "src/core/catalog.js",
        "src/core/model.js",
        "src/store.js",
        "src/ui/log-form.js",
        "src/ui/client.js",
        "src/schemes/registry.js",
        "src/schemes/index.js",
        "src/schemes/upper.js",
        "src/schemes/legs.js",
        "sw.js",
        "test/catalog.test.js",
        "test/model.test.js",
        "test/migration.test.js"
      ],
      "review": "да — фундамент і міграція даних користувача",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T19:46:18+03:00",
      "finishedAt": "2026-10-17T20:05:04+03:00",
      "retries": 0,
      "repairs": 1,
      "repairFindings": [
        "змінені тренером eq-16 / старі Гантелі не мають ставати retired або мають повертатися з «Тренажери»"
      ],
      "tests": {
        "passed": 124,
        "failed": 0
      },
      "commit": "83e42c4"
    },
    {
      "id": "06",
      "title": "Схеми: груди, спина, плечі, руки, прес, гантелі",
      "requirements": [
        "G03",
        "G04",
        "G05",
        "G15",
        "G16"
      ],
      "blockedBy": [
        "05"
      ],
      "wave": 6,
      "zone": [
        "src/schemes/upper.js",
        "src/schemes/lever-pulldown.js",
        "test/schemes-upper.test.js"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T20:05:06+03:00",
      "finishedAt": "2026-10-17T20:19:20+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 143,
        "failed": 0
      },
      "commit": "efc6069"
    },
    {
      "id": "07",
      "title": "Схеми: ноги",
      "requirements": [
        "G05",
        "G13",
        "G14",
        "G15"
      ],
      "blockedBy": [
        "05"
      ],
      "wave": 6,
      "zone": [
        "src/schemes/legs.js",
        "test/schemes-legs.test.js"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "startedAt": "2026-10-17T20:05:06+03:00",
      "finishedAt": "2026-10-17T20:11:33+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 131,
        "failed": 1
      },
      "commit": "feb45f5"
    },
    {
      "id": "08",
      "title": "Новий вигляд схем, значки в меню, навігація «назад»",
      "requirements": [
        "G18",
        "G30",
        "G31"
      ],
      "blockedBy": [],
      "wave": 7,
      "zone": [
        "src/schemes/index.js",
        "src/schemes/registry.js",
        "src/schemes/svg.js",
        "src/schemes/values.js",
        "src/schemes/cardio.js",
        "src/core/catalog.js",
        "src/ui/client.js",
        "src/ui/exercise.js",
        "src/app.js",
        "css/schemes.css",
        "css/screens.css",
        "sw.js",
        "test/schemes.test.js",
        "test/catalog.test.js",
        "test/migration.test.js",
        "test/nav.test.js"
      ],
      "review": "да — фундамент",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T21:37:22+03:00",
      "finishedAt": "2026-10-17T21:51:10+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 159,
        "failed": 0
      },
      "commit": "80d40fe"
    },
    {
      "id": "09",
      "title": "Схеми верху тіла в ракурсі 45°",
      "requirements": [
        "G19",
        "G20",
        "G26",
        "G27",
        "G28",
        "G29"
      ],
      "blockedBy": [
        "08"
      ],
      "wave": 8,
      "zone": [
        "src/schemes/upper.js",
        "src/schemes/butterfly.js",
        "src/schemes/low-row.js",
        "src/schemes/lever-pulldown.js",
        "test/schemes-upper.test.js"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T21:51:12+03:00",
      "finishedAt": "2026-10-17T22:17:42+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 166,
        "failed": 0
      },
      "commit": "c30c78b"
    },
    {
      "id": "10",
      "title": "Схеми ніг і кардіо в ракурсі 45°",
      "requirements": [
        "G19",
        "G21",
        "G22",
        "G23",
        "G24",
        "G25"
      ],
      "blockedBy": [
        "08"
      ],
      "wave": 8,
      "zone": [
        "src/schemes/legs.js",
        "src/schemes/cardio.js",
        "test/schemes-legs.test.js",
        "test/schemes-cardio.test.js"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T21:51:12+03:00",
      "finishedAt": "2026-10-17T22:11:51+03:00",
      "retries": 0,
      "repairs": 1,
      "repairFindings": [
        "жим ногами — стопи не видно на платформі; зведення/розведення — ноги перехрещені, не на двох подушках"
      ],
      "tests": {
        "passed": 158,
        "failed": 8
      },
      "commit": "3f71efc"
    },
    {
      "id": "11",
      "title": "Дві ноги / одна нога, каталог v4, «Змінити роль»",
      "requirements": [
        "G33",
        "G36",
        "G38",
        "G39",
        "G32"
      ],
      "blockedBy": [],
      "wave": 10,
      "zone": [
        "src/core/model.js",
        "src/core/catalog.js",
        "src/core/chartdata.js",
        "src/ui/log-form.js",
        "src/ui/log-data.js",
        "src/ui/settings.js",
        "src/ui/start.js",
        "src/store.js",
        "test/model.test.js",
        "test/catalog.test.js",
        "test/migration.test.js",
        "test/chartdata.test.js",
        "test/role.test.js"
      ],
      "review": "да — дані користувача і скидання сховища",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-18T00:41:53+03:00",
      "finishedAt": "2026-10-18T00:57:25+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 193,
        "failed": 2
      },
      "commit": "018abcd"
    },
    {
      "id": "12",
      "title": "«Сьогодні» і «Календар» у картці клієнта",
      "requirements": [
        "G37"
      ],
      "blockedBy": [
        "11"
      ],
      "wave": 11,
      "zone": [
        "src/ui/client.js",
        "src/ui/today.js",
        "src/ui/calendar.js",
        "css/screens.css",
        "sw.js",
        "test/today.test.js"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "startedAt": "2026-10-18T00:57:27+03:00",
      "finishedAt": "2026-10-18T01:02:50+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 205,
        "failed": 5
      },
      "commit": "286a815"
    },
    {
      "id": "13",
      "title": "«Згинання ніг» і «Розгинання ніг»: схеми й вікна вибору",
      "requirements": [
        "G32",
        "G34",
        "G35"
      ],
      "blockedBy": [
        "11"
      ],
      "wave": 11,
      "zone": [
        "src/schemes/legs.js",
        "test/schemes-legs.test.js"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-18T00:57:27+03:00",
      "finishedAt": "2026-10-18T01:10:13+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 212,
        "failed": 0
      },
      "commit": "b425ab5"
    },
    {
      "id": "14",
      "title": "Ручки-Г і турнік: схеми й вікна вибору",
      "requirements": [
        "G36",
        "G38"
      ],
      "blockedBy": [
        "11"
      ],
      "wave": 11,
      "zone": [
        "src/schemes/upper.js",
        "test/schemes-upper.test.js"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-18T00:57:27+03:00",
      "finishedAt": "2026-10-18T01:07:42+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 210,
        "failed": 2
      },
      "commit": "7fd2e32"
    },
    {
      "id": "F1",
      "title": "Ремонт гілки за код-рев'ю",
      "requirements": [
        "R12",
        "R13",
        "R20",
        "R45i",
        "R47i"
      ],
      "blockedBy": [],
      "wave": 4,
      "zone": [
        "src/core/sync.js",
        "test/sync.test.js",
        "src/app.js",
        "src/ui/exchange.js",
        "src/ui/clients.js"
      ],
      "review": "да — ремонт ветки",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T19:00:35+03:00",
      "finishedAt": "2026-10-17T19:05:51+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 102,
        "failed": 0
      },
      "commit": "f8cfef2"
    },
    {
      "id": "F2",
      "title": "Підпис кардіо і надійне читання файлу",
      "requirements": [
        "R12",
        "G19"
      ],
      "blockedBy": [],
      "wave": 9,
      "zone": [
        "src/schemes/index.js",
        "src/share.js",
        "sw.js",
        "test/schemes.test.js",
        "test/share.test.js"
      ],
      "review": "да — ремонт ветки",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-10-17T22:29:48+03:00",
      "finishedAt": "2026-10-17T22:34:46+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 173,
        "failed": 0
      },
      "commit": "2b51ed7"
    },
    {
      "id": "F3",
      "title": "Системне «назад» при відкритій панелі; лічильник днів",
      "requirements": [
        "G30",
        "G39"
      ],
      "blockedBy": [],
      "wave": 12,
      "zone": [
        "src/ui/dom.js",
        "src/app.js",
        "src/ui/settings.js",
        "test/nav.test.js",
        "test/role.test.js",
        "sw.js"
      ],
      "review": "да — ремонт ветки",
      "model": "сильная",
      "status": "done",
      "retries": 0,
      "repairs": 0,
      "startedAt": "2026-10-18T01:19:42+03:00",
      "finishedAt": "2026-10-18T01:35:15+03:00",
      "tests": {
        "passed": 218,
        "failed": 0
      },
      "commit": "ee97222"
    }
  ],
  "tests": {
    "passed": 218,
    "failed": 0
  },
  "debt": {
    "placeholders": [],
    "assumptions": [],
    "emptyEnv": []
  },
  "additions": [],
  "coverage": {
    "found": 4,
    "fixed": 1,
    "deferred": 0,
    "items": []
  },
  "concerns": [
    "src/store.js — немає автоматичного тесту сховища (лише ручна перевірка в Chrome)",
    "sw.js — нові файли тасків 02/03 поза кешем, тест pwa червоний до таску 04",
    "src/schemes — картка схеми світла й у темній темі; заголовок панелі не оновлюється після перейменування",
    "src/ui/log-data.js — операції над сесіями без тестів; UI таску 02 не перевірено в браузері",
    "src/ui/client.js — плашки «Давно не зберігали копію» немає на списку клієнтів тренера (лише картка й налаштування)",
    "src/share.js — меню «Поділитися» на справжньому iPhone не перевірено; при NotAllowedError потрібен ще один натиск",
    "src/core/sync.js:297,105 — id налаштування з файлу не звіряється з settingId(clientId,exerciseId,adjustmentId)",
    "src/core/sync.js:101-106 — CHECKS не перевіряють equipmentId/exerciseId/date сесії, equipmentId налаштування, id/name вправ",
    "src/core/sync.js:197,321 — при перенесенні сесії в іншу картку updatedAt не змінюється; на двох телефонах запис може жити в різних картках",
    "src/core/sync.js:312,337 — підходи тренера і клієнта в один день на одну вправу дають дві сесії на дату",
    "src/ui/exchange.js:196 — текст «нічого не видаляється» при відновленні копії неточний",
    "src/core/catalog.js:204 — тренажер, схований тренером, показується сірим клієнту з записами на ньому",
    "src/core/catalog.js:284 — «тренер торкався видимості» визначається за наявністю поля hidden; не задокументовано",
    "src/ui/client.js:17 — сірий стиль рідкісних inline замість класу в css/screens.css",
    "src/store.js — виклик апгрейду каталогу при відкритті/replaceAll/applyChanges без автотесту",
    "src/ui/client.js:74,108-110 — збережене місце меню застосовується при кожному rerender (старий пошук/прокрутка вертаються)",
    "src/app.js:63 — isTabSwitch тестується, але не використовується; перемикання вкладок без тесту",
    "test/migration.test.js:189 — фікстура V2 будується тим самим кодом, що seedV2",
    "src/schemes/index.js renderScheme — компонування (мітка → панель → збереження) без автотесту",
    "src/store.js clearAll — без автотесту; changeRole перевірено на підробленому store"
  ],
  "blind": {
    "checked": 9,
    "matched": 9,
    "mismatches": []
  },
  "beats": [
    "2026-10-17T17:50:53+03:00",
    "2026-10-17T17:51:10+03:00",
    "2026-10-17T17:51:50+03:00",
    "2026-10-17T17:52:18+03:00",
    "2026-10-17T17:52:52+03:00",
    "2026-10-17T17:55:42+03:00",
    "2026-10-17T17:56:00+03:00",
    "2026-10-17T17:59:37+03:00",
    "2026-10-17T17:59:47+03:00",
    "2026-10-17T18:02:02+03:00",
    "2026-10-17T18:02:04+03:00",
    "2026-10-17T18:02:05+03:00",
    "2026-10-17T18:02:14+03:00",
    "2026-10-17T18:02:22+03:00",
    "2026-10-17T18:02:36+03:00",
    "2026-10-17T18:11:28+03:00",
    "2026-10-17T18:13:44+03:00",
    "2026-10-17T18:15:08+03:00",
    "2026-10-17T18:15:10+03:00",
    "2026-10-17T18:33:57+03:00",
    "2026-10-17T18:33:59+03:00",
    "2026-10-17T18:41:06+03:00",
    "2026-10-17T18:41:08+03:00",
    "2026-10-17T18:41:10+03:00",
    "2026-10-17T18:54:16+03:00",
    "2026-10-17T18:54:18+03:00",
    "2026-10-17T18:54:24+03:00",
    "2026-10-17T18:55:09+03:00",
    "2026-10-17T18:57:01+03:00",
    "2026-10-17T18:57:02+03:00",
    "2026-10-17T18:57:04+03:00",
    "2026-10-17T19:00:29+03:00",
    "2026-10-17T19:00:31+03:00",
    "2026-10-17T19:00:33+03:00",
    "2026-10-17T19:00:35+03:00",
    "2026-10-17T19:04:45+03:00",
    "2026-10-17T19:05:51+03:00",
    "2026-10-17T19:05:53+03:00",
    "2026-10-17T19:13:36+03:00",
    "2026-10-17T19:14:59+03:00",
    "2026-10-17T19:15:01+03:00",
    "2026-10-17T19:44:10+03:00",
    "2026-10-17T19:44:11+03:00",
    "2026-10-17T19:44:39+03:00",
    "2026-10-17T19:44:40+03:00",
    "2026-10-17T19:44:42+03:00",
    "2026-10-17T19:45:41+03:00",
    "2026-10-17T19:45:42+03:00",
    "2026-10-17T19:45:44+03:00",
    "2026-10-17T19:45:55+03:00",
    "2026-10-17T19:45:56+03:00",
    "2026-10-17T19:46:17+03:00",
    "2026-10-17T19:46:18+03:00",
    "2026-10-17T19:47:10+03:00",
    "2026-10-17T19:59:36+03:00",
    "2026-10-17T20:02:48+03:00",
    "2026-10-17T20:02:50+03:00",
    "2026-10-17T20:05:04+03:00",
    "2026-10-17T20:05:06+03:00",
    "2026-10-17T20:11:33+03:00",
    "2026-10-17T20:11:34+03:00",
    "2026-10-17T20:19:20+03:00",
    "2026-10-17T20:19:22+03:00",
    "2026-10-17T20:19:24+03:00",
    "2026-10-17T20:24:51+03:00",
    "2026-10-17T20:24:52+03:00",
    "2026-10-17T20:31:15+03:00",
    "2026-10-17T20:31:16+03:00",
    "2026-10-17T20:31:42+03:00",
    "2026-10-17T21:35:18+03:00",
    "2026-10-17T21:35:19+03:00",
    "2026-10-17T21:35:21+03:00",
    "2026-10-17T21:35:23+03:00",
    "2026-10-17T21:35:25+03:00",
    "2026-10-17T21:36:58+03:00",
    "2026-10-17T21:37:00+03:00",
    "2026-10-17T21:37:03+03:00",
    "2026-10-17T21:37:20+03:00",
    "2026-10-17T21:37:22+03:00",
    "2026-10-17T21:47:41+03:00",
    "2026-10-17T21:51:07+03:00",
    "2026-10-17T21:51:10+03:00",
    "2026-10-17T21:51:12+03:00",
    "2026-10-17T22:09:27+03:00",
    "2026-10-17T22:11:51+03:00",
    "2026-10-17T22:17:42+03:00",
    "2026-10-17T22:17:44+03:00",
    "2026-10-17T22:17:45+03:00",
    "2026-10-17T22:23:49+03:00",
    "2026-10-17T22:29:27+03:00",
    "2026-10-17T22:29:45+03:00",
    "2026-10-17T22:29:47+03:00",
    "2026-10-17T22:29:48+03:00",
    "2026-10-17T22:34:03+03:00",
    "2026-10-17T22:34:46+03:00",
    "2026-10-17T22:34:48+03:00",
    "2026-10-17T22:34:57+03:00",
    "2026-10-18T00:39:29+03:00",
    "2026-10-18T00:39:31+03:00",
    "2026-10-18T00:39:33+03:00",
    "2026-10-18T00:39:35+03:00",
    "2026-10-18T00:41:31+03:00",
    "2026-10-18T00:41:33+03:00",
    "2026-10-18T00:41:35+03:00",
    "2026-10-18T00:41:36+03:00",
    "2026-10-18T00:41:51+03:00",
    "2026-10-18T00:41:53+03:00",
    "2026-10-18T00:53:52+03:00",
    "2026-10-18T00:57:20+03:00",
    "2026-10-18T00:57:22+03:00",
    "2026-10-18T00:57:25+03:00",
    "2026-10-18T00:57:27+03:00",
    "2026-10-18T01:02:50+03:00",
    "2026-10-18T01:02:53+03:00",
    "2026-10-18T01:07:42+03:00",
    "2026-10-18T01:07:44+03:00",
    "2026-10-18T01:10:13+03:00",
    "2026-10-18T01:10:15+03:00",
    "2026-10-18T01:10:17+03:00",
    "2026-10-18T01:14:28+03:00",
    "2026-10-18T01:19:36+03:00",
    "2026-10-18T01:19:37+03:00",
    "2026-10-18T01:19:40+03:00",
    "2026-10-18T01:19:42+03:00",
    "2026-10-18T01:25:22+03:00",
    "2026-10-18T01:35:15+03:00",
    "2026-10-18T01:35:17+03:00",
    "2026-10-18T01:35:36+03:00"
  ],
  "rev": 129,
  "waiting": null,
  "waits": [
    {
      "kind": "briefing",
      "from": "2026-10-17T17:52:52+03:00",
      "to": "2026-10-17T17:55:42+03:00"
    }
  ],
  "log": [
    {
      "t": "2026-10-17T17:50:53+03:00",
      "k": "init"
    },
    {
      "t": "2026-10-17T17:51:10+03:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-10-17T17:52:18+03:00",
      "k": "stage",
      "id": "briefing",
      "act": "start"
    },
    {
      "t": "2026-10-17T17:52:52+03:00",
      "k": "ask",
      "kind": "briefing",
      "note": "три питання — як ставити на телефони, Метелик з двома вправами, схема чи фото"
    },
    {
      "t": "2026-10-17T17:55:42+03:00",
      "k": "answered",
      "kind": "briefing"
    },
    {
      "t": "2026-10-17T17:56:00+03:00",
      "k": "gate",
      "g": "G1",
      "ok": false,
      "open": 50,
      "total": 50
    },
    {
      "t": "2026-10-17T17:56:00+03:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-10-17T17:59:37+03:00",
      "k": "gate",
      "g": "G2",
      "ok": true,
      "found": 3,
      "fixed": 3,
      "deferred": 0
    },
    {
      "t": "2026-10-17T17:59:47+03:00",
      "k": "stage",
      "id": "plan",
      "act": "start"
    },
    {
      "t": "2026-10-17T18:02:02+03:00",
      "k": "tier",
      "v": "T2"
    },
    {
      "t": "2026-10-17T18:02:04+03:00",
      "k": "tickets",
      "n": 4
    },
    {
      "t": "2026-10-17T18:02:05+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-17T18:02:22+03:00",
      "k": "stage",
      "id": "build",
      "act": "start"
    },
    {
      "t": "2026-10-17T18:02:36+03:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T18:11:28+03:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-17T18:13:44+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-10-17T18:15:08+03:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "done",
      "tests": {
        "passed": 32,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T18:15:10+03:00",
      "k": "ticket",
      "ids": [
        "02",
        "03"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T18:33:57+03:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "done",
      "tests": {
        "passed": 50,
        "failed": 1
      }
    },
    {
      "t": "2026-10-17T18:33:59+03:00",
      "k": "add",
      "key": "concerns",
      "n": 2
    },
    {
      "t": "2026-10-17T18:41:06+03:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "done",
      "tests": {
        "passed": 50,
        "failed": 1
      }
    },
    {
      "t": "2026-10-17T18:41:08+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-10-17T18:41:10+03:00",
      "k": "ticket",
      "ids": [
        "04"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T18:54:16+03:00",
      "k": "ticket",
      "ids": [
        "04"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-17T18:54:18+03:00",
      "k": "add",
      "key": "concerns",
      "n": 2
    },
    {
      "t": "2026-10-17T18:54:24+03:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "repair",
      "note": "exercise.js не парситься як ES-модуль — програма не завантажується; + тест парсингу модулів"
    },
    {
      "t": "2026-10-17T18:55:09+03:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "done",
      "tests": {
        "passed": 99,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T18:57:01+03:00",
      "k": "ticket",
      "ids": [
        "04"
      ],
      "act": "done",
      "tests": {
        "passed": 99,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T18:57:02+03:00",
      "k": "add",
      "key": "concerns",
      "n": 5
    },
    {
      "t": "2026-10-17T18:57:04+03:00",
      "k": "stage",
      "id": "review",
      "act": "start"
    },
    {
      "t": "2026-10-17T19:00:29+03:00",
      "k": "tickets",
      "n": 5
    },
    {
      "t": "2026-10-17T19:00:31+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-17T19:00:33+03:00",
      "k": "add",
      "key": "report",
      "n": 4
    },
    {
      "t": "2026-10-17T19:00:35+03:00",
      "k": "ticket",
      "ids": [
        "F1"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T19:04:45+03:00",
      "k": "ticket",
      "ids": [
        "F1"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-17T19:05:51+03:00",
      "k": "ticket",
      "ids": [
        "F1"
      ],
      "act": "done",
      "tests": {
        "passed": 102,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T19:05:53+03:00",
      "k": "stage",
      "id": "final",
      "act": "start"
    },
    {
      "t": "2026-10-17T19:13:36+03:00",
      "k": "gate",
      "g": "G4",
      "ok": false,
      "checked": 32,
      "matched": 30
    },
    {
      "t": "2026-10-17T19:14:59+03:00",
      "k": "tests",
      "passed": 102,
      "failed": 0
    },
    {
      "t": "2026-10-17T19:15:01+03:00",
      "k": "finish",
      "result": "Офлайн-програма на телефон для тренера й клієнтів: картки, записи Л/П, графіки, схеми 3 тренажерів, обмін файлом, копія"
    },
    {
      "t": "2026-10-17T19:44:10+03:00",
      "k": "reopen"
    },
    {
      "t": "2026-10-17T19:44:39+03:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-10-17T19:44:40+03:00",
      "k": "stage",
      "id": "briefing",
      "act": "skip",
      "note": "правки однозначні; два питання без відповіді — взято запропоноване"
    },
    {
      "t": "2026-10-17T19:44:42+03:00",
      "k": "gate",
      "g": "G1",
      "ok": true,
      "open": 0,
      "total": 65
    },
    {
      "t": "2026-10-17T19:44:42+03:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-10-17T19:45:41+03:00",
      "k": "stage",
      "id": "plan",
      "act": "start"
    },
    {
      "t": "2026-10-17T19:45:42+03:00",
      "k": "tickets",
      "n": 8
    },
    {
      "t": "2026-10-17T19:45:44+03:00",
      "k": "gate",
      "g": "G3",
      "ok": false,
      "problems": 1
    },
    {
      "t": "2026-10-17T19:45:55+03:00",
      "k": "tickets",
      "n": 8
    },
    {
      "t": "2026-10-17T19:45:56+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-17T19:46:17+03:00",
      "k": "stage",
      "id": "build",
      "act": "start"
    },
    {
      "t": "2026-10-17T19:46:18+03:00",
      "k": "ticket",
      "ids": [
        "05"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T19:47:10+03:00",
      "k": "gate",
      "g": "G2",
      "ok": false,
      "found": 4,
      "fixed": 1,
      "deferred": 0
    },
    {
      "t": "2026-10-17T19:59:36+03:00",
      "k": "ticket",
      "ids": [
        "05"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-17T20:02:48+03:00",
      "k": "ticket",
      "ids": [
        "05"
      ],
      "act": "repair",
      "note": "змінені тренером eq-16 / старі Гантелі не мають ставати retired або мають повертатися з «Тренажери»"
    },
    {
      "t": "2026-10-17T20:02:50+03:00",
      "k": "add",
      "key": "concerns",
      "n": 4
    },
    {
      "t": "2026-10-17T20:05:04+03:00",
      "k": "ticket",
      "ids": [
        "05"
      ],
      "act": "done",
      "tests": {
        "passed": 124,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T20:05:06+03:00",
      "k": "ticket",
      "ids": [
        "06",
        "07"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T20:11:33+03:00",
      "k": "ticket",
      "ids": [
        "07"
      ],
      "act": "done",
      "tests": {
        "passed": 131,
        "failed": 1
      }
    },
    {
      "t": "2026-10-17T20:11:34+03:00",
      "k": "add",
      "key": "report",
      "n": 1
    },
    {
      "t": "2026-10-17T20:19:20+03:00",
      "k": "ticket",
      "ids": [
        "06"
      ],
      "act": "done",
      "tests": {
        "passed": 143,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T20:19:22+03:00",
      "k": "add",
      "key": "report",
      "n": 1
    },
    {
      "t": "2026-10-17T20:19:24+03:00",
      "k": "stage",
      "id": "review",
      "act": "start"
    },
    {
      "t": "2026-10-17T20:24:51+03:00",
      "k": "add",
      "key": "report",
      "n": 4
    },
    {
      "t": "2026-10-17T20:24:52+03:00",
      "k": "stage",
      "id": "final",
      "act": "start"
    },
    {
      "t": "2026-10-17T20:31:15+03:00",
      "k": "gate",
      "g": "G4",
      "ok": false,
      "checked": 26,
      "matched": 25
    },
    {
      "t": "2026-10-17T20:31:16+03:00",
      "k": "tests",
      "passed": 143,
      "failed": 0
    },
    {
      "t": "2026-10-17T20:31:42+03:00",
      "k": "finish",
      "result": "Правки після першого запуску: крок ваги 5/2,5, каталог залу, схеми для кожного тренажера, розділ «Гантелі»"
    },
    {
      "t": "2026-10-17T21:35:18+03:00",
      "k": "reopen"
    },
    {
      "t": "2026-10-17T21:35:21+03:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-10-17T21:35:23+03:00",
      "k": "stage",
      "id": "briefing",
      "act": "skip",
      "note": "правки однозначні; два питання без відповіді — взято запропоноване"
    },
    {
      "t": "2026-10-17T21:35:25+03:00",
      "k": "gate",
      "g": "G1",
      "ok": true,
      "open": 0,
      "total": 80
    },
    {
      "t": "2026-10-17T21:35:25+03:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-10-17T21:36:58+03:00",
      "k": "stage",
      "id": "plan",
      "act": "start"
    },
    {
      "t": "2026-10-17T21:37:00+03:00",
      "k": "tickets",
      "n": 11
    },
    {
      "t": "2026-10-17T21:37:03+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-17T21:37:20+03:00",
      "k": "stage",
      "id": "build",
      "act": "start"
    },
    {
      "t": "2026-10-17T21:37:22+03:00",
      "k": "ticket",
      "ids": [
        "08"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T21:47:41+03:00",
      "k": "ticket",
      "ids": [
        "08"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-17T21:51:07+03:00",
      "k": "add",
      "key": "concerns",
      "n": 4
    },
    {
      "t": "2026-10-17T21:51:10+03:00",
      "k": "ticket",
      "ids": [
        "08"
      ],
      "act": "done",
      "tests": {
        "passed": 159,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T21:51:12+03:00",
      "k": "ticket",
      "ids": [
        "09",
        "10"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T22:09:27+03:00",
      "k": "ticket",
      "ids": [
        "10"
      ],
      "act": "repair",
      "note": "жим ногами — стопи не видно на платформі; зведення/розведення — ноги перехрещені, не на двох подушках"
    },
    {
      "t": "2026-10-17T22:11:51+03:00",
      "k": "ticket",
      "ids": [
        "10"
      ],
      "act": "done",
      "tests": {
        "passed": 158,
        "failed": 8
      }
    },
    {
      "t": "2026-10-17T22:17:42+03:00",
      "k": "ticket",
      "ids": [
        "09"
      ],
      "act": "done",
      "tests": {
        "passed": 166,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T22:17:44+03:00",
      "k": "add",
      "key": "report",
      "n": 2
    },
    {
      "t": "2026-10-17T22:17:45+03:00",
      "k": "stage",
      "id": "review",
      "act": "start"
    },
    {
      "t": "2026-10-17T22:23:49+03:00",
      "k": "gate",
      "g": "G4",
      "ok": true,
      "checked": 15,
      "matched": 15
    },
    {
      "t": "2026-10-17T22:29:27+03:00",
      "k": "add",
      "key": "report",
      "n": 3
    },
    {
      "t": "2026-10-17T22:29:45+03:00",
      "k": "tickets",
      "n": 12
    },
    {
      "t": "2026-10-17T22:29:47+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-17T22:29:48+03:00",
      "k": "ticket",
      "ids": [
        "F2"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-17T22:34:03+03:00",
      "k": "ticket",
      "ids": [
        "F2"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-17T22:34:46+03:00",
      "k": "ticket",
      "ids": [
        "F2"
      ],
      "act": "done",
      "tests": {
        "passed": 173,
        "failed": 0
      }
    },
    {
      "t": "2026-10-17T22:34:48+03:00",
      "k": "tests",
      "passed": 173,
      "failed": 0
    },
    {
      "t": "2026-10-17T22:34:57+03:00",
      "k": "finish",
      "result": "Друга черга правок: схеми 45° для всіх тренажерів і кардіо, чисті схеми зі списком значень, значки в меню, навігація «назад»"
    },
    {
      "t": "2026-10-18T00:39:29+03:00",
      "k": "reopen"
    },
    {
      "t": "2026-10-18T00:39:33+03:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-10-18T00:39:35+03:00",
      "k": "stage",
      "id": "briefing",
      "act": "skip",
      "note": "усе уточнено в діалозі"
    },
    {
      "t": "2026-10-18T00:41:31+03:00",
      "k": "gate",
      "g": "G1",
      "ok": true,
      "open": 0,
      "total": 88
    },
    {
      "t": "2026-10-18T00:41:31+03:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-10-18T00:41:33+03:00",
      "k": "stage",
      "id": "plan",
      "act": "start"
    },
    {
      "t": "2026-10-18T00:41:35+03:00",
      "k": "tickets",
      "n": 16
    },
    {
      "t": "2026-10-18T00:41:36+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-18T00:41:51+03:00",
      "k": "stage",
      "id": "build",
      "act": "start"
    },
    {
      "t": "2026-10-18T00:41:53+03:00",
      "k": "ticket",
      "ids": [
        "11"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-18T00:53:52+03:00",
      "k": "ticket",
      "ids": [
        "11"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-18T00:57:20+03:00",
      "k": "add",
      "key": "report",
      "n": 2
    },
    {
      "t": "2026-10-18T00:57:22+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-10-18T00:57:25+03:00",
      "k": "ticket",
      "ids": [
        "11"
      ],
      "act": "done",
      "tests": {
        "passed": 193,
        "failed": 2
      }
    },
    {
      "t": "2026-10-18T00:57:27+03:00",
      "k": "ticket",
      "ids": [
        "12",
        "13",
        "14"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-18T01:02:50+03:00",
      "k": "ticket",
      "ids": [
        "12"
      ],
      "act": "done",
      "tests": {
        "passed": 205,
        "failed": 5
      }
    },
    {
      "t": "2026-10-18T01:02:53+03:00",
      "k": "add",
      "key": "report",
      "n": 1
    },
    {
      "t": "2026-10-18T01:07:42+03:00",
      "k": "ticket",
      "ids": [
        "14"
      ],
      "act": "done",
      "tests": {
        "passed": 210,
        "failed": 2
      }
    },
    {
      "t": "2026-10-18T01:07:44+03:00",
      "k": "add",
      "key": "report",
      "n": 1
    },
    {
      "t": "2026-10-18T01:10:13+03:00",
      "k": "ticket",
      "ids": [
        "13"
      ],
      "act": "done",
      "tests": {
        "passed": 212,
        "failed": 0
      }
    },
    {
      "t": "2026-10-18T01:10:15+03:00",
      "k": "add",
      "key": "report",
      "n": 1
    },
    {
      "t": "2026-10-18T01:10:17+03:00",
      "k": "stage",
      "id": "review",
      "act": "start"
    },
    {
      "t": "2026-10-18T01:14:28+03:00",
      "k": "add",
      "key": "report",
      "n": 2
    },
    {
      "t": "2026-10-18T01:19:36+03:00",
      "k": "gate",
      "g": "G4",
      "ok": true,
      "checked": 9,
      "matched": 9
    },
    {
      "t": "2026-10-18T01:19:37+03:00",
      "k": "tickets",
      "n": 17
    },
    {
      "t": "2026-10-18T01:19:40+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-10-18T01:19:42+03:00",
      "k": "ticket",
      "ids": [
        "F3"
      ],
      "act": "start"
    },
    {
      "t": "2026-10-18T01:25:22+03:00",
      "k": "ticket",
      "ids": [
        "F3"
      ],
      "act": "review"
    },
    {
      "t": "2026-10-18T01:35:15+03:00",
      "k": "ticket",
      "ids": [
        "F3"
      ],
      "act": "done",
      "tests": {
        "passed": 218,
        "failed": 0
      }
    },
    {
      "t": "2026-10-18T01:35:17+03:00",
      "k": "tests",
      "passed": 218,
      "failed": 0
    },
    {
      "t": "2026-10-18T01:35:36+03:00",
      "k": "finish",
      "result": "Третя черга правок: дві ноги / одна нога, ручки-Г, турнік, згинання й розгинання ніг, «Сьогодні» і «Календар», «Змінити роль», «назад» закриває панель"
    }
  ],
  "reqList": [
    {
      "id": "R01",
      "text": "«програму для тренера, фітнес-тренера, у якого багато клієнтів»",
      "status": "done"
    },
    {
      "id": "R02",
      "text": "«записувати, хто, скільки, на якому тренажері, робить повторювання, з якими вагами»",
      "status": "done"
    },
    {
      "id": "R03",
      "text": "«інтерактивна програма, щоб я бачив щось»",
      "status": "done"
    },
    {
      "id": "R04",
      "text": "«я відкриваю картку клієнта»",
      "status": "done"
    },
    {
      "id": "R05",
      "text": "«я натискаю кнопку цього тренажера якогось серед меню, він відображається»",
      "status": "done"
    },
    {
      "id": "R06",
      "text": "«там якась тенденція по часу, коли ми там скільки робили»",
      "status": "done"
    },
    {
      "id": "R07",
      "text": "«під цю людину, якісь конкретні там налаштування, висота сидіння, чи ще щось»",
      "status": "done"
    },
    {
      "id": "R08",
      "text": "«клієнт сам вирішив потренуватись, потренувався, вписав результати … як воно з'явиться на телефоні у тренера?»",
      "status": "done"
    },
    {
      "id": "R09",
      "text": "«Пристрій: телефон, в залі, біля тренажера.»",
      "status": "done"
    },
    {
      "id": "R10",
      "text": "«Дані: зберігаються на телефоні (без хмари, без реєстрації, без акаунтів).»",
      "status": "done"
    },
    {
      "id": "R11",
      "text": "«Користувачі: тренер і клієнти. У клієнта — та сама програма на своєму телефоні.»",
      "status": "done"
    },
    {
      "id": "R12",
      "text": "«обмін файлом через месенджер (Telegram, Viber). Клієнт натискає «надіслати тренеру» — тренер відкриває файл, і записи додаються в картку клієнта»",
      "status": "done"
    },
    {
      "id": "R13",
      "text": "«Так само в зворотний бік: тренер надсилає клієнту його дані.»",
      "status": "done"
    },
    {
      "id": "R14",
      "text": "«Клієнт може сам: записувати свої тренування»",
      "status": "done"
    },
    {
      "id": "R15",
      "text": "«[клієнт може сам] дивитись графіки прогресу»",
      "status": "done"
    },
    {
      "id": "R16",
      "text": "«[клієнт може сам] бачити й редагувати свої налаштування на тренажерах»",
      "status": "done"
    },
    {
      "id": "R17",
      "text": "«Тренажери: тренер створює список сам, під свій зал.»",
      "status": "done"
    },
    {
      "id": "R18",
      "text": "«показувати всі записи як є (дата, підходи, повторення, вага). Програма не рахує «робочу вагу»»",
      "status": "done"
    },
    {
      "id": "R19",
      "text": "«Налаштування на тренажері редагують і тренер, і клієнт; якщо змінили обоє — лишається пізніша зміна.»",
      "status": "done"
    },
    {
      "id": "R20",
      "text": "«кнопка «Зберегти копію» (файлом, напр. собі в Telegram), бо дані лише в телефоні»",
      "status": "done"
    },
    {
      "id": "R21",
      "text": "«не лише тренажери — обов'язково гантелі, турнік, кардіо (для кардіо — час, дистанція тощо)»",
      "status": "done"
    },
    {
      "id": "R22",
      "text": "«Налаштування — окремі поля під кожен тренажер (не вільний текст)»",
      "status": "done"
    },
    {
      "id": "R23",
      "text": "«прям на фото тренажера чи якось на схемки такий показати, що означає сидіння 1 або сидіння 2 … ЦЕ ДУЖЕ ВАЖЛИВО»",
      "status": "done"
    },
    {
      "id": "R24",
      "text": "«У картці клієнта на схемі видно саме його значення.»",
      "status": "done"
    },
    {
      "id": "R25",
      "text": "«Тренажери — лише одного конкретного залу; список і вигляд тренажерів беремо з сайту цього залу» (26 тренажерів, gym/equipment.md)",
      "status": "done"
    },
    {
      "id": "R26",
      "text": "«Регулювань … на сайті немає … До того на схемах — помітні заглушки, не вигадані цифри.»",
      "status": "done"
    },
    {
      "id": "R27",
      "text": "«Перший етап: схеми регулювань лише для 2–3 головних тренажерів … Схему малювати за фото з залу»",
      "status": "done"
    },
    {
      "id": "R28",
      "text": "«Вага на тренажерах з дисками — окремо на кожну руку (ліва / права), і вона може відрізнятися.»",
      "status": "done"
    },
    {
      "id": "R29",
      "text": "«Тренер дає тренажерам свої назви (напр. «Метелик») — назву тренажера тренер може змінити.»",
      "status": "done"
    },
    {
      "id": "R30",
      "text": "«Список тренажерів має стартово бути вже в програмі; тренер може додати свій тренажер.»",
      "status": "done"
    },
    {
      "id": "R31",
      "text": "«Нотатки до тренувань не потрібні.»",
      "status": "done"
    },
    {
      "id": "R32",
      "text": "«Мова інтерфейсу: українська.»",
      "status": "done"
    },
    {
      "id": "R33",
      "text": "«Метелик»: «Позиція ручок — зверху … Позицій: 5 ⚠ приблизно»; «Висота сидіння — знизу … Позицій: 5 ⚠ приблизно»",
      "status": "done"
    },
    {
      "id": "R34",
      "text": "«Метелик»: «схоже, на ньому ж виконують «Відведення рук назад» (№11), сидячи обличчям до спинки»",
      "status": "done"
    },
    {
      "id": "R35",
      "text": "Тяга нижнього блока: «Регулювань немає. Налаштування клієнта — яка ручка (кріпиться на карабін).»",
      "status": "done"
    },
    {
      "id": "R36",
      "text": "Вертикальна тяга: «Висота сидіння. Позицій: ⚠ невідомо (за аналогією з «Метеликом» — 5, уточнити)»",
      "status": "done"
    },
    {
      "id": "R37",
      "text": "«Хват — ручка одна, але є три позиції рук … зелена … червона … помаранчева … на схемі ручки підсвічено, де саме брати»",
      "status": "done"
    },
    {
      "id": "R38",
      "text": "«Назви позицій ⚠ поки умовні — тренер зможе перейменувати.»",
      "status": "done"
    },
    {
      "id": "R39",
      "text": "«Хват «збоку» не включати.»",
      "status": "done"
    },
    {
      "id": "R40",
      "text": "«Один набір ручок … однаковий для всіх тяг … Для кожного блокового тренажера в картці клієнта зберігається, з якою ручкою він працює»",
      "status": "done"
    },
    {
      "id": "R41",
      "text": "«у програмі — малюнок кожної ручки, щоб одразу було видно, яку брати»; «включай всі 5 … №6 поки не включаємо»",
      "status": "done"
    },
    {
      "id": "R42",
      "text": "«Кількість позицій, позначена «⚠ приблизно», — припущення автора; уточнити в залі.»",
      "status": "done"
    },
    {
      "id": "R43i",
      "text": "(подразумевается) тренер додає, перейменовує й видаляє клієнтів",
      "status": "done"
    },
    {
      "id": "R44i",
      "text": "(подразумевается) кожен телефон знає, чий він: тренера чи клієнта (у клієнта — лише своя картка)",
      "status": "done"
    },
    {
      "id": "R45i",
      "text": "(подразумевается) з «Зберегти копію» можна відновити дані на новому телефоні",
      "status": "done"
    },
    {
      "id": "R46i",
      "text": "(подразумевается) повторне відкриття того самого файлу не дублює записи",
      "status": "done"
    },
    {
      "id": "R47i",
      "text": "(подразумевается) файл від клієнта потрапляє саме в його картку, а не в чужу",
      "status": "done"
    },
    {
      "id": "R48i",
      "text": "(подразумевается) помилково введений запис можна виправити або видалити",
      "status": "done"
    },
    {
      "id": "R49i",
      "text": "(подразумевается) програма якось потрапляє на телефони тренера й клієнтів і працює без інтернету в залі",
      "status": "done"
    },
    {
      "id": "G01",
      "text": "«деякі тренажери є в них таке, що на одному тренажері виконуються дві абсолютно разні вправи … роби якесь зрозуміло, щоб це було зрозуміле перемикання»",
      "status": "done"
    },
    {
      "id": "G02",
      "text": "«на оцих блокових тренажерах, де ти шпильку вставляєш, там всюди кроп 5 кілограмів»",
      "status": "done"
    },
    {
      "id": "G03",
      "text": "«От той, що ми ручки розбирали з різними хватами, оце іменно той, що спереді себе ти тянеш, а не зверху» — схема з трьома хватами належить горизонтальній тязі на дисках",
      "status": "done"
    },
    {
      "id": "G04",
      "text": "«жим у тренажері … регулюється тільки висота сидіння, теж постав 5 підміток»",
      "status": "done"
    },
    {
      "id": "G05",
      "text": "«до кожного тренажера буде схемка, щоб було зрозуміло, що це за тренажер»",
      "status": "done"
    },
    {
      "id": "G06",
      "text": "«жим у блоці такого тренажера немає» (груди і плечі); не пам'ятає «Розгинання в блоці», «Жим ногами сидячи»",
      "status": "done"
    },
    {
      "id": "G07",
      "text": "«Тяга горизонтального блоку … міняється тільки ручка»; «Тяга вертикального блоку … крок 5 кг, міняється ручка … прижимний валік … хай буде»",
      "status": "done"
    },
    {
      "id": "G08",
      "text": "«Вертикальна тяга в силовому тренажері … дві позиції ручки і теж бліни. Регулюється тільки прижимний валік»",
      "status": "done"
    },
    {
      "id": "G09",
      "text": "«Згинання рук у блоці … ніхто ніколи це не робить»; гравітрони — «в кінець списка сіреньких»",
      "status": "done"
    },
    {
      "id": "G10",
      "text": "«Скручування на прес і ротація на прес. У нас це один тренажер … два перемикача»",
      "status": "done"
    },
    {
      "id": "G11",
      "text": "«Відведення рук у тренажері сидячі … тільки висота сидіння»",
      "status": "done"
    },
    {
      "id": "G12",
      "text": "«Жим у тренажері сидячі. Так, дві позиції у ручок. Крок ваги, як у блінах … Постав регуляцію висота стільця»",
      "status": "done"
    },
    {
      "id": "G13",
      "text": "«Згинання ніг лежачі регулюється валік по кругу … круглий шарнір … 5 кілограмів на крок»",
      "status": "done"
    },
    {
      "id": "G14",
      "text": "«Розгинання ніг … валік і … наклон. Два шарніра … і … видвигання спинки»",
      "status": "done"
    },
    {
      "id": "G15",
      "text": "Жим ногами лежачи, Гак-машина — «нічого не регулюється, тільки вага»; Розведення / Зведення ніг, Жим на трицепс — «просто схему»",
      "status": "done"
    },
    {
      "id": "G16",
      "text": "«для гантель додай взагалі цілий розділ … на біцепс, … на лавки на біцепс, … з молоточками, на плечі по бокам, на плечі наперед, … від груді … може ти щось додай»",
      "status": "done"
    },
    {
      "id": "G17",
      "text": "«круг ваги на дискових тренажерах 2,5 кг. 2,5, 5, 10, 15, 20»",
      "status": "done"
    },
    {
      "id": "G18",
      "text": "«треба ще сюди додати якісь міні значки щоб було понятно сразу що це за тренажер»; «на тренажери … просто менші силуети тренажера, а на гантелі просто значок гантелі»",
      "status": "done"
    },
    {
      "id": "G19",
      "text": "«давай всі тренажери попробуємо зобразити не збоку а під кутом 45»",
      "status": "done"
    },
    {
      "id": "G20",
      "text": "«жим у тренажері ось так виглядає у тебе схемка якась дивна» (+ фото із залу)",
      "status": "done"
    },
    {
      "id": "G21",
      "text": "«жим ногами лежачи у тебе також трохи дивна схема»",
      "status": "done"
    },
    {
      "id": "G22",
      "text": "Зведення ніг — «тут тоже не зрозуміло нічого н акартинці»; Розведення ніг — «не гарно виглядає, зроби якось зверху під кутом»",
      "status": "done"
    },
    {
      "id": "G23",
      "text": "Згинання ніг лежачи — «тут тоже» (+ фото VNK)",
      "status": "done"
    },
    {
      "id": "G24",
      "text": "«гак машина ось така … у нас в залі саме така» (зворотна гак-машина)",
      "status": "done"
    },
    {
      "id": "G25",
      "text": "Розгинання ніг — «регулюється спинка вперед назад, і 2 шарніра, 1 нав сам валік, 2 … вище … нахил всього цього ричага»",
      "status": "done"
    },
    {
      "id": "G26",
      "text": "Відведення рук сидячи (фото); «регулюється тільки сидіння як і було»",
      "status": "done"
    },
    {
      "id": "G27",
      "text": "Жим у тренажері сидячи — «дуже візуально складна схема, не зрозуміло взагалі що це за тренажер»",
      "status": "done"
    },
    {
      "id": "G28",
      "text": "«на прес також перемалюй тренажер»",
      "status": "done"
    },
    {
      "id": "G29",
      "text": "Жим на трицепс — «тут одна рука так одна так»",
      "status": "done"
    },
    {
      "id": "G30",
      "text": "«натискую стрілочку назад мене не викидує в головне меню а повертає попередній режим»",
      "status": "done"
    },
    {
      "id": "G31",
      "text": "«мене повертає не в ту позицію на низ сторінки біля гантель а на самий початок сторінки»",
      "status": "done"
    },
    {
      "id": "G32",
      "text": "«Згинання ніг лежачи»: «додай позиції валика ще і лавка … наче сходинкою, вирівняй»; «тут регулюється і валик і сам важіль»",
      "status": "done"
    },
    {
      "id": "G33",
      "text": "Жим ногами / Гак-машина: «платформа суцільна, там нема правої і лівої ноги, але іноді вправу виконують одною ногою, тож зроби перемикач»",
      "status": "done"
    },
    {
      "id": "G34",
      "text": "«Розгинання ніг»: «схема валіка не коректна» (+ фото Impulse)",
      "status": "done"
    },
    {
      "id": "G35",
      "text": "«Розгинання ніг»: «спинка у тебе на схемі тоже не дуже зрозуміло відображається»",
      "status": "done"
    },
    {
      "id": "G36",
      "text": "Вертикальна тяга: «ручка букою Г і ти руками берешся або прямо або під кутом 90»; Жим сидячи: «тут тоже ручка буквою Г і берешся або так або так»",
      "status": "done"
    },
    {
      "id": "G37",
      "text": "«перемикання на вікно \"сьогоднішнє тренування\" … список виконаних за день вправ, + календар … що ми робили минулого тренування»",
      "status": "done"
    },
    {
      "id": "G38",
      "text": "«до турніка намалюй схему і точку вибора додай хват, звичайний, широкий, обратний»",
      "status": "done"
    },
    {
      "id": "G39",
      "text": "«нема кнопки вийти … як мені розлогінитись і ввійти як гість»",
      "status": "done"
    }
  ],
  "gates": {
    "G1": {
      "ok": true,
      "at": "2026-10-18T00:41:31+03:00",
      "open": 0,
      "total": 88
    },
    "G3": {
      "ok": true,
      "at": "2026-10-18T01:19:40+03:00",
      "problems": 0
    },
    "G4": {
      "ok": true,
      "at": "2026-10-18T01:19:36+03:00",
      "checked": 9,
      "matched": 9
    }
  },
  "result": "Третя черга правок: дві ноги / одна нога, ручки-Г, турнік, згинання й розгинання ніг, «Сьогодні» і «Календар», «Змінити роль», «назад» закриває панель",
  "report": [
    "У день, коли і тренер, і клієнт записали ту саму вправу, історія показує цю дату двома рядками (нічого не губиться)",
    "Сховище і операції над записами не мають автоматичних тестів — перевірені вручну в браузері",
    "Меню «Поділитися» на справжньому iPhone (Telegram/Viber) варто перевірити руками; іноді потрібен ще один натиск",
    "Після перейменування тренажера заголовок відкритої панелі оновиться лише при повторному відкритті",
    "Розгинання ніг: напрям нумерації позицій (1 = ближче до коліна / менший нахил / ближче до валика) обрано умовно — перевірити в залі",
    "Притискний валік (1 = найнижче) і позиції ручок на «Жим сидячи» та «Вертикальна тяга» намальовано умовно — назви тренер змінює",
    "Тренажер, який тренер сховав сам, клієнт із записами на ньому бачить сірим (дані не губляться)",
    "Сірий стиль рідкісних тренажерів задано в коді екрана, а не в стилях",
    "Відновлення СТАРОЇ копії (до правок) на новій версії не перевірене ні тестом, ні вручну",
    "Після оновлення сайту програму на телефоні треба відкрити двічі — підказки «є оновлення» немає",
    "Позиції ручок на «Жим сидячи» і «Вертикальна тяга» намальовано умовно — фото позицій немає",
    "«Відведення рук назад» на Метелику — людина спиною, ручки частково за спинкою",
    "Перемикання вкладок працює (перевірено в браузері), але автотест перевіряє функцію, яку програма не використовує",
    "Тест міграції каталогу v2 перевіряє сам себе — наступна зміна каталогу потребує замороженої копії v2",
    "Значки в меню важкуваті (≈270 КБ розмітки); зараз рендер 17 мс, на дуже повільному телефоні ~120 мс",
    "Телефон зі старою версією покаже нові записи жиму ногами як «Л / П» — перед обміном файлами оновіть програму на всіх телефонах (відкрити двічі)",
    "Старі записи Л/П на жимі ногами й гак-машині на графіку тепер іншими кольорами",
    "«Сьогодні»: порядок вправ — за останнім підходом; якщо дописати підхід до ранішої вправи, вона переміститься в кінець",
    "Турнік намальовано узагальнено — фото турніка із залу немає",
    "Згинання ніг: що саме регулює нижній диск біля валика і напрям позицій — намальовано за припущенням, перевірити в залі",
    "«Змінити роль»: попередження називає кількість записів вправ «днями тренувань» (2 вправи за день = «2 дні»)",
    "Скидання сховища при зміні ролі не має автотесту на справжньому сховищі (логіку й підтвердження перевірено)"
  ]
}
