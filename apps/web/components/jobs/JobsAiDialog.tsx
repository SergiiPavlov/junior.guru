"use client";

import { useEffect, useMemo, useState } from "react";

import { API_BASE, type JobListItem } from "../../lib/api";
import { useLocale, useTranslations } from "../../lib/i18n/provider";

import { JobCard } from "./JobCard";

type JobsAiDialogProps = {
  initialCountry?: string;
  initialRemoteOnly?: boolean;
};

type AiResponse = {
  explanation: string;
  jobs: JobListItem[];
};

const COUNTRIES = [
  { value: "any", label: "Any" },
  { value: "UA", label: "Ukraine" },
  { value: "PL", label: "Poland" },
  { value: "DE", label: "Germany" }
];

export function JobsAiDialog({ initialCountry, initialRemoteOnly }: JobsAiDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState(initialCountry ?? "any");
  const [remoteOnly, setRemoteOnly] = useState(Boolean(initialRemoteOnly));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResponse | null>(null);
  const locale = useLocale();
  const tAi = useTranslations("jobs.ai");
  const tFilters = useTranslations("jobs.filters");

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setResult(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const countryOptions = useMemo(() => {
    return COUNTRIES.map((item) => ({
      ...item,
      label: item.value === "any" ? tFilters("countryAny") : item.label
    }));
  }, [tFilters]);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  const handleSubmit = async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setError(tAi("missingQuery"));
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`${API_BASE}/ai/jobs-suggest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: normalizedQuery,
          locale,
          country: country || "any",
          remoteOnly
        })
      });
      if (response.status === 503) {
        setError(tAi("notConfigured"));
        return;
      }
      if (!response.ok) {
        setError(tAi("error"));
        return;
      }
      const data = (await response.json()) as AiResponse;
      setResult(data);
    } catch (err) {
      console.error("AI jobs request failed", err);
      setError(tAi("error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        {tAi("button")}
      </button>
      <p className="text-xs text-gray-500">{tAi("buttonHint")}</p>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="absolute inset-0" onClick={closeDialog} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-gray-900">{tAi("title")}</p>
                <p className="mt-1 text-sm text-gray-600">{tAi("description")}</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {tAi("close")}
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">{tAi("queryLabel")}</span>
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  rows={4}
                  className="input"
                  placeholder={tAi("queryPlaceholder")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (!isLoading && query.trim()) {
                        void handleSubmit();
                      }
                    }
                  }}
                />
                <span className="text-xs text-gray-500">{tAi("queryHint")}</span>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{tFilters("country")}</span>
                  <select
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    className="input"
                  >
                    {countryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">{tFilters("remote")}</span>
                  <span className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={remoteOnly}
                      onChange={(event) => setRemoteOnly(event.target.checked)}
                      className="h-4 w-4"
                    />
                    {tAi("remoteHint")}
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !query.trim()}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-70"
              >
                {isLoading ? tAi("loading") : tAi("submit")}
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>}
              {result && !error && (
                <div className="space-y-4">
                  <p className="text-gray-700">{result.explanation}</p>
                  {result.jobs.length === 0 && (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-gray-600">
                      {tAi("empty")}
                    </p>
                  )}
                  {result.jobs.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {result.jobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
