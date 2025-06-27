/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'tesseract.js'],
  },
  webpack: (config, { isServer }) => {
    // Disable webpack caching to prevent ENOENT errors
    config.cache = false;
    
    // Add worker support
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;