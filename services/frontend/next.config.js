/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  env: {
    // Make these available to the browser
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_GATEWAY_PORT: process.env.NEXT_PUBLIC_API_GATEWAY_PORT,
  },
  webpack: (config, { isServer }) => {
    // Fix for lodash webpack issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "buffer": false,
      "crypto": false,
      "stream": false,
      "util": false,
    };
    
    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'express-validator': false,
        'express': false,
        'cookie-session': false,
        'jsonwebtoken': false,
      };
    }
    
    // Handle __webpack_require__.nmd issue
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/lodash/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
          plugins: []
        }
      }
    });

    return config;
  },
}

module.exports = nextConfig
