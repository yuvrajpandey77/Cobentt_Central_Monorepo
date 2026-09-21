import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import superjson from 'superjson';
import { auth } from '@clerk/nextjs/server';

/**
 * tRPC context — must NEVER throw.
 *
 * In production, `auth()` throws when Clerk keys are missing/mismatched
 * (e.g. dev keys deployed to prod). If we let that propagate, Next renders
 * an HTML 500 page for /api/trpc and the client fails with
 * `Unexpected token '<', "<!DOCTYPE"...`. Instead return an unauthenticated
 * context so `protectedProcedure` yields a clean UNAUTHORIZED JSON error.
 */
export const createTRPCContext = cache(async () => {
  try {
    return { auth: await auth() };
  } catch (err) {
    console.error("[trpc] auth() failed — returning unauthenticated context:", err instanceof Error ? err.message : err);
    return { auth: { userId: null } as unknown as Awaited<ReturnType<typeof auth>> };
  }
});
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
    transformer: superjson,
});

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" , message: "You must be logged in to access this resource" });
  }

  return next({ ctx: {
    auth: ctx.auth,
  } });
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);