import type { MiddlewareHandler } from 'hono';

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Counter = {
  count: number;
  resetAt: number;
};

const IP_HEADER_CANDIDATES = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'];

function resolveClientKey(headers: Headers): string {
  for (const header of IP_HEADER_CANDIDATES) {
    const value = headers.get(header);
    if (value) {
      return value.split(',')[0]!.trim();
    }
  }
  return 'local';
}

export function createRateLimit(options: RateLimitOptions): MiddlewareHandler {
  const counters = new Map<string, Counter>();

  return async (context, next) => {
    const key = resolveClientKey(context.req.raw.headers);
    const now = Date.now();
    const existing = counters.get(key);

    if (existing && existing.resetAt > now) {
      if (existing.count >= options.max) {
        const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
        context.header('Retry-After', retryAfterSeconds.toString());
        return context.json({ error: 'Too many requests' }, 429);
      }
      existing.count += 1;
      counters.set(key, existing);
    } else {
      counters.set(key, { count: 1, resetAt: now + options.windowMs });
    }

    await next();
  };
}
