import assert from 'node:assert/strict';
import test from 'node:test';

import { Hono } from 'hono';

import { registerJobRoutes } from '../jobs';

const jobRecord = {
  id: 'job-1',
  slug: 'job-1',
  title: 'Job 1',
  company: { name: 'Acme', slug: 'acme' },
  region: { code: 'UA-30' },
  city: 'Kyiv',
  remote: true,
  salaryMin: 1000,
  salaryMax: 1500,
  currency: 'USD',
  experience: 'junior',
  employmentType: 'full_time',
  skills: ['React'],
  tags: ['frontend'],
  description: '<p>Description</p>',
  urlOriginal: 'https://example.com',
  urlApply: 'https://example.com/apply',
  publishedAt: new Date('2024-05-01T00:00:00.000Z'),
  validUntil: null
} as const;

test('GET /jobs returns paginated response with metadata', async () => {
  const app = new Hono();
  registerJobRoutes(app, {
    findJobsByQuery: async () => ({
      items: [jobRecord] as any,
      total: 3,
      page: 1,
      perPage: 2,
      totalPages: 2,
      hasPrev: false,
      hasNext: true
    })
  });

  const response = await app.request('/jobs?page=1&perPage=2');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.page, 1);
  assert.equal(body.perPage, 2);
  assert.equal(body.total, 3);
  assert.equal(body.totalPages, 2);
  assert.equal(body.hasPrev, false);
  assert.equal(body.hasNext, true);
  assert.equal(body.items.length, 1);
});

test('GET /jobs clamps page when out of bounds', async () => {
  const app = new Hono();
  registerJobRoutes(app, {
    findJobsByQuery: async () => ({
      items: [],
      total: 0,
      page: 1,
      perPage: 2,
      totalPages: 1,
      hasPrev: false,
      hasNext: false
    })
  });

  const response = await app.request('/jobs?page=999&perPage=2');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.page, 1);
  assert.equal(body.totalPages, 1);
});
