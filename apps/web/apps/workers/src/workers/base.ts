export interface Worker<Raw, Entity> {
  prepare?(): Promise<void>;
  fetchList(): Promise<Iterable<Raw> | AsyncIterable<Raw>> | Iterable<Raw> | AsyncIterable<Raw>;
  normalize(raw: Raw): Promise<Entity | null> | Entity | null;
  upsert(entity: Entity): Promise<void>;
}

export type WorkerRunResult = {
  processed: number;
  skipped: number;
  failed: number;
};

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

function isIterable<T>(value: unknown): value is Iterable<T> {
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function toAsyncIterable<T>(value: Iterable<T> | AsyncIterable<T>): AsyncIterable<T> {
  if (isAsyncIterable<T>(value)) {
    return value;
  }

  return (async function* iterate() {
    for (const item of value) {
      yield item;
    }
  })();
}

export async function runWorker<Raw, Entity>(worker: Worker<Raw, Entity>): Promise<WorkerRunResult> {
  await worker.prepare?.();

  const list = await worker.fetchList();
  if (!isIterable<Raw>(list) && !isAsyncIterable<Raw>(list)) {
    throw new TypeError('Worker fetchList() must return an iterable or async iterable value.');
  }

  const iterable = toAsyncIterable(list);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for await (const raw of iterable) {
    try {
      const entity = await worker.normalize(raw);
      if (!entity) {
        skipped += 1;
        continue;
      }

      await worker.upsert(entity);
      processed += 1;
    } catch (error) {
      failed += 1;
      console.error('[workers] Failed to process item:', error);
    }
  }

  return { processed, skipped, failed };
}
