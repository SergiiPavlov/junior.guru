-- Initial schema for Junior UA platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE "sources" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "companies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "website_url" TEXT,
  "email" TEXT,
  "location" TEXT,
  "description" TEXT,
  "logo_url" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "regions" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name_uk" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "tags" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name_uk" TEXT NOT NULL,
  "name_en" TEXT,
  "category" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "jobs" (
  "id" TEXT PRIMARY KEY,
  "source_id" TEXT NOT NULL,
  "company_id" TEXT,
  "region_id" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "city" TEXT,
  "remote" BOOLEAN NOT NULL DEFAULT FALSE,
  "url_original" TEXT,
  "url_apply" TEXT,
  "salary_min" INTEGER,
  "salary_max" INTEGER,
  "currency" VARCHAR(8),
  "experience" TEXT,
  "employment_type" TEXT,
  "skills" TEXT[] NOT NULL DEFAULT '{}',
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "description_raw" TEXT,
  "description" TEXT,
  "published_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "valid_until" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE,
  CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL,
  CONSTRAINT "jobs_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL
);

CREATE TABLE "events" (
  "id" TEXT PRIMARY KEY,
  "source_id" TEXT NOT NULL,
  "region_id" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "url_original" TEXT,
  "url_register" TEXT,
  "venue" TEXT,
  "city" TEXT,
  "remote" BOOLEAN NOT NULL DEFAULT FALSE,
  "skills" TEXT[] NOT NULL DEFAULT '{}',
  "tags" TEXT[] NOT NULL DEFAULT '{}',
  "description_raw" TEXT,
  "description" TEXT,
  "start_at" TIMESTAMPTZ NOT NULL,
  "end_at" TIMESTAMPTZ,
  "language" VARCHAR(8),
  "price_from" INTEGER,
  "price_to" INTEGER,
  "currency" VARCHAR(8),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "events_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE,
  CONSTRAINT "events_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL
);

CREATE TABLE "crawls" (
  "id" TEXT PRIMARY KEY,
  "source_id" TEXT NOT NULL,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "finished_at" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "items_found" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "crawls_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE
);

CREATE TABLE "job_tags" (
  "job_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "job_tags_pkey" PRIMARY KEY ("job_id", "tag_id"),
  CONSTRAINT "job_tags_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "job_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

CREATE TABLE "event_tags" (
  "event_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "event_tags_pkey" PRIMARY KEY ("event_id", "tag_id"),
  CONSTRAINT "event_tags_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE,
  CONSTRAINT "event_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

CREATE INDEX "jobs_source_id_idx" ON "jobs"("source_id");
CREATE INDEX "jobs_company_id_idx" ON "jobs"("company_id");
CREATE INDEX "jobs_region_id_idx" ON "jobs"("region_id");
CREATE INDEX "jobs_remote_idx" ON "jobs"("remote");
CREATE INDEX "jobs_published_at_idx" ON "jobs"("published_at");
CREATE INDEX "jobs_skills_gin" ON "jobs" USING GIN ("skills");
CREATE INDEX "jobs_tags_gin" ON "jobs" USING GIN ("tags");

CREATE INDEX "events_source_id_idx" ON "events"("source_id");
CREATE INDEX "events_region_id_idx" ON "events"("region_id");
CREATE INDEX "events_remote_idx" ON "events"("remote");
CREATE INDEX "events_start_at_idx" ON "events"("start_at");
CREATE INDEX "events_skills_gin" ON "events" USING GIN ("skills");
CREATE INDEX "events_tags_gin" ON "events" USING GIN ("tags");

CREATE INDEX "crawls_source_id_idx" ON "crawls"("source_id");
CREATE INDEX "job_tags_tag_id_idx" ON "job_tags"("tag_id");
CREATE INDEX "event_tags_tag_id_idx" ON "event_tags"("tag_id");

