# CONTEXT.md — LUXury Clicker · Полный контекст проекта

> Создан: апрель 2026
> Обновлён: апрель 2026 (сессия Replit Agent)
> Статус: **в производстве** (работает на https://clicker.aliterra.space/)
> Версия Unity: WebGL Build (Builds.wasm + Builds.framework.js + Builds.data)
> Репозиторий: https://github.com/aliter230880/clicker

---

## 1. ЧТО ЭТО ЗА ПРОЕКТ

**LUXury Clicker** — P2E (play-to-earn) кликер-игра, работающая как Telegram Mini App.
Игра написана на C# в Unity, собрана в WebGL и размещена на сервере.
Игровая экономика завязана на блокчейне Polygon: токен LUX (ERC-20) и NFT-майнеры (ERC-1155).

**Суть геймплея:**
1. Пользователь входит через Telegram
2. Тапает по кристаллу — зарабатывает Gems
3. Покупает NFT-майнеров за LUX токены — они пассивно генерируют Gems
4. Gems обменивает на Gold (1000:1)
5. Приглашает друзей — получает бонусы

---

## 2. АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────┐
│                    TELEGRAM CLIENT                       │
│                 (Mini App Browser)                       │
└──────────────────────┬──────────────────────────────────┘
                       │ Telegram WebApp API
┌──────────────────────▼──────────────────────────────────┐
│              WEB SERVER (clicker.aliterra.space)         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  index.html — WebGL loader + Telegram Auth gate  │    │
│  │  Telegram Widget → LUX_Clicker_bot              │    │
│  │  Unity WebGL Build (Builds.wasm, .data, .js)    │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  PHP Backend (/miners/ folder)                   │    │
│  │  MySQL Database                                  │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ Thirdweb SDK + WalletConnect
┌──────────────────────▼──────────────────────────────────┐
│                  POLYGON (Chain ID 137)                  │
│  LUX Token ERC-20      0x7324...0796                    │
│  Miners NFT ERC-1155   0x815A...17FF                    │
│  Marketplace           0x289e...2691  (Thirdweb)         │
│  Main Wallet           0xB19a...916eB                    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. СТРУКТУРА РЕПОЗИТОРИЯ

```
Assets/Scripts/
├── Game.cs                      # Главный игровой объект, Score, AddScore
├── GameConfig.cs                # Загружает конфиг с сервера (обмен, майнеры)
├── Saver.cs                     # Автосохранение кликов (каждые 30 сек + выход)
├── ClickPanel.cs                # Обработка тапа по кристаллу
├── ClickerProtect.cs            # Защита от читов (проверка скорости кликов)
├── DatabaseNetwork.cs           # HTTP-клиент для PHP API
│
├── Account/
│   ├── AccountNetwork.cs        # Загрузка/сохранение профиля пользователя
│   └── UserData.cs              # Модель данных пользователя
│
├── Telegram/
│   └── TelegramApp.cs           # JS interop: получение данных Telegram юзера
│
├── Thirdweb/
│   ├── ThirdwebNetwork.cs       # Кошелёк, подключение, LUX баланс, ValueToWei
│   ├── NFTMarketplace.cs        # ERC-1155 NFT + DirectListings маркетплейс
│   └── UI/
│       ├── NFTField.cs          # Карточка NFT в UI
│       ├── ThirdwebModalPanel.cs # Попап подключения кошелька
│       └── ThirdwebUI.cs        # Управление состоянием UI кошелька
│
├── Mining/
│   ├── MinerStatsData.cs        # Модель данных майнера (tokenId, gemsPerDay)
│   └── UI/
│       ├── MinerField.cs        # Карточка майнера в списке
│       ├── MinerInfoPanel.cs    # Панель деталей майнера
│       ├── MinerPurchaseField.cs # UI покупки майнера
│       ├── MinersList.cs        # Список всех майнеров
│       ├── MinerWorkSwitch.cs   # Переключатель активности майнера
│       └── MiningPanel.cs       # Главная панель Mining таба
│
├── Tasks/
│   ├── DailyReward.cs           # Ежедневная награда (5000 gems / 3 часа)
│   └── InviteFriendsTask.cs     # Реферальная система
│
├── Referrals/
│   ├── ActivateReferralCodePopup.cs
│   ├── ReferralCodePanel.cs
│   └── ReferralsPanel.cs
│
├── UI/
│   ├── FlyText.cs / FlyTextSpawner.cs  # Анимация текста при тапе
│   ├── GameInterface.cs         # Главный UI контроллер
│   ├── Popups.cs                # Попапы
│   ├── SwitchUI.cs              # Переключатель элементов UI
│   ├── TabButton.cs / TabGroup.cs / TabPanels.cs  # Таб-навигация
│   └── Profile/
│       ├── ExchangePanel.cs     # Обмен Gems → Gold
│       └── ProfilePanel.cs      # Профиль пользователя
│
└── Helps/
    ├── GroupsUpdater.cs         # Batch-обновление групп UI
    ├── Icons.cs                 # Хранилище иконок
    └── ObjectPool.cs            # Пул объектов для оптимизации

artifacts/mockup-sandbox/               # Интерактивный UI прототип (React/Vite)
├── vite.config.ts                      # Vite конфиг + gameApiPlugin (mock backend)
├── mockupPreviewPlugin.ts              # Плагин для обнаружения компонентов
├── public/
│   ├── miners-config.json              # Статичный fallback конфиг игры
│   ├── crystal.webm                    # Анимированный кристалл (7.1 MB)
│   ├── crystal.png                     # Статичная версия кристалла
│   └── polygon.png                     # Логотип Polygon
└── src/components/mockups/game/
    ├── LuxUI.tsx                       # Главный UI (Auth, Home, Mining, Tasks, Profile)
    ├── GameUI.tsx                      # Предыдущая версия макета
    └── ContractsAnalysis.tsx           # Визуализация смарт-контрактов

attached_assets/                        # Оригинальные файлы от пользователя
├── get-miners-config_*.php             # PHP источник конфига майнеров
├── miners-config_*.php                 # PHP константы конфига
├── correct-datetime_*.php              # PHP проверка временного интервала
├── index_*.html                        # Оригинальный WebGL загрузчик
└── style_*.css                         # Стили WebGL загрузочного экрана
```

---

## 4. СМАРТ-КОНТРАКТЫ (Polygon Mainnet)

| Контракт | Адрес | Стандарт | Назначение |
|---|---|---|---|
| **LUX Token** | `0x7324c346b47250A3e147a3c43B7A1545D0dC0796` | ERC-20 | Игровая валюта для покупки NFT |
| **Miners NFT** | `0x815AFC2bcDec02d5b0447508EE41476fFa3817FF` | ERC-1155 | NFT-майнеры (токены 4, 5, 6, 7) |
| **Marketplace** | `0x289e25Ef58C00cE66eb726a8a4672B706e2f2691` | Thirdweb DirectListings | Продажа NFT за LUX токены |
| **Main Wallet** | `0xB19aEe699eb4D2Af380c505E4d6A108b055916eB` | EOA | Кошелёк-владелец листингов |

### Флоу покупки NFT-майнера:
```
1. Пользователь → ERC20_Allowance() → проверить разрешение
2. Если allowance < цена → ERC20_Approve(marketplace, amount)
3. Marketplace_DirectListings_BuyFromListing(listingId, buyer, 1, LUX, price)
4. NFT переходит к покупателю, LUX уходит продавцу
```

---

## 5. КОНФИГУРАЦИЯ ИГРЫ (miners-config.php / miners-config.json)

| Параметр | Значение |
|---|---|
| **Обмен** | 1000 Gems = 1 Gold |
| **Daily Reward** | 5 000 Gems |
| **Cooldown награды** | 3 часа (10 800 секунд) |
| **Telegram бот** | @LUX_Clicker_bot |

### NFT Майнеры:

| Token ID | Название | Gems/день |
|---|---|---|
| 4 | Basic Miner | 30 000 |
| 5 | Advanced Miner | 70 000 |
| 6 | Elite Miner | 150 000 |
| 7 | Pro Miner | 350 000 |

---

## 6. БАЗА ДАННЫХ

### Таблица `tg_clicker`
| Поле | Тип | Описание |
|---|---|---|
| `telegram` | VARCHAR | Telegram ID пользователя |
| `score` | BIGINT | Количество Gems |

### Таблица `tg_miners`
| Поле | Тип | Описание |
|---|---|---|
| `wallet_address` | VARCHAR | Адрес кошелька Polygon |
| `miners` | JSON | Массив майнеров с их состоянием |

### Структура JSON поля `miners`:
```json
[
  {
    "tokenId": "5",
    "miners": [
      { "isActive": true,  "lastTimeReset": "2026-04-24 10:00:00" },
      { "isActive": false, "lastTimeReset": "2026-04-24 10:00:00" }
    ]
  }
]
```

---

## 7. PHP API ENDPOINTS (Production — clicker.aliterra.space)

### POST /miners/get-miners-config.php
- Без параметров
- Возвращает: JSON конфиг (обменный курс, список майнеров, daily reward)
- Формат ответа: `{ success: bool, data: string }` — data может быть JSON-строкой внутри

### POST /miners/get-miners.php
| Параметр | Описание |
|---|---|
| `walletAddress` | Адрес кошелька |
| `nftMiners` | JSON массив NFT из блокчейна (или "-" если не нужна синхронизация) |
- Синхронизирует список майнеров в БД с реальными NFT из блокчейна
- Возвращает актуальный список майнеров со статусами

### POST /miners/set-miner-active.php
| Параметр | Описание |
|---|---|
| `walletAddress` | Адрес кошелька |
| `minerId` | Token ID (4/5/6/7) |
| `minerIndex` | Порядковый номер майнера |
| `active` | true/false |
- Включает/выключает конкретного майнера
- При активации сбрасывает lastTimeReset

### POST /miners/withdrawal-miners.php
| Параметр | Описание |
|---|---|
| `telegram` | Telegram ID |
| `walletAddress` | Адрес кошелька |
| `nftMiners` | JSON массив NFT из блокчейна |
- Формула: `gemsPerDay × (текущееВремя - lastTimeReset) / 86400`
- Добавляет Gems к score пользователя
- Сбрасывает lastTimeReset

### POST /correct-datetime.php
| Параметр | Описание |
|---|---|
| `dateTime` | Дата-время для проверки |
- Возвращает разницу в секундах между переданным временем и сейчас
- Используется для проверки cooldown daily reward

---

## 8. MOCK API (Replit Vite Dev — Только для разработки)

Реализован в `artifacts/mockup-sandbox/vite.config.ts` как Vite плагин `gameApiPlugin`.
Хранит данные в памяти (`mockDB: Map<string, UserRow>`) — сбрасывается при рестарте сервера.
Все endpoint'ы на пути `/__mockup/api/*`, метод POST, CORS открыт.

### POST /__mockup/api/game-config
- Без параметров
- Читает `public/miners-config.json` и возвращает его
- Fallback если файл не найден: `{ success: false, data: "Config read error" }`

### POST /__mockup/api/user
| Параметр | Описание |
|---|---|
| `telegram` | Telegram ID (строка) |
- Если пользователя нет — создаёт с `score: 0`, `lastDailyReward: null`
- Возвращает: `{ telegram, score, lastDailyReward }`

### POST /__mockup/api/claim-daily
| Параметр | Описание |
|---|---|
| `telegram` | Telegram ID |
- Проверяет cooldown по `dailyRewardTime` из конфига
- Если cooldown прошёл: начисляет `dailyReward` к score, обновляет `lastDailyReward`
- Если cooldown активен: возвращает `{ success: false, data: "{nextClaimIn, score}" }`
- Если успех: `{ score, reward, nextClaimIn }`

### POST /__mockup/api/save-score
| Параметр | Описание |
|---|---|
| `telegram` | Telegram ID |
| `score` | Новое значение score (число) |
- Обновляет score в mockDB
- Возвращает: `{ telegram, score }`

---

## 9. LUXUI.TSX — ВЕБ-СТЕК РЕДИЗАЙН

> Файл: `artifacts/mockup-sandbox/src/components/mockups/game/LuxUI.tsx`
> Превью: `/__mockup/preview/game/LuxUI`
> Shape на canvas: `shape:lux-ui`

### Стек и визуальная система:
- **React + TypeScript** — без внешних UI-библиотек (всё inline styles + injected CSS)
- **Glassmorphism** — `backdrop-filter: blur(24-32px) saturate(180-200%)` на всех панелях
- **Анимированные блобы** — три жидкостных радиальных градиента (cyan/purple/gold), CSS keyframes
- **Сетка-хейз** — 60px grid overlay поверх фона для глубины
- **Neon glow** — `text-shadow` и `box-shadow` с `rgba(0,212,255,...)` и `rgba(124,58,237,...)`
- **Shimmer-текст** — анимированный градиент на балансе gems и кнопке Daily Reward

### Кристалл (canvas luma-key):
- Оригинальный анимированный кристалл загружается как `crystal.webm` (7.1 MB)
- Поскольку webm не содержит альфа-канала, применяется **попиксельное удаление фона**:
  - Скрытый `<video>` + видимый `<canvas>` рисуются через `requestAnimationFrame`
  - Для каждого пикселя: `lum = 0.299R + 0.587G + 0.114B`
  - `lum < 20` → alpha = 0 (прозрачно)
  - `lum 20–55` → плавное затухание (мягкий край)
  - `lum > 55` → оригинальный пиксель кристалла
- Результат: кристалл парит без квадратного фона

### Экраны (4 таба):
| Таб | Содержимое |
|---|---|
| **Home** | Счётчик gems, тап по кристаллу (+1 fly-text), кольца-орбиты, Daily Reward |
| **Mining** | Кошелёк (connect/disconnect), shop NFT-майнеров #4–7, owned список |
| **Tasks** | Daily Reward 5000 gems (3ч cooldown), реферальная система |
| **Profile** | Обмен 1000 gems → 1 Gold, Telegram профиль, статистика |

### Auth экран:
- Показывает логотип кристалла, информацию об обмене и майнерах
- Кнопка "Войти как [Name]" если Telegram context доступен (`window.Telegram.WebApp`)
- Кнопка "Log in with Telegram" если открыто в обычном браузере
- Fallback ID: `"demo_user"` (если не в Telegram)
- При ошибке API: красное сообщение под кнопкой (не автологин)

### Цветовая палитра:
| Цвет | HEX | Применение |
|---|---|---|
| Нео-голубой | `#00d4ff` | Основной акцент, кнопки, активные табы |
| Фиолетовый | `#7c3aed → #a855f7` | Градиенты, блобы |
| Shimmer-золото | `#ffd700 / #c9a227` | Daily Reward, score |
| Розовый неон | `#ff4cf2` | Pro Miner (tokenId 7) |

### State машина (LuxUI root):
```typescript
const [authed, setAuthed]     = useState(false);        // показывает Auth или Home
const [tab, setTab]           = useState<Tab>("home");   // home | mining | tasks | profile
const [config, setConfig]     = useState<GameConfig>(DEFAULT_CONFIG);
const [tgUser, setTgUser]     = useState<TgUser | null>(null);
const [userData, setUserData] = useState<UserData | null>(null);
const [loginError, setLoginError] = useState<string | null>(null);
```

### API flow в браузере:
1. Mount → `POST /__mockup/api/game-config` → setConfig
2. useEffect → detect `window.Telegram.WebApp` → setTgUser (не логинит!)
3. Нажатие кнопки → `handleLogin(telegramId)` → `POST /__mockup/api/user`
4. Успех → setUserData + setAuthed(true) → переход на Home
5. Ошибка → setLoginError → красный текст под кнопкой
6. Home → автосохранение score каждые 5 сек → `POST /__mockup/api/save-score`
7. Daily Reward → `POST /__mockup/api/claim-daily`

### Важно про Telegram Mini App (не OAuth):
- В Telegram не нужно "подключаться" — Telegram сам подставляет данные в `window.Telegram.WebApp.initDataUnsafe.user`
- Пользователь открывает бот → нажимает "Open Mini App" → данные уже есть
- Кнопка Login просто читает эти данные и отправляет на backend

---

## 10. НАЙДЕННЫЕ БАГИ И УЯЗВИМОСТИ

### КРИТИЧЕСКИЕ (Unity C#)

#### БАГ #1 — Устаревший класс WWW (DatabaseNetwork.cs)
**Файл:** `Assets/Scripts/DatabaseNetwork.cs`, метод `Sending()`
**Проблема:** Unity удалил класс `WWW` в версии 2022+. Код использует его вместо `UnityWebRequest`.
```csharp
// ТЕКУЩИЙ КОД (сломан в Unity 2022+):
WWW www = new WWW(Url + m_sqlPrefix + "/" + fileName, form);
yield return www;

// ПРАВИЛЬНЫЙ КОД (закомментирован в том же файле):
UnityWebRequest request = UnityWebRequest.Post(Url + m_sqlPrefix + "/" + fileName, form);
request.SetRequestHeader("Access-Control-Allow-Origin", "*");
yield return request.SendWebRequest();
```
**Решение:** Раскомментировать правильный метод, удалить старый.

#### БАГ #2 — Локаль в ValueToWei (ThirdwebNetwork.cs)
**Файл:** `Assets/Scripts/Thirdweb/ThirdwebNetwork.cs`, метод `ValueToWei()`
**Проблема:** `float.ToString()` использует системную локаль. В русской локали разделитель "," вместо ".".
```csharp
// ПРОБЛЕМА:
string strValue = (value * Mathf.Pow(10, decimals)).ToString();
string[] parts = strValue.Split(','); // падает в en-локали

// РЕШЕНИЕ:
using System.Globalization;
string strValue = (value * Mathf.Pow(10, decimals)).ToString(CultureInfo.InvariantCulture);
string[] parts = strValue.Split('.'); // всегда точка
```
**Последствия:** Неверная сумма в транзакции с LUX токенами.

### ВЫСОКИЕ (Unity C#)

#### БАГ #3 — Debug-код в Update() (Game.cs)
**Файл:** `Assets/Scripts/Game.cs`
**Проблема:** В production-сборке активен отладочный код — нажатие R отправляет реальный запрос к серверу с хардкодным кошельком.
**Решение:** Удалить или обернуть в `#if UNITY_EDITOR`.

#### БАГ #4 — Незащищённый синглтон (Saver.cs)
**Файл:** `Assets/Scripts/Saver.cs`, метод `Awake()`
```csharp
// ПРАВИЛЬНО:
if (Instance != null && Instance != this) { Destroy(gameObject); return; }
Instance = this;
DontDestroyOnLoad(gameObject);
```

### СРЕДНИЕ (Unity C#)

#### БАГ #5 — Race condition в Saver.cs
`_clicksCount` изменяется из UI-потока и сбрасывается в корутине без синхронизации.

#### БАГ #6 — Null WWWForm в запросах (GameConfig.cs)
```csharp
// НЕПРАВИЛЬНО:
DatabaseNetwork.Instance.Send(null, "miners/get-miners-config.php", ...);
// ПРАВИЛЬНО:
DatabaseNetwork.Instance.Send(new WWWForm(), "miners/get-miners-config.php", ...);
```

### БЕЗОПАСНОСТЬ (PHP Backend)

#### SQL Injection (set-miner-active.php + withdrawal-miners.php)
Прямая подстановка `$walletAddress` в SQL без prepared statements.
```php
// ОПАСНО:
$query = "UPDATE tg_miners SET miners = '" . json_encode($miners) .
         "' WHERE wallet_address = '" . $walletAddress . "';";

// БЕЗОПАСНО (PDO):
$stmt = $pdo->prepare("UPDATE tg_miners SET miners = ? WHERE wallet_address = ?");
$stmt->execute([json_encode($miners), $walletAddress]);
```

---

## 11. КОНФИГУРАЦИЯ ДЕПЛОЯ (Dev → Prod)

### Хостинг
- **Разработка:** Replit Mockup Sandbox (Vite dev сервер, mock API)
- **Продакшн:** reg.ru PHP-хостинг — статические файлы React + PHP-бэкенд

### API_BASE — переключатель окружения
В `LuxUI.tsx` единственная точка переключения между dev и prod:
```typescript
// Dev  → VITE_API_BASE не задан → fallback "/__mockup/api" (Vite mock)
// Prod → VITE_API_BASE=https://clicker.aliterra.space/api (.env.production)
const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/__mockup/api";
```

Все 7 API-вызовов используют `API_BASE`:
```typescript
apiPost(`${API_BASE}/game-config`, ...)           // POST /api/game-config
apiPost(`${API_BASE}/user`, ...)                  // POST /api/user
apiPost(`${API_BASE}/claim-daily`, ...)           // POST /api/claim-daily
apiPost(`${API_BASE}/save-score`, ...)            // POST /api/save-score
apiPost(`${API_BASE}/miners`, ...)                // POST /api/miners
apiPost(`${API_BASE}/set-miner-active`, ...)      // POST /api/set-miner-active
apiPost(`${API_BASE}/withdrawal-miners`, ...)     // POST /api/withdrawal-miners
```

### Env-файлы
| Файл | Назначение | VITE_API_BASE |
|---|---|---|
| `.env.development` | Dev режим | не задан (fallback `/__mockup/api`) |
| `.env.production` | Prod сборка | `https://clicker.aliterra.space/api` |

### Static fallback конфига
```typescript
const STATIC = `${import.meta.env.BASE_URL}miners-config.json`;
// Dev  → /__mockup/miners-config.json
// Prod → /miners-config.json (нужен файл на хостинге)
```

### Файлы для TypeScript
- `src/vite-env.d.ts` — декларирует `VITE_API_BASE` в типе `ImportMetaEnv`

### Что нужно создать на PHP-хостинге перед деплоем
На reg.ru (или clicker.aliterra.space) создать папку `/api/` с 7 PHP-файлами:
| PHP-файл | Описание |
|---|---|
| `api/game-config.php` | Возвращает конфиг игры (exchangeRate, dailyReward, minersStats) |
| `api/user.php` | Создаёт/возвращает пользователя по Telegram ID |
| `api/save-score.php` | Сохраняет score в `tg_clicker` |
| `api/claim-daily.php` | Начисляет дневную награду с cooldown-проверкой (3ч) |
| `api/miners.php` | Синхронизирует NFT-список с таблицей `tg_miners`, возвращает MinerGroup[] |
| `api/set-miner-active.php` | Ставит/снимает майнера в Active/Idle, сбрасывает lastTimeReset |
| `api/withdrawal-miners.php` | Считает накопленные gems по всем активным майнерам и добавляет к score |

**Таблица tg_miners** (добавлена в `backend/schema.sql`):
```sql
CREATE TABLE tg_miners (
    wallet_address VARCHAR(64) NOT NULL PRIMARY KEY,
    miners LONGTEXT NOT NULL DEFAULT '[]'
);
-- miners column = JSON: [{tokenId, miners:[{isActive, lastTimeReset}]}]
```

### Команды для сборки и деплоя
```bash
# Собрать production-билд:
cd artifacts/mockup-sandbox && npm run build

# Результат в папке artifacts/mockup-sandbox/dist/
# Загрузить содержимое dist/ на reg.ru через FTP/файловый менеджер
```

---

## 12. ИСПРАВЛЕНИЯ СДЕЛАННЫЕ В ТЕКУЩЕЙ СЕССИИ (апрель 2026)

### Исправление 1 — Silent auto-login убран
**Проблема:** `handleLogin` имел `else { setAuthed(true) }` — тихо перебрасывал на Home даже при ошибке API.
**Исправление:** Убран fallback. Теперь: API ошибка → `setLoginError(msg)` → красный текст под кнопкой.

### Исправление 2 — loginError пробрасывается в AuthScreen
**Проблема:** `loginError` state существовал в root компоненте, но не передавался в `AuthScreen`.
**Исправление:** Добавлен проп `loginError?: string | null` в AuthScreen, выводится под кнопкой логина.

### Исправление 3 — Минимальная задержка 800ms при логине
**Проблема:** API отвечал за ~10ms, кнопка "Connecting…" мелькала незаметно.
**Исправление:** `Promise.all([onLogin(id), new Promise(r => setTimeout(r, 800))])` — гарантирует что статус виден.

### Исправление 4 — Серверные логи в gameApiPlugin
**Добавлено:** `console.log` для каждого POST запроса к `/__mockup/api/*` — видны в Vite workflow логах Replit.

### Исправление 5 — API_BASE для переключения Dev/Prod
**Что сделано:**
- Добавлена константа `const API_BASE = import.meta.env.VITE_API_BASE ?? "/__mockup/api"` в `LuxUI.tsx`
- Все 4 хардкодных URL (`/__mockup/api/*`) заменены на `${API_BASE}/*`
- Static fallback конфига: `${import.meta.env.BASE_URL}miners-config.json` (работает и в dev, и в prod)
- Созданы `.env.development` (без VITE_API_BASE) и `.env.production` (с VITE_API_BASE=https://clicker.aliterra.space/api)
- Создан `src/vite-env.d.ts` с TypeScript-типом для `VITE_API_BASE`
**Результат:** Для смены бэкенда достаточно изменить одну переменную в `.env.production` — никакого ручного поиска URL в коде.

---

## 13-A. ИСПРАВЛЕНИЯ МАЙ 2026 (React UI — Blockchain)

### Исправление 6 — Thirdweb SDK полностью удалён
**Причина:** npm-пакет thirdweb несовместим со средой (Vite + canvas iframe).
**Решение:** Все блокчейн-вызовы переписаны на чистые JSON-RPC запросы через `fetch`.
- RPC URL: `https://137.rpc.thirdweb.com/<CLIENT_ID>`
- Нет никаких npm-пакетов для блокчейна — только стандартный fetch
- ABI encode/decode реализован вручную (HEX-строки, BigInt)

### Исправление 7 — SmartWallet/AccountFactory удалены
**Принцип:** "чем подключился — тем и пользуешься". EOA кошелёк = единственный аккаунт.
- Удалены: `smartAddr`, `walletLoading`, AccountFactory lookup
- Транзакции: EOA → `LUX.approve()` → EOA → `marketplace.buyFromListing()`
- `sendTx()` использует `window.ethereum.request({ method: "eth_sendTransaction" })`

### Исправление 8 — WalletModal в стиле Thirdweb "Sign In"
**Двухшаговый флоу:**
- Step 1: соцсети (G/DC/TG/X/Farcaster) + email + phone + passkey + "Connect a Wallet"
- Step 2: список кошельков (MetaMask/Trust/Coinbase/Rainbow) + кнопка назад
- Дизайн: тёмный modal, центрирован, совпадает со скриншотом-референсом

### Исправление 9 — Критический баг: неверный порядок полей Listing struct
**Проблема:** `decodeListings()` использовал НЕВЕРНЫЙ порядок полей.
Thirdweb DirectListings V3 реальный порядок:
```
base+0: listingId, base+1: tokenId, base+2: quantity, base+3: pricePerToken
base+4: startTimestamp, base+5: endTimestamp
base+6: listingCreator, base+7: assetContract, base+8: currency
base+9: tokenType, base+10: status, base+11: reserved
```
**Следствие бага:** `listingCreator` читался из поля tokenId (= 0), фильтр по адресу продавца ВСЕГДА давал 0 совпадений → листинги не показывались → цены были захардкожены → кнопка "No listing" (disabled).
**Исправление:** Корректный порядок + фильтр `status !== 1n` (пропускать COMPLETED/CANCELLED).

### Исправление 10 — Реальные цены NFT-майнеров с блокчейна
Контракт: `0x289e25Ef58C00cE66eb726a8a4672B706e2f2691` (Polygon 137)
Продавец: `0xB19aEe699eb4D2Af380c505E4d6A108b055916eB`
| tokenId | Тип | Цена | qty |
|---|---|---|---|
| 4 | Basic | **50 LUX** | 3 |
| 5 | Advanced | **100 LUX** | 6 |
| 6 | Elite | **200 LUX** | 6 |
| 7 | Pro | **500 LUX** | 3 |

### Исправление 11 — Кошелёк не сбрасывается при смене таба
**Проблема:** `MiningScreen` размонтируется при смене вкладки → весь локальный state (eoaAddr, miners, luxBal) теряется.
**Решение:** `eoaAddr` сохраняется в `sessionStorage` при каждом изменении; при маунте восстанавливается из хранилища + перезагружается LUX-баланс.
```typescript
const [eoaAddr, setEoaAddr] = useState<string | null>(() =>
  sessionStorage.getItem("lux_eoa")
);
function persistEoa(addr: string | null) {
  setEoaAddr(addr);
  if (addr) sessionStorage.setItem("lux_eoa", addr);
  else sessionStorage.removeItem("lux_eoa");
}
```

### Исправление 12 — Скрытие нативного скроллбара
**Проблема:** Браузерный скроллбар в области Mining Screen выглядит не в стиле UI.
**Решение:** CSS-класс `.lux-scroll` скрывает полосу прокрутки на всех движках:
```css
.lux-scroll::-webkit-scrollbar { display: none; }
.lux-scroll { -ms-overflow-style: none; scrollbar-width: none; }
```

### Исправление 13 — Мгновенный переход в Marketplace после подключения
**Прежнее поведение:** Переход в shop-таб только ПОСЛЕ async NFT-чека → при RPC-ошибке пользователь оставался на "owned".
**Новое поведение:** `setSubTab("shop")` вызывается НЕМЕДЛЕННО после `persistEoa(addr)`, NFT-чек идёт в фоне. Если NFT найдены — автоматически переключается на "owned".

---

### Структура файлов в GitHub (собственная папка Replit Agent)
Репозиторий: `https://github.com/aliter230880/clicker`
Папка агента: `react-web-ui/`
```
react-web-ui/
├── LuxUI.tsx          ← главный компонент (все экраны + blockchain)
├── vite.config.ts     ← конфигурация Vite + mock API plugin
├── package.json       ← зависимости (React, Vite, TypeScript)
└── README.md          ← описание запуска
```

---

## 13-B. ИСПРАВЛЕНИЯ МАЙ 2026 (Devin session — Profile / Tasks / Backend sync)

Сессия Devin продолжила работу над `react-web-ui/LuxUI.tsx`. Ветка
`devin/1778748639-profile-tasks-features`, PR
`https://github.com/dim14082025/clicker/pull/1` (форк, т.к. у этого
аккаунта нет write-доступа к `aliter230880/clicker`). Три коммита поверх
тэга `f50e186`.

### Исправление 14 — Variant A: Wallet/Exchange/Referrals/Daily Tasks (`398f89a`)
**Проблема:** На Profile-экране кнопки Wallet / Exchange Gems / Referrals
не имели обработчиков (мёртвая верстка), Daily Tasks был статичным списком.

**Решение:** В корне `LuxUI` подняты модалки `WalletModal` / `ExchangeModal` /
`ReferralsModal`, добавлен общий wallet-state через новый хук
`useSyncedSessionString` + CustomEvent bus `lux:session-sync`, Tasks теперь
читает живой прогресс с backend, тап по кристаллу отправляет `clicksDelta`
на `/save-score` для прогресса задания `click100`.

**Backend (`react-web-ui/vite.config.ts`):**
- Добавлены колонки SQLite (идемпотентно через `ALTER TABLE … ADD COLUMN`):
  `gold`, `referral_code`, `invited_by`, `invited_count`, `clicks_today`,
  `clicks_date`, `login_days`, `last_login_date`, `claimed_tasks`.
- `/__mockup/api/user` теперь генерирует `referralCode` при первом логине
  и крутит дневные счётчики (`clicks_today` сбрасывается при смене даты,
  `login_days` инкрементится в последовательные дни).
- Новые эндпоинты:
  - `POST /exchange-gold` — сжигает gems, начисляет gold по курсу `1000 💎 = 1 ◈`
  - `POST /referral-info` — возвращает свой код, `invitedCount`, `invitedBy`, `bonusPerInvite`
  - `POST /activate-referral` — связывает invitee с inviter, начисляет inviter'у `+50 000 💎`
  - `POST /tasks` — возвращает 3 задания (`click100`/`login7`/`invite1`) с живым прогрессом
  - `POST /claim-task` — выплачивает награду, если выполнено и ещё не получено

### Исправление 15 — Визуальный парити с Replit-референсом (`1f022c6`)
**Проблема:** Локальная сборка отличалась от Replit-референса по двум пунктам:
1. Кристалл был плоской призмой вместо радужно-преломляющего арта.
2. Mining-экран без подключённого кошелька показывал заглушку "Подключите
   кошелёк" вместо полного маркетплейса.

**Решение:**
- `react-web-ui/public/crystal.png` заменён на пользовательский асет
  (`790x1280`, прозрачный фон).
- `MiningScreen`: `subTab` по умолчанию = `"shop"` при `eoaAddr === null`
  (и форсится в `"shop"` при дисконнекте), так что новый пользователь
  сразу видит 4 карточки майнеров (Basic/Advanced/Elite/Pro). При
  подключении кошелька автоматически переключается на `"owned"`.

### Исправление 16 — Кросс-табовый refresh userData (`3aa7ed6`)
**Проблема:** `userData` (gems / gold / streaks / invitedCount) подтягивался
один раз при логине, потом обновлялся только частично из конкретных
действий. При переходе на Profile после действий в Tasks (claim, referral
activation) данные могли быть устаревшими.

**Решение:**
- В корневой `LuxUI` добавлена `refreshUserData()`, дёргающая
  `/__mockup/api/user` для свежего снимка.
- `useEffect([tab, authed])` вызывает её при переходе на вкладки
  `profile` или `tasks`.
- `ProfileScreen` подгружает `/referral-info` на mount и отображает
  реальный `invitedCount` в подписи Referrals-кнопки
  (`Приглашено: N · +Y K 💎 за каждого`) вместо статичного teaser.

### Проверено end-to-end на превью
- Claim Daily Reward в Tasks (+5 000 💎) → переключение на Profile →
  Gems = `5 000 💎`.
- Exchange → Max → Exchange → Gems = `0 💎`, Gold = `5 ◈`.
- Mining (нет кошелька) → видна полная карта 4 майнеров с ценами в LUX.
- Referrals row показывает `Приглашено: 0 · +50K 💎 за каждого` (живые данные).

### Что осталось / не сделано в этой сессии
- Live Replit-референс был spal — пиксельное сравнение по живой ссылке
  не делалось; сверка велась по архивным скриншотам и упрощённому
  `artifacts/mockup-sandbox/.../LuxUI.tsx`.
- Tasks-экран сохраняет прогресс-бары и кнопки `Claim`/`Go` (это часть
  Variant A; в Replit-референсе они проще — `✅`/`⬜` ряды). Если нужен
  чистый визуал референса — нужно убрать прогресс UI, но потеряется
  функциональный трекинг.
- Предсуществующая ошибка типов `TS2367` в `BuyModal` (`phase === "idle"`
  около строки 1167) — из `main`, не из этого PR. Просится follow-up fix.
- В форке нет CI — единственная проверка это план `/home/ubuntu/test-plan.md`.

### Локальный dev-стек

Используется ПАРАЛЛЕЛЬНАЯ песочница для превью (так как у `react-web-ui/`
есть зависимости от `mockupPreviewPlugin`, который живёт только в
Replit-окружении):

- `/home/ubuntu/repos/clicker/react-web-ui/LuxUI.tsx` — источник правды,
  коммитится в git.
- `/home/ubuntu/lux-preview/src/LuxUI.tsx` — **symlink** на источник правды.
- `/home/ubuntu/lux-preview/vite.config.ts` — упрощённый in-memory мок-бэкенд
  с теми же эндпоинтами `POST /__mockup/api/*` (без SQLite).
- `/home/ubuntu/lux-preview/public/crystal.png` — копия ассета, чтобы
  превью показывал ту же картинку.

Запуск:
```bash
cd /home/ubuntu/lux-preview && nohup npm run dev > /tmp/lux-preview.log 2>&1 &
```

Слушает `http://localhost:5173/`. Через `deploy expose port=5173`
получается публичный basic-auth URL.

---

## 12. ТЕХНИЧЕСКИЙ СТЕК

| Компонент | Технология |
|---|---|
| Игровой движок | Unity (WebGL Export) |
| Язык Unity | C# (.NET Standard 2.1) |
| Блокчейн SDK | Thirdweb Unity SDK |
| Кошелёк | WalletConnect |
| Сеть | Polygon (MATIC), Chain ID 137 |
| Бэкенд (prod) | PHP + MySQL |
| Фронтенд-обёртка | Vanilla HTML/JS |
| Telegram | Mini App API + Login Widget |
| Маркетплейс | Thirdweb DirectListings |
| Прототип UI | React + TypeScript + Vite + Tailwind |
| Mock бэкенд | Vite Plugin (gameApiPlugin) — in-memory Map |
| Хостинг прото | Replit Mockup Sandbox (port 23636) |

---

## 13. ЧТО МОЖНО МЕНЯТЬ БЕЗ UNITY

| Что | Файл | Можно без Unity |
|---|---|---|
| Telegram auth логика | `webgl/index.html` | ✅ |
| Конфиг майнеров | `backend/miners-config.php` | ✅ |
| SQL-инъекция фикс | `backend/*.php` | ✅ |
| Daily reward время | `backend/miners-config.php` | ✅ |
| Gems/день майнеров | `backend/miners-config.php` | ✅ |
| Стили загрузочного экрана | `webgl/TemplateData/style.css` | ✅ |
| LuxUI редизайн | `artifacts/mockup-sandbox/...` | ✅ |
| Mock API для тестов | `artifacts/mockup-sandbox/vite.config.ts` | ✅ |
| Внутриигровой UI | Unity Scenes/Prefabs | ❌ нужен Unity |
| Логика тапа, счётчики | C# Scripts (.wasm) | ❌ нужен Unity |
| Баги в C# (WWW, ValueToWei) | Rebuild нужен | ❌ нужен Unity |

---

## 14. ПЛАН ИСПРАВЛЕНИЙ (приоритеты)

### Срочно (без Unity):
1. **SQL Injection** → переписать UPDATE запросы на PDO prepared statements
2. **miners-config.php** → можно изменить баланс геймплея

### При следующей сборке Unity:
1. **DatabaseNetwork.cs** → раскомментировать UnityWebRequest, удалить WWW
2. **ThirdwebNetwork.cs** → добавить CultureInfo.InvariantCulture в ValueToWei
3. **Game.cs** → удалить debug-код из Update() или обернуть в #if UNITY_EDITOR
4. **Saver.cs** → добавить проверку Instance в Awake()
5. **GameConfig.cs** → передавать new WWWForm() вместо null

### Долгосрочно:
- Перевести игровую логику на чистый веб-стек (React + TypeScript + Thirdweb SDK)
- Позволит обновлять игру без пересборки в Unity

---

---

## 15. PHP БЭКЕНД ДЛЯ ДЕПЛОЯ (backend/ папка)

Готовые PHP-файлы для загрузки на reg.ru / clicker.aliterra.space.
Повторяют контракт mock API один-в-один.

### Структура:
```
backend/
├── db.php                # PDO подключение к MySQL (заменить DB_* константы)
├── schema.sql            # SQL миграция — добавляет last_daily_reward в tg_clicker
└── api/
    ├── .htaccess         # Запрет листинга директории
    ├── game-config.php   # POST /api/game-config
    ├── user.php          # POST /api/user
    ├── save-score.php    # POST /api/save-score
    └── claim-daily.php   # POST /api/claim-daily
```

### Описание файлов:

#### `backend/db.php`
- PDO соединение с MySQL
- Нужно заменить `DB_NAME`, `DB_USER`, `DB_PASS` на реальные данные от reg.ru
- Подключается через `include __DIR__ . "/../db.php"` в каждом API файле

#### `backend/schema.sql`
- `CREATE TABLE IF NOT EXISTS tg_clicker` — создаёт таблицу если нет
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS last_daily_reward DATETIME NULL` — добавляет новую колонку к существующей таблице
- Запускать через phpMyAdmin или MySQL CLI

#### `backend/api/game-config.php`
- Без авторизации, возвращает hardcoded конфиг (идентичен `miners-config.php`)
- Содержит те же значения что и `public/miners-config.json` в React-приложении

#### `backend/api/user.php`
- `INSERT ... ON DUPLICATE KEY UPDATE` — upsert без дублирования
- Возвращает `{ telegram, score, lastDailyReward }` (null если не было)

#### `backend/api/save-score.php`
- `UPDATE tg_clicker SET score = ? WHERE telegram = ?`
- Если строки нет — делает INSERT (защита от race condition)

#### `backend/api/claim-daily.php`
- Проверяет `last_daily_reward` — если `elapsed < dailyRewardTime` → cooldown
- Cooldown ответ: `{ success: false, data: "{\"nextClaimIn\": N, \"score\": S}" }` (строка JSON внутри data — совместимо с mock API)
- Успех: начисляет `dailyReward` к score, обновляет `last_daily_reward`

### Деплой на reg.ru:
1. Загрузить папку `backend/api/` → `/public_html/api/` на хостинге
2. Загрузить `backend/db.php` → `/public_html/db.php` (или выше public_html)
3. Заполнить `DB_NAME`, `DB_USER`, `DB_PASS` в `db.php`
4. Выполнить `backend/schema.sql` через phpMyAdmin
5. В `.env.production` установить `VITE_API_BASE=https://ваш-домен.ru/api`
6. Собрать React-приложение: `cd artifacts/mockup-sandbox && npm run build`
7. Загрузить содержимое `dist/` в `/public_html/` (или в подпапку для Mini App)

### CORS
Все PHP файлы содержат заголовки:
```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
```
Поддерживают OPTIONS preflight — React-приложение с любого домена сможет делать запросы.

---

*Обновлён Replit Agent · Апрель 2026*
*Репозиторий: https://github.com/aliter230880/clicker*
