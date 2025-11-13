
# Junior UA — Starter Monorepo

Базовый стартовый репозиторий: фронт (Next.js) + API (Hono). 
Готов к локальному запуску на заглушечных данных. Дальше можно наращивать БД/Prisma, Meilisearch и скраперы.

## Быстрый старт
1) Установи Node 20+ и npm 10+
2) Установи зависимости и подними фронт+API одной командой:
   ```bash
   npm install
   npm run dev
   ```
   Команда `npm run dev` использует `npm-run-all`, чтобы параллельно запустить `apps/api` и `apps/web`.
3) Открой http://localhost:3000/uk — увидишь список тестовых вакансий.
   API слушает на http://localhost:8787/api/v1

## Local dev (Windows + Linux)
1) Скопируй `.env.example` → `.env.local` и при необходимости обнови `DATABASE_URL` под свою среду.
2) Подними Postgres из Docker Compose или локально (по умолчанию используется порт `5432`).
3) Установи зависимости один раз: `npm install`.
4) Прогоняй миграции и сиды одной командой — `npm run db:migrate && npm run db:seed`.
5) Для разработки запускай обе части стека одной командой, совместимой с Windows и Linux: `npm run all`.
6) Проверь, что доступны http://localhost:3000/uk/jobs и http://localhost:3000/uk/events — страницы работают поверх API на http://localhost:8787.

## Postgres + Meilisearch + mock-воркеры
1) Подними инфраструктуру через Docker Compose:
   ```bash
   docker compose -f ops/docker-compose.yml up -d postgres meilisearch
   ```
2) Прокинь переменные окружения и собери Prisma-клиент:
   ```bash
   cp .env.example .env.local
   npm run db:migrate
   npm run db:seed
   ```
3) Импортируй CSV-данные через воркеры (идемпотентные, можно запускать повторно):
   ```bash
   npm run workers:jobs
   npm run workers:events
   ```
   После прогона ожидается 39 вакансий и 11 событий в Postgres, а индексы Meilisearch синхронизированы.
4) Проверить поиск и API можно командами из раздела ниже.

## Поиск (Meilisearch)
1) Запусти инфраструктуру:
   ```bash
   docker compose -f ops/docker-compose.yml up -d meilisearch
   ```
2) Скопируй `.env.example` → `.env.local` и пропиши `API_ADMIN_TOKEN=<секрет>`.
3) Выполни полную переиндексацию:
   ```bash
   npm run search:reindex
   ```
   Скрипт создаст индексы `jobs` и `events`, обновит документы и синхронизирует данные.
4) Проверить, что API отдает результаты из Meilisearch:
   ```bash
   curl "http://localhost:8787/api/v1/search/jobs?q=react"
   ```
   Для повторной индексации через API отправь `POST /api/v1/jobs/reindex` с заголовком `x-admin-token: $API_ADMIN_TOKEN`.

## Структура
- `apps/web` — Next.js 15 (App Router), базовые страницы `/[locale]`, `/[locale]/jobs`, `/[locale]/events`
- `apps/api` — Hono (Node server), эндпоинты `/api/v1/jobs`, `/api/v1/events`
- `packages/db` — заготовка под Prisma-схему (пока не используется)
- `ops/docker-compose.yml` — заготовка для Postgres/Meilisearch (пока опционально)

## Дальше
- Подключить Prisma/Postgres и заменить заглушки API на реальные данные
- Добавить Meilisearch и индексацию
- Вынести UI и shared-типы в packages
- Реализовать воркеры/скраперы
