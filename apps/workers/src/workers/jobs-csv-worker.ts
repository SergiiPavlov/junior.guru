import path from 'node:path';

import type { Prisma, PrismaClient } from '@prisma/client';

import { readCsvFile } from '../utils/csv-reader';
import { emptyToNull, parseBoolean, parseDate, parseList, parseNumber } from '../lib/parsers';
import type { Worker } from './base';

const SOURCE_KEY = 'seed_csv_jobs';
const SOURCE_NAME = 'Seed CSV Jobs';
const SOURCE_DESCRIPTION = 'Mock CSV import used for local development.';

const DEFAULT_SEED_DIR = path.resolve(process.cwd(), '../..', 'seed');

type RawJobRow = {
  slug: string;
  title: string;
  companySlug?: string;
  regionCode?: string;
  city?: string;
  remote?: string;
  urlOriginal?: string;
  urlApply?: string;
  salaryMin?: string;
  salaryMax?: string;
  currency?: string;
  experience?: string;
  employmentType?: string;
  skills?: string;
  tags?: string;
  description?: string;
  publishedAt?: string;
  validUntil?: string;
};

type CompanyRow = {
  slug: string;
  name: string;
  websiteUrl?: string;
  email?: string;
  location?: string;
  description?: string;
  logoUrl?: string;
};

type RegionRow = {
  code: string;
  nameUk: string;
  nameEn: string;
};

type NormalizedJob = {
  slug: string;
  title: string;
  companySlug: string | null;
  regionCode: string | null;
  city: string | null;
  remote: boolean;
  urlOriginal: string | null;
  urlApply: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  experience: string | null;
  employmentType: string | null;
  skills: string[];
  tags: string[];
  description: string | null;
  publishedAt: Date;
  validUntil: Date | null;
};

export type JobsCsvWorker = Worker<RawJobRow, NormalizedJob>;

