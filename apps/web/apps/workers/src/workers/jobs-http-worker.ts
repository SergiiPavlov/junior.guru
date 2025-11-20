import type { Prisma, PrismaClient } from '@prisma/client';

import type { Worker } from './base';

const SOURCE_KEY = 'external_http_jobs';
const SOURCE_NAME = 'External HTTP Jobs';
const SOURCE_DESCRIPTION = 'Demo HTTP jobs feed used as an example external source.';

const FEED_URL = process.env.EXTERNAL_JOBS_FEED_URL;

let sourceIdCache: string | null = null;

type ExternalJob = {
  id: string;
  title: string;
  url: string;
  company?: string;
  city?: string;
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  skills?: string[];
  tags?: string[];
  description?: string;
  publishedAt?: string;
  validUntil?: string;
};

async function ensureSourceId(prisma: PrismaClient): Promise<string> {
  if (sourceIdCache) {
    return sourceIdCache;
  }

  const source = await prisma.source.upsert({
    where: { key: SOURCE_KEY },
    update: { name: SOURCE_NAME, description: SOURCE_DESCRIPTION },
    create: { key: SOURCE_KEY, name: SOURCE_NAME, description: SOURCE_DESCRIPTION }
  });

  sourceIdCache = source.id;
  return source.id;
}

function toSlug(raw: ExternalJob): string {
  const base = raw.id?.trim() || raw.title?.trim() || `ext-job-${Date.now()}`;
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)+/g, '');

  if (!slug) {
    return `ext-job-${Date.now()}`;
  }

  return `ext-${slug}`;
}

function normalizeCurrency(value?: string): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

function parseDateOrNull(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createFetchList(): () => Promise<ExternalJob[]> {
  return async function fetchList() {
    if (!FEED_URL) {
      console.warn('[workers] EXTERNAL_JOBS_FEED_URL is not set. HTTP jobs worker will not import any data.');
      return [];
    }

    const response = await fetch(FEED_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch jobs feed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ExternalJob[] | { jobs: ExternalJob[] };
    const list = Array.isArray(data) ? data : data.jobs ?? [];

    if (!Array.isArray(list)) {
      return [];
    }

    return list;
  };
}

export function createJobsHttpWorker(prisma: PrismaClient): Worker<ExternalJob, Prisma.JobUncheckedCreateInput> {
  const fetchList = createFetchList();

  async function normalize(raw: ExternalJob): Promise<Prisma.JobUncheckedCreateInput | null> {
    if (!raw.title || raw.title.trim().length === 0) {
      return null;
    }

    if (!raw.url || raw.url.trim().length === 0) {
      return null;
    }

    const sourceId = await ensureSourceId(prisma);
    const publishedAt = parseDateOrNull(raw.publishedAt) ?? new Date();
    const validUntil = parseDateOrNull(raw.validUntil);

    const normalized: Prisma.JobUncheckedCreateInput = {
      slug: toSlug(raw),
      sourceId,
      title: raw.title.trim(),
      city: raw.city ?? null,
      remote: Boolean(raw.remote),
      urlOriginal: raw.url,
      urlApply: null,
      salaryMin: raw.salaryMin ?? null,
      salaryMax: raw.salaryMax ?? null,
      currency: normalizeCurrency(raw.currency),
      experience: null,
      employmentType: null,
      skills: raw.skills ?? [],
      tags: raw.tags ?? [],
      descriptionRaw: raw.description ?? null,
      description: raw.description ?? null,
      publishedAt,
      validUntil,
      companyId: null,
      regionId: null,
      id: raw.id ?? undefined
    } satisfies Prisma.JobUncheckedCreateInput;

    return normalized;
  }

  async function upsert(entity: Prisma.JobUncheckedCreateInput) {
    const sourceId = await ensureSourceId(prisma);
    const payload = {
      ...entity,
      sourceId
    } satisfies Prisma.JobUncheckedCreateInput;

    await prisma.job.upsert({
      where: { slug: entity.slug },
      create: payload,
      update: {
        ...payload,
        updatedAt: new Date()
      }
    });
  }

  return {
    prepare: async () => {
      await ensureSourceId(prisma);
    },
    fetchList,
    normalize,
    upsert
  } satisfies Worker<ExternalJob, Prisma.JobUncheckedCreateInput>;
}

export type { ExternalJob };
