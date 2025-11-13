import assert from 'node:assert/strict';
import test from 'node:test';

import { mapJobToSearchDocument } from '../jobs-index';

test('mapJobToSearchDocument normalizes job fields for search index', () => {
  const job = {
      id: 'job_1',
      slug: 'junior-js-developer',
      title: 'Junior JS Developer',
      companyId: 'company_1',
      sourceId: 'source_1',
      regionId: 'region_1',
      city: 'Kyiv',
      remote: true,
      urlOriginal: 'https://example.com/job',
      urlApply: 'https://example.com/apply',
      salaryMin: null,
      salaryMax: 2000,
      currency: 'USD',
      experience: 'junior',
      employmentType: 'full_time',
      skills: ['JavaScript', 'React'],
      tags: ['frontend'],
      description: '<p>Hello <strong>world</strong>!</p>',
      descriptionRaw: null,
      descriptionPlain: undefined,
      publishedAt: new Date('2024-05-01T00:00:00.000Z'),
      validUntil: new Date('2024-06-01T00:00:00.000Z'),
      createdAt: new Date('2024-04-20T00:00:00.000Z'),
      updatedAt: new Date('2024-04-21T00:00:00.000Z'),
      company: {
        name: 'Acme Inc',
        slug: 'acme'
      },
      region: {
        code: 'UA-30'
      }
    } as const;

  const document = mapJobToSearchDocument(job);

  assert.equal(document.id, 'job_1');
  assert.equal(document.slug, 'junior-js-developer');
  assert.equal(document.companyName, 'Acme Inc');
  assert.equal(document.companySlug, 'acme');
  assert.equal(document.city, 'Kyiv');
  assert.equal(document.region, 'UA-30');
  assert.equal(document.isRemote, true);
  assert.deepEqual(document.skills, ['JavaScript', 'React']);
  assert.deepEqual(document.tags, ['frontend']);
  assert.equal(document.urlOriginal, 'https://example.com/job');
  assert.equal(document.urlApply, 'https://example.com/apply');
  assert.equal(document.salaryMin, 2000);
  assert.equal(document.salaryMax, 2000);
  assert.equal(document.currency, 'USD');
  assert.equal(document.experienceLevel, 'junior');
  assert.equal(document.employmentType, 'full_time');
  assert.equal(document.postedAt, '2024-05-01T00:00:00.000Z');
  assert.equal(document.validUntil, '2024-06-01T00:00:00.000Z');
  assert.equal(document.descriptionHtmlTrimmed, 'Hello world!');
});

test('mapJobToSearchDocument trims long descriptions and keeps salary filter base', () => {
  const longText = `<p>${'content '.repeat(200)}</p>`;
  const job = {
      id: 'job_2',
      slug: 'long-description',
      title: 'Role',
      companyId: 'company_1',
      sourceId: 'source_1',
      regionId: null,
      city: null,
      remote: false,
      urlOriginal: null,
      urlApply: null,
      salaryMin: 500,
      salaryMax: null,
      currency: null,
      experience: null,
      employmentType: null,
      skills: [],
      tags: [],
      description: longText,
      descriptionRaw: null,
      publishedAt: new Date('2024-01-01T00:00:00.000Z'),
      validUntil: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      company: null,
      region: null
    } as const;

  const document = mapJobToSearchDocument(job);

  assert.match(document.descriptionHtmlTrimmed ?? '', /content content/);
  assert.match(document.descriptionHtmlTrimmed ?? '', /…$/);
  assert.equal(document.salaryMin, 500);
});
