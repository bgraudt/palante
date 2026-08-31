# Паланте — лендинг + форма → SMTP

Один Docker-контейнер: сайт + бэкенд, который шлёт заявки на почту через Yandex SMTP.

## Быстрый старт

```bash
git clone <твой-репозиторий>
cd palante

# Скопируй и заполни секреты
cp .env.example .env
nano .env   # или vim / любой редактор

# Поднять
docker compose up -d --build

# Сайт: http://localhost:3000
# (или IP сервера:3000)
```

## Настройка Yandex SMTP

1. Зайди в аккаунт `palante.space@yandex.ru`
2. **Настройки** → **Безопасность** → **Пароли приложений**
3. Создай пароль (тип «Почта» или «Другое» → название «Паланте сайт»)
4. В `.env` укажи:

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=palante.space@yandex.ru
SMTP_PASS=тот_самый_пароль_приложения
MAIL_TO=palante.space@yandex.ru
```

> Обычный пароль от аккаунта **не подойдёт** — нужен именно пароль приложения.

## Полезные команды

```bash
# Логи
docker compose logs -f

# Перезапуск после правки .env
docker compose up -d --force-recreate

# Остановить
docker compose down
```

## Структура

```
palante/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── server.js          # Express + nodemailer
├── .env.example
├── .gitignore
├── public/
│   └── index.html     # лендинг + модалка
└── README.md
```

## Безопасность

- Rate-limit: максимум 10 заявок с одного IP за 15 минут
- Honeypot-поле против простых ботов
- Секреты только в `.env` (не коммитится)
- Helmet + ограничение размера тела запроса

## Порт

По умолчанию `3000`. Чтобы открыть на 80:

```yaml
# в docker-compose.yml
ports:
  - "80:3000"
```

Или поставь перед контейнером nginx/Caddy как reverse proxy.
