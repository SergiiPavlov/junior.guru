"use client";

import Link from "next/link";

import { useTranslations } from "../../lib/i18n/provider";

type JobsPaginationProps = {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
};

type PageItem = number | "ellipsis";

function buildPageItems(page: number, totalPages: number, windowSize = 5): PageItem[] {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [];
  const first = 1;
  const last = totalPages;

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  items.push(first);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(last);

  return items;
}

export function JobsPagination({ page, totalPages, makeHref }: JobsPaginationProps) {
  const t = useTranslations("jobs.pagination");

  if (totalPages <= 1) {
    return null;
  }

  const items = buildPageItems(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

  return (
    <nav className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm md:flex-row md:justify-between" aria-label={t("page", { page: String(page), pages: String(totalPages) })}>
      <div className="flex items-center gap-2">
        <Link
          href={makeHref(page - 1)}
          aria-disabled={!hasPrev}
          className={cx(
            "inline-flex min-h-[40px] items-center justify-center rounded-full border border-gray-200 px-4 font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50",
            !hasPrev && "pointer-events-none border-gray-100 text-gray-400 hover:bg-white"
          )}
        >
          {t("prev")}
        </Link>
      </div>
      <div className="flex items-center gap-1" aria-label={t("page", { page: String(page), pages: String(totalPages) })}>
        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400" aria-hidden="true">
                ...
              </span>
            );
          }
          const isCurrent = item === page;
          return (
            <Link
              key={item}
              href={makeHref(item)}
              aria-current={isCurrent ? "page" : undefined}
              className={cx(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-full text-sm transition-colors px-3 py-2",
                isCurrent
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white text-gray-700 hover:bg-[color:var(--accent-soft,rgba(21,128,255,0.12))]"
              )}
            >
              {item}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={makeHref(page + 1)}
          aria-disabled={!hasNext}
          className={cx(
            "inline-flex min-h-[40px] items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)] px-4 font-medium text-white transition hover:brightness-95",
            !hasNext && "pointer-events-none border-gray-100 bg-gray-200 text-gray-500 hover:brightness-100"
          )}
        >
          {t("next")}
        </Link>
      </div>
    </nav>
  );
}

export { buildPageItems };
