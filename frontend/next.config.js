/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable environment variables
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  },

  // Optimize images
  images: {
    domains: [],
    unoptimized: true, // For development
  },

  // Webpack configuration
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
}

module.exports = nextConfig