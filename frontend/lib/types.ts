// ─── Domain types shared across frontend ───────────────────────────────────

export type GuestStatus = "pending" | "confirmed" | "declined";

export interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  status: GuestStatus;
}

export interface EventInfo {
  name: string;
  date: string; // ISO string
  venue: string;
}

export interface RsvpPayload {
  status: "confirmed" | "declined";
  dietary_preferences?: string | null;
  alcohol_preference?: string | null;
  needs_transport?: boolean;
}
