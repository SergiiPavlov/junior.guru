"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { fetchJobsList } from "../../lib/api";
import { useTranslations } from "../../lib/i18n/provider";
import { parseJobsQuery } from "../../lib/search";
import { Skeleton } from "../common/Skeleton";

import { JobCard } from "./JobCard";
import { JobsFilters } from "./JobsFilters";

import type { JobListResponse, JobsQueryInput } from "../../lib/api";

const emptyHintKeys = ["filters", "keyword", "location"] as const;

function JobsListContent({ initialData, initialFilters }: { initialData: JobListResponse; initialFilters: JobsQueryInput }) {
  const searchParams = useSearchParams();
  const t = useTranslations("jobs");
  const [data, setData] = useState<JobListResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const initialFiltersRef = useRef(initialFilters);

  const filters = useMemo(() => {
    const entries = Object.fromEntries(searchParams.entries());
    return parseJobsQuery(entries);
  }, [searchParams]);

  useEffect(() => {
    const initial = initialFiltersRef.current;
    const shouldFetch = JSON.stringify(initial) !== JSON.stringify(filters);
    if (!shouldFetch) {
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    fetchJobsList(filters, { signal: controller.signal })
      .then((result) => {
        setData(result);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch jobs", error);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.perPage));
  const hasJobs = data.items.length > 0;

  return (
    <div className="space-y-6">
      <JobsFilters />
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        {t("results_summary", { count: data.total })}
      </div>
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      )}
      {!isLoading && hasJobs && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
      {!isLoading && !hasJobs && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6">
          <p className="text-base font-semibold text-gray-900">{t("empty.title")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
            {emptyHintKeys.map((hintKey) => (
              <li key={hintKey}>{t(`empty.hints.${hintKey}`)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-sm text-gray-500">
        {t("pagination.page", {
          page: String(data.page),
          pages: String(totalPages)
        })}
      </div>
    </div>
  );
}


export function JobsList(props: { initialData: JobListResponse; initialFilters: JobsQueryInput }) {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => (<div key={index} className="h-44 w-full animate-pulse rounded-xl bg-gray-200" aria-hidden="true" />))}</div></div>}>
      <JobsListContent {...props} />
    </Suspense>
  );
}
