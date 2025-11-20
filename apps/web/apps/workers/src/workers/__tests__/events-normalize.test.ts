import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';

import { createEventsCsvWorker } from '../events-csv-worker';

test('normalize event row parses numeric fields and lists', () => {
  const prisma = {} as PrismaClient;
  const worker = createEventsCsvWorker(prisma, { seedDir: path.resolve(process.cwd(), 'seed') });

  const normalized = worker.normalize({
    slug: 'test-event',
    title: 'Test Event',
    regionCode: 'kyiv',
    city: 'Київ',
    remote: 'true',
    venue: 'Online',
    urlOriginal: 'https://example.com/event',
    urlRegister: 'https://example.com/register',
    skills: 'JavaScript|Node.js',
    tags: 'meetup|online',
    description: 'Meetup description',
    startAt: '2024-08-10T10:00:00.000Z',
    endAt: '2024-08-10T12:00:00.000Z',
    language: 'UK',
    priceFrom: '0',
    priceTo: '100',
    currency: 'uah'
  });

  assert.equal(normalized.remote, true);
  assert.equal(normalized.language, 'uk');
  assert.equal(normalized.priceFrom, 0);
  assert.equal(normalized.priceTo, 100);
  assert.deepEqual(normalized.skills, ['JavaScript', 'Node.js']);
  assert.deepEqual(normalized.tags, ['meetup', 'online']);
  assert.equal(normalized.startAt.toISOString(), '2024-08-10T10:00:00.000Z');
  assert.equal(normalized.endAt?.toISOString(), '2024-08-10T12:00:00.000Z');
  assert.equal(normalized.currency, 'UAH');
});

test('normalize event row handles missing optional values', () => {
  const prisma = {} as PrismaClient;
  const worker = createEventsCsvWorker(prisma, { seedDir: path.resolve(process.cwd(), 'seed') });

  const normalized = worker.normalize({
    slug: 'test-event-2',
    title: 'Test Event 2',
    remote: 'false',
    startAt: '2024-08-12T10:00:00.000Z',
    endAt: '',
    priceFrom: '',
    priceTo: '',
    skills: '',
    tags: '',
    description: ''
  });

  assert.equal(normalized.remote, false);
  assert.equal(normalized.endAt, null);
  assert.equal(normalized.priceFrom, null);
  assert.equal(normalized.priceTo, null);
  assert.deepEqual(normalized.skills, []);
  assert.deepEqual(normalized.tags, []);
  assert.equal(normalized.description, null);
});
