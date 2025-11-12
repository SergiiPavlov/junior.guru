import Link from "next/link";

import type { JobListResponse, JobsQueryInput } from "../../lib/api";
import { fetchJobsList } from "../../lib/api";
import { getTranslator } from "../../lib/i18n/server";
import { isLocale } from "../../lib/i18n/config";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 60;

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    throw new Error("Unsupported locale");
  }

  const tHome = await getTranslator(locale, "home");
  const tJobs = await getTranslator(locale, "jobs");

  let jobsResponse: JobListResponse = { items: [], page: 1, perPage: 4, total: 0 };
  try {
    jobsResponse = await fetchJobsList(
      {
        page: 1,
        perPage: 4,
        sort: "recent",
        skills: [],
        tags: [],
        remote: undefined,
        q: undefined,
        city: undefined,
        region: undefined,
        salaryMin: undefined,
        currency: undefined,
        experience: undefined
      } satisfies JobsQueryInput,
      { revalidate }
    );
  } catch (error) {
    console.error("Failed to load latest jobs", error);
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{tHome("heroTitle")}</h1>
        <p className="text-lg text-gray-600">{tHome("heroSubtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/jobs`}
            className="inline-flex min-h-[44px] items-center rounded-full bg-black px-5 py-2 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {tHome("ctaJobs")}
          </Link>
          <Link
            href={`/${locale}/events`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-black/20 px-5 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {tHome("ctaEvents")}
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">{tHome("latestJobs")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {jobsResponse.items.map((job) => (
            <article key={job.id} className="card flex flex-col gap-2">
              <div className="text-sm text-gray-500">{job.companyName ?? "—"}</div>
              <h3 className="text-lg font-semibold leading-tight">{job.title}</h3>
              <div className="text-sm text-gray-600">
                {job.city ?? (job.remote ? "Remote" : "—")}
              </div>
              <Link
                href={`/${locale}/jobs/${job.id}`}
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-blue-600 underline"
              >
                {tJobs("openDetails")}
              </Link>
            </article>
          ))}
          {jobsResponse.items.length === 0 && <div className="muted">{tHome("empty")}</div>}
        </div>
      </section>
    </div>
  );
}
