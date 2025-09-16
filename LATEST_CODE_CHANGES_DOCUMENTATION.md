# Cogerphere Experimental v0.1 - Latest Code Changes Documentation

## 📋 Overview

This document provides comprehensive documentation for the latest code changes in the Cogerphere Experimental project. The project is a Next.js-based AI-powered application builder that allows users to create projects and interact with an AI agent to generate applications with live previews.

## 🏗️ Architecture Summary

### Tech Stack
- **Frontend**: Next.js 15.5.0 with React 19.1.0
- **Styling**: Tailwind CSS v4 with Radix UI components
- **State Management**: TanStack Query v5.85.5 with tRPC v11.5.0
- **Database**: PostgreSQL with Prisma ORM v6.14.0
- **Background Jobs**: Inngest v3.40.2
- **Form Handling**: React Hook Form v7.62.0 with Zod validation
- **AI Integration**: OpenAI API with E2B Code Interpreter v2.0.0

### Project Structure
```
src/
├── app/                          # Next.js app directory
│   ├── api/                     # API routes
│   │   ├── inngest/            # Inngest webhook endpoint
│   │   └── trpc/               # tRPC API endpoint
│   ├── projects/[projectId]/   # Dynamic project pages
│   └── layout.tsx              # Root layout
├── components/ui/               # Shadcn UI components
├── modules/                     # Feature modules
│   ├── messages/               # Message handling
│   │   └── server/procedures.ts
│   └── projects/               # Project management
│       ├── server/procedures.ts
│       └── ui/                 # UI components
│           ├── components/     # Reusable components
│           └── views/          # Page views
├── lib/                        # Utilities and database
├── trpc/                       # tRPC configuration
└── inngest/                    # Background job functions
```

## 🆕 Latest Changes Summary

### 1. Message UI Implementation (Branch: `messagesUiDone`)

The latest changes focus on implementing a complete message interface system for project interactions.

#### Key Features Added:
- **Message Container**: Real-time message display with auto-scroll
- **Message Form**: Interactive input with validation and submission
- **Message Cards**: Differentiated display for user and assistant messages
- **Fragment Support**: Code fragment preview and interaction
- **Responsive Layout**: Resizable panels for messages and preview

#### Files Modified/Created:
- `src/modules/projects/ui/components/messages-container.tsx` (NEW)
- `src/modules/projects/ui/components/message-form.tsx` (NEW)
- `src/modules/projects/ui/components/message-card.tsx` (NEW)
- `src/modules/projects/ui/views/project-view.tsx` (NEW)
- `src/modules/messages/server/procedures.ts` (MODIFIED)
- `src/modules/projects/server/procedures.ts` (MODIFIED)

## 🔧 Component Documentation

### 1. MessagesContainer Component

**Location**: `src/modules/projects/ui/components/messages-container.tsx`

**Purpose**: Main container for displaying and managing messages in a project.

**Key Features**:
- Fetches messages using tRPC and TanStack Query
- Auto-scrolls to latest messages
- Integrates MessageForm for new message input
- Handles message fragments and interactions

**Props**:
```typescript
interface Props {
    projectId: string;
}
```

**Key Dependencies**:
- `useTRPC()` - tRPC client for API calls
- `useSuspenseQuery()` - Data fetching with suspense
- `useRef()` - DOM reference for auto-scroll
- `useEffect()` - Side effects for scroll behavior

**Future Modifications**:
- To change scroll behavior: Modify `useEffect` hooks (lines 18-31)
- To add message filtering: Add filter state and modify query
- To change layout: Modify the container structure (lines 34-60)

### 2. MessageForm Component

**Location**: `src/modules/projects/ui/components/message-form.tsx`

**Purpose**: Form component for creating new messages with validation and submission.

**Key Features**:
- Form validation using Zod schema
- Auto-resizing textarea with keyboard shortcuts
- Loading states and error handling
- Integration with tRPC mutations

**Props**:
```typescript
interface Props {
    projectId: string;
}
```

**Form Schema**:
```typescript
const formSchema = z.object({
    value: z.string().min(1).max(10000)
});
```

**Key Dependencies**:
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `react-textarea-autosize` - Auto-resizing textarea
- `@tanstack/react-query` - Mutation handling

**Future Modifications**:
- To change validation rules: Modify `formSchema` (lines 21-23)
- To add new form fields: Update schema and form structure
- To change submission behavior: Modify `onSubmit` function (lines 55-61)
- To customize UI: Modify the form JSX (lines 68-123)

### 3. MessageCard Component

**Location**: `src/modules/projects/ui/components/message-card.tsx`

**Purpose**: Displays individual messages with different layouts for user and assistant messages.

**Key Features**:
- Different rendering for USER vs ASSISTANT messages
- Fragment support for code previews
- Timestamp display with hover effects
- Error state handling

