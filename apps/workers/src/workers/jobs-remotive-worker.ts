import type { Prisma, PrismaClient } from '@prisma/client';

import type { Worker } from './base';

const SOURCE_KEY = 'external_remotive';
const SOURCE_NAME = 'Remotive';
const SOURCE_DESCRIPTION = 'Remote jobs imported from the Remotive public API.';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const REMOTIVE_ENDPOINT = process.env.REMOTIVE_API_ENDPOINT?.trim() || 'https://remotive.com/api/remote-jobs';
const REMOTIVE_CATEGORY = process.env.REMOTIVE_CATEGORY?.trim() || 'software-dev';
const REMOTIVE_SEARCH = process.env.REMOTIVE_SEARCH?.trim() || 'junior';
const REMOTIVE_LIMIT = parsePositiveInt(process.env.REMOTIVE_LIMIT, 50);

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string | null;
  company_logo: string | null;
  category: string | null;
  job_type: string | null;
  publication_date: string;
  candidate_required_location: string | null;
  salary: string | null;
  tags: string[] | null;
  description: string | null;
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₴': 'UAH'
};

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-|-$)+/g, '');
}

function buildJobSlug(raw: RemotiveJob): string {
  const parts = [raw.id, raw.title, raw.company_name]
    .map((part) => (part == null ? null : String(part).trim()))
    .filter((part): part is string => Boolean(part && part.length > 0));

  for (const part of parts) {
    const candidate = slugify(part);
    if (candidate.length > 0) {
      return `remotive-${candidate}`;
    }
  }

  return `remotive-${Date.now()}`;
}

function detectCountryCode(location: string): string | null {
  const normalized = location.toLowerCase();
  if (normalized.includes('ukraine')) {
    return 'UA';
  }
  if (normalized.includes('poland') || normalized.includes('polska')) {
    return 'PL';
  }
  if (normalized.includes('germany') || normalized.includes('deutschland')) {
    return 'DE';
  }

  return null;
}

function normalizeTags(rawTags: string[] | null): string[] {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  return rawTags
    .map((tag) => String(tag ?? ''))
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function parseSalary(value?: string | null): { min: number | null; max: number | null; currency: string | null } {
  if (!value) {
    return { min: null, max: null, currency: null };
  }

  const normalized = value.replace(/\u00a0/g, ' ').trim();
  if (!normalized) {
    return { min: null, max: null, currency: null };
  }

  const currencyMatch = normalized.match(/(USD|EUR|GBP|UAH|PLN|CZK|RON|HUF|ILS|CHF|CAD|NOK|SEK|INR|AUD|NZD|грн|₴|\$|€|£)/i);
  let currency: string | null = null;
  if (currencyMatch) {
    const token = currencyMatch[1];
    const upper = token.toUpperCase();
    if (upper === 'ГРН' || upper === '₴') {
      currency = 'UAH';
    } else if (token in CURRENCY_SYMBOLS) {
      currency = CURRENCY_SYMBOLS[token];
    } else {
      currency = upper;
    }
  }

  const matches = normalized.matchAll(/(\d+[\d\s.,]*)([kKmM])?/g);
  const numbers: number[] = [];

  for (const match of matches) {
    const rawNumber = match[1];
    const suffix = match[2] ?? null;

    if (!rawNumber) {
      continue;
    }

    const decimalMatch = rawNumber.match(/[.,](\d{1,2})(?!\d)/);
    const decimalDigits = decimalMatch ? decimalMatch[1].length : 0;

    const digitsOnly = rawNumber.replace(/[\s.,]/g, '');
    if (!digitsOnly) {
      continue;
    }

    let valueNum = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(valueNum)) {
      continue;
    }

    if (decimalDigits > 0) {
      valueNum /= 10 ** decimalDigits;
    }

    if (suffix) {
      if (suffix === 'k' || suffix === 'K') {
        valueNum *= 1_000;
      } else if (suffix === 'm' || suffix === 'M') {
        valueNum *= 1_000_000;
      }
    }

    numbers.push(valueNum);
  }

  if (numbers.length === 0) {
    return { min: null, max: null, currency };
  }

  const min = numbers[0];
  const max = numbers.length > 1 ? numbers[1] : numbers[0];
  return { min, max, currency };
}

function parsePublishedAt(value?: string | null): Date {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function createJobsRemotiveWorker(prisma: PrismaClient): Worker<RemotiveJob, NormalizedJob> {
  let sourceIdPromise: Promise<string> | null = null;
  const companyCache = new Map<string, string>();

  async function ensureSourceId(): Promise<string> {
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

  async function fetchList(): Promise<RemotiveJob[]> {
    const url = new URL(REMOTIVE_ENDPOINT);
    url.searchParams.set('category', REMOTIVE_CATEGORY);
    url.searchParams.set('search', REMOTIVE_SEARCH);
    url.searchParams.set('limit', String(REMOTIVE_LIMIT));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch Remotive jobs (${response.status} ${response.statusText})`);
    }

    const data = (await response.json()) as { 'job-count'?: number; jobs?: RemotiveJob[] };
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];

    console.log(`[workers] Remotive: job-count=${data['job-count'] ?? 'n/a'}, jobs=${jobs.length}`);

    return jobs;
  }

  async function normalize(raw: RemotiveJob): Promise<NormalizedJob | null> {
    if (!raw.title || raw.title.trim().length === 0) {
      return null;
    }

    if (!raw.url || raw.url.trim().length === 0) {
      return null;
    }

    const title = raw.title.trim();
    const slug = buildJobSlug(raw);
    const companyName = raw.company_name?.trim() || null;
    const location = raw.candidate_required_location?.trim() ?? '';
    const countryCode = location ? detectCountryCode(location) : null;
    const salary = parseSalary(raw.salary);
    const publishedAt = parsePublishedAt(raw.publication_date);
    const skills = normalizeTags(raw.tags);
    const employmentType = raw.job_type?.trim() || null;
    const description = raw.description?.trim() || null;
    const urlOriginal = raw.url.trim();

    const tags = new Set<string>(['source:remotive']);
    if (countryCode) {
      tags.add(`country:${countryCode.toUpperCase()}`);
    }
    if (raw.category?.trim()) {
      tags.add(`category:${slugify(raw.category)}`);
    }

    return {
      slug,
      title,
      companyName,
      city: null,
      regionCode: null,
      countryCode: countryCode ? countryCode.toUpperCase() : null,
      remote: true,
      urlOriginal,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      employmentType,
      description,
      publishedAt,
      tags: Array.from(tags),
      skills
    } satisfies NormalizedJob;
  }

  async function upsert(entity: NormalizedJob) {
    const sourceId = await ensureSourceId();
    const companyId = await ensureCompanyId(entity.companyName);

    const createData: Prisma.JobUncheckedCreateInput = {
      slug: entity.slug,
      sourceId,
      companyId: companyId ?? undefined,
      regionId: undefined,
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
      regionId: null,
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

  async function prepare() {
    await ensureSourceId();
  }

  return {
    prepare,
    fetchList,
    normalize,
    upsert
  } satisfies Worker<RemotiveJob, NormalizedJob>;
}

export type { RemotiveJob };
