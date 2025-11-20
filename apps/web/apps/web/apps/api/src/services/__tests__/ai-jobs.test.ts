import assert from 'node:assert/strict';
import test from 'node:test';

import { ZodError } from '../../lib/zod.js';
import { suggestJobs } from '../ai-jobs.js';
import type { JobQueryInput } from '../../search/jobs-service.js';

type FakeCompletion = {
  choices: Array<{ message?: { content?: string | null } }>;
};

test('suggestJobs maps AI filters to search query and returns jobs', async () => {
  const sampleJob = {
    id: 'job-1',
    slug: 'job-1',
    title: 'Junior React',
    companyName: 'Acme',
    companySlug: 'acme',
    city: 'Kyiv',
    regionCode: 'UA-30',
    remote: true,
    salaryMin: 30000,
    salaryMax: 35000,
    currency: 'UAH',
    experience: 'junior',
    employmentType: 'full_time',
    skills: ['React'],
    tags: ['frontend'],
    description: 'Great job',
    sourceUrl: 'https://example.com',
    urlOriginal: 'https://example.com',
    urlApply: undefined,
    publishedAt: '2024-06-01T00:00:00.000Z',
    validUntil: undefined
  };

  const fakeCompletion = async () =>
    ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              q: 'react roles',
              remote: true,
              country: 'PL',
              salaryMin: 25000,
              experience: 'junior'
            })
          }
        }
      ]
    } satisfies FakeCompletion);

  let capturedQuery: JobQueryInput | null = null;

  const result = await suggestJobs(
    { query: 'Junior React remote', locale: 'en', country: 'any', remoteOnly: false },
    {
      createChatCompletion: () => fakeCompletion,
      searchJobsInIndex: async (input) => {
        capturedQuery = input;
        return { items: [sampleJob], total: 1 };
      }
    }
  );

  assert.equal(result.jobs.length, 1);
  assert.ok(result.explanation.includes('1 jobs'));
  assert.ok(capturedQuery);
  assert.equal(capturedQuery?.q, 'react roles');
  assert.equal(capturedQuery?.remote, true);
  assert.equal(capturedQuery?.country, 'PL');
  assert.equal(capturedQuery?.salaryMin, 25000);
  assert.equal(capturedQuery?.experience, 'junior');
  assert.equal(capturedQuery?.sort, 'relevant');
});

test('suggestJobs validates payload', async () => {
  await assert.rejects(
    () =>
      suggestJobs(
        {},
        { createChatCompletion: () => async () => ({ choices: [] }), searchJobsInIndex: async () => ({ items: [], total: 0 }) }
      ),
    ZodError
  );
});
