import { PrismaClient } from '@prisma/client';

import { registerSearchHooks } from '../search/hooks.js';

const globalScope = globalThis as unknown as {
  prisma?: PrismaClient;
  __searchHooksRegistered?: boolean;
};

export const prisma = globalScope.prisma ?? new PrismaClient();

if (!globalScope.__searchHooksRegistered) {
  registerSearchHooks(prisma);
  globalScope.__searchHooksRegistered = true;
}

if (process.env.NODE_ENV !== 'production') {
  globalScope.prisma = prisma;
}
