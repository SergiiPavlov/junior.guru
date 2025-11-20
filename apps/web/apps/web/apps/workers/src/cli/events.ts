import { prisma } from '../lib/prisma';
import { runWorker } from '../workers/base';
import { createEventsCsvWorker } from '../workers/events-csv-worker';

async function main() {
  const worker = createEventsCsvWorker(prisma);
  const result = await runWorker(worker);
  console.log(
    `✔ Events import finished (processed: ${result.processed}, skipped: ${result.skipped}, failed: ${result.failed})`
  );
}

main()
  .catch((error) => {
    console.error('[workers] Events import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
