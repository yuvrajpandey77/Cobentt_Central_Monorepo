# tRPC + TanStack Query Integration Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Setup Steps](#setup-steps)
4. [Code Structure & Implementation](#code-structure--implementation)
5. [How Everything Connects](#how-everything-connects)
6. [Benefits & Advantages](#benefits--advantages)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## 🎯 Overview

This project integrates **tRPC** (TypeScript-first API framework) with **TanStack Query** (React Query) to create a type-safe, efficient data fetching solution. The integration provides:

- **End-to-end type safety** from database to frontend
- **Automatic caching and synchronization** with TanStack Query
- **Server-side rendering (SSR)** support with hydration
- **Real-time updates** and optimistic mutations
- **Built-in error handling** and loading states

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │   tRPC Client   │    │   tRPC Server   │
│   (React)      │◄──►│   (Browser)     │◄──►│   (API Routes)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ TanStack Query  │    │   HTTP Links    │    │   Prisma DB     │
│   (Cache)       │    │   (Transport)   │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components:
- **tRPC Router**: Defines API endpoints with type-safe procedures
- **tRPC Client**: Handles client-side API calls and caching
- **TanStack Query**: Manages server state, caching, and synchronization
- **Hydration**: Enables SSR with client-side state persistence

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query superjson zod
```

### 2. Create tRPC Server Infrastructure
- **`src/trpc/init.ts`**: Initialize tRPC with transformers and context
- **`src/trpc/routers/_app.ts`**: Define API routes and procedures
- **`src/trpc/server.tsx`**: Server-side tRPC configuration

### 3. Set Up Client Infrastructure
- **`src/trpc/client.tsx`**: Client-side tRPC provider and hooks
- **`src/trpc/query-client.ts`**: TanStack Query configuration

### 4. Configure API Routes
- **`src/app/api/trpc/[trpc]/route.ts`**: tRPC HTTP handler

### 5. Integrate with React Components
- **`src/app/page.tsx`**: Server-side prefetching and hydration
- **`src/app/client.tsx`**: Client-side data consumption

## 📁 Code Structure & Implementation

### 1. tRPC Initialization (`src/trpc/init.ts`)

```typescript
import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import superjson from 'superjson';

// Create cached context for each request
export const createTRPCContext = cache(async () => {
  return { userId: 'user_123' };
});

// Initialize tRPC with superjson transformer
const t = initTRPC.create({
  transformer: superjson, // Handles Date, BigInt, etc.
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
```

**What this does:**
- Sets up tRPC server with proper TypeScript support
- Uses `superjson` for handling complex data types (Date, BigInt, etc.)
- Creates a cached context function for performance
- Exports base procedures for building routers

### 2. API Router Definition (`src/trpc/routers/_app.ts`)

```typescript
import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
  chatai: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
});

export type AppRouter = typeof appRouter;
```

**What this does:**
- Defines the main API router with type-safe procedures
- Uses Zod for runtime input validation
- Creates a `chatai` query endpoint that accepts text input
- Exports TypeScript types for client-side usage

### 3. Server-Side Configuration (`src/trpc/server.tsx`)

```typescript
import 'server-only';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { createTRPCContext } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';

// Cached query client for SSR
export const getQueryClient = cache(makeQueryClient);

// tRPC options proxy for server-side usage
export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

// Direct caller for server-side operations
export const caller = appRouter.createCaller(createTRPCContext);
```

**What this does:**
- Creates a server-only tRPC configuration
- Uses cached query client for consistent SSR behavior
- Provides `trpc` proxy for TanStack Query integration
- Exports direct caller for server-side operations

### 4. Query Client Configuration (`src/trpc/query-client.ts`)

```typescript
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}
```

**What this does:**
- Configures TanStack Query with optimal settings
- Sets stale time to 30 seconds for better caching
- Integrates superjson for data serialization/deserialization
- Ensures pending queries are properly dehydrated for SSR

### 5. Client-Side Provider (`src/trpc/client.tsx`)

```typescript
'use client';
import superjson from 'superjson';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { makeQueryClient } from './query-client';
import type { AppRouter } from './routers/_app';

// Create tRPC context with React Query integration
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// Browser query client management
let browserQueryClient: QueryClient;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient(); // Server: always new client
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient; // Browser: reuse client
}

// Main provider component
export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: getUrl(),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
```

**What this does:**
- Creates a client-side tRPC provider
- Manages query client lifecycle (server vs browser)
- Sets up HTTP batch links for efficient API calls
- Integrates tRPC with TanStack Query
- Exports `useTRPC` hook for component usage

### 6. API Route Handler (`src/app/api/trpc/[trpc]/route.ts`)

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createTRPCContext } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

**What this does:**
- Creates HTTP endpoints for tRPC procedures
- Handles both GET and POST requests
- Integrates with Next.js App Router
- Provides the bridge between client and server

### 7. Server-Side Page (`src/app/page.tsx`)

```typescript
import { Button } from "@/components/ui/button";
import { trpc, getQueryClient } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Client } from "./client";
import { Suspense } from "react";

