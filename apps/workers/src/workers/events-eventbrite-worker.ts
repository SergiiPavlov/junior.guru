import type { Prisma, PrismaClient } from '@prisma/client';

import type { Worker } from './base';

const SOURCE_KEY = 'eventbrite';
const SOURCE_NAME = 'Eventbrite Events';
const SOURCE_DESCRIPTION = 'External events fetched from the Eventbrite public API.';

const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;
const EVENTBRITE_DEFAULT_LOCATION = process.env.EVENTBRITE_DEFAULT_LOCATION ?? 'Ukraine';
const EVENTBRITE_QUERY = process.env.EVENTBRITE_QUERY ?? 'IT,junior,developer';
const EVENTBRITE_ONLY_FREE = (process.env.EVENTBRITE_ONLY_FREE ?? 'true').toLowerCase() === 'true';
const EVENTBRITE_ONLINE_ONLY = (process.env.EVENTBRITE_ONLINE_ONLY ?? 'true').toLowerCase() === 'true';
const EVENTBRITE_PAGE_SIZE = Number(process.env.EVENTBRITE_PAGE_SIZE ?? '50');
const EVENTBRITE_MAX_PAGES = Number(process.env.EVENTBRITE_MAX_PAGES ?? '3');

type RawEvent = {
  id: string;
  name: { text: string | null; html: string | null };
  description: { text: string | null; html: string | null } | null;
  url: string;
  start: { utc: string; timezone: string };
  end: { utc: string; timezone: string };
  online_event: boolean;
  is_free: boolean;
  currency?: string | null;
  venue?: {
    name?: string | null;
    address?: {
      city?: string | null;
      region?: string | null;
      country?: string | null;
    } | null;
  } | null;
  language?: string | null;
};

type EventbriteSearchResponse = {
  events: RawEvent[];
  pagination: {
    has_more_items: boolean;
    page_number: number;
    page_size: number;
    page_count: number;
    object_count: number;
  };
};

type NormalizedEvent = {
  slug: string;
  title: string;
  description?: string | null;
  urlOriginal: string;
  urlRegister?: string | null;
  city?: string | null;
  regionCode?: string | null;
  countryCode?: string | null;
  remote: boolean;
  startAt: Date;
  endAt: Date | null;
  language?: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  currency?: string | null;
  skills: string[];
  tags: string[];
};

export function createEventsEventbriteWorker(prisma: PrismaClient): Worker {
  if (!EVENTBRITE_TOKEN) {
    throw new Error('[workers] EVENTBRITE_TOKEN is not set in environment variables');
  }

  let sourceIdPromise: Promise<number> | undefined;

  async function ensureSourceId() {
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

  function buildSearchUrl(page: number): string {
    const base = EVENTBRITE_API_BASE.endsWith('/') ? EVENTBRITE_API_BASE : EVENTBRITE_API_BASE + '/';
    const url = new URL('events/search/', base);

    if (EVENTBRITE_QUERY) {
      url.searchParams.set('q', EVENTBRITE_QUERY);
    }

    if (EVENTBRITE_DEFAULT_LOCATION) {
      url.searchParams.set('location.address', EVENTBRITE_DEFAULT_LOCATION);
    }

    if (EVENTBRITE_ONLINE_ONLY) {
      url.searchParams.set('online_events', 'true');
    }

    if (EVENTBRITE_ONLY_FREE) {
      url.searchParams.set('price', 'free');
    }

    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(EVENTBRITE_PAGE_SIZE));
    url.searchParams.set('expand', 'venue');

    const nowIso = new Date().toISOString();
    url.searchParams.set('start_date.range_start', nowIso);

    return url.toString();
  }

  function normalize(raw: RawEvent): NormalizedEvent {
    const slug = `eventbrite-${raw.id}`;

    const startAt = new Date(raw.start.utc);
    const endAt = raw.end?.utc ? new Date(raw.end.utc) : null;

    const city = raw.venue?.address?.city ?? null;
    const regionCode = raw.venue?.address?.region ?? null;
    const countryCode = raw.venue?.address?.country ?? null;

    const title = raw.name.text ?? 'Untitled Event';
    const description = raw.description?.text ?? null;
    const urlOriginal = raw.url;
    const urlRegister = raw.url;

    const remote = raw.online_event === true;

    const priceFrom = raw.is_free ? 0 : null;
    const priceTo = null;
    const currency = raw.currency ?? null;

    const language = raw.language ?? null;

    return {
      slug,
      title,
      description,
      urlOriginal,
      urlRegister,
      city: city ?? undefined,
      regionCode: regionCode ?? undefined,
      countryCode: countryCode ?? undefined,
      remote,
      startAt,
      endAt,
      language: language ?? undefined,
      priceFrom,
      priceTo,
      currency: currency ?? undefined,
      skills: [],
      tags: []
    };
  }

  async function fetchPages(): Promise<RawEvent[]> {
    const results: RawEvent[] = [];
    let page = 1;

    const maxPages = EVENTBRITE_MAX_PAGES > 0 ? EVENTBRITE_MAX_PAGES : 1;

    while (page <= maxPages) {
      const url = buildSearchUrl(page);
      console.log('[workers] Eventbrite URL:', url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new Error(
          `[workers] Failed to fetch Eventbrite events: ${res.status} ${res.statusText}${bodyText ? ` - ${bodyText}` : ''}`
        );
      }

      const json = (await res.json()) as EventbriteSearchResponse;

      if (Array.isArray(json.events)) {
        results.push(...json.events);
      }

      if (!json.pagination?.has_more_items) {
        break;
      }

      page += 1;
    }

    return results;
  }

  async function upsert(normalized: NormalizedEvent) {
    const sourceId = await ensureSourceId();

    const data: Prisma.EventUncheckedCreateInput = {
      slug: normalized.slug,
      title: normalized.title,
      sourceId,
      sourceName: SOURCE_NAME,
      sourceType: SOURCE_KEY,
      urlOriginal: normalized.urlOriginal,
      urlRegister: normalized.urlRegister ?? null,
      city: normalized.city ?? null,
      regionCode: normalized.regionCode ?? null,
      countryCode: normalized.countryCode ?? null,
      remote: normalized.remote,
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
      update: data,
      create: data
    });
  }

  return {
    fetchList: async () => fetchPages(),
    normalize,
    upsert,
  } satisfies Worker<RawEvent, NormalizedEvent>;
}
