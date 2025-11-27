/* eslint-disable import/order */
"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useLocale, useTranslations } from "../../lib/i18n/provider";

import { KEYWORD_SUGGESTIONS, LEVEL_OPTIONS, SALARY_PRESETS, TAG_SUGGESTIONS } from "./filters-options";
import { JobsAiDialog } from "./JobsAiDialog";


const SORT_OPTIONS = ["recent", "relevant", "salary_desc", "salary_asc"] as const;
const PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];
const DEFAULT_SORT = "recent";
const DEFAULT_PER_PAGE = "20";

const baseInputClasses =
  "w-full min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

export function JobsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("jobs.filters");
  const tSort = useTranslations("jobs.sortOptions");
  const locale = useLocale();

  const currentValues = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return {
      q: params.get("q") ?? "",
      country: params.get("country") ?? "",
      remote: params.get("remote") === "true",
      tags: params.get("tags") ?? "",
      salaryMin: params.get("salaryMin") ?? "",
      currency: params.get("currency") ?? "",
      experience: params.get("experience") ?? "",
      sort: params.get("sort") ?? DEFAULT_SORT,
      perPage: params.get("perPage") ?? DEFAULT_PER_PAGE
    };
  }, [searchParams]);

  const [qValue, setQValue] = useState(currentValues.q);
  const [countryValue, setCountryValue] = useState(currentValues.country);
  const [remoteValue, setRemoteValue] = useState(currentValues.remote);
  const [tagsValue, setTagsValue] = useState(currentValues.tags);
  const [salaryMinValue, setSalaryMinValue] = useState(currentValues.salaryMin);
  const [currencyValue, setCurrencyValue] = useState(currentValues.currency);
  const [experienceValue, setExperienceValue] = useState(currentValues.experience);
  const [sortValue, setSortValue] = useState(currentValues.sort);
  const [perPageValue, setPerPageValue] = useState(currentValues.perPage);

  useEffect(() => {
    setQValue(currentValues.q);
    setCountryValue(currentValues.country);
    setRemoteValue(currentValues.remote);
    setTagsValue(currentValues.tags);
    setSalaryMinValue(currentValues.salaryMin);
    setCurrencyValue(currentValues.currency);
    setExperienceValue(currentValues.experience);
    setSortValue(currentValues.sort);
    setPerPageValue(currentValues.perPage);
  }, [currentValues]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    const setParam = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        params.set(key, trimmed);
      }
    };

    // Ключевое слово — только то, что ввёл пользователь
    setParam("q", qValue);
    setParam("country", countryValue);
    setParam("tags", tagsValue);
    setParam("salaryMin", salaryMinValue);
    setParam("currency", currencyValue);
    setParam("experience", experienceValue);
    setParam("sort", sortValue);
    setParam("perPage", perPageValue);

    if (remoteValue) {
      params.set("remote", "true");
    }

    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  }, [
    countryValue,
    currencyValue,
    experienceValue,
    perPageValue,
    qValue,
    remoteValue,
    router,
    salaryMinValue,
    sortValue,
    tagsValue
  ]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      applyFilters();
    },
    [applyFilters]
  );

  const handleReset = useCallback(() => {
    setQValue("");
    setCountryValue("");
    setRemoteValue(false);
    setTagsValue("");
    setSalaryMinValue("");
    setCurrencyValue("");
    setExperienceValue("");
    setSortValue(DEFAULT_SORT);
    setPerPageValue(DEFAULT_PER_PAGE);

    const params = new URLSearchParams();
    params.set("sort", DEFAULT_SORT);
    params.set("perPage", DEFAULT_PER_PAGE);
    router.push(`?${params.toString()}`);
  }, [router]);

  const salaryFormatter = useMemo(() => {
    const localeKey = locale === "en" ? "en-US" : "uk-UA";
    return new Intl.NumberFormat(localeKey);
  }, [locale]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>{t("perPage")}:</span>
            <select
              name="perPage"
              value={perPageValue}
              onChange={(event) => setPerPageValue(event.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs"
            >
              {PER_PAGE_OPTIONS.map((value) => (
                <option key={value} value={value.toString()}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>{t("sort")}:</span>
            <select
              name="sort"
              value={sortValue}
              onChange={(event) => setSortValue(event.target.value)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {tSort(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("keyword")}</span>
          <input
            name="q"
            value={qValue}
            onChange={(event) => setQValue(event.target.value)}
            className={baseInputClasses}
            placeholder={t("keywordPlaceholder")}
            list="jobs-keyword-suggestions"
          />
          <datalist id="jobs-keyword-suggestions">
            {KEYWORD_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <span className="text-xs text-gray-500">{t("keywordHint")}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>{t("country")}</span>
          <select
            name="country"
            value={countryValue}
            onChange={(event) => setCountryValue(event.target.value)}
            className={baseInputClasses}
          >
            <option value="">{t("countryAny")}</option>
            <option value="UA">Ukraine</option>
            <option value="PL">Poland</option>
            <option value="DE">Germany</option>
          </select>
          <span className="text-xs text-gray-500">{t("countryHint")}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>{t("tags")}</span>
          <input
            name="tags"
            value={tagsValue}
            onChange={(event) => setTagsValue(event.target.value)}
            className={baseInputClasses}
            placeholder={t("tagsPlaceholder")}
            list="jobs-tags-suggestions"
          />
          <datalist id="jobs-tags-suggestions">
            {TAG_SUGGESTIONS.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <span className="text-xs text-gray-500">{t("tagsHint")}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              name="remote"
              checked={remoteValue}
              onChange={(event) => setRemoteValue(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              aria-label={t("remote")}
            />
            {t("remote")}
          </span>
          <span className="text-xs text-gray-500">{t("remoteHint")}</span>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("salaryMin")}</span>
          <input
            name="salaryMin"
            value={salaryMinValue}
            onChange={(event) => setSalaryMinValue(event.target.value)}
            className={baseInputClasses}
            placeholder={t("salaryMinPlaceholder")}
          />
          <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
            {SALARY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSalaryMinValue(String(preset))}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {salaryFormatter.format(preset)}
              </button>
            ))}
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>{t("currency")}</span>
          <select
            name="currency"
            value={currencyValue}
            onChange={(event) => setCurrencyValue(event.target.value)}
            className={baseInputClasses}
          >
            <option value="">{t("currencyAny")}</option>
            <option value="USD">USD</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>{t("experience")}</span>
          <input
            name="experience"
            value={experienceValue}
            onChange={(event) => setExperienceValue(event.target.value)}
            className={baseInputClasses}
            placeholder="junior"
            list="jobs-level-options"
          />
          <datalist id="jobs-level-options">
            {LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="flex flex-col gap-4 border-t border-dashed border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <JobsAiDialog country={countryValue || undefined} remoteOnly={remoteValue} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="submit"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            {t("apply")}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            {t("reset")}
          </button>
        </div>
      </div>
    </form>
  );
}
