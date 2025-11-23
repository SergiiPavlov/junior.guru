import type { Prisma, PrismaClient } from '@prisma/client';

import type { Worker } from './base';

const SOURCE_KEY = 'external_adzuna';
const SOURCE_NAME = 'Adzuna';
const SOURCE_DESCRIPTION = 'Real jobs imported from the Adzuna public API.';

// Helpers
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCountry(value: string | undefined, fallback: string): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized;
}

const DEFAULT_COUNTRY = parseCountry(process.env.ADZUNA_COUNTRY, 'gb');

// Category can be disabled by leaving ADZUNA_CATEGORY empty or setting to '-'
const rawCategory = process.env.ADZUNA_CATEGORY?.trim();
const DEFAULT_CATEGORY = rawCategory && rawCategory !== '-' ? rawCategory : null;

// Search query can be overridden via ADZUNA_WHAT; if empty, no 'what' filter is applied
const DEFAULT_WHAT =
  (process.env.ADZUNA_WHAT ?? 'junior OR trainee OR intern OR entry level').trim();

const DEFAULT_PAGE_SIZE = parsePositiveInt(process.env.ADZUNA_PAGE_SIZE, 50);
const DEFAULT_MAX_PAGES = parsePositiveInt(process.env.ADZUNA_MAX_PAGES, 2);

type AdzunaJob = {
  id: string;
  title: string;
  description?: string;
  redirect_url: string;
  created?: string;
  company?: { display_name?: string };
  location?: {
    display_name?: string;
    area?: string[];
  };
  category?: { label?: string };
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_predicted?: string | null;
  contract_type?: string | null;
  contract_time?: string | null;
  longitude?: number | null;
  latitude?: number | null;
};

type AdzunaResponse = {
  results: AdzunaJob[];
  count: number;
};

type NormalizedJob = {
  slug: string;
  title: string;
  description?: string | null;
  urlOriginal: string;
  companyName?: string | null;
  city?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  remote: boolean;
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryCurrency?: string | null;
  employmentType?: string | null;
  publishedAt: Date;
  tags: string[];
};

function detectRemoteFromLocation(location?: AdzunaJob['location']): boolean {
  const value = location?.display_name ?? '';
  if (!value) return false;

  const lowered = value.toLowerCase();
  return (
    lowered.includes('remote') ||
    lowered.includes('віддалена') ||
    lowered.includes('віддалено') ||
    lowered.includes('remotely')
  );
}

function normalizeCountryFromArea(area?: string[]): string | null {
  if (!area || area.length === 0) return null;
  const last = area[area.length - 1];
  if (!last) return null;
  const lowered = last.toLowerCase();

  if (lowered.includes('ukraine') || lowered.includes('україна')) return 'UA';
  if (lowered.includes('poland') || lowered.includes('polska')) return 'PL';
  if (lowered.includes('germany') || lowered.includes('deutschland')) return 'DE';
  if (lowered.includes('united states') || lowered.includes('usa')) return 'US';
  if (lowered.includes('united kingdom') || lowered.includes('uk')) return 'GB';

  return null;
}

function normalizeCityFromArea(area?: string[]): string | null {
  if (!area || area.length === 0) return null;
  const first = area[0];
  if (!first) return null;
  return first.trim();
}

function normalizeEmploymentType(raw: AdzunaJob): string | null {
  const parts: string[] = [];
  if (raw.contract_time) parts.push(raw.contract_time.trim());
  if (raw.contract_type) parts.push(raw.contract_type.trim());
  if (parts.length === 0) return null;
  const value = parts.join(' ').trim();
  return value.length > 0 ? value : null;
}

function normalizeSalary(raw: AdzunaJob, country: string): { min: number | null; max: number | null; currency: string | null } {
  const min = typeof raw.salary_min === 'number' && Number.isFinite(raw.salary_min) ? raw.salary_min : null;
  const max = typeof raw.salary_max === 'number' && Number.isFinite(raw.salary_max) ? raw.salary_max : null;

  let currency: string | null = null;
  if (country === 'ua') currency = 'UAH';
  else if (country === 'pl') currency = 'PLN';
  else if (country === 'gb') currency = 'GBP';
  else if (country === 'us') currency = 'USD';

  return { min, max, currency };
}

