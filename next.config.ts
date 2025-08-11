import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pinkmilk.pockethost.io',
      },
    ],
  },
};

export default nextConfig;
