import type {
  AdminStats,
  GuestAdminCreate,
  GuestAdminRead,
  GuestAdminUpdate,
  TableAdminRead,
  TableCreate,
  TableReadBasic,
} from "./admin-types";

function baseUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://backend:8000"
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

async function adminFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${err}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

// ── Stats ────────────────────────────────────────────────────────────────────
export async function getStats(token: string): Promise<AdminStats> {
  return adminFetch<AdminStats>("/api/admin/stats", token);
}

// ── Guests ───────────────────────────────────────────────────────────────────
export async function getGuests(token: string): Promise<GuestAdminRead[]> {
  return adminFetch<GuestAdminRead[]>("/api/admin/guests", token);
}

export async function createGuest(
  token: string,
  data: GuestAdminCreate
): Promise<GuestAdminRead> {
  return adminFetch<GuestAdminRead>("/api/admin/guests", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGuest(
  token: string,
  id: number,
  data: GuestAdminUpdate
): Promise<GuestAdminRead> {
  return adminFetch<GuestAdminRead>(`/api/admin/guests/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGuest(token: string, id: number): Promise<void> {
  await adminFetch<void>(`/api/admin/guests/${id}`, token, {
    method: "DELETE",
  });
}

export async function assignGuest(
  token: string,
  guestId: number,
  tableId: number
): Promise<GuestAdminRead> {
  return adminFetch<GuestAdminRead>(
    `/api/admin/guests/${guestId}/assign`,
    token,
    { method: "PATCH", body: JSON.stringify({ table_id: tableId }) }
  );
}

export async function unassignGuest(
  token: string,
  guestId: number
): Promise<GuestAdminRead> {
  return adminFetch<GuestAdminRead>(
    `/api/admin/guests/${guestId}/unassign`,
    token,
    { method: "PATCH" }
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────
export async function getTables(token: string): Promise<TableAdminRead[]> {
  return adminFetch<TableAdminRead[]>("/api/admin/tables", token);
}

export async function createTable(
  token: string,
  data: TableCreate
): Promise<TableReadBasic> {
  return adminFetch<TableReadBasic>("/api/admin/tables", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTable(token: string, id: number): Promise<void> {
  await adminFetch<void>(`/api/admin/tables/${id}`, token, {
    method: "DELETE",
  });
}

// ── Photos ────────────────────────────────────────────────────────────────────
export type AdminPhotoRead = {
  id: number;
  public_url: string;
  uploader_name: string | null;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  is_approved: boolean;
  uploaded_at: string;
};

export async function getAdminPhotos(token: string): Promise<AdminPhotoRead[]> {
  return adminFetch<AdminPhotoRead[]>("/api/admin/photos", token);
}

export async function hidePhoto(
  token: string,
  id: number
): Promise<AdminPhotoRead> {
  return adminFetch<AdminPhotoRead>(`/api/admin/photos/${id}/hide`, token, {
    method: "PATCH",
  });
}

export async function showPhoto(
  token: string,
  id: number
): Promise<AdminPhotoRead> {
  return adminFetch<AdminPhotoRead>(`/api/admin/photos/${id}/show`, token, {
    method: "PATCH",
  });
}

export async function deletePhoto(token: string, id: number): Promise<void> {
  await adminFetch<void>(`/api/admin/photos/${id}`, token, {
    method: "DELETE",
  });
}
