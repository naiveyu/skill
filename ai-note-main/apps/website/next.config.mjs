/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/ai-note',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

export default nextConfig
