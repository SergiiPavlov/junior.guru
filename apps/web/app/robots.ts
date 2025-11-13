import type { MetadataRoute } from "next";

import { siteUrl } from "../lib/metadata";

const DISALLOWED_PATHS = ["/api/", "/api/*", "/admin", "/dashboard", "/drafts", "/private"];

export const revalidate = 60;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
