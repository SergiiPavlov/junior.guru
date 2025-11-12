
# Junior UA — Starter Monorepo

Базовый стартовый репозиторий: фронт (Next.js) + API (Hono). 
Готов к локальному запуску на заглушечных данных. Дальше можно наращивать БД/Prisma, Meilisearch и скраперы.

## Быстрый старт
1) Установи pnpm и Node 20+
2) В двух терминалах запусти фронт и API:
   ```bash
   # терминал 1
   cd apps/api && pnpm i && pnpm dev
   # терминал 2
   cd apps/web && pnpm i && pnpm dev
   ```
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
