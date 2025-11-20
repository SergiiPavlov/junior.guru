import assert from 'node:assert/strict';
import test from 'node:test';

import { Hono } from 'hono';

import { registerSearchRoutes } from '../search';

const sampleJob = {
  id: 'job-1',
  slug: 'job-1',
  title: 'Job 1',
  companyName: 'Acme',
  companySlug: 'acme',
  city: 'Kyiv',
  regionCode: 'UA-30',
  remote: true,
  salaryMin: 1500,
  salaryMax: 2000,
  currency: 'USD',
  experience: 'junior',
  employmentType: 'full_time',
  skills: ['React'],
  tags: ['frontend'],
  description: 'Description',
  urlOriginal: 'https://example.com',
  urlApply: undefined,
  publishedAt: '2024-05-01T00:00:00.000Z',
  validUntil: undefined
};

test('GET /search/jobs forwards query params and returns search results', async () => {
  let capturedInput: unknown;

  const app = new Hono();
  registerSearchRoutes(app, {
    searchJobs: async (input) => {
      capturedInput = input;
      return { items: [sampleJob], total: 3, page: input.page, perPage: input.perPage, totalPages: 2, hasNext: input.page < 2, hasPrev: input.page > 1 };
    }
  });

  const response = await app.request('/search/jobs?q=react&page=2&perPage=5');
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.page, 2);
  assert.equal(body.perPage, 5);
  assert.equal(body.total, 3);
  assert.equal(body.totalPages, 2);
  assert.equal(body.hasPrev, true);
  assert.equal(body.hasNext, false);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].id, 'job-1');

  const input = capturedInput as Record<string, unknown>;
  assert.equal(input.q, 'react');
  assert.equal(input.page, 2);
  assert.equal(input.perPage, 5);
});

test('GET /search/jobs clamps page when out of range', async () => {
  const app = new Hono();
  registerSearchRoutes(app, {
    searchJobs: async (input) => {
      return { items: [sampleJob], total: 1, page: 1, perPage: input.perPage, totalPages: 1, hasNext: false, hasPrev: false };
    }
  });

  const response = await app.request('/search/jobs?page=999&perPage=2');
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.page, 1);
  assert.equal(body.perPage, 2);
  assert.equal(body.total, 1);
  assert.equal(body.totalPages, 1);
  assert.equal(body.hasNext, false);
  assert.equal(body.hasPrev, false);
});

