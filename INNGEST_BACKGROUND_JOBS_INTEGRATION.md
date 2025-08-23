# Inngest Background Jobs Integration Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture Overview](#architecture-overview)
3. [Setup Steps](#setup-steps)
4. [Code Structure & Implementation](#code-structure--implementation)
5. [How Everything Connects](#how-everything-connects)
6. [Background Job Workflows](#background-job-workflows)
7. [Benefits & Advantages](#benefits--advantages)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## 🎯 Overview

This project integrates **Inngest** (background job orchestration platform) with **tRPC** and **Next.js** to create a robust, scalable background job system. The integration provides:

- **Reliable background job execution** with automatic retries
- **Event-driven architecture** for decoupled job processing
- **Real-time job monitoring** and observability
- **Scalable job queuing** and processing
- **Integration with tRPC** for type-safe job invocation

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │   tRPC API      │    │   Inngest      │
│   (React)      │◄──►│   (Next.js)     │◄──►│   (Background)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Trigger    │    │   Job Queue     │    │   Job Execution │
│   (Button)      │    │   (Event Bus)   │    │   (Functions)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components:
- **Inngest Client**: Manages job events and execution
- **Background Functions**: Define job logic and workflows
- **tRPC Integration**: Type-safe job invocation from frontend
- **Event System**: Decoupled job triggering and execution
- **Job Monitoring**: Real-time visibility into job status

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
npm install inngest
```

### 2. Create Inngest Infrastructure
- **`src/inngest/client.ts`**: Initialize Inngest client
- **`src/inngest/functions.ts`**: Define background job functions

### 3. Configure API Routes
- **`src/app/api/inngest/route.ts`**: Inngest webhook handler

### 4. Integrate with tRPC
- **`src/trpc/routers/_app.ts`**: Add job invocation procedures

### 5. Update Frontend Components
- **`src/app/page.tsx`**: Add job triggering UI
- **`src/app/layout.tsx`**: Ensure proper provider setup

## 📁 Code Structure & Implementation

### 1. Inngest Client (`src/inngest/client.ts`)

```typescript
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "COGERPHERE_BETA0.1" });
```

**What this does:**
- Initializes the Inngest client with a unique project ID
- Manages event publishing and job execution
- Provides the foundation for background job orchestration
- Enables job monitoring and observability

### 2. Background Job Functions (`src/inngest/functions.ts`)

```typescript
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "10s");
    return { message: `Hello ${event.data.email}!` };
  },
);
```

**What this does:**
- Defines a background job function with unique identifier
- Listens for specific events (`test/hello.world`)
- Implements job logic with step-based execution
- Uses `step.sleep` for controlled timing and observability
- Returns job results for monitoring and debugging

### 3. API Route Handler (`src/app/api/inngest/route.ts`)

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { helloWorld } from "@/inngest/functions";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    /* your functions will be passed here later! */
  ],
});
```

**What this does:**
- Creates HTTP endpoints for Inngest webhook handling
- Registers background job functions with the Inngest runtime
- Handles job execution requests from the Inngest platform
- Provides the bridge between Inngest and your Next.js app

### 4. tRPC Integration (`src/trpc/routers/_app.ts`)

```typescript
import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { inngest } from '@/inngest/client';

export const appRouter = createTRPCRouter({
  invoke: baseProcedure
    .input(z.object({
      text: z.string(),
    }))
    .mutation(async ({input}) => {
      await inngest.send({
        name: "hello-world",
        data: {
          email: input.text,
        },
      });
      return {
       ok: "success"
      };
    }),
  // ... existing procedures
});
```

**What this does:**
- Adds a new `invoke` mutation to trigger background jobs
- Uses Zod for input validation
- Sends events to Inngest for job execution
- Provides immediate feedback to the frontend
- Maintains type safety throughout the job invocation process

### 5. Frontend Integration (`src/app/page.tsx`)

