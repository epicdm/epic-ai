/**
 * Typed API client with standardized response envelope.
 *
 * Normalizes the three legacy error formats found in the codebase:
 *   1. { error: string }
 *   2. { error: { message: string } }
 *   3. { message: string }
 * into a consistent { data, error } envelope.
 */

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

function normalizeError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;

    // Format 1: { error: "string" }
    if (typeof obj.error === "string") {
      return { code: "API_ERROR", message: obj.error, status };
    }

    // Format 2: { error: { message: "string", code?: "string" } }
    if (obj.error && typeof obj.error === "object") {
      const err = obj.error as Record<string, unknown>;
      return {
        code: typeof err.code === "string" ? err.code : "API_ERROR",
        message: typeof err.message === "string" ? err.message : "Unknown error",
        status,
      };
    }

    // Format 3: { message: "string" }
    if (typeof obj.message === "string") {
      return {
        code: typeof obj.code === "string" ? obj.code : "API_ERROR",
        message: obj.message,
        status,
      };
    }
  }

  return {
    code: "UNKNOWN_ERROR",
    message: typeof body === "string" ? body : `Request failed with status ${status}`,
    status,
  };
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { body, params, headers: customHeaders, ...rest } = options;

  // Build URL with query params
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
    }
  }

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  let fetchBody: BodyInit | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(fullUrl, {
      ...rest,
      headers,
      body: fetchBody,
    });

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text().catch(() => null);
      }
      return { data: null, error: normalizeError(response.status, errorBody) };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined as T, error: null };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network request failed",
        status: 0,
      },
    };
  }
}

/**
 * Extract an array from an API response that may be:
 *   - A bare array: [...]
 *   - An object with a `data` field: { data: [...], ... }
 *   - null / undefined
 * Returns the array, or [] if not found.
 */
export function unwrapArray<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && "data" in body) {
    const inner = (body as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

export const apiClient = {
  get<T>(url: string, options?: FetchOptions) {
    return request<T>(url, { ...options, method: "GET" });
  },
  post<T>(url: string, body?: unknown, options?: FetchOptions) {
    return request<T>(url, { ...options, method: "POST", body });
  },
  put<T>(url: string, body?: unknown, options?: FetchOptions) {
    return request<T>(url, { ...options, method: "PUT", body });
  },
  patch<T>(url: string, body?: unknown, options?: FetchOptions) {
    return request<T>(url, { ...options, method: "PATCH", body });
  },
  delete<T>(url: string, options?: FetchOptions) {
    return request<T>(url, { ...options, method: "DELETE" });
  },
};
