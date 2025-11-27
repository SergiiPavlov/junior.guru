import type { MiddlewareHandler } from 'hono';

export function createCors(allowedOrigin: string): MiddlewareHandler {
  return async (context, next) => {
    const requestOrigin = context.req.header('origin');

    if (requestOrigin && requestOrigin !== allowedOrigin) {
      return context.json({ error: 'Origin not allowed' }, 403);
    }

    if (context.req.method === 'OPTIONS') {
      context.header('Access-Control-Allow-Origin', allowedOrigin);
      context.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      context.header('Access-Control-Allow-Headers', 'Content-Type');
      context.header('Vary', 'Origin');
      return context.newResponse('', { status: 204 });
    }

    await next();

    context.header('Access-Control-Allow-Origin', allowedOrigin);
    context.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    context.header('Access-Control-Allow-Headers', 'Content-Type');
    context.header('Vary', 'Origin');
  };
}
