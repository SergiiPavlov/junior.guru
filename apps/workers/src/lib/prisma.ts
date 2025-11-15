import { PrismaClient } from '@prisma/client';

import { registerSearchHooks } from '@junior-ua/api/search/hooks';

const globalScope = globalThis as unknown as {
  workersPrisma?: PrismaClient;
  workersSearchHooksRegistered?: boolean;
};

export const prisma = globalScope.workersPrisma ?? new PrismaClient();

if (!globalScope.workersSearchHooksRegistered) {
  registerSearchHooks(prisma);
  globalScope.workersSearchHooksRegistered = true;
}

if (process.env.NODE_ENV !== 'production') {
  globalScope.workersPrisma = prisma;
}
