import type { Prisma, PrismaClient } from '@prisma/client';

import type { Worker } from './base';

const SOURCE_KEY = 'external_jooble';
const SOURCE_NAME = 'Jooble';
const SOURCE_DESCRIPTION = 'Real jobs imported from the Jooble public API.';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULT_QUERY = process.env.JOOBLE_QUERY?.trim() || 'junior developer';
const DEFAULT_PAGE_SIZE = parsePositiveInt(process.env.JOOBLE_PAGE_SIZE, 20);
const DEFAULT_MAX_PAGES = parsePositiveInt(process.env.JOOBLE_MAX_PAGES, 1);

const COUNTRY_ALIASES: Record<string, string> = {
  ukraine: 'UA',
  'україна': 'UA',
  'украина': 'UA',
  poland: 'PL',
  polska: 'PL',
  germany: 'DE',
  deutschland: 'DE',
  slovakia: 'SK',
  'czech republic': 'CZ',
  'czechia': 'CZ',
  romania: 'RO',
  bulgaria: 'BG',
  spain: 'ES',
  portugal: 'PT',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  england: 'GB',
  france: 'FR',
  italy: 'IT',
  netherlands: 'NL',
  belgium: 'BE',
  canada: 'CA',
  sweden: 'SE',
  norway: 'NO',
  finland: 'FI'
};

type JoobleJob = {
  id?: string;
  title?: string;
  link?: string;
  company?: string;
  location?: string;
  snippet?: string;
  description?: string;
  updated?: string;
  salary?: string;
  type?: string;
  worktype?: string;
  remote?: boolean;
};

type JoobleResponse = {
  jobs?: JoobleJob[];
};

type NormalizedJob = {
  slug: string;
  title: string;
  companyName: string | null;
  city: string | null;
  regionCode: string | null;
  countryCode: string | null;
  remote: boolean;
  urlOriginal: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  employmentType: string | null;
  description: string | null;
  publishedAt: Date;
  tags: string[];
  skills: string[];
};

type RegionRecord = {
  id: string;
  code: string;
  keywords: string[];
};

type JobsJoobleWorkerOptions = {
  location?: string;
  query?: string;
  pageSize?: number;
  maxPages?: number;
};

function buildApiUrl(endpoint: string, apiKey: string): string {
  const trimmed = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  return `${trimmed}/${apiKey}`;
}

function normalizeCurrency(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.toUpperCase();
}

function parseSalary(value?: string | null): { min: number | null; max: number | null; currency: string | null } {
  if (!value) {
    return { min: null, max: null, currency: null };
  }

  const normalized = value.replace(/\u00a0/g, ' ').trim();
  if (!normalized) {
    return { min: null, max: null, currency: null };
  }

  const currencyMatch = normalized.match(/(USD|EUR|UAH|PLN|GBP|CZK|RON|HUF|ILS|CHF|CAD|NOK|SEK|INR|грн|₴)/i);
  let currency: string | null = null;
  if (currencyMatch) {
    const token = currencyMatch[1].toUpperCase();
    currency = token === 'ГРН' || token === '₴' ? 'UAH' : token;
  }

  const numberMatches = normalized.match(/(\d+[\d\s.,]*)/g);
  if (!numberMatches || numberMatches.length === 0) {
    return { min: null, max: null, currency };
  }

  const numbers = numberMatches
    .map((match) => Number.parseInt(match.replace(/[\s,]/g, ''), 10))
    .filter((num) => Number.isFinite(num));

  if (numbers.length === 0) {
    return { min: null, max: null, currency };
  }

  const min = numbers[0];
  const max = numbers.length > 1 ? numbers[1] : numbers[0];
  return { min, max, currency };
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-|-$)+/g, '');
}

function buildJobSlug(raw: JoobleJob): string {
  const parts = [raw.id, raw.title, raw.location].filter((part): part is string => Boolean(part && part.trim().length > 0));
  for (const part of parts) {
    const candidate = slugify(part);
    if (candidate.length > 0) {
      return `jooble-${candidate}`;
    }
  }

  return `jooble-${Date.now()}`;
}

function parseLocation(rawLocation?: string | null): { city: string | null; countryCode: string | null } {
  if (!rawLocation) {
    return { city: null, countryCode: null };
  }

  const clean = rawLocation.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return { city: null, countryCode: null };
  }

  const parts = clean.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
  let city = parts.length > 0 ? parts[0] : null;
  const cityLower = city?.toLowerCase();
  if (cityLower && ['remote', 'віддалено', 'віддалена'].includes(cityLower)) {
    city = null;
  }

  let countryCode: string | null = null;
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const lower = parts[index].toLowerCase();
    if (COUNTRY_ALIASES[lower]) {
      countryCode = COUNTRY_ALIASES[lower];
      break;
    }
    if (/^[a-z]{2}$/i.test(parts[index])) {
      countryCode = parts[index].toUpperCase();
      break;
    }
  }

  if (!countryCode && /ukraine/i.test(clean)) {
    countryCode = 'UA';
  }

  return { city, countryCode };
}

