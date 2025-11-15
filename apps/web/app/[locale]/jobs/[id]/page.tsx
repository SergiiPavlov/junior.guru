import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "../../../../components/common/Breadcrumbs";
import { fetchJob } from "../../../../lib/api";
import { formatCurrency, formatDate, stripHtml } from "../../../../lib/format";
import { isLocale } from "../../../../lib/i18n/config";
import { getTranslator } from "../../../../lib/i18n/server";
import {
  createPageMetadata,
  defaultMetadata,
  defaultSiteDescription,
  defaultSiteTitle
} from "../../../../lib/metadata";

import type { Metadata } from "next";

type JobDetailsParams = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: JobDetailsParams): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    return defaultMetadata;
  }
  try {
    const job = await fetchJob(id);
    const description = stripHtml(job.description) ?? job.title;
    return createPageMetadata({
      locale,
      path: `/jobs/${job.slug ?? job.id}`,
      title: job.title,
      description,
      imageUrl: job.coverImageUrl,
      openGraphOverrides: {
        type: "article",
        publishedTime: job.publishedAt,
        modifiedTime: job.validUntil ?? job.publishedAt
      }
    });
  } catch {
    return createPageMetadata({
      locale,
      path: `/jobs/${id}`,
      title: defaultSiteTitle,
      description: defaultSiteDescription
    });
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
    const tNav = await getTranslator(locale, "navigation");
    const description = stripHtml(job.description) ?? job.title;
    const originalUrl = job.sourceUrl ?? job.urlOriginal ?? job.urlApply;

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
        <Breadcrumbs
          items={[
            { href: `/${locale}`, label: tNav("home") },
            { href: `/${locale}/jobs`, label: tNav("jobs") },
            { label: job.title }
          ]}
        />
        <Link
          href={`/${locale}/jobs`}
          className="text-sm text-blue-600 underline underline-offset-2 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
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
          {originalUrl && (
            <a
              href={originalUrl}
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
