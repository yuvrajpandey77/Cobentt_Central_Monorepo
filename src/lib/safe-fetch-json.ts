/**
 * Safe JSON fetch helper (works in client components and route handlers).
 *
 * Production APIs can return non-JSON bodies (HTML error pages from the
 * platform, proxy/auth redirects, truncated responses). A bare
 * `await res.json()` then throws `Unexpected token '<', "<!DOCTYPE"...`,
 * which masks the real failure. These helpers always produce a usable
 * `{ ok, data, error }` result instead of throwing on HTML.
 */

export interface SafeJsonResult<T = unknown> {
  ok: boolean;
  status: number;
  /** Parsed JSON body, or null when the body was not JSON. */
  data: T | null;
  /** Human-readable error (server `error` field, HTTP status, or HTML hint). */
  error: string | null;
  /** Machine-readable server `code` field when present. */
  code: string | null;
}

function errorForStatus(status: number): string {
  if (status === 401) return "Not signed in. Sign in and retry.";
  if (status === 403) return "Not allowed. Check your access and retry.";
  if (status === 404) return "Not found. It may have been removed.";
  if (status === 429) return "Too many requests. Wait a minute and retry.";
  if (status === 503) return "Service temporarily unavailable. Retry in a moment.";
  if (status >= 500) return "Server error. Retry in a moment.";
  return `Request failed (${status}). Retry.`;
}

export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, status: 0, data: null, error: "Network error. Check your connection and retry.", code: "NETWORK" };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // HTML error page / redirect (e.g. platform 500, auth redirect).
    // Drain the body and report the status instead of crashing on res.json().
    try {
      await res.text();
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, data: null, error: errorForStatus(res.status), code: "NON_JSON_RESPONSE" };
  }

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    return { ok: false, status: res.status, data: null, error: "Bad response from server. Retry.", code: "BAD_JSON" };
  }

  if (!res.ok) {
    const body = data as unknown as Record<string, unknown> | null;
    const serverError = body && typeof body.error === "string" ? body.error : null;
    const code = body && typeof body.code === "string" ? body.code : null;
    return { ok: false, status: res.status, data, error: serverError ?? errorForStatus(res.status), code };
  }

  return { ok: true, status: res.status, data, error: null, code: null };
}
