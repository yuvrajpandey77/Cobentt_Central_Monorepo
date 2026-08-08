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

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.clerk.com https://*.clerk.accounts.dev https://accounts.google.com https://vercel.live https://*.vercel.live https://challenges.cloudflare.com https://*.protect.clerk.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.accounts.dev https://*.googleusercontent.com",
              "font-src 'self' https://fonts.gstatic.com",
              "worker-src 'self' blob:",
              "connect-src 'self' https://api.clerk.com https://*.clerk.com https://*.clerk.accounts.dev wss://*.clerk.com https://clerk-telemetry.com https://api.openai.com https://api.groq.com https://*.vercel.app https://*.vercel.live https://challenges.cloudflare.com https://*.protect.clerk.com",
              "frame-src 'self' https://js.clerk.com https://*.clerk.accounts.dev https://accounts.google.com https://vercel.live https://*.vercel.live https://challenges.cloudflare.com https://*.protect.clerk.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // API routes: stricter caching
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },

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
