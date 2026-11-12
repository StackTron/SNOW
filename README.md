# Тайный Санта Пятигорск 2027

Полноценный бесплатный веб-проект для нескольких независимых розыгрышей Тайного Санты.

## Что реализовано

- регистрация и вход только по email + пароль;
- безопасные cookie-сессии, CSRF-токен и хеширование паролей;
- одноразовый код восстановления пароля без обязательной почтовой отправки;
- личный кабинет и несколько независимых мероприятий;
- открытые мероприятия и персональные ссылки-приглашения;
- права организатора и участника;
- ручное закрытие регистрации и кнопка **«ДЕД МОРОЗ, ВПЕРЁД!»**;
- серверная случайная жеребьёвка без самоназначений, с уникальным адресатом для каждого;
- персональный результат, который недоступен другим участникам;
- две независимые роли чата: «моя переписка с получателем» и «мой Тайный Санта»;
- анонимные сообщения с polling-раз в 4 секунды, история и время отправки;
- адаптивный новогодний интерфейс, SVG-иллюстрация Санты, снег и reduced-motion;
- SQLite-база в `data/santa.sqlite`.

## Локальный запуск

Требуется Node.js 22.5+ (используется встроенный `node:sqlite`; проверено на Node 26).

```powershell
npm start
```

Откройте <http://localhost:3000>. Для разработки:

```powershell
npm run dev
```

Секреты и данные не нужны: база создаётся автоматически. Не удаляйте `data/santa.sqlite` — это рабочие данные мероприятий.

## Первый организатор

1. Нажмите **«Создать аккаунт»**.
2. Укажите имя, фамилию, email и пароль минимум из 8 символов.
3. Сохраните показанный код восстановления (он показывается один раз).
4. В кабинете нажмите **«+ Новое событие»**. Создатель получает права организатора этого мероприятия.

Глобального администратора нет: каждое мероприятие имеет своего организатора. Это безопаснее для независимых семейных, дружеских и рабочих розыгрышей.

## Как создать и провести мероприятие

1. Создайте событие и добавьте описание.
2. Скопируйте персональную ссылку-приглашение из панели организатора.
3. Участники регистрируются, открывают ссылку и нажимают **«Вступить в розыгрыш»**.
4. Когда людей достаточно, организатор нажимает **«ДЕД МОРОЗ, ВПЕРЁД!»** и подтверждает действие.
5. Регистрация закрывается автоматически. Каждый участник видит только своего адресата.
6. В чате отправитель скрыт от получателя как **«Тайный Санта»**. История обновляется без перезагрузки.

Для публичного события участник также может открыть его из блока «Открытые мероприятия». Закрытое или проведённое событие больше не принимает новых участников.

## Данные и резервные копии

В локальном режиме база — файл `data/santa.sqlite`. Перед обновлением делайте копию файла, например:

```powershell
Copy-Item data/santa.sqlite backups/santa-$(Get-Date -Format yyyyMMdd-HHmm).sqlite
```

На production обязательно используйте HTTPS, задайте reverse proxy с ограничением доступа к `/data`, регулярно копируйте SQLite и настройте ротацию бэкапов.

## Бесплатное размещение

Проект специально не требует Supabase, SMTP, SMS, Stripe и других обязательных платных API. Для постоянного бесплатного запуска нужен хостинг с поддержкой Node.js и persistent storage (диск для SQLite).

### Вариант 1: Render (рекомендуется, самый простой)

1. Создайте репозиторий на GitHub/GitLab и залейте туда проект.
2. Зайдите на <https://render.com> → **New** → **Web Service** → **Connect GitHub/GitLab**.
3. Выберите репозиторий. Render сам подхватит `render.yaml`.
4. Нажмите **Create Web Service**.
5. После деплоя сайт будет доступен по адресу `https://your-app.onrender.com`.

**Ограничения бесплатного тарифа Render:**
- 750 часов в месяц (достаточно для 24/7 одного сервиса)
- Спит после 15 минут неактивности (холодный старт ~30-60 сек)
- 1 GB persistent disk (достаточно для SQLite)
- 512 MB RAM, 0.1 CPU
- HTTPS включён автоматически

### Вариант 2: Railway

1. Зайдите на <https://railway.app> → **New Project** → **Deploy from GitHub repo**.
2. Выберите репозиторий. Railway использует `railway.json`.
3. В настройках сервиса добавьте **Volume** → `data` → mount path `/app/data`.
4. Деплой запустится автоматически.

**Ограничения бесплатного тарифа Railway:**
- $5 кредитов в месяц (обычно хватает на небольшой проект)
- Не спит, работает постоянно
- 1 GB RAM, 1 vCPU (в рамках кредитов)
- HTTPS включён автоматически

### Вариант 3: Бесплатная VPS (Oracle Cloud Free Tier, Fly.io, Koyeb)

- **Oracle Cloud**: 4 ARM Ampere CPU, 24 GB RAM, 200 GB диск — всегда бесплатно. Нужен ручной деплой через SSH/Docker.
- **Fly.io**: бесплатные кредиты на старте, можно настроить volume для SQLite.
- **Koyeb**: бесплатный тариф с ограничениями, поддерживает volumes.

### Ручной деплой на VPS (пример для Ubuntu/Oracle)

```bash
# На сервере
sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx git
git clone https://github.com/yourname/secret-santa.git
cd secret-santa
npm ci --production
sudo cp deploy/secret-santa.service /etc/systemd/system/
sudo systemctl enable --now secret-santa
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

Файл `deploy/secret-santa.service`:
```ini
[Unit]
Description=Secret Santa Pyatigorsk 2027
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/www-data/secret-santa
Environment=NODE_ENV=production PORT=3000
ExecStart=/usr/bin/node server.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Nginx конфиг (`/etc/nginx/sites-available/secret-santa`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> **Важно**: бесплатные тарифы меняются. Проверяйте актуальные лимиты CPU, RAM, трафика, сна, диска, количества запросов и правила использования перед публикацией. Не подключайте платные планы автоматически.

## Важно для публичного размещения

- поставьте HTTPS и secure-cookie proxy;
- задайте `PORT` через окружение;
- ограничьте размер тела запроса на reverse proxy;
- добавьте rate limit на login/register/chat;
- используйте отдельного пользователя ОС для Node;
- регулярно делайте резервные копии `data/santa.sqlite`;
- код восстановления не отправляется на email: пользователь обязан сохранить его после регистрации.

## Маршруты API

Сервер предоставляет JSON API для `/api/me`, `/api/register`, `/api/login`, `/api/logout`, `/api/reset-password`, `/api/events`, `/api/my-events`, `/api/events/:id`, `/api/events/:id/join`, `/api/events/:id/draw` и `/api/chats/:id/messages`.
