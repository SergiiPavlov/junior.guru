import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { createJobsJoobleWorker, type JoobleJob } from '../jobs-jooble-worker';

test('Jooble worker uses ResultOnPage payload and paginates correctly', async (t) => {
  const envBackup = {
    apiKey: process.env.JOOBLE_API_KEY,
    endpoint: process.env.JOOBLE_API_ENDPOINT,
    radius: process.env.JOOBLE_RADIUS,
    companysearch: process.env.JOOBLE_COMPANYSEARCH,
    searchMode: process.env.JOOBLE_SEARCH_MODE
  };

  process.env.JOOBLE_API_KEY = 'test-key';
  process.env.JOOBLE_API_ENDPOINT = 'https://example.org/api';
  process.env.JOOBLE_RADIUS = '80';
  process.env.JOOBLE_COMPANYSEARCH = 'false';
  process.env.JOOBLE_SEARCH_MODE = '0';

  const originalFetch = globalThis.fetch;
  const payloads: Array<Record<string, unknown>> = [];

  const jobsByPage: Record<number, JoobleJob[]> = {
    1: [
      { id: '1', title: 'Job 1', link: 'https://example.org/1' },
      { id: '2', title: 'Job 2', link: 'https://example.org/2' }
    ],
    2: [{ id: '3', title: 'Job 3', link: 'https://example.org/3' }]
  };

  globalThis.fetch = (async (_url, options) => {
    const parsed = JSON.parse((options as { body?: string })?.body ?? '{}') as Record<string, unknown>;
    payloads.push(parsed);
    const page = Number(parsed.page ?? 1);
    const jobs = jobsByPage[page] ?? [];

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ totalCount: 5, jobs })
    } as Response;
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    process.env.JOOBLE_API_KEY = envBackup.apiKey;
    process.env.JOOBLE_API_ENDPOINT = envBackup.endpoint;
    process.env.JOOBLE_RADIUS = envBackup.radius;
    process.env.JOOBLE_COMPANYSEARCH = envBackup.companysearch;
    process.env.JOOBLE_SEARCH_MODE = envBackup.searchMode;
  });

  const worker = createJobsJoobleWorker({} as PrismaClient, { pageSize: 2, maxPages: 3 });
  const jobs = await worker.fetchList();

  assert.equal(payloads.length, 2, 'stops after short last page');

  const firstPayload = payloads[0];
  assert.equal(firstPayload['ResultOnPage'], 2);
  assert.ok(!('size' in firstPayload));
  assert.equal(firstPayload['radius'], '80');
  assert.equal(firstPayload['companysearch'], 'false');
  assert.equal(firstPayload['SearchMode'], 0);

  const secondPayload = payloads[1];
  assert.equal(secondPayload['page'], 2);

  assert.deepEqual(jobs, [...jobsByPage[1], ...jobsByPage[2]]);
});