export function createJobsAdzunaWorker(prisma: PrismaClient): Worker<AdzunaJob, NormalizedJob> {
  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = process.env.ADZUNA_APP_KEY?.trim();

  if (!appId || !appKey) {
    throw new Error('[workers] ADZUNA_APP_ID and ADZUNA_APP_KEY must be set to run Adzuna worker');
  }

  const country = DEFAULT_COUNTRY;
  const category = DEFAULT_CATEGORY;
  const pageSize = DEFAULT_PAGE_SIZE;
  const maxPages = DEFAULT_MAX_PAGES;
  const what = DEFAULT_WHAT;

  let sourceIdPromise: Promise<number> | undefined;

  async function ensureSourceId() {
    if (!sourceIdPromise) {
      sourceIdPromise = prisma.source
        .upsert({
          where: { key: SOURCE_KEY },
          update: {
            name: SOURCE_NAME,
            description: SOURCE_DESCRIPTION,
            type: 'job_board'
          },
          create: {
            key: SOURCE_KEY,
            name: SOURCE_NAME,
            description: SOURCE_DESCRIPTION,
            type: 'job_board'
          }
        })
        .then((source) => source.id);
    }

    return sourceIdPromise;
  }

  async function ensureCompanyId(name: string | null | undefined): Promise<number | null> {
    const companyName = name?.trim();
    if (!companyName) return null;

    const slug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) return null;

    const company = await prisma.company.upsert({
      where: { slug },
      update: { name: companyName },
      create: { slug, name: companyName }
    });

    return company.id;
  }

  function buildJobSlug(raw: AdzunaJob): string {
    const id = raw.id || raw.redirect_url;
    const base = id.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return base.toLowerCase().slice(0, 120);
  }

  function normalize(raw: AdzunaJob): NormalizedJob | null {
    if (!raw.title || !raw.redirect_url) {
      return null;
    }

    const slug = buildJobSlug(raw);
    const title = raw.title.trim();
    const description = raw.description?.trim() || null;
    const urlOriginal = raw.redirect_url;

    const city = normalizeCityFromArea(raw.location?.area);
    const countryCode = normalizeCountryFromArea(raw.location?.area) ?? country.toUpperCase();

    const remote = detectRemoteFromLocation(raw.location);
    const employmentType = normalizeEmploymentType(raw);

    const salary = normalizeSalary(raw, country);
    const publishedAt = raw.created ? new Date(raw.created) : new Date();

    const tags = new Set<string>(['source:adzuna']);
    if (countryCode) {
      tags.add(`country:${countryCode.toUpperCase()}`);
    }
    if (remote) {
      tags.add('remote');
    }
    if (raw.category?.label) {
      tags.add(`category:${raw.category.label.toLowerCase()}`);
    }

    return {
      slug,
      title,
      description,
      urlOriginal,
      companyName: raw.company?.display_name ?? null,
      city: city ?? null,
      countryCode: countryCode ?? null,
      regionCode: null,
      remote,
      salaryFrom: salary.min,
      salaryTo: salary.max,
      salaryCurrency: salary.currency,
      employmentType,
      publishedAt,
      tags: Array.from(tags)
    };
  }

  async function upsert(entity: NormalizedJob): Promise<void> {
  const sourceId = await ensureSourceId();
  const companyId = await ensureCompanyId(entity.companyName ?? null);

  const createData: Prisma.JobUncheckedCreateInput = {
    slug: entity.slug,
    sourceId,
    companyId: companyId ?? undefined,
    title: entity.title,
    city: entity.city ?? undefined,
    regionId: undefined,
    remote: entity.remote,
    urlOriginal: entity.urlOriginal ?? undefined,
    urlApply: null,
    salaryMin: entity.salaryFrom ?? undefined,
    salaryMax: entity.salaryTo ?? undefined,
    currency: entity.salaryCurrency ?? undefined,
    experience: null,
    employmentType: entity.employmentType ?? null,
    skills: [],
    tags: entity.tags,
    descriptionRaw: entity.description ?? undefined,
    description: entity.description ?? undefined,
    publishedAt: entity.publishedAt,
    validUntil: undefined
  };

  const updateData: Prisma.JobUncheckedUpdateInput = {
    sourceId,
    companyId: companyId ?? null,
    title: entity.title,
    city: entity.city ?? null,
    regionId: null,
    remote: entity.remote,
    urlOriginal: entity.urlOriginal ?? null,
    urlApply: null,
    salaryMin: entity.salaryFrom,
    salaryMax: entity.salaryTo,
    currency: entity.salaryCurrency ?? null,
    experience: null,
    employmentType: entity.employmentType ?? null,
    skills: [],
    tags: entity.tags,
    descriptionRaw: entity.description ?? null,
    description: entity.description ?? null,
    publishedAt: entity.publishedAt,
    validUntil: null
  };

  await prisma.job.upsert({
    where: { slug: entity.slug },
    create: createData,
    update: updateData
  });
}
 async function *fetchList(): AsyncGenerator<AdzunaJob> {
    let page = 1;
    const baseUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);

    while (page <= maxPages) {
      const url = new URL(baseUrl.toString());
      url.pathname = `/v1/api/jobs/${country}/search/${page}`;
      url.searchParams.set('app_id', appId);
      url.searchParams.set('app_key', appKey);
      url.searchParams.set('results_per_page', String(pageSize));
      url.searchParams.set('content-type', 'application/json');

      if (category) {
        url.searchParams.set('category', category);
      }
      if (what.length > 0) {
        url.searchParams.set('what', what);
      }

      console.log('[workers] Adzuna URL:', url.toString());

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new Error(
          `[workers] Failed to fetch Adzuna jobs: ${res.status} ${res.statusText}${
            bodyText ? ` - ${bodyText}` : ''
          }`
        );
      }

      const data = (await res.json()) as AdzunaResponse;
      const results = Array.isArray(data.results) ? data.results : [];

      console.log(
        `[workers] Adzuna page ${page}: count=${data.count ?? 'n/a'}, results=${results.length}`
      );

      for (const job of results) {
        yield job;
      }

      if (results.length < pageSize) {
        break;
      }

      page += 1;
    }
  }

  return {
    prepare: async () => {
      await ensureSourceId();
    },
    fetchList,
    normalize,
    upsert
  } satisfies Worker<AdzunaJob, NormalizedJob>;
}
