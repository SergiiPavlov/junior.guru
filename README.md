
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
