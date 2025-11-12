import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchJob } from "../../../../lib/api";
import { isLocale } from "../../../../lib/i18n/config";
import { getTranslator } from "../../../../lib/i18n/server";
import { createLanguageAlternates } from "../../../../lib/metadata";
import { formatCurrency, formatDate, stripHtml } from "../../../../lib/format";

type JobDetailsParams = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: JobDetailsParams): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  try {
    const job = await fetchJob(id);
    const description = stripHtml(job.description) ?? job.title;
    return {
      title: job.title,
      description,
      alternates: createLanguageAlternates(`/jobs/${job.slug ?? job.id}`, locale),
      openGraph: {
        title: job.title,
        description,
        url: `/${locale}/jobs/${job.id}`
      }
    };
  } catch {
    return {};
  }
}

export default async function JobDetails({ params }: JobDetailsParams) {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const job = await fetchJob(id);
    const t = await getTranslator(locale, "job");
    const description = stripHtml(job.description) ?? job.title;

    const salary = (() => {
      if (!job.currency) return null;
      if (job.salaryMin && job.salaryMax) {
        return `${formatCurrency(locale, job.salaryMin, job.currency)} – ${formatCurrency(locale, job.salaryMax, job.currency)}`;
      }
      if (job.salaryMin) {
        return formatCurrency(locale, job.salaryMin, job.currency);
      }
      return null;
    })();

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description,
      datePosted: job.publishedAt,
      validThrough: job.validUntil,
      employmentType: job.employmentType,
      hiringOrganization: {
        "@type": "Organization",
        name: job.companyName ?? "Unknown"
      },
      jobLocationType: job.remote ? "TELECOMMUTE" : undefined,
      jobLocation: job.remote
        ? undefined
        : {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.city,
              addressRegion: job.regionCode,
              addressCountry: "UA"
            }
          },
      baseSalary:
        job.salaryMin && job.currency
          ? {
              "@type": "MonetaryAmount",
              currency: job.currency,
              value: {
                "@type": "QuantitativeValue",
                minValue: job.salaryMin,
                maxValue: job.salaryMax ?? undefined,
                unitText: "MONTH"
              }
            }
          : undefined,
      applicantLocationRequirements: job.remote
        ? {
            "@type": "Country",
            name: "Ukraine"
          }
        : undefined
    };

    return (
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href={`/${locale}/jobs`}
          className="text-sm text-blue-600 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          {t("back")}
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight">{job.title}</h1>
          <div className="text-lg text-gray-600">{job.companyName ?? "—"}</div>
          <div className="text-sm text-gray-500">
            {[job.city, job.remote ? "Remote" : null].filter(Boolean).join(" · ")}
          </div>
          {salary && <div className="text-base font-medium text-gray-800">{salary}</div>}
          <div className="text-xs text-gray-400">{formatDate(locale, job.publishedAt)}</div>
        </div>
        {job.description && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        )}
        <div className="flex flex-wrap gap-3">
          {job.urlOriginal && (
            <a
              href={job.urlOriginal}
              className="inline-flex min-h-[44px] items-center rounded-full bg-black px-5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("apply")}
            </a>
          )}
        </div>
        <script type="application/ld+json" suppressHydrationWarning>{JSON.stringify(jsonLd)}</script>
      </article>
    );
  } catch (error) {
    console.error("Failed to load job", error);
    const t = await getTranslator(locale, "job");
    return <div className="muted">{t("notFound")}</div>;
  }
}
