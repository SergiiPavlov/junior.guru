"use client";

import Link from "next/link";

import { formatDate } from "../../lib/format";
import { formatUAH } from "../../lib/formatCurrency";
import { useLocale, useTranslations } from "../../lib/i18n/provider";

import type { JobListItem } from "../../lib/api";

export function JobCard({ job }: { job: JobListItem }) {
  const locale = useLocale();
  const t = useTranslations("jobs");

  const salary = (() => {
    if (!job.currency) return null;
    if (job.salaryMin && job.salaryMax) {
      return t("salary", {
        min: formatUAH(job.salaryMin, locale),
        max: formatUAH(job.salaryMax, locale),
        currency: job.currency
      });
    }
    if (job.salaryMin) {
      return t("salaryFrom", {
        min: formatUAH(job.salaryMin, locale),
        currency: job.currency
      });
    }
    return null;
  })();

  const originalUrl = job.sourceUrl ?? job.urlOriginal ?? job.urlApply;
  const canOpenOriginal = isValidOriginalUrl(originalUrl);

  return (
    <article className="card flex flex-col gap-3">
      <div className="text-sm text-gray-500">{job.companyName ?? "—"}</div>
      <h2 className="text-lg font-semibold leading-tight">{job.title}</h2>
      <div className="text-sm text-gray-600">
        {job.city ?? (job.remote ? "Remote" : "—")}
      </div>
      {salary && <div className="text-sm font-medium text-gray-800">{salary}</div>}
      <div className="text-xs text-gray-400">{formatDate(locale, job.publishedAt)}</div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={`/${locale}/jobs/${job.id}`}
          className="inline-flex min-h-[44px] items-center rounded-full border border-black/10 px-4 text-sm font-medium hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {t("openDetails")}
        </Link>
        {canOpenOriginal && originalUrl && (
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

function isValidOriginalUrl(url?: string | null) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    if (parsed.hostname === "jobs.example") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
