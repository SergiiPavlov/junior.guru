import assert from 'node:assert/strict';
import test from 'node:test';

import { Hono } from 'hono';

import type { Env } from '../../env.js';
import { registerAiRoutes } from '../ai.js';

test('POST /ai/jobs-suggest returns 503 when AI is disabled', async () => {
  const app = new Hono();
  const disabledEnv = {
    AI_JOBS_ENABLED: false,
    OPENAI_API_KEY: undefined
  } as Pick<Env, 'AI_JOBS_ENABLED' | 'OPENAI_API_KEY'> & Partial<Env>;

  registerAiRoutes(app, { suggestJobs: () => Promise.resolve({} as never), env: disabledEnv as Env });

  const response = await app.request('/ai/jobs-suggest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'test' })
  });

  assert.equal(response.status, 503);
});
