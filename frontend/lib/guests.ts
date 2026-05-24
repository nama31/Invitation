import { apiFetch } from "./api";
import type { EventInfo, Guest, RsvpPayload } from "./types";

/**
 * Search for guests by name query (min 2 chars).
 */
export async function searchGuests(query: string): Promise<Guest[]> {
  if (query.trim().length < 2) return [];
  return apiFetch<Guest[]>(
    `/api/guests/search?query=${encodeURIComponent(query.trim())}`
  );
}

/**
 * Submit or update RSVP for a guest.
 */
export async function submitRsvp(
  id: number,
  payload: RsvpPayload
): Promise<Guest> {
  return apiFetch<Guest>(`/api/guests/${id}/rsvp`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch static event information.
 */
export async function getEventInfo(): Promise<EventInfo> {
  return apiFetch<EventInfo>("/api/event");
}
