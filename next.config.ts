import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Desactiva el indicador flotante de desarrollo (Rendering...)
  devIndicators: {},

  // Desactivar Turbopack para evitar el bug de cookies() en Vercel
  experimental: {
    turbo: false,
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