function detectRemote(raw: JoobleJob): boolean {
  const candidates = [raw.remote ? 'remote' : '', raw.location, raw.worktype, raw.type, raw.description, raw.snippet]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  return candidates.includes('remote') || candidates.includes('віддалено') || candidates.includes('віддалена') || candidates.includes('remotely');
}

function normalizeEmploymentType(raw: JoobleJob): string | null {
  const value = raw.worktype || raw.type;
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createJobsJoobleWorker(
  prisma: PrismaClient,
  options: JobsJoobleWorkerOptions = {}
): Worker<JoobleJob, NormalizedJob> {
  const apiKey = process.env.JOOBLE_API_KEY?.trim();
  const apiEndpoint = process.env.JOOBLE_API_ENDPOINT?.trim();
  const locationDefault = process.env.JOOBLE_LOCATION_DEFAULT?.trim() || 'Ukraine';
  const locationOverrideEnv = process.env.JOOBLE_LOCATION_OVERRIDE?.trim();
  const location = options.location?.trim() || locationOverrideEnv || locationDefault;
  const query = options.query?.trim() || DEFAULT_QUERY;
  const resolvedPageSize = typeof options.pageSize === 'number' ? options.pageSize : DEFAULT_PAGE_SIZE;
  const pageSize = Math.max(1, Math.floor(Number.isFinite(resolvedPageSize) ? resolvedPageSize : DEFAULT_PAGE_SIZE));
  const resolvedMaxPages = typeof options.maxPages === 'number' ? options.maxPages : DEFAULT_MAX_PAGES;
  const maxPages = Math.max(1, Math.floor(Number.isFinite(resolvedMaxPages) ? resolvedMaxPages : DEFAULT_MAX_PAGES));

  let disabledLogged = false;
  let sourceIdPromise: Promise<string> | null = null;
  const companyCache = new Map<string, string>();
  const regionsByCode = new Map<string, RegionRecord>();
  const regionMatchers: RegionRecord[] = [];

  async function ensureSourceId() {
    if (!sourceIdPromise) {
      sourceIdPromise = prisma.source
        .upsert({
          where: { key: SOURCE_KEY },
          update: { name: SOURCE_NAME, description: SOURCE_DESCRIPTION, type: 'job_board' },
          create: { key: SOURCE_KEY, name: SOURCE_NAME, description: SOURCE_DESCRIPTION, type: 'job_board' }
        })
        .then((source) => source.id);
    }

    return sourceIdPromise;
  }

  async function ensureRegions() {
    if (regionMatchers.length > 0) {
      return;
    }

    const regions = await prisma.region.findMany();
    regions.forEach((region) => {
      const keywords = [region.code, region.nameEn ?? '', region.nameUk ?? '']
        .map((value) => value.toLowerCase())
        .filter((value) => value.length > 0);
      const record: RegionRecord = { id: region.id, code: region.code, keywords };
      regionMatchers.push(record);
      regionsByCode.set(region.code.toLowerCase(), record);
    });
  }

  function findRegionCode(locationValue: string | null, countryCode: string | null): string | null {
    if (!locationValue || countryCode !== 'UA') {
      return null;
    }

    const normalized = locationValue.toLowerCase();
    for (const region of regionMatchers) {
      if (region.keywords.some((keyword) => keyword && normalized.includes(keyword))) {
        return region.code;
      }
    }

    const city = locationValue.split(',')[0]?.trim().toLowerCase();
    if (!city) {
      return null;
    }

    for (const region of regionMatchers) {
      if (region.keywords.includes(city)) {
        return region.code;
      }
    }

    return null;
  }

  async function ensureCompanyId(companyName: string | null): Promise<string | null> {
    if (!companyName) {
      return null;
    }

    const slug = slugify(companyName);
    if (!slug) {
      return null;
    }

    if (companyCache.has(slug)) {
      return companyCache.get(slug) ?? null;
    }

    const company = await prisma.company.upsert({
      where: { slug },
      update: { name: companyName.trim() },
      create: { slug, name: companyName.trim() }
    });

    companyCache.set(slug, company.id);
    return company.id;
  }

  async function normalize(raw: JoobleJob): Promise<NormalizedJob | null> {
    await ensureRegions();

    if (!raw.title || raw.title.trim().length === 0) {
      return null;
    }

    if (!raw.link || raw.link.trim().length === 0) {
      return null;
    }

    const title = raw.title.trim();
    const slug = buildJobSlug(raw);
    const { city, countryCode } = parseLocation(raw.location);
    const regionCode = findRegionCode(raw.location ?? null, countryCode);
    const salary = parseSalary(raw.salary);
    const publishedAt = parseDate(raw.updated) ?? new Date();
    const remote = detectRemote(raw);
    const employmentType = normalizeEmploymentType(raw);
    const tags = new Set<string>(['source:jooble']);
    if (countryCode) {
      tags.add(`country:${countryCode.toUpperCase()}`);
    }

    return {
      slug,
      title,
      companyName: raw.company?.trim() || null,
      city,
      regionCode,
      countryCode,
      remote,
      urlOriginal: raw.link?.trim() || null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: normalizeCurrency(salary.currency),
      employmentType,
      description: raw.description?.trim() || raw.snippet?.trim() || null,
      publishedAt,
      tags: Array.from(tags),
      skills: []
    } satisfies NormalizedJob;
  }

  async function upsert(entity: NormalizedJob) {
    const sourceId = await ensureSourceId();
    await ensureRegions();

    let companyId: string | null = null;
    if (entity.companyName) {
      companyId = await ensureCompanyId(entity.companyName);
    }

    let regionId: string | null = null;
    if (entity.regionCode) {
      const record = regionsByCode.get(entity.regionCode.toLowerCase());
      regionId = record?.id ?? null;
    }

    const createData: Prisma.JobUncheckedCreateInput = {
      slug: entity.slug,
      sourceId,
      companyId: companyId ?? undefined,
      regionId: regionId ?? undefined,
      title: entity.title,
      city: entity.city ?? undefined,
      remote: entity.remote,
      urlOriginal: entity.urlOriginal ?? undefined,
      urlApply: null,
      salaryMin: entity.salaryMin ?? undefined,
      salaryMax: entity.salaryMax ?? undefined,
      currency: entity.currency ?? undefined,
      experience: null,
      employmentType: entity.employmentType ?? undefined,
      skills: entity.skills,
      tags: entity.tags,
      descriptionRaw: entity.description ?? undefined,
      description: entity.description ?? undefined,
      publishedAt: entity.publishedAt,
      validUntil: undefined
    } satisfies Prisma.JobUncheckedCreateInput;

    const updateData: Prisma.JobUncheckedUpdateInput = {
      sourceId,
      companyId: companyId ?? null,
      regionId: regionId ?? null,
      title: entity.title,
      city: entity.city ?? null,
      remote: entity.remote,
      urlOriginal: entity.urlOriginal ?? null,
      salaryMin: entity.salaryMin,
      salaryMax: entity.salaryMax,
      currency: entity.currency ?? null,
      experience: null,
      employmentType: entity.employmentType ?? null,
      skills: entity.skills,
      tags: entity.tags,
      descriptionRaw: entity.description ?? null,
      description: entity.description ?? null,
      publishedAt: entity.publishedAt,
      validUntil: null
    } satisfies Prisma.JobUncheckedUpdateInput;

    await prisma.job.upsert({
      where: { slug: entity.slug },
      create: createData,
      update: updateData
    });
  }

  async function fetchList(): Promise<JoobleJob[]> {
    if (!apiKey || !apiEndpoint) {
      if (!disabledLogged) {
        console.warn('[workers] Jooble integration disabled (missing JOOBLE_API_KEY or JOOBLE_API_ENDPOINT).');
        disabledLogged = true;
      }
      return [];
    }

    const url = buildApiUrl(apiEndpoint, apiKey);
    const jobs: JoobleJob[] = [];

    for (let page = 1; page <= maxPages; page += 1) {
      const payload = {
        keywords: query,
        location,
        page,
        size: pageSize
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Jooble jobs (status ${response.status} ${response.statusText})`);
      }

      const data = (await response.json()) as JoobleResponse;
      const batch = Array.isArray(data.jobs) ? data.jobs : [];
      jobs.push(...batch);

      if (batch.length < pageSize) {
        break;
      }
    }

    return jobs;
  }

  return {
    prepare: async () => {
      await ensureSourceId();
      await ensureRegions();
    },
    fetchList,
    normalize,
    upsert
  } satisfies Worker<JoobleJob, NormalizedJob>;
}

export type { JoobleJob };
