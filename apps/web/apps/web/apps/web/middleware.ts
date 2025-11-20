import { NextRequest, NextResponse } from "next/server";

import { defaultLocale, isLocale } from "./lib/i18n/config";

const PUBLIC_FILES = [/^\/favicon\.ico$/, /^\/robots\.txt$/, /^\/sitemap\.xml$/];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_FILES.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (!isLocale(firstSegment)) {
    const locale = defaultLocale;
    const redirectUrl = new URL(`/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\.[^/]+$).*)"]
};
