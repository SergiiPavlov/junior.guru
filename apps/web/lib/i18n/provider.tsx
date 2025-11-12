"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import type { Locale } from "./config";
import type { Messages } from "./messages";
import { createTranslator } from "./translate";

interface IntlContextValue {
  locale: Locale;
  messages: Messages;
}

interface IntlProviderProps extends PropsWithChildren {
  locale: Locale;
  messages: Messages;
}

const IntlContext = createContext<IntlContextValue | null>(null);

export function IntlProvider({ children, locale, messages }: IntlProviderProps) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <IntlContext.Provider value={value}>{children}</IntlContext.Provider>;
}

export function useLocale(): Locale {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error("useLocale must be used within IntlProvider");
  }
  return context.locale;
}

export function useTranslations(namespace?: string) {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error("useTranslations must be used within IntlProvider");
  }
  const { locale, messages } = context;
  return createTranslator({ locale, messages, namespace });
}

export { createTranslator };
