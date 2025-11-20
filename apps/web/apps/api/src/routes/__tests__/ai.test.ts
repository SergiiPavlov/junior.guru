import assert from 'node:assert/strict';
import test from 'node:test';

import { Hono } from 'hono';

import { registerAiRoutes } from '../ai.js';

test('POST /ai/jobs-suggest returns 503 when AI is disabled', async () => {
  const app = new Hono();
  registerAiRoutes(app);

  const response = await app.request('/ai/jobs-suggest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'test' })
  });

  assert.equal(response.status, 503);
});
