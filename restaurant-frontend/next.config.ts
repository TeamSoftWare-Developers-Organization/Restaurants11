import type { NextConfig } from "next";

const backendBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://restaurants11.onrender.com/api').replace(/\/api\/?$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${backendBaseUrl}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
