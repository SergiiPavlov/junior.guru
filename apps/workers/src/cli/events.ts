import { prisma } from '../lib/prisma';
import { runWorker } from '../workers/base';
import { createEventsCsvWorker } from '../workers/events-csv-worker';
import { createEventsEventbriteWorker } from '../workers/events-eventbrite-worker';

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'csv';

async function main() {
  let worker;

  if (mode === 'eventbrite') {
    console.log('[workers] Running Eventbrite events worker...');
    worker = createEventsEventbriteWorker(prisma);
  } else {
    console.log('[workers] Running CSV events worker...');
    worker = createEventsCsvWorker(prisma);
  }

  const result = await runWorker(worker);
  console.log(
    `✔ Events import finished (mode=${mode}, processed: ${result.processed}, skipped: ${result.skipped}, failed: ${result.failed})`
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
