const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Generic fetch wrapper that prepends the API base URL.
 * Throws on non-2xx responses with the error body included.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${NEXT_PUBLIC_API_URL}${path}`;

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
