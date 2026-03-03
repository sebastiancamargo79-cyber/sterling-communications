import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/offices', destination: '/clients', permanent: true },
      { source: '/offices/new', destination: '/clients/new', permanent: true },
      { source: '/newsletter/editor', destination: '/clients', permanent: false },
      { source: '/newsletter/preview', destination: '/clients', permanent: false },
    ]
  },
}

export default nextConfig
