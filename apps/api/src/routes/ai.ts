import type { Hono } from 'hono';

import { env } from '../env.js';
import { ZodError } from '../lib/zod.js';
import { suggestJobs } from '../services/ai-jobs.js';
import type { Env } from '../env.js';

type AiDependencies = {
  suggestJobs: typeof suggestJobs;
  env: Env;
};

const defaultDeps: AiDependencies = {
  suggestJobs,
  env
};

export function registerAiRoutes(app: Hono, deps: AiDependencies = defaultDeps) {
  app.post('/ai/jobs-suggest', async (c) => {
    if (!deps.env.AI_JOBS_ENABLED || !deps.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI assistant is not configured' }, 503);
    }

    try {
      const body = await c.req.json();
      const result = await deps.suggestJobs(body);
      return c.json(result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return c.json({ error: 'Invalid request', details: error.issues }, 400);
      }
      console.error('AI jobs error', error);
      return c.json({ error: 'AI jobs assistant failed' }, 500);
    }
  });
}
