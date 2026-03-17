import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "playwright-core", "@sparticuz/chromium-min"],
};

export default nextConfig;
