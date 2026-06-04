/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongodb"],
  eslint: {
    // During builds, ignore ESLint errors to avoid version conflicts
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
