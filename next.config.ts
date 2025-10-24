import type { NextConfig } from "next";

// Ensure Turbopack uses the project root (not the user profile dir)
// to avoid the multiple lockfiles root mis-detection warning

const nextConfig: NextConfig = {
  /* config options here */
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
};

export default nextConfig;
