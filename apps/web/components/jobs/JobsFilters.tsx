"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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
      sort: params.get("sort") ?? "recent",
      perPage: params.get("perPage") ?? "20"
    };
  }, [searchParams]);

  const [skillsValue, setSkillsValue] = useState(currentValues.skills);
  const [tagsValue, setTagsValue] = useState(currentValues.tags);
  const [salaryMinValue, setSalaryMinValue] = useState(currentValues.salaryMin);
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);

  useEffect(() => {
    setSkillsValue(currentValues.skills);
  }, [currentValues.skills]);

  useEffect(() => {
    setTagsValue(currentValues.tags);
  }, [currentValues.tags]);

  useEffect(() => {
    setSalaryMinValue(currentValues.salaryMin);
  }, [currentValues.salaryMin]);

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

  const handleReset = useCallback(() => {
    setSkillsValue("");
    setTagsValue("");
    setSalaryMinValue("");
    router.push("?");
  }, [router]);

  const salaryFormatter = useMemo(() => {
    const localeKey = locale === "en" ? "en-US" : "uk-UA";
    return new Intl.NumberFormat(localeKey);
  }, [locale]);

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
            defaultValue={currentValues.city}
            className="input"
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
          <div className="relative">
            <input
              name="skills"
              value={skillsValue}
              onChange={(event) => setSkillsValue(event.target.value)}
              className="input pr-10"
              placeholder="react,typescript"
              list="jobs-skills-suggestions"
            />
            <button
              type="button"
              aria-label={t("openSuggestions")}
              aria-expanded={isSkillsDropdownOpen}
              onClick={() => setIsSkillsDropdownOpen((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isSkillsDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isSkillsDropdownOpen && (
              <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {SKILL_SUGGESTIONS.map((skill) => (
                    <label key={skill} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedSkills.some((item) => item.toLowerCase() === skill.toLowerCase())}
                        onChange={() => setSkillsValue((prev) => toggleCommaSeparatedValue(prev, skill))}
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <datalist id="jobs-skills-suggestions">
              {SKILL_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("tags")}</span>
          <div className="relative">
            <input
              name="tags"
              value={tagsValue}
              onChange={(event) => setTagsValue(event.target.value)}
              className="input pr-10"
              placeholder="frontend"
              list="jobs-tags-suggestions"
            />
            <button
              type="button"
              aria-label={t("openSuggestions")}
              aria-expanded={isTagsDropdownOpen}
              onClick={() => setIsTagsDropdownOpen((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
            >
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isTagsDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isTagsDropdownOpen && (
              <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {TAG_SUGGESTIONS.map((tag) => (
                    <label key={tag} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTags.some((item) => item.toLowerCase() === tag.toLowerCase())}
                        onChange={() => setTagsValue((prev) => toggleCommaSeparatedValue(prev, tag))}
                      />
                      <span>{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <datalist id="jobs-tags-suggestions">
              {TAG_SUGGESTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("salaryMin")}</span>
          <div className="flex gap-2">
            <input
              name="salaryMin"
              value={salaryMinValue}
              onChange={(event) => setSalaryMinValue(event.target.value)}
              className="input"
              type="number"
              min={0}
              step={1000}
            />
            <select
              className="w-32 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              defaultValue=""
              aria-label={t("salaryPresetPlaceholder")}
              onChange={(event) => {
                const preset = event.target.value;
                if (!preset) {
                  return;
                }
                setSalaryMinValue(preset);
                event.currentTarget.value = "";
              }}
            >
              <option value="">{t("salaryPresetPlaceholder")}</option>
              {SALARY_PRESETS.map((amount) => (
                <option key={amount} value={amount}>
                  {salaryFormatter.format(amount)}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("currency")}</span>
          <input name="currency" defaultValue={currentValues.currency} className="input" placeholder="UAH" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("experience")}</span>
          <input
            name="experience"
            defaultValue={currentValues.experience}
            className="input"
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
      </div>
      <div className="flex flex-col gap-4 border-t border-dashed border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <JobsAiDialog country={currentValues.country || undefined} remoteOnly={currentValues.remote} />
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
