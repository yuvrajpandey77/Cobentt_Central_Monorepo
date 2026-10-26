import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Public routes that do NOT require Clerk authentication.
 *
 * SECURITY POLICY:
 * - Only truly public pages (marketing, docs, auth) are public.
 * - ALL API routes require authentication by default.
 * - Exception: /api/inngest is public but verified by Inngest signing key.
 *   The serve() function in route.ts validates requests using INNGEST_SIGNING_KEY.
 */
const isPublicRoute = createRouteMatcher([
    "/",
    "/overview(.*)",
    "/contact(.*)",
    "/docs(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    // Shared chat links are public, but data is token-gated server-side
    "/p(.*)",
    // Inngest is public but has its own signing key verification
    "/api/inngest(.*)",
    // Razorpay webhook is public but verified by HMAC signature
    "/api/razorpay/webhook",
    // Server-to-server (Rust API). Public to Clerk, but every request must carry a valid HMAC signature (see lib/internal-auth.ts).
    "/api/internal/wallet/(.*)",
    // tRPC handles its own auth via protectedProcedure middleware
    "/api/trpc(.*)",
    // Health check is public (no sensitive data exposed)
    "/api/health",
    // Public price list read by the mobile app before sign-in. Carries no user data.
    "/api/billing/catalog",
]);


export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      try {
        await auth.protect();
      } catch (err) {
        if (req.nextUrl.pathname.startsWith("/api/")) {
          // Clerk signals "not signed in" on non-document requests by throwing
          // Next's notFound() control-flow error, not a real outage. Never
          // report that as 503 — clients must see a retryable-auth signal.
          const digest =
            typeof err === "object" && err !== null && "digest" in err
              ? String((err as { digest?: unknown }).digest)
              : "";
          const message = err instanceof Error ? err.message : "";
          if (digest.startsWith("NEXT_") || message.startsWith("NEXT_")) {
            return NextResponse.json(
              { error: "Unauthorized", code: "UNAUTHORIZED" },
              { status: 401 },
            );
          }
          // Real Clerk failure (network, key mismatch, ...).
          console.error("[middleware] auth.protect() failed:", err instanceof Error ? err.message : err);
          return NextResponse.json(
            { error: "Authentication service unavailable. Retry in a moment.", code: "AUTH_UNAVAILABLE" },
            { status: 503 }
          );
        }
        throw err;
      }
    }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
