import { ZodError, z } from './lib/zod';

function parseBoolean(key: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
  throw new ZodError([{ path: [key], message: `Invalid boolean value: ${value}` }]);
}

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .optional()
    .transform((value) => value ?? 'http://localhost:3000')
    .refine((value) => {
      try {
        // eslint-disable-next-line no-new
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, 'NEXT_PUBLIC_SITE_URL must be a valid URL'),
  API_RATE_LIMIT_ENABLED: z
    .string()
    .optional()
    .transform((value) => parseBoolean('API_RATE_LIMIT_ENABLED', value, true)),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(60),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  MEILI_HOST: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined)
    .refine((value) => {
      if (!value) return true;
      try {
        // eslint-disable-next-line no-new
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, 'MEILI_HOST must be a valid URL when provided'),
  MEILI_MASTER_KEY: z.string().optional().default(''),
  API_SEARCH_ENABLED: z
    .string()
    .optional()
    .transform((value) => parseBoolean('API_SEARCH_ENABLED', value, true)),
  API_ADMIN_TOKEN: z.string().optional().default('')
});

const parsed = envSchema.parse(process.env as Record<string, unknown>);

export const env = parsed;

type Env = typeof env;

export type { Env };
