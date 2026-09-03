import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: {},

  experimental: {
    turbo: false
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co'
      }
    ]
  }
};

export default nextConfig;
