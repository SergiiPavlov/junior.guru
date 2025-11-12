import type { Prisma, PrismaClient } from '@prisma/client';

import { reindexEvents, removeEventDocument, upsertEventDocument } from './events-index';
import { reindexJobs, removeJobDocument, upsertJobDocument } from './jobs-index';

const WRITE_ACTIONS = new Set(['create', 'update', 'upsert']);
const BULK_ACTIONS = new Set(['createMany', 'updateMany']);
const DELETE_ACTIONS = new Set(['delete', 'deleteMany']);

export function registerSearchHooks(prisma: PrismaClient) {
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const result = await next(params);

    if (params.model === 'Job') {
      await handleJobWrite(prisma, params, result);
    }

    if (params.model === 'Event') {
      await handleEventWrite(prisma, params, result);
    }

    return result;
  });
}

async function handleJobWrite(prisma: PrismaClient, params: Prisma.MiddlewareParams, result: unknown) {
  if (WRITE_ACTIONS.has(params.action)) {
    const id = (result as { id: string } | null)?.id ?? params.args?.where?.id;
    if (id) {
      await safeExecute(() => upsertJobDocument(prisma, id));
    }
    return;
  }

  if (BULK_ACTIONS.has(params.action)) {
    await safeExecute(() => reindexJobs(prisma));
    return;
  }

  if (DELETE_ACTIONS.has(params.action)) {
    const ids: string[] = [];

    if (params.action === 'delete' && params.args?.where?.id) {
      ids.push(params.args.where.id);
    } else if (params.action === 'deleteMany') {
      const where = params.args?.where;
      if (where?.id?.in && Array.isArray(where.id.in)) {
        ids.push(...where.id.in);
      }
    }

    await Promise.all(ids.map((id) => safeExecute(() => removeJobDocument(id))));
  }
}

async function handleEventWrite(prisma: PrismaClient, params: Prisma.MiddlewareParams, result: unknown) {
  if (WRITE_ACTIONS.has(params.action)) {
    const id = (result as { id: string } | null)?.id ?? params.args?.where?.id;
    if (id) {
      await safeExecute(() => upsertEventDocument(prisma, id));
    }
    return;
  }

  if (BULK_ACTIONS.has(params.action)) {
    await safeExecute(() => reindexEvents(prisma));
    return;
  }

  if (DELETE_ACTIONS.has(params.action)) {
    const ids: string[] = [];

    if (params.action === 'delete' && params.args?.where?.id) {
      ids.push(params.args.where.id);
    } else if (params.action === 'deleteMany') {
      const where = params.args?.where;
      if (where?.id?.in && Array.isArray(where.id.in)) {
        ids.push(...where.id.in);
      }
    }

    await Promise.all(ids.map((id) => safeExecute(() => removeEventDocument(id))));
  }
}

async function safeExecute(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    console.error('[search] synchronization failed:', error);
  }
}
