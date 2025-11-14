import type { Company, Job, PrismaClient, Region } from '@prisma/client';

import { sanitizeHtml } from '../lib/sanitize-html';
import { JOBS_INDEX, MeiliHttpError, meiliClient } from './client';

const DESCRIPTION_LIMIT = 500;

export type JobWithRelations = Job & {
  company: Pick<Company, 'name' | 'slug'> | null;
  region: Pick<Region, 'code'> | null;
};

export type JobSearchDocument = {
  id: string;
  slug: string;
  title: string;
  companyName?: string;
  companySlug?: string;
  city?: string;
  region?: string;
  isRemote: boolean;
  skills: string[];
  tags: string[];
  descriptionHtmlTrimmed?: string;
  sourceUrl?: string;
  urlOriginal?: string;
  urlApply?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  experienceLevel?: string;
  employmentType?: string;
  postedAt: string;
  validUntil?: string;
};

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimDescription(html: string | undefined): string | undefined {
  const sanitized = sanitizeHtml(html);
  if (!sanitized) {
    return undefined;
  }
  const text = toPlainText(sanitized);
  if (!text) {
    return undefined;
  }
  if (text.length <= DESCRIPTION_LIMIT) {
    return text;
  }
  return `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`;
}

export function mapJobToSearchDocument(job: JobWithRelations): JobSearchDocument {
  const salaryFilterBase = job.salaryMin ?? job.salaryMax ?? undefined;

  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    companyName: job.company?.name ?? undefined,
    companySlug: job.company?.slug ?? undefined,
    city: job.city ?? undefined,
    region: job.region?.code ?? undefined,
    isRemote: job.remote,
    skills: job.skills ?? [],
    tags: job.tags ?? [],
    descriptionHtmlTrimmed: trimDescription(job.description ?? job.descriptionRaw ?? undefined),
    sourceUrl: job.urlOriginal ?? undefined,
    urlOriginal: job.urlOriginal ?? undefined,
    urlApply: job.urlApply ?? undefined,
    salaryMin: salaryFilterBase ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    currency: job.currency ?? undefined,
    experienceLevel: job.experience ?? undefined,
    employmentType: job.employmentType ?? undefined,
    postedAt: job.publishedAt.toISOString(),
    validUntil: job.validUntil ? job.validUntil.toISOString() : undefined
  };
}

export async function fetchJobForIndex(prisma: PrismaClient, id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: { company: true, region: true }
  });
}

export async function upsertJobDocument(prisma: PrismaClient, id: string) {
  if (!meiliClient) {
    console.warn('Search disabled; skipping job document upsert.');
    return;
  }
  const job = await fetchJobForIndex(prisma, id);

  if (!job) {
    await removeJobDocument(id);
    return;
  }

  const document = mapJobToSearchDocument(job);
  await meiliClient.index<JobSearchDocument>(JOBS_INDEX).addDocuments([document]);
}

export async function removeJobDocument(id: string) {
  if (!meiliClient) {
    return;
  }
  try {
    await meiliClient.index(JOBS_INDEX).deleteDocument(id);
  } catch (error) {
    if (error instanceof MeiliHttpError && error.status === 404) {
      return;
    }
    throw error;
  }
}

export async function reindexJobs(prisma: PrismaClient) {
  if (!meiliClient) {
    console.warn('Search disabled; skipping full jobs reindex.');
    return;
  }
  const jobs = await prisma.job.findMany({
    include: { company: true, region: true }
  });

  const documents = jobs.map(mapJobToSearchDocument);
  await meiliClient.index<JobSearchDocument>(JOBS_INDEX).replaceDocuments(documents);
}

