"use client";

import Link from "next/link";

import { formatCurrency, formatDate } from "../../lib/format";
import { useLocale, useTranslations } from "../../lib/i18n/provider";

import type { JobListItem } from "../../lib/api";

export function JobCard({ job }: { job: JobListItem }) {
  const locale = useLocale();
  const t = useTranslations("jobs");

  const salary = (() => {
    if (!job.currency) return null;
    if (job.salaryMin && job.salaryMax) {
      return t("salary", {
        min: formatCurrency(locale, job.salaryMin, job.currency),
        max: formatCurrency(locale, job.salaryMax, job.currency),
        currency: job.currency
      });
    }
    if (job.salaryMin) {
      return t("salaryFrom", {
        min: formatCurrency(locale, job.salaryMin, job.currency),
        currency: job.currency
      });
    }
    return null;
  })();

  const originalUrl = job.sourceUrl ?? job.urlOriginal ?? job.urlApply;

  return (
    <article className="card flex flex-col gap-3">
      <div className="text-sm text-gray-500">{job.companyName ?? "—"}</div>
      <h2 className="text-lg font-semibold leading-tight">{job.title}</h2>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {job.city && (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[var(--accent)]">
            {job.city}
          </span>
        )}
        {job.remote && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
            Remote
          </span>
        )}
      </div>
      {salary && (
        <div className="mt-1 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          {salary}
        </div>
      )}
      <div className="text-xs text-gray-400">{formatDate(locale, job.publishedAt)}</div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={`/${locale}/jobs/${job.id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {t("openDetails")}
        </Link>
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[var(--accent)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("openOriginal")}
          </a>
        )}
      </div>
    </article>
  );
}
