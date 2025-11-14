import assert from 'node:assert/strict';
import test from 'node:test';

import { searchJobsInIndex } from '../jobs-service';
import type { MeiliHttpClient, SearchParams } from '../client';
import type { JobSearchDocument } from '../jobs-index';
import type { JobQueryInput } from '../../services/jobs-query';

test('searchJobsInIndex builds filters and sorting parameters', async () => {
  let capturedQuery = '';
  let capturedParams: SearchParams | undefined;

  const fakeClient: MeiliHttpClient = {
    index: () => ({
      search: async (query: string, params: SearchParams) => {
        capturedQuery = query;
        capturedParams = params;
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
  assert.ok(capturedParams);
  assert.deepEqual(capturedParams?.sort, ['salaryMin:desc']);
  assert.equal(capturedParams?.limit, 5);
  assert.equal(capturedParams?.offset, 5);
  assert.deepEqual(capturedParams?.filter, ['isRemote = true', ['skills = "React"'], ['tags = "frontend"']]);
  assert.equal(result.total, 1);
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
      total: 1
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
  assert.equal(result.items[0].slug, 'job-1');
});
