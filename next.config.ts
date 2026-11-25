import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "pdf-lib",
    "@pdf-lib/fontkit",
    "regenerator-runtime",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
