import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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
    "/sign-in(.*)",
    "/sign-up(.*)",
    // Inngest is public but has its own signing key verification
    "/api/inngest(.*)",
    // Razorpay webhook is public but verified by HMAC signature
    "/api/razorpay/webhook",
    // tRPC handles its own auth via protectedProcedure middleware
    "/api/trpc(.*)",
    // Health check is public (no sensitive data exposed)
    "/api/health",
]);


export default clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
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
