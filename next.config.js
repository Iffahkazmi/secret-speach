/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 15: server actions are stable, no flag needed
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default nextConfig
