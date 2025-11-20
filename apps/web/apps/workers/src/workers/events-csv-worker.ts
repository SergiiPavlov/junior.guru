import path from 'node:path';

import type { Prisma, PrismaClient } from '@prisma/client';

import { readCsvFile } from '../utils/csv-reader';
import { emptyToNull, parseBoolean, parseDate, parseList, parseNumber } from '../lib/parsers';
import type { Worker } from './base';

const SOURCE_KEY = 'seed_csv_events';
const SOURCE_NAME = 'Seed CSV Events';
const SOURCE_DESCRIPTION = 'Mock CSV events import used for local development.';

const DEFAULT_SEED_DIR = path.resolve(process.cwd(), '../..', 'seed');

type RawEventRow = {
  slug: string;
  title: string;
  regionCode?: string;
  city?: string;
  remote?: string;
  venue?: string;
  urlOriginal?: string;
  urlRegister?: string;
  skills?: string;
  tags?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  language?: string;
  priceFrom?: string;
  priceTo?: string;
  currency?: string;
};

type RegionRow = {
  code: string;
  nameUk: string;
  nameEn: string;
};

type NormalizedEvent = {
  slug: string;
  title: string;
  regionCode: string | null;
  city: string | null;
  remote: boolean;
  venue: string | null;
  urlOriginal: string | null;
  urlRegister: string | null;
  skills: string[];
  tags: string[];
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  language: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  currency: string | null;
};

export type EventsCsvWorker = Worker<RawEventRow, NormalizedEvent>;

export function createEventsCsvWorker(
  prisma: PrismaClient,
  options: { seedDir?: string } = {}
): EventsCsvWorker {
  const seedDir = options.seedDir ?? DEFAULT_SEED_DIR;
  const eventsCsvPath = path.resolve(seedDir, 'events.csv');
  const regionsCsvPath = path.resolve(seedDir, 'regions.csv');

  const regionCache = new Map<string, { id: string; data: RegionRow }>();
  let sourceIdPromise: Promise<string> | null = null;

  async function ensureSourceId(): Promise<string> {
    if (!sourceIdPromise) {
      sourceIdPromise = prisma.source
        .upsert({
          where: { key: SOURCE_KEY },
          update: {
            name: SOURCE_NAME,
            description: SOURCE_DESCRIPTION,
            type: 'event_provider'
          },
          create: {
            key: SOURCE_KEY,
            name: SOURCE_NAME,
            description: SOURCE_DESCRIPTION,
            type: 'event_provider'
          }
        })
        .then((source) => source.id);
    }

    return sourceIdPromise;
  }

  async function ensureRegions() {
    if (regionCache.size > 0) {
      return;
    }

    const regionRows = await readCsvFile<RegionRow>(regionsCsvPath);
    const results = await Promise.all(
      regionRows.map((region) =>
        prisma.region.upsert({
          where: { code: region.code },
          update: {
            nameUk: region.nameUk,
            nameEn: region.nameEn
          },
          create: {
            code: region.code,
            nameUk: region.nameUk,
            nameEn: region.nameEn
          }
        })
      )
    );

    results.forEach((region) => {
      regionCache.set(region.code, { id: region.id, data: { code: region.code, nameUk: region.nameUk, nameEn: region.nameEn } });
    });
  }

  function normalize(raw: RawEventRow): NormalizedEvent {
    if (!raw.slug || raw.slug.trim().length === 0) {
      throw new Error('Event slug cannot be empty.');
    }

    if (!raw.title || raw.title.trim().length === 0) {
      throw new Error(`Event "${raw.slug}" is missing title.`);
    }

    const startAt = parseDate(raw.startAt);
    if (!startAt) {
      throw new Error(`Event "${raw.slug}" is missing startAt date.`);
    }

    const endAt = parseDate(raw.endAt ?? undefined);

    return {
      slug: raw.slug.trim(),
      title: raw.title.trim(),
      regionCode: emptyToNull(raw.regionCode),
      city: emptyToNull(raw.city),
      remote: parseBoolean(raw.remote ?? 'false'),
      venue: emptyToNull(raw.venue),
      urlOriginal: emptyToNull(raw.urlOriginal),
      urlRegister: emptyToNull(raw.urlRegister),
      skills: parseList(raw.skills),
      tags: parseList(raw.tags),
      description: emptyToNull(raw.description),
      startAt,
      endAt,
      language: emptyToNull(raw.language)?.toLowerCase() ?? null,
      priceFrom: parseNumber(raw.priceFrom),
      priceTo: parseNumber(raw.priceTo),
      currency: emptyToNull(raw.currency)?.toUpperCase() ?? null
    };
  }

  async function upsert(normalized: NormalizedEvent) {
    const sourceId = await ensureSourceId();
    await ensureRegions();

    let regionId: string | null = null;
    if (normalized.regionCode) {
      const region = regionCache.get(normalized.regionCode);
      if (region) {
        regionId = region.id;
      }
    }

    const createData: Prisma.EventUncheckedCreateInput = {
      slug: normalized.slug,
      sourceId,
      regionId: regionId ?? undefined,
      title: normalized.title,
      city: normalized.city ?? undefined,
      remote: normalized.remote,
      venue: normalized.venue ?? undefined,
      urlOriginal: normalized.urlOriginal ?? undefined,
      urlRegister: normalized.urlRegister ?? undefined,
      skills: normalized.skills,
      tags: normalized.tags,
      descriptionRaw: normalized.description ?? undefined,
      description: normalized.description ?? undefined,
      startAt: normalized.startAt,
      endAt: normalized.endAt ?? undefined,
      language: normalized.language ?? undefined,
      priceFrom: normalized.priceFrom ?? undefined,
      priceTo: normalized.priceTo ?? undefined,
      currency: normalized.currency ?? undefined
    };

    const updateData: Prisma.EventUncheckedUpdateInput = {
      sourceId,
      regionId: regionId ?? null,
      title: normalized.title,
      city: normalized.city ?? null,
      remote: normalized.remote,
      venue: normalized.venue ?? null,
      urlOriginal: normalized.urlOriginal ?? null,
      urlRegister: normalized.urlRegister ?? null,
      skills: normalized.skills,
      tags: normalized.tags,
      descriptionRaw: normalized.description ?? null,
      description: normalized.description ?? null,
      startAt: normalized.startAt,
      endAt: normalized.endAt,
      language: normalized.language ?? null,
      priceFrom: normalized.priceFrom,
      priceTo: normalized.priceTo,
      currency: normalized.currency ?? null
    };

    await prisma.event.upsert({
      where: { slug: normalized.slug },
      create: createData,
      update: updateData
    });
  }

  return {
    prepare: async () => {
      await ensureSourceId();
      await ensureRegions();
    },
    fetchList: async () => readCsvFile<RawEventRow>(eventsCsvPath),
    normalize,
    upsert
  } satisfies EventsCsvWorker;
}
