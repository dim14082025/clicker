# LUX Clicker — deployment bundle for `test.aliterra.space`

Архив содержит готовый production-build React-клиента + standalone Node.js backend (мок in-memory с JSON-персистом) для развёртывания **рядом** с существующим PHP-бекендом. Новые эндпоинты висят под префиксом `/api/v2/` и не пересекаются с уже существующим `/backend/`.

## Состав

```
frontend/         ← статичные файлы (index.html + assets) — кладём в webroot nginx
backend/          ← Node.js сервер (Express) — слушает на 127.0.0.1:3001
  server.js
  package.json
  miners-config.json   ← конфиг майнеров (читается по /api/v2/game-config)
nginx/
  test.aliterra.space.conf  ← пример nginx-конфига (proxy /api/v2/ → :3001)
  lux-backend.service       ← systemd-юнит для автозапуска backend
README.md
```

## Требования к серверу

- nginx (уже стоит)
- **Node.js ≥ 18** (`node --version`). Если нет, поставь через nodesource:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- (необязательно) `pm2` или systemd — для автозапуска backend

## Установка — пошагово

### 1. Залить файлы

Распакуй архив в `/var/www/test.aliterra.space/` (создай папку, если её нет):

```bash
sudo mkdir -p /var/www/test.aliterra.space
sudo unzip lux-clicker-test.zip -d /var/www/test.aliterra.space
sudo chown -R www-data:www-data /var/www/test.aliterra.space
```

После этого структура должна быть:
- `/var/www/test.aliterra.space/frontend/index.html`
- `/var/www/test.aliterra.space/backend/server.js`

### 2. Установить зависимости backend

```bash
cd /var/www/test.aliterra.space/backend
sudo -u www-data npm install --omit=dev
```

### 3. Запустить backend

**Вариант A — systemd (рекомендуется):**

```bash
sudo cp /var/www/test.aliterra.space/nginx/lux-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now lux-backend.service
sudo systemctl status lux-backend.service        # должен быть active (running)
sudo journalctl -fu lux-backend.service          # для логов
```

**Вариант B — pm2:**

```bash
sudo npm install -g pm2
cd /var/www/test.aliterra.space/backend
sudo -u www-data PORT=3001 pm2 start server.js --name lux-backend
sudo pm2 save
sudo pm2 startup
```

**Вариант C — просто проверить вручную:**

```bash
cd /var/www/test.aliterra.space/backend
PORT=3001 node server.js
# В другом терминале:
curl http://127.0.0.1:3001/api/v2/health
# Ожидаемо: {"ok":true,"ts":...}
```

### 4. Настроить nginx

Открой `/etc/nginx/sites-available/test.aliterra.space` (или эквивалент) и добавь блок:

```nginx
location /api/v2/ {
    proxy_pass         http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header   Host               $host;
    proxy_set_header   X-Real-IP          $remote_addr;
    proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto  $scheme;
}
```

Затем убедись что `root` указывает на новый frontend (или сделай его дочерним location), и что есть SPA-fallback:

```nginx
root /var/www/test.aliterra.space/frontend;
index index.html;

location / {
    try_files $uri $uri/ /index.html;
}
```

Полный пример конфига — в `nginx/test.aliterra.space.conf`.

Проверь и перезагрузи:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Telegram Login Widget

Чтобы Telegram-кнопка на экране логина не показывала «Bot domain invalid», добавь домен через **@BotFather**:

1. Открой `@BotFather` в Telegram
2. `/setdomain` → выбери `@LUX_Clicker_bot`
3. Введи: `test.aliterra.space`

После этого OAuth-виджет будет открывать настоящий попап Telegram. До этого момента работает fallback («Открыть @LUX_Clicker_bot в Telegram» + ручной ввод ID).

### 6. Thirdweb (соц-логин)

Соц-логин (Google / Telegram / X / Discord / email) использует thirdweb v5 с публичным clientId, уже вшитым в bundle. Чтобы продакшн-домен попал в whitelist Thirdweb dashboard (иначе попап откажется работать), добавь `test.aliterra.space` в **Allowed Domains** для своего clientId на https://thirdweb.com/dashboard/. clientId публичный, не секрет.

## Проверка end-to-end

После того как всё запущено:

