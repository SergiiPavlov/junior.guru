import type { Locale } from "./i18n/config";

export function formatDateTime(locale: Locale, value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  }).format(date);
}

export function formatDate(locale: Locale, value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options
  }).format(date);
}

export function formatDateRange(locale: Locale, start: string, end?: string) {
  const startDate = new Date(start);
  if (!end) {
    return formatDateTime(locale, startDate);
  }
  const endDate = new Date(end);
  const formatter = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
}

export function stripHtml(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
