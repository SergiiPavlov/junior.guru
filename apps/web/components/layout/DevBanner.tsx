"use client";

import { useTranslations } from "../../lib/i18n/provider";

export function DevBanner() {
  const t = useTranslations("devBanner");

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="container py-2 text-center text-xs sm:text-sm">
        {t("message")}
      </div>
    </div>
  );
}