```bash
# Backend жив
curl https://test.aliterra.space/api/v2/health

# Frontend отдаётся
curl -I https://test.aliterra.space/   # должен быть 200, content-type text/html

# Создать тестового юзера
curl -X POST https://test.aliterra.space/api/v2/user \
     -H 'Content-Type: application/json' \
     -d '{"telegram":"demo_user"}'
```

Затем открой `https://test.aliterra.space` в браузере → введи `demo_user` (или свой Telegram ID) → играй.

## Что важно знать про backend

- Состояние хранится в `backend/data.json`. Сохраняется через 500 мс после каждой мутации (debounced) + при SIGTERM/SIGINT (graceful shutdown).
- Файл `data.json` нужен с правом записи для пользователя, под которым крутится node (по умолчанию `www-data`). Если запускаешь от другого юзера — поменяй `User=` в systemd-юните.
- Чтобы сбросить состояние — `systemctl stop lux-backend && rm backend/data.json && systemctl start lux-backend`.
- Backend ничего не пишет в БД, не отправляет писем, не шлёт нотификации — это чисто игровой state-store.
- При необходимости можно докрутить SQLite вместо JSON позже: только подменить `load()/save()` в `server.js` — endpoints не изменятся.

## Список endpoints

Все `POST` под `/api/v2/`, body — JSON, ответ — `{ "success": true|false, "data": ... }`.

| Endpoint | Тело запроса | Что делает |
|---|---|---|
| `/api/v2/health` (GET) | — | Health-check |
| `/api/v2/game-config` | `{}` | Возвращает `miners-config.json` |
| `/api/v2/user` | `{telegram}` | Создаёт/возвращает пользователя, тикает login streak |
| `/api/v2/save-score` | `{telegram, score, clicksDelta}` | Сохраняет gem-баланс + добавляет дневные клики |
| `/api/v2/exchange-gold` | `{telegram, gems}` | Меняет 1000 💎 → 1 ◈ |
| `/api/v2/referral-info` | `{telegram}` | Возвращает свой реф-код и счётчик приглашённых |
| `/api/v2/activate-referral` | `{telegram, code}` | Принимает чужой реф-код, начисляет +50К💎 пригласившему |
| `/api/v2/tasks` | `{telegram}` | Список Daily Tasks с прогрессом |
| `/api/v2/claim-task` | `{telegram, taskId}` | Клейм выполненного задания |
| `/api/v2/claim-daily` | `{telegram}` | Daily reward (+5000💎, кулдаун 3 часа) |
| `/api/v2/miners` | `{walletAddress, nftMiners?}` | Синхронизация майнеров |
| `/api/v2/set-miner-active` | `{walletAddress, minerId, minerIndex, active}` | Активировать майнер |
| `/api/v2/withdrawal-miners` | `{telegram, walletAddress}` | Собрать накопленную добычу |

## Если что-то не работает

| Симптом | Причина / фикс |
|---|---|
| Чёрный экран на `test.aliterra.space` | Проверь что `frontend/index.html` лежит в `root` nginx и нет конфликтующих `location /` |
| `502 Bad Gateway` на `/api/v2/*` | Backend не запущен. `systemctl status lux-backend` → смотри `journalctl -fu lux-backend` |
| `CORS error` в консоли | Сейчас включен `cors()` со звёздочкой, не должно быть. Если есть — значит backend не отвечает; см. предыдущий пункт |
| `Bot domain invalid` на логине | См. шаг 5 — нужно `/setdomain` в @BotFather |
| Соц-логин не работает (попап моргает и закрывается) | Добавь домен `test.aliterra.space` в Thirdweb dashboard allowed domains |
| Прогресс кликов теряется | Открой `backend/data.json` — должны видеть свежие `score` для своего `telegram`. Если файл не пишется — проверь права (`chown www-data:www-data`) |

## Откат

Откатить просто: удалить `frontend/` и `backend/` папки + убрать `location /api/v2/` из nginx-конфига. Существующий PHP-бекенд и Unity-страницы не затрагиваются вообще.

---

Build времени: production-режим Vite, ~9 MB total с thirdweb-bundle (gzipped ~1.5 MB). Bundle хеширован — long-cache `assets/*.{js,css}` безопасен.
