import { Suspense } from "react";

import { Breadcrumbs } from "../../../components/common/Breadcrumbs";
import { JobsList } from "../../../components/jobs/JobsList";
import { fetchJobsList } from "../../../lib/api";
import { isLocale } from "../../../lib/i18n/config";
import { getTranslator } from "../../../lib/i18n/server";
import { createPageMetadata, defaultMetadata } from "../../../lib/metadata";
import { parseJobsQuery } from "../../../lib/search";

import type { Metadata } from "next";

type JobsPageParams = {
  params: Promise<{ locale: string }>;
};

type JobsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: JobsPageParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return defaultMetadata;
  }
  const [tJobs, tMeta] = await Promise.all([
    getTranslator(locale, "jobs"),
    getTranslator(locale, "meta")
  ]);
  return createPageMetadata({
    locale,
    path: "/jobs",
    title: tJobs("title"),
    description: tMeta("description")
  });
}

export default async function JobsPage({ params, searchParams }: JobsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    throw new Error("Unsupported locale");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = parseJobsQuery(resolvedSearchParams);
  const initialData = await fetchJobsList(query, { revalidate });
  const [tNav, tJobs] = await Promise.all([
    getTranslator(locale, "navigation"),
    getTranslator(locale, "jobs")
  ]);

  return (
    <>
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: tNav("home") },
          { label: tJobs("title") }
        ]}
      />
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-44 w-full animate-pulse rounded-xl bg-gray-200" aria-hidden="true" />
      ))}</div>}>
        <JobsList initialData={initialData} initialFilters={query} />
      </Suspense>
    </>
  );
}
