import { ZodError, z } from './lib/zod';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
  throw new ZodError([{ path: ['API_RATE_LIMIT_ENABLED'], message: `Invalid boolean value: ${value}` }]);
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
    .transform((value) => parseBoolean(value, true)),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(60),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  MEILI_HOST: z
    .string()
    .optional()
    .transform((value) => value ?? 'http://localhost:7700')
    .refine((value) => {
      try {
        // eslint-disable-next-line no-new
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, 'MEILI_HOST must be a valid URL'),
  MEILI_MASTER_KEY: z.string().optional().default(''),
  API_SEARCH_REINDEX_TOKEN: z.string().optional()
});

const parsed = envSchema.parse(process.env as Record<string, unknown>);

export const env = parsed;

type Env = typeof env;

export type { Env };
