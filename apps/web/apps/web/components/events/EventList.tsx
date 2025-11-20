"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useSearchParams } from "next/navigation";

import { fetchEventsList } from "../../lib/api";
import { useTranslations } from "../../lib/i18n/provider";
import { parseEventsQuery } from "../../lib/search";
import { Skeleton } from "../common/Skeleton";

import { EventCard } from "./EventCard";
import { EventFilters } from "./EventFilters";

import type { EventListResponse, EventsQueryInput } from "../../lib/api";

function EventListContent({ initialData, initialFilters }: { initialData: EventListResponse; initialFilters: EventsQueryInput }) {
  const searchParams = useSearchParams();
  const t = useTranslations("events");
  const tError = useTranslations("events.error");
  const [data, setData] = useState<EventListResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const initialFiltersRef = useRef(initialFilters);

  const filters = useMemo(() => {
    const entries = Object.fromEntries(searchParams.entries());
    return parseEventsQuery(entries);
  }, [searchParams]);

  useEffect(() => {
    const hasFiltersChanged = JSON.stringify(initialFiltersRef.current) !== JSON.stringify(filters);
    if (!hasFiltersChanged && retryToken === 0) {
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchEventsList(filters, { signal: controller.signal })
      .then((result) => {
        setData(result);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch events", error);
        setError(error instanceof Error ? error : new Error("Failed to load events"));
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [filters, retryToken]);

  const showList = !error;

  return (
    <div className="space-y-6">
      <EventFilters />
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      )}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">{tError("title")}</p>
          <p className="mt-1">{tError("description")}</p>
          <button
            type="button"
            onClick={() => setRetryToken((token) => token + 1)}
            className="mt-3 inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-1.5 font-medium text-red-800 shadow-sm transition hover:bg-red-50"
          >
            {tError("retry")}
          </button>
        </div>
      )}
      {showList && !isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {data.items.length === 0 && <div className="muted">{t("empty")}</div>}
        </div>
      )}
      <div className="text-sm text-gray-500">
        {t("summary", { count: String(data.total) })}
      </div>
    </div>
  );
}


export function EventList(props: { initialData: EventListResponse; initialFilters: EventsQueryInput }) {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => (<div key={index} className="h-36 w-full animate-pulse rounded-xl bg-gray-200" aria-hidden="true" />))}</div></div>}>
      <EventListContent {...props} />
    </Suspense>
  );
}
