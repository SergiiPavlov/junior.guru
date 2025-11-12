import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { env } from './env';
import { createCors } from './middleware/cors';
import { createRateLimit } from './middleware/rate-limit';
import { registerEventRoutes } from './routes/events';
import { registerJobRoutes } from './routes/jobs';

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

const port = env.PORT;
console.log(`API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
