import type { Locale } from "./config";

export type Messages = Record<string, unknown>;

export async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "uk":
      return (await import("../../messages/uk.json")).default;
    case "en":
      return (await import("../../messages/en.json")).default;
    default:
      throw new Error(`Unsupported locale: ${locale}`);
  }
}
