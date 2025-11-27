"use client";

import Image from "next/image";
import Link from "next/link";

import { useLocale, useTranslations } from "../../lib/i18n/provider";

export function Footer() {
  const tFooter = useTranslations("footer");
  const tNav = useTranslations("navigation");
  const year = new Date().getFullYear();
  const locale = useLocale();

  return (
    <footer className="border-t bg-white">
      <div className="container flex flex-col gap-4 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        {/* Левая часть: личный бренд + копирайт */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <a
            href="https://www.linkedin.com/in/sergii-pavlov/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Image
              src="/sp-logo.svg"
              alt="Sergii Pavlov — Full-Stack Developer"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority={false}
            />
            <span className="hidden text-gray-400 sm:inline">•</span>
            <span>{tFooter("copyright", { year: String(year) })}</span>
          </a>
        </div>


        {/* Правая часть: ссылки на политику и условия */}
        <div className="flex gap-4">
          <Link
            href={`/${locale}/privacy`}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {tNav("privacy")}
          </Link>
          <Link
            href={`/${locale}/terms`}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {tNav("terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
