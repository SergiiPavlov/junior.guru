import type { Context, Hono } from 'hono';

import { env } from '../env';
import { prisma } from '../lib/prisma';
import { EVENTS_INDEX, JOBS_INDEX, meiliClient } from '../search/client';
import { reindexEvents } from '../search/events-index';
import { reindexJobs } from '../search/jobs-index';

function ensureAuthorized(context: Context) {
  const token = context.req.header('x-admin-token') ?? '';
  if (env.API_ADMIN_TOKEN && token !== env.API_ADMIN_TOKEN) {
    return context.json({ error: 'forbidden' }, 403);
  }
  return null;
}

async function fetchIndexStats() {
  const [jobs, events] = await Promise.all([
    meiliClient.index(JOBS_INDEX).getStats(),
    meiliClient.index(EVENTS_INDEX).getStats()
  ]);

  return {
    jobs: { documents: jobs.numberOfDocuments ?? 0 },
    events: { documents: events.numberOfDocuments ?? 0 }
  };
}

export function registerAdminRoutes(app: Hono) {
  app.post('/jobs/reindex', async (context) => {
    const forbidden = ensureAuthorized(context);
    if (forbidden) {
      return forbidden;
    }

    await reindexJobs(prisma);

    return context.json({ ok: true });
  });

  app.post('/events/reindex', async (context) => {
    const forbidden = ensureAuthorized(context);
    if (forbidden) {
      return forbidden;
    }

    await reindexEvents(prisma);

    return context.json({ ok: true });
  });

  app.get('/admin/stats', async (context) => {
    const forbidden = ensureAuthorized(context);
    if (forbidden) {
      return forbidden;
    }

    const stats = await fetchIndexStats();
    return context.json(stats);
  });
}
