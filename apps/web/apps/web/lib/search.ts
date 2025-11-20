import type { JobsQueryInput, EventsQueryInput } from "./api";

const DEFAULT_JOBS_PER_PAGE = 20;
const DEFAULT_EVENTS_PER_PAGE = 20;

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseCsv(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(",");
  return raw
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseJobsQuery(searchParams: Record<string, string | string[] | undefined>): JobsQueryInput {
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const city = typeof searchParams.city === "string" ? searchParams.city : undefined;
  const region = typeof searchParams.region === "string" ? searchParams.region : undefined;
  const country = typeof searchParams.country === "string" ? searchParams.country : undefined;
  const remote = parseBoolean(typeof searchParams.remote === "string" ? searchParams.remote : undefined);
  const salaryMin = typeof searchParams.salaryMin === "string" ? Number.parseInt(searchParams.salaryMin, 10) : undefined;
  const currency = typeof searchParams.currency === "string" ? searchParams.currency : undefined;
  const experience = typeof searchParams.experience === "string" ? searchParams.experience : undefined;
  const sortParam = typeof searchParams.sort === "string" ? searchParams.sort : undefined;
  const perPageValue = typeof searchParams.perPage === "string" ? Number.parseInt(searchParams.perPage, 10) : undefined;
  const pageValue = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : undefined;

  const sort: JobsQueryInput["sort"] =
    sortParam === "relevant" || sortParam === "salary_desc" || sortParam === "salary_asc" ? sortParam : "recent";

  return {
    q,
    city,
    region,
    country,
    remote,
    salaryMin: Number.isFinite(salaryMin) ? salaryMin : undefined,
    currency,
    experience,
    sort,
    skills: parseCsv(searchParams.skills),
    tags: parseCsv(searchParams.tags),
    page: Number.isFinite(pageValue) && pageValue! > 0 ? pageValue! : 1,
    perPage: Number.isFinite(perPageValue) && perPageValue! > 0 ? Math.min(perPageValue!, 50) : DEFAULT_JOBS_PER_PAGE
  };
}

export function parseEventsQuery(searchParams: Record<string, string | string[] | undefined>): EventsQueryInput {
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const city = typeof searchParams.city === "string" ? searchParams.city : undefined;
  const region = typeof searchParams.region === "string" ? searchParams.region : undefined;
  const remote = parseBoolean(typeof searchParams.remote === "string" ? searchParams.remote : undefined);
  const from = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const to = typeof searchParams.to === "string" ? searchParams.to : undefined;
  const sortParam = typeof searchParams.sort === "string" ? searchParams.sort : undefined;
  const perPageValue = typeof searchParams.perPage === "string" ? Number.parseInt(searchParams.perPage, 10) : undefined;
  const pageValue = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : undefined;

  const sort: EventsQueryInput["sort"] = sortParam === "recent" ? "recent" : "soon";

  return {
    q,
    city,
    region,
    remote,
    from,
    to,
    sort,
    skills: parseCsv(searchParams.skills),
    tags: parseCsv(searchParams.tags),
    page: Number.isFinite(pageValue) && pageValue! > 0 ? pageValue! : 1,
    perPage: Number.isFinite(perPageValue) && perPageValue! > 0 ? Math.min(perPageValue!, 50) : DEFAULT_EVENTS_PER_PAGE
  };
}
