# LUX Clicker — заливка на test.aliterra.space

**TL;DR:** Распакуй zip → перетащи 2 папки на сервер через FileZilla/cPanel → готово. Никакого Node.js, никаких systemd-сервисов, никаких изменений в nginx. Чистый PHP.

---

## Что внутри архива

```
lux-deploy/
├── frontend/   ← 5 файлов: положить в webroot (туда же, где сейчас лежит index.html сайта)
└── api/v2/    ← 15 PHP-файлов: положить в webroot/api/v2/
```

Всё. Больше ничего настраивать не нужно — у тебя уже стоит PHP-FPM (видно по `/backend/get-miners-config.php`), значит наши `.php`-файлы тут же заработают.

---

## Заливка через FileZilla (10 минут)

1. **Подключись к серверу по SFTP** в FileZilla. Перейди в папку, где лежит текущий сайт (обычно `/var/www/test.aliterra.space/` или `~/public_html/`).

2. **Сделай бэкап текущего `index.html`** (на всякий случай) — переименуй его в `index.html.bak` через правую кнопку → Rename.

3. **Перетащи папку `frontend`** из распакованного архива на сервер, и сразу разверни её содержимое — все файлы должны оказаться в корне сайта:
   ```
   index.html
   crystal.png
   polygon.png
   miners-config.json
   assets/   ← вся папка
   ```
   В FileZilla открой папку `frontend/` слева, выдели Ctrl+A → перетащи в правое окно.

4. **Создай папку `api/v2`** на сервере (если её нет) — через правую кнопку → Create directory.

5. **Перетащи всё содержимое `api/v2/`** из архива в `api/v2/` на сервере. Должно получиться 15 файлов:
   ```
   _lib.php
   activate-referral.php
   claim-daily.php
   claim-task.php
   exchange-gold.php
   game-config.php
   health.php
   miners.php
   miners-config.json
   referral-info.php
   save-score.php
   set-miner-active.php
   tasks.php
   user.php
   withdrawal-miners.php
   ```

6. **Готово.** Открой https://test.aliterra.space/ — должна загрузиться новая игра с экраном логина.

---

## Заливка через cPanel File Manager (если нет FileZilla)

1. Открой cPanel → **File Manager** → перейди в папку сайта (`public_html` или аналог).
2. В правом верхнем углу нажми **Upload** → перетащи туда `lux-clicker-test.zip`.
3. Когда загрузка завершилась, выйди из Upload → выдели zip → нажми **Extract** → распакуется папка `lux-deploy/`.
4. Войди в `lux-deploy/frontend/` → выдели все файлы (Ctrl+A) → **Move** → укажи путь webroot (например `/public_html/`).
5. Войди в `lux-deploy/api/` → выдели папку `v2` → **Move** → укажи путь `/public_html/api/`.
6. Удали папку `lux-deploy/` и zip-файл.
7. Готово, открой сайт.

---

## Заливка через SSH (если предпочитаешь командную строку)

```bash
# 1. На локальной машине: загрузить архив на сервер
scp lux-clicker-test.zip user@test.aliterra.space:/tmp/

# 2. По SSH на сервере (поменяй пути на свои)
ssh user@test.aliterra.space
cd /var/www/test.aliterra.space      # ← твой webroot
sudo unzip /tmp/lux-clicker-test.zip -d /tmp/

# 3. Бэкап старого index.html
sudo mv index.html index.html.bak 2>/dev/null || true

# 4. Положить frontend в webroot
sudo cp -r /tmp/lux-deploy/frontend/* .

# 5. Положить api/v2 рядом с /backend/
sudo mkdir -p api/v2
sudo cp -r /tmp/lux-deploy/api/v2/* api/v2/

# 6. Дать PHP-юзеру право писать data.json
sudo chown -R www-data:www-data api/v2
sudo chmod -R u+rw api/v2

# 7. Убрать tmp
sudo rm -rf /tmp/lux-deploy /tmp/lux-clicker-test.zip
```

---

## Проверка после заливки

```bash
# 1. Frontend отдаётся
curl -I https://test.aliterra.space/
# должен быть 200, content-type: text/html

# 2. PHP backend жив
curl https://test.aliterra.space/api/v2/health.php
# {"ok":true,"ts":...}

# 3. Создать тестового юзера
curl -X POST https://test.aliterra.space/api/v2/user.php \
     -H 'Content-Type: application/json' \
     -d '{"telegram":"demo_user"}'
# {"success":true,"data":{"telegram":"demo_user","score":0,...}}
```

Если все три команды вернули то что нужно — **всё работает**.

---

## Две настройки на стороне сервисов (5 минут)

### A. Telegram Login Widget — обязательно

