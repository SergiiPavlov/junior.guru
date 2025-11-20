import type { Locale } from "./config";
import type { Messages } from "./messages";

function resolveMessage(messages: Messages, key: string): string | undefined {
  const segments = key.split(".");
  let current: unknown = messages;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function formatMessage(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    const value = values[token];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
}

export function createTranslator({ locale, messages, namespace }: { locale: Locale; messages: Messages; namespace?: string }) {
  return (key: string, values?: Record<string, string | number>) => {
    const namespacedKey = namespace ? `${namespace}.${key}` : key;
    const message = resolveMessage(messages, namespacedKey);
    if (!message) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Missing translation for key "${namespacedKey}" in locale ${locale}`);
      }
      return key;
    }
    return formatMessage(message, values);
  };
}

export { formatMessage, resolveMessage };
