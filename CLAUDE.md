# Epic AI - Claude Code Instructions

## Project Overview

Epic AI is a unified AI marketing platform combining:
1. **Social Media Management** - Powered by Postiz integration
2. **Voice AI Agents** - Powered by LiveKit + OpenAI + Deepgram
3. **Unified Lead Management** - All leads from all channels
4. **Flywheel Automations** - Social → Voice → Leads → Social loop

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS, HeroUI
- **State**: Zustand, React Query
- **Forms**: React Hook Form + Zod

### Backend
- **API**: Next.js API Routes (primary)
- **Voice Service**: Python Flask (separate service)
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis (Upstash)
- **Storage**: S3-compatible (Cloudflare R2)

### Infrastructure
- **Monorepo**: Turborepo + pnpm workspaces
- **Hosting**: Vercel (frontend), Render (backend/database)
- **Voice**: LiveKit Cloud

## Project Structure
```
epic-ai/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Utilities, configs
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── types/          # TypeScript types
│   │   └── ...
│   └── voice-service/          # Python voice backend
│       ├── api/                # Flask routes
│       ├── agents/             # Agent runtime
│       └── ...
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── shared/                 # Shared types & utils
│   └── ui/                     # Shared UI components
└── docs/                       # Documentation
```

## Coding Standards

### TypeScript
- Use strict TypeScript - no `any` types unless absolutely necessary
- Define interfaces/types for all data structures
- Use Zod for runtime validation
- Prefer `const` over `let`, never use `var`

### React/Next.js
- Use functional components with hooks
- Use Server Components by default, Client Components only when needed
- Mark client components with `"use client"` directive
- Use `@/` alias for imports from `src/`
- Colocate components with their pages when page-specific

### File Naming
- Components: PascalCase (`UserProfile.tsx`)
- Utilities/hooks: camelCase (`useAuth.ts`, `formatDate.ts`)
- Pages: lowercase with dashes (`user-profile/page.tsx`)
- Constants: SCREAMING_SNAKE_CASE for values

### Component Structure
```tsx
// 1. Imports
import { useState } from "react";
import { Button } from "@heroui/react";

// 2. Types
interface Props {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: Props) {
  // 3a. Hooks
  const [state, setState] = useState("");
  
  // 3b. Handlers
  const handleClick = () => {
    onSubmit();
  };
  
  // 3c. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onPress={handleClick}>Submit</Button>
    </div>
  );
}
```

### API Routes (Next.js)
```tsx
// Use Route Handlers in app/api/
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.user.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
```

### Database (Prisma)
- Use the shared `@epic-ai/database` package
- Import prisma client: `import { prisma } from "@epic-ai/database"`
- Use transactions for multi-step operations
- Always handle errors appropriately

### Styling
- Use Tailwind CSS utility classes
- Use HeroUI components when available
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design

## Common Patterns

### Authentication Check
```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  return <div>Protected content</div>;
}
```

### Data Fetching (Server Component)
```tsx
import { prisma } from "@epic-ai/database";

export default async function UsersPage() {
  const users = await prisma.user.findMany();
  return <UserList users={users} />;
}
```