Чтобы Telegram-кнопка на экране входа реально работала (а не показывала «Bot domain invalid»):

1. Открой `@BotFather` в Telegram.
2. Команда: `/setdomain`
3. Выбери: `LUX_Clicker_bot`
4. Введи: `test.aliterra.space`

Готово. Если этот шаг пропустить, юзеры всё равно могут залогиниться через fallback («Открыть бота в Telegram» + ручной ввод ID), но настоящий OAuth не сработает.

### B. Thirdweb — для соц-логина (если хочется чтобы Google/Discord и т.д. реально работали)

1. Открой https://thirdweb.com/dashboard
2. Найди свой clientId `2f46f446e2b06ddad0a6875b18062e24` → Settings
3. В **Allowed Domains** добавь: `test.aliterra.space`

Если пропустить — соц-логин откатится на детерминированный fallback-кошелёк (всё равно работает, просто без реального OAuth-окна).

---

## Что делать если что-то не так

| Симптом | Что проверить |
|---|---|
| Чёрный экран на главной | В DevTools (F12) → Network: красные `/assets/...` 404? Тогда папка `assets/` не залилась — перезалей. |
| `Failed to fetch` в Console | В Network вкладке посмотри ответ на `POST /api/v2/user.php`. Если 404 — папка `api/v2/` пуста или не там. Если 500 — `php -i \| grep error_log` посмотри error_log сервера. |
| `502 Bad Gateway` на `/api/v2/*.php` | PHP-FPM не запущен. `systemctl status php8.1-fpm` (или твоя версия). |
| Прогресс не сохраняется | Файл `api/v2/data.json` должен создаваться автоматически. Проверь: `ls -la api/v2/data.json` — есть? Если нет, проверь права на папку: `chmod g+w api/v2`. |
| «Bot domain invalid» на логине | Не сделан шаг A (BotFather → `/setdomain`). Это нормально, fallback всё равно работает. |
| Соц-логин (Google/Telegram) попап моргает | Не сделан шаг B. Добавь домен в Thirdweb dashboard. |

Логи PHP-ошибок ищи в `/var/log/nginx/error.log` или `/var/log/php8.1-fpm.log` — что-то из этого должно быть.

---

## Где лежит state игроков

`api/v2/data.json` — единственный файл с состоянием. Формат:

```json
{
  "users": {
    "demo_user": {
      "telegram": "demo_user",
      "score": 5500,
      "gold": 5,
      "referralCode": "LUX-1DOO1",
      "invitedCount": 0,
      "clicksToday": 100,
      "loginDays": 3,
      "claimedTasks": ["click100"]
    }
  },
  "minersByWallet": {
    "0xabc...": [{ "tokenId": "4", "miners": [...] }]
  }
}
```

Безопасно бэкапить/копировать/редактировать вручную. Чтобы сбросить всё — `rm api/v2/data.json` и при следующем запросе он пересоздастся пустым.

PHP-код использует `flock()` для атомарной записи, так что параллельные запросы не сломают файл.

---

## Откат

Откатить просто:
```bash
sudo rm -rf api/v2 frontend/*  # frontend файлы можешь оставить
sudo mv index.html.bak index.html
```

Существующий `/backend/*.php` (Unity) и Unity-страницы НЕ трогаются вообще. Они продолжают работать параллельно.

---

## Список endpoints

Все `POST`, body — JSON, ответ — `{"success":true|false,"data":...}`. Кроме `/health` который GET.

| URL | Что делает |
|---|---|
| `GET  /api/v2/health.php` | Health-check |
| `POST /api/v2/game-config.php` | Возвращает `miners-config.json` |
| `POST /api/v2/user.php` | Создаёт/возвращает игрока + login streak |
| `POST /api/v2/save-score.php` | Сохраняет gem-баланс + today clicks |
| `POST /api/v2/exchange-gold.php` | Меняет 💎 → ◈ (курс 1000:1) |
| `POST /api/v2/referral-info.php` | Реф-код и счётчик приглашённых |
| `POST /api/v2/activate-referral.php` | Принимает чужой реф-код, начисляет +50К💎 пригласившему |
| `POST /api/v2/tasks.php` | Список Daily Tasks с прогрессом |
| `POST /api/v2/claim-task.php` | Клейм выполненного задания |
| `POST /api/v2/claim-daily.php` | Daily reward (+5000💎, cooldown 3 часа) |
| `POST /api/v2/miners.php` | Sync майнеров с on-chain NFT |
| `POST /api/v2/set-miner-active.php` | Активация майнера |
| `POST /api/v2/withdrawal-miners.php` | Сбор накопленной добычи |

`/api/v2/` живёт **рядом** с твоим существующим `/backend/` — не конфликтуют, не пересекаются.
