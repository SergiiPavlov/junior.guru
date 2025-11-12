import type { Event, Prisma } from '@prisma/client';
import type { Hono } from 'hono';

import { prisma } from '../lib/prisma';
import { sanitizeHtml } from '../lib/sanitize-html';
import { ZodError, z } from '../lib/zod';

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

const eventQuerySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  remote: z.enum(['true', 'false']).optional().transform((value) => (value === undefined ? undefined : value === 'true')),
  skills: csvArraySchema,
  tags: csvArraySchema,
  from: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(new Date(value).getTime()), 'Invalid from date'),
  to: z
    .string()
    .optional()
    .refine((value) => value === undefined || !Number.isNaN(new Date(value).getTime()), 'Invalid to date'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['soon', 'recent']).default('soon')
});

const eventItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  city: z.string().optional(),
  regionCode: z.string().optional(),
  remote: z.boolean(),
  skills: z.array(z.string()),
  tags: z.array(z.string()),
  description: z.string().optional(),
  urlOriginal: z.string().optional(),
  urlRegister: z.string().optional(),
  venue: z.string().optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  language: z.string().optional(),
  priceFrom: z.number().optional(),
  priceTo: z.number().optional(),
  currency: z.string().optional(),
  createdAt: z.string()
});

const eventListResponseSchema = z.object({
  items: z.array(eventItemSchema),
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  total: z.number().int().min(0)
});

type EventListResponse = {
  items: Array<Prisma.EventGetPayload<{ include: { region: true } }>>;
  total: number;
};

type EventSortOption = 'soon' | 'recent';

function buildEventOrder(sort: EventSortOption): Prisma.EventOrderByWithRelationInput[] {
  switch (sort) {
    case 'recent':
      return [
        { startAt: 'desc' },
        { id: 'desc' }
      ];
    case 'soon':
    default:
      return [
        { startAt: 'asc' },
        { id: 'asc' }
      ];
  }
}

function buildEventWhere(input: ReturnType<typeof eventQuerySchema.parse>): Prisma.EventWhereInput {
  const filters: Prisma.EventWhereInput[] = [];

  if (input.q) {
    const search = input.q.trim();
    filters.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } }
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

  if (input.from) {
    const fromDate = new Date(input.from);
    if (!Number.isNaN(fromDate.getTime())) {
      filters.push({ startAt: { gte: fromDate } });
    }
  }

  if (input.to) {
    const toDate = new Date(input.to);
    if (!Number.isNaN(toDate.getTime())) {
      filters.push({ startAt: { lte: toDate } });
    }
  }

  return filters.length > 0 ? { AND: filters } : {};
}

function toEventDto(event: Event & { region: { code: string } | null }) {
  return eventItemSchema.parse({
    id: event.id,
    slug: event.slug,
    title: event.title,
    city: event.city ?? undefined,
    regionCode: event.region?.code ?? undefined,
    remote: event.remote,
    skills: event.skills ?? [],
    tags: event.tags ?? [],
    description: sanitizeHtml(event.description),
    urlOriginal: event.urlOriginal ?? undefined,
    urlRegister: event.urlRegister ?? undefined,
    venue: event.venue ?? undefined,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt ? event.endAt.toISOString() : undefined,
    language: event.language ?? undefined,
    priceFrom: event.priceFrom ?? undefined,
    priceTo: event.priceTo ?? undefined,
    currency: event.currency ?? undefined,
    createdAt: event.createdAt.toISOString()
  });
}

async function findEvents(input: ReturnType<typeof eventQuerySchema.parse>): Promise<EventListResponse> {
  const where = buildEventWhere(input);
  const orderBy = buildEventOrder(input.sort);
  const skip = (input.page - 1) * input.perPage;
  const take = input.perPage;

  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: { region: true },
      orderBy,
      skip,
      take
    }),
    prisma.event.count({ where })
  ]);

  return { items, total };
}

export function registerEventRoutes(app: Hono) {
  app.get('/events', async (context) => {
    try {
      const input = eventQuerySchema.parse(Object.fromEntries(new URL(context.req.url).searchParams.entries()));
      const result = await findEvents(input);
      const response = eventListResponseSchema.parse({
        items: result.items.map(toEventDto),
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

  app.get('/events/:id', async (context) => {
    try {
      const id = context.req.param('id');
      const event = await prisma.event.findUnique({
        where: { id },
        include: { region: true }
      });

      if (!event) {
        return context.json({ error: 'Event not found' }, 404);
      }

      return context.json(toEventDto(event));
    } catch (error) {
      if (error instanceof ZodError) {
        return context.json({ error: 'Invalid request', details: error.issues }, 400);
      }
      throw error;
    }
  });
}
