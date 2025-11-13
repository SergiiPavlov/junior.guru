import { PrismaClient } from '@prisma/client';

import { ensureSearchIndexes } from '../src/search/client';
import { reindexEvents } from '../src/search/events-index';
import { reindexJobs } from '../src/search/jobs-index';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Ensuring Meilisearch indexes...');
    await ensureSearchIndexes();

    console.log('Reindexing jobs...');
    await reindexJobs(prisma);

    console.log('Reindexing events...');
    await reindexEvents(prisma);

    console.log('Search reindex completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Search reindex failed:', error);
  process.exitCode = 1;
});