```typescript
"use client";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const Page = () => {
  const trpc = useTRPC();
  const invoke = useMutation(trpc.invoke.mutationOptions({
    onSuccess: () => {
      toast.success("Background job started");
    },
  }));
  
  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Button 
        disabled={invoke.isPending} 
        onClick={() => invoke.mutate({text: "Test"})}
      >
        Invoke
      </Button>
    </div>
  );
};

export default Page;
```

**What this does:**
- Creates a user interface for triggering background jobs
- Uses tRPC mutation for type-safe job invocation
- Integrates with TanStack Query for state management
- Provides user feedback through toast notifications
- Handles loading states during job submission

### 6. Layout Provider (`src/app/layout.tsx`)

```typescript
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TRPCReactProvider>  
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Toaster />
          {children}
        </body>
      </html>
    </TRPCReactProvider>
  );
}
```

**What this does:**
- Ensures tRPC provider wraps the entire application
- Enables background job invocation from any component
- Provides toast notifications for job status updates
- Maintains consistent state management across the app

## 🔗 How Everything Connects

### Data Flow:
1. **User Action**: User clicks "Invoke" button
2. **Frontend Request**: React component calls tRPC mutation
3. **tRPC Processing**: Server validates input and sends Inngest event
4. **Job Queuing**: Inngest receives event and queues the job
5. **Job Execution**: Background function processes the job
6. **User Feedback**: Frontend receives success confirmation
7. **Job Monitoring**: Inngest tracks job progress and status

### Connection Points:
- **`page.tsx`** → **`_app.ts`** (Job triggering)
- **`_app.ts`** → **`client.ts`** (Event publishing)
- **`client.ts`** → **`functions.ts`** (Job execution)
- **`functions.ts`** → **`route.ts`** (Webhook handling)

## ⚙️ Background Job Workflows

### 1. **Event-Driven Architecture**
```typescript
// Job is triggered by events, not direct function calls
await inngest.send({
  name: "hello-world",        // Event name
  data: { email: input.text }, // Event payload
});
```

### 2. **Step-Based Execution**
```typescript
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    // Step 1: Wait for 10 seconds
    await step.sleep("wait-a-moment", "10s");
    
    // Step 2: Process the job
    const result = await step.run("process-data", async () => {
      // Your job logic here
      return { message: `Hello ${event.data.email}!` };
    });
    
    return result;
  },
);
```

### 3. **Job Lifecycle**
```
Event Sent → Job Queued → Job Started → Steps Executed → Job Completed
     ↓           ↓           ↓           ↓           ↓
  Frontend   Inngest    Background   Function    Success/
  Trigger    Queue      Execution    Logic      Failure
```

### 4. **Retry and Error Handling**
```typescript
export const robustJob = inngest.createFunction(
  { 
    id: "robust-job",
    retries: 3, // Automatic retries on failure
  },
  { event: "job/process" },
  async ({ event, step }) => {
    try {
      const result = await step.run("process", async () => {
        // Job logic with potential failures
        return await riskyOperation();
      });
      return result;
    } catch (error) {
      // Inngest automatically retries based on configuration
      throw error;
    }
  },
);
```

## ✨ Benefits & Advantages

### 1. **Reliability**
- Automatic retries on failure
- Persistent job queuing
- Fault-tolerant execution
- Dead letter queue handling

### 2. **Scalability**
- Horizontal scaling of job workers
- Load balancing across instances
- Efficient resource utilization
- Queue-based processing

### 3. **Observability**
- Real-time job monitoring
- Detailed execution logs
- Performance metrics
- Error tracking and debugging

### 4. **Developer Experience**
- Type-safe job definitions
- Step-based execution model
- Built-in retry mechanisms
- Comprehensive monitoring

### 5. **Integration Benefits**
- Seamless tRPC integration
- Event-driven architecture
- Decoupled job processing
- Immediate user feedback

## 🎯 Usage Examples

