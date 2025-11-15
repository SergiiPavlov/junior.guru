import { prisma } from '../lib/prisma';
import { runWorker } from '../workers/base';
import { createJobsCsvWorker } from '../workers/jobs-csv-worker';
import { createJobsHttpWorker } from '../workers/jobs-http-worker';

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'csv';

async function main() {
  let result;
  if (mode === 'http') {
    console.log('[workers] Running HTTP jobs worker...');
    result = await runWorker(createJobsHttpWorker(prisma));
  } else {
    console.log('[workers] Running CSV jobs worker...');
    result = await runWorker(createJobsCsvWorker(prisma));
  }

  console.log(
    `✔ Jobs import finished (mode=${mode}, processed: ${result.processed}, skipped: ${result.skipped}, failed: ${result.failed})`
  );
}

main()
  .catch((error) => {
    console.error('[workers] Jobs import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
