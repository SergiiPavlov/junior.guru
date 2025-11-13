import { admin } from './routes/admin'
import { compress } from 'hono/compress'
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { env } from './env';
import { createCors } from './middleware/cors';
import { createRateLimit } from './middleware/rate-limit';
import { registerEventRoutes } from './routes/events';
import { registerJobRoutes } from './routes/jobs';
import { registerSearchRoutes } from './routes/search';
import { ensureSearchIndexes } from './search/client';

\1
// Security & performance middleware
app.use('*', compress())
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  await next()
})

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

ensureSearchIndexes().catch((error) => {
  console.error('Failed to initialize search indexes', error);
});

const port = env.PORT;
console.log(`API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
