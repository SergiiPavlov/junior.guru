import type { Metadata } from "next";
import { Suspense } from "react";

import { EventList } from "../../../components/events/EventList";
import { fetchEventsList } from "../../../lib/api";
import { isLocale } from "../../../lib/i18n/config";
import { getTranslator } from "../../../lib/i18n/server";
import { createPageMetadata, defaultMetadata } from "../../../lib/metadata";
import { parseEventsQuery } from "../../../lib/search";

type EventsPageParams = {
  params: Promise<{ locale: string }>;
};

type EventsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 60;
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: EventsPageParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return defaultMetadata;
  }
  const [tEvents, tMeta] = await Promise.all([
    getTranslator(locale, "events"),
    getTranslator(locale, "meta")
  ]);
  return createPageMetadata({
    locale,
    path: "/events",
    title: tEvents("title"),
    description: tMeta("description")
  });
}

export default async function EventsPage({ params, searchParams }: EventsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    throw new Error("Unsupported locale");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = parseEventsQuery(resolvedSearchParams);
  const initialData = await fetchEventsList(query, { revalidate });

  return (
    <Suspense fallback={<div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-36 w-full animate-pulse rounded-xl bg-gray-200" aria-hidden="true" />
    ))}</div>}>
      <EventList initialData={initialData} initialFilters={query} />
    </Suspense>
  );
}