**Props**:
```typescript
interface MessageCardProps {
    content: string;
    role: MessageRole;
    fragments: Fragment | null;
    createdAt: Date;
    isActiveFragment: boolean;
    onFragmentClick: (fragments: Fragment) => void;
    type: MessageType;
}
```

**Sub-components**:
- `UserMessage` - User message display
- `AssistantMessage` - Assistant message with branding
- `FragmentCard` - Code fragment preview

**Future Modifications**:
- To change message styling: Modify component JSX structures
- To add new message types: Extend the conditional rendering logic
- To customize fragments: Modify `FragmentCard` component (lines 30-52)
- To change branding: Update logo and styling in `AssistantMessage` (lines 65-92)

### 4. ProjectView Component

**Location**: `src/modules/projects/ui/views/project-view.tsx`

**Purpose**: Main view component that combines messages and preview panels.

**Key Features**:
- Resizable panel layout
- Suspense boundaries for loading states
- Integration of MessagesContainer
- Placeholder for preview functionality

**Props**:
```typescript
interface Props {
    projectId: string;
}
```

**Layout Structure**:
- Left Panel (35%): MessagesContainer
- Right Panel (65%): Preview area (TODO)

**Future Modifications**:
- To change panel sizes: Modify `defaultSize` props (lines 23, 34)
- To add preview functionality: Implement the right panel content
- To change layout direction: Modify `ResizablePanelGroup` direction prop

## 🔌 API Documentation

### 1. Messages Router

**Location**: `src/modules/messages/server/procedures.ts`

**Endpoints**:

#### `getMany`
- **Method**: Query
- **Input**: `{ projectId: string }`
- **Output**: Array of messages with fragments
- **Purpose**: Fetch all messages for a project

#### `create`
- **Method**: Mutation
- **Input**: `{ value: string, projectId: string }`
- **Output**: Created message
- **Purpose**: Create new user message and trigger AI agent

**Future Modifications**:
- To add message filtering: Modify the `where` clause in `getMany`
- To add pagination: Add `skip` and `take` parameters
- To change AI trigger: Modify the Inngest event in `create`

### 2. Projects Router

**Location**: `src/modules/projects/server/procedures.ts`

**Endpoints**:

#### `getOne`
- **Method**: Query
- **Input**: `{ id: string }`
- **Output**: Single project
- **Purpose**: Fetch project details

#### `getMany`
- **Method**: Query
- **Input**: None
- **Output**: Array of projects
- **Purpose**: Fetch all projects

#### `create`
- **Method**: Mutation
- **Input**: `{ value: string }`
- **Output**: Created project
- **Purpose**: Create new project with initial message

**Future Modifications**:
- To add project filtering: Modify `getMany` with additional parameters
- To add project updates: Create `update` mutation
- To add project deletion: Create `delete` mutation

## 🗄️ Database Schema

**Location**: `prisma/schema.prisma`

### Models:

#### Project
```prisma
model Project {
  id        String    @id @default(uuid())
  name      String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}
```

