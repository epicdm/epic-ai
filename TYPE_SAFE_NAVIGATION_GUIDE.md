# Type-Safe Navigation System - Developer Guide

**Epic AI Routing System**
**Date**: 2026-01-17
**Status**: ✅ Production Ready

---

## Overview

Epic AI now has a **fully type-safe navigation system** powered by a centralized route configuration. TypeScript will catch navigation errors at compile-time, preventing broken links and invalid routes from reaching production.

---

## Quick Start

### 1. Type-Safe Link Component

Use `TypedLink` instead of Next.js `Link` for compile-time route validation:

```tsx
import { TypedLink } from "@/components/ui/typed-link";

export function MyComponent() {
  return (
    <div>
      {/* ✅ Valid route - compiles successfully */}
      <TypedLink href="/dashboard/content">
        Go to Content
      </TypedLink>

      {/* ❌ Invalid route - TypeScript error! */}
      <TypedLink href="/invalid/route">
        Broken Link
      </TypedLink>
    </div>
  );
}
```

### 2. Type-Safe Router Hook

Use `useTypedRouter()` for programmatic navigation:

```tsx
import { useTypedRouter } from "@/hooks/use-typed-router";

export function MyComponent() {
  const router = useTypedRouter();

  const handleClick = () => {
    // ✅ Valid route - compiles successfully
    router.push("/dashboard/analytics");

    // ❌ Invalid route - TypeScript error!
    router.push("/wrong/path");
  };

  return <button onClick={handleClick}>Navigate</button>;
}
```

### 3. Direct Route Config Access

For advanced use cases, import types and utilities directly:

```tsx
import {
  type RoutePath,
  type RouteId,
  getTypedRoute,
  isValidRoute,
} from "@/lib/routes/route-config";

// Get route metadata
const route = getTypedRoute("/dashboard/content");
console.log(route?.name); // "Content"
console.log(route?.icon); // FileText icon component

// Validate route at runtime
if (isValidRoute(userInput)) {
  router.push(userInput); // Safe!
}
```

---

## Available Types

### `RoutePath`

Union type of all valid route paths:

```typescript
type RoutePath =
  | "/dashboard"
  | "/dashboard/brand"
  | "/dashboard/content"
  | "/dashboard/analytics"
  // ... all 44+ routes
```

**Usage**: Anywhere you need a route path (Link href, router.push, etc.)

### `RouteId`

Union type of all route identifiers:

```typescript
type RouteId =
  | "dashboard"
  | "brand"
  | "content"
  | "analytics"
  // ... all route IDs
```

**Usage**: When looking up routes by ID instead of path

### `RouteConfig`

Full route configuration interface:

```typescript
interface RouteConfig {
  id: string;
  name: string;
  href: string;
  icon?: LucideIcon;
  parent?: string;
  children?: RouteConfig[];
  section?: "understand" | "create" | "distribute" | "learn" | "automate" | "settings";
  auth: {
    required: boolean;
    onboardingRequired: boolean;
    roles?: string[];
  };
  badge?: string;
  hidden?: boolean;
  isDefault?: boolean;
}
```

---

## Utility Functions

### `getTypedRoute(path: RoutePath)`

Get route configuration by path with type safety:

```typescript
const route = getTypedRoute("/dashboard/content");
// Returns: RouteConfig | undefined

if (route) {
  console.log(route.name);    // "Content"
  console.log(route.section); // "create"
}
```

### `getTypedRouteById(id: RouteId)`

Get route configuration by ID with type safety:

```typescript
const route = getTypedRouteById("analytics");
// Returns: RouteConfig | undefined

if (route) {
  console.log(route.href); // "/dashboard/analytics"
}
```

### `isValidRoute(path: string)`

Runtime type guard to check if a string is a valid route:

```typescript
const userInput: string = "/dashboard/content";

if (isValidRoute(userInput)) {
  // TypeScript knows userInput is RoutePath here
  router.push(userInput); // ✅ Type-safe
}
```

### `getBreadcrumbs(path: string)`

Get breadcrumb trail for a route:

```typescript
const crumbs = getBreadcrumbs("/dashboard/content/generate");
// Returns: [
//   { id: "dashboard", name: "Dashboard", href: "/dashboard", ... },
//   { id: "content", name: "Content", href: "/dashboard/content", ... },
//   { id: "content-generate", name: "Generate", href: "/dashboard/content/generate", ... }
// ]
```

---

## Components

### TypedLink

