import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Desactiva el indicador flotante de desarrollo (Rendering...)
  devIndicators: {
    appIsrStatus: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;