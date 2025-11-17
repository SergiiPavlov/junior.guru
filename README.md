
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
   Чтобы протестировать HTTP-воркер на Work.ua-подобном фиде, сначала запусти API (`npm run dev`), затем:
   ```bash
   EXTERNAL_JOBS_FEED_URL=http://localhost:8787/api/v1/demo/workua-jobs \
     npm run -w @junior-ua/workers jobs:run:http
   ```
   Это подтянет JSON из `/api/v1/demo/workua-jobs`, нормализует вакансии и обновит БД/Meili.
4) Проверить поиск и API можно командами из раздела ниже.

## Local demo data (CSV + HTTP feed)
1) Подготовь окружение:
   - Скопируй `.env.example` → `.env.local` (или `.env`) и при необходимости поправь `DATABASE_URL` / Meili.
   - Задай `EXTERNAL_JOBS_FEED_URL` (например, через `.env.local`). По умолчанию можно использовать `http://localhost:8787/api/v1/demo/workua-jobs`.
2) Установи зависимости и прогоняй миграции один раз:
   ```bash
   npm install
   npm run db:migrate
   ```
3) Получи полный демо-набор в БД и Meili одной командой:
   ```bash
   npm run demo:seed
   ```
   Команда `demo:seed` выполняет:
   - `db:migrate` и `db:seed` — базовые сущности.
   - `workers:jobs` и `workers:events` — CSV-воркеры импортируют вакансии и события из `seed/*.csv`.
   - `search:reindex` — Meili получает свежие индексы.
4) Чтобы отдельно прогнать HTTP-воркер по фиду (`EXTERNAL_JOBS_FEED_URL`), запусти:
   ```bash
   npm run workers:jobs:http
   ```

## Real job board API (Jooble)
Jooble — первый реальный источник вакансий в этом репозитории. Он работает поверх публичного API и использует те же Prisma/Meili-пайплайны, что и CSV/HTTP демо.

1. Получи партнёрский ключ в Jooble (нужна регистрация на их платформе) и добавь параметры в `.env`:
   ```env
   JOOBLE_API_KEY=your_api_key_here
   JOOBLE_API_ENDPOINT=https://jooble.org/api
   JOOBLE_LOCATION_DEFAULT=Ukraine
   # необязательно, но можно задать на запуск:
   # JOOBLE_LOCATION_OVERRIDE=Poland
   ```
2. Импортируй вакансии и обнови поисковый индекс:
   ```bash
   npm run workers:jobs:jooble
   npm run search:reindex
   ```
   В ответе `/api/v1/search/jobs` появятся записи с `sourceName=Jooble`, а страница `/[locale]/jobs` отобразит свежие вакансии.
3. Чтобы быстро менять страну/регион, используй `JOOBLE_LOCATION_OVERRIDE` либо CLI-параметр:
   ```bash
    npm run workers:jobs:jooble -- --location=Poland
    npm run search:reindex
    ```
    Override позволяет запускать сбор по Польше, Германии и т.д. без правки `.env`. Для Украины воркер автоматически мапит города на существующие регионы, поэтому текущие фильтры продолжают работать корректно.

## Remote job board API (Remotive)
Remotive — дополнительный источник только для удалённых вакансий. Воркер использует публичный Remotive API и тот же пайплайн Prisma → Meilisearch, что и другие импортеры.

1. (Опционально) задай параметры запроса в `.env`:
   ```env
   REMOTIVE_API_ENDPOINT=https://remotive.com/api/remote-jobs
   REMOTIVE_CATEGORY=software-dev
   REMOTIVE_SEARCH=junior
   REMOTIVE_LIMIT=50
   ```
2. Импортируй вакансии и перестрой индекс:
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 npm run -w @junior-ua/workers jobs:run:remotive
   npm run search:reindex
   ```
   Команда добавит удалённые вакансии Remotive в таблицу `Job` и индекс Meilisearch. Все записи отмечаются тегом `source:remotive`, а при явном указании страны — тегом `country:UA/PL/DE`.
3. При показе вакансии обязательно ссылайся на оригинальный источник: добавь ссылку вроде «Перейти на оригинал (Remotive)» через `urlOriginal` и явный бейдж/лейбл «Source: Remotive», чтобы не нарушать ToS Remotive.

### Country filters

Каталог вакансий поддерживает параметр `country`, например `https://localhost:3000/uk/jobs?country=UA` или API-запрос `GET /api/v1/jobs?country=PL`.
Воркеры (CSV, HTTP, Jooble) сохраняют страну в тегах (`country:UA`, `country:PL` и т.д.), а фильтр на стороне API и Meilisearch как раз использует эти теги.
Если параметр не указан, показываются все вакансии независимо от страны, поэтому текущие ссылки и избранное продолжают работать.

## Search (Meilisearch)
1) Подними инфраструктуру:
   ```bash
   docker compose -f ops/docker-compose.yml up -d meilisearch
   ```
2) Убедись, что `.env.local` содержит `MEILI_HOST=http://localhost:7700`, `MEILI_MASTER_KEY=masterKey` и `API_SEARCH_ENABLED=true`.
3) Прогоняй миграции и сиды перед индексацией:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4) Собери Meili-индексы и документы одной командой:
   ```bash
   npm run search:reindex
   ```
5) Запусти dev-сервер:
   ```bash
   npm run dev
   ```
   Теперь `/api/v1/search/jobs` и страница `/[locale]/jobs` будут использовать Meilisearch. Если переменные окружения не заданы, API вернёт результаты через Prisma-фолбек.

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
