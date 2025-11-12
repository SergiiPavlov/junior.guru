import { prisma } from '../lib/prisma';
import { runWorker } from '../workers/base';
import { createJobsCsvWorker } from '../workers/jobs-csv-worker';

async function main() {
  const worker = createJobsCsvWorker(prisma);
  const result = await runWorker(worker);
  console.log(`✔ Jobs import finished (processed: ${result.processed}, skipped: ${result.skipped}, failed: ${result.failed})`);
}

main()
  .catch((error) => {
    console.error('[workers] Jobs import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
