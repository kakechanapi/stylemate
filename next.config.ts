import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'thumbnail.image.rakuten.co.jp' },
      { protocol: 'https', hostname: 'shop.r10s.jp' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'rsuykemaxgxhbsogrgln.supabase.co' },
    ],
  },
}

export default nextConfig
