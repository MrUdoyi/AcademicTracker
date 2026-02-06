import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We keep this to be safe, but we REMOVE "output: 'export'"
  images: {
    unoptimized: true,
  },
};

export default nextConfig;