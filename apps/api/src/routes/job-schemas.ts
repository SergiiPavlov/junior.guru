import { z } from '../lib/zod.js';

const csvArraySchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
      .filter((item) => item.length > 0);
  }
  return [];
}, z.array(z.string()).default([]));

const jobQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  remote: z
    .enum(['true', 'false'])
    .optional()
    .transform((value: string | undefined) => (value === undefined ? undefined : value === 'true')),
  skills: csvArraySchema,
  tags: csvArraySchema,
  salaryMin: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  experience: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['recent', 'relevant', 'salary_desc', 'salary_asc']).default('recent')
});

const jobItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  companyName: z.string().optional(),
  companySlug: z.string().optional(),
  city: z.string().optional(),
  regionCode: z.string().optional(),
  remote: z.boolean(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  currency: z.string().optional(),
  experience: z.string().optional(),
  employmentType: z.string().optional(),
  skills: z.array(z.string()),
  tags: z.array(z.string()),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
  urlOriginal: z.string().optional(),
  urlApply: z.string().optional(),
  publishedAt: z.string(),
  validUntil: z.string().optional()
});

const jobListResponseSchema = z.object({
  items: z.array(jobItemSchema),
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  total: z.number().int().min(0)
});

export { csvArraySchema, jobItemSchema, jobListResponseSchema, jobQuerySchema };
