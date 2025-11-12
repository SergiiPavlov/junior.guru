"use client";

import { useEffect } from "react";
import type { Locale } from "../../lib/i18n/config";

export function LocaleEffect({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
