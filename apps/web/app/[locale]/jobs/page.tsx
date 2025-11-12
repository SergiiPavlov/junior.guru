import type { Metadata } from "next";
import { Suspense } from "react";

import { fetchJobsList } from "../../../lib/api";
import { parseJobsQuery } from "../../../lib/search";
import { isLocale } from "../../../lib/i18n/config";
import { getTranslator } from "../../../lib/i18n/server";
import { JobsList } from "../../../components/jobs/JobsList";
import { createLanguageAlternates } from "../../../lib/metadata";

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
    return {};
  }
  const t = await getTranslator(locale, "jobs");
  return {
    title: t("title"),
    description: t("title"),
    alternates: createLanguageAlternates("/jobs", locale)
  };
}

export default async function JobsPage({ params, searchParams }: JobsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    throw new Error("Unsupported locale");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = parseJobsQuery(resolvedSearchParams);
  const initialData = await fetchJobsList(query, { revalidate });

  return (
    <Suspense fallback={<div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-44 w-full animate-pulse rounded-xl bg-gray-200" aria-hidden="true" />
    ))}</div>}>
      <JobsList initialData={initialData} initialFilters={query} />
    </Suspense>
  );
}
