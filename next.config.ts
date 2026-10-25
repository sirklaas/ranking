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
        hostname: 'pb.pinkmilk.eu',
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
      {
        source: '/pics/:name.png',
        destination: '/pics/:name.webp',
      },
      {
        source: '/pics/:name.jpeg',
        destination: '/pics/:name.webp',
      },
      {
        source: '/pics/:name.jpg',
        destination: '/pics/:name.webp',
      },
    ];
  },
};

export default nextConfig;
