import { loadMessages } from "./messages";
import { createTranslator } from "./translate";

import type { Locale } from "./config";

export async function getTranslator(locale: Locale, namespace?: string) {
  const messages = await loadMessages(locale);
  return createTranslator({ locale, messages, namespace });
}

export async function getMessagesForLocale(locale: Locale) {
  return loadMessages(locale);
}
