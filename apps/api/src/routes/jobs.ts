import type { Job, Prisma } from '@prisma/client';
import type { Hono } from 'hono';

import { prisma } from '../lib/prisma';
import { sanitizeHtml } from '../lib/sanitize-html';
import { ZodError } from '../lib/zod';
import { jobItemSchema, jobListResponseSchema, jobQuerySchema } from './job-schemas';

export { jobItemSchema, jobListResponseSchema, jobQuerySchema } from './job-schemas';

type JobListResponse = {
  items: Array<Prisma.JobGetPayload<{ include: { company: true; region: true } }>>;
  total: number;
};

type SortOption = 'recent' | 'relevant' | 'salary_desc' | 'salary_asc';

function buildJobOrder(sort: SortOption): Prisma.JobOrderByWithRelationInput[] {
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

function buildJobWhere(input: ReturnType<typeof jobQuerySchema.parse>): Prisma.JobWhereInput {
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

  if (input.remote !== undefined) {
    filters.push({ remote: input.remote });
  }

  if (input.skills.length > 0) {
    filters.push({ skills: { hasEvery: input.skills } });
  }

  if (input.tags.length > 0) {
    filters.push({ tags: { hasEvery: input.tags } });
  }

  if (input.salaryMin !== undefined) {
    filters.push({ OR: [{ salaryMin: { gte: input.salaryMin } }, { salaryMax: { gte: input.salaryMin } }] });
  }

  if (input.currency) {
    filters.push({ currency: { equals: input.currency.trim().toUpperCase() } });
  }

  if (input.experience) {
    filters.push({ experience: { equals: input.experience.trim(), mode: 'insensitive' } });
  }

  return filters.length > 0 ? { AND: filters } : {};
}

function toJobDto(job: Job & { company: { name: string; slug: string } | null; region: { code: string } | null }) {
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
    urlOriginal: job.urlOriginal ?? undefined,
    urlApply: job.urlApply ?? undefined,
    publishedAt: job.publishedAt.toISOString(),
    validUntil: job.validUntil ? job.validUntil.toISOString() : undefined
  });
}

async function findJobs(input: ReturnType<typeof jobQuerySchema.parse>): Promise<JobListResponse> {
  const where = buildJobWhere(input);
  const orderBy = buildJobOrder(input.sort);
  const skip = (input.page - 1) * input.perPage;
  const take = input.perPage;

  const [items, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      include: { company: true, region: true },
      orderBy,
      skip,
      take
    }),
    prisma.job.count({ where })
  ]);

  return { items, total };
}

export function registerJobRoutes(app: Hono) {
  app.get('/jobs', async (context) => {
    try {
      const input = jobQuerySchema.parse(Object.fromEntries(new URL(context.req.url).searchParams.entries()));
      const result = await findJobs(input);
      const response = jobListResponseSchema.parse({
        items: result.items.map(toJobDto),
        page: input.page,
        perPage: input.perPage,
        total: result.total
      });
      return context.json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        return context.json({ error: 'Invalid query', details: error.issues }, 400);
      }
      throw error;
    }
  });

  app.get('/jobs/:id', async (context) => {
    try {
      const id = context.req.param('id');
      const job = await prisma.job.findUnique({
        where: { id },
        include: { company: true, region: true }
      });

      if (!job) {
        return context.json({ error: 'Job not found' }, 404);
      }

      return context.json(toJobDto(job));
    } catch (error) {
      if (error instanceof ZodError) {
        return context.json({ error: 'Invalid request', details: error.issues }, 400);
      }
      throw error;
    }
  });
}
