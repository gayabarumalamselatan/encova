/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' bundles a self-contained server.js into .next/standalone/
  // Required for the Docker multi-stage build to work correctly.
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
