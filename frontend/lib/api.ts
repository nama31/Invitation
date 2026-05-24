/**
 * Resolves the correct API base URL depending on execution context.
 * - Server Components / SSR run inside the Docker network → use the internal
 *   service name `backend:8000` (via INTERNAL_API_URL env var).
 * - Client Components run in the browser → use the public URL
 *   (NEXT_PUBLIC_API_URL, which defaults to http://localhost:8000).
 */
function getBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-side: use internal Docker service URL if provided
    return (
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://backend:8000"
    );
  }
  // Client-side: always use public URL
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

/**
 * Generic fetch wrapper that prepends the API base URL.
 * Throws on non-2xx responses with the error body included.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${errorBody}`);
  }

  // Return null for 204 No Content
  if (res.status === 204) return null as T;

  return res.json() as Promise<T>;
}

/** Convenience helpers */
export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { method: "GET", ...init }),

  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...init,
    }),

  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...init,
    }),

  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...init,
    }),

  delete: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { method: "DELETE", ...init }),
};

// ── Seating chart types & fetch ───────────────────────────────────────────────
export type SeatingGuest = { first_name: string; last_name: string };
export type SeatingTable = {
  table_id: number;
  table_name: string;
  max_seats: number;
  guests: SeatingGuest[];
};

export async function getSeatingPlan(): Promise<SeatingTable[]> {
  return apiFetch<SeatingTable[]>("/api/seating");
}
