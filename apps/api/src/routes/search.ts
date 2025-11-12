import type { Hono } from 'hono';

import { env } from '../env';
import { ZodError } from '../lib/zod';
import { jobListResponseSchema, jobQuerySchema } from './job-schemas';
import { reindexEvents } from '../search/events-index';
import { reindexJobs } from '../search/jobs-index';
import { searchJobsInIndex } from '../search/jobs-service';

type SearchDependencies = {
  searchJobs: typeof searchJobsInIndex;
  reindexAll: () => Promise<void>;
};

const defaultDependencies: SearchDependencies = {
  searchJobs: (input) => searchJobsInIndex(input),
  reindexAll: async () => {
    const { prisma } = await import('../lib/prisma');
    await reindexJobs(prisma);
    await reindexEvents(prisma);
  }
};

function isAuthorized(requestToken: string | undefined): boolean {
  const expectedToken = env.API_SEARCH_REINDEX_TOKEN;
  if (!expectedToken) {
    return false;
  }
  if (!requestToken) {
    return false;
  }
  const [scheme, token] = requestToken.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') {
    return false;
  }
  return token === expectedToken;
}

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

  app.post('/jobs/reindex', async (context) => {
    if (!env.API_SEARCH_REINDEX_TOKEN) {
      return context.json({ error: 'Reindexing is disabled' }, 403);
    }

    const authHeader = context.req.header('authorization');
    if (!isAuthorized(authHeader)) {
      return context.json({ error: 'Unauthorized' }, 401);
    }

    await deps.reindexAll();

    return context.json({ ok: true });
  });
}
