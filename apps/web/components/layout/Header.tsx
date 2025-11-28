"use client";

import { Suspense, useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";

import { useLocale, useTranslations } from "../../lib/i18n/provider";
import { LanguageSwitcher } from "../navigation/LanguageSwitcher";

export function Header() {
  const t = useTranslations("navigation");
  const locale = useLocale();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Needed for createPortal on the client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur shadow-sm">
      <div className="container flex flex-wrap items-center gap-3 py-3 sm:gap-6">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 text-xl font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white">
            <Image src="/logo-juy.svg" alt="" width={28} height={28} className="h-7 w-7" />
          </span>
          <span className="font-semibold">Junior UA</span>
        </Link>

        <nav className="hidden md:flex flex-wrap items-center gap-2 text-sm sm:gap-4">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("home")}
          </Link>
          <Link
            href={`/${locale}/jobs`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("jobs")}
          </Link>
          <Link
            href={`/${locale}/events`}
            className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            {t("events")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Mobile burger button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 md:hidden"
            aria-label="Open navigation"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <span className="sr-only">Open navigation</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>

          <Suspense
            fallback={
              <div
                className="min-w-[44px] rounded-full bg-gray-200 px-4 py-2"
                aria-hidden="true"
              />
            }
          >
            <LanguageSwitcher />
          </Suspense>
        </div>
      </div>

      {isMounted && isMobileMenuOpen
        ? createPortal(
            <div className="fixed inset-0 z-[9999] bg-slate-900 md:hidden">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3">
                  <span className="text-base font-semibold text-white">Junior UA</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                    aria-label="Close navigation"
                    onClick={closeMenu}
                  >
                    <span className="sr-only">Close navigation</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M6 6l12 12M18 6l-12 12"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 text-base">
                  <Link
                    href={`/${locale}`}
                    className="rounded-md px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    onClick={closeMenu}
                  >
                    {t("home")}
                  </Link>
                  <Link
                    href={`/${locale}/jobs`}
                    className="rounded-md px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    onClick={closeMenu}
                  >
                    {t("jobs")}
                  </Link>
                  <Link
                    href={`/${locale}/events`}
                    className="rounded-md px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    onClick={closeMenu}
                  >
                    {t("events")}
                  </Link>
                </nav>
              </div>
            </div>,
            document.body
          )
        : null}
    </header>
  );
}
