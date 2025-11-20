export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uk";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "uk" || value === "en";
}
