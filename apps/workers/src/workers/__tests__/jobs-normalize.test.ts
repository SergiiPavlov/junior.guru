import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { createJobsCsvWorker } from '../jobs-csv-worker';

test('normalize job row parses booleans, numbers and lists', () => {
  const prisma = {} as PrismaClient;
  const worker = createJobsCsvWorker(prisma, { seedDir: path.resolve(process.cwd(), 'seed') });

  const normalized = worker.normalize({
    slug: 'test-job',
    title: 'Test Job',
    companySlug: 'company-slug',
    regionCode: 'kyiv',
    city: 'Київ',
    remote: 'true',
    urlOriginal: 'https://example.com/job',
    urlApply: 'https://example.com/apply',
    salaryMin: '1000',
    salaryMax: '2000',
    currency: 'usd',
    experience: 'junior',
    employmentType: 'full_time',
    skills: 'JavaScript|React ',
    tags: 'frontend|remote',
    description: 'Description',
    publishedAt: '2024-07-01T09:00:00.000Z',
    validUntil: '2024-08-01T09:00:00.000Z'
  });

  assert.equal(normalized.slug, 'test-job');
  assert.equal(normalized.remote, true);
  assert.equal(normalized.currency, 'USD');
  assert.deepEqual(normalized.skills, ['JavaScript', 'React']);
  assert.deepEqual(normalized.tags, ['frontend', 'remote']);
  assert.equal(normalized.salaryMin, 1000);
  assert.equal(normalized.salaryMax, 2000);
  assert.equal(normalized.validUntil?.toISOString(), '2024-08-01T09:00:00.000Z');
});

test('normalize job row handles empty optional fields', () => {
  const prisma = {} as PrismaClient;
  const worker = createJobsCsvWorker(prisma, { seedDir: path.resolve(process.cwd(), 'seed') });

  const normalized = worker.normalize({
    slug: 'test-job-2',
    title: 'Test Job 2',
    remote: 'false',
    salaryMin: '',
    salaryMax: '',
    skills: '',
    tags: '',
    description: '',
    publishedAt: '2024-07-05T09:00:00.000Z',
    validUntil: ''
  });

  assert.equal(normalized.remote, false);
  assert.equal(normalized.salaryMin, null);
  assert.equal(normalized.salaryMax, null);
  assert.deepEqual(normalized.skills, []);
  assert.deepEqual(normalized.tags, []);
  assert.equal(normalized.description, null);
  assert.equal(normalized.validUntil, null);
});
