import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Listing photos are served from this project's Supabase Storage bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "igvxvgbufrinhqcropue.supabase.co",
        pathname: "/storage/v1/object/public/listing-images/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
