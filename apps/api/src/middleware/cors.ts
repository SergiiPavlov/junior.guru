import type { MiddlewareHandler } from 'hono';

export function createCors(allowedOrigin: string): MiddlewareHandler {
  // убираем слэш в конце, если он есть
  const normalizedAllowedOrigin = allowedOrigin.replace(/\/$/, '');

  return async (context, next) => {
    const requestOriginHeader = context.req.header('origin');
    const requestOrigin = requestOriginHeader
      ? requestOriginHeader.replace(/\/$/, '')
      : undefined;

    if (requestOrigin && requestOrigin !== normalizedAllowedOrigin) {
      return context.json({ error: 'Origin not allowed' }, 403);
    }

    if (context.req.method === 'OPTIONS') {
      context.header('Access-Control-Allow-Origin', normalizedAllowedOrigin);
      context.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      context.header('Access-Control-Allow-Headers', 'Content-Type');
      context.header('Vary', 'Origin');
      return context.newResponse('', { status: 204 });
    }

    await next();

    context.header('Access-Control-Allow-Origin', normalizedAllowedOrigin);
    context.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    context.header('Access-Control-Allow-Headers', 'Content-Type');
    context.header('Vary', 'Origin');
  };
}
