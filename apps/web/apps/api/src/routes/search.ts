import type { Hono } from 'hono';

import { ZodError } from '../lib/zod.js';
import { jobListResponseSchema, jobQuerySchema } from './job-schemas.js';
import { searchJobsInIndex } from '../search/jobs-service.js';

type SearchDependencies = {
  searchJobs: typeof searchJobsInIndex;
};

const defaultDependencies: SearchDependencies = {
  searchJobs: searchJobsInIndex
};

export function registerSearchRoutes(app: Hono, deps: SearchDependencies = defaultDependencies) {
  app.get('/search/jobs', async (context) => {
    try {
      const input = jobQuerySchema.parse(Object.fromEntries(new URL(context.req.url).searchParams.entries()));
      const result = await deps.searchJobs(input);
      const response = jobListResponseSchema.parse({
        items: result.items,
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

}
