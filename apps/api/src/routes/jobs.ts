import type { Hono } from 'hono';

import { prisma } from '../lib/prisma.js';
import { ZodError } from '../lib/zod.js';
import { findJobsByQuery, mapJobRecordToItem } from '../services/jobs-query.js';
import { jobItemSchema, jobListResponseSchema, jobQuerySchema } from './job-schemas.js';

export { jobItemSchema, jobListResponseSchema, jobQuerySchema } from './job-schemas.js';

type JobDependencies = {
  findJobsByQuery: typeof findJobsByQuery;
};

const defaultJobDeps: JobDependencies = {
  findJobsByQuery
};

export function registerJobRoutes(app: Hono, deps: JobDependencies = defaultJobDeps) {
  app.get('/jobs', async (context) => {
    try {
      const input = jobQuerySchema.parse(Object.fromEntries(new URL(context.req.url).searchParams.entries()));
      const result = await deps.findJobsByQuery(input);
      const response = jobListResponseSchema.parse({
        items: result.items.map(mapJobRecordToItem),
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        totalPages: result.totalPages,
        hasPrev: result.hasPrev,
        hasNext: result.hasNext
      });
      return context.json(response);
    } catch (error: unknown) {
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

      return context.json(mapJobRecordToItem(job));
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return context.json({ error: 'Invalid request', details: error.issues }, 400);
      }
      throw error;
    }
  });
}
