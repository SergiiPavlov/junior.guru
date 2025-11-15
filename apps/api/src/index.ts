import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { env } from './env.js';
import { createCors } from './middleware/cors.js';
import { createRateLimit } from './middleware/rate-limit.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerDemoRoutes } from './routes/demo.js';
import { registerEventRoutes } from './routes/events.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerSearchRoutes } from './routes/search.js';
import { ensureSearchIndexes, isSearchEnabled } from './search/client.js';

const app = new Hono();

app.use('*', logger());
app.use('*', createCors(env.NEXT_PUBLIC_SITE_URL));

if (env.API_RATE_LIMIT_ENABLED) {
  app.use('*', createRateLimit({ windowMs: env.API_RATE_LIMIT_WINDOW_MS, max: env.API_RATE_LIMIT_MAX }));
}

const api = app.basePath('/api/v1');

api.get('/health', (context) => context.json({ ok: true }));

registerJobRoutes(api);
registerEventRoutes(api);
registerSearchRoutes(api);
registerAdminRoutes(api);
registerDemoRoutes(api);

if (isSearchEnabled) {
  void (async () => {
    try {
      await ensureSearchIndexes();
    } catch (error) {
      console.warn('Failed to initialize search indexes', error);
    }
  })();
} else {
  console.warn('Meilisearch indexing disabled or not configured; skipping index initialization.');
}

const port = env.PORT;
console.log(`API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
