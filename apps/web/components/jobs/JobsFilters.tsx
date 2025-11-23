"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useLocale, useTranslations } from "../../lib/i18n/provider";

import {
  CITY_SUGGESTIONS,
  KEYWORD_SUGGESTIONS,
  LEVEL_OPTIONS,
  SALARY_PRESETS,
  SKILL_SUGGESTIONS,
  TAG_SUGGESTIONS
} from "./filters-options";
import { JobsAiDialog } from "./JobsAiDialog";

const SORT_OPTIONS = ["recent", "relevant", "salary_desc", "salary_asc"] as const;
const PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];
const DEFAULT_SORT = "recent";
const DEFAULT_PER_PAGE = "20";
const baseInputClasses =
  "w-full min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";
const dropdownPanelClasses =
  "absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-auto rounded-2xl bg-slate-900 p-2 text-slate-50 shadow-xl ring-1 ring-slate-800";
const dropdownOptionBaseClasses = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors";

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
      city: params.get("city") ?? "",
      region: params.get("region") ?? "",
      country: params.get("country") ?? "",
      remote: params.get("remote") === "true",
      skills: params.get("skills") ?? "",
      tags: params.get("tags") ?? "",
      salaryMin: params.get("salaryMin") ?? "",
      currency: params.get("currency") ?? "",
      experience: params.get("experience") ?? "",
      sort: params.get("sort") ?? DEFAULT_SORT,
      perPage: params.get("perPage") ?? DEFAULT_PER_PAGE
    };
  }, [searchParams]);

  const [qValue, setQValue] = useState(currentValues.q);
  const [cityValue, setCityValue] = useState(currentValues.city);
  const [regionValue, setRegionValue] = useState(currentValues.region);
  const [countryValue, setCountryValue] = useState(currentValues.country);
  const [remoteValue, setRemoteValue] = useState(currentValues.remote);
  const [skillsValue, setSkillsValue] = useState(currentValues.skills);
  const [tagsValue, setTagsValue] = useState(currentValues.tags);
  const [salaryMinValue, setSalaryMinValue] = useState(currentValues.salaryMin);
  const [currencyValue, setCurrencyValue] = useState(currentValues.currency);
  const [experienceValue, setExperienceValue] = useState(currentValues.experience);
  const [sortValue, setSortValue] = useState(currentValues.sort);
  const [perPageValue, setPerPageValue] = useState(currentValues.perPage);
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
  const [isSalaryDropdownOpen, setIsSalaryDropdownOpen] = useState(false);
  const skillsDropdownRef = useRef<HTMLDivElement | null>(null);
  const tagsDropdownRef = useRef<HTMLDivElement | null>(null);
  const salaryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQValue(currentValues.q);
    setCityValue(currentValues.city);
    setRegionValue(currentValues.region);
    setCountryValue(currentValues.country);
    setRemoteValue(currentValues.remote);
    setSkillsValue(currentValues.skills);
    setTagsValue(currentValues.tags);
    setSalaryMinValue(currentValues.salaryMin);
    setCurrencyValue(currentValues.currency);
    setExperienceValue(currentValues.experience);
    setSortValue(currentValues.sort);
    setPerPageValue(currentValues.perPage);
  }, [currentValues]);

  const splitCommaSeparated = useCallback((value: string) => {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, []);

  const selectedSkills = useMemo(() => splitCommaSeparated(skillsValue), [skillsValue, splitCommaSeparated]);
  const selectedTags = useMemo(() => splitCommaSeparated(tagsValue), [tagsValue, splitCommaSeparated]);

  const toggleCommaSeparatedValue = useCallback((current: string, value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return current;
    }
    const items = splitCommaSeparated(current);
    const normalizedLower = normalized.toLowerCase();
    const filtered = items.filter((item) => item.toLowerCase() !== normalizedLower);
    if (filtered.length !== items.length) {
      return filtered.join(", ");
    }
    return [...items, normalized].join(", ");
  }, [splitCommaSeparated]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    const setParam = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        params.set(key, trimmed);
      }
    };

    setParam("q", qValue);
    setParam("city", cityValue);
    setParam("region", regionValue);
    setParam("country", countryValue);
    setParam("skills", skillsValue);
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
    cityValue,
    countryValue,
    currencyValue,
    experienceValue,
    perPageValue,
    qValue,
    regionValue,
    remoteValue,
    router,
    salaryMinValue,
    skillsValue,
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
    setCityValue("");
    setRegionValue("");
    setCountryValue("");
    setRemoteValue(false);
    setSkillsValue("");
    setTagsValue("");
    setSalaryMinValue("");
    setCurrencyValue("");
    setExperienceValue("");
    setSortValue(DEFAULT_SORT);
    setPerPageValue(DEFAULT_PER_PAGE);
    setIsSkillsDropdownOpen(false);
    setIsTagsDropdownOpen(false);
    setIsSalaryDropdownOpen(false);
    router.push("?");
  }, [router]);

  const salaryFormatter = useMemo(() => {
    const localeKey = locale === "en" ? "en-US" : "uk-UA";
    return new Intl.NumberFormat(localeKey);
  }, [locale]);

  useEffect(() => {
    if (!isSkillsDropdownOpen && !isTagsDropdownOpen && !isSalaryDropdownOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSkillsDropdownOpen(false);
        setIsTagsDropdownOpen(false);
        setIsSalaryDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSkillsDropdownOpen, isTagsDropdownOpen, isSalaryDropdownOpen]);

  useEffect(() => {
    if (!isSkillsDropdownOpen && !isTagsDropdownOpen && !isSalaryDropdownOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isSkillsDropdownOpen &&
        skillsDropdownRef.current &&
        !skillsDropdownRef.current.contains(target)
      ) {
        setIsSkillsDropdownOpen(false);
      }
      if (
        isTagsDropdownOpen &&
        tagsDropdownRef.current &&
        !tagsDropdownRef.current.contains(target)
      ) {
        setIsTagsDropdownOpen(false);
      }
      if (
        isSalaryDropdownOpen &&
        salaryDropdownRef.current &&
        !salaryDropdownRef.current.contains(target)
      ) {
        setIsSalaryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isSkillsDropdownOpen, isTagsDropdownOpen, isSalaryDropdownOpen]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("keyword")}</span>
          <input
            name="q"
            value={qValue}
            onChange={(event) => setQValue(event.target.value)}
            className={baseInputClasses}
            placeholder={t("keyword")}
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
          <span>{t("city")}</span>
          <input
            name="city"
            value={cityValue}
            onChange={(event) => setCityValue(event.target.value)}
            className={baseInputClasses}
            placeholder="Kyiv"
            list="jobs-city-suggestions"
          />
          <datalist id="jobs-city-suggestions">
            {CITY_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("region")}</span>
          <input
            name="region"
            value={regionValue}
            onChange={(event) => setRegionValue(event.target.value)}
            className={baseInputClasses}
            placeholder="UA-30"
          />
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
          <span>{t("skills")}</span>
          <div className="relative" ref={skillsDropdownRef}>
            <input
              name="skills"
              value={skillsValue}
              onChange={(event) => setSkillsValue(event.target.value)}
              className={`${baseInputClasses} pr-12`}
              placeholder="react, typescript"
            />
            <button
              type="button"
              aria-label={t("openSuggestions")}
              aria-expanded={isSkillsDropdownOpen}
              aria-controls="jobs-skills-suggestions-panel"
              onClick={() => setIsSkillsDropdownOpen((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-full px-4 text-slate-500"
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isSkillsDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isSkillsDropdownOpen && (
              <div
                id="jobs-skills-suggestions-panel"
                role="listbox"
                aria-multiselectable="true"
                className={dropdownPanelClasses}
              >
                {SKILL_SUGGESTIONS.map((skill) => {
                  const isSelected = selectedSkills.some(
                    (item) => item.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <label
                      key={skill}
                      className={`${dropdownOptionBaseClasses} ${
                        isSelected ? "bg-slate-800 font-semibold" : "hover:bg-slate-800/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-500 text-[var(--accent)] focus:ring-[var(--accent)]"
                        checked={isSelected}
                        onChange={() =>
                          setSkillsValue((prev) => toggleCommaSeparatedValue(prev, skill))
                        }
                      />
                      <span>{skill}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("tags")}</span>
          <div className="relative" ref={tagsDropdownRef}>
            <input
              name="tags"
              value={tagsValue}
              onChange={(event) => setTagsValue(event.target.value)}
              className={`${baseInputClasses} pr-12`}
              placeholder="frontend, remote"
            />
            <button
              type="button"
              aria-label={t("openSuggestions")}
              aria-expanded={isTagsDropdownOpen}
              aria-controls="jobs-tags-suggestions-panel"
              onClick={() => setIsTagsDropdownOpen((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center rounded-r-full px-4 text-slate-500"
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isTagsDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isTagsDropdownOpen && (
              <div
                id="jobs-tags-suggestions-panel"
                role="listbox"
                aria-multiselectable="true"
                className={dropdownPanelClasses}
              >
                {TAG_SUGGESTIONS.map((tag) => {
                  const isSelected = selectedTags.some(
                    (item) => item.toLowerCase() === tag.toLowerCase()
                  );
                  return (
                    <label
                      key={tag}
                      className={`${dropdownOptionBaseClasses} ${
                        isSelected ? "bg-slate-800 font-semibold" : "hover:bg-slate-800/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-500 text-[var(--accent)] focus:ring-[var(--accent)]"
                        checked={isSelected}
                        onChange={() =>
                          setTagsValue((prev) => toggleCommaSeparatedValue(prev, tag))
                        }
                      />
                      <span>{tag}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("salaryMin")}</span>
          <div className="relative" ref={salaryDropdownRef}>
            <input
              name="salaryMin"
              value={salaryMinValue}
              onChange={(event) => setSalaryMinValue(event.target.value)}
              className={`${baseInputClasses} pr-32`}
              type="number"
              min={0}
              step={1000}
            />
            <button
              type="button"
              aria-expanded={isSalaryDropdownOpen}
              aria-controls="jobs-salary-suggestions-panel"
              onClick={() => setIsSalaryDropdownOpen((prev) => !prev)}
              className="absolute inset-y-1 right-1 flex items-center gap-1 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              {t("salaryPresetPlaceholder")}
              <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isSalaryDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isSalaryDropdownOpen && (
              <div
                id="jobs-salary-suggestions-panel"
                role="listbox"
                className={dropdownPanelClasses}
              >
                {SALARY_PRESETS.map((amount) => {
                  const amountString = amount.toString();
                  const isSelected = salaryMinValue.trim() === amountString;
                  return (
                    <button
                      type="button"
                      key={amount}
                      className={`${dropdownOptionBaseClasses} w-full text-left ${
                        isSelected ? "bg-slate-800 font-semibold" : "hover:bg-slate-800/70"
                      }`}
                      onClick={() => {
                        setSalaryMinValue(amountString);
                        setIsSalaryDropdownOpen(false);
                      }}
                    >
                      {salaryFormatter.format(amount)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("currency")}</span>
          <input
            name="currency"
            value={currencyValue}
            onChange={(event) => setCurrencyValue(event.target.value)}
            className={baseInputClasses}
            placeholder="UAH"
          />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("sort")}</span>
          <select
            name="sort"
            value={sortValue}
            onChange={(event) => setSortValue(event.target.value)}
            className={baseInputClasses}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {tSort(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("perPage")}</span>
          <select
            name="perPage"
            value={perPageValue}
            onChange={(event) => setPerPageValue(event.target.value)}
            className={baseInputClasses}
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-4 border-t border-dashed border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <JobsAiDialog country={countryValue || undefined} remoteOnly={remoteValue} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
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
    </form>
  );
}

type ChevronDownIconProps = {
  className?: string;
};

function ChevronDownIcon({ className }: ChevronDownIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25 12 15.75 4.5 8.25" />
    </svg>
  );
}
