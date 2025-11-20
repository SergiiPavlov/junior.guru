import assert from 'node:assert/strict';
import test from 'node:test';

import { searchJobsInIndex } from '../jobs-service';
import type { MeiliHttpClient, SearchParams } from '../client';
import type { JobSearchDocument } from '../jobs-index';
import type { JobQueryInput } from '../../services/jobs-query';

test('searchJobsInIndex builds filters and sorting parameters', async () => {
  let capturedQuery = '';
  const capturedParams: SearchParams[] = [];

  const fakeClient: MeiliHttpClient = {
    index: () => ({
      search: async (query: string, params: SearchParams) => {
        capturedQuery = query;
        capturedParams.push(params);
        const hit: JobSearchDocument = {
          id: 'job-1',
          slug: 'job-1',
          title: 'Job 1',
          companyName: 'Acme',
          companySlug: 'acme',
          city: 'Kyiv',
          region: 'UA-30',
          isRemote: true,
          skills: ['React'],
          tags: ['frontend'],
          descriptionHtmlTrimmed: 'Description',
          sourceUrl: 'https://example.com',
          urlOriginal: 'https://example.com',
          urlApply: undefined,
          salaryMin: 2000,
          salaryMax: 2000,
          currency: 'USD',
          experienceLevel: 'junior',
          employmentType: 'full_time',
          postedAt: '2024-05-01T00:00:00.000Z',
          validUntil: undefined
        };
        return { hits: [hit], estimatedTotalHits: 1 };
      }
    })
  } as unknown as MeiliHttpClient;

  const result = await searchJobsInIndex(
    {
      q: 'react',
      city: undefined,
      region: undefined,
      remote: true,
      skills: ['React'],
      tags: ['frontend'],
      salaryMin: undefined,
      currency: undefined,
      experience: undefined,
      page: 2,
      perPage: 5,
      sort: 'salary_desc'
    },
    fakeClient
  );

  assert.equal(capturedQuery, 'react');
  assert.ok(capturedParams.length >= 1);
  const firstParams = capturedParams[0];
  assert.deepEqual(firstParams?.sort, ['salaryMin:desc']);
  assert.equal(firstParams?.limit, 5);
  assert.equal(firstParams?.offset, 5);
  assert.deepEqual(firstParams?.filter, ['isRemote = true', ['skills = "React"'], ['tags = "frontend"']]);
  const lastParams = capturedParams[capturedParams.length - 1];
  assert.equal(lastParams?.offset, 0);
  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.perPage, 5);
  assert.equal(result.totalPages, 1);
  assert.equal(result.hasNext, false);
  assert.equal(result.hasPrev, false);
  assert.equal(result.items[0].id, 'job-1');
});

test('searchJobsInIndex falls back to Prisma query when client is missing', async () => {
  let fallbackCalled = false;

  const fakeFallback = async (_input: JobQueryInput) => {
    fallbackCalled = true;
    return {
      items: [
        {
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
        }
      ] as any,
      total: 1,
      page: 1,
      perPage: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    };
  };

  const result = await searchJobsInIndex(
    {
      q: 'react',
      city: undefined,
      region: undefined,
      remote: true,
      skills: [],
      tags: [],
      salaryMin: undefined,
      currency: undefined,
      experience: undefined,
      page: 1,
      perPage: 10,
      sort: 'recent'
    },
    null,
    fakeFallback
  );

  assert.equal(fallbackCalled, true);
  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.hasNext, false);
  assert.equal(result.hasPrev, false);
  assert.equal(result.items[0].slug, 'job-1');
});
