import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.example.com" },
      { protocol: "https", hostname: "images.junior.ua" },
      { protocol: "https", hostname: "media.junior.ua" }
    ]
  }
};

export default nextConfig;
