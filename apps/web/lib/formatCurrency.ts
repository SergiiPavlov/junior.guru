import type { Locale } from "./i18n/config";

const LOCALE_MAP: Record<Locale, string> = {
  uk: "uk-UA",
  en: "en-GB"
};

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatUAH(value: number, locale: Locale = "uk") {
  const resolvedLocale = LOCALE_MAP[locale] ?? "uk-UA";
  const cacheKey = `${resolvedLocale}-UAH`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: "UAH",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter.format(value);
}