**Location**: `apps/web/src/components/ui/typed-link.tsx`

Type-safe wrapper around Next.js Link component.

**Props**:
- `href: RoutePath` - Must be a valid route (type-checked)
- `children: React.ReactNode` - Link content
- `className?: string` - CSS classes
- All other Next.js `LinkProps` (except href)

**Example**:
```tsx
<TypedLink
  href="/dashboard/analytics"
  className="text-blue-500"
  prefetch={true}
>
  View Analytics
</TypedLink>
```

### Breadcrumbs

**Location**: `apps/web/src/components/layout/breadcrumbs.tsx`

Auto-generated breadcrumb navigation using route config.

**Features**:
- Automatically builds breadcrumb trail from current path
- Shows route icons
- Clickable parent routes
- Non-clickable current page
- Hides on dashboard home page

**Usage**:
```tsx
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export function MyLayout() {
  return (
    <div>
      <Breadcrumbs />
      {/* Auto-generates: Dashboard > Content > Generate */}
    </div>
  );
}
```

Already integrated in: `apps/web/src/components/layout/header.tsx`

---

## Hooks

### useTypedRouter

**Location**: `apps/web/src/hooks/use-typed-router.ts`

Type-safe wrapper around Next.js useRouter hook.

**Methods**:
- `push(href: RoutePath, options?)` - Navigate to route
- `replace(href: RoutePath, options?)` - Replace current route
- `prefetch(href: RoutePath)` - Prefetch route
- `back()` - Go back in history
- `forward()` - Go forward in history
- `refresh()` - Refresh current route

**Example**:
```tsx
"use client";

import { useTypedRouter } from "@/hooks/use-typed-router";

export function NavigationButton() {
  const router = useTypedRouter();

  return (
    <button onClick={() => router.push("/dashboard/analytics")}>
      View Analytics
    </button>
  );
}
```

---

## Adding New Routes

When you add a route to `ROUTE_CONFIG`, you need to update the types:

### Step 1: Add Route to Config

Edit `apps/web/src/lib/routes/route-config.ts`:

```typescript
export const ROUTE_CONFIG: RouteConfig[] = [
  // ... existing routes
  {
    id: "new-feature",
    name: "New Feature",
    href: "/dashboard/new-feature",
    icon: Sparkles,
    section: "create",
    auth: { required: true, onboardingRequired: true },
  },
];
```

### Step 2: Update Types

In the same file, add to `RoutePath` type:

```typescript
export type RoutePath =
  | "/dashboard"
  | "/dashboard/content"
  | "/dashboard/new-feature"  // ← Add this
  // ... other routes
```

And to `RouteId` type:

```typescript
export type RouteId =
  | "dashboard"
  | "content"
  | "new-feature"  // ← Add this
  // ... other IDs
```

### Step 3: Create the Page

```typescript
// apps/web/src/app/(dashboard)/dashboard/new-feature/page.tsx
export default async function NewFeaturePage() {
  return <div>New Feature Content</div>;
}
```

**That's it!** TypeScript now enforces the new route everywhere.

---

## Migration Guide

### Migrating Existing Components

**Before** (untyped):
```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

export function MyComponent() {
  const router = useRouter();

  return (
    <div>
      <Link href="/dashboard/content">Content</Link>
      <button onClick={() => router.push("/dashboard/analytics")}>
        Analytics
      </button>
    </div>
  );
}
```

**After** (type-safe):
```tsx
import { TypedLink } from "@/components/ui/typed-link";
import { useTypedRouter } from "@/hooks/use-typed-router";

export function MyComponent() {
  const router = useTypedRouter();

  return (
    <div>
      <TypedLink href="/dashboard/content">Content</TypedLink>
      <button onClick={() => router.push("/dashboard/analytics")}>
        Analytics
      </button>
    </div>
  );
}
```

**Benefits**:
- TypeScript catches typos at compile-time
- IDE autocomplete for all routes
- Refactoring routes updates all references
- No broken links in production

---

## Best Practices

### ✅ DO

1. **Use `TypedLink` for all navigation links**
   ```tsx
   <TypedLink href="/dashboard/content">Content</TypedLink>
   ```

2. **Use `useTypedRouter` for programmatic navigation**
   ```tsx
   const router = useTypedRouter();
   router.push("/dashboard/analytics");
   ```

3. **Use `isValidRoute` before dynamic navigation**
   ```tsx
   if (isValidRoute(userInput)) {
     router.push(userInput);
   }
   ```

