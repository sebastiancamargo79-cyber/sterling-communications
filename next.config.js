/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Mark canvas and other optional dependencies as external
    // These are only needed at runtime, not during build
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push(
        { canvas: 'canvas' },
        { 'pdfjs-dist/legacy/build/pdf.worker': 'pdfjs-dist/legacy/build/pdf.worker' }
      )
    }
    return config
  },
}

module.exports = nextConfig
