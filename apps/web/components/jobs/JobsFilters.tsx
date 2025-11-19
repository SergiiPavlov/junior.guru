"use client";

import { useCallback, useMemo, type FormEvent } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useTranslations } from "../../lib/i18n/provider";

import { JobsAiDialog } from "./JobsAiDialog";

const SORT_OPTIONS = ["recent", "relevant", "salary_desc", "salary_asc"] as const;
const PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];

export function JobsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("jobs.filters");
  const tSort = useTranslations("jobs.sortOptions");

  const currentValues = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return {
      q: params.get("q") ?? "",
      city: params.get("city") ?? "",
      region: params.get("region") ?? "",
      country: params.get("country") ?? "",
      remote: params.get("remote") === "true",
      skills: params.get("skills") ?? "",
      tags: params.get("tags") ?? "",
      salaryMin: params.get("salaryMin") ?? "",
      currency: params.get("currency") ?? "",
      experience: params.get("experience") ?? "",
      sort: params.get("sort") ?? "recent",
      perPage: params.get("perPage") ?? "20"
    };
  }, [searchParams]);

  const applyFilters = useCallback(
    (form: HTMLFormElement) => {
      const formData = new FormData(form);
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        if (typeof value === "string" && value.trim().length > 0) {
          params.set(key, value.trim());
        }
      });
      if (formData.get("remote") === "on") {
        params.set("remote", "true");
      }
      router.push(`?${params.toString()}`);
    },
    [router]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      applyFilters(event.currentTarget);
    },
    [applyFilters]
  );

  const handleReset = useCallback(
    () => {
      router.push("?");
    },
    [router]
  );

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("keyword")}</span>
          <input
            name="q"
            defaultValue={currentValues.q}
            className="input"
            placeholder={t("keyword")}
          />
          <span className="text-xs text-gray-500">{t("keywordHint")}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("city")}</span>
          <input name="city" defaultValue={currentValues.city} className="input" placeholder="Kyiv" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("region")}</span>
          <input name="region" defaultValue={currentValues.region} className="input" placeholder="UA-30" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("country")}</span>
          <select name="country" defaultValue={currentValues.country} className="input">
            <option value="">{t("countryAny")}</option>
            <option value="UA">Ukraine</option>
            <option value="PL">Poland</option>
            <option value="DE">Germany</option>
          </select>
          <span className="text-xs text-gray-500">{t("countryHint")}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              name="remote"
              defaultChecked={currentValues.remote}
              className="h-4 w-4"
              aria-label={t("remote")}
            />
            {t("remote")}
          </span>
          <span className="text-xs text-gray-500">{t("remoteHint")}</span>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("skills")}</span>
          <input name="skills" defaultValue={currentValues.skills} className="input" placeholder="react,typescript" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("tags")}</span>
          <input name="tags" defaultValue={currentValues.tags} className="input" placeholder="frontend" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("salaryMin")}</span>
          <input name="salaryMin" defaultValue={currentValues.salaryMin} className="input" type="number" min={0} step={1000} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("currency")}</span>
          <input name="currency" defaultValue={currentValues.currency} className="input" placeholder="UAH" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("experience")}</span>
          <input name="experience" defaultValue={currentValues.experience} className="input" placeholder="junior" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("sort")}</span>
          <select name="sort" defaultValue={currentValues.sort} className="input">
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {tSort(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("perPage")}</span>
          <select name="perPage" defaultValue={currentValues.perPage} className="input">
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("apply")}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("reset")}
          </button>
        </div>
      </div>
      <div className="border-t border-dashed border-black/10 pt-4">
        <JobsAiDialog country={currentValues.country || undefined} remoteOnly={currentValues.remote} />
      </div>
    </form>
  );
}