#### Message
```prisma
model Message {
  id        String      @id @default(uuid())
  content   String
  role      MessageRole
  type      MessageType
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  fragments Fragment?
  projectId String
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

#### Fragment
```prisma
model Fragment {
  id         String   @id @default(uuid())
  messageId  String   @unique
  message    Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  sandboxUrl String
  title      String
  files      Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Future Modifications**:
- To add new fields: Modify the respective model in `schema.prisma`
- To add relationships: Add new `@relation` fields
- To change constraints: Modify field attributes
- To run migrations: Use `npx prisma migrate dev`

## 🚀 Background Jobs (Inngest)

**Location**: `src/inngest/functions.ts`

The system uses Inngest for background AI processing:

### Event: `Cogerphereai/runAgent`
- **Triggered by**: Message creation
- **Purpose**: Process user input with AI and generate responses
- **Data**: `{ value: string, projectId: string }`

**Future Modifications**:
- To change AI behavior: Modify the Inngest function
- To add new job types: Create new event handlers
- To change processing logic: Update the function implementation

## 🎨 Styling and UI

### Design System
- **Base**: Tailwind CSS v4
- **Components**: Shadcn UI with Radix UI primitives
- **Icons**: Lucide React
- **Animations**: Framer Motion (available but not heavily used)

### Key Styling Patterns
- Responsive design with mobile-first approach
- Dark mode support via `next-themes`
- Consistent spacing using Tailwind utilities
- Custom animations for smooth interactions

**Future Modifications**:
- To change theme: Modify `tailwind.config.js` and CSS variables
- To add new components: Create in `src/components/ui/`
- To change layouts: Modify component className props

## 🔧 Configuration Files

### 1. Next.js Configuration
**Location**: `next.config.ts`
- Turbopack enabled for faster builds
- Custom configuration for the project

### 2. TypeScript Configuration
**Location**: `tsconfig.json`
- Strict TypeScript settings
- Path aliases configured (`@/` for `src/`)

### 3. Tailwind Configuration
**Location**: `tailwind.config.js` (if exists)
- Custom theme configuration
- Plugin configurations

### 4. Prisma Configuration
**Location**: `prisma/schema.prisma`
- Database connection settings
- Model definitions
- Migration settings

## 🚀 Development Workflow

### Running the Application
```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Database operations
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

### Key Scripts
- `dev`: Start development server with Turbopack
- `build`: Build for production
- `start`: Start production server
- `lint`: Run ESLint

## 🔍 Future Development Guide

### 1. Adding New Features

#### To add a new message type:
1. Update `MessageType` enum in `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev`
3. Update `MessageCard` component to handle new type
4. Update API procedures if needed

#### To add new project fields:
1. Modify `Project` model in `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev`
3. Update tRPC procedures
4. Update UI components

#### To add new API endpoints:
1. Add new procedures in respective router files
2. Update client-side code to use new endpoints
3. Add proper error handling and validation

### 2. Modifying UI Components

#### To change message display:
- **File**: `src/modules/projects/ui/components/message-card.tsx`
- **Lines to modify**: 12-21 (UserMessage), 65-92 (AssistantMessage)

#### To change form behavior:
- **File**: `src/modules/projects/ui/components/message-form.tsx`
- **Lines to modify**: 21-23 (validation), 55-61 (submission)

#### To change layout:
- **File**: `src/modules/projects/ui/views/project-view.tsx`
- **Lines to modify**: 21-42 (panel configuration)

### 3. Database Modifications

#### To add new fields:
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name "add_new_field"`
3. Update generated types
4. Update API procedures

#### To add new relationships:
1. Add foreign key fields in schema
2. Add `@relation` attributes
3. Run migration
4. Update queries to include relations

### 4. API Modifications

#### To add new queries:
1. Add procedure in appropriate router
2. Add input validation with Zod
3. Implement database query
4. Update client-side usage

#### To add new mutations:
1. Add procedure with mutation
2. Add input validation
3. Implement business logic
4. Add error handling
5. Update client-side mutations

## 🐛 Common Issues and Solutions

### 1. TypeScript Errors
- **Issue**: Type mismatches after schema changes
- **Solution**: Run `npx prisma generate` to update types

### 2. Database Connection Issues
- **Issue**: Connection refused or timeout
- **Solution**: Check `DATABASE_URL` in `.env` file

### 3. Build Errors
- **Issue**: Build fails with module resolution errors
- **Solution**: Check import paths and run `npm install`

### 4. Styling Issues
- **Issue**: Styles not applying correctly
- **Solution**: Check Tailwind configuration and class names

## 📊 Performance Considerations

### 1. Database Queries
- Use `select` and `include` to limit data fetching
- Implement pagination for large datasets
- Add database indexes for frequently queried fields

### 2. React Performance
- Use `React.memo` for expensive components
- Implement proper dependency arrays in `useEffect`
- Use `useCallback` and `useMemo` for expensive calculations

### 3. Bundle Size
- Use dynamic imports for large components
- Implement code splitting for routes
- Optimize images and assets

## 🔒 Security Considerations

### 1. Input Validation
- All inputs validated with Zod schemas
- SQL injection prevented by Prisma ORM
- XSS protection via React's built-in escaping

### 2. API Security
- tRPC provides type-safe API calls
- Input validation on all endpoints
- Error handling without sensitive data exposure

### 3. Database Security
- Connection string stored in environment variables
- Cascade deletes properly configured
- No direct SQL queries (Prisma ORM only)

## 📝 Code Standards

### 1. TypeScript
- Strict mode enabled
- All functions and components typed
- Use interfaces over types for object shapes

### 2. React
- Functional components with hooks
- Proper dependency arrays
- Cleanup in useEffect

### 3. Styling
- Tailwind utility classes
- Consistent spacing and sizing
- Responsive design patterns

### 4. File Organization
- Feature-based module structure
- Clear separation of concerns
- Consistent naming conventions

## 🎯 Next Steps

### Immediate Improvements
1. Implement preview functionality in the right panel
2. Add message search and filtering
3. Implement real-time updates with WebSockets
4. Add message editing and deletion

### Long-term Features
1. User authentication and authorization
2. Project sharing and collaboration
3. Advanced AI capabilities
4. Plugin system for extensions
5. Mobile application

## 📞 Support and Maintenance

### Code Maintenance
- Regular dependency updates
- Database migration management
- Performance monitoring
- Error tracking and logging

### Development Guidelines
- Follow established patterns
- Write comprehensive tests
- Document new features
- Maintain code quality standards

---

**Last Updated**: January 2025
**Version**: 0.1.0
**Branch**: messagesUiDone

This documentation should be updated whenever significant changes are made to the codebase. For questions or clarifications, refer to the code comments and inline documentation.
