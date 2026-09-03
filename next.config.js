/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {},

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co'
      }
    ]
  }
};

module.exports = nextConfig;
