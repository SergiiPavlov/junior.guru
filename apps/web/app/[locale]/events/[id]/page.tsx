import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchEvent } from "../../../../lib/api";
import { isLocale } from "../../../../lib/i18n/config";
import { getTranslator } from "../../../../lib/i18n/server";
import { createLanguageAlternates } from "../../../../lib/metadata";
import { formatDateRange, stripHtml } from "../../../../lib/format";

type EventDetailsParams = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: EventDetailsParams): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  try {
    const event = await fetchEvent(id);
    const description = stripHtml(event.description) ?? event.title;
    return {
      title: event.title,
      description,
      alternates: createLanguageAlternates(`/events/${event.slug ?? event.id}`, locale)
    };
  } catch {
    return {};
  }
}

export default async function EventDetails({ params }: EventDetailsParams) {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const event = await fetchEvent(id);
    const t = await getTranslator(locale, "event");
    const description = stripHtml(event.description) ?? event.title;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      description,
      startDate: event.startAt,
      endDate: event.endAt,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: event.remote
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      location: event.remote
        ? {
            "@type": "VirtualLocation",
            url: event.urlRegister ?? event.urlOriginal
          }
        : {
            "@type": "Place",
            name: event.venue ?? event.city,
            address: {
              "@type": "PostalAddress",
              addressLocality: event.city,
              addressRegion: event.regionCode,
              addressCountry: "UA"
            }
          }
    };

    return (
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href={`/${locale}/events`}
          className="text-sm text-blue-600 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {t("back")}
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight">{event.title}</h1>
          <div className="text-sm text-gray-600">{formatDateRange(locale, event.startAt, event.endAt)}</div>
          <div className="text-sm text-gray-500">
            {[event.city, event.remote ? "Online" : undefined].filter(Boolean).join(" · ")}
          </div>
        </div>
        {event.description && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        )}
        <div className="flex flex-wrap gap-3">
          {event.urlOriginal && (
            <a
              href={event.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-full bg-black px-5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {t("register")}
            </a>
          )}
          {event.urlRegister && event.urlRegister !== event.urlOriginal && (
            <a
              href={event.urlRegister}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-full border border-black/10 px-5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {t("register")}
            </a>
          )}
        </div>
        <script type="application/ld+json" suppressHydrationWarning>{JSON.stringify(jsonLd)}</script>
      </article>
    );
  } catch (error) {
    console.error("Failed to load event", error);
    const t = await getTranslator(locale, "event");
    return <div className="muted">{t("notFound")}</div>;
  }
}
