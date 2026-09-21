import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const handler = (req: Request) =>
  fetchRequestHandler({ 
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ error, path }) => {
      // Server-side log only — the client still gets a clean JSON error.
      // Prevents silent mass-500s with no trace in production logs.
      console.error(`[trpc] ${path ?? "<unknown>"}: ${error.code} — ${error.message}`);
    },
  });
export { handler as GET, handler as POST };