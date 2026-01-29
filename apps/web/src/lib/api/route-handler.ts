import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * Standardized API response envelope.
 */
export interface ApiResponseEnvelope<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponseEnvelope<T>>(
    { data, error: null },
    { status }
  );
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json<ApiResponseEnvelope<never>>(
    { data: null, error: { code, message } },
    { status }
  );
}

/**
 * Context provided to authenticated route handlers.
 */
export interface RouteContext {
  /** Clerk user ID */
  userId: string;
  /** Organization ID (from Clerk or DB lookup) */
  orgId: string;
  /** Prisma client instance */
  db: typeof prisma;
  /** The incoming request */
  request: NextRequest;
  /** URL params (from Next.js dynamic routes) */
  params: Record<string, string>;
}

/**
 * Options for route handler configuration.
 */
interface RouteOptions {
  /** Whether org lookup is required (default: true) */
  requireOrg?: boolean;
}

/**
 * Creates an authenticated API route handler with standardized
 * auth, org resolution, error handling, and response format.
 *
 * @example
 * ```ts
 * export const GET = authenticatedRoute(async ({ db, orgId, params }) => {
 *   const agent = await db.agent.findFirst({
 *     where: { id: params.id, orgId },
 *   });
 *   if (!agent) throw new RouteError("NOT_FOUND", "Agent not found", 404);
 *   return agent;
 * });
 * ```
 */
export function authenticatedRoute<T>(
  handler: (ctx: RouteContext) => Promise<T>,
  options: RouteOptions = {}
) {
  const { requireOrg = true } = options;

  return async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      // Check for E2E UAT bypass
      const isE2E =
        process.env.NEXT_PUBLIC_E2E_UAT_BYPASS === "true" ||
        process.env.E2E_UAT_BYPASS === "true";

      let userId: string;
      let clerkOrgId: string | null | undefined;

      if (isE2E) {
        userId = "e2e-test-user";
        clerkOrgId = undefined;
      } else {
        const session = await auth();
        if (!session.userId) {
          return errorResponse("UNAUTHORIZED", "Authentication required", 401);
        }
        userId = session.userId;
        clerkOrgId = session.orgId;
      }

      // Resolve org ID
      let orgId = clerkOrgId ?? "";

      if (!orgId && requireOrg) {
        // Look up the user's org from the database
        const user = await prisma.user.findUnique({
          where: { clerkId: userId },
          include: { organizations: { take: 1 } },
        });

        if (!user || user.organizations.length === 0) {
          return errorResponse(
            "NO_ORGANIZATION",
            "No organization found for user",
            403
          );
        }
        orgId = user.organizations[0].id;
      }

      // Resolve dynamic route params
      const params = context?.params ? await context.params : {};

      const result = await handler({
        userId,
        orgId,
        db: prisma,
        request,
        params,
      });

      return jsonResponse(result);
    } catch (error) {
      if (error instanceof RouteError) {
        return errorResponse(error.code, error.message, error.status);
      }

      console.error("Unhandled API error:", error);
      return errorResponse(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "An unexpected error occurred",
        500
      );
    }
  };
}

/**
 * Typed error class for route handlers.
 */
export class RouteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "RouteError";
  }
}
