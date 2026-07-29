import type { NextConfig } from "next";

// Ensure Turbopack uses the project root (not the user profile dir)
// to avoid the multiple lockfiles root mis-detection warning

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    // Explicitly set the project root so Next doesn't pick the parent folder
    root: process.cwd(),
  },
  // Ensure API routes are treated as dynamic
  output: 'standalone',
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ['@prisma/client'],
  async redirects() {
    return [
      {
        source: '/customDesigns/features',
        destination: '/overview/features',
        permanent: true,
      },
      {
        source: '/customDesigns/pricing',
        destination: '/overview/pricing',
        permanent: true,
      },
      {
        source: '/customDesigns/support',
        destination: '/overview/about',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/overview/privacy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/overview/terms',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/overview/about',
        permanent: true,
      },
      {
        source: '/research',
        destination: '/overview/research',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/overview/about',
        permanent: true,
      },
      {
        source: '/features',
        destination: '/overview/features',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