### Form Handling
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = async (data: FormData) => {
    // Handle submit
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

## Environment Variables

Required variables are defined in `.env.example`. Copy to `.env.local` for development.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth encryption key
- `NEXTAUTH_URL` - App URL for auth callbacks
- `OPENAI_API_KEY` - For AI features

## Commands
```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all apps

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Specific apps
pnpm --filter web dev           # Run only web app
pnpm --filter @epic-ai/database generate  # Generate only database
```

## Current Phase

We are in **Phase 1: Foundation** (Weeks 1-6)
- Setting up monorepo structure
- Implementing authentication
- Building core entities (orgs, brands, personas)
- Setting up billing with Stripe

## Key Decisions

1. **Monorepo**: Using Turborepo for build orchestration
2. **Database**: PostgreSQL with Prisma (hosted on Render)
3. **Auth**: NextAuth v5 with email + Google OAuth
4. **UI**: HeroUI component library (Tailwind-based)
5. **Social**: Will integrate Postiz (open-source)
6. **Voice**: Will port from existing ai.epic.dm codebase

## DO's and DON'Ts

### DO:
- ✅ Write clean, readable code with comments for complex logic
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Use TypeScript strictly - define all types
- ✅ Follow the existing patterns in the codebase
- ✅ Create reusable components in packages/ui
- ✅ Use environment variables for secrets
- ✅ Write meaningful commit messages

### DON'T:
- ❌ Use `any` type without good reason
- ❌ Hardcode secrets or API keys
- ❌ Skip error handling
- ❌ Create deeply nested component structures
- ❌ Mix concerns (keep components focused)
- ❌ Ignore TypeScript errors
- ❌ Leave console.logs in production code

## When Stuck

1. Check existing similar code in the project
2. Refer to documentation:
   - Next.js: https://nextjs.org/docs
   - Prisma: https://prisma.io/docs
   - HeroUI: https://heroui.com
   - Tailwind: https://tailwindcss.com/docs
3. Ask for clarification before making assumptions

## Contact

This project is managed by the Epic AI team.
- GitHub: github.com/epicdm/epic-ai
- Domain: leads.epic.dm
EOFcat > CLAUDE.md << 'EOF'
# Epic AI - Claude Code Instructions

## Project Overview

Epic AI is a unified AI marketing platform combining:
1. **Social Media Management** - Powered by Postiz integration
2. **Voice AI Agents** - Powered by LiveKit + OpenAI + Deepgram
3. **Unified Lead Management** - All leads from all channels
4. **Flywheel Automations** - Social → Voice → Leads → Social loop

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS, HeroUI
- **State**: Zustand, React Query
- **Forms**: React Hook Form + Zod

### Backend
- **API**: Next.js API Routes (primary)
- **Voice Service**: Python Flask (separate service)
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis (Upstash)
- **Storage**: S3-compatible (Cloudflare R2)

### Infrastructure
- **Monorepo**: Turborepo + pnpm workspaces
- **Hosting**: Vercel (frontend), Render (backend/database)
- **Voice**: LiveKit Cloud

## Project Structure
```
epic-ai/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Utilities, configs
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── types/          # TypeScript types
│   │   └── ...
│   └── voice-service/          # Python voice backend
│       ├── api/                # Flask routes
│       ├── agents/             # Agent runtime
│       └── ...
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── shared/                 # Shared types & utils
│   └── ui/                     # Shared UI components
└── docs/                       # Documentation
```

## Coding Standards

### TypeScript
- Use strict TypeScript - no `any` types unless absolutely necessary
- Define interfaces/types for all data structures
- Use Zod for runtime validation
- Prefer `const` over `let`, never use `var`

### React/Next.js
- Use functional components with hooks
- Use Server Components by default, Client Components only when needed
- Mark client components with `"use client"` directive
- Use `@/` alias for imports from `src/`
- Colocate components with their pages when page-specific

### File Naming
- Components: PascalCase (`UserProfile.tsx`)
- Utilities/hooks: camelCase (`useAuth.ts`, `formatDate.ts`)
- Pages: lowercase with dashes (`user-profile/page.tsx`)
- Constants: SCREAMING_SNAKE_CASE for values

### Component Structure
```tsx
// 1. Imports
import { useState } from "react";
import { Button } from "@heroui/react";

// 2. Types
interface Props {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: Props) {
  // 3a. Hooks
  const [state, setState] = useState("");
  
  // 3b. Handlers
  const handleClick = () => {
    onSubmit();
  };
  
  // 3c. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onPress={handleClick}>Submit</Button>
    </div>
  );
}
```

### API Routes (Next.js)
```tsx
// Use Route Handlers in app/api/
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.user.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
```

### Database (Prisma)
- Use the shared `@epic-ai/database` package
- Import prisma client: `import { prisma } from "@epic-ai/database"`
- Use transactions for multi-step operations
- Always handle errors appropriately

### Styling
- Use Tailwind CSS utility classes
- Use HeroUI components when available
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design

## Common Patterns

### Authentication Check
```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  return <div>Protected content</div>;
}
```

### Data Fetching (Server Component)
```tsx
import { prisma } from "@epic-ai/database";

export default async function UsersPage() {
  const users = await prisma.user.findMany();
  return <UserList users={users} />;
}
```

### Form Handling
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = async (data: FormData) => {
    // Handle submit
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

## Environment Variables

Required variables are defined in `.env.example`. Copy to `.env.local` for development.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth encryption key
- `NEXTAUTH_URL` - App URL for auth callbacks
- `OPENAI_API_KEY` - For AI features

## Commands
```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all apps

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Specific apps
pnpm --filter web dev           # Run only web app
pnpm --filter @epic-ai/database generate  # Generate only database
```

## Current Phase

We are in **Phase 1: Foundation** (Weeks 1-6)
- Setting up monorepo structure
- Implementing authentication
- Building core entities (orgs, brands, personas)
- Setting up billing with Stripe

## Key Decisions

1. **Monorepo**: Using Turborepo for build orchestration
2. **Database**: PostgreSQL with Prisma (hosted on Render)
3. **Auth**: NextAuth v5 with email + Google OAuth
4. **UI**: HeroUI component library (Tailwind-based)
5. **Social**: Will integrate Postiz (open-source)
6. **Voice**: Will port from existing ai.epic.dm codebase

## DO's and DON'Ts

### DO:
- ✅ Write clean, readable code with comments for complex logic
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Use TypeScript strictly - define all types
- ✅ Follow the existing patterns in the codebase
- ✅ Create reusable components in packages/ui
- ✅ Use environment variables for secrets
- ✅ Write meaningful commit messages

### DON'T:
- ❌ Use `any` type without good reason
- ❌ Hardcode secrets or API keys
- ❌ Skip error handling
- ❌ Create deeply nested component structures
- ❌ Mix concerns (keep components focused)
- ❌ Ignore TypeScript errors
- ❌ Leave console.logs in production code

## When Stuck

1. Check existing similar code in the project
2. Refer to documentation:
   - Next.js: https://nextjs.org/docs
   - Prisma: https://prisma.io/docs
   - HeroUI: https://heroui.com
   - Tailwind: https://tailwindcss.com/docs
3. Ask for clarification before making assumptions

## Contact

This project is managed by the Epic AI team.
- GitHub: github.com/epicdm/epic-ai
- Domain: leads.epic.dm
EOFcat > CLAUDE.md << 'EOF'
# Epic AI - Claude Code Instructions

## Project Overview

Epic AI is a unified AI marketing platform combining:
1. **Social Media Management** - Powered by Postiz integration
2. **Voice AI Agents** - Powered by LiveKit + OpenAI + Deepgram
3. **Unified Lead Management** - All leads from all channels
4. **Flywheel Automations** - Social → Voice → Leads → Social loop

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS, HeroUI
- **State**: Zustand, React Query
- **Forms**: React Hook Form + Zod

### Backend
- **API**: Next.js API Routes (primary)
- **Voice Service**: Python Flask (separate service)
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis (Upstash)
- **Storage**: S3-compatible (Cloudflare R2)

### Infrastructure
- **Monorepo**: Turborepo + pnpm workspaces
- **Hosting**: Vercel (frontend), Render (backend/database)
- **Voice**: LiveKit Cloud

## Project Structure
```
epic-ai/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App router pages
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Utilities, configs
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── types/          # TypeScript types
│   │   └── ...
│   └── voice-service/          # Python voice backend
│       ├── api/                # Flask routes
│       ├── agents/             # Agent runtime
│       └── ...
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── shared/                 # Shared types & utils
│   └── ui/                     # Shared UI components
└── docs/                       # Documentation
```

## Coding Standards

### TypeScript
- Use strict TypeScript - no `any` types unless absolutely necessary
- Define interfaces/types for all data structures
- Use Zod for runtime validation
- Prefer `const` over `let`, never use `var`

### React/Next.js
- Use functional components with hooks
- Use Server Components by default, Client Components only when needed
- Mark client components with `"use client"` directive
- Use `@/` alias for imports from `src/`
- Colocate components with their pages when page-specific

### File Naming
- Components: PascalCase (`UserProfile.tsx`)
- Utilities/hooks: camelCase (`useAuth.ts`, `formatDate.ts`)
- Pages: lowercase with dashes (`user-profile/page.tsx`)
- Constants: SCREAMING_SNAKE_CASE for values

### Component Structure
```tsx
// 1. Imports
import { useState } from "react";
import { Button } from "@heroui/react";

// 2. Types
interface Props {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: Props) {
  // 3a. Hooks
  const [state, setState] = useState("");
  
  // 3b. Handlers
  const handleClick = () => {
    onSubmit();
  };
  
  // 3c. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onPress={handleClick}>Submit</Button>
    </div>
  );
}
```

### API Routes (Next.js)
```tsx
// Use Route Handlers in app/api/
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.user.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}
```

### Database (Prisma)
- Use the shared `@epic-ai/database` package
- Import prisma client: `import { prisma } from "@epic-ai/database"`
- Use transactions for multi-step operations
- Always handle errors appropriately

### Styling
- Use Tailwind CSS utility classes
- Use HeroUI components when available
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design

## Common Patterns

### Authentication Check
```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect("/login");
  
  return <div>Protected content</div>;
}
```

### Data Fetching (Server Component)
```tsx
import { prisma } from "@epic-ai/database";

export default async function UsersPage() {
  const users = await prisma.user.findMany();
  return <UserList users={users} />;
}
```

### Form Handling
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const onSubmit = async (data: FormData) => {
    // Handle submit
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

## Environment Variables

Required variables are defined in `.env.example`. Copy to `.env.local` for development.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth encryption key
- `NEXTAUTH_URL` - App URL for auth callbacks
- `OPENAI_API_KEY` - For AI features

## Commands
```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all apps

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio

# Specific apps
pnpm --filter web dev           # Run only web app
pnpm --filter @epic-ai/database generate  # Generate only database
```

## Current Phase

We are in **Phase 1: Foundation** (Weeks 1-6)
- Setting up monorepo structure
- Implementing authentication
- Building core entities (orgs, brands, personas)
- Setting up billing with Stripe

## Key Decisions

1. **Monorepo**: Using Turborepo for build orchestration
2. **Database**: PostgreSQL with Prisma (hosted on Render)
3. **Auth**: NextAuth v5 with email + Google OAuth
4. **UI**: HeroUI component library (Tailwind-based)
5. **Social**: Will integrate Postiz (open-source)
6. **Voice**: Will port from existing ai.epic.dm codebase

## DO's and DON'Ts

### DO:
- ✅ Write clean, readable code with comments for complex logic
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Use TypeScript strictly - define all types
- ✅ Follow the existing patterns in the codebase
- ✅ Create reusable components in packages/ui
- ✅ Use environment variables for secrets
- ✅ Write meaningful commit messages

### DON'T:
- ❌ Use `any` type without good reason
- ❌ Hardcode secrets or API keys
- ❌ Skip error handling
- ❌ Create deeply nested component structures
- ❌ Mix concerns (keep components focused)
- ❌ Ignore TypeScript errors
- ❌ Leave console.logs in production code

## When Stuck

1. Check existing similar code in the project
2. Refer to documentation:
   - Next.js: https://nextjs.org/docs
   - Prisma: https://prisma.io/docs
   - HeroUI: https://heroui.com
   - Tailwind: https://tailwindcss.com/docs
3. Ask for clarification before making assumptions

## Contact

This project is managed by the Epic AI team.
- GitHub: github.com/epicdm/epic-ai
- Domain: leads.epic.dm