4. **Update types when adding routes**
   - Add to `ROUTE_CONFIG`
   - Add to `RoutePath` type
   - Add to `RouteId` type

### ❌ DON'T

1. **Don't use raw Next.js Link with string literals**
   ```tsx
   // ❌ No type safety
   <Link href="/dashboard/content">Content</Link>
   ```

2. **Don't use useRouter with hardcoded strings**
   ```tsx
   // ❌ No type safety
   const router = useRouter();
   router.push("/dashboard/content");
   ```

3. **Don't navigate to routes not in config**
   ```tsx
   // ❌ Will cause TypeScript error (good!)
   <TypedLink href="/non-existent-route">Broken</TypedLink>
   ```

4. **Don't forget to update types after adding routes**
   - Always update both `RoutePath` and `RouteId`

---

## Error Examples

### Common TypeScript Errors

**Error 1: Invalid Route Path**
```typescript
<TypedLink href="/invalid/route">
//             ^^^^^^^^^^^^^^^^^
// Error: Type '"/invalid/route"' is not assignable to type 'RoutePath'
```

**Fix**: Use a valid route from `RoutePath` or add it to the config.

**Error 2: Missing Type Update**
```typescript
// Added route to ROUTE_CONFIG but forgot to update RoutePath type
router.push("/dashboard/new-feature");
//          ^^^^^^^^^^^^^^^^^^^^^^^^^^
// Error: Argument of type '"/dashboard/new-feature"' is not assignable
```

**Fix**: Add the route to the `RoutePath` union type.

**Error 3: Wrong Type Parameter**
```typescript
const route = getTypedRoute("/wrong/path");
//                          ^^^^^^^^^^^^^^
// Error: Argument is not assignable to parameter of type 'RoutePath'
```

**Fix**: Use a valid route path or check spelling.

---

## Testing

### Type-Safe Navigation in Tests

```typescript
import { isValidRoute, getTypedRoute } from "@/lib/routes/route-config";

describe("Navigation", () => {
  it("should validate routes", () => {
    expect(isValidRoute("/dashboard/content")).toBe(true);
    expect(isValidRoute("/invalid/route")).toBe(false);
  });

  it("should get route config", () => {
    const route = getTypedRoute("/dashboard/content");
    expect(route?.name).toBe("Content");
    expect(route?.section).toBe("create");
  });
});
```

---

## Performance

The type system has **zero runtime overhead**:

- Types are erased at compile-time
- Helper functions use efficient lookups
- Route config is a static constant
- No additional network requests
- Same performance as regular Next.js navigation

---

## IDE Support

### VS Code Autocomplete

When typing `href=` in `TypedLink`, VS Code will show all valid routes:

```tsx
<TypedLink href="|">
              ↑ Press Ctrl+Space to see all 44+ routes
</TypedLink>
```

### IntelliSense Documentation

Hover over route config items to see full documentation:

```tsx
const route = getTypedRoute("/dashboard/content");
//    ↑ Hover to see: RouteConfig | undefined
```

---

## Troubleshooting

### Issue: TypeScript errors after adding route

**Solution**: Ensure you updated both:
1. `ROUTE_CONFIG` array
2. `RoutePath` type
3. `RouteId` type

### Issue: Route shows in app but TypeScript errors persist

**Solution**: Restart TypeScript server in VS Code:
1. Cmd/Ctrl + Shift + P
2. "TypeScript: Restart TS Server"

### Issue: Old routes still showing in autocomplete

**Solution**: Clear Next.js cache:
```bash
rm -rf .next
pnpm build
```

---

## Summary

Epic AI's type-safe navigation system provides:

✅ **Compile-time safety** - Catch broken links before deployment
✅ **IDE autocomplete** - All routes available in IntelliSense
✅ **Centralized config** - Single source of truth for routes
✅ **Zero runtime cost** - Types erased at compile-time
✅ **Easy migration** - Drop-in replacements for Link/useRouter
✅ **Future-proof** - Easy to add/modify routes safely

---

## Resources

- **Route Config**: `apps/web/src/lib/routes/route-config.ts`
- **TypedLink Component**: `apps/web/src/components/ui/typed-link.tsx`
- **useTypedRouter Hook**: `apps/web/src/hooks/use-typed-router.ts`
- **Breadcrumbs Component**: `apps/web/src/components/layout/breadcrumbs.tsx`

---

**Questions?** Check the route config file for examples or search the codebase for `TypedLink` usage patterns.
