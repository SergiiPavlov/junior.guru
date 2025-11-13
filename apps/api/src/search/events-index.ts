import type { Event, PrismaClient, Region } from '@prisma/client';

import { sanitizeHtml } from '../lib/sanitize-html';
import { EVENTS_INDEX, MeiliHttpError, meiliClient } from './client';

const DESCRIPTION_LIMIT = 400;

type EventWithRelations = Event & {
  region: Pick<Region, 'code'> | null;
};

export type EventSearchDocument = {
  id: string;
  slug: string;
  title: string;
  city?: string;
  region?: string;
  isRemote: boolean;
  skills: string[];
  tags: string[];
  descriptionHtmlTrimmed?: string;
  urlOriginal?: string;
  urlRegister?: string;
  venue?: string;
  startAt: string;
  endAt?: string;
  language?: string;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
};

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimDescription(html: string | undefined): string | undefined {
  const sanitized = sanitizeHtml(html);
  if (!sanitized) {
    return undefined;
  }

  const text = toPlainText(sanitized);
  if (!text) {
    return undefined;
  }

  if (text.length <= DESCRIPTION_LIMIT) {
    return text;
  }

  return `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`;
}

export function mapEventToSearchDocument(event: EventWithRelations): EventSearchDocument {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    city: event.city ?? undefined,
    region: event.region?.code ?? undefined,
    isRemote: event.remote,
    skills: event.skills ?? [],
    tags: event.tags ?? [],
    descriptionHtmlTrimmed: trimDescription(event.description ?? event.descriptionRaw ?? undefined),
    urlOriginal: event.urlOriginal ?? undefined,
    urlRegister: event.urlRegister ?? undefined,
    venue: event.venue ?? undefined,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt ? event.endAt.toISOString() : undefined,
    language: event.language ?? undefined,
    priceFrom: event.priceFrom ?? undefined,
    priceTo: event.priceTo ?? undefined,
    currency: event.currency ?? undefined
  };
}

export async function upsertEventDocument(prisma: PrismaClient, id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { region: true }
  });

  if (!event) {
    await removeEventDocument(id);
    return;
  }

  const document = mapEventToSearchDocument(event);
  await meiliClient.index<EventSearchDocument>(EVENTS_INDEX).addDocuments([document]);
}

export async function removeEventDocument(id: string) {
  try {
    await meiliClient.index(EVENTS_INDEX).deleteDocument(id);
  } catch (error) {
    if (error instanceof MeiliHttpError && error.status === 404) {
      return;
    }
    throw error;
  }
}

export async function reindexEvents(prisma: PrismaClient) {
  const events = await prisma.event.findMany({
    include: { region: true }
  });

  const documents = events.map(mapEventToSearchDocument);
  await meiliClient.index<EventSearchDocument>(EVENTS_INDEX).replaceDocuments(documents);
}

export async function reindexEventsAll(items: any[]) { const idx = client.index('events'); await idx.deleteAllDocuments(); const res = await idx.addDocuments(items); return { count: items.length, task: res }; }

export const eventsIndex_count = async () => (await client.index('events').stats()).numberOfDocuments