const Page = async () => {
  const queryClient = getQueryClient();
  
  // Prefetch data on server
  void queryClient.prefetchQuery(trpc.chatai.queryOptions({ text: "Hello" }));
  
  // Dehydrate state for client hydration
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<div>Loading...</div>}>
        <Client />
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;
```

**What this does:**
- Runs on the server during SSR
- Prefetches data using tRPC procedures
- Dehydrates query state for client-side hydration
- Wraps client component with proper boundaries

### 8. Client Component (`src/app/client.tsx`)

```typescript
"use client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export const Client = () => {
  const trpc = useTRPC();
  
  // Use suspense query for immediate data access
  const { data } = useSuspenseQuery(trpc.chatai.queryOptions({ text: "Hello" }));
  
  return (
    <div>
      {JSON.stringify(data)}
    </div>
  );
};
```

**What this does:**
- Runs on the client after hydration
- Uses `useSuspenseQuery` for immediate data access
- Accesses prefetched data from server
- Renders data without loading states

## 🔗 How Everything Connects

### Data Flow:
1. **Server Request**: User visits page
2. **SSR Execution**: `page.tsx` runs on server
3. **Data Prefetching**: Server calls tRPC procedure
4. **State Dehydration**: Query state serialized for client
5. **Client Hydration**: `HydrationBoundary` restores state
6. **Client Rendering**: `Client` component renders with data
7. **Subsequent Requests**: Client uses cached data or fetches new

### Connection Points:
- **`init.ts`** → **`_app.ts`** → **`server.tsx`** (Server setup)
- **`server.tsx`** → **`page.tsx`** (SSR data fetching)
- **`client.tsx`** → **`page.tsx`** (Client hydration)
- **`[trpc]/route.ts`** → **`client.tsx`** (API communication)

## ✨ Benefits & Advantages

### 1. **Type Safety**
- End-to-end TypeScript support
- Compile-time error detection
- Automatic type inference
- No more API contract mismatches

### 2. **Performance**
- Automatic caching with TanStack Query
- Background refetching and synchronization
- Optimistic updates
- Request deduplication and batching

### 3. **Developer Experience**
- IntelliSense support throughout the stack
- Automatic error handling
- Built-in loading states
- Simplified API development

### 4. **SSR Support**
- Server-side data fetching
- Client-side hydration
- SEO-friendly rendering
- Fast initial page loads

### 5. **Real-time Features**
- Automatic background updates
- Optimistic mutations
- Real-time synchronization
- Offline support

## 🎯 Usage Examples

### Basic Query Usage:
```typescript
const { data, isLoading, error } = useQuery(trpc.users.list.queryOptions());
```

### Mutation Usage:
```typescript
const createUser = useMutation({
  mutationFn: trpc.users.create.mutate,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

### Infinite Queries:
```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
  trpc.posts.infinite.queryOptions({
    limit: 10,
  })
);
```

## 🏆 Best Practices

### 1. **Router Organization**
- Group related procedures in separate routers
- Use descriptive procedure names
- Implement proper input validation with Zod
- Handle errors gracefully

### 2. **Query Management**
- Set appropriate stale times
- Use query keys for proper invalidation
- Implement optimistic updates
- Handle loading and error states

### 3. **Performance Optimization**
- Use `select` for data transformation
- Implement proper pagination
- Leverage background refetching
- Optimize bundle size with code splitting

### 4. **Error Handling**
- Implement global error boundaries
- Use proper error types
- Provide user-friendly error messages
- Log errors for debugging

## 🚨 Troubleshooting

### Common Issues:

#### 1. **Hydration Mismatch**
- Ensure server and client render the same content
- Check for browser-specific code in server components
- Verify data serialization/deserialization

#### 2. **Type Errors**
- Regenerate Prisma client after schema changes
- Check tRPC router exports
- Verify import paths and aliases

#### 3. **Performance Issues**
- Monitor query cache size
- Check for unnecessary re-renders
- Optimize query invalidation strategies

#### 4. **Build Errors**
- Ensure all dependencies are installed
- Check TypeScript configuration
- Verify Next.js compatibility

## 🔮 Future Enhancements

### Potential Improvements:
1. **Real-time subscriptions** with WebSockets
2. **Advanced caching strategies** with Redis
3. **Rate limiting** and authentication middleware
4. **API versioning** and backward compatibility
5. **Advanced error handling** with custom error types
6. **Performance monitoring** and analytics

## 📚 Additional Resources

- [tRPC Documentation](https://trpc.io/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zod Validation](https://zod.dev/)
- [SuperJSON](https://github.com/blitz-js/superjson)

---

*This documentation covers the complete tRPC + TanStack Query integration setup. For questions or issues, refer to the official documentation or create an issue in the project repository.*
