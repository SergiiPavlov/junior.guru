"use client";

import { useCallback, useEffect, useState } from "react";

import { useSpeechInput } from "../../hooks/useSpeechInput";
import { API_BASE, type JobListItem } from "../../lib/api";
import { useLocale, useTranslations } from "../../lib/i18n/provider";

import { JobCard } from "./JobCard";

type JobsAiDialogProps = {
  country?: string;
  remoteOnly?: boolean;
};

type AiResponse = {
  explanation: string;
  jobs: JobListItem[];
};

export function JobsAiDialog({ country, remoteOnly }: JobsAiDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResponse | null>(null);
  const locale = useLocale();
  const tAi = useTranslations("jobs.ai");

  const handleSpeechResult = useCallback((text: string) => {
    setQuery((current) => {
      if (!current.trim()) {
        return text;
      }
      return `${current} ${text}`.trim();
    });
  }, []);

  const { isSupported, isRecording, start, stop } = useSpeechInput({
    onResult: handleSpeechResult
  });

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setResult(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => setIsOpen(false);

  const normalizedCountry = country?.trim() ? country.trim() : undefined;
  const normalizedRemote = Boolean(remoteOnly);

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
          country: normalizedCountry,
          remoteOnly: normalizedRemote
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
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {tAi("button")}
      </button>
      <p className="text-xs text-gray-500">{tAi("buttonHint")}</p>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/50 px-4 py-8">
          <div className="absolute inset-0" onClick={closeDialog} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-100 bg-white/95 p-6 md:p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <span aria-hidden="true">✨</span>
                </div>
                <div>
                  <p className="text-base md:text-lg font-semibold text-gray-900">{tAi("title")}</p>
                  <p className="mt-1 text-sm text-gray-600">{tAi("description")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSupported) {
                      return;
                    }
                    if (isRecording) {
                      stop();
                    } else {
                      start();
                    }
                  }}
                  disabled={!isSupported}
                  aria-pressed={isRecording}
                  aria-label={tAi("voiceInputAria")}
                  className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    isRecording
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--accent)] bg-white text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <MicrophoneIcon className="h-4 w-4" />
                  {isRecording ? tAi("voiceInputRecording") : tAi("voiceInput")}
                </button>
                {!isSupported && (
                  <p className="text-xs text-gray-500">{tAi("voiceUnsupported")}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !query.trim()}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? tAi("loading") : tAi("submit")}
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {error && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {result && !error && (
                <div className="mt-4 space-y-4 rounded-2xl bg-gray-50/80 p-5">
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

type MicrophoneIconProps = {
  className?: string;
};

function MicrophoneIcon({ className }: MicrophoneIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v4" />
      <path d="M8 23h8" />
    </svg>
  );
}
