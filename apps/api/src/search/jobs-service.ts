import { jobItemSchema, jobQuerySchema } from '../routes/job-schemas';
import { JOBS_INDEX, meiliClient } from './client';
import type { MeiliHttpClient, SearchParams } from './client';
import type { JobSearchDocument } from './jobs-index';

type JobQueryInput = ReturnType<typeof jobQuerySchema.parse>;

type JobItem = ReturnType<typeof jobItemSchema['parse']>;

type JobSearchResponse = {
  items: JobItem[];
  total: number;
};

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFilters(input: JobQueryInput): SearchParams['filter'] {
  const filters: Array<string | string[]> = [];

  if (input.city) {
    filters.push(`city = "${escapeFilterValue(input.city)}"`);
  }

  if (input.region) {
    filters.push(`region = "${escapeFilterValue(input.region)}"`);
  }

  if (input.remote !== undefined) {
    filters.push(`isRemote = ${input.remote ? 'true' : 'false'}`);
  }

  if (input.skills.length > 0) {
    filters.push(input.skills.map((skill) => `skills = "${escapeFilterValue(skill)}"`));
  }

  if (input.tags.length > 0) {
    filters.push(input.tags.map((tag) => `tags = "${escapeFilterValue(tag)}"`));
  }

  if (input.salaryMin !== undefined) {
    filters.push(`salaryMin >= ${input.salaryMin}`);
  }

  if (input.currency) {
    filters.push(`currency = "${escapeFilterValue(input.currency)}"`);
  }

  if (input.experience) {
    filters.push(`experienceLevel = "${escapeFilterValue(input.experience)}"`);
  }

  return filters.length > 0 ? filters : undefined;
}

function buildSort(sort: JobQueryInput['sort']): string[] | undefined {
  switch (sort) {
    case 'salary_desc':
      return ['salaryMin:desc'];
    case 'salary_asc':
      return ['salaryMin:asc'];
    case 'recent':
      return ['postedAt:desc'];
    case 'relevant':
    default:
      return undefined;
  }
}

function mapHitToJobItem(hit: JobSearchDocument) {
  return jobItemSchema.parse({
    id: hit.id,
    slug: hit.slug,
    title: hit.title,
    companyName: hit.companyName,
    companySlug: hit.companySlug,
    city: hit.city,
    regionCode: hit.region,
    remote: hit.isRemote,
    salaryMin: hit.salaryMin,
    salaryMax: hit.salaryMax,
    currency: hit.currency,
    experience: hit.experienceLevel,
    employmentType: hit.employmentType,
    skills: hit.skills ?? [],
    tags: hit.tags ?? [],
    description: hit.descriptionHtmlTrimmed,
    sourceUrl: hit.sourceUrl ?? hit.urlOriginal,
    urlOriginal: hit.urlOriginal,
    urlApply: hit.urlApply,
    publishedAt: hit.postedAt,
    validUntil: hit.validUntil
  });
}

export async function searchJobsInIndex(
  input: JobQueryInput,
  client: MeiliHttpClient | null = meiliClient
): Promise<JobSearchResponse> {
  if (!client) {
    console.warn('Search disabled; returning empty jobs search result.');
    return { items: [], total: 0 };
  }
  const index = client.index<JobSearchDocument>(JOBS_INDEX);
  const sort = buildSort(input.sort);
  const filter = buildFilters(input);

  const response = await index.search<JobSearchDocument>(input.q ?? '', {
    offset: (input.page - 1) * input.perPage,
    limit: input.perPage,
    sort: sort && sort.length > 0 ? sort : undefined,
    filter
  });

  const items = response.hits.map(mapHitToJobItem);
  const total = response.estimatedTotalHits ?? response.hits.length;

  return { items, total };
}