export function createJobsCsvWorker(
  prisma: PrismaClient,
  options: { seedDir?: string } = {}
): JobsCsvWorker {
  const seedDir = options.seedDir ?? DEFAULT_SEED_DIR;
  const jobsCsvPath = path.resolve(seedDir, 'jobs.csv');
  const companiesCsvPath = path.resolve(seedDir, 'companies.csv');
  const regionsCsvPath = path.resolve(seedDir, 'regions.csv');

  const companyCache = new Map<string, { id: string; data: CompanyRow }>();
  const regionCache = new Map<string, { id: string; data: RegionRow }>();
  let sourceIdPromise: Promise<string> | null = null;

  async function ensureSourceId(): Promise<string> {
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

  async function ensureRegions() {
    if (regionCache.size > 0) {
      return;
    }

    const regionRows = await readCsvFile<RegionRow>(regionsCsvPath);
    const results = await Promise.all(
      regionRows.map((region) =>
        prisma.region.upsert({
          where: { code: region.code },
          update: {
            nameUk: region.nameUk,
            nameEn: region.nameEn
          },
          create: {
            code: region.code,
            nameUk: region.nameUk,
            nameEn: region.nameEn
          }
        })
      )
    );

    results.forEach((region) => {
      regionCache.set(region.code, { id: region.id, data: { code: region.code, nameUk: region.nameUk, nameEn: region.nameEn } });
    });
  }

  async function ensureCompanies() {
    if (companyCache.size > 0) {
      return;
    }

    const companyRows = await readCsvFile<CompanyRow>(companiesCsvPath);
    const results = await Promise.all(
      companyRows.map((company) =>
        prisma.company.upsert({
          where: { slug: company.slug },
          update: {
            name: company.name,
            websiteUrl: emptyToNull(company.websiteUrl),
            email: emptyToNull(company.email),
            location: emptyToNull(company.location),
            description: emptyToNull(company.description),
            logoUrl: emptyToNull(company.logoUrl)
          },
          create: {
            slug: company.slug,
            name: company.name,
            websiteUrl: emptyToNull(company.websiteUrl),
            email: emptyToNull(company.email),
            location: emptyToNull(company.location),
            description: emptyToNull(company.description),
            logoUrl: emptyToNull(company.logoUrl)
          }
        })
      )
    );

    results.forEach((company, index) => {
      companyCache.set(company.slug, { id: company.id, data: companyRows[index] });
    });
  }

  function normalize(raw: RawJobRow): NormalizedJob {
    if (!raw.slug || raw.slug.trim().length === 0) {
      throw new Error('Job slug cannot be empty.');
    }

    if (!raw.title || raw.title.trim().length === 0) {
      throw new Error(`Job "${raw.slug}" is missing title.`);
    }

    const publishedAt = parseDate(raw.publishedAt);
    if (!publishedAt) {
      throw new Error(`Job "${raw.slug}" is missing publishedAt date.`);
    }

    const validUntil = parseDate(raw.validUntil ?? undefined);

    return {
      slug: raw.slug.trim(),
      title: raw.title.trim(),
      companySlug: emptyToNull(raw.companySlug),
      regionCode: emptyToNull(raw.regionCode),
      city: emptyToNull(raw.city),
      remote: parseBoolean(raw.remote ?? 'false'),
      urlOriginal: emptyToNull(raw.urlOriginal),
      urlApply: emptyToNull(raw.urlApply),
      salaryMin: parseNumber(raw.salaryMin),
      salaryMax: parseNumber(raw.salaryMax),
      currency: emptyToNull(raw.currency)?.toUpperCase() ?? null,
      experience: emptyToNull(raw.experience),
      employmentType: emptyToNull(raw.employmentType),
      skills: parseList(raw.skills),
      tags: parseList(raw.tags),
      description: emptyToNull(raw.description),
      publishedAt,
      validUntil
    };
  }

  async function upsert(normalized: NormalizedJob) {
    const sourceId = await ensureSourceId();
    await ensureRegions();
    await ensureCompanies();

    let companyId: string | null = null;
    if (normalized.companySlug) {
      const company = companyCache.get(normalized.companySlug);
      if (company) {
        companyId = company.id;
      } else {
        const created = await prisma.company.create({
          data: {
            slug: normalized.companySlug,
            name: normalized.companySlug
          }
        });
        companyCache.set(normalized.companySlug, { id: created.id, data: { slug: normalized.companySlug, name: normalized.companySlug } });
        companyId = created.id;
      }
    }

    let regionId: string | null = null;
    if (normalized.regionCode) {
      const region = regionCache.get(normalized.regionCode);
      if (region) {
        regionId = region.id;
      }
    }

    const createData: Prisma.JobUncheckedCreateInput = {
      slug: normalized.slug,
      sourceId,
      companyId: companyId ?? undefined,
      regionId: regionId ?? undefined,
      title: normalized.title,
      city: normalized.city ?? undefined,
      remote: normalized.remote,
      urlOriginal: normalized.urlOriginal ?? undefined,
      urlApply: normalized.urlApply ?? undefined,
      salaryMin: normalized.salaryMin ?? undefined,
      salaryMax: normalized.salaryMax ?? undefined,
      currency: normalized.currency ?? undefined,
      experience: normalized.experience ?? undefined,
      employmentType: normalized.employmentType ?? undefined,
      skills: normalized.skills,
      tags: normalized.tags,
      descriptionRaw: normalized.description ?? undefined,
      description: normalized.description ?? undefined,
      publishedAt: normalized.publishedAt,
      validUntil: normalized.validUntil ?? undefined
    };

    const updateData: Prisma.JobUncheckedUpdateInput = {
      sourceId,
      companyId: companyId ?? null,
      regionId: regionId ?? null,
      title: normalized.title,
      city: normalized.city ?? null,
      remote: normalized.remote,
      urlOriginal: normalized.urlOriginal ?? null,
      urlApply: normalized.urlApply ?? null,
      salaryMin: normalized.salaryMin,
      salaryMax: normalized.salaryMax,
      currency: normalized.currency ?? null,
      experience: normalized.experience ?? null,
      employmentType: normalized.employmentType ?? null,
      skills: normalized.skills,
      tags: normalized.tags,
      descriptionRaw: normalized.description ?? null,
      description: normalized.description ?? null,
      publishedAt: normalized.publishedAt,
      validUntil: normalized.validUntil
    };

    await prisma.job.upsert({
      where: { slug: normalized.slug },
      create: createData,
      update: updateData
    });
  }

  return {
    prepare: async () => {
      await ensureSourceId();
      await ensureRegions();
      await ensureCompanies();
    },
    fetchList: async () => readCsvFile<RawJobRow>(jobsCsvPath),
    normalize,
    upsert
  } satisfies JobsCsvWorker;
}