### Basic Job Definition:
```typescript
export const emailJob = inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event, step }) => {
    const { to, subject, body } = event.data;
    
    await step.run("send-email", async () => {
      return await emailService.send({ to, subject, body });
    });
    
    return { success: true, recipient: to };
  },
);
```

### Complex Workflow:
```typescript
export const orderProcessing = inngest.createFunction(
  { id: "process-order" },
  { event: "order/created" },
  async ({ event, step }) => {
    const { orderId } = event.data;
    
    // Step 1: Validate order
    const order = await step.run("validate-order", async () => {
      return await orderService.validate(orderId);
    });
    
    // Step 2: Process payment
    const payment = await step.run("process-payment", async () => {
      return await paymentService.process(order.total);
    });
    
    // Step 3: Update inventory
    await step.run("update-inventory", async () => {
      return await inventoryService.update(order.items);
    });
    
    // Step 4: Send confirmation
    await step.run("send-confirmation", async () => {
      return await emailService.sendOrderConfirmation(order.email, orderId);
    });
    
    return { orderId, status: "processed", paymentId: payment.id };
  },
);
```

### Job Invocation from tRPC:
```typescript
// In your tRPC router
export const appRouter = createTRPCRouter({
  createOrder: baseProcedure
    .input(z.object({
      items: z.array(z.object({ id: z.string(), quantity: z.number() })),
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      // Create order in database
      const order = await prisma.order.create({
        data: { items: input.items, email: input.email }
      });
      
      // Trigger background processing
      await inngest.send({
        name: "order/created",
        data: { orderId: order.id, ...input }
      });
      
      return { orderId: order.id, status: "processing" };
    }),
});
```

## 🏆 Best Practices

### 1. **Job Design**
- Keep jobs focused and single-purpose
- Use descriptive job IDs and event names
- Implement proper error handling
- Design for idempotency when possible

### 2. **Step Management**
- Use meaningful step names for monitoring
- Group related operations in single steps
- Implement proper error boundaries
- Use step.run for complex operations

### 3. **Event Design**
- Use consistent event naming conventions
- Include all necessary data in event payload
- Avoid sending sensitive information
- Version events for backward compatibility

### 4. **Monitoring and Debugging**
- Implement comprehensive logging
- Use step names for observability
- Monitor job performance metrics
- Set up alerts for failures

### 5. **Error Handling**
- Implement proper retry strategies
- Handle transient vs permanent failures
- Provide meaningful error messages
- Use dead letter queues for failed jobs

## 🚨 Troubleshooting

### Common Issues:

#### 1. **Job Not Executing**
- Check Inngest webhook configuration
- Verify function registration in API route
- Check event name matching
- Review Inngest dashboard for errors

#### 2. **Job Failures**
- Review job execution logs
- Check step-by-step execution
- Verify input data validation
- Review retry configuration

#### 3. **Performance Issues**
- Monitor job execution times
- Check queue depth and processing
- Review resource utilization
- Optimize step execution

#### 4. **Integration Problems**
- Verify tRPC procedure setup
- Check event data structure
- Review Inngest client configuration
- Test event publishing separately

## 🔮 Future Enhancements

### Potential Improvements:
1. **Advanced Scheduling** with cron expressions
2. **Job Dependencies** and workflow orchestration
3. **Batch Processing** for multiple items
4. **Real-time Notifications** for job status
5. **Advanced Retry Strategies** with exponential backoff
6. **Job Templates** for common patterns
7. **Integration with External Services** (Slack, email, etc.)
8. **Custom Metrics** and business KPIs

## 📚 Additional Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [tRPC Mutations](https://trpc.io/docs/react/useMutation)
- [Background Job Patterns](https://www.inngest.com/docs/functions/background-jobs)
- [Step Functions](https://www.inngest.com/docs/functions/step-functions)
- [Error Handling](https://www.inngest.com/docs/functions/error-handling)

---

*This documentation covers the complete Inngest background jobs integration setup. For questions or issues, refer to the official Inngest documentation or create an issue in the project repository.*
