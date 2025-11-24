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
  async rewrites() {
    return [
      {
        source: '/votes',
        destination: '/votes/index.html',
      },
    ];
  },
};

export default nextConfig;
