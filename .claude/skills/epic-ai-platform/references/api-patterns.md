# API Route Patterns

## File Structure

```
apps/web/src/app/api/
├── dashboard/
│   └── unified/
│       └── route.ts          # GET /api/dashboard/unified
├── brand-brain/
│   ├── route.ts              # GET, POST /api/brand-brain
│   └── [id]/
│       └── route.ts          # GET, PUT, DELETE /api/brand-brain/:id
├── content/
│   ├── generate/
│   │   └── route.ts          # POST /api/content/generate
│   └── schedule/
│       └── route.ts          # POST /api/content/schedule
├── social/
│   └── connect/
│       ├── [platform]/
│       │   ├── route.ts      # GET /api/social/connect/:platform
│       │   └── callback/
│       │       └── route.ts  # GET /api/social/connect/:platform/callback
│       └── disconnect/
│           └── route.ts      # POST /api/social/disconnect
└── voice/
    ├── agents/
    │   └── route.ts          # GET /api/voice/agents
    └── stats/
        └── route.ts          # GET /api/voice/stats
```

## Standard API Route Template

```typescript
// apps/web/src/app/api/[module]/[endpoint]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

// Request validation schema
const requestSchema = z.object({
  field1: z.string(),
  field2: z.number().optional()
});

// GET handler
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse query parameters (optional)
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 10;

    // 3. Database query
    const data = await prisma.model.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" }
    });

    // 4. Return response
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // 3. Database operation
    const result = await prisma.model.create({
      data: {
        userId,
        ...validatedData
      }
    });

    // 4. Return response
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## Dynamic Route Parameters

```typescript
// apps/web/src/app/api/brands/[brandId]/route.ts
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    brandId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId } = await params;

  // Verify ownership
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      userId
    }
  });

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  return NextResponse.json(brand);
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId } = await params;
  const body = await request.json();

  // Verify ownership before update
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId }
  });

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data: body
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { brandId } = await params;

  // Verify ownership before delete
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId }
  });

  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  await prisma.brand.delete({
    where: { id: brandId }
  });

  return NextResponse.json({ success: true });
}
```

## Error Handling Patterns

### Validation Errors (400)

```typescript
import { z } from "zod";

try {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(2)
  });

  const data = schema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      { status: 400 }
    );
  }
}
```

### Not Found (404)

```typescript
const resource = await prisma.model.findUnique({
  where: { id }
});

if (!resource) {
  return NextResponse.json(
    { error: "Resource not found" },
    { status: 404 }
  );
}
```

### Forbidden (403)

```typescript
// Resource exists but user doesn't have access
const resource = await prisma.model.findUnique({
  where: { id }
});

if (resource && resource.userId !== userId) {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 }
  );
}
```

### Rate Limiting (429)

```typescript
import { rateLimiter } from "@/lib/rate-limiter";

const limit = await rateLimiter.check(userId);
if (!limit.success) {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      retryAfter: limit.retryAfter
    },
    { status: 429 }
  );
}
```

## CORS Handling

```typescript
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
```

## Streaming Responses

For real-time data or AI responses:

```typescript
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: body.messages,
          stream: true
        });

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || "";
          controller.enqueue(new TextEncoder().encode(content));
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
}
```

## Background Jobs

For long-running operations:

```typescript
import { Queue } from "bullmq";

const contentQueue = new Queue("content-generation", {
  connection: { host: "redis", port: 6379 }
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Add job to queue
  const job = await contentQueue.add("generate", {
    userId,
    ...body
  });

  return NextResponse.json({
    jobId: job.id,
    status: "queued"
  }, { status: 202 }); // 202 Accepted
}
```

## Webhook Endpoints

```typescript
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const headersList = await headers();
  const signature = headersList.get("x-webhook-signature");

  const body = await request.text();
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const payload = JSON.parse(body);

  // Process webhook
  await processWebhook(payload);

  return NextResponse.json({ received: true });
}
```

## Testing Endpoints

Use curl or tools like Postman/Insomnia:

```bash
# GET request
curl -X GET http://localhost:3000/api/brands \
  -H "Authorization: Bearer $TOKEN"

# POST request
curl -X POST http://localhost:3000/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"topic": "AI trends", "brandId": "123"}'

# PUT request
curl -X PUT http://localhost:3000/api/brands/123 \
  -H "Content-Type: application/json" \
  -d '{"name": "New Brand Name"}'

# DELETE request
curl -X DELETE http://localhost:3000/api/brands/123
```

## Common Pitfalls

1. **Forgetting authentication** - Always check userId first
2. **Not validating input** - Use Zod for all user input
3. **Missing error handling** - Wrap all database ops in try-catch
4. **Exposing sensitive data** - Never return tokens/passwords
5. **N+1 queries** - Use Prisma includes to fetch related data
6. **Not checking ownership** - Verify user owns resource before modifying
7. **Redirect loops** - Check conditions before redirecting
