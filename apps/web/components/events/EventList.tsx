"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { EventListResponse, EventsQueryInput } from "../../lib/api";
import { fetchEventsList } from "../../lib/api";
import { parseEventsQuery } from "../../lib/search";
import { EventFilters } from "./EventFilters";
import { EventCard } from "./EventCard";
import { Skeleton } from "../common/Skeleton";
import { useTranslations } from "../../lib/i18n/provider";

function EventListContent({ initialData, initialFilters }: { initialData: EventListResponse; initialFilters: EventsQueryInput }) {
  const searchParams = useSearchParams();
  const t = useTranslations("events");
  const [data, setData] = useState<EventListResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const initialFiltersRef = useRef(initialFilters);

  const filters = useMemo(() => {
    const entries = Object.fromEntries(searchParams.entries());
    return parseEventsQuery(entries);
  }, [searchParams]);

  useEffect(() => {
    const shouldFetch = JSON.stringify(initialFiltersRef.current) !== JSON.stringify(filters);
    if (!shouldFetch) {
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    fetchEventsList(filters, { signal: controller.signal })
      .then((result) => {
        setData(result);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch events", error);
        }
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.perPage));

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
      {!isLoading && (
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
