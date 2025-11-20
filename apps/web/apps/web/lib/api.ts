import type { Locale } from "./i18n/config";

const DEFAULT_API_BASE = "http://localhost:8787/api/v1";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;

function buildUrl(path: string, params?: Record<string, string | undefined | string[]>) {
  const url = new URL(path, API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, item));
      } else {
        url.searchParams.set(key, value);
      }
    });
  }
  return url;
}

export type JobListItem = {
  id: string;
  slug: string;
  title: string;
  companyName?: string;
  companySlug?: string;
  coverImageUrl?: string;
  city?: string;
  regionCode?: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  experience?: string;
  employmentType?: string;
  skills: string[];
  tags: string[];
  description?: string;
  sourceUrl?: string;
  urlOriginal?: string;
  urlApply?: string;
  publishedAt: string;
  validUntil?: string;
};

export type JobListResponse = {
  items: JobListItem[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type EventListItem = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl?: string;
  city?: string;
  regionCode?: string;
  remote: boolean;
  skills: string[];
  tags: string[];
  description?: string;
  sourceUrl?: string;
  urlOriginal?: string;
  urlRegister?: string;
  venue?: string;
  startAt: string;
  endAt?: string;
  language?: string;
  priceFrom?: number;
  priceTo?: number;
  currency?: string;
  createdAt: string;
};

export type EventListResponse = {
  items: EventListItem[];
  page: number;
  perPage: number;
  total: number;
};

export type JobsQueryInput = {
  q?: string;
  city?: string;
  region?: string;
  country?: string;
  remote?: boolean;
  skills: string[];
  tags: string[];
  salaryMin?: number;
  currency?: string;
  experience?: string;
  page: number;
  perPage: number;
  sort: "recent" | "relevant" | "salary_desc" | "salary_asc";
};

export type EventsQueryInput = {
  q?: string;
  city?: string;
  region?: string;
  remote?: boolean;
  skills: string[];
  tags: string[];
  from?: string;
  to?: string;
  page: number;
  perPage: number;
  sort: "soon" | "recent";
};

function serializeJobsQuery(input: JobsQueryInput) {
  const params: Record<string, string> = {
    page: String(input.page),
    perPage: String(input.perPage),
    sort: input.sort
  };
  if (input.q) params.q = input.q;
  if (input.city) params.city = input.city;
  if (input.region) params.region = input.region;
  if (input.country) params.country = input.country;
  if (input.remote !== undefined) params.remote = input.remote ? "true" : "false";
  if (input.skills.length > 0) params.skills = input.skills.join(",");
  if (input.tags.length > 0) params.tags = input.tags.join(",");
  if (typeof input.salaryMin === "number") params.salaryMin = String(input.salaryMin);
  if (input.currency) params.currency = input.currency;
  if (input.experience) params.experience = input.experience;
  return params;
}

function serializeEventsQuery(input: EventsQueryInput) {
  const params: Record<string, string> = {
    page: String(input.page),
    perPage: String(input.perPage),
    sort: input.sort
  };
  if (input.q) params.q = input.q;
  if (input.city) params.city = input.city;
  if (input.region) params.region = input.region;
  if (input.remote !== undefined) params.remote = input.remote ? "true" : "false";
  if (input.skills.length > 0) params.skills = input.skills.join(",");
  if (input.tags.length > 0) params.tags = input.tags.join(",");
  if (input.from) params.from = input.from;
  if (input.to) params.to = input.to;
  return params;
}

async function fetchJson<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchJobsList(input: JobsQueryInput, options?: { revalidate?: number; signal?: AbortSignal }) {
  const endpoint = input.q ? "search/jobs" : "jobs";
  const url = buildUrl(endpoint, serializeJobsQuery(input));
  const init = options?.revalidate ? { next: { revalidate: options.revalidate } } : undefined;
  return fetchJson<JobListResponse>(url, { ...init, signal: options?.signal });
}

export async function fetchJob(id: string) {
  const url = buildUrl(`jobs/${id}`);
  return fetchJson<JobListItem>(url);
}

export async function fetchEventsList(input: EventsQueryInput, options?: { revalidate?: number; signal?: AbortSignal }) {
  const url = buildUrl("events", serializeEventsQuery(input));
  const init = options?.revalidate ? { next: { revalidate: options.revalidate } } : undefined;
  return fetchJson<EventListResponse>(url, { ...init, signal: options?.signal });
}

export async function fetchEvent(id: string) {
  const url = buildUrl(`events/${id}`);
  return fetchJson<EventListItem>(url);
}

export function getLocalizedUrl(locale: Locale, pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${locale}${normalized}`.replace(/\/+/, "/");
}
