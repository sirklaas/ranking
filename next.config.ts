import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large file uploads (videos up to 50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pinkmilk.pockethost.io',
      },
      {
        protocol: 'https',
        hostname: 'www.pinkmilk.eu',
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
