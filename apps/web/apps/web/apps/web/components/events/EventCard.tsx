"use client";

import Link from "next/link";

import { formatDateRange } from "../../lib/format";
import { useLocale, useTranslations } from "../../lib/i18n/provider";

import type { EventListItem } from "../../lib/api";

export function EventCard({ event }: { event: EventListItem }) {
  const locale = useLocale();
  const t = useTranslations("events");
  const originalUrl = event.sourceUrl ?? event.urlOriginal ?? event.urlRegister;

  return (
    <article className="card flex flex-col gap-3">
      <h2 className="text-lg font-semibold leading-tight">{event.title}</h2>
      <div className="text-sm text-gray-500">{formatDateRange(locale, event.startAt, event.endAt)}</div>
      <div className="text-sm text-gray-600">
        {event.city ?? (event.remote ? "Online" : "—")}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={`/${locale}/events/${event.id}`}
          className="inline-flex min-h-[44px] items-center rounded-full border border-black/10 px-4 text-sm font-medium hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {t("openDetails")} 
        </Link>
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-full bg-black px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {t("openOriginal")}
          </a>
        )}
      </div>
    </article>
  );
}
