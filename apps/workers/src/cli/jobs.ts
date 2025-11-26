import { prisma } from '../lib/prisma';
import { runWorker } from '../workers/base';
import { createJobsCsvWorker } from '../workers/jobs-csv-worker';
import { createJobsHttpWorker } from '../workers/jobs-http-worker';
import { createJobsJoobleWorker } from '../workers/jobs-jooble-worker';
import { createJobsRemotiveWorker } from '../workers/jobs-remotive-worker';
import { createJobsAdzunaWorker } from '../workers/jobs-adzuna-worker';

const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'csv';
const locationOverride = process.argv.find((arg) => arg.startsWith('--location='))?.split('=')[1];

async function main() {
  let result;
  if (mode === 'http') {
    console.log('[workers] Running HTTP jobs worker...');
    result = await runWorker(createJobsHttpWorker(prisma));
  } else if (mode === 'jooble') {
    console.log('[workers] Running Jooble jobs worker...');
    result = await runWorker(
      createJobsJoobleWorker(prisma, {
        location: locationOverride
      })
    );
  } else if (mode === 'remotive') {
    console.log('[workers] Running Remotive jobs worker...');
    result = await runWorker(createJobsRemotiveWorker(prisma));
  } else if (mode === 'adzuna') {
    console.log('[workers] Running Adzuna jobs worker...');
    result = await runWorker(createJobsAdzunaWorker(prisma));
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
