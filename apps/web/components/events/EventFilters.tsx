"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, type FormEvent } from "react";

import { useTranslations } from "../../lib/i18n/provider";

const SORT_OPTIONS = ["soon", "recent"] as const;

export function EventFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("events.filters");
  const tSort = useTranslations("events.sortOptions");

  const currentValues = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return {
      q: params.get("q") ?? "",
      city: params.get("city") ?? "",
      region: params.get("region") ?? "",
      remote: params.get("remote") === "true",
      skills: params.get("skills") ?? "",
      tags: params.get("tags") ?? "",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      sort: params.get("sort") ?? "soon"
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
          <input name="q" defaultValue={currentValues.q} className="input" placeholder={t("keyword")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("city")}</span>
          <input name="city" defaultValue={currentValues.city} className="input" placeholder="Kyiv" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("region")}</span>
          <input name="region" defaultValue={currentValues.region} className="input" placeholder="UA-30" />
        </label>
        <label className="flex flex-row items-center gap-2 text-sm">
          <input type="checkbox" name="remote" defaultChecked={currentValues.remote} className="h-4 w-4" aria-label={t("remote")} />
          <span>{t("remote")}</span>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("skills")}</span>
          <input name="skills" defaultValue={currentValues.skills} className="input" placeholder="react" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("tags")}</span>
          <input name="tags" defaultValue={currentValues.tags} className="input" placeholder="frontend" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("from")}</span>
          <input name="from" defaultValue={currentValues.from} className="input" type="date" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t("to")}</span>
          <input name="to" defaultValue={currentValues.to} className="input" type="date" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="flex items-center gap-3 sm:col-span-1 lg:col-span-3">
          <button
            type="submit"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {t("apply")}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {t("reset")}
          </button>
        </div>
      </div>
    </form>
  );
}
