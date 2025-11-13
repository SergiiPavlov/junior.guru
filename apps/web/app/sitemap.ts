import type { MetadataRoute } from "next";

import type { EventListItem, JobListItem, EventListResponse, JobListResponse } from "../lib/api";
import { fetchEventsList, fetchJobsList } from "../lib/api";
import { locales } from "../lib/i18n/config";
import { metadataBase } from "../lib/metadata";

const FETCH_REVALIDATE = 60;
const PAGE_SIZE = 100;

export const revalidate = 60;

async function fetchAllPages<TItem, TResponse extends { items: TItem[]; total: number; perPage: number }>(
  fetchPage: (page: number) => Promise<TResponse>
): Promise<TItem[]> {
  const items: TItem[] = [];
  let page = 1;

  while (true) {
    const response = await fetchPage(page);
    items.push(...response.items);
    const totalPages = Math.max(1, Math.ceil(response.total / response.perPage));
    if (page >= totalPages) {
      break;
    }
    page += 1;
  }

  return items;
}

async function loadJobs(): Promise<JobListItem[]> {
  try {
    return await fetchAllPages<JobListItem, JobListResponse>((page) =>
      fetchJobsList(
        {
          page,
          perPage: PAGE_SIZE,
          sort: "recent",
          skills: [],
          tags: []
        },
        { revalidate: FETCH_REVALIDATE }
      )
    );
  } catch (error) {
    console.error("Failed to load jobs for sitemap", error);
    return [];
  }
}

async function loadEvents(): Promise<EventListItem[]> {
  try {
    return await fetchAllPages<EventListItem, EventListResponse>((page) =>
      fetchEventsList(
        {
          page,
          perPage: PAGE_SIZE,
          sort: "soon",
          skills: [],
          tags: []
        },
        { revalidate: FETCH_REVALIDATE }
      )
    );
  } catch (error) {
    console.error("Failed to load events for sitemap", error);
    return [];
  }
}

function absolute(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalized, metadataBase).toString();
}

function toDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, events] = await Promise.all([loadJobs(), loadEvents()]);

  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  function add(url: string, lastModified?: Date) {
    if (seen.has(url)) {
      return;
    }
    seen.add(url);
    entries.push(
      lastModified ? { url, lastModified } : { url }
    );
  }

  const latestJobTime = jobs.reduce((latest, job) => {
    const updatedAt = toDate(job.validUntil) ?? toDate(job.publishedAt);
    return Math.max(latest, updatedAt?.getTime() ?? 0);
  }, 0);
  const latestEventTime = events.reduce((latest, event) => {
    const updatedAt = toDate(event.endAt) ?? toDate(event.startAt) ?? toDate(event.createdAt);
    return Math.max(latest, updatedAt?.getTime() ?? 0);
  }, 0);
  const fallbackDate = new Date(Math.max(latestJobTime, latestEventTime, Date.now()));

  for (const locale of locales) {
    add(absolute(`/${locale}`), fallbackDate);
    add(absolute(`/${locale}/jobs`), latestJobTime ? new Date(latestJobTime) : fallbackDate);
    add(absolute(`/${locale}/events`), latestEventTime ? new Date(latestEventTime) : fallbackDate);
  }

  for (const job of jobs) {
    const identifier = job.slug ?? job.id;
    const lastModified = toDate(job.validUntil) ?? toDate(job.publishedAt) ?? fallbackDate;
    for (const locale of locales) {
      add(absolute(`/${locale}/jobs/${identifier}`), lastModified);
    }
  }

  for (const event of events) {
    const identifier = event.slug ?? event.id;
    const lastModified = toDate(event.endAt) ?? toDate(event.startAt) ?? toDate(event.createdAt) ?? fallbackDate;
    for (const locale of locales) {
      add(absolute(`/${locale}/events/${identifier}`), lastModified);
    }
  }

  return entries;
}
