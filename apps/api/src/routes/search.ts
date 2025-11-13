import type { Hono } from 'hono';

import { ZodError } from '../lib/zod';
import { jobListResponseSchema, jobQuerySchema } from './job-schemas';
import { searchJobsInIndex } from '../search/jobs-service';

type SearchDependencies = {
  searchJobs: typeof searchJobsInIndex;
};

const defaultDependencies: SearchDependencies = {
  searchJobs: (input) => searchJobsInIndex(input)
};

export function registerSearchRoutes(app: Hono, deps: SearchDependencies = defaultDependencies) {
  app.get('/search/jobs', async (context) => {
    try {
      const input = jobQuerySchema.parse(Object.fromEntries(new URL(context.req.url).searchParams.entries()));
      const result = await deps.searchJobs(input);
      const response = jobListResponseSchema.parse({
        items: result.items,
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

}
