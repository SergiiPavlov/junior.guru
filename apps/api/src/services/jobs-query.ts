import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { sanitizeHtml } from '../lib/sanitize-html.js';
import { jobItemSchema, jobQuerySchema } from '../routes/job-schemas.js';

export type JobQueryInput = ReturnType<typeof jobQuerySchema.parse>;

type JobRecord = Prisma.JobGetPayload<{ include: { company: true; region: true } }>;

type JobListResponse = {
  items: JobRecord[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

function buildJobOrder(sort: JobQueryInput['sort']): Prisma.JobOrderByWithRelationInput[] {
  switch (sort) {
    case 'salary_desc':
      return [
        { salaryMin: 'desc' },
        { salaryMax: 'desc' },
        { publishedAt: 'desc' },
        { id: 'desc' }
      ];
    case 'salary_asc':
      return [
        { salaryMin: 'asc' },
        { salaryMax: 'asc' },
        { publishedAt: 'desc' },
        { id: 'desc' }
      ];
    case 'relevant':
    case 'recent':
    default:
      return [
        { publishedAt: 'desc' },
        { id: 'desc' }
      ];
  }
}

function buildJobWhere(input: JobQueryInput): Prisma.JobWhereInput {
  const filters: Prisma.JobWhereInput[] = [];

  if (input.q) {
    const search = input.q.trim();
    filters.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ]
    });
  }

  if (input.city) {
    filters.push({ city: { equals: input.city.trim(), mode: 'insensitive' } });
  }

  if (input.region) {
    filters.push({ region: { code: { equals: input.region.trim(), mode: 'insensitive' } } });
  }

  if (input.country) {
    const countryTag = `country:${input.country}`;
    filters.push({ tags: { has: countryTag } });
  }

  if (input.remote !== undefined) {
    filters.push({ remote: input.remote });
  }

  if (input.skills.length > 0) {
    // Keep skills strict: all selected skills must be present
    filters.push({ skills: { hasEvery: input.skills } });
  }

  if (input.tags.length > 0) {
    // Tags behave softer: match either job tags OR free-text fields (title/description)
    const tagFilters = input.tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => ({
        OR: [
          { tags: { has: tag } },
          { title: { contains: tag, mode: 'insensitive' } },
          { description: { contains: tag, mode: 'insensitive' } }
        ]
      }));

    if (tagFilters.length > 0) {
      filters.push({ OR: tagFilters });
    }
  }

  if (input.salaryMin !== undefined) {
    filters.push({ OR: [{ salaryMin: { gte: input.salaryMin } }, { salaryMax: { gte: input.salaryMin } }] });
  }

  if (input.currency) {
    filters.push({ currency: { equals: input.currency.trim().toUpperCase() } });
  }

  if (input.experience) {
    const experience = input.experience.trim();
    if (experience.length > 0) {
      // Experience is also soft: match dedicated field OR text fields
      filters.push({
        OR: [
          { experience: { equals: experience, mode: 'insensitive' } },
          { title: { contains: experience, mode: 'insensitive' } },
          { description: { contains: experience, mode: 'insensitive' } }
        ]
      });
    }
  }

  return filters.length > 0 ? { AND: filters } : {};
}

export async function findJobsByQuery(input: JobQueryInput): Promise<JobListResponse> {
  const where = buildJobWhere(input);
  const orderBy = buildJobOrder(input.sort);
  const perPage = input.perPage;

  const total = await prisma.job.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, input.page), totalPages);
  const skip = (page - 1) * perPage;
  const take = perPage;

  const items = await prisma.job.findMany({
    where,
    include: { company: true, region: true },
    orderBy,
    skip,
    take
  });

  return {
    items,
    total,
    page,
    perPage,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages
  };
}

export function mapJobRecordToItem(job: JobRecord) {
  return jobItemSchema.parse({
    id: job.id,
    slug: job.slug,
    title: job.title,
    companyName: job.company?.name ?? undefined,
    companySlug: job.company?.slug ?? undefined,
    city: job.city ?? undefined,
    regionCode: job.region?.code ?? undefined,
    remote: job.remote,
    salaryMin: job.salaryMin ?? undefined,
    salaryMax: job.salaryMax ?? undefined,
    currency: job.currency ?? undefined,
    experience: job.experience ?? undefined,
    employmentType: job.employmentType ?? undefined,
    skills: job.skills ?? [],
    tags: job.tags ?? [],
    description: sanitizeHtml(job.description),
    sourceUrl: job.urlOriginal ?? undefined,
    urlOriginal: job.urlOriginal ?? undefined,
    urlApply: job.urlApply ?? undefined,
    publishedAt: job.publishedAt.toISOString(),
    validUntil: job.validUntil ? job.validUntil.toISOString() : undefined
  });
}
